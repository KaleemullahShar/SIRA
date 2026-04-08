import React, { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import "./App.css";

const CDR_API_URL = import.meta.env.VITE_CDR_API_URL || "http://127.0.0.1:8000";

function CDRAnalysis() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [message, setMessage] = useState("");
  const [cdrFiles, setCdrFiles] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    outgoingCalls: 0,
    incomingCalls: 0,
    outgoingSMS: 0,
    incomingSMS: 0,
    totalSMS: 0,
    latestSessionId: null,
  });

  const updateStatsFromSummary = (summary, sessionId) => {
    const outgoingSMS = summary?.outgoing_sms || 0;
    const incomingSMS = summary?.incoming_sms || 0;

    setStats({
      totalRecords: summary?.total_records || 0,
      outgoingCalls: summary?.outgoing_calls || 0,
      incomingCalls: summary?.incoming_calls || 0,
      outgoingSMS,
      incomingSMS,
      totalSMS: outgoingSMS + incomingSMS,
      latestSessionId: sessionId || null,
    });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validExtensions = [".csv", ".xlsx", ".xls", ".xlsm"];
    const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setMessage("Please select a CSV or Excel file (.csv, .xlsx, .xls, .xlsm)");
      return;
    }

    setSelectedFile(file);
    setMessage(`Selected: ${file.name}`);
  };

  const downloadPdfBySession = (sessionId) => {
    const link = document.createElement("a");
    link.href = `${CDR_API_URL}/download/${sessionId}`;
    link.download = `CDR_Analysis_${sessionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const analyzeFileWithModel = async (file, autoDownloadPdf = false) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${CDR_API_URL}/analyse?contamination=0.15`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.detail || "Analysis failed");
    }

    if (!data?.session_id || !data?.summary) {
      throw new Error("Invalid response from model API");
    }

    updateStatsFromSummary(data.summary, data.session_id);

    const newEntry = {
      _id: data.session_id,
      sessionId: data.session_id,
      originalName: file.name,
      validRecords: data.summary.total_records || 0,
      uploadDate: new Date().toISOString(),
      status: "analyzed",
    };

    setCdrFiles((prev) => [newEntry, ...prev.filter((f) => f._id !== newEntry._id)].slice(0, 10));
    setSelectedFile(null);

    if (autoDownloadPdf) {
      downloadPdfBySession(data.session_id);
    }

    return data;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select a file first");
      return;
    }

    setUploading(true);
    setMessage("Analyzing file with model...");

    try {
      await analyzeFileWithModel(selectedFile, false);
      setMessage("✓ File analyzed successfully. Stats are updated from model output.");
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);

    try {
      if (selectedFile) {
        setMessage("Analyzing and generating PDF report...");
        await analyzeFileWithModel(selectedFile, true);
        setMessage("✓ PDF report generated and download started");
        return;
      }

      if (stats.latestSessionId) {
        downloadPdfBySession(stats.latestSessionId);
        setMessage("✓ PDF report download started");
        return;
      }

      setMessage("Please select and analyze a file first");
    } catch (error) {
      setMessage(`✗ Error: ${error.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDeleteAll = () => {
    if (!window.confirm("Clear all local analysis results from this page?")) {
      return;
    }

    setCdrFiles([]);
    setSelectedFile(null);
    setMessage("✓ Cleared local analysis results");
    setStats({
      totalRecords: 0,
      outgoingCalls: 0,
      incomingCalls: 0,
      outgoingSMS: 0,
      incomingSMS: 0,
      totalSMS: 0,
      latestSessionId: null,
    });
  };

  return (
    <div className="cdr-container">
      <h1 className="page-title">CDR Analysis</h1>
      <p className="page-subtitle">Upload and analyze Call Detail Records</p>

      <div className="upload-card">
        <h2 className="section-title">Upload CDR File</h2>
        <div className="upload-area">
          <Upload size={48} color="#64748b" />
          <p>Upload CSV or Excel file containing Call Detail Records</p>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "5px" }}>
            Supported formats: .csv, .xlsx, .xls, .xlsm
          </p>
          <div
            style={{
              backgroundColor: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "6px",
              padding: "12px",
              marginTop: "10px",
              fontSize: "0.85rem",
              color: "#0c4a6e",
              textAlign: "left",
            }}
          >
            <strong>📋 Required Columns:</strong>
            <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
              <li>Sr # (Serial Number)</li>
              <li>Call Type (Incoming/Outgoing/Incoming SMS/Outgoing SMS)</li>
              <li>A-Party (Calling Number)</li>
              <li>B-Party (Called Number)</li>
              <li>Date & Time</li>
              <li>Duration</li>
              <li>Cell ID, IMEI, IMSI (optional)</li>
              <li>Site/Location (optional)</li>
            </ul>
          </div>

          <input
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            id="file-input"
            disabled={uploading || generatingPdf}
          />

          <label htmlFor="file-input" className="upload-btn" style={{ cursor: uploading || generatingPdf ? "not-allowed" : "pointer" }}>
            {uploading ? "Analyzing..." : "Select File"}
          </label>

          {selectedFile && (
            <button
              className="upload-btn"
              onClick={handleUpload}
              disabled={uploading || generatingPdf}
              style={{ marginLeft: "10px", backgroundColor: "#10b981" }}
            >
              {uploading ? "Analyzing..." : "Analyze File"}
            </button>
          )}

          {message && (
            <p
              style={{
                marginTop: "10px",
                color: message.includes("✓") ? "#10b981" : message.includes("✗") ? "#ef4444" : "#64748b",
                fontWeight: "500",
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>

      <div className="stats-container">
        <div style={{ gridColumn: "1 / -1", marginBottom: "10px" }}>
          <p
            style={{
              fontSize: "0.9rem",
              color: "#059669",
              fontWeight: "600",
              textAlign: "center",
              backgroundColor: "#d1fae5",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid #6ee7b7",
            }}
          >
            📊 Showing data from latest model analysis
          </p>
        </div>

        <div className="stat-box">
          <h3>Total Records</h3>
          <p className="stat-value">{(stats.totalRecords || 0).toLocaleString()}</p>
        </div>

        <div className="stat-box">
          <h3>Outgoing Calls</h3>
          <p className="stat-value outgoing">{(stats.outgoingCalls || 0).toLocaleString()}</p>
        </div>

        <div className="stat-box">
          <h3>Incoming Calls</h3>
          <p className="stat-value incoming">{(stats.incomingCalls || 0).toLocaleString()}</p>
        </div>

        <div className="stat-box">
          <h3>Outgoing SMS</h3>
          <p className="stat-value" style={{ color: "#8b5cf6" }}>{(stats.outgoingSMS || 0).toLocaleString()}</p>
        </div>

        <div className="stat-box">
          <h3>Incoming SMS</h3>
          <p className="stat-value" style={{ color: "#06b6d4" }}>{(stats.incomingSMS || 0).toLocaleString()}</p>
        </div>

        <div className="stat-box">
          <h3>Total SMS</h3>
          <p className="stat-value" style={{ color: "#f59e0b" }}>{(stats.totalSMS || 0).toLocaleString()}</p>
        </div>
      </div>

      {cdrFiles.length > 0 && (
        <div className="upload-card" style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 className="section-title" style={{ margin: 0 }}>Recent Analyses</h2>
            <button
              onClick={handleDeleteAll}
              className="upload-btn"
              style={{
                backgroundColor: "#ef4444",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "8px 16px",
                fontSize: "0.9rem",
              }}
            >
              <Trash2 size={16} />
              Clear List
            </button>
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {cdrFiles.map((file, index) => (
              <div
                key={file._id}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: index === 0 && stats.latestSessionId === file.sessionId ? "#f0fdf4" : "transparent",
                  borderLeft: index === 0 && stats.latestSessionId === file.sessionId ? "3px solid #10b981" : "none",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong>{file.originalName}</strong>
                    {index === 0 && stats.latestSessionId === file.sessionId && (
                      <span
                        style={{
                          backgroundColor: "#10b981",
                          color: "white",
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "bold",
                        }}
                      >
                        LATEST
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "5px 0" }}>
                    {file.validRecords || 0} records • {new Date(file.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <span
                  style={{
                    padding: "5px 10px",
                    borderRadius: "5px",
                    fontSize: "0.85rem",
                    backgroundColor: "#d1fae5",
                    color: "#065f46",
                  }}
                >
                  {file.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pdf-button-section">
        <button
          className="upload-btn"
          onClick={handleGeneratePdf}
          disabled={generatingPdf || uploading}
          style={{ opacity: generatingPdf || uploading ? 0.7 : 1, cursor: generatingPdf || uploading ? "not-allowed" : "pointer" }}
        >
          {generatingPdf ? "Generating PDF..." : "Generate PDF Report"}
        </button>
      </div>
    </div>
  );
}

export default CDRAnalysis;
