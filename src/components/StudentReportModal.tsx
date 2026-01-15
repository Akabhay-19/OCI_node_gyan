import React, { useState, useEffect } from 'react';
import { Student, Assignment, Submission } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { X, User, Calendar, BookOpen, AlertTriangle, BarChart2, PieChart as PieChartIcon, Activity, Send, CheckCircle, Clock, Target } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface StudentReportModalProps {
    student: Student;
    onClose: () => void;
    teacherId: string;
    teacherName: string;
}

const CHART_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#f59e0b'];

export const StudentReportModal: React.FC<StudentReportModalProps> = ({ student, onClose, teacherId, teacherName }) => {
    const [activeSection, setActiveSection] = useState<'overview' | 'assignments' | 'gaps' | 'charts'>('overview');
    const [chartType, setChartType] = useState<'pie' | 'bar' | 'radar'>('pie');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [suggestion, setSuggestion] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    // Fetch assignments and submissions
    useEffect(() => {
        const fetchData = async () => {
            try {
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');

                // Fetch assignments for student's class
                if (student.classId) {
                    const assignRes = await fetch(`${API_URL}/assignments?classId=${student.classId}`);
                    if (assignRes.ok) {
                        setAssignments(await assignRes.json());
                    }
                }

                // Fetch student submissions
                const subRes = await fetch(`${API_URL}/students/${student.id}/submissions`);
                if (subRes.ok) {
                    setSubmissions(await subRes.json());
                }
            } catch (e) {
                console.error('Failed to fetch student data:', e);
            }
        };
        fetchData();
    }, [student.id, student.classId]);

    const handleSendSuggestion = async () => {
        if (!suggestion.trim()) return;
        setIsSending(true);
        try {
            const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');
            const res = await fetch(`${API_URL}/suggestions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: `SUG-${Date.now()}`,
                    fromTeacherId: teacherId,
                    fromTeacherName: teacherName,
                    toStudentId: student.id,
                    content: suggestion,
                    createdAt: new Date().toISOString()
                })
            });
            if (res.ok) {
                setSendSuccess(true);
                setSuggestion('');
                setTimeout(() => setSendSuccess(false), 3000);
            }
        } catch (e) {
            console.error('Failed to send suggestion:', e);
        } finally {
            setIsSending(false);
        }
    };

    // Calculate stats
    const completedAssignments = submissions.length;
    const pendingAssignments = assignments.filter(a =>
        new Date(a.deadline) >= new Date() && !submissions.find(s => s.assignmentId === a.id)
    ).length;
    const openGaps = (student.weaknessHistory || []).filter(w => w.status === 'OPEN').length;
    const resolvedGaps = (student.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length;

    // Chart data
    const pieData = [
        { name: 'Attendance', value: student.attendance },
        { name: 'Avg Score', value: student.avgScore },
        { name: 'Completed', value: completedAssignments * 10 },
        { name: 'Gaps Resolved', value: resolvedGaps * 20 }
    ];

    const barData = [
        { name: 'Attendance', value: student.attendance },
        { name: 'Avg Score', value: student.avgScore },
        { name: 'Assignments', value: Math.min(completedAssignments * 10, 100) },
        { name: 'Resolved %', value: (student.weaknessHistory || []).length > 0 ? Math.round((resolvedGaps / (student.weaknessHistory || []).length) * 100) : 0 }
    ];

    const radarData = [
        { subject: 'Attendance', value: student.attendance, fullMark: 100 },
        { subject: 'Avg Score', value: student.avgScore, fullMark: 100 },
        { subject: 'Engagement', value: Math.min(completedAssignments * 15, 100), fullMark: 100 },
        { subject: 'Growth', value: (student.weaknessHistory || []).length > 0 ? Math.round((resolvedGaps / (student.weaknessHistory || []).length) * 100) : 50, fullMark: 100 },
        { subject: 'Consistency', value: Math.max(student.attendance - 10, 60), fullMark: 100 }
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" glowColor="purple">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{student.name}</h2>
                            <p className="text-gray-400">{student.grade} • Roll: {student.rollNumber || 'N/A'}</p>
                            <p className="text-sm text-neon-cyan">Attendance: {student.attendance}% • Avg Score: {student.avgScore}%</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-4">
                    {[
                        { id: 'overview', label: 'Overview', icon: User },
                        { id: 'assignments', label: 'Assignments', icon: BookOpen },
                        { id: 'gaps', label: 'Gaps', icon: AlertTriangle },
                        { id: 'charts', label: 'Charts', icon: BarChart2 }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSection(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === tab.id ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30' : 'text-gray-400 hover:bg-white/5'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeSection === 'overview' && (
                        <div className="space-y-6">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                                    <div className="text-2xl font-bold text-green-400">{student.attendance}%</div>
                                    <div className="text-xs text-gray-400">Attendance</div>
                                </div>
                                <div className="bg-blue-500/10 rounded-lg p-4 text-center border border-blue-500/20">
                                    <div className="text-2xl font-bold text-blue-400">{completedAssignments}</div>
                                    <div className="text-xs text-gray-400">Completed</div>
                                </div>
                                <div className="bg-yellow-500/10 rounded-lg p-4 text-center border border-yellow-500/20">
                                    <div className="text-2xl font-bold text-yellow-400">{pendingAssignments}</div>
                                    <div className="text-xs text-gray-400">Pending</div>
                                </div>
                                <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                                    <div className="text-2xl font-bold text-red-400">{openGaps}</div>
                                    <div className="text-xs text-gray-400">Open Gaps</div>
                                </div>
                            </div>

                            {/* Weaker Subjects */}
                            {(student.weakerSubjects || []).length > 0 && (
                                <div>
                                    <h4 className="text-white font-bold mb-2">Weaker Subjects</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(student.weakerSubjects || []).map(sub => (
                                            <span key={sub} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm border border-red-500/30">
                                                {sub}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'assignments' && (
                        <div className="space-y-3">
                            <h4 className="text-white font-bold mb-3">All Assignments ({assignments.length})</h4>
                            {assignments.length === 0 ? (
                                <p className="text-gray-500 italic">No assignments found for this class.</p>
                            ) : (
                                assignments.map(a => {
                                    const sub = submissions.find(s => s.assignmentId === a.id);
                                    const isPast = new Date(a.deadline) < new Date();
                                    return (
                                        <div key={a.id} className={`p-3 bg-white/5 rounded-lg border ${sub ? 'border-green-500/30' : isPast ? 'border-red-500/30' : 'border-white/10'}`}>
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-white font-medium">{a.title}</p>
                                                    <p className="text-xs text-gray-500">Due: {new Date(a.deadline).toLocaleDateString()}</p>
                                                </div>
                                                {sub ? (
                                                    <div className="flex items-center gap-2 text-green-400">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span className="text-sm font-bold">{sub.marks || 0}/{a.maxMarks}</span>
                                                    </div>
                                                ) : isPast ? (
                                                    <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">Missed</span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Pending</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeSection === 'gaps' && (
                        <div className="space-y-4">
                            <div className="flex gap-4 mb-4">
                                <div className="flex-1 bg-red-500/10 rounded-lg p-3 text-center border border-red-500/20">
                                    <div className="text-xl font-bold text-red-400">{openGaps}</div>
                                    <div className="text-xs text-gray-400">Open</div>
                                </div>
                                <div className="flex-1 bg-green-500/10 rounded-lg p-3 text-center border border-green-500/20">
                                    <div className="text-xl font-bold text-green-400">{resolvedGaps}</div>
                                    <div className="text-xs text-gray-400">Resolved</div>
                                </div>
                            </div>
                            {(student.weaknessHistory || []).length === 0 ? (
                                <p className="text-gray-500 italic text-center py-8">No learning gaps detected.</p>
                            ) : (
                                (student.weaknessHistory || []).map(w => (
                                    <div key={w.id} className={`p-3 bg-white/5 rounded-lg border ${w.status === 'OPEN' ? 'border-red-500/30' : 'border-green-500/30'}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-white font-medium">{w.topic}</p>
                                                {w.subTopic && <p className="text-xs text-gray-400">{w.subTopic}</p>}
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                {w.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeSection === 'charts' && (
                        <div className="space-y-4">
                            {/* Chart Type Selector */}
                            <div className="flex gap-2">
                                {[
                                    { id: 'pie', label: 'Pie Chart', icon: PieChartIcon },
                                    { id: 'bar', label: 'Bar Graph', icon: BarChart2 },
                                    { id: 'radar', label: 'Radar', icon: Activity }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setChartType(t.id as any)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${chartType === t.id ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'text-gray-400 bg-white/5'}`}
                                    >
                                        <t.icon className="w-4 h-4" />
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Chart Display */}
                            <div className="h-[300px] bg-black/30 rounded-lg p-4">
                                <ResponsiveContainer>
                                    {chartType === 'pie' ? (
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                                                {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    ) : chartType === 'bar' ? (
                                        <BarChart data={barData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="name" stroke="#666" />
                                            <YAxis stroke="#666" />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#06b6d4" />
                                        </BarChart>
                                    ) : (
                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                            <PolarGrid />
                                            <PolarAngleAxis dataKey="subject" />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                                            <Radar dataKey="value" stroke="#bc13fe" fill="#bc13fe" fillOpacity={0.6} />
                                        </RadarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                {/* Suggestion Input */}
                <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                        <Send className="w-4 h-4 text-neon-purple" /> Send Suggestion to Student
                    </h4>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Type your suggestion or feedback..."
                            value={suggestion}
                            onChange={e => setSuggestion(e.target.value)}
                            className="flex-1"
                        />
                        <NeonButton
                            onClick={handleSendSuggestion}
                            isLoading={isSending}
                            disabled={!suggestion.trim()}
                            glow
                        >
                            {sendSuccess ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                            {sendSuccess ? 'Sent!' : 'Send'}
                        </NeonButton>
                    </div>
                </div>
            </NeonCard>
        </div>
    );
};
