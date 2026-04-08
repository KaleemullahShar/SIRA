import React from "react";
import "./App.css";

function Reports() {
  return (
    <div className="reports-container">
      <h1 className="page-title">Reports</h1>
      <p className="page-subtitle">View and download investigation reports</p>

      <div className="empty-report-box">
        <div className="report-icon">📄</div>
        <h2>No reports available</h2>
        <p>Generate a report from the CDR Analysis page to view it here.</p>
      </div>
    </div>
  );
}

export default Reports;