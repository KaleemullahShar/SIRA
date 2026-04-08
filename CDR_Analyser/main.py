"""
main.py — CDR Analysis Pipeline
Run: python main.py
"""

import argparse, re, sys, warnings, os
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

# ── Always work relative to THIS file's location ─────────────────────────────
os.chdir(Path(__file__).parent)
# ─────────────────────────────────────────────────────────────────────────────

warnings.filterwarnings("ignore")

# ── Auto-install missing packages ────────────────────────────────────────────
def _ensure(pkg, imp=None):
    import importlib, subprocess
    try: importlib.import_module(imp or pkg)
    except ImportError:
        print(f"  Installing {pkg} ...")
        try:
            subprocess.check_call([sys.executable,"-m","pip","install",pkg,
                                   "--quiet","--break-system-packages"],
                                  stderr=subprocess.DEVNULL)
        except Exception: pass

for p,i in [("pandas",None),("numpy",None),("scikit-learn","sklearn"),
             ("openpyxl",None),("reportlab",None),("joblib",None)]:
    _ensure(p,i)

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                  Table, TableStyle, HRFlowable, KeepTogether)

DEFAULT_INPUT  = "input/Input_CDR.xlsx"
DEFAULT_OUTPUT = "output/CDR_Analysis_Report.pdf"

# ── Palette ──────────────────────────────────────────────────────────────────
INK        = HexColor("#1C1C1E")
STEEL      = HexColor("#2C3E50")
SLATE      = HexColor("#34495E")
SILVER     = HexColor("#ECF0F1")
PALE       = HexColor("#F8F9FA")
RULE       = HexColor("#BDC3C7")
RED_DARK   = HexColor("#922B21")
RED_MID    = HexColor("#E74C3C")
RED_PALE   = HexColor("#FADBD8")
AMBER_DARK = HexColor("#784212")
AMBER_MID  = HexColor("#E67E22")
AMBER_PALE = HexColor("#FDEBD0")
GREEN_DARK = HexColor("#1E8449")
GREEN_PALE = HexColor("#D5F5E3")
BLUE_DARK  = HexColor("#154360")
BLUE_MID   = HexColor("#2471A3")
BLUE_PALE  = HexColor("#D6EAF8")
GOLD       = HexColor("#C9A84C")

# ── Column aliases ────────────────────────────────────────────────────────────
# ── Column aliases – add more variants here for new file formats ─────────────
COLUMN_MAP = {
    "sr":        ["sr #","sr#","sr","serial","s.no","no","#","sno"],
    "call_type": ["call type","calltype","call_type","call category"],
    "type":      ["type","media type","media","service type"],
    "direction": ["direction","dir","call direction"],
    "a_party":   ["a-party","a party","aparty","a number","a_number","anumber",
                  "msisdn","caller","source","calling number","originating","a_party",
                  "calling party","from","from number","cli"],
    "b_party":   ["b-party","b party","bparty","b number","b_number","bnumber",
                  "called","destination","dialed","receiving","terminating","b_party",
                  "called party","to","to number","dialled number","dest"],
    "datetime":  ["date & time","date&time","datetime","date time","timestamp",
                  "call time","start time","start_time","starttime","start","date",
                  "call date","call_date","call_start","event time","event_time"],
    "duration":  ["duration","dur","call duration","seconds","call_duration",
                  "talk time","talktime","length"],
    "cell_id":   ["cell id","cellid","cell_id","bts","cell","cell id hex",
                  "serving cell","cell identifier"],
    "imei":      ["imei","device id","deviceid","equipment id"],
    "imsi":      ["imsi","subscriber id","subscriberId"],
    "site":      ["site","site name","location","tower","node","cell name",
                  "cell_name","base station","bts name","location name",
                  "tower name","site_name","tower location"],
}

# ═════════════════════════════════════════════════════════════════════════════
# LOAD & PREPROCESS
# ═════════════════════════════════════════════════════════════════════════════
def load_file(path):
    ext = Path(path).suffix.lower()
    if ext in (".xlsx",".xlsm"): return pd.read_excel(path, engine="openpyxl")
    elif ext == ".xls":          return pd.read_excel(path, engine="xlrd")
    elif ext == ".csv":          return pd.read_csv(path)
    raise ValueError(f"Unsupported file: {ext}. Use .xlsx .xls or .csv")

def _fuzzy_rename(df):
    """Rename columns to standard names using COLUMN_MAP aliases."""
    df = df.loc[:, ~df.columns.str.contains(r"^Unnamed", na=False)].dropna(axis=1, how="all")
    cl = {c.lower().strip(): c for c in df.columns}
    rn = {}
    for std, vs in COLUMN_MAP.items():
        for v in vs:
            if v in cl and std not in rn.values():
                rn[cl[v]] = std; break
    return df.rename(columns=rn)

def _build_call_type(df):
    """
    Build a unified call_type column from whatever combination exists:
      - Already have call_type → normalize it
      - Have 'type' + 'direction' columns (e.g. SMS/VOICE + INCOMING/OUTGOING)
      - Have only 'direction'
      - Have only 'type'
    """
    def _normalize(s):
        s = str(s).strip().lower()
        if "outgoing sms"  in s: return "Outgoing SMS"
        if "incoming sms"  in s: return "Incoming SMS"
        if "outgoing voice" in s or s == "outgoing": return "Outgoing"
        if "incoming voice" in s or "incoming" in s or "incom" in s: return "Incoming"
        return s.title()

    if "call_type" in df.columns:
        df["call_type"] = df["call_type"].apply(_normalize)

    elif "type" in df.columns and "direction" in df.columns:
        # e.g. type=SMS, direction=INCOMING  →  "Incoming SMS"
        def _combine(row):
            t = str(row["type"]).strip().upper()
            d = str(row["direction"]).strip().upper()
            if t == "SMS":
                return "Incoming SMS" if "IN" in d else "Outgoing SMS"
            else:  # VOICE or anything else
                return "Incoming" if "IN" in d else "Outgoing"
        df["call_type"] = df.apply(_combine, axis=1)
        df.drop(columns=["type","direction"], inplace=True, errors="ignore")

    elif "direction" in df.columns:
        df["call_type"] = df["direction"].apply(_normalize)
        df.drop(columns=["direction"], inplace=True, errors="ignore")

    elif "type" in df.columns:
        df["call_type"] = df["type"].apply(_normalize)
        df.drop(columns=["type"], inplace=True, errors="ignore")

    else:
        df["call_type"] = "Unknown"

    return df

def preprocess(df):
    df = _fuzzy_rename(df)
    df = _build_call_type(df)

    # Normalize phone numbers
    def ph(s):
        s = re.sub(r"\D","", str(s))
        return "0"+s[2:] if s.startswith("92") and len(s)==12 else s
    for c in ("a_party","b_party"):
        if c in df.columns: df[c] = df[c].apply(ph)

    # Filter out short codes / service numbers (less than 7 digits = not a real contact)
    if "b_party" in df.columns:
        real_contact = df["b_party"].apply(lambda x: len(re.sub(r"\D","",str(x))) >= 7)
        removed = (~real_contact).sum()
        if removed > 0:
            print(f"      Filtered out {removed} short-code / service numbers (e.g. 6528, 123)")
        df = df[real_contact].reset_index(drop=True)

    # Parse datetime — try multiple columns if needed
    if "datetime" in df.columns:
        df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
    else:
        # Try to find any datetime-like column
        for col in df.columns:
            if df[col].dtype == "object" or "datetime" in str(df[col].dtype):
                parsed = pd.to_datetime(df[col], errors="coerce")
                if parsed.notna().sum() > len(df) * 0.5:
                    df["datetime"] = parsed
                    break
    if "datetime" in df.columns:
        df["hour"]     = df["datetime"].dt.hour
        df["date"]     = df["datetime"].dt.date
        df["day_name"] = df["datetime"].dt.day_name()

    # Parse site/location — handle both embedded lat|lon and plain text
    if "site" in df.columns:
        def ps(s):
            try:
                p = str(s).split("|")
                lat = float(p[1]) if len(p) > 1 else np.nan
                lon = float(p[2]) if len(p) > 2 else np.nan
                return p[0].strip(), lat, lon
            except: return str(s), np.nan, np.nan
        psd = df["site"].apply(lambda x: pd.Series(ps(x), index=["site_name","latitude","longitude"]))
        df["site_name"] = psd["site_name"]
        if "latitude"  not in df.columns: df["latitude"]  = psd["latitude"]
        if "longitude" not in df.columns: df["longitude"] = psd["longitude"]

    if "duration" in df.columns:
        df["duration"] = pd.to_numeric(df["duration"], errors="coerce").fillna(0)

    return df

# ═════════════════════════════════════════════════════════════════════════════
# FEATURES  —  Extended with Pakistani/forensic investigative rules
# ═════════════════════════════════════════════════════════════════════════════
def _call_burst_score(times, window_minutes=15, burst_threshold=5):
    """Count maximum calls made within any rolling window of N minutes."""
    if len(times) < burst_threshold: return 0
    times = sorted([t for t in times if pd.notna(t)])
    max_burst = 0
    for i, t in enumerate(times):
        end = t + pd.Timedelta(minutes=window_minutes)
        count = sum(1 for s in times[i:] if s <= end)
        max_burst = max(max_burst, count)
    return max_burst

def _dormant_gap_days(times):
    """Detect if there is a silence gap of 5+ days followed by sudden activity."""
    times = sorted([t for t in times if pd.notna(t)])
    if len(times) < 2: return 0
    gaps = [(times[i+1]-times[i]).days for i in range(len(times)-1)]
    return max(gaps) if gaps else 0

def build_features(df):
    g = df.groupby("b_party")

    f = pd.DataFrame({
        "total_calls":    g.size(),
        "outgoing":       g["call_type"].apply(lambda x: x.str.contains("Outgoing").sum()),
        "incoming":       g["call_type"].apply(lambda x: x.str.contains("Incoming").sum()),
        "sms_count":      g["call_type"].apply(lambda x: x.str.contains("SMS").sum()),
        "voice_count":    g["call_type"].apply(lambda x: (~x.str.contains("SMS")).sum()),
        "total_duration": g["duration"].sum()    if "duration"  in df.columns else 0,
        "avg_duration":   g["duration"].mean()   if "duration"  in df.columns else 0,
        "max_duration":   g["duration"].max()    if "duration"  in df.columns else 0,
        "unique_days":    g["date"].nunique()     if "date"      in df.columns else 0,
        "night_calls":    g["hour"].apply(lambda x: ((x>=22)|(x<=5)).sum()) if "hour" in df.columns else 0,
        "unique_sites":   g["site_name"].nunique() if "site_name" in df.columns else 0,
        "first_contact":  g["datetime"].min()    if "datetime"  in df.columns else "",
        "last_contact":   g["datetime"].max()    if "datetime"  in df.columns else "",
    }).reset_index()

    # ── Rule 1: Ratios ────────────────────────────────────────────────────────
    f["night_ratio"]    = f["night_calls"] / f["total_calls"].clip(1)
    f["sms_ratio"]      = f["sms_count"]   / f["total_calls"].clip(1)
    f["incoming_ratio"] = f["incoming"]    / f["total_calls"].clip(1)

    # ── Rule 2: One-way communication flag ───────────────────────────────────
    # >90% only incoming OR only outgoing = handler/controller pattern
    f["one_way"] = ((f["incoming_ratio"] > 0.90) | (f["incoming_ratio"] < 0.10)).astype(int)

    # ── Rule 3: Call burst detection ─────────────────────────────────────────
    # Many calls in a short window = pre-crime coordination
    if "datetime" in df.columns:
        burst = df.groupby("b_party")["datetime"].apply(
            lambda x: _call_burst_score(x.tolist())
        ).reset_index(name="burst_score")
        f = f.merge(burst, on="b_party", how="left")
        f["burst_score"] = f["burst_score"].fillna(0)
    else:
        f["burst_score"] = 0

    # ── Rule 4: Very long single call ────────────────────────────────────────
    # >15 minutes (900s) = operational planning
    f["has_long_call"] = (f["max_duration"] > 900).astype(int)

    # ── Rule 5: Multi-tower in single day ────────────────────────────────────
    # >5 different towers in one day = surveillance / reconnaissance
    if "site_name" in df.columns and "date" in df.columns:
        daily_towers = df.groupby(["b_party","date"])["site_name"].nunique()
        max_daily_towers = daily_towers.groupby("b_party").max().reset_index(name="max_daily_towers")
        f = f.merge(max_daily_towers, on="b_party", how="left")
        f["max_daily_towers"] = f["max_daily_towers"].fillna(0)
    else:
        f["max_daily_towers"] = 0

    # ── Rule 6: IMEI switching ───────────────────────────────────────────────
    # Multiple IMEIs used by same number = device swapping to avoid tracking
    if "imei" in df.columns:
        imei_count = df.groupby("b_party")["imei"].nunique().reset_index(name="imei_count")
        f = f.merge(imei_count, on="b_party", how="left")
        f["imei_count"] = f["imei_count"].fillna(1)
    else:
        f["imei_count"] = 1

    # ── Rule 7: Dormant SIM activation ──────────────────────────────────────
    # Gap of 5+ days then sudden activity = reactivated SIM
    if "datetime" in df.columns:
        gap = df.groupby("b_party")["datetime"].apply(
            lambda x: _dormant_gap_days(x.tolist())
        ).reset_index(name="max_gap_days")
        f = f.merge(gap, on="b_party", how="left")
        f["max_gap_days"] = f["max_gap_days"].fillna(0)
    else:
        f["max_gap_days"] = 0

    # ── Rule 8: Foreign number flag ──────────────────────────────────────────
    # Numbers not starting with 0 or 92 = foreign / unverified
    def _is_foreign(num):
        n = re.sub(r"\D","",str(num))
        if n.startswith("92") or n.startswith("0"): return 0
        if len(n) < 7: return 0   # already filtered short codes
        return 1
    f["is_foreign"] = f["b_party"].apply(_is_foreign)

    return f


def sus_reasons(row):
    """
    Rule-based flags used by Pakistani / forensic investigators.
    Returns list of reason strings.
    """
    r = []
    # Night activity
    if row.get("night_ratio", 0) > 0.40:
        r.append("High night-time activity (>40% calls between 10PM–5AM)")
    # Bulk SMS
    if row.get("sms_ratio", 0) > 0.90 and row.get("total_calls", 0) > 5 and row.get("voice_count", 0) > 0:
        r.append("Bulk SMS pattern")
    # High frequency
    if row.get("total_calls", 0) > 50:
        r.append("Unusually high call frequency (>50 calls)")
    # Long calls
    if row.get("max_duration", 0) > 900:
        r.append("Very long call detected (>15 min) — possible planning")
    # Multi-tower mobility
    if row.get("unique_sites", 0) > 8:
        r.append("Multi-tower mobility (>8 cell towers used)")
    # One-way communication
    if row.get("one_way", 0) == 1:
        if row.get("incoming_ratio", 0.5) > 0.90:
            r.append("One-way: almost all INCOMING — possible controlled asset")
        else:
            r.append("One-way: almost all OUTGOING — possible controller/handler")
    # Call burst
    if row.get("burst_score", 0) >= 5:
        r.append(f"Call burst detected ({int(row['burst_score'])} calls in 15 min window)")
    # Long single call
    if row.get("has_long_call", 0) == 1:
        r.append("Single call >15 minutes detected")
    # Multi-tower in one day
    if row.get("max_daily_towers", 0) > 5:
        r.append(f"Visited {int(row['max_daily_towers'])} towers in a single day — surveillance pattern")
    # IMEI switching
    if row.get("imei_count", 1) > 1:
        r.append(f"Multiple IMEIs detected ({int(row['imei_count'])}) — device swapping")
    # Dormant SIM
    if row.get("max_gap_days", 0) >= 5:
        r.append(f"Dormant then reactivated (gap of {int(row['max_gap_days'])} days)")
    # Foreign number
    if row.get("is_foreign", 0) == 1:
        r.append("Foreign / unregistered number")
    return r

# ═════════════════════════════════════════════════════════════════════════════
# ANOMALY DETECTION
# ═════════════════════════════════════════════════════════════════════════════
def detect_anomalies(f, contamination=0.15):
    # sms_ratio is down-weighted by 0.4 so bulk SMS alone doesn't spike the score.
    # Voice behaviour, night activity and mobility carry more weight.
    # ── Investigative weights — based on Pakistani/forensic CDR analysis rules ──
    # Higher weight = stronger contribution to anomaly score
    WEIGHTS = {
        "total_calls":       1.0,
        "sms_ratio":         0.4,   # low — bulk SMS alone shouldn't spike risk
        "night_ratio":       1.5,   # high — night activity is a strong indicator
        "avg_duration":      1.0,
        "max_duration":      1.2,   # long single call = planning
        "unique_days":       0.8,
        "unique_sites":      1.2,   # multi-tower mobility
        "incoming_ratio":    0.8,
        "voice_count":       1.0,
        "one_way":           1.3,   # one-way comms = handler/asset pattern
        "burst_score":       1.5,   # call bursts = pre-crime coordination
        "has_long_call":     1.2,
        "max_daily_towers":  1.3,   # surveillance/recon pattern
        "imei_count":        1.4,   # device swapping to avoid tracking
        "max_gap_days":      0.6,   # dormant SIM (moderate weight)
        "is_foreign":        1.3,   # foreign number
    }
    cols = [c for c in WEIGHTS if c in f.columns]
    X  = f[cols].fillna(0).copy()
    # Apply weights before scaling
    for col in cols:
        X[col] = X[col] * WEIGHTS[col]
    sc = StandardScaler(); Xs = sc.fit_transform(X)
    iso = IsolationForest(contamination=contamination, random_state=42, n_estimators=200)
    iso.fit(Xs)
    f = f.copy()
    f["anomaly_score"] = -iso.score_samples(Xs)
    f["is_suspicious"] = iso.predict(Xs) == -1
    # Risk only applies to flagged contacts — HIGH/MEDIUM split flagged ones,
    # everything else is LOW so that HIGH + MEDIUM = Total Flagged always.
    sus_scores = f.loc[f["is_suspicious"], "anomaly_score"]
    threshold  = sus_scores.median() if len(sus_scores) > 0 else 0
    def _risk(row):
        if not row["is_suspicious"]: return "LOW"
        return "HIGH" if row["anomaly_score"] >= threshold else "MEDIUM"
    f["risk"] = f.apply(_risk, axis=1)
    Path("models").mkdir(exist_ok=True)
    joblib.dump({"model":iso,"scaler":sc,"features":cols}, "models/anomaly_model.pkl")
    return f

# ═════════════════════════════════════════════════════════════════════════════
# PDF HELPERS
# ═════════════════════════════════════════════════════════════════════════════
def _ps(name, **kw):
    return ParagraphStyle(name, parent=getSampleStyleSheet()["Normal"], **kw)

def _th(text, style):   # table header cell
    return Paragraph(f"<b>{text}</b>", style)

def _risk_badge(risk):
    cfg = {
        "HIGH":   ("#FADBD8", "#922B21", "▲ HIGH RISK"),
        "MEDIUM": ("#FDEBD0", "#784212", "● MEDIUM"),
        "LOW":    ("#D5F5E3", "#1E8449", "▼ LOW"),
    }
    bg, fg, label = cfg.get(risk, ("#ECF0F1","#2C3E50", risk))
    return bg, fg, label

def fmt_dur(secs):
    secs = int(secs)
    if secs == 0: return "—"
    if secs < 60: return f"{secs}s"
    return f"{secs//60}m {secs%60}s"

def fmt_dt(dt):
    try: return pd.Timestamp(dt).strftime("%d %b %Y  %H:%M")
    except: return "—"

# ═════════════════════════════════════════════════════════════════════════════
# PDF BUILD
# ═════════════════════════════════════════════════════════════════════════════
def build_pdf(df, feats, target, out_path):
    PW, PH = A4
    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=1.8*cm, rightMargin=1.8*cm,
        topMargin=2.0*cm,  bottomMargin=2.0*cm,
        title=f"CDR Investigation Report — {target}"
    )
    W = doc.width

    # ── Styles ────────────────────────────────────────────────────────────────
    sREPORT  = _ps("sR",  fontSize=9,  fontName="Helvetica",
                   textColor=HexColor("#888888"), alignment=TA_RIGHT)
    sBanner  = _ps("sB",  fontSize=20, fontName="Helvetica-Bold",
                   textColor=white,    alignment=TA_LEFT,  spaceAfter=2)
    sSubB    = _ps("sSB", fontSize=10, fontName="Helvetica",
                   textColor=HexColor("#BDC3C7"), alignment=TA_LEFT)
    sSH      = _ps("sSH", fontSize=12, fontName="Helvetica-Bold",
                   textColor=white,    alignment=TA_LEFT)
    sKL      = _ps("sKL", fontSize=7.5,fontName="Helvetica",
                   textColor=HexColor("#7F8C8D"), alignment=TA_CENTER)
    sKV      = _ps("sKV", fontSize=15, fontName="Helvetica-Bold",
                   textColor=INK,      alignment=TA_CENTER)
    sKVsub   = _ps("sKS", fontSize=8,  fontName="Helvetica",
                   textColor=HexColor("#7F8C8D"), alignment=TA_CENTER)
    sTH      = _ps("sTH", fontSize=8,  fontName="Helvetica-Bold",
                   textColor=white,    alignment=TA_CENTER)
    sTHl     = _ps("sTHl",fontSize=8,  fontName="Helvetica-Bold",
                   textColor=white,    alignment=TA_LEFT)
    sTD      = _ps("sTD", fontSize=8,  fontName="Helvetica",
                   textColor=INK,      alignment=TA_LEFT)
    sTDc     = _ps("sTDc",fontSize=8,  fontName="Helvetica",
                   textColor=INK,      alignment=TA_CENTER)
    sTDb     = _ps("sTDb",fontSize=8,  fontName="Helvetica-Bold",
                   textColor=INK,      alignment=TA_CENTER)
    sNote    = _ps("sNo", fontSize=7.5,fontName="Helvetica-Oblique",
                   textColor=HexColor("#7F8C8D"))
    sBullet  = _ps("sBu", fontSize=8,  fontName="Helvetica",
                   textColor=RED_DARK, leftIndent=8)

    story = []
    mg = feats.sort_values("total_calls", ascending=False).reset_index(drop=True)

    # ══════════════════════════════════════════════════════════════════════════
    # COVER BANNER
    # ══════════════════════════════════════════════════════════════════════════
    d0 = df["datetime"].min().strftime("%d %b %Y") if "datetime" in df.columns else "N/A"
    d1 = df["datetime"].max().strftime("%d %b %Y") if "datetime" in df.columns else "N/A"
    now = datetime.now().strftime("%d %b %Y  %H:%M")

    banner_data = [[
        Paragraph("CDR INVESTIGATION REPORT", sBanner),
        Paragraph(f"CONFIDENTIAL<br/>Generated: {now}", sREPORT),
    ]]
    banner_tbl = Table(banner_data, colWidths=[W*0.65, W*0.35])
    banner_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), STEEL),
        ("TOPPADDING",    (0,0),(-1,-1), 14),
        ("BOTTOMPADDING", (0,0),(-1,-1), 14),
        ("LEFTPADDING",   (0,0),(0,-1),  14),
        ("RIGHTPADDING",  (-1,0),(-1,-1),14),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    story.append(banner_tbl)

    # Target info strip
    info_data = [[
        Paragraph(f"<b>Target Number:</b>  {target}", _ps("ti", fontSize=11,
            fontName="Helvetica-Bold", textColor=GOLD)),
        Paragraph(f"<b>Analysis Period:</b>  {d0}  —  {d1}", _ps("ti2", fontSize=9,
            fontName="Helvetica", textColor=HexColor("#BDC3C7"), alignment=TA_RIGHT)),
    ]]
    info_tbl = Table(info_data, colWidths=[W*0.6, W*0.4])
    info_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), INK),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(0,-1),  14),
        ("RIGHTPADDING",  (-1,0),(-1,-1),14),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))
    story.append(info_tbl)
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # KPI CARDS
    # ══════════════════════════════════════════════════════════════════════════
    def _card(label, value, sub="", bg=PALE):
        inner = Table([
            [Paragraph(label, sKL)],
            [Paragraph(str(value), sKV)],
            [Paragraph(sub, sKVsub)],
        ], colWidths=[(W-10*mm)/5 - 4*mm])
        inner.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), bg),
            ("TOPPADDING",    (0,0),(-1,-1), 10),
            ("BOTTOMPADDING", (0,0),(-1,-1), 10),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
            ("RIGHTPADDING",  (0,0),(-1,-1), 6),
            ("ALIGN",         (0,0),(-1,-1), "CENTER"),
            ("ROUNDEDCORNERS",(0,0),(-1,-1), [3,3,3,3]),
            ("BOX",           (0,0),(-1,-1), 0.5, RULE),
        ]))
        return inner

    td  = int(df["duration"].sum()) if "duration" in df.columns else 0
    out_voice = int((df["call_type"]=="Outgoing").sum())
    in_voice  = int((df["call_type"]=="Incoming").sum())
    out_sms   = int((df["call_type"]=="Outgoing SMS").sum())
    in_sms    = int((df["call_type"]=="Incoming SMS").sum())
    n_sus = int(feats["is_suspicious"].sum())

    cards = Table([[
        _card("TOTAL RECORDS",  len(df),   "",                                       PALE),
        _card("INCOMING CALLS", in_voice,  f"{in_voice/len(df)*100:.0f}% of total", GREEN_PALE),
        _card("OUTGOING CALLS", out_voice, f"{out_voice/len(df)*100:.0f}% of total",BLUE_PALE),
        _card("INCOMING SMS",   in_sms,    f"{in_sms/len(df)*100:.0f}% of total",   PALE),
        _card("OUTGOING SMS",   out_sms,   f"{out_sms/len(df)*100:.0f}% of total",  PALE),
        _card("SUSPICIOUS",     n_sus,     f"of {df['b_party'].nunique()} contacts", RED_PALE),
    ]], colWidths=[(W/6)]*6)
    cards.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 3),
        ("RIGHTPADDING", (0,0),(-1,-1), 3),
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
    ]))
    story.append(cards)
    story.append(Spacer(1, 18))

    # ── Section header helper
    def sec_hdr(title, subtitle="", bg=STEEL):
        rows = [[Paragraph(f"  {title}", sSH)]]
        if subtitle:
            rows.append([Paragraph(f"  {subtitle}", _ps("ss2", fontSize=8,
                fontName="Helvetica-Oblique", textColor=HexColor("#BDC3C7")))])
        t = Table(rows, colWidths=[W])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), bg),
            ("TOPPADDING",    (0,0),(0,0),   8),
            ("BOTTOMPADDING", (0,-1),(-1,-1),8),
            ("TOPPADDING",    (0,1),(-1,-1), 2),
        ]))
        return t

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1 — CONTACT DIRECTORY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(sec_hdr("01 — CONTACT DIRECTORY",
                         f"All {df['b_party'].nunique()} contacts ranked by call frequency"))
    story.append(Spacer(1, 6))

    # Column widths
    CW = [0.7*cm, 3.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 1.5*cm, 2.2*cm, 2.0*cm, 2.5*cm]
    hdr = [_th(h, sTH) for h in ["#","MSISDN","TOTAL","OUT","IN","SMS","DURATION","DAYS ACTIVE","RISK"]]
    hdr[1] = _th("MSISDN", sTHl)
    data   = [hdr]
    styles = [
        ("BACKGROUND",    (0,0),(-1,0),  SLATE),
        ("FONTSIZE",      (0,0),(-1,-1), 8),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("GRID",          (0,0),(-1,-1), 0.3, RULE),
        ("LINEBELOW",     (0,0),(-1,0),  1.5, GOLD),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 4),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
    ]

    for ri, row in mg.iterrows():
        risk = row.get("risk","LOW")
        bg_r, fg_r, label_r = _risk_badge(risk)
        is_sus = row.get("is_suspicious", False)

        row_bg = HexColor("#FEF9F9") if is_sus else (PALE if ri%2==0 else white)
        styles.append(("BACKGROUND",(0,ri+1),(-1,ri+1), row_bg))

        # Bold top contacts
        num_style  = sTDb if ri < 5 else sTDc
        msisdn_sty = _ps(f"ms{ri}", fontSize=8,
                         fontName="Helvetica-Bold" if ri<5 else "Helvetica",
                         textColor=BLUE_MID if ri<5 else INK)

        # Risk cell with colour
        risk_cell = Table([[Paragraph(label_r,
            _ps(f"rk{ri}", fontSize=7, fontName="Helvetica-Bold",
                textColor=HexColor(fg_r), alignment=TA_CENTER))]],
            colWidths=[2.3*cm])
        risk_cell.setStyle(TableStyle([
            ("BACKGROUND",(0,0),(-1,-1), HexColor(bg_r)),
            ("TOPPADDING",(0,0),(-1,-1), 3),
            ("BOTTOMPADDING",(0,0),(-1,-1), 3),
            ("LEFTPADDING",(0,0),(-1,-1), 2),
            ("RIGHTPADDING",(0,0),(-1,-1), 2),
        ]))

        fc = fmt_dt(row.get("first_contact","")) if "first_contact" in row else ""
        lc = fmt_dt(row.get("last_contact",""))  if "last_contact"  in row else ""
        days = int(row.get("unique_days", 0))

        data.append([
            Paragraph(str(ri+1), sTDc),
            Paragraph(str(row["b_party"]), msisdn_sty),
            Paragraph(str(int(row["total_calls"])), num_style),
            Paragraph(str(int(row.get("outgoing",0))), sTDc),
            Paragraph(str(int(row.get("incoming",0))), sTDc),
            Paragraph(str(int(row.get("sms_count",0))), sTDc),
            Paragraph(fmt_dur(row.get("total_duration",0)), sTDc),
            Paragraph(str(days), sTDc),
            risk_cell,
        ])

    contact_tbl = Table(data, colWidths=CW, repeatRows=1)
    contact_tbl.setStyle(TableStyle(styles))
    story.append(contact_tbl)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "★ Top 5 contacts shown in bold blue.  Highlighted rows indicate ML-flagged suspicious contacts.",
        sNote))
    story.append(Spacer(1, 20))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2 — SUSPICIOUS CONTACT ANALYSIS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(sec_hdr("02 — SUSPICIOUS CONTACT ANALYSIS",
                         "Isolation Forest ML model — automatically flagged anomalies",
                         bg=RED_DARK))
    story.append(Spacer(1, 8))

    # Summary stat row
    n_high   = int((feats["risk"]=="HIGH").sum())
    n_medium = int((feats["risk"]=="MEDIUM").sum())
    n_low    = int((feats["risk"]=="LOW").sum())

    stat_data = [[
        Paragraph(f"<b>{n_sus}</b><br/><font size='7'>Total Flagged</font>",
                  _ps("sf", fontSize=14, fontName="Helvetica-Bold",
                      textColor=RED_DARK, alignment=TA_CENTER)),
        Paragraph(f"<b>{n_high}</b><br/><font size='7'>HIGH Risk</font>",
                  _ps("sh", fontSize=14, fontName="Helvetica-Bold",
                      textColor=HexColor("#922B21"), alignment=TA_CENTER)),
        Paragraph(f"<b>{n_medium}</b><br/><font size='7'>MEDIUM Risk</font>",
                  _ps("sm2", fontSize=14, fontName="Helvetica-Bold",
                      textColor=HexColor("#784212"), alignment=TA_CENTER)),
        Paragraph(f"<b>{n_low}</b><br/><font size='7'>LOW Risk</font>",
                  _ps("sl", fontSize=14, fontName="Helvetica-Bold",
                      textColor=HexColor("#1E8449"), alignment=TA_CENTER)),
        Paragraph(f"<b>{len(feats)}</b><br/><font size='7'>Total Contacts</font>",
                  _ps("st", fontSize=14, fontName="Helvetica-Bold",
                      textColor=SLATE, alignment=TA_CENTER)),
    ]]
    stat_tbl = Table(stat_data, colWidths=[W/5]*5)
    stat_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(0,-1), RED_PALE),
        ("BACKGROUND",   (1,0),(1,-1), HexColor("#FADBD8")),
        ("BACKGROUND",   (2,0),(2,-1), AMBER_PALE),
        ("BACKGROUND",   (3,0),(3,-1), GREEN_PALE),
        ("BACKGROUND",   (4,0),(4,-1), PALE),
        ("ALIGN",        (0,0),(-1,-1),"CENTER"),
        ("VALIGN",       (0,0),(-1,-1),"MIDDLE"),
        ("TOPPADDING",   (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("BOX",          (0,0),(-1,-1), 0.5, RULE),
        ("LINEAFTER",    (0,0),(3,-1),  0.5, RULE),
    ]))
    story.append(stat_tbl)
    story.append(Spacer(1, 10))

    # Per-suspect detail cards
    sus_df = mg[mg["is_suspicious"]==True].sort_values("anomaly_score", ascending=False)

    for _, row in sus_df.iterrows():
        risk     = row.get("risk","LOW")
        bg_r, fg_r, label_r = _risk_badge(risk)
        reasons  = sus_reasons(row)
        msisdn   = str(row["b_party"])
        tot      = int(row["total_calls"])
        out_c    = int(row.get("outgoing",0))
        in_c     = int(row.get("incoming",0))
        sms_c    = int(row.get("sms_count",0))
        avg_d    = row.get("avg_duration",0)
        night_r  = row.get("night_ratio",0)
        sites    = int(row.get("unique_sites",0))
        score    = row.get("anomaly_score",0)
        fc       = fmt_dt(row.get("first_contact",""))
        lc       = fmt_dt(row.get("last_contact",""))

        card_hdr = Table([[
            Paragraph(f"<b>{msisdn}</b>", _ps(f"ch{msisdn}",
                fontSize=11, fontName="Helvetica-Bold", textColor=white)),
            Paragraph(label_r, _ps(f"cr{msisdn}",
                fontSize=9, fontName="Helvetica-Bold",
                textColor=HexColor(fg_r), alignment=TA_RIGHT)),
        ]], colWidths=[W*0.7, W*0.3])
        card_hdr.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), SLATE),
            ("TOPPADDING",    (0,0),(-1,-1), 7),
            ("BOTTOMPADDING", (0,0),(-1,-1), 7),
            ("LEFTPADDING",   (0,0),(0,-1),  10),
            ("RIGHTPADDING",  (-1,0),(-1,-1),10),
            ("BACKGROUND",    (1,0),(1,-1),  HexColor(bg_r)),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ]))

        # Stats grid
        sg_style = _ps("sg", fontSize=8, fontName="Helvetica",
                        textColor=HexColor("#555"), alignment=TA_CENTER)
        sg_val   = _ps("sv", fontSize=11, fontName="Helvetica-Bold",
                        textColor=INK, alignment=TA_CENTER)
        def sg(label, val):
            return Table([[Paragraph(str(val), sg_val)],
                          [Paragraph(label, sg_style)]],
                         colWidths=[W/7 - 2*mm])

        stats_row = Table([[
            sg("Total Calls",  tot),
            sg("Outgoing",     out_c),
            sg("Incoming",     in_c),
            sg("SMS",          sms_c),
            sg("Avg Duration", fmt_dur(avg_d)),
            sg("Night %",      f"{night_r*100:.0f}%"),
            sg("Cell Towers",  sites),
        ]], colWidths=[W/7]*7)
        stats_row.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), HexColor("#FDFEFE")),
            ("TOPPADDING",    (0,0),(-1,-1), 8),
            ("BOTTOMPADDING", (0,0),(-1,-1), 8),
            ("LINEAFTER",     (0,0),(5,-1),  0.5, RULE),
            ("BOX",           (0,0),(-1,-1), 0.3, RULE),
        ]))

        # Reasons
        reason_rows = []
        if reasons:
            for r in reasons:
                reason_rows.append([Paragraph(f"  ⚠  {r}", sBullet)])
        else:
            reason_rows.append([Paragraph("  No specific indicators — flagged by ML pattern analysis", sNote)])

        reasons_tbl = Table(reason_rows, colWidths=[W])
        reasons_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), HexColor("#FEF9F9")),
            ("TOPPADDING",    (0,0),(-1,-1), 4),
            ("BOTTOMPADDING", (0,0),(-1,-1), 4),
            ("LEFTPADDING",   (0,0),(-1,-1), 4),
            ("BOX",           (0,0),(-1,-1), 0.3, RULE),
        ]))

        # Timeline
        tl_data = [[
            Paragraph("<b>First Contact:</b>", _ps("fl", fontSize=8, fontName="Helvetica-Bold",
                textColor=SLATE)),
            Paragraph(fc, _ps("fv", fontSize=8, fontName="Helvetica", textColor=INK)),
            Paragraph("<b>Last Contact:</b>", _ps("ll", fontSize=8, fontName="Helvetica-Bold",
                textColor=SLATE, alignment=TA_RIGHT)),
            Paragraph(lc, _ps("lv", fontSize=8, fontName="Helvetica", textColor=INK, alignment=TA_RIGHT)),
            Paragraph(f"<b>Anomaly Score:</b>  {score:.3f}", _ps("as2", fontSize=8,
                fontName="Helvetica", textColor=HexColor("#888"), alignment=TA_RIGHT)),
        ]]
        tl_tbl = Table(tl_data, colWidths=[2.2*cm, 4.5*cm, 2.2*cm, 4.5*cm, 3.8*cm])
        tl_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), SILVER),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
            ("RIGHTPADDING",  (0,0),(-1,-1), 6),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("BOX",           (0,0),(-1,-1), 0.3, RULE),
        ]))

        story.append(KeepTogether([
            card_hdr, stats_row, reasons_tbl, tl_tbl,
            Spacer(1, 8)
        ]))

    story.append(Spacer(1, 12))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3 — ACTIVITY TIMELINE
    # ══════════════════════════════════════════════════════════════════════════
    story.append(sec_hdr("03 — ACTIVITY TIMELINE",
                         "Call volume breakdown by day and hour", bg=BLUE_DARK))
    story.append(Spacer(1, 8))

    # Day of week table
    days_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
    dow = df.groupby("day_name").size().reindex(days_order, fill_value=0) if "day_name" in df.columns else pd.Series()

    if len(dow):
        max_d = dow.max()
        day_data = [[_th("DAY",sTHl), _th("CALLS",sTH), _th("VOLUME",sTH), _th("% SHARE",sTH)]]
        day_sty  = [
            ("BACKGROUND",    (0,0),(-1,0),  BLUE_DARK),
            ("GRID",          (0,0),(-1,-1), 0.3, RULE),
            ("LINEBELOW",     (0,0),(-1,0),  1.5, GOLD),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
            ("RIGHTPADDING",  (0,0),(-1,-1), 6),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ]
        weekend_color = HexColor("#EBF5FB")
        for ri, day in enumerate(days_order):
            cnt = int(dow[day]); pct = cnt/len(df)*100
            is_weekend = day in ("Saturday","Sunday")
            bar_w = int(cnt/max(max_d,1) * 22)
            bar   = "█"*bar_w + "░"*(22-bar_w)
            bg    = weekend_color if is_weekend else (PALE if ri%2==0 else white)
            day_sty.append(("BACKGROUND",(0,ri+1),(-1,ri+1), bg))
            day_data.append([
                Paragraph(f"{'⬛ ' if is_weekend else '  '}{day}", sTD),
                Paragraph(str(cnt), sTDb),
                Paragraph(f'<font face="Courier" size="7" color="#2471A3">{bar}</font>', sTDc),
                Paragraph(f"{pct:.1f}%", sTDc),
            ])
        day_tbl = Table(day_data, colWidths=[4*cm, 2*cm, 8*cm, 2.5*cm])
        day_tbl.setStyle(TableStyle(day_sty))
        story.append(day_tbl)
        story.append(Spacer(1, 8))

    # Hour heatmap
    if "hour" in df.columns:
        hour_counts = df.groupby("hour").size().reindex(range(24), fill_value=0)
        max_h = hour_counts.max()
        time_slots = [
            ("Night  (22:00–05:00)", list(range(22,24))+list(range(0,6)),  HexColor("#1C2833")),
            ("Morning (06:00–11:00)", list(range(6,12)),                    BLUE_DARK),
            ("Afternoon (12:00–17:00)", list(range(12,18)),                 HexColor("#1A5276")),
            ("Evening (18:00–21:00)", list(range(18,22)),                   SLATE),
        ]
        hm_data = [[_th("TIME PERIOD",sTHl),_th("HOUR",sTH),_th("CALLS",sTH),_th("ACTIVITY",sTH)]]
        hm_sty  = [
            ("BACKGROUND",    (0,0),(-1,0),  BLUE_DARK),
            ("GRID",          (0,0),(-1,-1), 0.3, RULE),
            ("LINEBELOW",     (0,0),(-1,0),  1.5, GOLD),
            ("TOPPADDING",    (0,0),(-1,-1), 4),
            ("BOTTOMPADDING", (0,0),(-1,-1), 4),
            ("LEFTPADDING",   (0,0),(-1,-1), 6),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ]
        ri = 0
        for slot_name, hours, slot_color in time_slots:
            slot_total = sum(int(hour_counts[h]) for h in hours)
            first = True
            for h in hours:
                cnt = int(hour_counts[h])
                if cnt == 0 and not first: continue
                bar_w = int(cnt/max(max_h,1)*20)
                bar   = "█"*bar_w + "░"*(20-bar_w)
                intensity = cnt/max(max_h,1)
                cell_bg = Color(1-intensity*0.3, 1-intensity*0.15, 1-intensity*0.05)
                hm_sty.append(("BACKGROUND",(2,ri+1),(2,ri+1), cell_bg))
                hm_data.append([
                    Paragraph(slot_name if first else "", sTD),
                    Paragraph(f"{h:02d}:00", sTDc),
                    Paragraph(str(cnt) if cnt else "—", sTDb if cnt else sTDc),
                    Paragraph(f'<font face="Courier" size="6" color="#2471A3">{bar}</font>' if cnt else "—", sTDc),
                ])
                first = False; ri += 1
        hm_tbl = Table(hm_data, colWidths=[4.5*cm, 2*cm, 2.2*cm, 7.8*cm])
        hm_tbl.setStyle(TableStyle(hm_sty))
        story.append(hm_tbl)

    story.append(Spacer(1, 20))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 4 — LOCATION TRAIL
    # ══════════════════════════════════════════════════════════════════════════
    if "site_name" in df.columns:
        story.append(sec_hdr("04 — LOCATION TRAIL",
                             "Cell tower visits — reveals movement pattern",
                             bg=HexColor("#4A235A")))
        story.append(Spacer(1, 8))

        site_stats = df.groupby("site_name").agg(
            Visits=("site_name","count"),
            First =("datetime","min"),
            Last  =("datetime","max"),
            Lat   =("latitude","first"),
            Lon   =("longitude","first"),
        ).reset_index().sort_values("Visits", ascending=False)

        max_v = site_stats["Visits"].max()
        LW = [0.8*cm, 8.0*cm, 1.6*cm, 3.8*cm, 3.8*cm, 1.6*cm, 1.6*cm]
        loc_data = [[
            _th("#",sTH), _th("SITE / CELL TOWER",sTHl),
            _th("VISITS",sTH), _th("FIRST SEEN",sTH), _th("LAST SEEN",sTH),
            _th("LAT",sTH), _th("LON",sTH),
        ]]
        loc_sty = [
            ("BACKGROUND",    (0,0),(-1,0),  HexColor("#4A235A")),
            ("GRID",          (0,0),(-1,-1), 0.3, RULE),
            ("LINEBELOW",     (0,0),(-1,0),  1.5, GOLD),
            ("TOPPADDING",    (0,0),(-1,-1), 5),
            ("BOTTOMPADDING", (0,0),(-1,-1), 5),
            ("LEFTPADDING",   (0,0),(-1,-1), 4),
            ("RIGHTPADDING",  (0,0),(-1,-1), 4),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ]
        for ri, (_, row) in enumerate(site_stats.iterrows()):
            intensity = row["Visits"] / max(max_v,1)
            r_val = int(255)
            g_val = int(255 - intensity*120)
            b_val = int(255 - intensity*120)
            v_bg  = Color(r_val/255, g_val/255, b_val/255)
            row_bg = PALE if ri%2==0 else white
            loc_sty.append(("BACKGROUND",(0,ri+1),(-1,ri+1), row_bg))
            loc_sty.append(("BACKGROUND",(2,ri+1),(2,ri+1),  v_bg))
            loc_data.append([
                Paragraph(str(ri+1), sTDc),
                Paragraph(str(row["site_name"]), _ps(f"sn{ri}", fontSize=7.5,
                    fontName="Helvetica", textColor=INK)),
                Paragraph(str(int(row["Visits"])), sTDb),
                Paragraph(fmt_dt(row["First"]), _ps(f"fd{ri}", fontSize=7.5,
                    fontName="Helvetica", textColor=SLATE)),
                Paragraph(fmt_dt(row["Last"]),  _ps(f"ld{ri}", fontSize=7.5,
                    fontName="Helvetica", textColor=SLATE)),
                Paragraph(f"{row['Lat']:.4f}" if pd.notna(row["Lat"]) else "—",
                    _ps(f"la{ri}", fontSize=7, fontName="Helvetica", textColor=SLATE, alignment=TA_CENTER)),
                Paragraph(f"{row['Lon']:.4f}" if pd.notna(row["Lon"]) else "—",
                    _ps(f"lo{ri}", fontSize=7, fontName="Helvetica", textColor=SLATE, alignment=TA_CENTER)),
            ])

        loc_tbl = Table(loc_data, colWidths=LW, repeatRows=1)
        loc_tbl.setStyle(TableStyle(loc_sty))
        story.append(loc_tbl)
        story.append(Spacer(1, 6))
        story.append(Paragraph(
            "★ Visit count heat-shading: deeper red = more frequent visits at that tower.",
            sNote))

    # ══════════════════════════════════════════════════════════════════════════
    # FOOTER
    # ══════════════════════════════════════════════════════════════════════════
    def _footer(canvas, doc_obj):
        canvas.saveState()
        # Bottom rule
        canvas.setStrokeColor(STEEL); canvas.setLineWidth(1)
        canvas.line(1.8*cm, 1.5*cm, PW-1.8*cm, 1.5*cm)
        # Left: report info
        canvas.setFont("Helvetica", 7); canvas.setFillColor(HexColor("#888888"))
        canvas.drawString(1.8*cm, 1.1*cm,
            f"CDR Investigation Report  |  Target: {target}  |  {d0} – {d1}  |  CONFIDENTIAL")
        # Right: page number
        canvas.drawRightString(PW-1.8*cm, 1.1*cm, f"Page {doc_obj.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    print(f"  PDF saved → {out_path}")

# ═════════════════════════════════════════════════════════════════════════════
# PIPELINE
# ═════════════════════════════════════════════════════════════════════════════
def run(input_path, output_path, contamination=0.15):
    print("\n" + "="*56 + "\n  CDR Analysis Pipeline\n" + "="*56)
    print(f"\n[1/5] Loading: {input_path}")
    raw = load_file(input_path)
    print(f"      {len(raw)} rows loaded")

    print("\n[2/5] Preprocessing ...")
    df = preprocess(raw)
    if "a_party" not in df.columns or "b_party" not in df.columns:
        raise ValueError("Could not find A-Party / B-Party columns.")
    tgt = re.sub(r"\D","", str(df["a_party"].mode()[0]))
    tgt = "0"+tgt[2:] if tgt.startswith("92") and len(tgt)==12 else tgt
    print(f"      Target: {tgt}  |  Contacts: {df['b_party'].nunique()}")

    print("\n[3/5] Building features ...")
    feats = build_features(df)

    print("\n[4/5] Anomaly Detection (Isolation Forest) ...")
    feats = detect_anomalies(feats, contamination)
    ns = feats["is_suspicious"].sum()
    print(f"      Flagged: {ns}/{len(feats)}  "
          f"HIGH:{(feats['risk']=='HIGH').sum()}  "
          f"MEDIUM:{(feats['risk']=='MEDIUM').sum()}  "
          f"LOW:{(feats['risk']=='LOW').sum()}")

    print(f"\n[5/5] Generating PDF ...")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    feats["name"] = "--"; feats["cnic"] = "--"; feats["address"] = "--"
    build_pdf(df, feats, tgt, output_path)

    print("\n" + "="*56 + f"\n  DONE!  Report → {output_path}\n" + "="*56 + "\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",         default=DEFAULT_INPUT)
    parser.add_argument("--output",        default=DEFAULT_OUTPUT)
    parser.add_argument("--contamination", default=0.15, type=float)
    args = parser.parse_args()
    run(args.input, args.output, args.contamination)
