import React, { useState, useEffect } from 'react';
import { FaSearch, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { apiFetch } from '../../utils/api';

const CriminalDatabaseOverview = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCrime, setFilterCrime] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [stats, setStats] = useState({
        totalRecords: 0,
        totalHighRisk: 0,
        underInvestigation: 0,
        closedCases: 0,
        statusData: [],
        crimeTypeData: []
    });
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOverview();
        fetchRecords();
    }, [searchTerm, filterCrime, filterStatus]);

    const fetchOverview = async () => {
        try {
            const response = await apiFetch('/admin/dashboard/db-overview');
            if (response && response.success) {
                setStats(response.data);
            } else {
                console.error("Failed to fetch DB overview:", response?.error?.message);
            }
        } catch (error) {
            console.error("Error fetching DB overview:", error);
        }
    };

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const searchQuery = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const crime = filterCrime !== 'all' ? `&crimeType=${filterCrime}` : '';
            const status = filterStatus !== 'all' ? `&status=${filterStatus}` : '';

            const response = await apiFetch(`/criminal/records?limit=50${searchQuery}${crime}${status}`);
            if (response && response.success) {
                setRecords(response.data.records);
            } else {
                console.error("Failed to fetch records:", response?.error?.message);
                setRecords([]);
            }
        } catch (error) {
            console.error("Error fetching criminal records:", error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Criminal Database Overview</h1>
                <p className="page-subtitle">National-level criminal records repository</p>
                <div style={{
                    display: 'inline-block',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    marginTop: '0.5rem'
                }}>
                    🔒 READ ONLY ACCESS
                </div>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #1e3a8a' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 0.5rem 0' }}>{stats.totalRecords}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Total Records</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>National Database</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', margin: '0 0 0.5rem 0' }}>{stats.totalHighRisk}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>High Risk</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Active Cases</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 0.5rem 0' }}>{stats.underInvestigation}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Under Investigation</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', margin: '0 0 0.5rem 0' }}>{stats.closedCases}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Closed Cases</p>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ width: '100%', minWidth: '700px', maxWidth: '1200px', margin: '0 auto' }}>
                    <h3 className="card-title">Crime Type Distribution</h3>
                    <ResponsiveContainer width="98%" height={350}>
                        <BarChart data={stats.crimeTypeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="type" stroke="#64748b" style={{ fontSize: '11px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 className="card-title">Case Status Distribution</h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={stats.statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Search by name, CNIC, or phone..."
                            style={{
                                width: '100%',
                                paddingLeft: '40px',
                                padding: '12px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px'
                            }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Records Table */}
            <div className="card">
                <h3 className="card-title">Criminal Records ({records.length})</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>CNIC</th>
                                <th>Name</th>
                                <th>Offense</th>
                                <th>Status</th>
                                <th>Date Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading records...</td></tr>
                            ) : records.map((record) => (
                                <tr key={record._id}>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e3a8a' }}>{record.cnic}</td>
                                    <td style={{ fontWeight: '600' }}>{record.name}</td>
                                    <td>{record.crimeType}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {record.status === 'active' ? <FaExclamationTriangle size={14} style={{ color: '#ef4444', marginRight: '0.5rem' }} /> : <FaCheckCircle size={14} style={{ color: '#10b981', marginRight: '0.5rem' }} />}
                                            <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>{record.status}</span>
                                        </div>
                                    </td>
                                    <td style={{ fontSize: '0.9rem', color: '#64748b' }}>{new Date(record.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CriminalDatabaseOverview;
