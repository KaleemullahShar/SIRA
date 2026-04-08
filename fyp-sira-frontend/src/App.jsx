import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import Layout from "./Layout";
import Home from "./Home";
import Dashboard from "./Dashboard";
import CDRAnalysis from "./CDRAnalysis";
import CriminalRecord from "./CriminalRecord";
import Reports from "./Reports";
import "./App.css";

// Admin Imports
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/AdminDashboard";
import LiveCDRIntelligence from "./admin/pages/LiveCDRIntelligence";
import CriminalDatabaseOverview from "./admin/pages/CriminalDatabaseOverview";
import SystemSettings from "./admin/pages/SystemSettings";

import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* User/Police Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="home" element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="cdr" element={<CDRAnalysis />} />
            <Route path="criminal-records" element={<CriminalRecord />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="cdr-intelligence" element={<LiveCDRIntelligence />} />
            <Route path="criminal-database" element={<CriminalDatabaseOverview />} />
            <Route path="settings" element={<SystemSettings />} />
          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
