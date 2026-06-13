"""
Pydantic schemas for all Phase-1 organ modules.
Each module has:
  - Input model  (patient data from the form)
  - Output model (AI prediction + SHAP explanation)
"""

from pydantic import BaseModel, Field, field_validator
from typing import Dict, List, Optional
from enum import Enum


# ── Shared ───────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class SHAPFeature(BaseModel):
    feature: str
    display_name: str
    value: float
    shap_value: float          # positive = pushes risk up, negative = down
    direction: str             # "up" | "down"
    normal_range: Optional[str] = None


class PredictionResponse(BaseModel):
    module: str
    risk_score: float          # 0.0 – 1.0
    risk_level: RiskLevel
    risk_percent: int          # rounded % for display
    diagnosis: str             # Actual clinical diagnosis string
    top_factors: List[SHAPFeature]
    summary: str               # plain-English one-liner for the doctor
    anomalies: List[str]       # list of flagged impossible/outlier values
    model_version: str = "1.0.0"


# ── Hepatic (Liver) ──────────────────────────────────────────────────────────

class HepaticInput(BaseModel):
    age: int                          = Field(..., ge=1,  le=120,  description="Patient age in years")
    sex: int                          = Field(..., ge=0,  le=1,    description="0 = Female, 1 = Male")
    total_bilirubin: float            = Field(..., ge=0.1, le=80,  description="Total Bilirubin (mg/dL)")
    direct_bilirubin: float           = Field(..., ge=0.0, le=40,  description="Direct Bilirubin (mg/dL)")
    alkaline_phosphatase: float       = Field(..., ge=20, le=2000, description="Alkaline Phosphatase (IU/L)")
    alt: float                        = Field(..., ge=5,  le=3000, description="Alanine Aminotransferase (IU/L)")
    ast: float                        = Field(..., ge=5,  le=3000, description="Aspartate Aminotransferase (IU/L)")
    total_protein: float              = Field(..., ge=1,  le=12,   description="Total Protein (g/dL)")
    albumin: float                    = Field(..., ge=0.5,le=6.0,  description="Albumin (g/dL)")
    albumin_globulin_ratio: float     = Field(..., ge=0.1,le=5.0,  description="Albumin/Globulin Ratio")
    bmi: float                        = Field(..., ge=10, le=70,   description="BMI (kg/m²)")
    alcohol_units_per_week: float     = Field(0,   ge=0,  le=200,  description="Alcohol consumption (units/week)")

    @field_validator("direct_bilirubin")
    @classmethod
    def direct_lte_total(cls, v, info):
        if "total_bilirubin" in info.data and v > info.data["total_bilirubin"]:
            raise ValueError("Direct bilirubin cannot exceed total bilirubin")
        return v


# ── Endocrine (Diabetes + Thyroid) ───────────────────────────────────────────

class DiabetesInput(BaseModel):
    age: int                  = Field(..., ge=1,  le=120, description="Age in years")
    sex: int                  = Field(..., ge=0,  le=1,   description="0 = Female, 1 = Male")
    pregnancies: int          = Field(0,   ge=0,  le=20,  description="Number of pregnancies (females)")
    glucose: float            = Field(..., ge=40, le=600, description="Fasting plasma glucose (mg/dL)")
    blood_pressure: float     = Field(..., ge=40, le=200, description="Diastolic blood pressure (mmHg)")
    skin_thickness: float     = Field(0,   ge=0,  le=100, description="Triceps skin fold thickness (mm)")
    insulin: float            = Field(0,   ge=0,  le=900, description="2-Hour serum insulin (µU/mL)")
    bmi: float                = Field(..., ge=10, le=70,  description="BMI (kg/m²)")
    diabetes_pedigree: float  = Field(..., ge=0,  le=3.0, description="Diabetes Pedigree Function score")
    hba1c: float              = Field(..., ge=3,  le=20,  description="HbA1c (%)")
    family_history: int       = Field(0,   ge=0,  le=1,   description="Family history of diabetes (0/1)")


class ThyroidInput(BaseModel):
    age: int                  = Field(..., ge=1,  le=120)
    sex: int                  = Field(..., ge=0,  le=1)
    tsh: float                = Field(..., ge=0,  le=100, description="TSH (mIU/L)")
    t3: float                 = Field(..., ge=0,  le=15,  description="Free T3 (pg/mL)")
    t4: float                 = Field(..., ge=0,  le=30,  description="Free T4 (ng/dL)")
    on_thyroxine: int         = Field(0,   ge=0,  le=1,   description="Currently on thyroxine (0/1)")
    on_antithyroid_meds: int  = Field(0,   ge=0,  le=1)
    sick: int                 = Field(0,   ge=0,  le=1,   description="Currently sick (0/1)")
    pregnant: int             = Field(0,   ge=0,  le=1)
    thyroid_surgery: int      = Field(0,   ge=0,  le=1)
    goitre: int               = Field(0,   ge=0,  le=1)
    tumor: int                = Field(0,   ge=0,  le=1)
    hypopituitary: int        = Field(0,   ge=0,  le=1)
    psych: int                = Field(0,   ge=0,  le=1,   description="Psychiatric disorder present (0/1)")


# ── Respiratory ───────────────────────────────────────────────────────────────

class RespiratoryInput(BaseModel):
    age: int                  = Field(..., ge=1,  le=120)
    sex: int                  = Field(..., ge=0,  le=1)
    fev1: float               = Field(..., ge=0.2,le=8.0, description="FEV1 (L) — Forced Expiratory Volume in 1s")
    fvc: float                = Field(..., ge=0.5,le=10,  description="FVC (L) — Forced Vital Capacity")
    fev1_fvc_ratio: float     = Field(..., ge=0.1,le=1.0, description="FEV1/FVC ratio (0–1)")
    spo2: float               = Field(..., ge=60, le=100, description="Resting SpO2 (%)")
    pack_years: float         = Field(0,   ge=0,  le=200, description="Smoking history (pack-years)")
    dyspnea_scale: int        = Field(..., ge=0,  le=4,   description="MRC Dyspnea Scale (0–4)")
    cough_frequency: int      = Field(..., ge=0,  le=3,   description="0=None, 1=Mild, 2=Moderate, 3=Severe")
    wheezing: int             = Field(0,   ge=0,  le=1)
    chest_tightness: int      = Field(0,   ge=0,  le=1)
    occupational_exposure: int= Field(0,   ge=0,  le=1,   description="Dust/fume occupational exposure (0/1)")

    @field_validator("fev1_fvc_ratio")
    @classmethod
    def ratio_consistent(cls, v, info):
        if "fev1" in info.data and "fvc" in info.data:
            fvc = info.data["fvc"]
            fev1 = info.data["fev1"]
            if fvc > 0:
                computed = round(fev1 / fvc, 3)
                if abs(computed - v) > 0.1:
                    raise ValueError(
                        f"FEV1/FVC ratio {v} inconsistent with FEV1={fev1} and FVC={fvc} "
                        f"(computed: {computed})"
                    )
        return v


# ── Feedback ─────────────────────────────────────────────────────────────────

class FeedbackInput(BaseModel):
    module: str               = Field(..., description="hepatic | diabetes | thyroid | respiratory")
    prediction_id: str        = Field(..., description="UUID from the prediction response header")
    agree: bool               = Field(..., description="Doctor agrees with AI prediction")
    doctor_diagnosis: Optional[str] = Field(None, description="Doctor's own diagnosis if disagreeing")
    notes: Optional[str]      = Field(None, max_length=1000)
