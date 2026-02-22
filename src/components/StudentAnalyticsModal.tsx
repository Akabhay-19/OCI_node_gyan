import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import { Student, Assignment } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { X, BarChart2, TrendingUp, PieChart, Activity, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface StudentAnalyticsModalProps {
    student: Student;
    onClose: () => void;
}

interface SubmissionData {
    id: string;
    assignmentId: string;
    assignmentTitle?: string;
    score: number;
    maxMarks: number;
    submittedAt: string;
    status: string;
}

const CHART_COLORS = ['#00f5ff', '#bf5af2', '#ff2d55', '#30d158', '#ff9f0a', '#5e5ce6'];

export const StudentAnalyticsModal: React.FC<StudentAnalyticsModalProps> = ({ student, onClose }) => {
    const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'area'>('bar');

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {

                // Fetch submissions
                const subsRes = await fetch(`${API_URL}/students/${student.id}/submissions`);
                if (subsRes.ok) {
                    const subsData = await subsRes.json();
                    setSubmissions(subsData);
                }

                // Fetch assignments for this class
                if (student.classId) {
                    const assignRes = await fetch(`${API_URL}/assignments?classId=${student.classId}`);
                    if (assignRes.ok) {
                        const assignData = await assignRes.json();
                        setAssignments(assignData);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch analytics data", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [student.id, student.classId]);

    // Calculate stats
    const attempted = submissions.length;
    const pending = assignments.length - attempted;
    const avgScore = submissions.length > 0
        ? Math.round(submissions.reduce((acc, s) => acc + (s.score / s.maxMarks) * 100, 0) / submissions.length)
        : 0;

    // Chart data
    const scoreData = submissions.map((s, i) => ({
        name: s.assignmentTitle || `Assignment ${i + 1}`,
        score: Math.round((s.score / s.maxMarks) * 100),
        date: new Date(s.submittedAt).toLocaleDateString()
    }));

    const pieData = [
        { name: 'Completed', value: attempted, color: '#30d158' },
        { name: 'Pending', value: pending > 0 ? pending : 0, color: '#ff9f0a' }
    ];

    const renderChart = () => {
        if (scoreData.length === 0) {
            return (
                <div className="h-64 flex items-center justify-center text-gray-500">
                    No submission data to visualize
                </div>
            );
        }

        switch (chartType) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={scoreData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#888" domain={[0, 100]} />
                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }} />
                            <Bar dataKey="score" fill="#00f5ff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );
            case 'line':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={scoreData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#888" domain={[0, 100]} />
                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="score" stroke="#bf5af2" strokeWidth={2} dot={{ fill: '#bf5af2', r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );
            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <RechartsPie>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ name, value }) => `${name}: ${value}`}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }} />
                            <Legend />
                        </RechartsPie>
                    </ResponsiveContainer>
                );
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={scoreData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={80} />
                            <YAxis stroke="#888" domain={[0, 100]} />
                            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="score" stroke="#30d158" fill="#30d158" fillOpacity={0.3} />
                        </AreaChart>
                    </ResponsiveContainer>
                );
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in"
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="w-full max-w-4xl max-h-[90vh] overflow-y-auto" glowColor="cyan">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neon-cyan to-blue-500 flex items-center justify-center text-xl font-bold text-white">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{student.name}</h2>
                            <p className="text-gray-400 text-sm">Roll: {student.rollNumber || 'N/A'} • {student.grade}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading analytics...</div>
                ) : (
                    <div className="p-6 space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 text-green-400 mb-2">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">Attempted</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{attempted}</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 text-orange-400 mb-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">Pending</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{pending > 0 ? pending : 0}</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">Avg Score</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{avgScore}%</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 text-purple-400 mb-2">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-wider">Total</span>
                                </div>
                                <div className="text-3xl font-bold text-white">{assignments.length}</div>
                            </div>
                        </div>

                        {/* Chart Type Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Visualize as:</span>
                            <div className="flex gap-2">
                                {[
                                    { type: 'bar', icon: BarChart2, label: 'Bar' },
                                    { type: 'line', icon: TrendingUp, label: 'Line' },
                                    { type: 'pie', icon: PieChart, label: 'Pie' },
                                    { type: 'area', icon: Activity, label: 'Area' }
                                ].map(({ type, icon: Icon, label }) => (
                                    <button
                                        key={type}
                                        onClick={() => setChartType(type as any)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${chartType === type
                                            ? 'bg-neon-cyan text-black font-bold'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            {renderChart()}
                        </div>

                        {/* Submissions Table */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Assignment History</h3>
                            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                <div className="grid grid-cols-4 gap-4 p-3 bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                    <div>Assignment</div>
                                    <div>Score</div>
                                    <div>Date</div>
                                    <div>Status</div>
                                </div>
                                {submissions.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No submissions yet</div>
                                ) : (
                                    submissions.map((sub, i) => (
                                        <div key={sub.id || i} className="grid grid-cols-4 gap-4 p-3 border-b border-white/5 hover:bg-white/5">
                                            <div className="text-white truncate">{sub.assignmentTitle || `Assignment ${i + 1}`}</div>
                                            <div className="text-neon-cyan font-mono">{sub.score}/{sub.maxMarks}</div>
                                            <div className="text-gray-400 text-sm">{new Date(sub.submittedAt).toLocaleDateString()}</div>
                                            <div>
                                                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Submitted</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </NeonCard>
        </div>
    );
};
