import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaExclamationTriangle, FaInfoCircle, FaFilter, FaClock, FaUser } from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiFetch } from '../../utils/api';

const AuditCompliance = () => {
    const [viewMode, setViewMode] = useState('table');
    const [filterType, setFilterType] = useState('all');
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [auditLogs, setAuditLogs] = useState([]);
    const [stats, setStats] = useState({
        totalEvents: 0,
        criticalEvents: 0,
        warnings: 0,
        complianceRate: 99.8
    });
    const [activityTrendData, setActivityTrendData] = useState([]);
    const [severityData, setSeverityData] = useState([]);
    const [eventTypeData, setEventTypeData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAuditData();
    }, []);

    const fetchAuditData = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/admin/dashboard/logs?limit=50');
            
            if (response && response.success) {
                const logs = response.data.logs.map(log => ({
                    id: log.id,
                    timestamp: new Date(log.timestamp).toLocaleString(),
                    user: log.user,
                    action: log.action,
                    details: log.details,
                    severity: log.type === 'auth' && log.action.includes('Failed') ? 'Critical' : 
                             log.type === 'admin' ? 'Warning' : 'Info',
                    type: log.type === 'auth' ? 'Authentication' : 
                          log.type === 'upload' ? 'Data Upload' : 
                          log.type === 'admin' ? 'User Management' : 'Report'
                }));
                
                setAuditLogs(logs);
                
                // Calculate stats
                const critical = logs.filter(l => l.severity === 'Critical').length;
                const warnings = logs.filter(l => l.severity === 'Warning').length;
                const total = response.data.pagination.total;
                
                setStats({
                    totalEvents: total,
                    criticalEvents: critical,
                    warnings: warnings,
                    complianceRate: total > 0 ? ((total - critical) / total * 100).toFixed(1) : 100
                });
                
                // Severity distribution
                const info = logs.filter(l => l.severity === 'Info').length;
                setSeverityData([
                    { name: 'Info', value: info, color: '#3b82f6' },
                    { name: 'Warning', value: warnings, color: '#f59e0b' },
                    { name: 'Critical', value: critical, color: '#ef4444' },
                ]);
                
                // Event type distribution
                const typeCount = {};
                logs.forEach(log => {
                    typeCount[log.type] = (typeCount[log.type] || 0) + 1;
                });
                
                setEventTypeData(Object.keys(typeCount).map(key => ({
                    type: key,
                    count: typeCount[key]
                })));
                
                // Mock hourly activity - in production, aggregate by hour
                setActivityTrendData([
                    { hour: '00:00', logins: Math.floor(logs.filter(l => l.type === 'Authentication').length * 0.1), 
                      uploads: Math.floor(logs.filter(l => l.type === 'Data Upload').length * 0.1), 
                      modifications: Math.floor(logs.filter(l => l.type === 'User Management').length * 0.1) },
                    { hour: '04:00', logins: Math.floor(logs.filter(l => l.type === 'Authentication').length * 0.05), 
                      uploads: Math.floor(logs.filter(l => l.type === 'Data Upload').length * 0.05), 
                      modifications: Math.floor(logs.filter(l => l.type === 'User Management').length * 0.05) },
                    { hour: '08:00', logins: Math.floor(logs.filter(l => l.type === 'Authentication').length * 0.3), 
                      uploads: Math.floor(logs.filter(l => l.type === 'Data Upload').length * 0.3), 
                      modifications: Math.floor(logs.filter(l => l.type === 'User Management').length * 0.25) },
                    { hour: '12:00', logins: Math.floor(logs.filter(l => l.type === 'Authentication').length * 0.25), 
                      uploads: Math.floor(logs.filter(l => l.type === 'Data Upload').length * 0.35), 
                      modifications: Math.floor(logs.filter(l => l.type === 'User Management').length * 0.3) },
                    { hour: '16:00', logins: Math.floor(logs.filter(l => l.type === 'Authentication').length * 0.2), 
                      uploads: Math.floor(logs.filter(l => l.type === 'Data Upload').length * 0.2), 
                      modifications: Math.floor(logs.filter(l => l.type === 'User Management').length * 0.25) },
                    { hour: '20:00', logins: Math.floor(logs.filter(l => l.type === 'Authentication').length * 0.1), 
                      uploads: Math.floor(logs.filter(l => l.type === 'Data Upload').length * 0.1), 
                      modifications: Math.floor(logs.filter(l => l.type === 'User Management').length * 0.15) },
                ]);
            }
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = auditLogs.filter(log => {
        const matchesType = filterType === 'all' || log.type === filterType;
        const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
        return matchesType && matchesSeverity;
    });

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'Critical': return { bg: '#fee2e2', text: '#dc2626' };
            case 'Warning': return { bg: '#fef3c7', text: '#d97706' };
            default: return { bg: '#dbeafe', text: '#2563eb' };
        }
    };

    if (loading) return <div className="page-container"><p>Loading audit data...</p></div>;

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Audit & Compliance</h1>
                <p className="page-subtitle">System activity logs and security monitoring</p>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6', margin: '0 0 0.5rem 0' }}>{loading ? '...' : stats.totalEvents}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Total Events</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last 30 Days</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444', margin: '0 0 0.5rem 0' }}>{loading ? '...' : stats.criticalEvents}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Critical Events</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Requires Attention</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 0.5rem 0' }}>{loading ? '...' : stats.warnings}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Warnings</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', margin: '0 0 0.5rem 0' }}>{loading ? '...' : stats.complianceRate}%</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Compliance Rate</p>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Activity Trend */}
                <div className="card">
                    <h3 className="card-title">24-Hour Activity Trend</h3>
                    <ResponsiveContainer width="100%" height={450}>
                        <LineChart data={activityTrendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="hour" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Legend />
                            <Line type="monotone" dataKey="logins" stroke="#3b82f6" strokeWidth={2} name="Logins" />
                            <Line type="monotone" dataKey="uploads" stroke="#8b5cf6" strokeWidth={2} name="Uploads" />
                            <Line type="monotone" dataKey="modifications" stroke="#f59e0b" strokeWidth={2} name="Modifications" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Severity Distribution */}
                <div className="card">
                    <h3 className="card-title">Event Severity Distribution</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={severityData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                label={(entry) => `${entry.value}`}
                            >
                                {severityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                        {severityData.map((item, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '0.5rem', backgroundColor: item.color }}></div>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.name}: <strong>{item.value}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Event Type Distribution */}
                <div className="card">
                    <h3 className="card-title">Event Type Distribution</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={eventTypeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="type" stroke="#64748b" style={{ fontSize: '11px' }} angle={-15} textAnchor="end" height={80} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <FaFilter style={{ color: '#64748b' }} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                    >
                        <option value="all">All Event Types</option>
                        <option value="Authentication">Authentication</option>
                        <option value="Data Upload">Data Upload</option>
                        <option value="Data Modification">Data Modification</option>
                        <option value="Security">Security</option>
                        <option value="Report">Report</option>
                    </select>
                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                    >
                        <option value="all">All Severities</option>
                        <option value="Info">Info</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                    </select>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setViewMode('table')}
                            className={viewMode === 'table' ? 'primary-btn' : 'action-btn secondary'}
                        >
                            Table View
                        </button>
                        <button
                            onClick={() => setViewMode('timeline')}
                            className={viewMode === 'timeline' ? 'primary-btn' : 'action-btn secondary'}
                        >
                            Timeline View
                        </button>
                    </div>
                </div>
            </div>

            {/* Audit Logs */}
            {viewMode === 'table' ? (
                <div className="card">
                    <h3 className="card-title">Audit Logs ({filteredLogs.length})</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>User</th>
                                    <th>Action</th>
                                    <th>Details</th>
                                    <th>Type</th>
                                    <th>Severity</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => {
                                    const severityColor = getSeverityColor(log.severity);
                                    return (
                                        <tr key={log.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#64748b' }}>
                                                <FaClock size={12} style={{ marginRight: '0.5rem' }} />
                                                {log.timestamp}
                                            </td>
                                            <td style={{ fontSize: '0.9rem' }}>
                                                <FaUser size={12} style={{ marginRight: '0.5rem', color: '#64748b' }} />
                                                {log.user}
                                            </td>
                                            <td style={{ fontWeight: '600', color: '#1e3a8a' }}>{log.action}</td>
                                            <td style={{ fontSize: '0.9rem', color: '#475569' }}>{log.details}</td>
                                            <td>
                                                <span style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: '#e0e7ff',
                                                    color: '#3730a3'
                                                }}>
                                                    {log.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: severityColor.bg,
                                                    color: severityColor.text
                                                }}>
                                                    {log.severity}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <h3 className="card-title">Activity Timeline</h3>
                    <div style={{ marginTop: '1.5rem' }}>
                        {filteredLogs.map((log, index) => {
                            const severityColor = getSeverityColor(log.severity);
                            return (
                                <div key={log.id} style={{
                                    display: 'flex',
                                    marginBottom: '1.5rem',
                                    paddingBottom: index < filteredLogs.length - 1 ? '1.5rem' : 0,
                                    borderBottom: index < filteredLogs.length - 1 ? '1px solid #e2e8f0' : 'none'
                                }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: severityColor.text,
                                        marginRight: '1rem',
                                        marginTop: '0.25rem',
                                        flexShrink: 0
                                    }}></div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <h4 style={{ margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '1rem' }}>{log.action}</h4>
                                            <span style={{
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold',
                                                backgroundColor: severityColor.bg,
                                                color: severityColor.text
                                            }}>
                                                {log.severity}
                                            </span>
                                        </div>
                                        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#475569' }}>{log.details}</p>
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                            <span><FaClock size={12} style={{ marginRight: '0.25rem' }} />{log.timestamp}</span>
                                            <span><FaUser size={12} style={{ marginRight: '0.25rem' }} />{log.user}</span>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                backgroundColor: '#e0e7ff',
                                                color: '#3730a3',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {log.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditCompliance;
