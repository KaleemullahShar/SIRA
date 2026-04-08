"""
src/pdf_report.py
Generates a multi-section PDF report matching the provided output sample format.
"""

import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)

from src.features import suspicious_reasons


# ── Colour palette ───────────────────────────────────────────────────────────
C_NAVY    = HexColor("#1A2744")
C_GOLD    = HexColor("#C9A84C")
C_RED     = HexColor("#C0392B")
C_RED_LT  = HexColor("#FFE8E8")
C_ORANGE  = HexColor("#E67E22")
C_GREEN   = HexColor("#1B6B3A")
C_BLUE    = HexColor("#1B4F72")
C_PURPLE  = HexColor("#4A235A")
C_GRAY_H  = HexColor("#2C3E50")
C_GRAY_R  = HexColor("#F5F5F5")
C_AMBER   = HexColor("#FFF3CD")
C_WHITE   = white


# ── Style helpers ─────────────────────────────────────────────────────────────
def _ps(name, **kw):
    base = getSampleStyleSheet()["Normal"]
    return ParagraphStyle(name, parent=base, **kw)

def _sec_hdr(text, style, bg, doc_width):
    tbl = Table([[Paragraph(text, style)]], colWidths=[doc_width])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), bg),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
    ]))
    return tbl

def _risk_para(risk, style):
    colour = {"HIGH": "#CC0000", "MEDIUM": "#CC6600", "LOW": "#1B6B3A"}.get(risk, "#000000")
    return Paragraph(f'<font color="{colour}"><b>{risk}</b></font>', style)

def _tbl_style(hdr_bg, line_bg=None):
    s = [
        ("BACKGROUND",    (0,0),(-1,0),  hdr_bg),
        ("TEXTCOLOR",     (0,0),(-1,0),  C_WHITE),
        ("FONTNAME",      (0,0),(-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,-1), 8),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), [C_WHITE, C_GRAY_R]),
        ("GRID",          (0,0),(-1,-1), 0.4, HexColor("#CCCCCC")),
        ("LINEBELOW",     (0,0),(-1,0),  1,   C_GOLD),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 4),
        ("RIGHTPADDING",  (0,0),(-1,-1), 4),
    ]
    return s


# ── Main builder ──────────────────────────────────────────────────────────────
def build_pdf(df: pd.DataFrame,
              feats: pd.DataFrame,
              target_num: str,
              output_path: str):

    PAGE_W, PAGE_H = A4
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm,  bottomMargin=1.5*cm,
        title=f"CDR Details for {target_num}",
    )
    W = doc.width

    # ── Paragraph styles
    sTitle  = _ps("sTitle",  fontSize=16, fontName="Helvetica-Bold",
                  textColor=C_NAVY,  alignment=TA_CENTER, spaceAfter=4)
    sMeta   = _ps("sMeta",   fontSize=9,  fontName="Helvetica",
                  textColor=HexColor("#555555"), alignment=TA_CENTER, spaceAfter=8)
    sSec    = _ps("sSec",    fontSize=11, fontName="Helvetica-Bold",
                  textColor=C_WHITE, alignment=TA_LEFT)
    sNorm   = _ps("sNorm",   fontSize=8,  fontName="Helvetica",  textColor=black)
    sSmall  = _ps("sSmall",  fontSize=7.5,fontName="Helvetica",  textColor=HexColor("#333"))
    sCtr    = _ps("sCtr",    fontSize=8,  fontName="Helvetica",  alignment=TA_CENTER)
    sCtrB   = _ps("sCtrB",   fontSize=8,  fontName="Helvetica-Bold", alignment=TA_CENTER)
    sInfo   = _ps("sInfo",   fontSize=8.5,fontName="Helvetica",
                  textColor=HexColor("#8B0000"), backColor=HexColor("#FFE8E8"),
                  borderPadding=4, spaceAfter=6)

    story = []

    # ══════════════════════════════════════════════════════════════════════════
    # HEADER
    # ══════════════════════════════════════════════════════════════════════════
    story.append(Paragraph(f"CDR Details for {target_num}", sTitle))

    d_min = df["datetime"].min().strftime("%d %b %Y") if "datetime" in df.columns else "N/A"
    d_max = df["datetime"].max().strftime("%d %b %Y") if "datetime" in df.columns else "N/A"
    story.append(Paragraph(
        f"Period: {d_min}  –  {d_max}   |   Total Records: {len(df)}   |   "
        f"Unique Contacts: {df['b_party'].nunique()}   |   "
        f"Generated: {datetime.now().strftime('%d %b %Y %H:%M')}",
        sMeta))
    story.append(HRFlowable(width="100%", thickness=2, color=C_GOLD, spaceAfter=8))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 1 – CONTACT SUMMARY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(_sec_hdr("  Contact Summary", sSec, C_NAVY, W))
    story.append(Spacer(1, 4))

    merged = feats.sort_values("total_calls", ascending=False).reset_index(drop=True)

    COL_W = [3.2*cm, 3.6*cm, 3.2*cm, 1.4*cm, 4.8*cm, 1.6*cm, 3.4*cm]
    hdr_row = [
        Paragraph("<b>Name</b>",      sCtr),
        Paragraph("<b>CNIC</b>",      sCtr),
        Paragraph("<b>MSISDN</b>",    sCtr),
        Paragraph("<b>Calls</b>",     sCtr),
        Paragraph("<b>Address</b>",   sCtr),
        Paragraph("<b>Risk</b>",      sCtr),
        Paragraph("<b>Behaviour</b>", sCtr),
    ]
    data   = [hdr_row]
    styles = _tbl_style(C_NAVY)

    for ri, row in merged.iterrows():
        if row.get("is_suspicious", False):
            styles.append(("BACKGROUND", (0, ri+1), (-1, ri+1), C_RED_LT))
        data.append([
            Paragraph(str(row.get("name",    "--")), sSmall),
            Paragraph(str(row.get("cnic",    "--")), sSmall),
            Paragraph(str(row["b_party"]),           sSmall),
            Paragraph(str(int(row["total_calls"])),  sCtrB),
            Paragraph(str(row.get("address", "--")), sSmall),
            _risk_para(row.get("risk", "LOW"), sCtr),
            Paragraph(str(row.get("behaviour", "")), sSmall),
        ])

    story.append(Table(data, colWidths=COL_W, repeatRows=1,
                       style=TableStyle(styles)))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 2 – ANOMALY DETECTION
    # ══════════════════════════════════════════════════════════════════════════
    story.append(_sec_hdr("  Anomaly Detection — Suspicious Contact Analysis", sSec, C_RED, W))
    story.append(Spacer(1, 4))

    sus   = merged[merged["is_suspicious"] == True].sort_values("anomaly_score", ascending=False)
    n_tot = len(merged); n_sus = len(sus)

    story.append(Paragraph(
        f"<b>Isolation Forest ML Model</b>  |  Contacts: <b>{n_tot}</b>  |  "
        f"Flagged: <b>{n_sus}</b> ({n_sus/n_tot*100:.1f}%)",
        sInfo))
    story.append(Spacer(1, 4))

    A_W = [3.0*cm, 1.8*cm, 1.8*cm, 1.8*cm, 1.6*cm, 2.0*cm, 1.6*cm, 1.6*cm, 5.0*cm]
    a_data = [[
        Paragraph("<b>MSISDN</b>",        sCtr),
        Paragraph("<b>Total</b>",         sCtr),
        Paragraph("<b>Out</b>",           sCtr),
        Paragraph("<b>In</b>",            sCtr),
        Paragraph("<b>SMS</b>",           sCtr),
        Paragraph("<b>Avg Dur(s)</b>",    sCtr),
        Paragraph("<b>Night%</b>",        sCtr),
        Paragraph("<b>Risk</b>",          sCtr),
        Paragraph("<b>Reasons</b>",       sCtr),
    ]]
    a_sty = _tbl_style(HexColor("#8B0000"))
    for ri, (_, row) in enumerate(sus.iterrows()):
        a_data.append([
            Paragraph(str(row["b_party"]),                              sSmall),
            Paragraph(str(int(row["total_calls"])),                     sCtr),
            Paragraph(str(int(row.get("outgoing",  0))),                sCtr),
            Paragraph(str(int(row.get("incoming",  0))),                sCtr),
            Paragraph(str(int(row.get("sms_count", 0))),                sCtr),
            Paragraph(f"{row.get('avg_duration',0):.0f}",               sCtr),
            Paragraph(f"{row.get('night_ratio',0)*100:.0f}%",           sCtr),
            _risk_para(row.get("risk","LOW"), sCtr),
            Paragraph(suspicious_reasons(row),                          sSmall),
        ])

    if len(a_data) > 1:
        story.append(Table(a_data, colWidths=A_W, repeatRows=1,
                           style=TableStyle(a_sty)))
    else:
        story.append(Paragraph("No suspicious contacts detected.", sNorm))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 3 – BEHAVIOUR CLASSIFICATION
    # ══════════════════════════════════════════════════════════════════════════
    story.append(_sec_hdr("  Behaviour Classification — KMeans Cluster Analysis", sSec, C_BLUE, W))
    story.append(Spacer(1, 4))

    cluster_sum = feats.groupby("behaviour").agg(
        Count        =("b_party",     "count"),
        Avg_Calls    =("total_calls",  "mean"),
        Avg_Duration =("avg_duration", "mean"),
        Night_Ratio  =("night_ratio",  "mean"),
        Suspicious   =("is_suspicious","sum"),
    ).reset_index().sort_values("Count", ascending=False)

    B_W  = [5.0*cm, 2.0*cm, 2.4*cm, 2.8*cm, 2.4*cm, 2.4*cm]
    b_data = [[
        Paragraph("<b>Behaviour Group</b>",  sCtr),
        Paragraph("<b>Count</b>",            sCtr),
        Paragraph("<b>Avg Calls</b>",        sCtr),
        Paragraph("<b>Avg Dur (s)</b>",      sCtr),
        Paragraph("<b>Avg Night%</b>",       sCtr),
        Paragraph("<b>Suspicious</b>",       sCtr),
    ]]
    b_sty   = _tbl_style(C_BLUE)
    bgs     = [HexColor(x) for x in ["#D6EAF8","#D5F5E3","#FDEBD0","#F9EBEA","#EAF2FF"]]
    for ri, (_, row) in enumerate(cluster_sum.iterrows()):
        b_sty.append(("BACKGROUND",(0,ri+1),(-1,ri+1), bgs[ri % len(bgs)]))
        b_data.append([
            Paragraph(str(row["behaviour"]),             sNorm),
            Paragraph(str(int(row["Count"])),            sCtrB),
            Paragraph(f"{row['Avg_Calls']:.1f}",         sCtr),
            Paragraph(f"{row['Avg_Duration']:.0f}",      sCtr),
            Paragraph(f"{row['Night_Ratio']*100:.1f}%",  sCtr),
            Paragraph(str(int(row["Suspicious"])),       sCtr),
        ])
    story.append(Table(b_data, colWidths=B_W, style=TableStyle(b_sty)))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 4 – ACTIVITY SUMMARY
    # ══════════════════════════════════════════════════════════════════════════
    story.append(_sec_hdr("  Activity Summary", sSec, C_GREEN, W))
    story.append(Spacer(1, 4))

    tot_dur   = int(df["duration"].sum()) if "duration" in df.columns else 0
    out_calls = int(df["call_type"].str.contains("Outgoing").sum())
    in_calls  = int(df["call_type"].str.contains("Incoming").sum())
    sms_tot   = int(df["call_type"].str.contains("SMS").sum())
    voice_tot = len(df) - sms_tot

    kpi_data = [[
        Paragraph("<b>Total Records</b>",   sCtr),
        Paragraph("<b>Outgoing</b>",        sCtr),
        Paragraph("<b>Incoming</b>",        sCtr),
        Paragraph("<b>SMS</b>",             sCtr),
        Paragraph("<b>Voice</b>",           sCtr),
        Paragraph("<b>Total Duration</b>",  sCtr),
        Paragraph("<b>Unique Contacts</b>", sCtr),
    ],[
        Paragraph(f"<b>{len(df)}</b>",                                   sCtrB),
        Paragraph(f"<b>{out_calls}</b>",                                 sCtrB),
        Paragraph(f"<b>{in_calls}</b>",                                  sCtrB),
        Paragraph(f"<b>{sms_tot}</b>",                                   sCtrB),
        Paragraph(f"<b>{voice_tot}</b>",                                 sCtrB),
        Paragraph(f"<b>{tot_dur//3600}h {(tot_dur%3600)//60}m</b>",     sCtrB),
        Paragraph(f"<b>{df['b_party'].nunique()}</b>",                   sCtrB),
    ]]
    kpi_sty = TableStyle([
        ("BACKGROUND",    (0,0),(-1,0),  C_GRAY_H),
        ("TEXTCOLOR",     (0,0),(-1,0),  C_WHITE),
        ("BACKGROUND",    (0,1),(-1,1),  C_AMBER),
        ("FONTSIZE",      (0,0),(-1,-1), 8.5),
        ("ALIGN",         (0,0),(-1,-1), "CENTER"),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("GRID",          (0,0),(-1,-1), 0.5, HexColor("#AAAAAA")),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
    ])
    story.append(Table(kpi_data, colWidths=[W/7]*7, style=kpi_sty))
    story.append(Spacer(1, 8))

    # Day-of-week
    if "day_name" in df.columns:
        days_order = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
        dow = df.groupby("day_name").size().reindex(days_order, fill_value=0)
        d_data = [[Paragraph("<b>Day</b>",sCtr),
                   Paragraph("<b>Calls</b>",sCtr),
                   Paragraph("<b>% of Total</b>",sCtr)]]
        d_sty = _tbl_style(C_GRAY_H)
        for day in days_order:
            cnt = int(dow[day])
            d_data.append([
                Paragraph(day,                          sNorm),
                Paragraph(str(cnt),                     sCtr),
                Paragraph(f"{cnt/len(df)*100:.1f}%",    sCtr),
            ])
        story.append(Table(d_data, colWidths=[5*cm,3*cm,3*cm],
                           style=TableStyle(d_sty)))
    story.append(Spacer(1, 14))

    # ══════════════════════════════════════════════════════════════════════════
    # SECTION 5 – LOCATION / CELL TOWER
    # ══════════════════════════════════════════════════════════════════════════
    if "site_name" in df.columns:
        story.append(_sec_hdr("  Location & Cell Tower Analysis", sSec, C_PURPLE, W))
        story.append(Spacer(1, 4))

        site_stats = df.groupby("site_name").agg(
            Visits=("site_name", "count"),
            First =("datetime",  "min"),
            Last  =("datetime",  "max"),
            Lat   =("latitude",  "first"),
            Lon   =("longitude", "first"),
        ).reset_index().sort_values("Visits", ascending=False)

        L_W = [8.5*cm, 1.8*cm, 3.2*cm, 3.2*cm, 1.6*cm, 1.6*cm]
        l_data = [[
            Paragraph("<b>Site / Cell Tower</b>", sCtr),
            Paragraph("<b>Visits</b>",            sCtr),
            Paragraph("<b>First Seen</b>",        sCtr),
            Paragraph("<b>Last Seen</b>",         sCtr),
            Paragraph("<b>Lat</b>",               sCtr),
            Paragraph("<b>Lon</b>",               sCtr),
        ]]
        l_sty   = _tbl_style(C_PURPLE)
        max_v   = site_stats["Visits"].max()
        fmt_dt  = lambda dt: dt.strftime("%Y-%m-%d %H:%M") if pd.notna(dt) else ""

        for ri, (_, row) in enumerate(site_stats.iterrows()):
            intensity = min(int(row["Visits"] / max(max_v,1) * 160), 160)
            v_bg = HexColor(f"#FF{format(255-intensity,'02X')}{format(255-intensity,'02X')}")
            l_sty.append(("BACKGROUND",(1,ri+1),(1,ri+1), v_bg))
            l_data.append([
                Paragraph(str(row["site_name"]),                sSmall),
                Paragraph(str(int(row["Visits"])),              sCtrB),
                Paragraph(fmt_dt(row["First"]),                 sSmall),
                Paragraph(fmt_dt(row["Last"]),                  sSmall),
                Paragraph(f"{row['Lat']:.4f}" if pd.notna(row["Lat"]) else "—", sSmall),
                Paragraph(f"{row['Lon']:.4f}" if pd.notna(row["Lon"]) else "—", sSmall),
            ])
        story.append(Table(l_data, colWidths=L_W, repeatRows=1,
                           style=TableStyle(l_sty)))

    # ── Footer ────────────────────────────────────────────────────────────────
    def _footer(canvas, doc_obj):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(HexColor("#888888"))
        canvas.drawString(1.5*cm, 1.0*cm,
                          f"CDR Analysis  |  {target_num}  |  "
                          f"Generated {datetime.now().strftime('%d %b %Y %H:%M')}")
        canvas.drawRightString(PAGE_W - 1.5*cm, 1.0*cm, f"Page {doc_obj.page}")
        canvas.setStrokeColor(C_GOLD)
        canvas.setLineWidth(1)
        canvas.line(1.5*cm, 1.3*cm, PAGE_W - 1.5*cm, 1.3*cm)
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    print(f"  PDF saved → {output_path}")
