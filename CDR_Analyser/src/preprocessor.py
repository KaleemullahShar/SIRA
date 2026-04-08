"""
src/preprocessor.py
Loads and cleans CDR files (.xlsx, .xls, .csv).
Handles fuzzy column matching so files with different column names still work.
"""

import re
import numpy as np
import pandas as pd
from pathlib import Path


# ---------------------------------------------------------------------------
# Column aliases – add more variants here if needed
# ---------------------------------------------------------------------------
COLUMN_MAP = {
    "sr":        ["sr #", "sr#", "sr", "serial", "s.no", "no"],
    "call_type": ["call type", "calltype", "type", "direction", "call_type"],
    "a_party":   ["a-party", "a party", "aparty", "msisdn", "caller", "source", "a_party"],
    "b_party":   ["b-party", "b party", "bparty", "called", "destination", "dialed", "b_party"],
    "datetime":  ["date & time", "date&time", "datetime", "date time",
                  "timestamp", "call time", "date_time"],
    "duration":  ["duration", "dur", "call duration", "seconds"],
    "cell_id":   ["cell id", "cellid", "cell_id", "bts", "cell"],
    "imei":      ["imei"],
    "imsi":      ["imsi"],
    "site":      ["site", "site name", "location", "tower", "node"],
    "latitude":  ["latitude", "lat"],
    "longitude": ["longitude", "lon", "long"],
    "node_id":   ["node id", "nodeid", "node"],
    "ip":        ["ip", "ip address"],
    "port":      ["port"],
}


def load_file(path: str) -> pd.DataFrame:
    """Load .xlsx / .xls / .csv into a DataFrame."""
    ext = Path(path).suffix.lower()
    if ext in (".xlsx", ".xlsm"):
        return pd.read_excel(path, engine="openpyxl")
    elif ext == ".xls":
        return pd.read_excel(path, engine="xlrd")
    elif ext == ".csv":
        return pd.read_csv(path)
    else:
        raise ValueError(f"Unsupported file type: {ext}. Use .xlsx, .xls or .csv")


def fuzzy_rename(df: pd.DataFrame) -> pd.DataFrame:
    """Drop unnamed/empty columns and rename to standard column names."""
    df = df.loc[:, ~df.columns.str.contains(r"^Unnamed", na=False)]
    df = df.dropna(axis=1, how="all")
    cols_lower = {c.lower().strip(): c for c in df.columns}
    rename = {}
    for std, variants in COLUMN_MAP.items():
        for v in variants:
            if v in cols_lower and std not in rename.values():
                rename[cols_lower[v]] = std
                break
    return df.rename(columns=rename)


def normalize_phone(s) -> str:
    """Convert 923XXXXXXXXX → 03XXXXXXXXX; keep others as-is."""
    s = re.sub(r"\D", "", str(s))
    if s.startswith("92") and len(s) == 12:
        return "0" + s[2:]
    return s


def normalize_call_type(ct: str) -> str:
    ct = str(ct).strip().lower()
    if "outgoing sms" in ct: return "Outgoing SMS"
    if "incoming sms" in ct: return "Incoming SMS"
    if "outgoing"     in ct: return "Outgoing"
    if "incoming" in ct or "incom" in ct: return "Incoming"
    return ct.title()


def _parse_site(s):
    """Extract site name, lat, lon from 'Name|lat|lon|cellhex' strings."""
    try:
        parts = str(s).split("|")
        name = parts[0].strip()
        lat  = float(parts[1]) if len(parts) > 1 else np.nan
        lon  = float(parts[2]) if len(parts) > 2 else np.nan
        return name, lat, lon
    except Exception:
        return str(s), np.nan, np.nan


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """Full preprocessing pipeline. Returns cleaned DataFrame."""
    df = fuzzy_rename(df)

    # Normalize call type
    if "call_type" in df.columns:
        df["call_type"] = df["call_type"].apply(normalize_call_type)

    # Normalize phone numbers
    for col in ("a_party", "b_party"):
        if col in df.columns:
            df[col] = df[col].apply(normalize_phone)

    # Parse datetime and derive time features
    if "datetime" in df.columns:
        df["datetime"]  = pd.to_datetime(df["datetime"], errors="coerce")
        df["hour"]      = df["datetime"].dt.hour
        df["date"]      = df["datetime"].dt.date
        df["day_name"]  = df["datetime"].dt.day_name()

    # Parse embedded site/location strings
    if "site" in df.columns:
        parsed = df["site"].apply(
            lambda x: pd.Series(_parse_site(x), index=["site_name", "lat", "lon"])
        )
        df["site_name"] = parsed["site_name"]
        if "latitude"  not in df.columns: df["latitude"]  = parsed["lat"]
        if "longitude" not in df.columns: df["longitude"] = parsed["lon"]

    # Duration to numeric
    if "duration" in df.columns:
        df["duration"] = pd.to_numeric(df["duration"], errors="coerce").fillna(0)

    return df
