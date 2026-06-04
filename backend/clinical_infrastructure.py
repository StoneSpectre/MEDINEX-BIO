"""
MEDINEX — STEP 3: CLINICAL DATA INFRASTRUCTURE
===============================================
Understand how real hospital data is structured.
Implements the full MIMIC-IV data model:

  patients → admissions → diagnoses_icd → procedures_icd
           → prescriptions → labevents → chartevents

PhysioNet / MIMIC-IV access:
  1. Register at https://physionet.org/
  2. Complete CITI training
  3. Sign DUA for MIMIC-IV
  4. Download via: wget -r -N -c -np --user USERNAME
        https://physionet.org/files/mimiciv/3.1/

This module provides:
  - Full schema documentation for all 7 core tables
  - Synthetic demo data (safe to run without credentials)
  - SQL query patterns for clinical intelligence
  - Patient journey reconstruction
  - Clinical feature extraction for ML
"""

import json
import random
import sqlite3
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data" / "clinical"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "mimic_demo.db"


# ─────────────────────────────────────────────
# 3A. MIMIC-IV TABLE SCHEMAS
# ─────────────────────────────────────────────

MIMIC_IV_SCHEMA = {
    "patients": {
        "description": "One row per unique patient. Core demographic table.",
        "source": "Hospital EHR system",
        "columns": {
            "subject_id": "INTEGER PRIMARY KEY — Unique patient identifier (de-identified)",
            "gender": "TEXT — Patient sex: M or F",
            "anchor_age": "INTEGER — Patient age at anchor_year",
            "anchor_year": "INTEGER — Shifted year for de-identification",
            "anchor_year_group": "TEXT — Range of actual years (e.g. '2014-2016')",
            "dod": "DATE — Date of death (NULL if alive)",
        },
        "key_facts": [
            "Subject IDs are de-identified (not real hospital IDs)",
            "Ages ≥90 are reported as 91 to protect patient privacy",
            "Dates are shifted consistently per patient for de-identification",
            "~315,000 unique patients in MIMIC-IV v3.1",
        ]
    },
    "admissions": {
        "description": "One row per hospital admission. Links patients to care episodes.",
        "source": "Hospital admission/discharge/transfer (ADT) system",
        "columns": {
            "subject_id": "INTEGER — Patient identifier (FK → patients)",
            "hadm_id": "INTEGER PRIMARY KEY — Unique hospital admission ID",
            "admittime": "TIMESTAMP — Hospital admission datetime",
            "dischtime": "TIMESTAMP — Hospital discharge datetime",
            "deathtime": "TIMESTAMP — In-hospital death time (NULL if survived)",
            "admission_type": "TEXT — e.g. EMERGENCY, ELECTIVE, URGENT, OBSERVATION",
            "admit_provider_id": "TEXT — De-identified admitting provider",
            "admission_location": "TEXT — Where patient came from (e.g. EMERGENCY ROOM)",
            "discharge_location": "TEXT — Where patient went (e.g. HOME, SNF, EXPIRED)",
            "insurance": "TEXT — Insurance type (Medicare, Medicaid, Other)",
            "language": "TEXT — Patient language",
            "marital_status": "TEXT — Marital status",
            "race": "TEXT — Self-reported race/ethnicity",
            "edregtime": "TIMESTAMP — ED registration time",
            "edouttime": "TIMESTAMP — ED discharge time",
            "hospital_expire_flag": "INTEGER — 1 if patient died in hospital",
        },
        "key_facts": [
            "One patient can have multiple admissions (subject_id → many hadm_ids)",
            "LOS = (dischtime - admittime) in hours/days",
            "hospital_expire_flag is key binary outcome for mortality prediction",
            "~524,000 admissions in MIMIC-IV v3.1",
        ]
    },
    "diagnoses_icd": {
        "description": "ICD-9/ICD-10 diagnoses assigned during each hospital admission.",
        "source": "Medical billing/coding department",
        "columns": {
            "subject_id": "INTEGER — Patient identifier",
            "hadm_id": "INTEGER — Admission identifier (FK → admissions)",
            "seq_num": "INTEGER — Diagnosis sequence (1 = primary diagnosis)",
            "icd_code": "TEXT — ICD-9 or ICD-10 code (e.g. 'I50.9' = Heart failure)",
            "icd_version": "INTEGER — 9 or 10 (ICD version)",
        },
        "key_facts": [
            "seq_num=1 is the primary/principal diagnosis",
            "ICD-10 codes are hierarchical: I50 → I50.9 → I50.31",
            "One admission typically has 5-20 diagnosis codes",
            "Comorbidities captured here (Elixhauser, Charlson scores)",
        ]
    },
    "procedures_icd": {
        "description": "ICD-9/ICD-10 procedure codes for each admission.",
        "source": "Medical billing/coding department",
        "columns": {
            "subject_id": "INTEGER — Patient identifier",
            "hadm_id": "INTEGER — Admission identifier",
            "seq_num": "INTEGER — Procedure sequence",
            "chartdate": "DATE — Date procedure was performed",
            "icd_code": "TEXT — ICD procedure code (e.g. '0BH17EZ' = intubation)",
            "icd_version": "INTEGER — 9 or 10",
        },
        "key_facts": [
            "Covers surgical, diagnostic, and therapeutic procedures",
            "ICD-10-PCS codes are 7-character alphanumeric",
            "Critical for surgical outcome studies",
        ]
    },
    "prescriptions": {
        "description": "Medication orders for each admission. Pharmacist verified.",
        "source": "Pharmacy information system (MetaVision/CareVue)",
        "columns": {
            "subject_id": "INTEGER — Patient identifier",
            "hadm_id": "INTEGER — Admission identifier",
            "pharmacy_id": "INTEGER — Unique pharmacy order ID",
            "starttime": "TIMESTAMP — When medication order began",
            "stoptime": "TIMESTAMP — When medication order ended",
            "drug_type": "TEXT — MAIN, BASE, ADDITIVE",
            "drug": "TEXT — Drug name (e.g. 'Aspirin', 'Vancomycin')",
            "gsn": "TEXT — Generic Sequence Number (drug classification)",
            "ndc": "TEXT — National Drug Code",
            "prod_strength": "TEXT — Dose strength (e.g. '325mg')",
            "form_rx": "TEXT — Formulation (TABLET, IV, etc.)",
            "dose_val_rx": "TEXT — Prescribed dose value",
            "dose_unit_rx": "TEXT — Dose unit (mg, mL, units)",
            "route": "TEXT — Administration route (PO, IV, SQ, etc.)",
        },
        "key_facts": [
            "Links to drug databases via NDC/GSN codes",
            "Critical for pharmacovigilance and drug interaction studies",
            "Routes: PO (oral), IV (intravenous), SQ (subcutaneous)",
        ]
    },
    "labevents": {
        "description": "Laboratory test results. Largest MIMIC-IV table (~150M rows).",
        "source": "Laboratory information system (LIS)",
        "columns": {
            "labevent_id": "INTEGER PRIMARY KEY — Unique lab event",
            "subject_id": "INTEGER — Patient identifier",
            "hadm_id": "INTEGER — Admission (NULL for outpatient labs)",
            "specimen_id": "INTEGER — Specimen collected",
            "itemid": "INTEGER — Lab test identifier (FK → d_labitems)",
            "charttime": "TIMESTAMP — When specimen was collected",
            "storetime": "TIMESTAMP — When result was stored",
            "value": "TEXT — Result value (may be text for qualitative tests)",
            "valuenum": "FLOAT — Numeric result value",
            "valueuom": "TEXT — Unit of measure (e.g. 'mg/dL', 'K/uL')",
            "ref_range_lower": "FLOAT — Normal range lower bound",
            "ref_range_upper": "FLOAT — Normal range upper bound",
            "flag": "TEXT — 'abnormal' if outside reference range",
            "priority": "TEXT — ROUTINE or STAT",
            "comments": "TEXT — Clinician or lab comments",
        },
        "key_facts": [
            "itemid maps to d_labitems (e.g. 50912 = Creatinine, 51222 = Hemoglobin)",
            "flag='abnormal' identifies clinically significant values",
            "STAT = urgent; ROUTINE = non-urgent",
            "Key labs: Creatinine (kidney), Troponin (heart), WBC (infection)",
        ]
    },
    "chartevents": {
        "description": "Nursing charted vitals and assessments. Largest ICU table (~330M rows).",
        "source": "ICU clinical information system (MetaVision/CareVue)",
        "columns": {
            "subject_id": "INTEGER — Patient identifier",
            "hadm_id": "INTEGER — Admission identifier",
            "stay_id": "INTEGER — ICU stay identifier",
            "caregiver_id": "INTEGER — De-identified caregiver",
            "charttime": "TIMESTAMP — When value was charted",
            "storetime": "TIMESTAMP — When value was stored in system",
            "itemid": "INTEGER — Vital/assessment item (FK → d_items)",
            "value": "TEXT — Charted value",
            "valuenum": "FLOAT — Numeric value",
            "valueuom": "TEXT — Unit of measure",
            "warning": "INTEGER — 1 if value flagged as warning",
        },
        "key_facts": [
            "itemid 220045 = Heart Rate, 220210 = Respiratory Rate",
            "itemid 220277 = SpO2, 220179/220180 = Blood Pressure (sys/dia)",
            "itemid 223762 = Temperature (Celsius)",
            "Charted every 1-4 hours in ICU — enables time-series analysis",
        ]
    },
}


# ─────────────────────────────────────────────
# 3B. SYNTHETIC DEMO DATABASE (No credentials needed)
# ─────────────────────────────────────────────

random.seed(42)

ICD10_DIAGNOSES = [
    ("I50.9", "Heart failure, unspecified"),
    ("J18.9", "Pneumonia, unspecified organism"),
    ("N17.9", "Acute kidney failure, unspecified"),
    ("E11.9", "Type 2 diabetes mellitus without complications"),
    ("I21.9", "Acute myocardial infarction, unspecified"),
    ("A41.9", "Sepsis, unspecified organism"),
    ("J44.1", "COPD with acute exacerbation"),
    ("G35",   "Multiple sclerosis"),
    ("C34.10", "Malignant neoplasm of upper lobe bronchus"),
    ("F32.9", "Major depressive disorder, single episode"),
]

PROCEDURES = [
    ("5A1955Z", "Respiratory ventilation, >96 hours"),
    ("0BH17EZ", "Insertion of endotracheal airway"),
    ("02HV33Z", "Central venous catheter placement"),
    ("6A750ZZ", "Hemodialysis"),
    ("3E033XZ", "Vasopressor administration"),
]

DRUGS = [
    ("Norepinephrine", "IV", "mcg/kg/min", 0.1, 0.5),
    ("Vancomycin", "IV", "mg", 1000, 1500),
    ("Heparin", "IV", "units/hr", 500, 1500),
    ("Metoprolol", "PO", "mg", 25, 50),
    ("Furosemide", "IV", "mg", 20, 80),
    ("Insulin Regular", "IV", "units/hr", 2, 10),
    ("Acetaminophen", "PO", "mg", 500, 1000),
    ("Aspirin", "PO", "mg", 81, 325),
]

LAB_ITEMS = [
    (50912, "Creatinine", "mg/dL", 0.6, 1.2, 0.5, 8.0),
    (51222, "Hemoglobin", "g/dL", 12.0, 17.5, 6.0, 18.0),
    (51300, "WBC", "K/uL", 4.0, 11.0, 1.0, 40.0),
    (50882, "Bicarbonate", "mEq/L", 22.0, 29.0, 10.0, 40.0),
    (50902, "Chloride", "mEq/L", 98.0, 107.0, 85.0, 120.0),
    (50971, "Potassium", "mEq/L", 3.5, 5.0, 2.5, 7.0),
    (50983, "Sodium", "mEq/L", 136.0, 145.0, 120.0, 160.0),
    (50931, "Glucose", "mg/dL", 70.0, 100.0, 40.0, 600.0),
]

VITAL_ITEMS = [
    (220045, "Heart Rate", "bpm", 60, 100, 30, 200),
    (220210, "Respiratory Rate", "/min", 12, 20, 6, 50),
    (220277, "SpO2", "%", 95, 100, 70, 100),
    (220179, "Systolic BP", "mmHg", 90, 140, 60, 200),
    (220180, "Diastolic BP", "mmHg", 60, 90, 30, 130),
    (223762, "Temperature", "°C", 36.5, 37.5, 35.0, 41.0),
]


def generate_synthetic_db(n_patients: int = 50):
    """
    Create a SQLite database with synthetic MIMIC-IV-like data.
    All data is completely fictional — for learning purposes only.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Drop and recreate
    for table in ["chartevents", "labevents", "prescriptions",
                   "procedures_icd", "diagnoses_icd", "admissions", "patients"]:
        c.execute(f"DROP TABLE IF EXISTS {table}")

    # Create tables
    c.executescript("""
    CREATE TABLE patients (
        subject_id INTEGER PRIMARY KEY,
        gender TEXT, anchor_age INTEGER,
        anchor_year INTEGER, anchor_year_group TEXT, dod TEXT
    );
    CREATE TABLE admissions (
        subject_id INTEGER, hadm_id INTEGER PRIMARY KEY,
        admittime TEXT, dischtime TEXT, deathtime TEXT,
        admission_type TEXT, admission_location TEXT,
        discharge_location TEXT, insurance TEXT, race TEXT,
        hospital_expire_flag INTEGER,
        FOREIGN KEY(subject_id) REFERENCES patients(subject_id)
    );
    CREATE TABLE diagnoses_icd (
        subject_id INTEGER, hadm_id INTEGER, seq_num INTEGER,
        icd_code TEXT, icd_version INTEGER
    );
    CREATE TABLE procedures_icd (
        subject_id INTEGER, hadm_id INTEGER, seq_num INTEGER,
        chartdate TEXT, icd_code TEXT, icd_version INTEGER
    );
    CREATE TABLE prescriptions (
        subject_id INTEGER, hadm_id INTEGER, pharmacy_id INTEGER,
        starttime TEXT, stoptime TEXT, drug TEXT,
        form_rx TEXT, dose_val_rx TEXT, dose_unit_rx TEXT, route TEXT
    );
    CREATE TABLE labevents (
        labevent_id INTEGER PRIMARY KEY, subject_id INTEGER,
        hadm_id INTEGER, itemid INTEGER, charttime TEXT,
        value TEXT, valuenum REAL, valueuom TEXT,
        ref_range_lower REAL, ref_range_upper REAL, flag TEXT
    );
    CREATE TABLE chartevents (
        subject_id INTEGER, hadm_id INTEGER, stay_id INTEGER,
        charttime TEXT, itemid INTEGER, value TEXT,
        valuenum REAL, valueuom TEXT, warning INTEGER
    );
    """)

    admit_types = ["EMERGENCY", "ELECTIVE", "URGENT", "OBSERVATION"]
    admit_locs = ["EMERGENCY ROOM", "PHYSICIAN REFERRAL", "TRANSFER FROM HOSPITAL", "WALK-IN"]
    discharge_locs = ["HOME", "SNF", "REHAB", "HOME HEALTH CARE", "EXPIRED", "ACUTE HOSPITAL"]
    insurances = ["Medicare", "Medicaid", "Other"]
    races = ["WHITE", "BLACK/AFRICAN AMERICAN", "HISPANIC/LATINO", "ASIAN", "OTHER"]

    labevent_id = 1
    pharmacy_id = 1
    stay_id = 1

    for i in range(n_patients):
        subject_id = 10000000 + i
        gender = random.choice(["M", "F"])
        age = random.randint(25, 89)
        anchor_year = random.randint(2115, 2120)
        mortality = random.random() < 0.12  # ~12% in-hospital mortality

        dod = None
        if mortality and random.random() < 0.6:
            dod_dt = datetime(anchor_year, random.randint(1,12), random.randint(1,28))
            dod = dod_dt.strftime("%Y-%m-%d")

        c.execute("INSERT INTO patients VALUES (?,?,?,?,?,?)",
                  (subject_id, gender, age, anchor_year, "2014-2018", dod))

        # 1-3 admissions per patient
        n_admissions = random.choices([1,2,3], weights=[0.6,0.3,0.1])[0]
        base_dt = datetime(anchor_year, 1, 1)

        for j in range(n_admissions):
            hadm_id = 20000000 + i * 10 + j
            admit_dt = base_dt + timedelta(days=random.randint(0, 300))
            los_hours = random.randint(12, 480)  # 0.5 – 20 days
            disch_dt = admit_dt + timedelta(hours=los_hours)
            expire = 1 if (mortality and j == n_admissions - 1 and random.random() < 0.5) else 0
            death_dt = disch_dt.strftime("%Y-%m-%d %H:%M:%S") if expire else None
            disch_loc = "EXPIRED" if expire else random.choice(discharge_locs[:-1])

            c.execute("INSERT INTO admissions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                      (subject_id, hadm_id,
                       admit_dt.strftime("%Y-%m-%d %H:%M:%S"),
                       disch_dt.strftime("%Y-%m-%d %H:%M:%S"),
                       death_dt, random.choice(admit_types),
                       random.choice(admit_locs), disch_loc,
                       random.choice(insurances), random.choice(races), expire))

            # Diagnoses (3-8 per admission)
            diag_sample = random.sample(ICD10_DIAGNOSES, k=random.randint(3, 8))
            for seq, (code, _) in enumerate(diag_sample, 1):
                c.execute("INSERT INTO diagnoses_icd VALUES (?,?,?,?,?)",
                          (subject_id, hadm_id, seq, code, 10))

            # Procedures (0-3)
            if random.random() < 0.6:
                for seq, (code, _) in enumerate(random.sample(PROCEDURES, k=random.randint(1,3)), 1):
                    proc_dt = admit_dt + timedelta(hours=random.randint(2, 48))
                    c.execute("INSERT INTO procedures_icd VALUES (?,?,?,?,?,?)",
                              (subject_id, hadm_id, seq, proc_dt.strftime("%Y-%m-%d"), code, 10))

            # Prescriptions (2-8 per admission)
            for drug, route, unit, lo, hi in random.sample(DRUGS, k=random.randint(2,6)):
                start = admit_dt + timedelta(hours=random.randint(1,6))
                stop = start + timedelta(hours=random.randint(24, los_hours))
                dose = round(random.uniform(lo, hi), 1)
                c.execute("INSERT INTO prescriptions VALUES (?,?,?,?,?,?,?,?,?,?)",
                          (subject_id, hadm_id, pharmacy_id,
                           start.strftime("%Y-%m-%d %H:%M:%S"),
                           stop.strftime("%Y-%m-%d %H:%M:%S"),
                           drug, "TABLET" if route=="PO" else "IV",
                           str(dose), unit, route))
                pharmacy_id += 1

            # Lab events (10-40 results per admission)
            for _ in range(random.randint(10, 40)):
                itemid, name, uom, lo_ref, hi_ref, lo_val, hi_val = random.choice(LAB_ITEMS)
                val = round(random.gauss((lo_val+hi_val)/2, (hi_val-lo_val)/6), 2)
                val = max(lo_val, min(hi_val, val))
                chart_dt = admit_dt + timedelta(hours=random.randint(1, los_hours-1))
                flag = "abnormal" if val < lo_ref or val > hi_ref else None
                c.execute("INSERT INTO labevents VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                          (labevent_id, subject_id, hadm_id, itemid,
                           chart_dt.strftime("%Y-%m-%d %H:%M:%S"),
                           str(val), val, uom, lo_ref, hi_ref, flag))
                labevent_id += 1

            # Chartevents (vitals q4h during stay)
            for h in range(0, los_hours, 4):
                chart_dt = admit_dt + timedelta(hours=h)
                this_stay_id = stay_id
                for itemid, name, uom, lo_ref, hi_ref, lo_val, hi_val in random.sample(VITAL_ITEMS, k=4):
                    val = round(random.gauss((lo_ref+hi_ref)/2, (hi_ref-lo_ref)/3), 1)
                    val = max(lo_val, min(hi_val, val))
                    warn = 1 if (val < lo_ref * 0.85 or val > hi_ref * 1.15) else 0
                    c.execute("INSERT INTO chartevents VALUES (?,?,?,?,?,?,?,?,?)",
                              (subject_id, hadm_id, this_stay_id,
                               chart_dt.strftime("%Y-%m-%d %H:%M:%S"),
                               itemid, str(val), val, uom, warn))
            stay_id += 1

    conn.commit()
    conn.close()
    return DB_PATH


# ─────────────────────────────────────────────
# 3C. PATIENT JOURNEY RECONSTRUCTION
# ─────────────────────────────────────────────

def get_patient_journey(subject_id: int, conn) -> dict:
    """
    Reconstruct the full clinical story for one patient.
    Patient → Diagnosis → Treatment → Outcome
    """
    df_patient = pd.read_sql(
        "SELECT * FROM patients WHERE subject_id=?", conn, params=(subject_id,))
    df_admissions = pd.read_sql(
        "SELECT * FROM admissions WHERE subject_id=? ORDER BY admittime",
        conn, params=(subject_id,))
    df_diagnoses = pd.read_sql(
        "SELECT * FROM diagnoses_icd WHERE subject_id=? ORDER BY hadm_id, seq_num",
        conn, params=(subject_id,))
    df_meds = pd.read_sql(
        "SELECT * FROM prescriptions WHERE subject_id=? ORDER BY starttime",
        conn, params=(subject_id,))
    df_labs = pd.read_sql(
        "SELECT * FROM labevents WHERE subject_id=? ORDER BY charttime",
        conn, params=(subject_id,))

    # Compute LOS
    if not df_admissions.empty:
        df_admissions["admittime"] = pd.to_datetime(df_admissions["admittime"])
        df_admissions["dischtime"] = pd.to_datetime(df_admissions["dischtime"])
        df_admissions["los_days"] = (
            df_admissions["dischtime"] - df_admissions["admittime"]
        ).dt.total_seconds() / 86400

    # Abnormal labs
    df_abnormal = df_labs[df_labs["flag"] == "abnormal"]

    return {
        "patient": df_patient.to_dict("records")[0] if not df_patient.empty else {},
        "admissions": df_admissions.to_dict("records"),
        "diagnoses": df_diagnoses.to_dict("records"),
        "medications": df_meds.to_dict("records"),
        "total_labs": len(df_labs),
        "abnormal_labs": len(df_abnormal),
        "total_admissions": len(df_admissions),
        "total_los_days": df_admissions["los_days"].sum() if not df_admissions.empty else 0,
    }


def print_patient_journey(journey: dict):
    """Print a clinical summary of a patient's journey."""
    p = journey.get("patient", {})
    admissions = journey.get("admissions", [])
    diags = journey.get("diagnoses", [])
    meds = journey.get("medications", [])

    ICD_MAP = {row[0]: row[1] for row in ICD10_DIAGNOSES}
    ICD_MAP.update({row[0]: row[1] for row in PROCEDURES})

    print("\n" + "═" * 70)
    print(f"  PATIENT JOURNEY — Subject {p.get('subject_id')}")
    print("═" * 70)
    print(f"  Gender       : {p.get('gender')}")
    print(f"  Age          : {p.get('anchor_age')}")
    print(f"  Admissions   : {journey['total_admissions']}")
    print(f"  Total LOS    : {journey['total_los_days']:.1f} days")
    print(f"  Lab Results  : {journey['total_labs']} ({journey['abnormal_labs']} abnormal)")

    for adm in admissions:
        print(f"\n  ┌─ ADMISSION {adm['hadm_id']}")
        print(f"  │  Type       : {adm['admission_type']}")
        print(f"  │  Admitted   : {adm['admittime']}")
        print(f"  │  LOS        : {adm.get('los_days', 0):.1f} days")
        print(f"  │  Outcome    : {'⚠ DIED IN HOSPITAL' if adm['hospital_expire_flag'] else adm['discharge_location']}")

        adm_diags = [d for d in diags if d["hadm_id"] == adm["hadm_id"]]
        if adm_diags:
            print(f"  │  Diagnoses  :")
            for d in adm_diags[:4]:
                label = ICD_MAP.get(d["icd_code"], d["icd_code"])
                primary = " ← PRIMARY" if d["seq_num"] == 1 else ""
                print(f"  │    [{d['icd_code']}] {label}{primary}")

        adm_meds = [m for m in meds if m["hadm_id"] == adm["hadm_id"]]
        if adm_meds:
            print(f"  │  Medications:")
            for m in adm_meds[:4]:
                print(f"  │    {m['drug']} {m['dose_val_rx']} {m['dose_unit_rx']} {m['route']}")

    print("  └─ END\n")


# ─────────────────────────────────────────────
# 3D. CLINICAL ANALYTICS QUERIES
# ─────────────────────────────────────────────

def run_clinical_analytics(conn):
    """
    Run key clinical analytics queries on the database.
    These patterns are foundational for clinical AI.
    """
    print("\n" + "═" * 70)
    print("  MEDINEX │ STEP 3 — CLINICAL ANALYTICS")
    print("═" * 70)

    analytics = {
        "In-hospital mortality rate": """
            SELECT
                ROUND(100.0 * SUM(hospital_expire_flag) / COUNT(*), 2) AS mortality_pct,
                COUNT(*) AS total_admissions,
                SUM(hospital_expire_flag) AS deaths
            FROM admissions
        """,
        "Avg LOS by admission type (days)": """
            SELECT
                admission_type,
                COUNT(*) AS n,
                ROUND(AVG((julianday(dischtime) - julianday(admittime))), 2) AS avg_los_days,
                ROUND(MIN((julianday(dischtime) - julianday(admittime))), 2) AS min_los,
                ROUND(MAX((julianday(dischtime) - julianday(admittime))), 2) AS max_los
            FROM admissions
            GROUP BY admission_type ORDER BY avg_los_days DESC
        """,
        "Top 8 diagnoses (primary only)": """
            SELECT icd_code, COUNT(*) AS n
            FROM diagnoses_icd WHERE seq_num = 1
            GROUP BY icd_code ORDER BY n DESC LIMIT 8
        """,
        "Top 6 medications by frequency": """
            SELECT drug, route, COUNT(*) AS n
            FROM prescriptions
            GROUP BY drug, route ORDER BY n DESC LIMIT 6
        """,
        "Abnormal lab rate by test": """
            SELECT itemid,
                COUNT(*) AS total,
                SUM(CASE WHEN flag='abnormal' THEN 1 ELSE 0 END) AS abnormal,
                ROUND(100.0 * SUM(CASE WHEN flag='abnormal' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pct_abnormal
            FROM labevents
            GROUP BY itemid ORDER BY pct_abnormal DESC LIMIT 6
        """,
        "Insurance vs mortality": """
            SELECT insurance,
                COUNT(*) AS admissions,
                SUM(hospital_expire_flag) AS deaths,
                ROUND(100.0*SUM(hospital_expire_flag)/COUNT(*),2) AS mortality_pct
            FROM admissions
            GROUP BY insurance ORDER BY mortality_pct DESC
        """,
    }

    ITEMID_NAMES = {row[0]: row[1] for row in LAB_ITEMS}

    for title, query in analytics.items():
        print(f"\n  ▸ {title}")
        df = pd.read_sql(query, conn)

        # Prettify itemid column if present
        if "itemid" in df.columns:
            df["test"] = df["itemid"].map(ITEMID_NAMES)
            df = df.drop("itemid", axis=1)

        print(df.to_string(index=False, max_rows=10))

    print("\n" + "═" * 70)


# ─────────────────────────────────────────────
# 3E. MIMIC-IV SCHEMA REFERENCE PRINTOUT
# ─────────────────────────────────────────────

def print_schema_reference():
    """Print the full MIMIC-IV schema as a reference guide."""
    print("\n" + "═" * 70)
    print("  MEDINEX │ STEP 3 — MIMIC-IV SCHEMA REFERENCE")
    print("═" * 70)
    for table, meta in MIMIC_IV_SCHEMA.items():
        print(f"\n  ┌─ TABLE: {table.upper()}")
        print(f"  │  {meta['description']}")
        print(f"  │  Source: {meta['source']}")
        print(f"  │  Columns ({len(meta['columns'])}):")
        for col, desc in meta["columns"].items():
            print(f"  │    {col:25s} {desc[:55]}")
        if meta.get("key_facts"):
            print(f"  │  Key Facts:")
            for fact in meta["key_facts"]:
                print(f"  │    · {fact}")
        print("  └─")

    print("\n  DATA FLOW:")
    print("  patients ──┬──▶ admissions ──┬──▶ diagnoses_icd")
    print("             │                 ├──▶ procedures_icd")
    print("             │                 ├──▶ prescriptions")
    print("             │                 ├──▶ labevents")
    print("             │                 └──▶ chartevents")
    print("\n  CLINICAL INTELLIGENCE FLOW:")
    print("  Patient → Diagnosis → Treatment → Outcome")
    print("\n" + "═" * 70)


# ─────────────────────────────────────────────
# DEMO — Run Step 3
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("\n  MEDINEX PHASE 0 · STEP 3: CLINICAL DATA INFRASTRUCTURE")
    print("  " + "─" * 50)

    # Print schema first
    print_schema_reference()

    # Generate synthetic MIMIC-IV-like database
    print("\n  Generating synthetic MIMIC-IV database (50 patients)...")
    db_path = generate_synthetic_db(n_patients=50)
    print(f"  ✓ Database created: {db_path}")

    conn = sqlite3.connect(db_path)

    # Table row counts
    print("\n  TABLE SIZES:")
    for table in ["patients", "admissions", "diagnoses_icd", "procedures_icd",
                  "prescriptions", "labevents", "chartevents"]:
        count = pd.read_sql(f"SELECT COUNT(*) as n FROM {table}", conn).iloc[0]["n"]
        print(f"    {table:20s}: {count:,} rows")

    # Analytics
    run_clinical_analytics(conn)

    # Patient journey
    first_patient = pd.read_sql("SELECT subject_id FROM patients LIMIT 1", conn).iloc[0]["subject_id"]
    journey = get_patient_journey(int(first_patient), conn)
    print_patient_journey(journey)

    # Save tables to CSV
    print("  Exporting tables to CSV...")
    for table in ["patients", "admissions", "diagnoses_icd"]:
        df = pd.read_sql(f"SELECT * FROM {table}", conn)
        out = DATA_DIR / f"{table}.csv"
        df.to_csv(out, index=False)
        print(f"    ✓ {out}")

    conn.close()

    print("\n  ✅ STEP 3 COMPLETE — Clinical data infrastructure understood.")
    print("  ─" * 35)
    print("  NEXT: Register at https://physionet.org/ to access real MIMIC-IV data")
    print("  · Complete CITI training (~4 hours)")
    print("  · Sign Data Use Agreement")
    print("  · Download: wget -r -N -c -np https://physionet.org/files/mimiciv/3.1/\n")
