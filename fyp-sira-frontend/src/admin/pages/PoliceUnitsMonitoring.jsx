import React, { useState, useEffect } from 'react';
import { FaSearch, FaCheckCircle, FaTimesCircle, FaEye } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { apiFetch } from '../../utils/api';

const PoliceUnitsMonitoring = () => {
    const [policeUnits, setPoliceUnits] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalOfficers: 0,
        active: 0,
        inactive: 0,
        totalCDRs: 0,
        totalRecords: 0
    });

    useEffect(() => {
        fetchUnits();
    }, [filterStatus]);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const statusQuery = filterStatus !== 'all' ? `&status=${filterStatus}` : '';
            const response = await apiFetch(`/police/users?limit=100${statusQuery}`);
            if (response && response.success && response.data && response.data.users) {
                setPoliceUnits(response.data.users);
                // Simple counts for stats header based on fetched list
                const active = response.data.users.filter(u => u.isActive).length;
                setStats({
                    totalOfficers: response.data.pagination.totalUsers,
                    active: active,
                    inactive: response.data.pagination.totalUsers - active,
                    totalCDRs: response.data.users.reduce((acc, u) => acc + (u.cdrsUploaded || 0), 0),
                    totalRecords: response.data.users.reduce((acc, u) => acc + (u.recordsAdded || 0), 0)
                });
            } else {
                console.error("Invalid response structure:", response);
                setPoliceUnits([]);
            }
        } catch (error) {
            console.error("Error fetching police units:", error);
            setPoliceUnits([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredUnits = policeUnits.filter(unit => {
        const query = searchTerm.toLowerCase();
        return (unit.fullName || unit.username).toLowerCase().includes(query) ||
            (unit.badgeNumber || '').toLowerCase().includes(query) ||
            (unit.unit || '').toLowerCase().includes(query);
    });

    const performanceData = policeUnits.slice(0, 10).map(unit => ({
        name: unit.badgeNumber || unit.username,
        score: Math.min(100, (unit.cdrsUploaded * 10) + (unit.recordsAdded * 5)) || 10 // Mock performance logic
    }));

    const handleToggleStatus = async (id) => {
        try {
            const response = await apiFetch(`/police/users/${id}/status`, { method: 'PUT' });
            if (response && response.success) {
                fetchUnits();
            } else {
                console.error("Failed to toggle status:", response?.error?.message);
            }
        } catch (error) {
            console.error("Error toggling user status:", error);
        }
    };

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Police Units Monitoring</h1>
                <p className="page-subtitle">Track officer activity and performance metrics</p>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2563eb', margin: '0 0 0.5rem 0' }}>{stats.totalOfficers}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Total Officers</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{stats.active} Active • {stats.inactive} Inactive</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', margin: '0 0 0.5rem 0' }}>{stats.totalCDRs}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Total CDRs Uploaded</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6', margin: '0 0 0.5rem 0' }}>{stats.totalRecords}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Records Added</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', margin: '0 0 0.5rem 0' }}>{loading ? "..." : "0"}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Suspicious Activity</p>
                </div>
            </div>

            {/* Performance Chart */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 className="card-title">Officer Contribution Overview</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                            {performanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 50 ? '#3b82f6' : '#6b7280'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Filters and Search */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Search by name, badge ID, or unit..."
                            style={{
                                width: '100%',
                                paddingLeft: '40px',
                                padding: '12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.95rem'
                            }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setFilterStatus('all')} className={filterStatus === 'all' ? 'primary-btn' : 'action-btn secondary'}>All</button>
                        <button onClick={() => setFilterStatus('active')} className={filterStatus === 'active' ? 'primary-btn' : 'action-btn secondary'}>Active</button>
                        <button onClick={() => setFilterStatus('inactive')} className={filterStatus === 'inactive' ? 'primary-btn' : 'action-btn secondary'}>Inactive</button>
                    </div>
                </div>
            </div>

            {/* Police Units Table */}
            <div className="card">
                <h3 className="card-title">Officer Distribution</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Officer</th>
                                <th>Unit/Dept</th>
                                <th style={{ textAlign: 'center' }}>CDRs</th>
                                <th style={{ textAlign: 'center' }}>Records</th>
                                <th style={{ textAlign: 'center' }}>Reports</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading units...</td></tr>
                            ) : filteredUnits.map((unit) => (
                                <tr key={unit._id}>
                                    <td>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{unit.fullName || unit.username}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', fontFamily: 'monospace' }}>{unit.badgeNumber || 'N/A'}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.9rem', color: '#475569' }}>{unit.unit || 'General'}</div>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{unit.cdrsUploaded}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{unit.recordsAdded}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#1e3a8a' }}>{unit.reportsGenerated}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {unit.isActive ? <FaCheckCircle size={16} style={{ color: '#10b981', marginRight: '0.5rem' }} /> : <FaTimesCircle size={16} style={{ color: '#6b7280', marginRight: '0.5rem' }} />}
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: unit.isActive ? '#10b981' : '#6b7280' }}>
                                                {unit.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleToggleStatus(unit._id)} className={unit.isActive ? 'delete-btn' : 'edit-btn'} style={{ fontSize: '0.85rem' }}>
                                            {unit.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PoliceUnitsMonitoring;
