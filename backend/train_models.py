import os
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

def generate_synthetic_data(n_samples=10000):
    np.random.seed(42)
    
    # Generate Base Vitals
    age = np.random.normal(55, 15, n_samples).clip(18, 90)
    
    # Cardiovascular factors
    sys_bp = np.random.normal(125, 20, n_samples).clip(90, 200)
    dia_bp = sys_bp * 0.6 + np.random.normal(10, 5, n_samples)
    cholesterol = np.random.normal(200, 40, n_samples).clip(120, 350)
    heart_rate = np.random.normal(75, 12, n_samples).clip(50, 120)
    
    # Renal factors
    egfr = np.random.normal(90, 25, n_samples).clip(10, 140)
    creatinine = np.random.normal(1.0, 0.4, n_samples).clip(0.5, 5.0)
    diabetes = np.random.choice([0, 1], p=[0.8, 0.2], size=n_samples)
    
    # Generate labels based on hidden deterministic clinical correlations + some noise
    # Cardio Risk: Higher age, high bp, high chol = higher risk
    cardio_risk_score = (age/90)*0.3 + (sys_bp/200)*0.4 + (cholesterol/350)*0.3
    cardio_risk = (cardio_risk_score + np.random.normal(0, 0.05, n_samples)) > 0.65
    
    # Renal Risk: Low eGFR, high creatinine, diabetes = higher risk
    renal_risk_score = ((140-egfr)/140)*0.4 + (creatinine/5.0)*0.4 + (diabetes)*0.2
    renal_risk = (renal_risk_score + np.random.normal(0, 0.05, n_samples)) > 0.55
    
    df = pd.DataFrame({
        "age": age,
        "sys_bp": sys_bp,
        "dia_bp": dia_bp,
        "cholesterol": cholesterol,
        "heart_rate": heart_rate,
        "egfr": egfr,
        "creatinine": creatinine,
        "diabetes": diabetes,
        "target_cardio": cardio_risk.astype(int),
        "target_renal": renal_risk.astype(int)
    })
    
    return df

def train_and_save_models():
    print("Generating 10,000 synthetic patient records...")
    df = generate_synthetic_data()
    
    os.makedirs(os.path.join("backend", "models"), exist_ok=True)
    
    # 1. Cardiovascular Model
    print("\n--- Training Cardiovascular Model ---")
    features_cardio = ["age", "sys_bp", "dia_bp", "cholesterol", "heart_rate"]
    X_c = df[features_cardio]
    y_c = df["target_cardio"]
    
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X_c, y_c, test_size=0.2, random_state=42)
    
    clf_cardio = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    clf_cardio.fit(X_train_c, y_train_c)
    
    y_pred_c = clf_cardio.predict(X_test_c)
    print(classification_report(y_test_c, y_pred_c))
    
    cardio_path = os.path.join("backend", "models", "cardio_model.pkl")
    joblib.dump(clf_cardio, cardio_path)
    print(f"Saved: {cardio_path}")
    
    # 2. Renal Model
    print("\n--- Training Renal Model ---")
    features_renal = ["age", "egfr", "creatinine", "diabetes"]
    X_r = df[features_renal]
    y_r = df["target_renal"]
    
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_r, y_r, test_size=0.2, random_state=42)
    
    clf_renal = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    clf_renal.fit(X_train_r, y_train_r)
    
    y_pred_r = clf_renal.predict(X_test_r)
    print(classification_report(y_test_r, y_pred_r))
    
    renal_path = os.path.join("backend", "models", "renal_model.pkl")
    joblib.dump(clf_renal, renal_path)
    print(f"Saved: {renal_path}")

if __name__ == "__main__":
    train_and_save_models()
