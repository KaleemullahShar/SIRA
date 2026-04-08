"""
api.py — FastAPI Backend for CDR Analysis
Run: uvicorn api:app --reload --port 8000
"""

import os, re, uuid, shutil
import numpy as np
import pandas as pd
from pathlib import Path

os.chdir(Path(__file__).parent)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from main import load_file, preprocess, build_features, detect_anomalies, build_pdf, sus_reasons
from src.ml_models import classify_behaviour

app = FastAPI(title="CDR Analysis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads"); UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR = Path("output");  OUTPUT_DIR.mkdir(exist_ok=True)


def _safe(val):
    try:
        if pd.isna(val): return None
    except Exception: pass
    if isinstance(val, (np.integer,)):  return int(val)
    if isinstance(val, (np.floating,)): return float(val)
    if isinstance(val, pd.Timestamp):   return str(val)
    return val


@app.get("/health")
def health():
    return {"status": "ok", "api": "CDR Analysis", "version": "1.0.0"}


@app.post("/analyse")
async def analyse(file: UploadFile = File(...), contamination: float = 0.15):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".xlsx", ".xls", ".csv"):
        raise HTTPException(400, "Only .xlsx, .xls and .csv files are supported.")

    session_id  = str(uuid.uuid4())[:8]
    input_path  = UPLOAD_DIR / f"{session_id}{ext}"
    output_path = OUTPUT_DIR / f"CDR_{session_id}.pdf"

    with open(input_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        raw   = load_file(str(input_path))
        df    = preprocess(raw)

        if "a_party" not in df.columns or "b_party" not in df.columns:
            raise HTTPException(422, "Could not detect A-Party/B-Party columns.")

        tgt = re.sub(r"\D", "", str(df["a_party"].mode()[0]))
        tgt = "0"+tgt[2:] if tgt.startswith("92") and len(tgt)==12 else tgt

        feats = build_features(df)
        feats = detect_anomalies(feats, contamination)
        feats = classify_behaviour(feats)
        feats["name"] = "--"; feats["cnic"] = "--"; feats["address"] = "--"

        build_pdf(df, feats, tgt, str(output_path))

        # KPIs
        out_voice = int((df["call_type"]=="Outgoing").sum())
        in_voice  = int((df["call_type"]=="Incoming").sum())
        out_sms   = int((df["call_type"]=="Outgoing SMS").sum())
        in_sms    = int((df["call_type"]=="Incoming SMS").sum())
        total_dur = int(df["duration"].sum()) if "duration" in df.columns else 0

        summary = {
            "target_number":    tgt,
            "total_records":    len(df),
            "date_from":        str(df["datetime"].min().date()) if "datetime" in df.columns else None,
            "date_to":          str(df["datetime"].max().date()) if "datetime" in df.columns else None,
            "unique_contacts":  int(df["b_party"].nunique()),
            "outgoing_calls":   out_voice,
            "incoming_calls":   in_voice,
            "outgoing_sms":     out_sms,
            "incoming_sms":     in_sms,
            "total_duration_s": total_dur,
            "suspicious_count": int(feats["is_suspicious"].sum()),
            "high_risk":        int((feats["risk"]=="HIGH").sum()),
            "medium_risk":      int((feats["risk"]=="MEDIUM").sum()),
            "low_risk":         int((feats["risk"]=="LOW").sum()),
        }

        contacts = []
        for _, row in feats.sort_values("total_calls", ascending=False).iterrows():
            contacts.append({
                "number":        str(row["b_party"]),
                "total_calls":   int(row["total_calls"]),
                "outgoing":      int(row.get("outgoing", 0)),
                "incoming":      int(row.get("incoming", 0)),
                "sms_count":     int(row.get("sms_count", 0)),
                "voice_count":   int(row.get("voice_count", 0)),
                "avg_duration":  round(float(row.get("avg_duration", 0)), 1),
                "night_ratio":   round(float(row.get("night_ratio", 0))*100, 1),
                "unique_sites":  int(row.get("unique_sites", 0)),
                "burst_score":   int(row.get("burst_score", 0)),
                "imei_count":    int(row.get("imei_count", 1)),
                "max_gap_days":  int(row.get("max_gap_days", 0)),
                "is_foreign":    bool(row.get("is_foreign", False)),
                "one_way":       bool(row.get("one_way", False)),
                "risk":          str(row.get("risk", "LOW")),
                "is_suspicious": bool(row.get("is_suspicious", False)),
                "behaviour":     str(row.get("behaviour", "")),
                "anomaly_score": round(float(row.get("anomaly_score", 0)), 4),
                "reasons":       sus_reasons(row),
                "first_contact": _safe(row.get("first_contact")),
                "last_contact":  _safe(row.get("last_contact")),
            })

        hourly = []
        if "hour" in df.columns:
            hc = df.groupby("hour").size().reindex(range(24), fill_value=0)
            hourly = [{"hour": f"{h:02d}:00", "calls": int(hc[h])} for h in range(24)]

        dow_data = []
        if "day_name" in df.columns:
            days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
            dow  = df.groupby("day_name").size().reindex(days, fill_value=0)
            dow_data = [{"day": d[:3], "calls": int(dow[d])} for d in days]

        ct = df["call_type"].value_counts()
        call_type_breakdown = [{"name": k, "value": int(v)} for k, v in ct.items()]

        locations = []
        if "site_name" in df.columns:
            ss = df.groupby("site_name").agg(
                visits=("site_name","count"), first=("datetime","min"),
                last=("datetime","max"), lat=("latitude","first"), lon=("longitude","first"),
            ).reset_index().sort_values("visits", ascending=False).head(20)
            for _, row in ss.iterrows():
                locations.append({
                    "site":   str(row["site_name"]),
                    "visits": int(row["visits"]),
                    "first":  str(row["first"]) if pd.notna(row["first"]) else None,
                    "last":   str(row["last"])  if pd.notna(row["last"])  else None,
                    "lat":    float(row["lat"]) if pd.notna(row["lat"]) else None,
                    "lon":    float(row["lon"]) if pd.notna(row["lon"]) else None,
                })

        beh = feats["behaviour"].value_counts()
        behaviour_distribution = [{"label": k, "count": int(v)} for k, v in beh.items()]

        return JSONResponse({
            "session_id":             session_id,
            "pdf_url":                f"/download/{session_id}",
            "summary":                summary,
            "contacts":               contacts,
            "hourly_activity":        hourly,
            "dow_activity":           dow_data,
            "call_type_breakdown":    call_type_breakdown,
            "location_trail":         locations,
            "behaviour_distribution": behaviour_distribution,
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Analysis error: {str(e)}")
    finally:
        if input_path.exists():
            input_path.unlink()


@app.get("/download/{session_id}")
def download_pdf(session_id: str):
    pdf_path = OUTPUT_DIR / f"CDR_{session_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(404, "Report not found.")
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"CDR_Analysis_{session_id}.pdf",
    )
