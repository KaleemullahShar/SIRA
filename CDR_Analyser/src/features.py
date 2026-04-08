"""
src/features.py
Builds per-contact feature vectors from a cleaned CDR DataFrame.
"""

import numpy as np
import pandas as pd


def build_contact_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate CDR rows by b_party and compute behavioural features.

    Returns
    -------
    DataFrame with one row per unique B-Party contact.
    """
    g = df.groupby("b_party")

    feats = pd.DataFrame({
        "total_calls":    g.size(),
        "outgoing":       g["call_type"].apply(lambda x: x.str.contains("Outgoing").sum()),
        "incoming":       g["call_type"].apply(lambda x: x.str.contains("Incoming").sum()),
        "sms_count":      g["call_type"].apply(lambda x: x.str.contains("SMS").sum()),
        "voice_count":    g["call_type"].apply(lambda x: (~x.str.contains("SMS")).sum()),
        "total_duration": g["duration"].sum()   if "duration"  in df.columns else 0,
        "avg_duration":   g["duration"].mean()  if "duration"  in df.columns else 0,
        "unique_days":    g["date"].nunique()    if "date"      in df.columns else 0,
        "night_calls":    g["hour"].apply(lambda x: ((x >= 22) | (x <= 5)).sum())
                          if "hour" in df.columns else 0,
        "unique_sites":   g["site_name"].nunique() if "site_name" in df.columns else 0,
    }).reset_index()

    # Derived ratios
    feats["night_ratio"]    = feats["night_calls"] / feats["total_calls"].clip(1)
    feats["sms_ratio"]      = feats["sms_count"]   / feats["total_calls"].clip(1)
    feats["incoming_ratio"] = feats["incoming"]    / feats["total_calls"].clip(1)

    return feats


def suspicious_reasons(row) -> str:
    """Return a human-readable string describing why a contact is suspicious."""
    reasons = []
    if row.get("night_ratio",  0) > 0.40: reasons.append("High night activity")
    if row.get("sms_ratio",    0) > 0.90 and row.get("total_calls", 0) > 5:
        reasons.append("Bulk SMS pattern")
    if row.get("total_calls",  0) > 40:   reasons.append("Unusually high frequency")
    if row.get("avg_duration", 0) > 600:  reasons.append("Very long call durations")
    if row.get("unique_sites", 0) > 8:    reasons.append("Multi-tower mobility")
    return ", ".join(reasons) if reasons else "—"
