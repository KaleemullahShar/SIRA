"""
src/ml_models.py
Two unsupervised ML models:
  1. IsolationForest  – anomaly / fraud detection
  2. KMeans           – behaviour clustering / classification
"""

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------
ANOMALY_FEATURES = [
    "total_calls", "sms_ratio", "night_ratio",
    "avg_duration", "unique_days", "unique_sites", "incoming_ratio",
]

def detect_anomalies(feats: pd.DataFrame,
                     contamination: float = 0.15,
                     model_save_path: str = None) -> pd.DataFrame:
    """
    Run Isolation Forest on contact features.

    Adds columns:
      anomaly_score  – higher = more anomalous
      is_suspicious  – True / False
      risk           – 'HIGH' | 'MEDIUM' | 'LOW'

    Parameters
    ----------
    feats            : DataFrame from features.build_contact_features()
    contamination    : expected fraction of anomalies (0–0.5)
    model_save_path  : optional path to save trained model (.pkl)
    """
    cols = [c for c in ANOMALY_FEATURES if c in feats.columns]
    X    = feats[cols].fillna(0)

    scaler = StandardScaler()
    Xs     = scaler.fit_transform(X)

    iso = IsolationForest(contamination=contamination,
                          random_state=42,
                          n_estimators=200)
    iso.fit(Xs)

    feats = feats.copy()
    feats["anomaly_score"] = -iso.score_samples(Xs)   # higher = more anomalous
    feats["is_suspicious"] = iso.predict(Xs) == -1

    def _risk(row):
        s = row["anomaly_score"]
        if s > 0.60: return "HIGH"
        if s > 0.45: return "MEDIUM"
        return "LOW"

    feats["risk"] = feats.apply(_risk, axis=1)

    if model_save_path:
        joblib.dump({"model": iso, "scaler": scaler, "features": cols},
                    model_save_path)
        print(f"  Anomaly model saved → {model_save_path}")

    return feats


# ---------------------------------------------------------------------------
# Behaviour Classification
# ---------------------------------------------------------------------------
BEHAVIOUR_FEATURES = [
    "total_calls", "sms_ratio", "night_ratio", "avg_duration", "incoming_ratio",
]

BEHAVIOUR_LABELS = {
    "high_calls_sms":    "Heavy SMS User",
    "high_calls_night":  "Night-Active Heavy Caller",
    "high_calls":        "High-Frequency Caller",
    "sms_only":          "SMS-Only Contact",
    "long_duration":     "Long-Duration Caller",
    "mostly_incoming":   "Mostly Incoming",
    "occasional":        "Occasional Contact",
}


def _label_cluster(row, centers, cols):
    tc = row.get("total_calls",   0)
    sm = row.get("sms_ratio",     0)
    nr = row.get("night_ratio",   0)
    ad = row.get("avg_duration",  0)
    ir = row.get("incoming_ratio",0)
    q75_tc = centers["total_calls"].quantile(0.75) if "total_calls" in centers else 0
    q75_ad = centers["avg_duration"].quantile(0.75) if "avg_duration" in centers else 0

    if tc >= q75_tc:
        if sm > 0.70: return BEHAVIOUR_LABELS["high_calls_sms"]
        if nr > 0.30: return BEHAVIOUR_LABELS["high_calls_night"]
        return BEHAVIOUR_LABELS["high_calls"]
    if sm > 0.80: return BEHAVIOUR_LABELS["sms_only"]
    if ad > q75_ad: return BEHAVIOUR_LABELS["long_duration"]
    if ir > 0.80: return BEHAVIOUR_LABELS["mostly_incoming"]
    return BEHAVIOUR_LABELS["occasional"]


def classify_behaviour(feats: pd.DataFrame,
                       n_clusters: int = 5,
                       model_save_path: str = None) -> pd.DataFrame:
    """
    Run KMeans clustering and assign human-readable behaviour labels.

    Adds columns:
      cluster    – integer cluster id
      behaviour  – descriptive label string

    Parameters
    ----------
    feats           : DataFrame from features.build_contact_features()
    n_clusters      : number of clusters (auto-capped at len(feats))
    model_save_path : optional path to save trained model (.pkl)
    """
    cols = [c for c in BEHAVIOUR_FEATURES if c in feats.columns]
    X    = feats[cols].fillna(0)
    n    = min(n_clusters, len(feats))

    scaler = StandardScaler()
    Xs     = scaler.fit_transform(X)

    km = KMeans(n_clusters=n, random_state=42, n_init=10)
    km.fit(Xs)

    feats = feats.copy()
    feats["cluster"] = km.predict(Xs)

    # Label using cluster centres (inverse-transformed back to original scale)
    centers = pd.DataFrame(scaler.inverse_transform(km.cluster_centers_), columns=cols)
    feats["behaviour"] = feats.apply(
        lambda row: _label_cluster(
            centers.iloc[int(row["cluster"])].to_dict(), centers, cols
        ), axis=1
    )

    if model_save_path:
        joblib.dump({"model": km, "scaler": scaler, "features": cols},
                    model_save_path)
        print(f"  Behaviour model saved → {model_save_path}")

    return feats


def load_model(path: str):
    """Load a previously saved model bundle."""
    return joblib.load(path)
