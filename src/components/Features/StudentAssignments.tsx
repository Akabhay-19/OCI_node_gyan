
import React, { useState, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Assignment, Student, QuizQuestion } from '../../types';
import { BookOpen, Clock, CheckCircle2, XCircle, ArrowRight, Download, PenTool, Image, Upload, Archive, LayoutList, History, FileText, Flag, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { XP_REWARDS, calculateLevel } from '../../services/gamification';

interface StudentAssignmentsProps {
    student: Student;
    selectedClassId?: string; // [NEW] Context from dashboard
    onUpdateStudent?: (student: Student) => void;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({ student, selectedClassId, onUpdateStudent }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeQuiz, setActiveQuiz] = useState<QuizQuestion[] | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
    const [isFlagging, setIsFlagging] = useState(false); // [NEW] Flagging state

    // [NEW] Assignment & Submission State
    const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
    const [startTime, setStartTime] = useState<number>(0);
    const [textAnswer, setTextAnswer] = useState('');
    const [studentAttachment, setStudentAttachment] = useState<string>('');
    // [NEW] Enhanced Submission State
    const [answers, setAnswers] = useState<Record<number, { text?: string; attachment?: string }>>({});
    const [userSelections, setUserSelections] = useState<Record<number, number>>({}); // [NEW] Track MCQ Index
    const [globalAttachment, setGlobalAttachment] = useState<string>('');
    const [submittedAssignmentIds, setSubmittedAssignmentIds] = useState<Set<string>>(new Set());

    // Handle File Upload for Student
    const handleStudentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size too large! Max 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setStudentAttachment(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // [NEW] Enhanced Handlers
    const handleQuestionAnswer = (idx: number, text: string) => {
        setAnswers(prev => ({
            ...prev,
            [idx]: { ...prev[idx], text }
        }));
    };

    const handleQuestionUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAnswers(prev => ({
                    ...prev,
                    [idx]: { ...prev[idx], attachment: reader.result as string }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGlobalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setGlobalAttachment(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStart = async (assignment: Assignment) => {
        setGeneratingId(assignment.id);
        try {
            // [FIX] Don't set activeAssignment yet for QUIZ types to avoid blank screen on error
            if (assignment.type === 'UPLOAD') {
                setActiveAssignment(assignment);
                setStartTime(Date.now());
                setShowResult(false);
                return;
            }

            // ... (Quiz generation logic) ...
            let questions = [];
            if (assignment.questions && Array.isArray(assignment.questions) && assignment.questions.length > 0) {
                questions = assignment.questions;
            } else if (typeof assignment.questions === 'string') {
                try {
                    questions = JSON.parse(assignment.questions);
                } catch (e) { }
            }

            if (!questions || questions.length === 0) {
                // FALLBACK: Use AI Service with Default Model
                const response = await api.generateQuiz(
                    assignment.title,
                    student.grade || 'Grade 10',
                    20,
                    student.id
                );
                questions = response.questions || response;
            }

            if (!questions || questions.length === 0) {
                throw new Error("No questions available for this assignment.");
            }

            // SUCCESS - Set Validation State
            setActiveAssignment(assignment);
            setStartTime(Date.now());
            setScore(0);
            setShowResult(false);
            setActiveQuiz(questions);
            setCurrentQuestion(0);
            setIsAnswered(false);
            setSelectedOption(null);
        } catch (error) {
            console.error("Failed to start assignment:", error);
            alert("Failed to load assignment questions. Please try again.");
            setActiveAssignment(null); // Ensure reset on error
            setActiveQuiz(null);
        } finally {
            setGeneratingId(null);
        }
    };

    const submitAssignment = async () => {
        if (!activeAssignment || !startTime) return;
        const timeTaken = Math.round((Date.now() - startTime) / 1000);

        try {
            // [NEW] 1. Submit for Gap Analysis (If it's a quiz)
            if (activeAssignment.type !== 'UPLOAD' && activeQuiz && activeQuiz.length > 0) {
                console.log("[ASSIGNMENT] Submitting for Gap Analysis...");
                // Construct answers array matching index
                const finalUserAnswers = activeQuiz.map((_, idx) => userSelections[idx] !== undefined ? userSelections[idx] : -1);

                // Fire and forget gap analysis (don't block main submission)
                api.submitQuizResult(
                    student.id,
                    activeAssignment.title,
                    finalUserAnswers,
                    activeQuiz,
                    selectedClassId !== 'ALL' ? selectedClassId : undefined,
                    'ASSIGNMENT', // Source is ASSIGNMENT
                    undefined // Subject inferred
                ).then(res => {
                    console.log("[ASSIGNMENT] Gap Analysis Complete:", res);
                    if (res.newGaps && res.newGaps.length > 0 && onUpdateStudent) {
                        // Optimistically update student with new gaps
                        const newHistory = [...(student.weaknessHistory || []), ...res.newGaps];
                        onUpdateStudent({
                            ...student,
                            weaknessHistory: newHistory
                        });
                    }
                }).catch(err => console.error("[ASSIGNMENT] Gap Analysis Failed:", err));
            }

            // 2. Main Assignment Submission
            const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');
            await fetch(`${API_URL}/assignments/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Math.random().toString(36).substr(2, 9),
                    assignmentId: activeAssignment.id,
                    studentId: student.id,
                    score: score,
                    maxMarks: activeAssignment.maxMarks || 10,
                    timeTaken: timeTaken,
                    textAnswer: textAnswer,
                    attachment: studentAttachment,
                    // [NEW] Enhanced fields
                    answers: Object.entries(answers).map(([idx, val]) => ({
                        questionId: parseInt(idx),
                        questionText: activeQuiz?.[parseInt(idx)]?.question || '',
                        textAnswer: val.text,
                        attachment: val.attachment
                    })),
                    globalAttachment: globalAttachment,
                    gaps: []
                })
            });
            setShowResult(true);

            // [NEW] Award XP for Assignment Completion
            if (activeAssignment.type !== 'UPLOAD' && onUpdateStudent) {
                // Only for quiz-based or mixed where we calculate score immediately? 
                // For now, let's award "Completion" XP instantly. 
                // Ideally, we should check passing grade, but "Completion" is what we asked for.
                // We will award ASSIGNMENT_COMPLETION.

                const earnedXp = XP_REWARDS.ASSIGNMENT_COMPLETION;
                const updatedStudent = {
                    ...student,
                    xp: (student.xp || 0) + earnedXp,
                    level: calculateLevel((student.xp || 0) + earnedXp)
                };
                console.log("[GAMIFICATION] Awarding Assignment XP:", earnedXp);
                onUpdateStudent(updatedStudent);
                // Also sync to backend if api supports it, usually onUpdateStudent in parent handles it?
                // StudentDashboard's onUpdateStudent calls api.updateStudent. So we are good.
            }

        } catch (e) {
            console.error("Failed to submit assignment", e);
        }
    };

    const handleOptionClick = (idx: number) => {
        if (!activeQuiz || isAnswered) return;
        setSelectedOption(idx);
        setIsAnswered(true);

        // [NEW] Track Selection
        setUserSelections(prev => ({
            ...prev,
            [currentQuestion]: idx
        }));

        if (idx === activeQuiz[currentQuestion].correctAnswer) {
            setScore(s => s + 1);
        }
    };

    const handleNext = () => {
        if (!activeQuiz) return;
        if (currentQuestion < activeQuiz.length - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
            setIsFlagging(false);
        } else {
            submitAssignment();
        }
    };

    useEffect(() => {
        const fetchAssignments = async () => {
            // Determine which classes to fetch assignments for
            // If ALL, we might need a backend change to support multiple classIds or just fetch for primary classId for now if backend limited
            // For now, let's assume if ALL, we fetch for all enrolments if possible, or fallback to student.classId
            // A better approach for ALL is to not pass classId param and let backend return all for student? 
            // Or loop through classIds.
            // Let's rely on backend filtering by student ID if classId not passed? 
            // But current API implementation likely filters by classId query req.

            const targetClassId = selectedClassId !== 'ALL' ? selectedClassId : student.classId;

            if (!targetClassId && (!student.classIds || student.classIds.length === 0)) {
                setLoading(false);
                return;
            }

            try {
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');

                // If specific class selected
                if (selectedClassId && selectedClassId !== 'ALL') {
                    const res = await fetch(`${API_URL}/assignments?classId=${selectedClassId}`);
                    if (res.ok) setAssignments(await res.json());
                } else {
                    // ALL Classes - Fetch for all enrolled classes
                    // If backend supports list, great. If not, maybe just primary classId for now to avoid complexity or loop
                    // Let's try fetching for primary classId as fallback + any others
                    // Actually, usually GET /assignments?studentId=... should return all assignments for a student across all classes
                    // Let's assume there is an endpoint or param for studentId? 
                    // The previous code used `?classId=${student.classId}`.
                    // Let's try `?studentId=${student.id}` if that exists, or just stick to classId for now.

                    // SAFE BET: Fetch for all classIds manually if multiple
                    const classesToFetch = student.classIds && student.classIds.length > 0 ? student.classIds : [student.classId];
                    const promises = classesToFetch.filter(Boolean).map(cid => fetch(`${API_URL}/assignments?classId=${cid}`).then(r => r.json()));
                    const results = await Promise.all(promises);
                    const allAssignments = results.flat();
                    // Remove duplicates just in case
                    const unique = Array.from(new Map((allAssignments || []).filter(Boolean).map((item: any) => [item.id, item])).values()) as Assignment[];
                    setAssignments(unique);
                }
            } catch (error) {
                console.error("Failed to fetch assignments:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignments();
    }, [student.classId, student.classIds, selectedClassId, student.id]);

    // [NEW] Fetch Submissions to check status
    useEffect(() => {
        const fetchSubmissions = async () => {
            try {
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');
                const res = await fetch(`${API_URL}/students/${student.id}/history`);
                if (res.ok) {
                    const data = await res.json();
                    const ids = new Set(data.map((s: any) => s.assignmentId));
                    setSubmittedAssignmentIds(ids as Set<string>);
                }
            } catch (error) {
                console.error("Failed to fetch submissions:", error);
            }
        };
        fetchSubmissions();
    }, [student.id]);

    if (loading) return <div className="text-white">Loading assignments...</div>;

    // Filter Assignments
    const now = new Date();
    const activeAssignments = assignments.filter(a => new Date(a.deadline) >= now);
    const archivedAssignments = assignments.filter(a => new Date(a.deadline) < now);
    const displayedAssignments = viewMode === 'ACTIVE' ? activeAssignments : archivedAssignments;

    if (assignments.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No assignments assigned yet.</p>
            </div>
        );
    }

    // CHECK IF SHOWING RESULT
    if (showResult) {
        return (
            <NeonCard glowColor="purple" className="text-center p-12 max-w-md mx-auto animate-fade-in">
                <CheckCircle2 className="w-24 h-24 mx-auto text-green-400 mb-6" />
                <h2 className="text-3xl font-bold text-white mb-2">Assignment Submitted!</h2>
                <p className="text-gray-400 mb-6">You have successfully submitted your work.</p>
                {activeAssignment?.type !== 'UPLOAD' && (
                    <div className="text-5xl font-bold text-neon-purple mb-8">
                        Score: {score}/{activeQuiz?.length || 0}
                    </div>
                )}
                <NeonButton onClick={() => { setActiveQuiz(null); setActiveAssignment(null); setShowResult(false); }} className="w-full">
                    Return to Assignments
                </NeonButton>
            </NeonCard>
        );
    }

    // LIST VIEW
    if (!activeAssignment) {
        return (
            <div className="space-y-6 animate-fade-in">
                {/* View Toggles */}
                <div className="flex gap-4 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setViewMode('ACTIVE')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'ACTIVE' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                    >
                        <LayoutList className="w-4 h-4" /> Active ({activeAssignments.length})
                    </button>
                    <button
                        onClick={() => setViewMode('ARCHIVE')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'ARCHIVE' ? 'bg-white text-black font-bold' : 'text-gray-400 hover:text-white'}`}
                    >
                        <History className="w-4 h-4" /> Archive ({archivedAssignments.length})
                    </button>
                </div>

                {displayedAssignments.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 border border-dashed border-white/10 rounded-xl">
                        <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No {viewMode.toLowerCase()} assignments found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedAssignments.map(assignment => (
                            <NeonCard key={assignment.id} glowColor={viewMode === 'ACTIVE' ? "purple" : "blue"} className={`flex flex-col h-full hover:shadow-lg transition-shadow ${viewMode === 'ARCHIVE' ? 'opacity-75 grayscale-[0.5]' : ''}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold border ${viewMode === 'ACTIVE' ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/30' : 'bg-gray-700/50 text-gray-400 border-gray-600'}`}>
                                        {assignment.type === 'UPLOAD' ? 'FILE UPLOAD' : 'QUIZ'}
                                    </span>
                                    <span className={`text-xs flex items-center gap-1 ${viewMode === 'ACTIVE' ? 'text-gray-400' : 'text-red-400 font-bold'}`}>
                                        <Clock className="w-3 h-3" />
                                        {viewMode === 'ACTIVE' ? new Date(assignment.deadline).toLocaleDateString() : 'Expired'}
                                    </span>
                                </div>
                                <div className="text-xs text-neon-cyan mb-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Duration: {assignment.duration || 60} mins
                                </div>

                                <h3 className="text-xl font-bold text-white mb-2">{assignment.title}</h3>
                                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                    {assignment.description}
                                </p>

                                {assignment.type === 'UPLOAD' && (
                                    <div className="mt-auto mb-4 text-xs text-neon-cyan flex items-center gap-1">
                                        <PenTool className="w-3 h-3" /> Requires Manual Submission
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-auto">
                                    <span className="text-sm font-bold text-neon-cyan">
                                        Max Marks: {assignment.maxMarks}
                                    </span>
                                    {viewMode === 'ACTIVE' ? (
                                        submittedAssignmentIds.has(assignment.id) ? (
                                            <span className="flex items-center gap-1 text-green-400 font-bold text-sm bg-green-500/10 px-3 py-1 rounded">
                                                <CheckCircle2 className="w-4 h-4" /> Submitted
                                            </span>
                                        ) : (
                                            <NeonButton
                                                size="sm"
                                                variant="primary"
                                                onClick={() => handleStart(assignment)}
                                                disabled={generatingId === assignment.id}
                                            >
                                                {generatingId === assignment.id ? "Loading..." : "Start"}
                                            </NeonButton>
                                        )
                                    ) : (
                                        <span className="text-xs text-gray-500 font-medium px-3 py-1 bg-white/5 rounded">
                                            Archived
                                        </span>
                                    )}
                                </div>
                            </NeonCard>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // SYMBOL HELPER
    const SYMBOLS = {
        'Math': ['+', '-', '×', '÷', '=', '≠', '≈', '±', '√', '∞', '∫', 'Δ', 'Σ', 'π', '°'],
        'Super': ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '⁺', '⁻', 'ⁿ'],
        'Sub': ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₊', '₋'],
        'Greek': ['α', 'β', 'γ', 'θ', 'λ', 'μ', 'π', 'σ', 'ω', 'Ω']
    };

    const insertSymbol = (symbol: string, elementId: string, isStateUpdater: (val: string) => void, currentValue: string) => {
        const textarea = document.getElementById(elementId) as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newVal = currentValue.substring(0, start) + symbol + currentValue.substring(end);
            isStateUpdater(newVal);
            // Valid React state update re-renders, so we need to restore cursor after render.
            // A simple timeout helps, or useLayoutEffect if componentized. 
            // For now, simpler approach:
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + symbol.length, start + symbol.length);
            }, 0);
        } else {
            isStateUpdater(currentValue + symbol);
        }
    };

    const SymbolToolbar = ({ elementId, onInsert, currentValue }: { elementId: string, onInsert: (v: string) => void, currentValue: string }) => {
        const [activeGroup, setActiveGroup] = useState<keyof typeof SYMBOLS>('Math');

        return (
            <div className="flex flex-col gap-2 mb-2 p-2 bg-white/5 rounded-lg border border-white/10">
                <div className="flex gap-2 border-b border-white/10 pb-2 mb-1 overflow-x-auto">
                    {(Object.keys(SYMBOLS) as Array<keyof typeof SYMBOLS>).map(group => (
                        <button
                            key={group}
                            onClick={() => setActiveGroup(group)}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeGroup === group ? 'bg-neon-purple text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        >
                            {group}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1">
                    {SYMBOLS[activeGroup].map(s => (
                        <button
                            key={s}
                            onClick={() => insertSymbol(s, elementId, onInsert, currentValue)}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-gray-300 hover:text-white hover:shadow-lg transition-all text-sm font-mono"
                            title={`Insert ${s}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // SUBJECTIVE / ENHANCED VIEW
    // If it's explicitly subjective OR it has questions but is not being treated as a one-by-one quiz (e.g., has subjective type)
    if (activeAssignment.type === 'SUBJECTIVE' && activeQuiz) {
        return (
            <NeonCard className="max-w-4xl mx-auto p-8 animate-slide-up space-y-8" glowColor="purple">
                {/* Header */}
                <div className="border-b border-white/10 pb-6">
                    <h2 className="text-3xl font-bold text-white mb-2">{activeAssignment.title}</h2>
                    <p className="text-gray-400">{activeAssignment.description}</p>
                </div>

                {/* Questions List */}
                <div className="space-y-12">
                    {activeQuiz.map((q, idx) => (
                        <div key={idx} className="bg-black/20 rounded-xl p-6 border border-white/5">
                            <div className="flex gap-4 mb-4">
                                <span className="text-neon-cyan font-bold text-xl">Q{idx + 1}.</span>
                                <h3 className="text-white text-lg leading-relaxed font-medium">{q.question}</h3>
                            </div>

                            <div className="space-y-4 pl-10">
                                {/* Symbol Toolbar */}
                                <SymbolToolbar
                                    elementId={`question-textarea-${idx}`}
                                    currentValue={answers[idx]?.text || ''}
                                    onInsert={(val) => handleQuestionAnswer(idx, val)}
                                />

                                {/* Text Input */}
                                <textarea
                                    id={`question-textarea-${idx}`}
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg p-4 text-white focus:border-neon-purple focus:outline-none min-h-[120px] font-mono"
                                    placeholder="Type your answer here..."
                                    value={answers[idx]?.text || ''}
                                    onChange={(e) => handleQuestionAnswer(idx, e.target.value)}
                                />

                                {/* File Upload for Question */}
                                <div className="flex items-center gap-4">
                                    <div className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-dashed border-white/20 cursor-pointer transition-colors">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleQuestionUpload(idx, e)} />
                                        <Upload className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-300">Upload Answer (Image/PDF)</span>
                                    </div>
                                    {answers[idx]?.attachment && (
                                        <span className="text-xs text-green-400 font-bold flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> File Attached
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Global Upload */}
                <div className="bg-neon-blue/5 rounded-xl p-6 border border-neon-blue/20 mt-8">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-neon-blue" />
                        Alternative: Submit Whole Assignment
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">Instead of answering individual questions above, you can upload a single PDF containing all your solutions.</p>

                    <div className="border-2 border-dashed border-neon-blue/30 rounded-lg p-8 text-center hover:bg-neon-blue/5 transition-colors relative">
                        <input type="file" accept=".pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleGlobalUpload} />
                        {globalAttachment ? (
                            <div>
                                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                                <p className="text-green-400 font-bold">Assignment PDF Attached</p>
                                <p className="text-xs text-gray-500 mt-1">Ready to submit</p>
                            </div>
                        ) : (
                            <div>
                                <Upload className="w-10 h-10 text-neon-blue/50 mx-auto mb-2" />
                                <p className="text-gray-300 font-medium">Click to upload Assignment PDF</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-white/10">
                    <NeonButton size="lg" variant="primary" onClick={submitAssignment} glow>
                        Submit Assignment
                    </NeonButton>
                </div>
            </NeonCard>
        );
    }

    // UPLOAD ASSIGNMENT VIEW
    if (activeAssignment.type === 'UPLOAD') {
        return (
            <NeonCard className="max-w-4xl mx-auto p-8 animate-slide-up" glowColor="cyan">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b border-white/10 pb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">{activeAssignment.title}</h2>
                        <p className="text-gray-400">{activeAssignment.description}</p>
                        {activeAssignment.attachment && (
                            <a href={activeAssignment.attachment} download="Assignment.pdf" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-neon-cyan transition-colors">
                                <Download className="w-4 h-4" /> Download Assignment File
                            </a>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-black/40 rounded-lg p-6 border border-white/5">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><PenTool className="w-5 h-5 text-purple-400" /> Your Answer</h3>

                        <SymbolToolbar
                            elementId="upload-textarea"
                            currentValue={textAnswer}
                            onInsert={setTextAnswer}
                        />

                        <textarea
                            id="upload-textarea"
                            className="w-full h-64 bg-transparent text-white border border-white/10 rounded-lg p-4 focus:border-neon-purple focus:outline-none resize-none font-mono"
                            placeholder="Type your answer here..."
                            value={textAnswer}
                            onChange={e => setTextAnswer(e.target.value)}
                        />
                    </div>

                    <div className="bg-black/40 rounded-lg p-6 border border-white/5">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Image className="w-5 h-5 text-green-400" /> Upload Handwritten Work (Optional)</h3>
                        <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-white/20 transition-colors relative">
                            <input type="file" accept="image/*,.pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleStudentFileUpload} />
                            {studentAttachment ? (
                                <div>
                                    <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                                    <p className="text-green-400 font-bold">File Attached Ready for Submission</p>
                                </div>
                            ) : (
                                <div>
                                    <Upload className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                                    <p className="text-gray-400 font-medium">Click to upload photo or PDF</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <NeonButton onClick={submitAssignment} className="w-full mt-4" glow>Submit Assignment</NeonButton>
                </div>
            </NeonCard>
        );
    }

    // QUIZ VIEW
    if (activeQuiz) {
        const question = activeQuiz[currentQuestion];
        const currentAnswerState = answers[currentQuestion] || {};
        const isFlagged = !!currentAnswerState.text; // If text exists, it's flagged/custom answered

        return (
            <NeonCard className="max-w-3xl mx-auto p-8 animate-fade-in" glowColor={isFlagged ? "red" : "blue"}>
                <div className="flex justify-between items-center mb-6">
                    <div className="text-gray-400 uppercase tracking-widest text-xs font-bold">
                        <span>Question {currentQuestion + 1}/{activeQuiz.length}</span>
                        <span className="ml-4">Current Score: {score}</span>
                    </div>
                    {/* Flag Button */}
                    <button
                        onClick={() => setIsFlagging(!isFlagging)}
                        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${isFlagged ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                        disabled={isAnswered && !isFlagged}
                    >
                        <Flag className="w-3 h-3" /> {isFlagged ? 'Flagged / Custom Answer' : 'Flag / Custom Answer'}
                    </button>
                </div>

                <h3 className="text-2xl font-bold text-white mb-8 leading-relaxed">
                    {question.question}
                </h3>

                {/* Normal Options or Flag Input */}
                {!isFlagging && !isFlagged ? (
                    <div className="space-y-4">
                        {(question.options || []).length > 0 ? (
                            (question.options || []).map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionClick(idx)}
                                    disabled={isAnswered}
                                    className={`
                                        w-full text-left p-4 rounded-lg border transition-all duration-300
                                        ${isAnswered
                                            ? idx === question.correctAnswer
                                                ? 'border-green-500 bg-green-500/20 text-green-100'
                                                : idx === selectedOption
                                                    ? 'border-red-500 bg-red-500/20 text-red-100'
                                                    : 'border-white/10 opacity-40'
                                            : 'border-white/10 hover:border-neon-cyan/50 hover:bg-white/5 text-gray-200'
                                        }
                                    `}
                                >
                                    <span className="mr-4 opacity-50 font-mono text-neon-cyan">{String.fromCharCode(65 + idx)}.</span>
                                    {opt}
                                </button>
                            ))
                        ) : (
                            /* No options - show text input for subjective answer */
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                                <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                                    <PenTool className="w-5 h-5" /> Write Your Answer
                                </h4>
                                <textarea
                                    className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-blue-500 outline-none min-h-[150px] font-mono"
                                    placeholder="Type your answer here..."
                                    value={currentAnswerState.text || ''}
                                    onChange={(e) => handleQuestionAnswer(currentQuestion, e.target.value)}
                                    disabled={isAnswered}
                                />
                                {!isAnswered && (
                                    <div className="flex justify-end mt-4">
                                        <NeonButton onClick={() => setIsAnswered(true)} glow>
                                            Submit Answer
                                        </NeonButton>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
                        <h4 className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                            <Flag className="w-5 h-5" /> Report Issue / Custom Answer
                        </h4>
                        <p className="text-gray-400 text-sm mb-4">
                            If the options are incorrect or you have a better answer, please describe it below.
                        </p>
                        <textarea
                            className="w-full bg-black/50 border border-white/20 rounded-lg p-4 text-white focus:border-orange-500 outline-none min-h-[120px]"
                            placeholder="Type your answer or issue here..."
                            value={currentAnswerState.text || ''}
                            onChange={(e) => handleQuestionAnswer(currentQuestion, e.target.value)}
                            disabled={isAnswered && !isFlagging} // Allow editing if just toggled
                        />
                        <div className="flex gap-3 justify-end mt-4">
                            {!isFlagged && (
                                <NeonButton variant="secondary" size="sm" onClick={() => setIsFlagging(false)}>Cancel</NeonButton>
                            )}
                            <NeonButton variant="primary" size="sm" onClick={() => { setIsFlagging(false); setIsAnswered(true); }} className="bg-orange-500 hover:bg-orange-600 border-none text-white">Save Flag</NeonButton>
                        </div>
                    </div>
                )}

                {isAnswered && !isFlagged && (
                    <div className="mt-8 pt-6 border-t border-white/10 animate-slide-up">
                        <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r mb-6">
                            <h4 className="text-blue-400 text-xs font-bold uppercase mb-2">Explanation</h4>
                            <p className="text-gray-300 text-sm leading-relaxed">{question.explanation}</p>
                        </div>
                        <div className="flex justify-end">
                            <NeonButton onClick={handleNext} glow>
                                {currentQuestion === activeQuiz.length - 1 ? "Submit Assignment" : "Next Question"}
                            </NeonButton>
                        </div>
                    </div>
                )}

                {/* For flagged items, show Next button too */}
                {isFlagged && (
                    <div className="mt-6 flex justify-end">
                        <NeonButton onClick={handleNext} glow>
                            {currentQuestion === activeQuiz.length - 1 ? "Submit Assignment" : "Next Question"}
                        </NeonButton>
                    </div>
                )}

            </NeonCard>
        );
    }

    // FALLBACK / ERROR STATE
    // If we reached here with activeAssignment set, something is wrong (e.g. unknown type or missing quiz data)
    return (
        <div className="text-center py-20 text-gray-500 animate-fade-in">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500/50" />
            <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
            <p className="mb-6">Unable to load the assignment view.</p>
            <NeonButton onClick={() => { setActiveAssignment(null); setActiveQuiz(null); }} variant="secondary">
                Return to List
            </NeonButton>
        </div>
    );
};
