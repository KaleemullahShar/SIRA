import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaChartLine,
  FaUsers,
  FaDatabase,
  FaFileAlt,
  FaClipboardList,
  FaCog,
  FaBars,
  FaTimes,
  FaSignOutAlt,
} from 'react-icons/fa';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const menuItems = [
    { path: '/admin/dashboard', name: 'Central Dashboard', icon: <FaHome /> },
    { path: '/admin/cdr-intelligence', name: 'CDR Intelligence', icon: <FaChartLine /> },
    { path: '/admin/criminal-database', name: 'Criminal Database', icon: <FaDatabase /> },
    { path: '/admin/settings', name: 'System Settings', icon: <FaCog /> },
  ];

  return (
    <div className="layout-container">
      {/* Header */}
      <header className="top-header">
        <button
          className="menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>

        <div className="header-title">
          <span>SIRA - Admin Control Panel</span>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <FaSignOutAlt /> Logout
        </button>
      </header>

      {/* Sidebar Overlay for mobile */}
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

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <ul>
          {menuItems.map((item) => (
            <li key={item.path} className={location.pathname === item.path ? "active" : ""}>
              <NavLink
                to={item.path}
                onClick={() => window.innerWidth <= 768 && setSidebarOpen(false)}
              >
                {item.icon} {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
