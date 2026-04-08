import React, { useState } from 'react';
import { FileText, User, Calendar, CheckCircle, AlertCircle, Eye, Download } from 'lucide-react';

const AdminCDR = () => {
    const [cdrFiles] = useState([
        { id: 1, filename: 'case_file_123.xlsx', uploader: 'Officer John Doe', date: '2023-11-20', status: 'Analyzed', records: 1540 },
        { id: 2, filename: 'suspect_call_log_A.csv', uploader: 'Analyst Jane Smith', date: '2023-11-22', status: 'Pending', records: 0 },
        { id: 3, filename: 'tower_dump_oct23.xlsx', uploader: 'Officer Mike Ross', date: '2023-11-18', status: 'Analyzed', records: 5021 },
        { id: 4, filename: 'invalid_format.txt', uploader: 'Officer John Doe', date: '2023-11-15', status: 'Error', records: 0 },
    ]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">CDR Overview</h2>
                <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md font-medium text-sm">
                    Total Files: {cdrFiles.length}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key Metrics</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {cdrFiles.map((file) => (
                                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FileText size={16} className="text-gray-400 mr-2" />
                                            <span className="text-sm font-medium text-gray-900">{file.filename}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <User size={14} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">{file.uploader}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <Calendar size={14} className="text-gray-400 mr-2" />
                                            <span className="text-sm text-gray-600">{file.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${file.status === 'Analyzed' ? 'bg-green-100 text-green-800' :
                                                file.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {file.status === 'Analyzed' ? <CheckCircle size={12} className="mr-1" /> :
                                                file.status === 'Error' ? <AlertCircle size={12} className="mr-1" /> : null}
                                            {file.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {file.records > 0 ? `${file.records} records` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-3">
                                            <button className="text-blue-600 hover:text-blue-900" title="View Summary">
                                                <Eye size={18} />
                                            </button>
                                            <button className="text-gray-600 hover:text-gray-900" title="Download">
                                                <Download size={18} />
                                            </button>
                                        </div>
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

export default AdminCDR;
