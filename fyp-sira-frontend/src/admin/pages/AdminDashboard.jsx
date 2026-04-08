import React, { useState, useEffect } from 'react';
import { FaUsers, FaFileAlt, FaShieldAlt, FaExclamationTriangle, FaChartLine, FaDatabase } from 'react-icons/fa';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiFetch } from '../../utils/api';

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <h3 style={{ color, fontSize: '2.5rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>{value}</h3>
                <p style={{ color: '#1e3a8a', fontWeight: '600', margin: '0 0 0.25rem 0', fontSize: '0.95rem' }}>{title}</p>
                {subtitle && <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>{subtitle}</p>}
            </div>
            <div style={{ fontSize: '2.5rem', color, opacity: 0.2 }}>
                <Icon />
            </div>
        </div>
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [caseStatusData, setCaseStatusData] = useState([]);
    const [hourlyActivityData, setHourlyActivityData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [statsRes, weeklyRes, caseRes, hourlyRes] = await Promise.all([
                    apiFetch('/admin/dashboard/stats'),
                    apiFetch('/admin/dashboard/weekly-activity'),
                    apiFetch('/admin/dashboard/case-status'),
                    apiFetch('/admin/dashboard/hourly-activity')
                ]);

                if (statsRes && statsRes.success) {
                    const s = statsRes.data;
                    setStats([
                        {
                            title: 'Total Police Users',
                            value: s.totalPoliceUsers.total,
                            subtitle: `${s.totalPoliceUsers.active} Active • ${s.totalPoliceUsers.inactive} Inactive`,
                            icon: FaUsers,
                            color: '#2563eb'
                        },
                        {
                            title: 'CDR Files Analyzed',
                            value: s.cdrFilesAnalyzed.total,
                            subtitle: `+${s.cdrFilesAnalyzed.last30Days} Last 30 days`,
                            icon: FaFileAlt,
                            color: '#8b5cf6'
                        },
                        {
                            title: 'Ongoing Investigations',
                            value: s.ongoingInvestigations.total,
                            subtitle: `${s.ongoingInvestigations.highPriority} High Priority`,
                            icon: FaChartLine,
                            color: '#f59e0b'
                        },
                        {
                            title: 'Criminal Records',
                            value: s.criminalRecords,
                            subtitle: 'Verified records in database',
                            icon: FaShieldAlt,
                            color: '#64748b'
                        },
                        {
                            title: 'Reports Generated',
                            value: s.reportsGenerated.thisMonth,
                            subtitle: 'This month',
                            icon: FaDatabase,
                            color: '#10b981'
                        },
                    ]);
                }

                if (weeklyRes.success) setWeeklyData(weeklyRes.data);
                if (caseRes.success) setCaseStatusData(caseRes.data);
                if (hourlyRes.success) setHourlyActivityData(hourlyRes.data);

            } catch (error) {
                console.error("Error fetching admin dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="page-container"><p>Loading dashboard data...</p></div>;

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Central Command Dashboard</h1>
                <p className="page-subtitle">Real-time monitoring and intelligence overview</p>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                {stats.map((stat, index) => (
                    <StatCard key={index} {...stat} />
                ))}
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Weekly Activity Chart */}
                <div className="card">
                    <h3 className="card-title">Weekly Activity Trends</h3>
                    <ResponsiveContainer width="100%" height={450}>
                        <AreaChart data={weeklyData}>
                            <defs>
                                <linearGradient id="colorCdr" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="cdrFiles" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCdr)" strokeWidth={2} />
                            <Area type="monotone" dataKey="investigations" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorInv)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%', marginRight: '0.5rem' }}></div>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>CDR Files</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '50%', marginRight: '0.5rem' }}></div>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Investigations</span>
                        </div>
                    </div>
                </div>

                {/* Case Status Distribution */}
                <div className="card">
                    <h3 className="card-title">Case Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={caseStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {caseStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                        {caseStatusData.map((item, index) => (
                            <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', marginRight: '0.5rem', backgroundColor: item.color }}></div>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.name}: <strong>{item.value}</strong></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hourly Activity Chart */}
            <div className="card">
                <h3 className="card-title">24-Hour Call Activity</h3>
                <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={hourlyActivityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="hour" stroke="#64748b" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                        <Bar dataKey="calls" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Quick Actions */}
            <div className="card" style={{ backgroundColor: '#1e3a8a', color: 'white', marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Quick Intelligence Access</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', opacity: 0.9 }}>Access critical monitoring tools and reports</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <button className="action-btn" style={{ backgroundColor: 'white', color: '#1e3a8a' }}>
                        View CDR Intelligence
                    </button>
                    <button className="action-btn secondary">
                        Monitor Police Units
                    </button>
                    <button className="action-btn secondary">
                        Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
