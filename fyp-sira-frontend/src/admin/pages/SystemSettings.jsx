import React, { useState } from 'react';
import { FaShieldAlt, FaDatabase, FaBell, FaServer, FaSave, FaCog } from 'react-icons/fa';

const SystemSettings = () => {
    const [settings, setSettings] = useState({
        twoFactorAuth: true,
        sessionTimeout: 30,
        maxLoginAttempts: 3,
        autoBackup: true,
        backupFrequency: 'daily',
        emailNotifications: true,
        smsAlerts: false,
        criticalAlerts: true,
    });

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        console.log('Saving settings:', settings);
        alert('Settings saved successfully!');
    };

    return (
        <div className="page-container">
            {/* Page Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">System Settings</h1>
                <p className="page-subtitle">Configure system security, backups, and notifications</p>
            </div>

            {/* Security Settings */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#dbeafe',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem'
                    }}>
                        <FaShieldAlt size={24} style={{ color: '#2563eb' }} />
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Security Settings</h3>
                        <p className="card-description" style={{ margin: 0 }}>Configure authentication and access control</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Two-Factor Authentication */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Two-Factor Authentication</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Require 2FA for all admin logins</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                            <input
                                type="checkbox"
                                checked={settings.twoFactorAuth}
                                onChange={() => handleToggle('twoFactorAuth')}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: settings.twoFactorAuth ? '#10b981' : '#cbd5e1',
                                transition: '0.4s',
                                borderRadius: '30px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '22px',
                                    width: '22px',
                                    left: settings.twoFactorAuth ? '34px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%'
                                }}></span>
                            </span>
                        </label>
                    </div>

                    {/* Session Timeout */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Session Timeout</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>Auto-logout after inactivity (minutes)</p>
                        <input
                            type="number"
                            value={settings.sessionTimeout}
                            onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>

                    {/* Max Login Attempts */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Maximum Login Attempts</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>Lock account after failed attempts</p>
                        <input
                            type="number"
                            value={settings.maxLoginAttempts}
                            onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.95rem'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Backup Settings */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#dcfce7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem'
                    }}>
                        <FaDatabase size={24} style={{ color: '#10b981' }} />
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Backup Settings</h3>
                        <p className="card-description" style={{ margin: 0 }}>Configure automatic database backups</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Auto Backup */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Automatic Backup</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Enable scheduled database backups</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                            <input
                                type="checkbox"
                                checked={settings.autoBackup}
                                onChange={() => handleToggle('autoBackup')}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: settings.autoBackup ? '#10b981' : '#cbd5e1',
                                transition: '0.4s',
                                borderRadius: '30px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '22px',
                                    width: '22px',
                                    left: settings.autoBackup ? '34px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%'
                                }}></span>
                            </span>
                        </label>
                    </div>

                    {/* Backup Frequency */}
                    <div style={{
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Backup Frequency</h4>
                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>How often to create backups</p>
                        <select
                            value={settings.backupFrequency}
                            onChange={(e) => handleChange('backupFrequency', e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '0.95rem'
                            }}
                            disabled={!settings.autoBackup}
                        >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Notification Settings */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem'
                    }}>
                        <FaBell size={24} style={{ color: '#f59e0b' }} />
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>Notification Preferences</h3>
                        <p className="card-description" style={{ margin: 0 }}>Manage alert and notification settings</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* Email Notifications */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Email Notifications</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Receive email alerts for important events</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                            <input
                                type="checkbox"
                                checked={settings.emailNotifications}
                                onChange={() => handleToggle('emailNotifications')}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: settings.emailNotifications ? '#10b981' : '#cbd5e1',
                                transition: '0.4s',
                                borderRadius: '30px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '22px',
                                    width: '22px',
                                    left: settings.emailNotifications ? '34px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%'
                                }}></span>
                            </span>
                        </label>
                    </div>

                    {/* SMS Alerts */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>SMS Alerts</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Receive SMS for critical security events</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                            <input
                                type="checkbox"
                                checked={settings.smsAlerts}
                                onChange={() => handleToggle('smsAlerts')}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: settings.smsAlerts ? '#10b981' : '#cbd5e1',
                                transition: '0.4s',
                                borderRadius: '30px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '22px',
                                    width: '22px',
                                    left: settings.smsAlerts ? '34px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%'
                                }}></span>
                            </span>
                        </label>
                    </div>

                    {/* Critical Alerts */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e3a8a', fontWeight: 'bold' }}>Critical Security Alerts</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Immediate alerts for security breaches</p>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '30px' }}>
                            <input
                                type="checkbox"
                                checked={settings.criticalAlerts}
                                onChange={() => handleToggle('criticalAlerts')}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: settings.criticalAlerts ? '#10b981' : '#cbd5e1',
                                transition: '0.4s',
                                borderRadius: '30px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '',
                                    height: '22px',
                                    width: '22px',
                                    left: settings.criticalAlerts ? '34px' : '4px',
                                    bottom: '4px',
                                    backgroundColor: 'white',
                                    transition: '0.4s',
                                    borderRadius: '50%'
                                }}></span>
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* System Information */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#e0e7ff',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1rem'
                    }}>
                        <FaServer size={24} style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                        <h3 className="card-title" style={{ margin: 0 }}>System Information</h3>
                        <p className="card-description" style={{ margin: 0 }}>Current system status and details</p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>System Version</p>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.1rem' }}>SIRA v2.4.1</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>Database Status</p>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#10b981', fontSize: '1.1rem' }}>● Operational</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>Last Backup</p>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.1rem' }}>2 hours ago</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>Server Uptime</p>
                        <p style={{ margin: 0, fontWeight: 'bold', color: '#1e3a8a', fontSize: '1.1rem' }}>45 days</p>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleSave} className="primary-btn" style={{ padding: '12px 32px', fontSize: '1rem' }}>
                    <FaSave style={{ marginRight: '0.5rem' }} />
                    Save All Settings
                </button>
            </div>
        </div>
    );
};

export default SystemSettings;
