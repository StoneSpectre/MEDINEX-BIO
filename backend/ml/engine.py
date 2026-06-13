"""
Medinex ML Engine
-----------------
Handles:
  1. Training XGBoost models for hepatic, diabetes, thyroid, respiratory
  2. SHAP-based explainability for each prediction
  3. Isolation Forest anomaly detection per module
  4. Model persistence (save/load via joblib)

Run directly to train & save all models:
  python -m app.ml.engine
"""

import numpy as np
import pandas as pd
import shap
import joblib
import os
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import roc_auc_score, classification_report
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

logger = logging.getLogger(__name__)

MODEL_DIR = Path(os.getenv("MODEL_DIR", "./models"))
MODEL_DIR.mkdir(exist_ok=True)

# ── Feature metadata (display names + normal ranges shown in UI) ──────────────
FEATURE_META = {
    # Hepatic
    "total_bilirubin":        ("Total Bilirubin",      "0.1–1.2 mg/dL"),
    "direct_bilirubin":       ("Direct Bilirubin",     "0.0–0.3 mg/dL"),
    "alkaline_phosphatase":   ("Alkaline Phosphatase", "44–147 IU/L"),
    "alt":                    ("ALT",                  "7–56 IU/L"),
    "ast":                    ("AST",                  "10–40 IU/L"),
    "total_protein":          ("Total Protein",        "6.0–8.3 g/dL"),
    "albumin":                ("Albumin",              "3.5–5.0 g/dL"),
    "albumin_globulin_ratio": ("Albumin/Globulin Ratio","1.0–2.5"),
    "bmi":                    ("BMI",                  "18.5–24.9 kg/m²"),
    "alcohol_units_per_week": ("Alcohol Consumption",  "0–14 units/week safe"),
    # Diabetes
    "glucose":                ("Fasting Glucose",      "70–100 mg/dL"),
    "blood_pressure":         ("Diastolic BP",         "60–80 mmHg"),
    "insulin":                ("Serum Insulin",        "2–25 µU/mL"),
    "hba1c":                  ("HbA1c",               "< 5.7% normal"),
    "diabetes_pedigree":      ("Diabetes Pedigree",    "Lower = less genetic risk"),
    "skin_thickness":         ("Skin Thickness",       "10–30 mm typical"),
    # Thyroid
    "tsh":                    ("TSH",                  "0.4–4.0 mIU/L"),
    "t3":                     ("Free T3",              "2.0–4.4 pg/mL"),
    "t4":                     ("Free T4",              "0.8–1.8 ng/dL"),
    # Respiratory
    "fev1":                   ("FEV1",                 "> 80% predicted"),
    "fvc":                    ("FVC",                  "> 80% predicted"),
    "fev1_fvc_ratio":         ("FEV1/FVC Ratio",       "> 0.70 normal"),
    "spo2":                   ("Resting SpO2",         "> 95%"),
    "pack_years":             ("Pack-years",           "0 = non-smoker"),
    "dyspnea_scale":          ("MRC Dyspnea Scale",    "0 = none, 4 = severe"),
    # Shared
    "age":                    ("Age",                  None),
    "sex":                    ("Sex",                  None),
    "pregnancies":            ("Pregnancies",          None),
    "family_history":         ("Family History",       None),
}


def _risk_level(score: float) -> str:
    if score < 0.25:  return "low"
    if score < 0.50:  return "moderate"
    if score < 0.75:  return "high"
    return "critical"


def _make_shap_features(
    feature_names: List[str],
    feature_values: np.ndarray,
    shap_values: np.ndarray,
    top_n: int = 6,
) -> List[Dict]:
    """Return top-N features ranked by absolute SHAP value."""
    pairs = list(zip(feature_names, feature_values, shap_values))
    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    result = []
    for fname, fval, sval in pairs[:top_n]:
        meta = FEATURE_META.get(fname, (fname.replace("_", " ").title(), None))
        result.append({
            "feature": fname,
            "display_name": meta[0],
            "value": round(float(fval), 3),
            "shap_value": round(float(sval), 4),
            "direction": "up" if sval > 0 else "down",
            "normal_range": meta[1],
        })
    return result


# ══════════════════════════════════════════════════════════════════════════════
# HEPATIC MODEL
# ══════════════════════════════════════════════════════════════════════════════
HEPATIC_FEATURES = [
    "age", "sex", "total_bilirubin", "direct_bilirubin",
    "alkaline_phosphatase", "alt", "ast",
    "total_protein", "albumin", "albumin_globulin_ratio",
    "bmi", "alcohol_units_per_week",
]

def _generate_hepatic_data(n: int = 1200) -> pd.DataFrame:
    """
    Synthetic training data calibrated to ILPD statistics.
    Replace with real ILPD CSV in production:
      df = pd.read_csv('data/ilpd.csv')
    """
    rng = np.random.default_rng(42)
    disease = rng.binomial(1, 0.40, n)  # ~40% prevalence matches ILPD

    df = pd.DataFrame({
        "age":                    rng.integers(20, 80, n),
        "sex":                    rng.binomial(1, 0.75, n),   # ILPD male-heavy
        "total_bilirubin":        np.where(disease,
                                      rng.gamma(4, 1.2, n),
                                      rng.gamma(1.5, 0.4, n)).clip(0.1, 40),
        "direct_bilirubin":       np.where(disease,
                                      rng.gamma(2.5, 0.8, n),
                                      rng.gamma(0.8, 0.2, n)).clip(0, 15),
        "alkaline_phosphatase":   np.where(disease,
                                      rng.normal(320, 120, n),
                                      rng.normal(160, 50, n)).clip(20, 1200),
        "alt":                    np.where(disease,
                                      rng.gamma(8, 18, n),
                                      rng.gamma(3, 8, n)).clip(5, 800),
        "ast":                    np.where(disease,
                                      rng.gamma(7, 18, n),
                                      rng.gamma(3, 7, n)).clip(5, 600),
        "total_protein":          np.where(disease,
                                      rng.normal(6.2, 0.9, n),
                                      rng.normal(7.2, 0.6, n)).clip(2, 12),
        "albumin":                np.where(disease,
                                      rng.normal(3.1, 0.6, n),
                                      rng.normal(4.0, 0.4, n)).clip(1, 6),
        "albumin_globulin_ratio": np.where(disease,
                                      rng.normal(0.85, 0.3, n),
                                      rng.normal(1.4, 0.3, n)).clip(0.3, 3.5),
        "bmi":                    rng.normal(26, 5, n).clip(14, 50),
        "alcohol_units_per_week": np.where(disease,
                                      rng.exponential(12, n),
                                      rng.exponential(3, n)).clip(0, 100),
        "label":                  disease,
    })
    # Enforce direct ≤ total
    df["direct_bilirubin"] = df[["direct_bilirubin", "total_bilirubin"]].min(axis=1)
    return df


def train_hepatic() -> Tuple[Pipeline, shap.Explainer, IsolationForest]:
    logger.info("Training hepatic model …")
    df = _generate_hepatic_data()
    X, y = df[HEPATIC_FEATURES], df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    sm = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X_train, y_train)

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", XGBClassifier(
            n_estimators=200, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, n_jobs=-1,
        )),
    ])
    model.fit(X_res, y_res)

    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob)
    logger.info(f"Hepatic model AUC-ROC: {auc:.3f}")

    explainer = shap.TreeExplainer(model.named_steps["clf"])
    anomaly = IsolationForest(contamination=0.05, random_state=42)
    anomaly.fit(X_train)

    joblib.dump(model,    MODEL_DIR / "hepatic_model.pkl")
    joblib.dump(explainer, MODEL_DIR / "hepatic_explainer.pkl")
    joblib.dump(anomaly,  MODEL_DIR / "hepatic_anomaly.pkl")
    joblib.dump(HEPATIC_FEATURES, MODEL_DIR / "hepatic_features.pkl")
    logger.info("Hepatic model saved.")
    return model, explainer, anomaly


# ══════════════════════════════════════════════════════════════════════════════
# DIABETES MODEL
# ══════════════════════════════════════════════════════════════════════════════
DIABETES_FEATURES = [
    "pregnancies", "glucose", "blood_pressure", "skin_thickness",
    "insulin", "bmi", "diabetes_pedigree", "age", "hba1c",
    "family_history", "sex",
]

def _generate_diabetes_data(n: int = 1500) -> pd.DataFrame:
    """Calibrated to Pima Indians Diabetes Database statistics + HbA1c column."""
    rng = np.random.default_rng(43)
    disease = rng.binomial(1, 0.35, n)

    df = pd.DataFrame({
        "pregnancies":       np.where(rng.binomial(1, 0.5, n)==0, 0,
                                rng.integers(1, 12, n)).astype(float),
        "glucose":           np.where(disease,
                                 rng.normal(148, 30, n),
                                 rng.normal(110, 20, n)).clip(50, 400),
        "blood_pressure":    rng.normal(72, 12, n).clip(40, 140),
        "skin_thickness":    rng.normal(20, 10, n).clip(0, 80),
        "insulin":           np.where(disease,
                                 rng.exponential(150, n),
                                 rng.exponential(60, n)).clip(0, 700),
        "bmi":               np.where(disease,
                                 rng.normal(34, 7, n),
                                 rng.normal(28, 5, n)).clip(14, 65),
        "diabetes_pedigree": rng.exponential(0.47, n).clip(0.05, 2.5),
        "age":               rng.integers(20, 80, n).astype(float),
        "hba1c":             np.where(disease,
                                 rng.normal(7.5, 1.2, n),
                                 rng.normal(5.5, 0.6, n)).clip(3.5, 16),
        "family_history":    rng.binomial(1, 0.45 if True else 0.20, n).astype(float),
        "sex":               rng.binomial(1, 0.5, n).astype(float),
        "label":             disease,
    })
    return df


def train_diabetes() -> Tuple[Pipeline, shap.Explainer, IsolationForest]:
    logger.info("Training diabetes model …")
    df = _generate_diabetes_data()
    X, y = df[DIABETES_FEATURES], df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    sm = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X_train, y_train)

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", XGBClassifier(
            n_estimators=250, max_depth=5, learning_rate=0.04,
            subsample=0.8, colsample_bytree=0.9,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, n_jobs=-1,
        )),
    ])
    model.fit(X_res, y_res)

    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob)
    logger.info(f"Diabetes model AUC-ROC: {auc:.3f}")

    explainer = shap.TreeExplainer(model.named_steps["clf"])
    anomaly = IsolationForest(contamination=0.05, random_state=42)
    anomaly.fit(X_train)

    joblib.dump(model,    MODEL_DIR / "diabetes_model.pkl")
    joblib.dump(explainer, MODEL_DIR / "diabetes_explainer.pkl")
    joblib.dump(anomaly,  MODEL_DIR / "diabetes_anomaly.pkl")
    joblib.dump(DIABETES_FEATURES, MODEL_DIR / "diabetes_features.pkl")
    logger.info("Diabetes model saved.")
    return model, explainer, anomaly


# ══════════════════════════════════════════════════════════════════════════════
# THYROID MODEL
# ══════════════════════════════════════════════════════════════════════════════
THYROID_FEATURES = [
    "age", "sex", "tsh", "t3", "t4",
    "on_thyroxine", "on_antithyroid_meds", "sick", "pregnant",
    "thyroid_surgery", "goitre", "tumor", "hypopituitary", "psych",
]

def _generate_thyroid_data(n: int = 2000) -> pd.DataFrame:
    """
    Multi-class: 0 = euthyroid, 1 = hypothyroid, 2 = hyperthyroid
    Calibrated to UCI Thyroid Disease Dataset distributions.
    """
    rng = np.random.default_rng(44)
    # ~70% euthyroid, ~20% hypo, ~10% hyper
    label = rng.choice([0, 1, 2], size=n, p=[0.70, 0.20, 0.10])

    tsh_vals = np.where(label == 0, rng.lognormal(0.7, 0.5, n),
               np.where(label == 1, rng.lognormal(3.0, 0.8, n),
                                     rng.lognormal(-2.0, 0.8, n))).clip(0.01, 80)
    t3_vals  = np.where(label == 0, rng.normal(3.1, 0.5, n),
               np.where(label == 1, rng.normal(2.0, 0.5, n),
                                     rng.normal(5.5, 1.0, n))).clip(0.5, 12)
    t4_vals  = np.where(label == 0, rng.normal(1.2, 0.2, n),
               np.where(label == 1, rng.normal(0.7, 0.2, n),
                                     rng.normal(2.5, 0.5, n))).clip(0.2, 8)

    df = pd.DataFrame({
        "age":                 rng.integers(18, 85, n).astype(float),
        "sex":                 rng.binomial(1, 0.38, n).astype(float),  # UCI male ratio
        "tsh":                 tsh_vals,
        "t3":                  t3_vals,
        "t4":                  t4_vals,
        "on_thyroxine":        np.where(label == 1, rng.binomial(1, 0.5, n),
                                   rng.binomial(1, 0.05, n)).astype(float),
        "on_antithyroid_meds": np.where(label == 2, rng.binomial(1, 0.3, n),
                                   rng.binomial(1, 0.02, n)).astype(float),
        "sick":                rng.binomial(1, 0.05, n).astype(float),
        "pregnant":            rng.binomial(1, 0.04, n).astype(float),
        "thyroid_surgery":     rng.binomial(1, 0.05, n).astype(float),
        "goitre":              np.where(label == 1, rng.binomial(1, 0.15, n),
                                   rng.binomial(1, 0.02, n)).astype(float),
        "tumor":               rng.binomial(1, 0.02, n).astype(float),
        "hypopituitary":       rng.binomial(1, 0.01, n).astype(float),
        "psych":               rng.binomial(1, 0.04, n).astype(float),
        "label":               label,
    })
    return df


def train_thyroid() -> Tuple[Pipeline, shap.Explainer, IsolationForest]:
    logger.info("Training thyroid model …")
    df = _generate_thyroid_data()
    X, y = df[THYROID_FEATURES], df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", XGBClassifier(
            n_estimators=300, max_depth=4, learning_rate=0.04,
            subsample=0.85, colsample_bytree=0.85,
            objective="multi:softprob", num_class=3,
            use_label_encoder=False, eval_metric="mlogloss",
            random_state=42, n_jobs=-1,
        )),
    ])
    model.fit(X_train, y_train)

    y_prob = model.predict_proba(X_test)
    auc = roc_auc_score(y_test, y_prob, multi_class="ovr")
    logger.info(f"Thyroid model AUC-ROC (OVR): {auc:.3f}")

    explainer = shap.TreeExplainer(model.named_steps["clf"])
    anomaly = IsolationForest(contamination=0.05, random_state=42)
    anomaly.fit(X_train)

    joblib.dump(model,    MODEL_DIR / "thyroid_model.pkl")
    joblib.dump(explainer, MODEL_DIR / "thyroid_explainer.pkl")
    joblib.dump(anomaly,  MODEL_DIR / "thyroid_anomaly.pkl")
    joblib.dump(THYROID_FEATURES, MODEL_DIR / "thyroid_features.pkl")
    logger.info("Thyroid model saved.")
    return model, explainer, anomaly


# ══════════════════════════════════════════════════════════════════════════════
# RESPIRATORY MODEL
# ══════════════════════════════════════════════════════════════════════════════
RESPIRATORY_FEATURES = [
    "age", "sex", "fev1", "fvc", "fev1_fvc_ratio", "spo2",
    "pack_years", "dyspnea_scale", "cough_frequency",
    "wheezing", "chest_tightness", "occupational_exposure",
]

def _generate_respiratory_data(n: int = 1500) -> pd.DataFrame:
    """Calibrated to COPD + asthma clinical distributions."""
    rng = np.random.default_rng(45)
    disease = rng.binomial(1, 0.35, n)

    fvc   = np.where(disease, rng.normal(2.8, 0.7, n), rng.normal(4.0, 0.8, n)).clip(0.8, 8)
    ratio = np.where(disease, rng.normal(0.58, 0.1, n), rng.normal(0.78, 0.08, n)).clip(0.2, 1.0)
    fev1  = (fvc * ratio).clip(0.3, 6)

    df = pd.DataFrame({
        "age":                  rng.integers(25, 85, n).astype(float),
        "sex":                  rng.binomial(1, 0.55, n).astype(float),
        "fev1":                 fev1,
        "fvc":                  fvc,
        "fev1_fvc_ratio":       ratio,
        "spo2":                 np.where(disease,
                                    rng.normal(91, 4, n),
                                    rng.normal(97, 1.5, n)).clip(70, 100),
        "pack_years":           np.where(disease,
                                    rng.exponential(20, n),
                                    rng.exponential(5, n)).clip(0, 150),
        "dyspnea_scale":        np.where(disease,
                                    rng.choice([1,2,3,4], n, p=[0.25,0.35,0.25,0.15]),
                                    rng.choice([0,1,2], n, p=[0.6,0.3,0.1])).astype(float),
        "cough_frequency":      np.where(disease,
                                    rng.choice([1,2,3], n, p=[0.3,0.4,0.3]),
                                    rng.choice([0,1,2], n, p=[0.6,0.3,0.1])).astype(float),
        "wheezing":             np.where(disease,
                                    rng.binomial(1, 0.65, n),
                                    rng.binomial(1, 0.10, n)).astype(float),
        "chest_tightness":      np.where(disease,
                                    rng.binomial(1, 0.55, n),
                                    rng.binomial(1, 0.08, n)).astype(float),
        "occupational_exposure":rng.binomial(1, 0.25, n).astype(float),
        "label":                disease,
    })
    return df


def train_respiratory() -> Tuple[Pipeline, shap.Explainer, IsolationForest]:
    logger.info("Training respiratory model …")
    df = _generate_respiratory_data()
    X, y = df[RESPIRATORY_FEATURES], df["label"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    sm = SMOTE(random_state=42)
    X_res, y_res = sm.fit_resample(X_train, y_train)

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", XGBClassifier(
            n_estimators=250, max_depth=5, learning_rate=0.04,
            subsample=0.85, colsample_bytree=0.85,
            use_label_encoder=False, eval_metric="logloss",
            random_state=42, n_jobs=-1,
        )),
    ])
    model.fit(X_res, y_res)

    y_prob = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, y_prob)
    logger.info(f"Respiratory model AUC-ROC: {auc:.3f}")

    explainer = shap.TreeExplainer(model.named_steps["clf"])
    anomaly = IsolationForest(contamination=0.05, random_state=42)
    anomaly.fit(X_train)

    joblib.dump(model,    MODEL_DIR / "respiratory_model.pkl")
    joblib.dump(explainer, MODEL_DIR / "respiratory_explainer.pkl")
    joblib.dump(anomaly,  MODEL_DIR / "respiratory_anomaly.pkl")
    joblib.dump(RESPIRATORY_FEATURES, MODEL_DIR / "respiratory_features.pkl")
    logger.info("Respiratory model saved.")
    return model, explainer, anomaly


# ══════════════════════════════════════════════════════════════════════════════
# UNIFIED PREDICTOR
# ══════════════════════════════════════════════════════════════════════════════

class MedinexPredictor:
    """Lazy-loads models on first call per module."""

    _cache: Dict = {}

    def _load(self, module: str):
        if module in self._cache:
            return self._cache[module]
        model    = joblib.load(MODEL_DIR / f"{module}_model.pkl")
        explainer= joblib.load(MODEL_DIR / f"{module}_explainer.pkl")
        anomaly  = joblib.load(MODEL_DIR / f"{module}_anomaly.pkl")
        features = joblib.load(MODEL_DIR / f"{module}_features.pkl")
        self._cache[module] = (model, explainer, anomaly, features)
        return self._cache[module]

    def _detect_anomalies(
        self, anomaly_det: IsolationForest,
        X: np.ndarray, feature_names: List[str],
    ) -> List[str]:
        score = anomaly_det.decision_function(X)[0]
        if score < -0.15:
            return ["⚠ One or more values appear physiologically unusual. Please verify data entry."]
        return []

    def predict(self, module: str, data: Dict) -> Dict:
        model, explainer, anomaly_det, features = self._load(module)
        X = pd.DataFrame([{f: data.get(f, 0) for f in features}])

        # Risk score
        proba = model.predict_proba(X)

        if module == "thyroid":
            # Multi-class: return dominant non-euthyroid risk
            p_hypo, p_hyper = proba[0][1], proba[0][2]
            dominant_risk = max(p_hypo, p_hyper)
            risk_score = float(dominant_risk)
            thyroid_class = "hypothyroid" if p_hypo >= p_hyper else "hyperthyroid"
            summary_prefix = f"Pattern suggests {thyroid_class} state."
        else:
            risk_score = float(proba[0][1])
            summary_prefix = ""

        # SHAP
        X_scaled = model.named_steps["scaler"].transform(X)
        if module == "thyroid":
            sv = explainer.shap_values(X_scaled)
            # Use class with highest risk
            class_idx = 1 if (proba[0][1] >= proba[0][2]) else 2
            shap_vals = sv[class_idx][0]
        else:
            sv = explainer.shap_values(X_scaled)
            shap_vals = sv[0] if isinstance(sv, list) else sv[0]

        top_factors = _make_shap_features(features, X.values[0], shap_vals)

        # Anomalies
        anomalies = self._detect_anomalies(anomaly_det, X.values, features)

        # Summary
        level = _risk_level(risk_score)
        level_text = {"low": "low", "moderate": "moderate", "high": "elevated", "critical": "critical"}[level]
        top_driver = top_factors[0]["display_name"] if top_factors else "multiple factors"

        if module == "thyroid":
            summary = f"{summary_prefix} Confidence: {int(risk_score*100)}%. Primary driver: {top_driver}."
        else:
            summary = (
                f"{int(risk_score*100)}% risk — {level_text}. "
                f"Primary driver: {top_driver}."
            )

        # Diagnosis formulation
        if module == "thyroid":
            diagnosis = f"Clinical {thyroid_class.title()}" if risk_score > 0.50 else "Euthyroid (Normal)"
        elif module == "diabetes":
            diagnosis = "Type 2 Diabetes Mellitus" if risk_score > 0.50 else "No Diabetes Detected"
        elif module == "hepatic":
            diagnosis = "Hepatocellular Disease / Cirrhosis" if risk_score > 0.50 else "Healthy Hepatic Function"
        elif module == "respiratory":
            diagnosis = "Chronic Respiratory Disease (COPD/Asthma)" if risk_score > 0.50 else "Healthy Respiratory Function"
        else:
            diagnosis = "Positive Finding" if risk_score > 0.50 else "Negative Finding"

        return {
            "module": module,
            "risk_score": risk_score,
            "risk_level": level,
            "risk_percent": int(risk_score * 100),
            "diagnosis": diagnosis,
            "top_factors": top_factors,
            "summary": summary,
            "anomalies": anomalies,
            "model_version": "1.0.0",
        }


predictor = MedinexPredictor()


# ── Train all models when run directly ───────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_hepatic()
    train_diabetes()
    train_thyroid()
    train_respiratory()
    print("\n✅ All Phase-1 models trained and saved to", MODEL_DIR.resolve())
