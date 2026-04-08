# CDR Analysis ML Pipeline

Analyses Call Detail Records (CDR) and generates a PDF report with:
- Ranked contact list (matching the provided output format)
- Anomaly / fraud detection using **Isolation Forest**
- Behaviour classification using **KMeans** clustering
- Activity summary (time, day-of-week breakdowns)
- Cell tower / location analysis

---

## Folder Structure

```
CDR_Analyser/
├── main.py                  ← Entry point — run this
├── requirements.txt
├── input/                   ← Drop your CDR files here (.xlsx .xls .csv)
│   └── Input_CDR.xlsx
├── output/                  ← Generated PDF reports appear here
├── models/                  ← Trained ML models saved here (.pkl)
├── src/
│   ├── preprocessor.py      ← File loading, column normalisation, cleaning
│   ├── features.py          ← Feature engineering per contact
│   ├── ml_models.py         ← Isolation Forest + KMeans models
│   └── pdf_report.py        ← PDF generation (ReportLab)
└── .vscode/
    └── launch.json          ← VS Code run/debug configurations
```

---

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Place your CDR file in the `input/` folder

Supported formats: `.xlsx`, `.xls`, `.csv`

### 3. Run

**Option A – VS Code:**
- Open the folder in VS Code
- Press `F5`  (uses "Run CDR Analysis (default input)" config)

**Option B – Terminal:**
```bash
python main.py
```

**Option C – Custom file:**
```bash
python main.py --input input/my_other_file.xlsx --output output/my_report.pdf
```

**All options:**
```bash
python main.py --help
```

---

## Supported Column Names

The pipeline auto-detects columns using fuzzy matching.
These variants are all recognised:

| Standard Field | Accepted Names |
|---|---|
| A-Party | `A-Party`, `A Party`, `MSISDN`, `Caller`, `Source` |
| B-Party | `B-Party`, `B Party`, `Called`, `Destination`, `Dialed` |
| Call Type | `Call Type`, `Type`, `Direction`, `CallType` |
| Date/Time | `Date & Time`, `DateTime`, `Timestamp`, `Call Time` |
| Duration | `Duration`, `Dur`, `Call Duration`, `Seconds` |
| Cell ID | `Cell ID`, `CellID`, `BTS`, `Cell` |
| Site | `Site`, `Site Name`, `Location`, `Tower` |
| IMEI | `IMEI` |
| IMSI | `IMSI` |

---

## Output PDF Sections

1. **Contact Summary** — all B-Party contacts ranked by call count, with Risk and Behaviour labels
2. **Anomaly Detection** — Isolation Forest flags suspicious contacts (HIGH / MEDIUM / LOW risk)
3. **Behaviour Classification** — KMeans groups contacts into behaviour patterns
4. **Activity Summary** — KPI bar + day-of-week breakdown
5. **Location Analysis** — Cell towers sorted by visit frequency with lat/lon

---

## Tuning Parameters

```bash
# Increase sensitivity (more contacts flagged as suspicious)
python main.py --contamination 0.20

# Change number of behaviour clusters
python main.py --clusters 6

# Don't save ML models to disk
python main.py --no-save-models
```
