import React, { useEffect, useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Assignment, Student } from '../../types';
import { X, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AssignmentDetailsModalProps {
    assignment: Assignment;
    onClose: () => void;
    students: Student[];
}

interface Submission {
    studentId: string;
    score: number;
    maxMarks: number;
    submittedAt: string;
    timeTaken: number; // in seconds
    status: string;
    textAnswer?: string;
    attachment?: string;
}

export const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({ assignment, onClose, students }) => {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<{ textAnswer?: string; attachment?: string; studentName: string } | null>(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');
                const res = await fetch(`${API_URL}/assignments/${assignment.id}/submissions`);
                if (res.ok) {
                    const data = await res.json();
                    setSubmissions(data);
                }
            } catch (error) {
                console.error("Failed to fetch submissions:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [assignment.id]);

    const formatTime = (seconds: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    // Filter students belonging to this assignment's class
    const classStudents = students.filter(s => s.classId === assignment.classId);

    if (selectedSubmission) {
        return (
            <div className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4">
                <div className="bg-gray-900 border border-white/20 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative animate-scale-in">
                    <button onClick={() => setSelectedSubmission(null)} className="absolute top-4 right-4 text-white bg-red-500/20 p-1 rounded-full hover:bg-red-500/50 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-white mb-4">{selectedSubmission.studentName}'s Submission</h3>

                    {selectedSubmission.textAnswer && (
                        <div className="mb-6">
                            <h4 className="text-neon-cyan font-bold text-sm mb-2 uppercase">Written Answer</h4>
                            <div className="bg-black/50 p-4 rounded-lg text-gray-300 border border-white/10 whitespace-pre-wrap">
                                {selectedSubmission.textAnswer}
                            </div>
                        </div>
                    )}

                    {selectedSubmission.attachment && (
                        <div>
                            <h4 className="text-neon-cyan font-bold text-sm mb-2 uppercase">Attached File</h4>
                            <div className="border border-white/10 rounded-lg overflow-hidden">
                                {selectedSubmission.attachment.startsWith('data:image') ? (
                                    <img src={selectedSubmission.attachment} alt="Student Work" className="w-full h-auto" />
                                ) : (
                                    <div className="p-8 text-center bg-white/5">
                                        <a href={selectedSubmission.attachment} download={`${selectedSubmission.studentName}_work`} className="inline-block px-6 py-3 bg-neon-purple text-white rounded-lg font-bold hover:bg-neon-purple/80 transition-colors">
                                            Download Attached File
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!selectedSubmission.textAnswer && !selectedSubmission.attachment && (
                        <p className="text-gray-500 italic">No content submitted.</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="w-full max-w-4xl max-h-[90vh] flex flex-col p-6 animate-scale-in" glowColor="purple">
                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">{assignment.title}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            {assignment.className} • Due: {new Date(assignment.deadline).toLocaleString()} • Max Marks: {assignment.maxMarks}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                <div className="mb-6 border-b border-white/10 pb-6">
                    <h3 className="text-lg font-bold text-white mb-3">Questions / Instructions</h3>
                    <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        <p className="text-gray-300 bg-white/5 p-4 rounded-lg italic">{assignment.description || "No description provided."}</p>

                        {(() => {
                            let questions = [];
                            try {
                                if (Array.isArray(assignment.questions)) questions = assignment.questions;
                                else if (typeof assignment.questions === 'string') questions = JSON.parse(assignment.questions);
                            } catch (e) { }

                            if (questions && questions.length > 0) {
                                return questions.map((q: any, idx: number) => (
                                    <div key={idx} className="bg-white/5 p-4 rounded-lg">
                                        <p className="text-white font-medium mb-2">{idx + 1}. {q.question}</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {q.options?.map((opt: string, i: number) => (
                                                <div key={i} className={`text-sm px-3 py-1.5 rounded ${i === q.correctAnswer ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-black/20 text-gray-400'}`}>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 border-t border-white/5 pt-2">Explain: {q.explanation}</p>
                                    </div>
                                ));
                            }
                            return null;
                        })()}
                    </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-3">Student Submissions</h3>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-20 text-gray-500">Loading submissions...</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-gray-400 text-sm border-b border-white/10">
                                    <th className="p-3">Student</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Submitted At</th>
                                    <th className="p-3">Time Taken</th>
                                    <th className="p-3 text-right">Score/Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classStudents.map(student => {
                                    const sub = submissions.find(s => s.studentId === student.id);
                                    const isSubmitted = !!sub;
                                    const scorePct = sub ? Math.round((sub.score / sub.maxMarks) * 100) : 0;
                                    const scoreColor = scorePct >= 80 ? 'text-green-400' : scorePct >= 50 ? 'text-yellow-400' : 'text-red-400';

                                    return (
                                        <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-3">
                                                <div className="font-bold text-white">{student.name}</div>
                                                <div className="text-xs text-gray-500">{student.rollNumber}</div>
                                            </td>
                                            <td className="p-3">
                                                {isSubmitted ? (
                                                    <span className="flex items-center gap-1 text-green-400 text-sm">
                                                        <CheckCircle className="w-4 h-4" /> Submitted
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                                                        <AlertCircle className="w-4 h-4" /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-sm text-gray-300">
                                                {sub ? new Date(sub.submittedAt).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-3 text-sm text-gray-300 font-mono">
                                                {sub ? formatTime(sub.timeTaken) : '-'}
                                            </td>
                                            <td className="p-3 text-right">
                                                {sub ? (
                                                    assignment.type === 'UPLOAD' ? (
                                                        <button
                                                            onClick={() => setSelectedSubmission({ textAnswer: sub.textAnswer, attachment: sub.attachment, studentName: student.name })}
                                                            className="px-3 py-1 bg-neon-cyan/20 text-neon-cyan rounded hover:bg-neon-cyan/30 text-xs font-bold border border-neon-cyan/30"
                                                        >
                                                            View Answer
                                                        </button>
                                                    ) : (
                                                        <div>
                                                            <span className={`text-lg font-bold ${scoreColor}`}>{sub.score}</span>
                                                            <span className="text-gray-500 text-xs"> / {sub.maxMarks}</span>
                                                        </div>
                                                    )
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </NeonCard>
        </div>
    );
};
