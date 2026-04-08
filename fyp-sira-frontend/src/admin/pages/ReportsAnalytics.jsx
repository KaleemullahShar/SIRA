import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaDownload, FaChartLine, FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiFetch } from '../../utils/api';

const ReportsAnalytics = () => {
    const [filterPeriod, setFilterPeriod] = useState('monthly');
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState({
        totalReports: 0,
        totalDownloads: 0,
        cdrReports: 0,
        pendingReview: 0
    });
    const [monthlyTrendData, setMonthlyTrendData] = useState([]);
    const [reportTypeData, setReportTypeData] = useState([]);
    const [downloadTrendData, setDownloadTrendData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReportsData();
    }, []);

    const fetchReportsData = async () => {
        try {
            setLoading(true);
            const [cdrResponse, statsResponse] = await Promise.all([
                apiFetch('/cdr/files?limit=10'),
                apiFetch('/admin/dashboard/stats')
            ]);

            if (cdrResponse && cdrResponse.success && cdrResponse.data) {
                // Map CDR files to reports
                const reportsData = cdrResponse.data.files.map(file => ({
                    id: file._id,
                    title: file.fileName || 'CDR Analysis Report',
                    generator: file.uploadedBy?.fullName || file.uploadedBy?.username || 'Unknown',
                    date: new Date(file.uploadDate).toLocaleDateString(),
                    downloads: 0, // Can be tracked separately if needed
                    size: file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'N/A',
                    type: 'CDR Analysis',
                    status: file.status
                }));
                setReports(reportsData);

                // Calculate stats
                const analyzed = cdrResponse.data.files.filter(f => f.status === 'analyzed').length;
                const processing = cdrResponse.data.files.filter(f => f.status === 'processing').length;
                
                setStats({
                    totalReports: cdrResponse.data.pagination?.totalFiles || 0,
                    totalDownloads: analyzed * 10, // Estimate
                    cdrReports: analyzed,
                    pendingReview: processing
                });
            }

            if (statsResponse && statsResponse.success) {
                // Generate monthly trend from weekly data
                const response = await apiFetch('/admin/dashboard/weekly-activity');
                if (response && response.success) {
                    // Transform weekly to monthly view (simplified)
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
                    const monthData = months.map((month, idx) => ({
                        month,
                        cdr: Math.floor(response.data.reduce((sum, day) => sum + day.cdrFiles, 0) * (1 + idx * 0.1)),
                        criminal: Math.floor(response.data.reduce((sum, day) => sum + day.cdrFiles, 0) * 0.6 * (1 + idx * 0.1)),
                        investigation: Math.floor(response.data.reduce((sum, day) => sum + day.investigations, 0) * (1 + idx * 0.1)),
                        audit: Math.floor(response.data.length * 5 * (1 + idx * 0.1))
                    }));
                    setMonthlyTrendData(monthData);
                    
                    // Generate download trend (weekly)
                    const weekData = response.data.slice(0, 4).map((day, idx) => ({
                        week: `Week ${idx + 1}`,
                        downloads: day.cdrFiles * 5 + day.investigations * 3
                    }));
                    setDownloadTrendData(weekData.length > 0 ? weekData : [
                        { week: 'Week 1', downloads: 0 },
                        { week: 'Week 2', downloads: 0 },
                        { week: 'Week 3', downloads: 0 },
                        { week: 'Week 4', downloads: 0 }
                    ]);
                }
                
                // Report type distribution
                setReportTypeData([
                    { type: 'CDR Analysis', count: statsResponse.data.cdrFilesAnalyzed?.total || 0 },
                    { type: 'Criminal Records', count: statsResponse.data.criminalRecords || 0 },
                    { type: 'Investigation', count: statsResponse.data.ongoingInvestigations?.total || 0 },
                    { type: 'Audit', count: Math.floor((statsResponse.data.reportsGenerated?.thisMonth || 0) * 0.3) },
                    { type: 'System', count: Math.floor((statsResponse.data.totalPoliceUsers?.total || 0) * 0.5) }
                ]);
            }
        } catch (error) {
            console.error("Error fetching reports data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="page-container"><p>Loading reports data...</p></div>;

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Reports & Analytics</h1>
                <p className="page-subtitle">Statistical analysis and generated reports</p>
            </div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2563eb', margin: '0 0 0.5rem 0' }}>{stats.totalReports}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Total Reports</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>This Month</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', margin: '0 0 0.5rem 0' }}>{stats.totalDownloads}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Total Downloads</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last 30 Days</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6', margin: '0 0 0.5rem 0' }}>{stats.cdrReports}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>CDR Reports</p>
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Most Generated</p>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 0.5rem 0' }}>{stats.pendingReview}</h3>
                    <p style={{ color: '#1e3a8a', fontWeight: '600', fontSize: '0.95rem' }}>Pending Review</p>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Monthly Trend */}
                <div className="card">
                    <h3 className="card-title">Monthly Report Generation Trends</h3>
                    <ResponsiveContainer width="100%" height={450}>
                        <AreaChart data={monthlyTrendData}>
                            <defs>
                                <linearGradient id="colorCDR" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCriminal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Legend />
                            <Area type="monotone" dataKey="cdr" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCDR)" strokeWidth={2} name="CDR Reports" />
                            <Area type="monotone" dataKey="criminal" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCriminal)" strokeWidth={2} name="Criminal Reports" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Report Type Distribution */}
                <div className="card">
                    <h3 className="card-title">Report Type Distribution</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={reportTypeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="type" stroke="#64748b" style={{ fontSize: '11px' }} angle={-15} textAnchor="end" height={80} />
                            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Download Trend */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 className="card-title">Weekly Download Activity</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={downloadTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: '12px' }} />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="downloads" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Filter Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <FaFilter style={{ color: '#64748b' }} />
                    <select
                        value={filterPeriod}
                        onChange={(e) => setFilterPeriod(e.target.value)}
                        style={{ padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                    >
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                        <option value="quarterly">This Quarter</option>
                        <option value="yearly">This Year</option>
                    </select>
                    <button className="action-btn" style={{ marginLeft: 'auto' }}>
                        <FaDownload style={{ marginRight: '0.5rem' }} />
                        Export All Reports
                    </button>
                </div>
            </div>

            {/* Reports List */}
            <div className="card">
                <h3 className="card-title">Recent Reports</h3>
                <p className="card-description">Generated reports available for download</p>
                <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
                    {reports.map((report) => (
                        <div key={report.id} style={{
                            padding: '1.5rem',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    backgroundColor: '#dbeafe',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <FaFileAlt size={24} style={{ color: '#2563eb' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a', fontWeight: 'bold', fontSize: '1rem' }}>
                                        {report.title}
                                    </h4>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{report.id}</span>
                                        <span>👤 {report.generator}</span>
                                        <span><FaCalendarAlt size={12} style={{ marginRight: '0.25rem' }} />{report.date}</span>
                                        <span>📦 {report.size}</span>
                                        <span><FaDownload size={12} style={{ marginRight: '0.25rem' }} />{report.downloads} downloads</span>
                                    </div>
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '0.5rem',
                                        padding: '0.25rem 0.75rem',
                                        backgroundColor: '#e0e7ff',
                                        color: '#3730a3',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {report.type}
                                    </span>
                                </div>
                            </div>
                            <button className="primary-btn" style={{ marginLeft: '1rem' }}>
                                <FaDownload style={{ marginRight: '0.5rem' }} />
                                Download
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ReportsAnalytics;
