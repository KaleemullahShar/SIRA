import React, { useState, useEffect } from "react";
import { apiFetch } from "./utils/api";
import "./App.css";

function Dashboard() {
  const [stats, setStats] = useState({
    totalRecords: 0,
    criminalRecords: 0,
    reportsGenerated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch CDR files to count total records
        const cdrResponse = await apiFetch("/cdr/files?limit=100");

        // Fetch Criminal Records
        const criminalResponse = await apiFetch("/criminal/records?limit=1");

        if (cdrResponse.success && criminalResponse.success) {
          const totalCdrRecords = cdrResponse.data.files.reduce(
            (sum, file) => sum + (file.validRecords || 0),
            0
          );

          setStats({
            totalRecords: totalCdrRecords,
            criminalRecords: criminalResponse.data.pagination.totalRecords,
            reportsGenerated: cdrResponse.data.files.filter(f => f.status === 'analyzed').length,
          });
        } else {
          console.error("Failed to fetch dashboard data");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <h1 className="dashboard-title">Dashboard</h1>
      <p className="dashboard-subtitle">
        Overview of investigative activities and statistics
      </p>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-icon">📄</div>
          <h2 className="stat-value">{loading ? "..." : stats.totalRecords.toLocaleString()}</h2>
          <p className="stat-label">TOTAL CDR RECORDS</p>
        </div>

        <div className="stat-box">
          <div className="stat-icon">👥</div>
          <h2 className="stat-value">{loading ? "..." : stats.criminalRecords.toLocaleString()}</h2>
          <p className="stat-label">CRIMINAL RECORDS</p>
        </div>

        <div className="stat-box">
          <div className="stat-icon">📊</div>
          <h2 className="stat-value">{loading ? "..." : stats.reportsGenerated.toLocaleString()}</h2>
          <p className="stat-label">REPORTS GENERATED</p>
        </div>
      </div>

      {/* System Information Section */}
      <div className="system-info">
        <h2>System Information</h2>
        <table>
          <tbody>
            <tr>
              <td>Database Status:</td>
              <td className="status operational">Operational</td>
            </tr>
            <tr>
              <td>System Health:</td>
              <td>Good</td>
            </tr>
            <tr>
              <td>System Version:</td>
              <td>SIRA v2.5.0</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Security Notice */}
      <div className="security-notice">
        <h3>Security Notice</h3>
        <p>
          This system is for official law enforcement use only. All access and
          activities are logged and monitored. Unauthorized access is strictly
          prohibited and will be prosecuted under applicable laws.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
