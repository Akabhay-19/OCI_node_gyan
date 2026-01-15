import React, { useState, useEffect } from 'react';
import { Student, Classroom, Announcement, WeaknessRecord, SchoolProfile, Suggestion, ModuleHistoryItem } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { AdaptiveLearning } from './Features/AdaptiveLearning';
import { QuizMode } from './Features/QuizMode';
import { Leaderboard } from './Features/Leaderboard';
import { StoryMode } from './Features/StoryMode';
import { StudentAssignments } from './Features/StudentAssignments';
import { UserProfileModal } from './UserProfileModal';
import { RemedialModal } from './Features/RemedialModal';
import { GuideModal } from './Features/GuideModal';
import { calculateLevel, getLevelProgress, getLevelTitle } from '../services/gamification';

import { AttendanceView } from './Features/AttendanceView';
import { MindMapGenerator } from './Features/MindMapGenerator';
import { FlashcardGenerator } from './Features/FlashcardGenerator';
import { EnglishLearningLab } from './Features/EnglishLearningLab';
import { ModuleHistory } from './Features/ModuleHistory';
import { parseClassDetails } from '../utils/classParser'; // [NEW]
import { OpportunitiesView } from './Features/OpportunitiesView';
import { ModelSelector } from './ModelSelector';
import { BookOpen, Target, Trophy, ClipboardList, Sparkles, Feather, CheckCircle2, X, XCircle, AlertCircle, AlertTriangle, Clock, Star, TrendingUp, Calendar, Copy, School, Bell, Plus, Network, Zap, History, ChevronLeft, ChevronRight, LayoutDashboard, Globe, CircleHelp, Languages, ArrowRight, Trash2, FolderOpen } from 'lucide-react';
import { api } from '../services/api';

interface StudentDashboardProps {
    student: Student;
    classrooms?: Classroom[];
    announcements?: Announcement[];
    schoolName: string;
    schoolProfile?: SchoolProfile;
    onUpdateStudent?: (student: Student) => void;
    students?: Student[]; // For rank calculation
    onJoinClassClick?: () => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
    student, classrooms, announcements, schoolName, schoolProfile, onUpdateStudent, students, onJoinClassClick, activeTab: propActiveTab, onTabChange
}) => {
    const [activeTab, setActiveTab] = useState('LEARN_AI');

    useEffect(() => {
        if (propActiveTab && propActiveTab !== 'HOME' && propActiveTab !== 'DASHBOARD') {
            setActiveTab(propActiveTab);
        }
    }, [propActiveTab]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };

    // [NEW] AI Sub-navigation State
    const [activeAiTab, setActiveAiTab] = useState('AI_LEARN');

    const [learnRefreshKey, setLearnRefreshKey] = useState(0);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [selectedGap, setSelectedGap] = useState<WeaknessRecord | null>(null);
    const [selectedResolvedGap, setSelectedResolvedGap] = useState<WeaknessRecord | null>(null); // [NEW] View Details
    const [remedialTab, setRemedialTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
    const [activeFolder, setActiveFolder] = useState<{ source: string, name: string } | null>(null);
    const [activeSource, setActiveSource] = useState<'AI_LEARNING' | 'ASSIGNMENT' | 'PRACTICE' | null>(null); // [NEW] Source Navigation
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    // Fetch teacher suggestions for this student
    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');
                const res = await fetch(`${API_URL}/students/${student.id}/suggestions`);
                if (res.ok) {
                    setSuggestions(await res.json());
                }
            } catch (e) {
                console.error('Failed to fetch suggestions:', e);
            }
        };
        fetchSuggestions();
        fetchSuggestions();
    }, [student.id]);

    // [NEW] Module History Navigation
    const [loadedModule, setLoadedModule] = useState<ModuleHistoryItem | null>(null);

    const handleLoadModule = (item: ModuleHistoryItem) => {
        setLoadedModule(item);
        // Switch to appropriate tab
        setActiveTab('LEARN_AI');
        if (item.type === 'STUDY_PLAN') setActiveAiTab('AI_LEARN');
        else if (item.type === 'QUIZ') setActiveAiTab('PRACTICE');
        else if (item.type === 'STORY') setActiveAiTab('STORY');
        else if (item.type === 'FLASHCARDS') setActiveAiTab('FLASHCARDS');
        else if (item.type === 'MINDMAP') setActiveAiTab('MINDMAP');
    };

    // [NEW] Class Switcher State
    // Default to primary classId, or first in classIds, or empty string
    const [selectedClassId, setSelectedClassId] = useState<string>(student.classId || (student.classIds && student.classIds.length > 0 ? student.classIds[0] : '') || '');

    // Update selected class if student data changes (e.g. after joining a new class)
    React.useEffect(() => {
        if (!selectedClassId && (student.classId || (student.classIds && student.classIds.length > 0))) {
            setSelectedClassId(student.classId || student.classIds?.[0] || '');
        }
    }, [student, selectedClassId]);

    // [NEW] robustly determine class options even if classIds is undefined (legacy data)
    const availableClassIds = React.useMemo(() => {
        if (student.classIds && student.classIds.length > 0) return student.classIds;
        if (student.classId) return [student.classId];
        return [];
    }, [student]);

    const activeClassroom = classrooms?.find(c => c.id === selectedClassId);

    // [FIX] Define activeClasses for the dashboard grid
    const activeClasses = (classrooms || []).filter(c => availableClassIds.includes(c.id));



    // --- Stats Calculation ---
    // Rank (Filter students by the SELECTED class, or ALL classes logic)
    // If 'ALL', we compare against ALL students in ALL valid classes of this student.
    // For simplicity in 'ALL', we can just show rank within the School or Grade (optional),
    // or arguably just show "N/A" or "Global". Let's try to filter by all availableClassIds.

    // Filter students for rank:
    // If selectedClassId is set (and not 'ALL'), use it.
    // If 'ALL', use students who are in ANY of the availableClassIds.
    const classStudents = (students || []).filter(s => {
        if (!selectedClassId) return false;
        if (selectedClassId === 'ALL') {
            // Check if student 's' is in ANY of the current user's classes
            return s.classIds?.some(cid => availableClassIds.includes(cid)) || availableClassIds.includes(s.classId || '');
        }
        return s.classId === selectedClassId || s.classIds?.includes(selectedClassId);
    });
    const sortedStudents = [...classStudents].sort((a, b) => b.avgScore - a.avgScore);
    const rank = sortedStudents.findIndex(s => s.id === student.id) + 1;
    const totalStudents = sortedStudents.length || 1;

    // Stats State
    const [classAttendance, setClassAttendance] = useState(student.attendance);
    const [classAvgScore, setClassAvgScore] = useState(student.avgScore);
    const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);
    const [completedAssignmentsCount, setCompletedAssignmentsCount] = useState(0);
    const [xp, setXp] = useState(0);

    React.useEffect(() => {
        const calculateStats = async () => {
            // 1. Calculate Attendance for Selected Class(es)
            // Logic mirrors AttendanceView: Check last 30 days (or since joined) in LocalStorage
            let totalDays = 0;
            let presentDays = 0;
            const classesToCheck = selectedClassId === 'ALL' ? availableClassIds : [selectedClassId];

            // Simplification: Check last 30 days for each class
            const today = new Date();
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(today.getDate() - i);
                const dateStr = d.toLocaleDateString();
                const dayOfWeek = d.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                if (!isWeekend) {
                    classesToCheck.forEach(cid => {
                        if (!cid) return;
                        totalDays++;
                        const key = `attendance_${cid}_${dateStr}`;
                        const stored = localStorage.getItem(key);
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            if (parsed[student.id] === 'PRESENT') presentDays++;
                        }
                    });
                }
            }
            // If no data found, fallback to student.attendance (global)
            const calculatedAttendance = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : student.attendance;
            setClassAttendance(calculatedAttendance);

            // 2. Fetch Assignments & Calculate Avg Score
            let totalAssignments = 0;
            let completedCount = 0;
            let totalMarks = 0;
            let scoredCount = 0;

            try {
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');

                let assignments: any[] = [];
                if (selectedClassId === 'ALL') {
                    const promises = availableClassIds.map(cid => fetch(`${API_URL}/assignments?classId=${cid}`).then(r => r.ok ? r.json() : []));
                    const results = await Promise.all(promises);
                    assignments = results.flat();
                    if (!Array.isArray(assignments)) assignments = [];
                    assignments = Array.from(new Map(assignments.map(a => [a.id, a])).values());
                } else if (selectedClassId) {
                    const assignmentsRes = await fetch(`${API_URL}/assignments?classId=${selectedClassId}`);
                    if (assignmentsRes.ok) {
                        const data = await assignmentsRes.json();
                        assignments = Array.isArray(data) ? data : [];
                    }
                }
                totalAssignments = assignments.length;

                // Fetch ALL submissions (backend usually returns all for student)
                const submissionsRes = await fetch(`${API_URL}/students/${student.id}/submissions`);
                let submissions: any[] = [];
                if (submissionsRes.ok) {
                    const data = await submissionsRes.json();
                    submissions = Array.isArray(data) ? data : [];
                }

                // Filter submissions to only those matching the fetched assignments
                const relevantSubmissions = submissions.filter((s: any) => assignments.some(a => a.id === s.assignmentId));
                completedCount = relevantSubmissions.length;

                // Avg Score Calculation
                relevantSubmissions.forEach((s: any) => {
                    if (typeof s.marks === 'number') {
                        // Normalize to 100 if maxMarks known? Assuming marks is percentage or raw. 
                        // Let's assume marks are raw and we need maxMarks from assignment.
                        const assignment = assignments.find(a => a.id === s.assignmentId);
                        if (assignment && assignment.maxMarks > 0) {
                            totalMarks += (s.marks / assignment.maxMarks) * 100;
                            scoredCount++;
                        }
                    }
                });

                const calculatedAvgScore = scoredCount > 0 ? Math.round(totalMarks / scoredCount) : (totalAssignments > 0 ? 0 : student.avgScore);
                setClassAvgScore(calculatedAvgScore);

                // Calculate pending
                const activeAssignments = assignments.filter(a => new Date(a.deadline) >= new Date());
                const submittedIds = new Set((submissions || []).map((s: any) => s?.assignmentId));
                const pendingCount = activeAssignments.filter(a => !submittedIds.has(a.id)).length;
                setPendingAssignmentsCount(pendingCount);
                setCompletedAssignmentsCount(completedCount);

                // XP Calculation
                const quizHistory = JSON.parse(localStorage.getItem('GYAN_QUIZ_HISTORY') || '[]');
                const quizXP = quizHistory.reduce((total: number, quiz: any) => total + (quiz.xpEarned || 0), 0);
                const remedialsCompleted = (student.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length; // Global gaps mainly, or could filter by class too? Use global for XP.

                const calculatedXP = Math.round(
                    (calculatedAvgScore * 20) +
                    (calculatedAttendance * 5) +
                    (completedCount * 15) +
                    (remedialsCompleted * 25) +
                    quizXP
                );
                setXp(calculatedXP);

            } catch (e) {
                console.error("Failed to fetch assignment data", e);
                // Fallback
                setXp(Math.round((student.avgScore * 20) + (student.attendance * 5)));
            }
        };
        calculateStats();
    }, [selectedClassId, student.id, student.avgScore, student.attendance, student.weaknessHistory, availableClassIds]);

    const handleResolveGap = (gapId: string, remedialData?: any) => {
        if (!student || !onUpdateStudent) return;
        const updatedStudent = {
            ...student,
            weaknessHistory: (student.weaknessHistory || []).map((w: WeaknessRecord) =>
                w.id === gapId ? { ...w, status: 'RESOLVED' as const, remedialCompleted: true, remedialData: remedialData } : w
            )
        };
        onUpdateStudent(updatedStudent);
        setSelectedGap(null);
        // Also update backend if needed, usually onUpdateStudent handles it or we call api.updateStudent here? 
        // onUpdateStudent usually just updates local state. API call should be here for safety?
        // Let's assume onUpdateStudent triggers sync or parent handles it. But wait, QuizMode calls api.updateStudent explicitly.
        // Let's add api.updateStudent call here to be safe.
        api.updateStudent(updatedStudent).catch((e: Error) => console.error("Failed to save resolution:", e));
    };
    const TABS = [
        { id: 'LEARN_AI', icon: Sparkles, label: 'Learn using AI' }, // [NEW] Parent Tab
        { id: 'ASSIGNMENTS', icon: ClipboardList, label: 'Assignments' },
        { id: 'HISTORY', icon: History, label: 'History' },
        { id: 'ATTENDANCE', icon: Calendar, label: 'Attendance' },
        { id: 'ANNOUNCEMENTS', icon: Bell, label: 'Announcements' },
        { id: 'REMEDIAL', icon: Sparkles, label: 'Gap Analysis' },
        { id: 'LEADERBOARD', icon: Trophy, label: 'Rankings' },
        { id: 'OPPORTUNITIES', icon: Globe, label: 'Opportunities' },
    ];

    const AI_TABS = [
        { id: 'AI_LEARN', icon: BookOpen, label: 'AI Learn' },
        { id: 'MINDMAP', icon: Network, label: 'Mind Maps' },
        { id: 'FLASHCARDS', icon: Zap, label: 'Flashcards' },
        { id: 'STORY', icon: Feather, label: 'Story Mode' },
        { id: 'PRACTICE', icon: Target, label: 'Quizzes' },
        { id: 'ENGLISH', icon: Languages, label: 'Linguist Studio' },
    ];

    // [NEW] View Mode for Class Selection (Like Parent Dashboard)
    const [viewMode, setViewMode] = useState<'CLASS_SELECTION' | 'DASHBOARD'>(
        (propActiveTab && propActiveTab !== 'HOME' && propActiveTab !== 'DASHBOARD') || (student.classIds && student.classIds.length === 1)
            ? 'DASHBOARD'
            : 'CLASS_SELECTION'
    );

    // Auto-select if single class
    useEffect(() => {
        if (availableClassIds.length === 1 && viewMode === 'CLASS_SELECTION') {
            setSelectedClassId(availableClassIds[0]);
            setViewMode('DASHBOARD');
        }
    }, [availableClassIds]);

    const handleClassSelect = (classId: string) => {
        setSelectedClassId(classId);
        setViewMode('DASHBOARD');
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-fade-in relative transition-all min-h-screen">
            {showProfileModal && (
                <UserProfileModal
                    user={student}
                    onClose={() => setShowProfileModal(false)}
                    role="STUDENT"
                />
            )}

            {/* --- CLASS SELECTION VIEW --- */}
            {viewMode === 'CLASS_SELECTION' && (
                <div className="flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-neon-purple to-neon-blue rounded-3xl flex items-center justify-center text-4xl font-bold text-white mb-6 shadow-lg shadow-neon-purple/50">
                            {student.name.charAt(0)}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Welcome back, {student.name.split(' ')[0]}! 👋</h1>

                        {/* Gamification Badge */}
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <div className="bg-white/10 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400 font-bold uppercase text-sm tracking-wider">{getLevelTitle(student.level || 1)}</span>
                                <span className="text-gray-400 text-xs">|</span>
                                <span className="text-white font-mono text-sm">Lvl {student.level || 1}</span>
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                                <Star className="w-4 h-4 text-neon-purple" />
                                <span className="text-white font-mono text-sm">{student.xp || 0} XP</span>
                            </div>
                        </div>

                        <p className="text-xl text-gray-400 mt-6">Select a classroom to enter your dashboard</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
                        {/* Option: All Classes */}
                        {availableClassIds.length > 1 && (
                            <NeonCard
                                onClick={() => handleClassSelect('ALL')}
                                className="p-8 cursor-pointer hover:scale-105 transition-transform group flex flex-col items-center justify-center text-center gap-4 min-h-[220px] border-dashed border-white/20"
                                glowColor="cyan"
                            >
                                <div className="w-16 h-16 rounded-full bg-neon-cyan/10 flex items-center justify-center group-hover:bg-neon-cyan/20 transition-colors">
                                    <School className="w-8 h-8 text-neon-cyan" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">All Classes</h3>
                                    <p className="text-sm text-gray-400">Combined View</p>
                                </div>
                            </NeonCard>
                        )}

                        {availableClassIds.map((cid, index) => {
                            const cls = classrooms?.find(c => c.id === cid);
                            return (
                                <NeonCard
                                    key={cid}
                                    onClick={() => handleClassSelect(cid)}
                                    className="p-8 cursor-pointer hover:scale-105 transition-transform group flex flex-col items-center justify-center text-center gap-4 min-h-[220px]"
                                    glowColor={index % 2 === 0 ? "purple" : "blue"}
                                >
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${index % 2 === 0 ? 'bg-neon-purple/10 group-hover:bg-neon-purple/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'}`}>
                                        <BookOpen className={`w-8 h-8 ${index % 2 === 0 ? 'text-neon-purple' : 'text-blue-400'}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white max-w-[200px] truncate">{cls ? cls.name : `Class ${cid}`}</h3>
                                        <p className="text-sm text-gray-400">{cls ? `Section ${cls.section}` : 'Unknown Section'}</p>
                                    </div>
                                    {cls?.subject && (
                                        <div className="px-3 py-1 rounded-full bg-white/5 text-xs font-mono text-gray-300">
                                            {cls.subject}
                                        </div>
                                    )}
                                </NeonCard>
                            );
                        })}

                        {/* Join Class Card */}
                        <NeonCard
                            onClick={onJoinClassClick}
                            className="p-8 cursor-pointer hover:scale-105 transition-transform group flex flex-col items-center justify-center text-center gap-4 min-h-[220px] bg-white/5 border-white/10"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-dashed border-gray-500">
                                <Plus className="w-8 h-8 text-gray-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-300">Join New Class</h3>
                                <p className="text-sm text-gray-500">Enter a class code</p>
                            </div>
                        </NeonCard>
                    </div>
                </div>
            )}

            {/* --- DASHBOARD VIEW --- */}
            {viewMode === 'DASHBOARD' && (
                <>
                    {/* Back Button for multi-class students */}
                    {availableClassIds.length > 1 && (
                        <div className="fixed top-20 left-6 z-40 md:absolute md:top-0 md:left-0 md:relative">
                            <button
                                onClick={() => setViewMode('CLASS_SELECTION')}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-black/50 md:bg-transparent px-3 py-1 rounded-full backdrop-blur-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-sm font-bold">Switch Class</span>
                            </button>
                        </div>
                    )}

                    {/* --- SCHOOL INFO BANNER --- */}
                    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10 mb-6 relative">

                        {/* LEFT: Class Switcher */}
                        <div className="flex-1 flex justify-start">
                            {availableClassIds.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="bg-black/50 border border-white/20 text-white rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-neon-purple outline-none appearance-none pr-8 cursor-pointer"
                                    >
                                        <option value="ALL">All Joined Classes</option>
                                        {availableClassIds.map(cid => {
                                            const cls = classrooms?.find(c => c.id === cid);
                                            return <option key={cid} value={cid}>{cls ? `${cls.name} (${cls.section})` : cid}</option>;
                                        })}
                                    </select>
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <School className="w-3 h-3 text-gray-400" />
                                    </div>
                                </div>
                            )}
                            <NeonButton size="sm" variant="secondary" onClick={onJoinClassClick} className="!py-2 !px-3 font-normal text-xs ml-2 border border-white/20">
                                <Plus className="w-3 h-3 mr-1" /> Join
                            </NeonButton>
                        </div>

                        {/* CENTER: School Info */}
                        <div className="flex-1 flex justify-center text-center">
                            <div className="flex items-center gap-3">
                                {schoolProfile?.logoUrl ? (
                                    <img src={schoolProfile.logoUrl} alt={schoolName} className="w-12 h-12 rounded-lg object-cover border border-white/20" />
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-lg font-bold text-white">
                                        {schoolName?.charAt(0) || 'S'}
                                    </div>
                                )}
                                <div className="text-left">
                                    <h2 className="text-lg font-bold text-white leading-tight">{schoolName}</h2>
                                    {schoolProfile?.motto && (
                                        <p className="text-sm text-gray-400 italic">"{schoolProfile.motto}"</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Invite Code */}
                        <div className="flex-1 flex justify-end">
                            {schoolProfile?.inviteCode && (
                                <div
                                    className="flex items-center gap-2 px-3 py-2 bg-neon-purple/10 rounded-lg border border-neon-purple/30 cursor-pointer hover:bg-neon-purple/20 transition-all"
                                    onClick={() => navigator.clipboard.writeText(schoolProfile.inviteCode)}
                                    title="Click to copy invite code"
                                >
                                    <School className="w-4 h-4 text-neon-purple" />
                                    <span className="text-neon-purple font-mono text-sm">{schoolProfile.inviteCode}</span>
                                    <Copy className="w-3 h-3 text-neon-purple" />
                                </div>
                            )}
                        </div>

                    </div>

                    {/* --- HEADER --- */}
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">
                                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-blue-500 cursor-pointer hover:underline" onClick={() => setShowProfileModal(true)}>{student.name.split(' ')[0]}</span> 👋
                            </h1>
                            <div className="flex items-center gap-3">
                                <p className="text-gray-400 text-lg">Ready to level up?</p>
                                <div className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Trophy className="w-3 h-3" /> {getLevelTitle(calculateLevel(xp))}
                                </div>
                                <button
                                    onClick={() => setShowGuideModal(true)}
                                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors"
                                    title="View Student Guide"
                                >
                                    <CircleHelp className="w-4 h-4" />
                                </button>
                            </div>

                            {/* XP Progress Bar */}
                            <div className="mt-4 w-64">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                    <span>Lvl {calculateLevel(xp)}</span>
                                    <span>{getLevelProgress(xp).currentXp.toLocaleString()} / {getLevelProgress(xp).nextLevelXp.toLocaleString()} XP</span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-neon-purple to-neon-blue transition-all duration-500"
                                        style={{ width: `${getLevelProgress(xp).percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            {/* XP Badge */}
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-yellow-900/20 border border-yellow-500/30 backdrop-blur-md">
                                <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xs text-yellow-500 font-bold uppercase tracking-wider">XP Points</div>
                                    <div className="text-xl font-display font-bold text-white">{xp.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Rank Badge */}
                            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-purple-900/20 border border-neon-purple/30 backdrop-blur-md">
                                <div className="p-2 bg-neon-purple/20 rounded-lg text-neon-purple">
                                    <Star className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-xs text-neon-purple font-bold uppercase tracking-wider">Rank</div>
                                    <div className="text-xl font-display font-bold text-white">#{rank} <span className="text-sm text-gray-400 font-sans">Class</span></div>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* --- STATS ROW --- */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Attendance Card - Green */}
                        <div
                            onClick={() => handleTabChange('ATTENDANCE')}
                            className="relative overflow-hidden rounded-3xl bg-[#0f1115] border border-white/5 p-6 group hover:border-green-500/30 transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium mb-1">Attendance</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-display font-bold text-white tracking-tight">{classAttendance}%</span>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${classAttendance >= 75 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {classAttendance >= 75 ? 'Good' : 'Low'}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${classAttendance}%` }}></div>
                            </div>
                        </div>

                        {/* Assignments Card - Blue */}
                        <div
                            onClick={() => handleTabChange('ASSIGNMENTS')}
                            className="relative overflow-hidden rounded-3xl bg-[#0f1115] border border-white/5 p-6 group hover:border-blue-500/30 transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium mb-1">Assignments</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-display font-bold text-white">{pendingAssignmentsCount}</span>
                                        <span className="text-blue-400 text-sm font-bold">Pending</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Next due: Tomorrow</div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                    <BookOpen className="w-6 h-6" />
                                </div>
                            </div>
                            {/* Decoration (no progress bar for assignments usually, maybe a dots indicator) */}
                            <div className="flex gap-1">
                                <div className="h-1.5 w-8 rounded-full bg-blue-500"></div>
                                <div className="h-1.5 w-2 rounded-full bg-blue-500/30"></div>
                                <div className="h-1.5 w-2 rounded-full bg-blue-500/30"></div>
                            </div>
                        </div>

                        {/* Avg Score Card - Pink */}
                        <div className="relative overflow-hidden rounded-3xl bg-[#0f1115] border border-white/5 p-6 group hover:border-pink-500/30 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="text-gray-400 text-sm font-medium mb-1">Avg Score</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-display font-bold text-white tracking-tight">{classAvgScore}</span>
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${classAvgScore >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                            Avg
                                        </span>
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
                                    <Clock className="w-6 h-6" />
                                </div>
                            </div>
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${student.avgScore}%` }}></div>
                            </div>
                        </div>

                    </div>

                    {/* --- NAVIGATION --- */}
                    <div className="flex flex-wrap gap-4 border-b border-white/5 pb-4">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                onClick={() => {
                                    if (t.id === 'LEARN_AI' && activeTab === 'LEARN_AI') {
                                        // Optional: Reset sub-tab?
                                    }
                                    handleTabChange(t.id);
                                }}
                                className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium
                            ${activeTab === t.id
                                        ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }
                        `}
                            >
                                <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-black' : ''}`} />
                                <span>{t.label}</span>
                            </button>
                        ))}

                        {/* [NEW] Join Class Option in Menu */}
                        <button
                            onClick={onJoinClassClick}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 font-medium text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Join Class</span>
                        </button>
                    </div>

                    {/* [NEW] AI Sub-Navigation */}
                    {activeTab === 'LEARN_AI' && (
                        <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
                            {AI_TABS.filter(t => {
                                // Filter Logic: Only show 'Linguist Studio' if subject is English or 'ALL' is selected
                                if (t.id === 'ENGLISH') {
                                    if (selectedClassId === 'ALL') return true; // Show for combined view
                                    return activeClassroom?.subject?.toLowerCase().includes('english');
                                }
                                return true;
                            }).map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        if (t.id === 'AI_LEARN' && activeAiTab === 'AI_LEARN') {
                                            setLearnRefreshKey(k => k + 1);
                                        }
                                        setActiveAiTab(t.id);
                                    }}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all
                                        ${activeAiTab === t.id
                                            ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }
                                    `}
                                >
                                    <t.icon className="w-4 h-4" />
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* --- CONTENT AREA --- */}
                    <div className="min-h-[500px]">
                        {activeTab === 'LEARN_AI' && (
                            <>
                                {activeAiTab === 'AI_LEARN' && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">

                                        {/* [NEW] DASHBOARD LANDING: My Classes Grid (Only visible when 'ALL' is selected) */}
                                        {selectedClassId === 'ALL' ? (
                                            <div>
                                                <div className="flex items-center justify-between mb-6">
                                                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                                        <LayoutDashboard className="w-6 h-6 text-neon-blue" />
                                                        My Classes
                                                    </h2>
                                                </div>

                                                {/* Classes Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {/* Existing Classes */}
                                                    {activeClasses.map((cls) => (
                                                        <div
                                                            key={cls.id}
                                                            onClick={() => handleClassSelect(cls.id)}
                                                            className="relative group cursor-pointer"
                                                        >
                                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-purple to-neon-blue rounded-2xl opacity-20 group-hover:opacity-100 transition duration-500 blur-sm"></div>
                                                            <div className="relative h-full bg-[#0f1115] border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-start justify-between mb-4">
                                                                        <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                                                                            <BookOpen className="w-6 h-6" />
                                                                        </div>
                                                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-gray-400 font-mono">
                                                                            {cls.section}
                                                                        </span>
                                                                    </div>
                                                                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-neon-cyan transition-colors">
                                                                        {cls.name}
                                                                    </h3>
                                                                    <p className="text-sm text-gray-400 mb-4">{cls.subject}</p>

                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                        <Trophy className="w-3 h-3 text-yellow-500" />
                                                                        <span>Rank #{rank}</span>
                                                                        <span className="mx-1">•</span>
                                                                        <Clock className="w-3 h-3" />
                                                                        <span>90% Att.</span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                                                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                                                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-white">
                                                                            {(cls as any).teacherName?.charAt(0) || 'T'}
                                                                        </div>
                                                                        <span>{(cls as any).teacherName || 'Teacher'}</span>
                                                                    </div>
                                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-neon-blue/20 group-hover:text-neon-blue transition-all">
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Join New Class Card */}
                                                    <div
                                                        onClick={onJoinClassClick}
                                                        className="group cursor-pointer min-h-[200px] border-2 border-dashed border-white/10 rounded-2xl hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all flex flex-col items-center justify-center gap-4 text-center p-6"
                                                    >
                                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                            <Plus className="w-8 h-8 text-gray-400 group-hover:text-neon-cyan" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-bold text-white mb-1">Join New Class</h3>
                                                            <p className="text-sm text-gray-500">Enter a code to join</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Regular AI Recommendations for Specific Class */
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                                        <Sparkles className="w-6 h-6 text-neon-cyan" />
                                                        To-Do List & AI Recommendations
                                                    </h2>
                                                    <div className="px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/20 rounded-full text-xs font-bold text-neon-cyan shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                                                        Powered by Gemini 2.5
                                                    </div>
                                                </div>
                                                <AdaptiveLearning
                                                    key={learnRefreshKey}
                                                    currentUser={student}
                                                    onUpdateStudent={onUpdateStudent}
                                                    initialPlan={activeTab === 'LEARN_AI' && loadedModule?.type === 'STUDY_PLAN' ? loadedModule.content : undefined}
                                                    contextClass={selectedClassId !== 'ALL' && activeClassroom ? {
                                                        id: activeClassroom.id,
                                                        subject: activeClassroom.subject,
                                                        name: activeClassroom.name,
                                                        grade: student.grade
                                                    } : undefined}
                                                    onStartQuiz={(questions, topic) => {
                                                        const quizModule: ModuleHistoryItem = {
                                                            id: `gen-${Date.now()}`,
                                                            type: 'QUIZ',
                                                            topic: topic,
                                                            createdAt: new Date().toISOString(),
                                                            content: { questions, topic },
                                                            studentId: student.id,
                                                            classId: selectedClassId !== 'ALL' ? selectedClassId : undefined // [NEW] Attach classId
                                                        };
                                                        setLoadedModule(quizModule);
                                                        setActiveAiTab('PRACTICE');
                                                    }}
                                                />
                                            </>
                                        )}
                                    </div>
                                )}

                                {activeAiTab === 'MINDMAP' && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500 h-[600px]">
                                        <MindMapGenerator
                                            studentId={student.id}
                                            contextClass={selectedClassId !== 'ALL' && activeClassroom ? {
                                                id: activeClassroom.id,
                                                subject: activeClassroom.subject,
                                                grade: parseClassDetails(activeClassroom.name).grade
                                            } : undefined}
                                        />
                                    </div>
                                )}

                                {activeAiTab === 'STORY' && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                                <Feather className="w-6 h-6 text-neon-purple" />
                                                Story Mode Learning
                                            </h2>
                                            <ModelSelector compact />
                                        </div>
                                        <StoryMode
                                            studentId={student.id}
                                            initialStory={activeTab === 'LEARN_AI' && loadedModule?.type === 'STORY' ? loadedModule.content : undefined}
                                            contextClass={selectedClassId !== 'ALL' && activeClassroom ? {
                                                id: activeClassroom.id,
                                                subject: activeClassroom.subject,
                                                grade: parseClassDetails(activeClassroom.name).grade
                                            } : undefined}
                                        />
                                    </div>
                                )}

                                {activeAiTab === 'FLASHCARDS' && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                        <FlashcardGenerator
                                            studentId={student.id}
                                            initialFlashcards={activeTab === 'LEARN_AI' && loadedModule?.type === 'FLASHCARDS' ? loadedModule.content : undefined}
                                            contextClass={selectedClassId !== 'ALL' && activeClassroom ? {
                                                id: activeClassroom.id,
                                                subject: activeClassroom.subject,
                                                grade: parseClassDetails(activeClassroom.name).grade
                                            } : undefined}
                                        />
                                    </div>
                                )}

                                {activeAiTab === 'ENGLISH' && (
                                    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                                        <EnglishLearningLab currentUser={student} onUpdateStudent={onUpdateStudent} />
                                    </div>
                                )}

                                {activeAiTab === 'PRACTICE' && (
                                    <QuizMode
                                        studentId={student.id}
                                        initialQuiz={activeTab === 'LEARN_AI' && loadedModule?.type === 'QUIZ' ? loadedModule.content.questions : undefined}
                                        initialTopic={activeTab === 'LEARN_AI' && loadedModule?.type === 'QUIZ' ? loadedModule.content.topic : undefined}
                                        contextClass={selectedClassId !== 'ALL' && activeClassroom ? {
                                            id: activeClassroom.id,
                                            subject: activeClassroom.subject,
                                            grade: parseClassDetails(activeClassroom.name).grade
                                        } : undefined}
                                        currentUser={student}
                                        onUpdateStudent={onUpdateStudent}
                                    />
                                )}
                            </>
                        )}
                        {activeTab === 'ASSIGNMENTS' && <StudentAssignments student={student} selectedClassId={selectedClassId} onUpdateStudent={onUpdateStudent} />}
                        {activeTab === 'ATTENDANCE' && <AttendanceView student={student} classId={selectedClassId} />}

                        {activeTab === 'ANNOUNCEMENTS' && (
                            <div className="space-y-6 animate-in fade-in">
                                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                                    <Bell className="w-6 h-6 text-neon-purple" />
                                    Announcements
                                </h2>
                                <div className="space-y-4">
                                    {(() => {
                                        // Filter announcements: school-wide OR matching CURRENTLY SELECTED class
                                        const relevantAnnouncements = (announcements || []).filter(a =>
                                            !a.classId || (selectedClassId === 'ALL' ? availableClassIds.includes(a.classId) : a.classId === selectedClassId)
                                        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                                        if (relevantAnnouncements.length === 0) {
                                            return (
                                                <div className="text-center py-12 text-gray-500">
                                                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                    <p>No announcements yet</p>
                                                </div>
                                            );
                                        }

                                        return relevantAnnouncements.map(a => (
                                            <NeonCard key={a.id} className="p-4 hover:bg-white/5 transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple font-bold">
                                                            {a.authorName?.charAt(0) || 'A'}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold">{a.authorName}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-xs px-2 py-0.5 rounded ${a.classId ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                    {a.classId ? `📚 ${a.className || (activeClassroom?.name || 'Your Class')}` : '📢 School-wide'}
                                                                </span>
                                                                <span className={`text-xs px-2 py-0.5 rounded ${a.type === 'NOTICE' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                    {a.type === 'NOTICE' ? '📋 Notice' : '💭 Thought'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-gray-500">{new Date(a.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-gray-300 pl-13">{a.content}</p>
                                            </NeonCard>
                                        ));
                                    })()}
                                </div>

                                {/* Teacher Suggestions Section */}
                                {suggestions.length > 0 && (
                                    <div className="mt-8">
                                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-neon-cyan" />
                                            Suggestions from Teachers
                                        </h3>
                                        <div className="space-y-3">
                                            {suggestions.map(s => (
                                                <NeonCard key={s.id} glowColor="cyan" className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
                                                                {s.fromTeacherName?.charAt(0) || 'T'}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold">{s.fromTeacherName}</p>
                                                                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">💡 Suggestion</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-gray-300 mt-3 pl-13">{s.content}</p>
                                                </NeonCard>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'REMEDIAL' && (
                            <div className="space-y-6">
                                {/* Active / Archived Tab Switcher */}
                                <div className="flex bg-black/30 p-1 rounded-xl border border-white/10 w-fit">
                                    <button
                                        onClick={() => {
                                            setRemedialTab('ACTIVE');
                                            setActiveSource(null);
                                            setActiveFolder(null);
                                        }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${remedialTab === 'ACTIVE' ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        <AlertTriangle className="w-4 h-4" /> Active Gaps
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-xs">
                                            {(student.weaknessHistory || []).filter(w => {
                                                if (w.status !== 'OPEN') return false;
                                                if (!selectedClassId || selectedClassId === 'ALL') return true;
                                                if (w.classId === selectedClassId) return true;
                                                if (activeClassroom?.subject && w.subject?.toLowerCase() === activeClassroom.subject.toLowerCase()) return true;
                                                return false;
                                            }).length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setRemedialTab('ARCHIVED');
                                            setActiveSource(null);
                                            setActiveFolder(null);
                                        }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${remedialTab === 'ARCHIVED' ? 'bg-green-500/20 text-green-400' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Archived / Resolved
                                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-xs">
                                            {(student.weaknessHistory || []).filter(w => {
                                                if (w.status !== 'RESOLVED') return false;
                                                if (!selectedClassId || selectedClassId === 'ALL') return true;
                                                // Strict Class Filtering
                                                if (w.classId) return w.classId === selectedClassId;
                                                // Legacy Fallback: If no classId, match subject
                                                if (activeClassroom?.subject && w.subject?.toLowerCase() === activeClassroom.subject.toLowerCase()) return true;
                                                return false;
                                            }).length}
                                        </span>
                                    </button>

                                    <div className="flex-1"></div>

                                    {remedialTab === 'ACTIVE' && (
                                        <button
                                            onClick={() => {
                                                if (confirm("Are you sure you want to clear all active learning gaps? This helps clean up old or incorrect data.")) {
                                                    const updatedStudent = {
                                                        ...student,
                                                        weaknessHistory: (student.weaknessHistory || []).filter(w => w.status === 'RESOLVED')
                                                    };
                                                    if (onUpdateStudent) onUpdateStudent(updatedStudent);
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-all"
                                            title="Clear all active gaps"
                                        >
                                            <Trash2 className="w-3 h-3" /> Clear Active
                                        </button>
                                    )}
                                </div>

                                {/* ACTIVE GAPS */}
                                {remedialTab === 'ACTIVE' && (() => {
                                    const openGaps = (student.weaknessHistory || []).filter(w => {
                                        if (w.status !== 'OPEN') return false;
                                        // [FIX] Hide bad/hallucinated gaps
                                        if (w.topic.includes('Quiz Performance') || w.subTopic?.includes('Quiz Performance')) return false;

                                        if (!selectedClassId || selectedClassId === 'ALL') return true;

                                        // Strict Class Filtering
                                        if (w.classId) return w.classId === selectedClassId;
                                        // Legacy Fallback: If no classId, match subject
                                        if (activeClassroom?.subject && w.subject && w.subject.toLowerCase() === activeClassroom.subject.toLowerCase()) return true;

                                        return false;
                                    });

                                    // [MODIFIED] Always show cards even if 0 gaps


                                    // Group by Source
                                    const aiGaps = openGaps.filter(g => g.source === 'AI_LEARNING' || !g.source);
                                    const assignmentGaps = openGaps.filter(g => g.source === 'ASSIGNMENT');
                                    const practiceGaps = openGaps.filter(g => g.source === 'PRACTICE');

                                    // Helper to group by Topic (Folder)
                                    const getFolders = (gaps: WeaknessRecord[]) => {
                                        const folders: Record<string, WeaknessRecord[]> = {};
                                        gaps.forEach(g => {
                                            const key = g.topic || 'General';
                                            if (!folders[key]) folders[key] = [];
                                            folders[key].push(g);
                                        });
                                        return folders;
                                    };

                                    // LEVEL 3: GAP VIEW (Inside a Folder)
                                    if (activeFolder) {
                                        const relevantGaps = openGaps.filter(g =>
                                            (g.source === activeFolder.source || (!g.source && activeFolder.source === 'AI_LEARNING')) &&
                                            (g.topic === activeFolder.name)
                                        );

                                        return (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <button
                                                    onClick={() => setActiveFolder(null)}
                                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" /> Back to Folders
                                                </button>

                                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                                    <span className="opacity-50">Folder:</span> {activeFolder.name}
                                                    <span className="text-sm bg-white/10 px-3 py-1 rounded-full text-gray-300">{relevantGaps.length} Gaps</span>
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {relevantGaps.map(gap => (
                                                        <NeonCard key={gap.id} glowColor="red" className="border-red-500/30">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <h3 className="font-bold text-white">{gap.topic}</h3>
                                                            </div>
                                                            {gap.subTopic && <p className="text-sm text-gray-400 mb-3">Focus: <span className="text-white">{gap.subTopic}</span></p>}
                                                            <div className="text-xs text-gray-500 mb-3">Score: <span className="text-red-400 font-bold">{Math.round(gap.score || 0)}%</span></div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs text-gray-500">{new Date(gap.detectedAt).toLocaleDateString()}</span>
                                                                <NeonButton size="sm" variant="secondary" onClick={() => setSelectedResolvedGap(gap)}>
                                                                    View Details <ArrowRight className="w-3 h-3 ml-1" />
                                                                </NeonButton>
                                                            </div>
                                                        </NeonCard>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // LEVEL 2: FOLDER VIEW (Inside a Source)
                                    if (activeSource) {
                                        let currentFolders = {};
                                        let title = "";
                                        let icon = null;
                                        let colorClass = "";

                                        if (activeSource === 'AI_LEARNING') {
                                            currentFolders = getFolders(aiGaps);
                                            title = "AI Learn Folders";
                                            icon = <Sparkles className="w-5 h-5" />;
                                            colorClass = "text-neon-cyan";
                                        } else if (activeSource === 'ASSIGNMENT') {
                                            currentFolders = getFolders(assignmentGaps);
                                            title = "Assignment Folders";
                                            icon = <BookOpen className="w-5 h-5" />;
                                            colorClass = "text-neon-purple";
                                        } else {
                                            currentFolders = getFolders(practiceGaps);
                                            title = "Practice Folders";
                                            icon = <Target className="w-5 h-5" />;
                                            colorClass = "text-green-400";
                                        }

                                        const folderNames = Object.keys(currentFolders);

                                        return (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <button
                                                    onClick={() => setActiveSource(null)}
                                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" /> Back to Sources
                                                </button>

                                                <h3 className={`font-bold uppercase tracking-widest text-lg mb-6 flex items-center gap-3 ${colorClass}`}>
                                                    {icon} {title}
                                                </h3>

                                                {folderNames.length === 0 ? (
                                                    <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                                        <p>No gaps found in this category.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                        {folderNames.map((folderName, index) => (
                                                            <NeonCard
                                                                key={folderName}
                                                                onClick={() => setActiveFolder({ source: activeSource, name: folderName })}
                                                                glowColor={activeSource === 'AI_LEARNING' ? (index % 2 === 0 ? "cyan" : "blue") : (activeSource === 'ASSIGNMENT' ? "purple" : "green")}
                                                                className="relative overflow-hidden group p-6 cursor-pointer hover:scale-105 transition-all duration-300 border-white/10 bg-white/5 min-h-[180px] flex flex-col justify-between"
                                                            >
                                                                {/* Decorative Background Glow */}
                                                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:from-white/10 transition-all duration-500`} />

                                                                <div className="relative z-10">
                                                                    {/* Animated Icon Container */}
                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 mb-4
                                                                        ${activeSource === 'AI_LEARNING' ? 'bg-cyan-500/20 text-cyan-400 shadow-cyan-500/20' :
                                                                            activeSource === 'ASSIGNMENT' ? 'bg-purple-500/20 text-neon-purple shadow-purple-500/20' :
                                                                                'bg-green-500/20 text-green-400 shadow-green-500/20'}`}>
                                                                        {activeSource === 'AI_LEARNING' ? <Sparkles className="w-7 h-7" /> :
                                                                            activeSource === 'ASSIGNMENT' ? <BookOpen className="w-7 h-7" /> :
                                                                                <Target className="w-7 h-7" />}
                                                                    </div>

                                                                    <h4 className="font-bold text-white text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all line-clamp-2">
                                                                        {folderName}
                                                                    </h4>
                                                                </div>

                                                                <div className="relative z-10 flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider group-hover:text-white/70 transition-colors">
                                                                        {String((currentFolders as any)[folderName].length).padStart(2, '0')} Gaps
                                                                    </span>
                                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                                                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                                    </div>
                                                                </div>
                                                            </NeonCard>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // LEVEL 1: SOURCE SELECTION (Root View)
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                                            {/* AI Learn Button */}
                                            <button
                                                onClick={() => setActiveSource('AI_LEARNING')}
                                                className="group relative overflow-hidden bg-gradient-to-br from-black to-blue-900/40 border border-neon-cyan/30 rounded-2xl p-8 text-left hover:border-neon-cyan hover:shadow-[0_0_20px_rgba(0,255,255,0.2)] transition-all duration-300"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Sparkles className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="bg-neon-cyan/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-neon-cyan">
                                                        <Sparkles className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">AI Learn Gaps</h3>
                                                    <p className="text-gray-400 text-sm mb-4">Gaps identified from your AI study sessions.</p>
                                                    <div className="flex items-center gap-2 text-neon-cyan text-sm font-bold">
                                                        <span>{aiGaps.length} Gaps Found</span>
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Assignment Button */}
                                            <button
                                                onClick={() => setActiveSource('ASSIGNMENT')}
                                                className="group relative overflow-hidden bg-gradient-to-br from-black to-purple-900/40 border border-neon-purple/30 rounded-2xl p-8 text-left hover:border-neon-purple hover:shadow-[0_0_20px_rgba(180,0,255,0.2)] transition-all duration-300"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <BookOpen className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="bg-neon-purple/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-neon-purple">
                                                        <BookOpen className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">Assignment Gaps</h3>
                                                    <p className="text-gray-400 text-sm mb-4">Areas to improve from your assignments.</p>
                                                    <div className="flex items-center gap-2 text-neon-purple text-sm font-bold">
                                                        <span>{assignmentGaps.length} Gaps Found</span>
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Practice Button */}
                                            <button
                                                onClick={() => setActiveSource('PRACTICE')}
                                                className="group relative overflow-hidden bg-gradient-to-br from-black to-green-900/40 border border-green-500/30 rounded-2xl p-8 text-left hover:border-green-500 hover:shadow-[0_0_20px_rgba(74,222,128,0.2)] transition-all duration-300"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                    <Target className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="bg-green-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-green-400">
                                                        <Target className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">Practice Gaps</h3>
                                                    <p className="text-gray-400 text-sm mb-4">Weaknesses found in your practice quizzes.</p>
                                                    <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                                                        <span>{practiceGaps.length} Gaps Found</span>
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })()}

                                {/* ARCHIVED / RESOLVED GAPS */}
                                {remedialTab === 'ARCHIVED' && (() => {
                                    const resolvedGaps = (student.weaknessHistory || []).filter(w => {
                                        if (w.status !== 'RESOLVED') return false;
                                        if (!selectedClassId || selectedClassId === 'ALL') return true;
                                        if (w.classId === selectedClassId) return true;
                                        if (activeClassroom?.subject && w.subject && w.subject.toLowerCase() === activeClassroom.subject.toLowerCase()) return true;
                                        return false;
                                    });

                                    if (resolvedGaps.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-gray-500">
                                                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                                <p className="text-lg">No resolved gaps yet</p>
                                                <p className="text-sm text-gray-600 mt-2">Gaps you resolve will appear here</p>
                                            </div>
                                        );
                                    }

                                    // Group by Source
                                    const aiGaps = resolvedGaps.filter(g => g.source === 'AI_LEARNING' || !g.source);
                                    const assignmentGaps = resolvedGaps.filter(g => g.source === 'ASSIGNMENT');
                                    const practiceGaps = resolvedGaps.filter(g => g.source === 'PRACTICE');

                                    // Helper to group by Topic (Folder)
                                    const getFolders = (gaps: WeaknessRecord[]) => {
                                        const folders: Record<string, WeaknessRecord[]> = {};
                                        gaps.forEach(g => {
                                            const key = g.topic || 'General';
                                            if (!folders[key]) folders[key] = [];
                                            folders[key].push(g);
                                        });
                                        return folders;
                                    };

                                    // LEVEL 3: GAP VIEW (Inside a Folder)
                                    if (activeFolder) {
                                        const relevantGaps = resolvedGaps.filter(g =>
                                            (g.source === activeFolder.source || (!g.source && activeFolder.source === 'AI_LEARNING')) &&
                                            (g.topic === activeFolder.name)
                                        );

                                        return (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <button
                                                    onClick={() => setActiveFolder(null)}
                                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" /> Back to Folders
                                                </button>

                                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                                    <span className="opacity-50">Folder:</span> {activeFolder.name}
                                                    <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full">{relevantGaps.length} Resolved</span>
                                                </h3>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {relevantGaps.map(gap => (
                                                        <NeonCard key={gap.id} glowColor="green" className="border-green-500/30 opacity-80">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <h3 className="font-bold text-white">{gap.topic}</h3>
                                                                <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold">✓ RESOLVED</span>
                                                            </div>
                                                            {gap.subTopic && <p className="text-sm text-gray-400 mb-3">Focus: <span className="text-white">{gap.subTopic}</span></p>}
                                                            <div className="flex gap-4 text-xs text-gray-500 mb-2">
                                                                <span>Initial: <span className="text-red-400">{Math.round(gap.score)}%</span></span>
                                                                {gap.remedialScore && <span>Final: <span className="text-green-400">{Math.round(gap.remedialScore)}%</span></span>}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{new Date(gap.detectedAt).toLocaleDateString()}</div>
                                                        </NeonCard>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // LEVEL 2: FOLDER VIEW (Inside a Source)
                                    if (activeSource) {
                                        let currentFolders = {};
                                        let title = "";
                                        let icon = null;
                                        let colorClass = "";

                                        if (activeSource === 'AI_LEARNING') {
                                            currentFolders = getFolders(aiGaps);
                                            title = "AI Learn Folders (Resolved)";
                                            icon = <Sparkles className="w-5 h-5" />;
                                            colorClass = "text-neon-cyan";
                                        } else if (activeSource === 'ASSIGNMENT') {
                                            currentFolders = getFolders(assignmentGaps);
                                            title = "Assignment Folders (Resolved)";
                                            icon = <BookOpen className="w-5 h-5" />;
                                            colorClass = "text-neon-purple";
                                        } else {
                                            currentFolders = getFolders(practiceGaps);
                                            title = "Practice Folders (Resolved)";
                                            icon = <Target className="w-5 h-5" />;
                                            colorClass = "text-green-400";
                                        }

                                        const folderNames = Object.keys(currentFolders);

                                        return (
                                            <div className="animate-in fade-in slide-in-from-right-4">
                                                <button
                                                    onClick={() => setActiveSource(null)}
                                                    className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <ChevronLeft className="w-5 h-5" /> Back to Sources
                                                </button>

                                                <h3 className={`font-bold uppercase tracking-widest text-lg mb-6 flex items-center gap-3 ${colorClass}`}>
                                                    {icon} {title}
                                                </h3>

                                                {folderNames.length === 0 ? (
                                                    <div className="text-center py-12 text-gray-500 border border-dashed border-white/10 rounded-xl">
                                                        <p>No resolved gaps in this category.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                        {folderNames.map((folderName, index) => (
                                                            <NeonCard
                                                                key={folderName}
                                                                onClick={() => setActiveFolder({ source: activeSource, name: folderName })}
                                                                glowColor={activeSource === 'AI_LEARNING' ? (index % 2 === 0 ? "cyan" : "blue") : (activeSource === 'ASSIGNMENT' ? "purple" : "green")}
                                                                className="relative overflow-hidden group p-6 cursor-pointer hover:scale-105 transition-all duration-300 border-white/10 bg-white/5 min-h-[180px] flex flex-col justify-between"
                                                            >
                                                                {/* Decorative Background Glow */}
                                                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 group-hover:from-white/10 transition-all duration-500`} />

                                                                <div className="relative z-10">
                                                                    {/* Animated Icon Container */}
                                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 mb-4
                                                                        ${activeSource === 'AI_LEARNING' ? 'bg-cyan-500/20 text-cyan-400 shadow-cyan-500/20' :
                                                                            activeSource === 'ASSIGNMENT' ? 'bg-purple-500/20 text-neon-purple shadow-purple-500/20' :
                                                                                'bg-green-500/20 text-green-400 shadow-green-500/20'}`}>

                                                                        <div className="relative">
                                                                            {activeSource === 'AI_LEARNING' ? <Sparkles className="w-7 h-7" /> :
                                                                                activeSource === 'ASSIGNMENT' ? <BookOpen className="w-7 h-7" /> :
                                                                                    <Target className="w-7 h-7" />}

                                                                            <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-0.5 border-2 border-[#0f1115]">
                                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <h4 className="font-bold text-white text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all line-clamp-2">
                                                                        {folderName}
                                                                    </h4>
                                                                </div>

                                                                <div className="relative z-10 flex items-center justify-between mt-4 border-t border-white/5 pt-3">
                                                                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded">
                                                                        {String((currentFolders as any)[folderName].length).padStart(2, '0')} Resolved
                                                                    </span>
                                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-all">
                                                                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                                    </div>
                                                                </div>
                                                            </NeonCard>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }

                                    // LEVEL 1: SOURCE SELECTION (Root View)
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
                                            {/* AI Learn Button (Resolved) */}
                                            <button
                                                onClick={() => setActiveSource('AI_LEARNING')}
                                                className="group relative overflow-hidden bg-gradient-to-br from-black to-blue-900/20 border border-neon-cyan/20 rounded-2xl p-8 text-left hover:border-neon-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)] transition-all duration-300"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Sparkles className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-neon-cyan/10 w-12 h-12 rounded-xl flex items-center justify-center text-neon-cyan">
                                                            <Sparkles className="w-6 h-6" />
                                                        </div>
                                                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-bold">RESOLVED</span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">AI Learn Gaps</h3>
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm font-bold mt-4 group-hover:text-white transition-colors">
                                                        <span>{aiGaps.length} Archived</span>
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Assignment Button (Resolved) */}
                                            <button
                                                onClick={() => setActiveSource('ASSIGNMENT')}
                                                className="group relative overflow-hidden bg-gradient-to-br from-black to-purple-900/20 border border-neon-purple/20 rounded-2xl p-8 text-left hover:border-neon-purple/50 hover:shadow-[0_0_20px_rgba(180,0,255,0.1)] transition-all duration-300"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <BookOpen className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-neon-purple/10 w-12 h-12 rounded-xl flex items-center justify-center text-neon-purple">
                                                            <BookOpen className="w-6 h-6" />
                                                        </div>
                                                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-bold">RESOLVED</span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">Assignment Gaps</h3>
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm font-bold mt-4 group-hover:text-white transition-colors">
                                                        <span>{assignmentGaps.length} Archived</span>
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>

                                            {/* Practice Button (Resolved) */}
                                            <button
                                                onClick={() => setActiveSource('PRACTICE')}
                                                className="group relative overflow-hidden bg-gradient-to-br from-black to-green-900/20 border border-green-500/20 rounded-2xl p-8 text-left hover:border-green-500/50 hover:shadow-[0_0_20px_rgba(74,222,128,0.1)] transition-all duration-300"
                                            >
                                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                    <Target className="w-24 h-24" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="bg-green-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-green-400">
                                                            <Target className="w-6 h-6" />
                                                        </div>
                                                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-bold">RESOLVED</span>
                                                    </div>
                                                    <h3 className="text-2xl font-bold text-white mb-2">Practice Gaps</h3>
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm font-bold mt-4 group-hover:text-white transition-colors">
                                                        <span>{practiceGaps.length} Archived</span>
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                        {activeTab === 'LEADERBOARD' && <Leaderboard students={classStudents} />}
                        {activeTab === 'OPPORTUNITIES' && <OpportunitiesView currentUser={student} />}
                    </div>

                    {showGuideModal && <GuideModal onClose={() => setShowGuideModal(false)} />}

                    {activeTab === 'HISTORY' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <ModuleHistory
                                studentId={student.id}
                                onLoad={handleLoadModule}
                                contextClass={selectedClassId !== 'ALL' && activeClassroom ? { id: activeClassroom.id, subject: activeClassroom.subject } : undefined}
                            />
                        </div>
                    )}

                    {/* Resolved Details Modal */}
                    {selectedResolvedGap && (
                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedResolvedGap(null)}>
                            <NeonCard className="max-w-2xl w-full max-h-[80vh] overflow-y-auto" glowColor="green" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                            <CheckCircle2 className="text-green-400" /> Resolved Gap
                                        </h2>
                                        <p className="text-gray-400 text-sm mt-1">{selectedResolvedGap.topic} &gt; {selectedResolvedGap.subTopic || 'General'}</p>
                                    </div>
                                    <button onClick={() => setSelectedResolvedGap(null)}><X className="text-gray-400 hover:text-white" /></button>
                                </div>

                                <div className="space-y-6">
                                    {/* Explanation */}
                                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                                        <h3 className="text-lg font-bold text-neon-cyan mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Concept Learned</h3>
                                        {selectedResolvedGap.remedialData ? (
                                            <p className="text-gray-200 leading-relaxed text-sm">{selectedResolvedGap.remedialData.explanation}</p>
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">Detailed explanation was not archived for this gap.</p>
                                        )}
                                    </div>

                                    {/* Quiz Review */}
                                    <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                                        <h3 className="text-lg font-bold text-neon-purple mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Quiz Review</h3>
                                        {selectedResolvedGap.remedialData && selectedResolvedGap.remedialData.questions ? (
                                            <div className="space-y-4">
                                                {selectedResolvedGap.remedialData.questions.map((q: any, i: number) => (
                                                    <div key={i} className="border-b border-white/5 pb-3 last:border-0">
                                                        <p className="text-white text-sm font-medium mb-2">{i + 1}. {q.question}</p>
                                                        <div className="grid grid-cols-1 gap-1 pl-4">
                                                            {q.options.map((opt: string, optIdx: number) => {
                                                                const isCorrect = optIdx === q.correctAnswer;
                                                                // Handle legacy data or potential undefined
                                                                const userAns = selectedResolvedGap.remedialData?.userAnswers ? selectedResolvedGap.remedialData.userAnswers[i] : -1;
                                                                const isUserAns = userAns === optIdx;
                                                                let color = "text-gray-500";
                                                                if (isCorrect) color = "text-green-400 font-bold";
                                                                if (isUserAns && !isCorrect) color = "text-red-400 line-through";

                                                                return (
                                                                    <div key={optIdx} className={`text-xs ${color} flex items-center gap-2`}>
                                                                        {isCorrect && <CheckCircle2 className="w-3 h-3" />}
                                                                        {isUserAns && !isCorrect && <XCircle className="w-3 h-3" />}
                                                                        {opt}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic text-sm">Quiz data was not archived for this gap.</p>
                                        )}
                                    </div>
                                </div>
                            </NeonCard>
                        </div>
                    )}

                </>
            )
            }
        </div >
    );
};
