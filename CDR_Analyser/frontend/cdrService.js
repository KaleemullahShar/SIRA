/**
 * cdrService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop this file into your Next.js project (e.g. lib/cdrService.js or services/cdrService.js)
 * and import it wherever you need CDR analysis.
 *
 * Usage example:
 *   import { analyseCDR, downloadReport } from "@/lib/cdrService";
 *
 *   const result = await analyseCDR(file, (pct) => setProgress(pct));
 *   // result.summary, result.contacts, result.hourly_activity, etc.
 *
 *   downloadReport(result.session_id);
 */

const API_BASE = process.env.NEXT_PUBLIC_CDR_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// analyseCDR(file, onProgress?)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Upload a CDR file to the backend and return the full analysis result.
 *
 * @param {File}     file           - The CDR file (.xlsx / .xls / .csv)
 * @param {Function} onProgress     - Optional callback(percent: 0–100)
 * @param {number}   contamination  - Anomaly sensitivity 0–0.5 (default 0.15)
 * @returns {Promise<AnalysisResult>}
 */
export async function analyseCDR(file, onProgress = null, contamination = 0.15) {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${API_BASE}/analyse?contamination=${contamination}`;

  // Use XMLHttpRequest so we can track upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid response from server."));
        }
      } else {
        let msg = `Server error ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err.detail || msg;
        } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error("Network error — is the API server running?"));
    xhr.ontimeout = () => reject(new Error("Request timed out."));

    xhr.timeout = 300_000; // 5 minutes for large files
    xhr.open("POST", url);
    xhr.send(formData);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// downloadReport(sessionId)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Trigger a PDF download in the browser.
 *
 * @param {string} sessionId - The session_id returned by analyseCDR()
 */
export function downloadReport(sessionId) {
  const link = document.createElement("a");
  link.href = `${API_BASE}/download/${sessionId}`;
  link.download = `CDR_Analysis_${sessionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// getPdfUrl(sessionId)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Get the direct PDF URL (useful for embedding in an <iframe>).
 *
 * @param {string} sessionId
 * @returns {string}
 */
export function getPdfUrl(sessionId) {
  return `${API_BASE}/download/${sessionId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// checkHealth()
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Ping the API to confirm it is running.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
