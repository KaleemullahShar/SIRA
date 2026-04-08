import React, { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaHome,
  FaFileAlt,
  FaUsers,
  FaChartBar,
  FaBars,
  FaTimes,
  FaSignOutAlt,
} from "react-icons/fa";

import "./App.css";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // Check authentication
  useEffect(() => {
    if (!localStorage.getItem("isAuthenticated")) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("isAdmin");
    navigate("/");
  };

  return (
    <div className="layout-container">

      {/* ✅ HEADER */}
      <header className="top-header">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>

        <div className="header-title">

          <span>Smart Investigation & Record Analyzer</span>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </header>

      {/* ✅ SIDEBAR */}
      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{
            display: window.innerWidth <= 768 ? 'block' : 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 199
          }}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <ul>
          <li className={location.pathname === "/home" ? "active" : ""}>
            <Link to="/home" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}>
              <FaHome /> Home
            </Link>
          </li>

          <li className={location.pathname === "/dashboard" ? "active" : ""}>
            <Link to="/dashboard" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}>
              <FaFileAlt /> Dashboard
            </Link>
          </li>

          <li className={location.pathname === "/cdr" ? "active" : ""}>
            <Link to="/cdr" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}>
              <FaChartBar /> CDR Analysis
            </Link>
          </li>

          <li className={location.pathname === "/criminal-records" ? "active" : ""}>
            <Link to="/criminal-records" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}>
              <FaUsers /> Criminal Records
            </Link>
          </li>

          <li className={location.pathname === "/reports" ? "active" : ""}>
            <Link to="/reports" onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}>
              <FaFileAlt /> Reports
            </Link>
          </li>
        </ul>
      </aside>

      {/* ✅ MAIN CONTENT */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
