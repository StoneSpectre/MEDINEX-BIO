import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.impute import SimpleImputer
import joblib

def train_real_cardio_model():
    print("\n--- Downloading Cleveland Heart Disease Dataset ---")
    url = "https://raw.githubusercontent.com/mrdbourke/zero-to-mastery-ml/master/data/heart-disease.csv"
    try:
        df = pd.read_csv(url)
        print(f"Downloaded shape: {df.shape}")
        
        # Features: age, sex, cp, trestbps (sys_bp), chol, fbs, restecg, thalach (heart_rate), exang, oldpeak, slope, ca, thal, target
        # We will train on the features the frontend currently supports + assumes defaults for others if necessary.
        # Frontend provides: age, sys_bp, dia_bp, cholesterol, heart_rate
        # Real dataset has: age, trestbps (sys_bp), chol (cholesterol), thalach (heart_rate). No dia_bp.
        
        features = ["age", "trestbps", "chol", "thalach"]
        X = df[features]
        y = df["target"]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        clf.fit(X_train, y_train)
        
        y_pred = clf.predict(X_test)
        print(classification_report(y_test, y_pred))
        
        os.makedirs(os.path.join("backend", "models"), exist_ok=True)
        path = os.path.join("backend", "models", "cardio_model.pkl")
        joblib.dump(clf, path)
        print(f"Saved real cardio model to {path}")
        
    except Exception as e:
        print(f"Failed to train cardio model: {e}")

def train_real_renal_model():
    print("\n--- Downloading UCI Chronic Kidney Disease Dataset ---")
    url = "https://raw.githubusercontent.com/junaidqazi/DataSets_Practice_ScienceAcademy/master/chronic_kidney_disease.csv"
    try:
        df = pd.read_csv(url)
        print(f"Downloaded shape: {df.shape}")
        
        # Real-world data is messy. Clean it up.
        df = df.replace('?', np.nan)
        df = df.replace('\t?', np.nan)
        df = df.replace('\tno', 'no')
        df = df.replace('\tyes', 'yes')
        
        # Target: 'class' (ckd or notckd)
        df['class'] = df['class'].replace('ckd\t', 'ckd')
        df['target'] = df['class'].map({'ckd': 1, 'notckd': 0})
        
        # Features frontend provides: age, egfr, creatinine, diabetes
        # Dataset has: age, sc (serum creatinine), dm (diabetes mellitus)
        # It doesn't have an explicit 'eGFR' column, but it has 'bp', 'bgr', 'bu'. We'll train on age, sc, and dm.
        
        # Convert numeric columns
        df['age'] = pd.to_numeric(df['age'], errors='coerce')
        df['sc'] = pd.to_numeric(df['sc'], errors='coerce')
        
        # Convert diabetes (dm) to 1/0
        df['dm'] = df['dm'].replace({'yes': 1, 'no': 0})
        df['dm'] = pd.to_numeric(df['dm'], errors='coerce')
        
        features = ["age", "sc", "dm"]
        
        # Handle missing values using SimpleImputer (median for clinical data is robust)
        X = df[features]
        y = df["target"]
        
        # Filter out rows where target is missing
        mask = y.notna()
        X = X[mask]
        y = y[mask]
        
        imputer = SimpleImputer(strategy='median')
        X_imputed = imputer.fit_transform(X)
        X_imputed = pd.DataFrame(X_imputed, columns=features)
        
        X_train, X_test, y_train, y_test = train_test_split(X_imputed, y, test_size=0.2, random_state=42)
        
        clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
        clf.fit(X_train, y_train)
        
        y_pred = clf.predict(X_test)
        print(classification_report(y_test, y_pred))
        
        path = os.path.join("backend", "models", "renal_model.pkl")
        joblib.dump(clf, path)
        print(f"Saved real renal model to {path}")
        
    except Exception as e:
        print(f"Failed to train renal model: {e}")

if __name__ == "__main__":
    train_real_cardio_model()
    train_real_renal_model()
