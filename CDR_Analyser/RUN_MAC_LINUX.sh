#!/bin/bash
echo ""
echo " ============================================"
echo "   CDR Analysis Tool - One Click Runner"
echo " ============================================"
echo ""

if ! command -v python3 &>/dev/null; then
    echo " [ERROR] Python3 not found."
    echo " Install from: https://www.python.org/downloads/"
    exit 1
fi
echo " [OK] Python: $(python3 --version)"

echo ""
echo " Installing/checking packages..."
python3 -m pip install pandas openpyxl scikit-learn reportlab joblib numpy --quiet 2>/dev/null || \
python3 -m pip install pandas openpyxl scikit-learn reportlab joblib numpy --quiet --break-system-packages 2>/dev/null
echo " [OK] Packages ready."

echo ""
echo " Running CDR Analysis..."
echo " (Put your CDR file in the input/ folder first)"
echo ""
python3 main.py

echo ""
echo " ============================================"
echo "  DONE!  PDF is in the output/ folder."
echo " ============================================"
