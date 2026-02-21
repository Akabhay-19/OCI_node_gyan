import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { api } from '../services/api';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { Student, Assignment, Classroom, Announcement, SchoolProfile, AssignmentType, AiAssignmentResponse, Teacher, UserRole } from '../types';

// Lazy load feature components
const AssignmentDetailsModal = lazy(() => import('./Features/AssignmentDetailsModal').then(m => ({ default: m.AssignmentDetailsModal })));
const TeacherAttendance = lazy(() => import('./Features/TeacherAttendance').then(m => ({ default: m.TeacherAttendance })));
const UserProfileModal = lazy(() => import('./UserProfileModal').then(m => ({ default: m.UserProfileModal })));
const AssignClassesModal = lazy(() => import('./AssignClassesModal').then(m => ({ default: m.AssignClassesModal })));
const ClassDetailView = lazy(() => import('./ClassDetailView').then(m => ({ default: m.ClassDetailView })));
const LeaderboardView = lazy(() => import('./LeaderboardView').then(m => ({ default: m.LeaderboardView })));
const TeacherRemedialView = lazy(() => import('./Features/TeacherRemedialView').then(m => ({ default: m.TeacherRemedialView })));
const TeacherContentHub = lazy(() => import('./Features/TeacherContentHub').then(m => ({ default: m.TeacherContentHub })));

const DashboardFallback = () => (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 animate-pulse">
        <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-medium">Loading Dashboard...</p>
    </div>
);
import { Users, BarChart2, Plus, UserSearch, LogOut, FileText, CalendarClock, Hourglass, Megaphone, Copy, Grid, Filter, Briefcase, Clock, UserCheck, Sparkles, Timer, Layers, CheckCircle, AlertTriangle, MoreVertical, Trash2, Target, BookOpen, ArrowLeft, ArrowRight, Upload, PieChart as PieChartIcon } from 'lucide-react';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface TeacherDashboardProps {
    schoolName: string;
    schoolProfile?: SchoolProfile;
    students: Student[];
    classrooms: Classroom[];
    announcements: Announcement[];
    setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
    onLogout: () => void;
    userRole?: UserRole;
    currentUser?: any;
    onCreateClass?: (data: { name: string, section: string, motto: string, subjects?: string }) => void;
    onPostAnnouncement?: (content: string, type: 'THOUGHT' | 'NOTICE', classId?: string, className?: string) => void;
    getDisplayName?: (student: Student) => string;
    onDeleteClass?: (classId: string) => void;
    onRenameClass?: (classId: string, newSectionName: string) => void;
    onKickStudent?: (studentId: string, classId: string) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

const PIE_COLORS = ['#22c55e', '#ef4444'];

const AdminClassesTab: React.FC<{
    classrooms: Classroom[];
    students: Student[];
    onCreateClass?: (data: { name: string, section: string, motto: string, subjects?: string }) => void;
    getDisplayName?: (student: Student) => string;
    onDeleteClass?: (classId: string) => void;
    onRenameClass?: (classId: string, newSectionName: string) => void;
}> = ({ classrooms, students, onCreateClass, getDisplayName, onDeleteClass, onRenameClass }) => {
    const [view, setView] = useState<'GRADES' | 'SUBJECTS' | 'SECTIONS' | 'STUDENTS'>('GRADES');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [newSectionName, setNewSectionName] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [renamingClassId, setRenamingClassId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);

    const handleGradeClick = (grade: string) => {
        setSelectedGrade(grade);
        setView('SUBJECTS');
    };

    const handleSubjectClick = (subject: string) => {
        setSelectedSubject(subject);
        setView('SECTIONS');
    };

    const handleClassClick = (classId: string) => {
        setSelectedClassId(classId);
        setView('STUDENTS');
    };

    const handleAddSubject = () => {
        if (!newSubjectName || !onCreateClass) return;
        // User requested: "create subjects... create a section A for all the subjects"
        onCreateClass({
            name: selectedGrade,
            section: 'A', // Default Section A
            motto: 'Excellence',
            subjects: newSubjectName
        });
        setNewSubjectName('');
        setIsAddingSubject(false);
    };

    const handleAddSection = () => {
        if (!newSectionName || !onCreateClass) return;
        onCreateClass({
            name: selectedGrade,
            section: newSectionName,
            motto: 'Excellence',
            subjects: selectedSubject // Bind to current subject
        });
        setNewSectionName('');
        setIsAddingSection(false);
    };

    // Helper to get classes for a grade
    const getClassesForGrade = (grade: string) => {
        if (grade.includes('KG')) return classrooms.filter(c => c.name.includes(grade));
        return classrooms.filter(c => {
            // Supports "Grade 10" and "Grade 10 - Maths"
            // Split by '-' to ignore Subject part for Grade grouping
            const baseName = c.name.split('-')[0].trim();
            return baseName === grade;
        });
    };

    // Filter classes by Grade AND Subject for Sections View
    const getClassesForSubject = (grade: string, subject: string) => {
        return classrooms.filter(c => {
            const parts = c.name.split('-');
            const cGrade = parts[0]?.trim();
            const cSubject = c.subject || parts[1]?.trim() || 'General';
            return cGrade === grade && cSubject === subject;
        });
    };


    // Get unique subjects for the selected grade
    const getSubjectsForGrade = (grade: string) => {
        const gradeClasses = getClassesForGrade(grade);
        const subjects = new Set<string>();
        gradeClasses.forEach(c => {
            // Use explicit subject if available, otherwise parse from name or default to General
            const sub = c.subject || (c.name.includes('-') ? c.name.split('-')[1].trim() : 'General');
            subjects.add(sub);
        });
        return Array.from(subjects).sort();
    };

    const currentClasses = useMemo(() => getClassesForSubject(selectedGrade, selectedSubject), [selectedGrade, selectedSubject, classrooms]);
    const currentSubjects = useMemo(() => getSubjectsForGrade(selectedGrade), [selectedGrade, classrooms]);
    const currentClass = classrooms.find(c => c.id === selectedClassId);
    const currentStudents = students.filter(s => s.classId === selectedClassId);

    // Render Grade Card
    const GradeCard = ({ grade, color }: { grade: string, color: string }) => {
        const count = getClassesForGrade(grade).length;
        return (
            <NeonCard
                glowColor={color as any}
                className="cursor-pointer hover:scale-105 transition-transform min-h-[150px] flex flex-col justify-center items-center"
                onClick={() => handleGradeClick(grade)}
            >
                <h4 className="text-2xl font-bold text-white mb-2">{grade}</h4>
                <p className="text-gray-400">{getSubjectsForGrade(grade).length} Subjects</p>
                <p className="text-xs text-gray-500">{count} Total Sections</p>
            </NeonCard>
        );
    };

    if (view === 'GRADES') {
        return (
            <div className="space-y-8 animate-fade-in">
                {/* Pre-Primary */}
                <div>
                    <h3 className="text-xl font-bold text-neon-cyan mb-4 border-b border-white/10 pb-2">Pre-Primary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <GradeCard grade="KG1" color="purple" />
                        <GradeCard grade="KG2" color="purple" />
                    </div>
                </div>
                {/* Primary */}
                <div>
                    <h3 className="text-xl font-bold text-neon-green mb-4 border-b border-white/10 pb-2">Primary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="green" />)}
                    </div>
                </div>
                {/* Middle */}
                <div>
                    <h3 className="text-xl font-bold text-neon-yellow mb-4 border-b border-white/10 pb-2">Middle</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[6, 7, 8].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="yellow" />)}
                    </div>
                </div>
                {/* Secondary */}
                <div>
                    <h3 className="text-xl font-bold text-neon-pink mb-4 border-b border-white/10 pb-2">Secondary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                        {[9, 10].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="pink" />)}
                    </div>
                </div>
                {/* Senior Secondary */}
                <div>
                    <h3 className="text-xl font-bold text-neon-blue mb-4 border-b border-white/10 pb-2">Senior Secondary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Special handling for 11/12 streams if needed, but for now grouping by Grade */}
                        {[11, 12].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="blue" />)}
                    </div>
                </div>
            </div>
        );
    }


    const handleStartRename = (classId: string, currentSection: string) => {
        setRenamingClassId(classId);
        setRenameValue(currentSection);
        setActiveMenuId(null);
    };

    const handleSaveRename = () => {
        if (renamingClassId && renameValue && onRenameClass) {
            onRenameClass(renamingClassId, renameValue);
            setRenamingClassId(null);
            setRenameValue('');
        }
    };

    if (view === 'SUBJECTS') {
        const RECOMMENDED_SUBJECTS = ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science', 'EVS', 'Arts', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Accountancy', 'Business Studies'];

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-4 mb-6">
                    <NeonButton variant="secondary" onClick={() => setView('GRADES')} size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Grades
                    </NeonButton>
                    <h2 className="text-3xl font-bold text-white">{selectedGrade} <span className="text-gray-500 text-lg">/ Subjects</span></h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Add Subject Card */}
                    <NeonCard className="border-dashed border-2 border-white/20 flex flex-col items-center justify-center min-h-[150px] cursor-pointer hover:bg-white/5" onClick={() => setIsAddingSubject(true)}>
                        {isAddingSubject ? (
                            <div className="w-full space-y-2" onClick={e => e.stopPropagation()}>
                                <Input
                                    autoFocus
                                    placeholder="Subject Name"
                                    value={newSubjectName}
                                    onChange={e => setNewSubjectName(e.target.value)}
                                    list="subject-suggestions"
                                />
                                <datalist id="subject-suggestions">
                                    {RECOMMENDED_SUBJECTS.map(s => <option key={s} value={s} />)}
                                </datalist>
                                <div className="flex gap-2">
                                    <NeonButton size="sm" onClick={handleAddSubject}>Create</NeonButton>
                                    <button onClick={() => setIsAddingSubject(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-gray-400 font-bold">Add Subject</span>
                            </>
                        )}
                    </NeonCard>

                    {/* Existing Subjects */}
                    {currentSubjects.map(subject => {
                        const subjectClasses = getClassesForSubject(selectedGrade, subject);
                        return (
                            <NeonCard
                                key={subject}
                                glowColor="blue"
                                className="cursor-pointer hover:scale-105 transition-transform flex flex-col justify-center items-center"
                                onClick={() => handleSubjectClick(subject)}
                            >
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                                    <BookOpen className="w-6 h-6 text-blue-400" />
                                </div>
                                <h4 className="text-xl font-bold text-white mb-1">{subject}</h4>
                                <p className="text-gray-400 text-sm">{subjectClasses.length} Sections</p>
                            </NeonCard>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (view === 'SECTIONS') {
        return (
            <div className="space-y-6 animate-fade-in" onClick={() => setActiveMenuId(null)}>
                <div className="flex items-center gap-4 mb-6">
                    <NeonButton variant="secondary" onClick={() => setView('SUBJECTS')} size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Subjects
                    </NeonButton>
                    <h2 className="text-3xl font-bold text-white">
                        {selectedGrade} <span className="text-neon-cyan">{selectedSubject}</span> <span className="text-gray-500 text-lg">/ Sections</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Add Section Card */}
                    <NeonCard className="border-dashed border-2 border-white/20 flex flex-col items-center justify-center min-h-[150px] cursor-pointer hover:bg-white/5" onClick={() => setIsAddingSection(true)}>
                        {isAddingSection ? (
                            <div className="w-full space-y-2" onClick={e => e.stopPropagation()}>
                                <Input autoFocus placeholder="Section Name (e.g. A)" value={newSectionName} onChange={e => setNewSectionName(e.target.value)} />
                                <div className="flex gap-2">
                                    <NeonButton size="sm" onClick={handleAddSection}>Add</NeonButton>
                                    <button onClick={() => setIsAddingSection(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-gray-400 font-bold">Add Section</span>
                            </>
                        )}
                    </NeonCard>

                    {/* Existing Sections */}
                    {currentClasses.map(c => (
                        <NeonCard key={c.id} glowColor="cyan" className="cursor-pointer hover:scale-105 transition-transform relative group !overflow-visible" onClick={() => handleClassClick(c.id)}>
                            {/* 3-Dots Menu */}
                            <div className="absolute -top-2 -right-2 z-50">
                                <button
                                    className="p-2 rounded-full bg-black/50 border border-white/20 text-white hover:bg-neon-purple hover:border-neon-purple transition-all shadow-lg"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === c.id ? null : c.id);
                                    }}
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {activeMenuId === c.id && (
                                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/20 rounded-lg shadow-2xl overflow-hidden z-50">
                                        <button
                                            className="w-full text-left px-4 py-3 text-white hover:bg-white/5 flex items-center gap-2 text-sm font-bold"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartRename(c.id, c.section);
                                            }}
                                        >
                                            <FileText className="w-4 h-4" /> Rename Section
                                        </button>
                                        <button
                                            className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 flex items-center gap-2 text-sm font-bold"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onDeleteClass) onDeleteClass(c.id);
                                                setActiveMenuId(null);
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" /> Delete Class
                                        </button>
                                    </div>
                                )}
                            </div>


                            <div className="flex justify-between items-start mb-4 pr-6">
                                {renamingClassId === c.id ? (
                                    <div className="w-full mr-2" onClick={e => e.stopPropagation()}>
                                        <Input
                                            autoFocus
                                            value={renameValue}
                                            onChange={e => setRenameValue(e.target.value)}
                                            className="h-8 text-sm mb-2"
                                        />
                                        <div className="flex gap-2">
                                            <NeonButton size="sm" onClick={handleSaveRename} className="!py-1 !px-2 text-xs">Save</NeonButton>
                                            <button onClick={() => setRenamingClassId(null)} className="text-xs text-gray-400">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <h3 className="text-xl font-bold text-white">{c.section}</h3>
                                )}
                                <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{c.studentIds.length} Students</span>
                            </div>
                            <p className="text-gray-400 text-sm truncate">{c.name}</p>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span
                                    className="text-xs text-neon-cyan flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(c.inviteCode);
                                        alert(`Copied code: ${c.inviteCode}`);
                                    }}
                                    title="Click to copy code"
                                >
                                    {c.inviteCode} <Copy className="w-3 h-3" />
                                </span>
                                <Users className="w-4 h-4 text-gray-500" />
                            </div>
                        </NeonCard>
                    ))}
                </div>
            </div >
        );
    }



    if (view === 'STUDENTS') {
        return (
            <div className="space-y-6 animate-fade-in">
                {selectedStudentForModal && (
                    <Suspense fallback={null}>
                        <UserProfileModal
                            user={selectedStudentForModal}
                            onClose={() => setSelectedStudentForModal(null)}
                            role="STUDENT"
                        />
                    </Suspense>
                )}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setView('SECTIONS')} className="text-gray-400 hover:text-white flex items-center gap-2">
                        <LogOut className="w-4 h-4 rotate-180" /> Back to Sections
                    </button>
                    <div>
                        <h2 className="text-3xl font-bold text-white">{currentClass?.name} <span className="text-neon-cyan">Section {currentClass?.section}</span></h2>
                        <p className="text-gray-400 text-sm">Class Code: {currentClass?.inviteCode}</p>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-neon-purple" /> Subjects
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {currentClass?.subjects?.map(sub => (
                            <span key={sub.id} className="px-3 py-1 bg-neon-purple/20 text-purple-300 rounded-full text-sm border border-neon-purple/30">
                                {sub.name}
                            </span>
                        ))}
                        {(!currentClass?.subjects || currentClass.subjects.length === 0) && (
                            <span className="text-gray-500 text-sm italic">No subjects assigned.</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {currentStudents.length > 0 ? currentStudents.map(s => (
                        <div
                            key={s.id}
                            className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer"
                            onClick={() => setSelectedStudentForModal(s)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-purple to-blue-600 flex items-center justify-center font-bold text-white">
                                    {s.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">{getDisplayName ? getDisplayName(s) : s.name}</h4>
                                    <p className="text-xs text-gray-400">Roll: {s.rollNumber || s.id.slice(-4)} • Avg Score: {s.avgScore}%</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${s.status === 'At Risk' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {s.status}
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400">Attendance</p>
                                    <p className="font-bold text-white">{s.attendance}%</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No students enrolled in this class yet.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};





export const TeacherDashboard: React.FC<TeacherDashboardProps & { onDeleteClass?: (classId: string) => void; onRenameClass?: (classId: string, newName: string) => void; onUpdateTeacher?: (teacherId: string, assignedClassIds: string[]) => Promise<void> }> = ({ schoolName, schoolProfile, students, classrooms, announcements, setStudents, onLogout, userRole = 'TEACHER', currentUser, onCreateClass, onPostAnnouncement, getDisplayName, onDeleteClass, onRenameClass, onUpdateTeacher, onKickStudent, activeTab: propActiveTab, onTabChange }) => {
    const [localActiveTab, setLocalActiveTab] = useState('OVERVIEW');
    const activeTab = propActiveTab || localActiveTab;

    const handleTabChange = (tab: string) => {
        console.log("TeacherDashboard: handleTabChange called with:", tab);
        setLocalActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };

    const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState<Teacher | null>(null);
    const [selectedClassForView, setSelectedClassForView] = useState<Classroom | null>(null);
    const [newClassData, setNewClassData] = useState({ name: '', section: '', motto: '' });
    const [msgContent, setMsgContent] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [classFilter, setClassFilter] = useState<string>('ALL');
    const [assignmentConfig, setAssignmentConfig] = useState<{ topic: string; type: AssignmentType; count: number; gradeLevel: string; subject: string; difficulty: string }>({ topic: '', type: 'SUBJECTIVE', count: 20, gradeLevel: 'Grade 10', subject: 'General', difficulty: 'Medium' });
    const [generatedAssignment, setGeneratedAssignment] = useState<AiAssignmentResponse | null>(null);
    const [editedTitle, setEditedTitle] = useState(''); // [NEW] State for editable title
    const [isGeneratingAssignment, setIsGeneratingAssignment] = useState(false);
    const [assignToClassId, setAssignToClassId] = useState('');
    const [scheduleConfig, setScheduleConfig] = useState({ startTime: '', deadline: '', duration: 60 });
    const [assignmentViewMode, setAssignmentViewMode] = useState<'FOLDERS' | 'ACTIVE' | 'PAST'>('FOLDERS'); // [NEW] Folder Navigation State
    const [createdAssignments, setCreatedAssignments] = useState<Assignment[]>([]);
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]); // [NEW] Store generated questions
    const [generationCountdown, setGenerationCountdown] = useState(0); // [NEW] Countdown timer

    // [NEW] Upload Mode State
    const [isUploadMode, setIsUploadMode] = useState(false);
    const [uploadConfig, setUploadConfig] = useState({ title: '', description: '', maxMarks: 10, fileName: '', attachment: '' });

    // [NEW] View State for Assignment Details Modal
    const [selectedAssignmentForView, setSelectedAssignmentForView] = useState<Assignment | null>(null);
    const [selectedGapForView, setSelectedGapForView] = useState<any | null>(null);
    const [selectedGapCategory, setSelectedGapCategory] = useState<'AI' | 'ASSIGNMENT' | 'PRACTICE' | null>(null); // [NEW] State for gap category
    const [activeRemedialTab, setActiveRemedialTab] = useState<'OPEN' | 'RESOLVED'>('OPEN'); // [NEW] Tab for Active vs Resolved
    const [showGapAnalysis, setShowGapAnalysis] = useState(false); // [NEW] Toggle for Chart View
    const [studentHistory, setStudentHistory] = useState<any[]>([]);



    // [NEW] Fetch Student History when a student is selected
    React.useEffect(() => {
        if (!selectedStudentId) return;
        setSelectedGapCategory(null);
        setActiveRemedialTab('OPEN');
        setShowGapAnalysis(false);
        const fetchHistory = async () => {
            try {
                const res = await api.authFetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')}/students/${selectedStudentId}/history`);
                if (res.ok) {
                    const data = await res.json();
                    setStudentHistory(data);
                }
            } catch (error) {
                console.error("Failed to fetch student history:", error);
            }
        };
        fetchHistory();
    }, [selectedStudentId]);

    const myClasses = useMemo(() => {
        if (userRole === 'ADMIN') return classrooms;
        return classrooms.filter(c => c.teacherId === currentUser?.id || (currentUser as Teacher).assignedClasses?.includes(c.id));
    }, [classrooms, userRole, currentUser]);
    const myAllStudents = useMemo(() => {
        if (userRole === 'ADMIN') return students;
        const myClassIds = new Set(myClasses.map(c => c.id));
        return students.filter(s => s.classId && myClassIds.has(s.classId));
    }, [students, userRole, myClasses]);

    const filteredStudents = useMemo(() => classFilter === 'ALL' ? myAllStudents : myAllStudents.filter(s => s.classId === classFilter), [myAllStudents, classFilter]);

    const gapData = useMemo(() => {
        const resolved = myAllStudents.reduce((acc, s) => acc + (s.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length, 0);
        const open = myAllStudents.reduce((acc, s) => acc + (s.weaknessHistory || []).filter(w => w.status === 'OPEN').length, 0);
        return (resolved + open === 0) ? [{ name: 'No Data', value: 1 }] : [{ name: 'Resolved', value: resolved }, { name: 'Open', value: open }];
    }, [myAllStudents]);

    const subjectPerformance = useMemo(() => ['Physics', 'Math', 'History', 'English', 'CS'].map(sub => ({ subject: sub, score: Math.max(40, 95 - (myAllStudents.filter(s => (s.weakerSubjects || []).includes(sub)).length * 15)), fullMark: 100 })), [myAllStudents]);

    const handleGenerateAssignment = async () => {
        if (!assignmentConfig.topic) return;
        setIsGeneratingAssignment(true);
        setGeneratedQuestions([]); // Reset questions

        // Start countdown timer (estimate 15 seconds)
        let countdown = 15;
        setGenerationCountdown(countdown);
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown >= 0) {
                setGenerationCountdown(countdown);
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);

        try {
            const res = await api.generateAssignment(assignmentConfig.topic, assignmentConfig.count, assignmentConfig.type, assignmentConfig.subject, assignmentConfig.gradeLevel, assignmentConfig.difficulty);
            setGeneratedAssignment(res);
            setEditedTitle(res.title);

            // Set generated questions directly from the main response
            // This works for Quiz, Mixed, and Subjective types now
            if (res.questions && Array.isArray(res.questions)) {
                setGeneratedQuestions(res.questions);
            } else {
                setGeneratedQuestions([]);
            }

            const now = new Date(); const tmrw = new Date(now); tmrw.setDate(tmrw.getDate() + 1);
            setScheduleConfig({ startTime: now.toISOString().slice(0, 16), deadline: tmrw.toISOString().slice(0, 16), duration: 60 });
        } catch (e: any) {
            console.error(e);
            alert(`Error generating assignment: ${e.message}`);
        } finally {
            clearInterval(countdownInterval);
            setGenerationCountdown(0);
            setIsGeneratingAssignment(false);
        }
    };

    // [NEW] Handle File Upload (Convert to Base64)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert("File size too large! Max 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadConfig({ ...uploadConfig, fileName: file.name, attachment: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    // [NEW] Handle Publish Upload
    const handlePublishUpload = async () => {
        if (!uploadConfig.title || !assignToClassId || !uploadConfig.attachment) return;

        const targetClass = classrooms.find(c => c.id === assignToClassId);
        const newAssignment: Assignment = {
            id: `ASG-${Date.now()}`,
            title: uploadConfig.title,
            description: uploadConfig.description,
            maxMarks: uploadConfig.maxMarks,
            type: 'UPLOAD',
            classId: assignToClassId,
            subject: 'General', // TODO: Add subject selection
            className: targetClass ? targetClass.name : 'Unknown',
            deadline: scheduleConfig.deadline,
            duration: scheduleConfig.duration,
            createdAt: new Date().toISOString(),
            attachment: uploadConfig.attachment,
            questions: [] // No questions for upload type
        };

        try {
            const res = await api.authFetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')}/assignments`, {
                method: 'POST',
                body: JSON.stringify(newAssignment)
            });

            if (!res.ok) throw new Error("Failed to save assignment");

            setCreatedAssignments(prev => [newAssignment, ...prev]);
            setIsUploadMode(false); // Reset mode
            setUploadConfig({ title: '', description: '', maxMarks: 10, fileName: '', attachment: '' });
            setAssignmentViewMode('ACTIVE'); // [NEW] Auto-navigate to list
            alert("Assignment Published!");
        } catch (error) {
            console.error("Failed to publish assignment:", error);
            alert("Failed to publish assignment.");
        }
    };

    const handlePublishAssignment = async () => {
        if (!generatedAssignment || !assignToClassId) return;

        // Use already-generated questions (from handleGenerateAssignment)
        const questions = generatedQuestions;

        const targetClass = classrooms.find(c => c.id === assignToClassId);
        const newAssignment: Assignment = {
            id: `ASG-${Date.now()}`,
            title: editedTitle || generatedAssignment.title, // [NEW] Use edited title
            description: generatedAssignment.description,
            maxMarks: generatedAssignment.suggestedMaxMarks,
            type: assignmentConfig.type,
            classId: assignToClassId,
            subject: 'Science', // TODO: Add subject selection
            className: targetClass ? targetClass.name : 'Unknown',
            startTime: scheduleConfig.startTime,
            deadline: scheduleConfig.deadline,
            duration: scheduleConfig.duration,
            createdAt: new Date().toISOString(),
            questions: questions // [NEW] Save generated questions
        };

        try {
            const res = await api.authFetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')}/assignments`, {
                method: 'POST',
                body: JSON.stringify(newAssignment)
            });

            if (!res.ok) throw new Error("Failed to save assignment");

            setCreatedAssignments(prev => [newAssignment, ...prev]);
            setGeneratedAssignment(null);
            setGeneratedQuestions([]); // Reset questions
            setAssignToClassId('');
            setAssignmentViewMode('ACTIVE'); // [NEW] Auto-navigate to list
            alert("Assignment Published!");
        } catch (error) {
            console.error("Failed to publish assignment:", error);
            alert("Failed to publish assignment.");
        }
    };

    // Fetch exiting assignments on load
    // Fetch exiting assignments on load
    React.useEffect(() => {
        const fetchAssignments = async () => {
            if (!currentUser?.id) return;
            try {
                const res = await api.authFetch(`${import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api')}/teachers/${currentUser.id}/assignments`);
                if (res.ok) {
                    const data = await res.json();
                    setCreatedAssignments(data);
                }
            } catch (error) {
                console.error("Failed to fetch assignments:", error);
            }
        };
        fetchAssignments();
    }, [currentUser?.id]);

    return (
        <div className="min-h-screen bg-dark-bg">
            {selectedAssignmentForView && (
                <Suspense fallback={<DashboardFallback />}>
                    <AssignmentDetailsModal
                        assignment={selectedAssignmentForView}
                        students={myAllStudents}
                        onClose={() => setSelectedAssignmentForView(null)}
                    />
                </Suspense>
            )}

            {selectedGapForView && (
                <Suspense fallback={<DashboardFallback />}>
                    <TeacherRemedialView
                        gap={selectedGapForView}
                        studentName={myAllStudents.find(s => s.id === selectedStudentId)?.name || 'Unknown Student'}
                        onClose={() => setSelectedGapForView(null)}
                        gradeLevel={myAllStudents.find(s => s.id === selectedStudentId)?.grade || 'Grade 10'}
                    />
                </Suspense>
            )}

            {/* New Redesigned Header */}

            <header className="mb-8">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-display font-bold text-white flex items-center gap-2">
                            Hello, <span className="text-yellow-400">{currentUser?.name || (userRole === 'ADMIN' ? 'Admin' : 'Teacher')}</span> <span className="text-3xl">👋</span>
                        </h2>
                        <p className="text-gray-400 mt-1">Ready to inspire your students today?</p>
                    </div>

                    {/* School Info Center */}
                    <div className="flex items-center gap-4 bg-gradient-to-br from-gray-900/80 to-gray-800/50 rounded-xl px-5 py-3 border border-white/10">
                        {schoolProfile?.logoUrl ? (
                            <img src={schoolProfile.logoUrl} alt="School Logo" className="w-12 h-12 rounded-xl object-cover border border-white/20" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center text-xl font-bold text-neon-purple">
                                {schoolName?.charAt(0) || 'S'}
                            </div>
                        )}
                        <div>
                            <h3 className="text-lg font-bold text-white">{schoolName}</h3>
                            {schoolProfile?.motto && <p className="text-xs text-gray-400">{schoolProfile.motto}</p>}
                            {schoolProfile?.inviteCode && (
                                <p className="text-xs text-neon-cyan cursor-pointer mt-1" onClick={() => navigator.clipboard.writeText(schoolProfile.inviteCode || '')}>
                                    Code: {schoolProfile.inviteCode} <Copy className="w-3 h-3 inline ml-1" />
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* XP Points Badge */}
                        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-purple-500/30 flex items-center justify-center">
                                <Target className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-purple-300">Total Students</p>
                                <p className="text-lg font-bold text-white">{myAllStudents.length}</p>
                            </div>
                        </div>
                        {/* Rank Badge */}
                        <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 border border-cyan-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/30 flex items-center justify-center">
                                <Layers className="w-5 h-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="text-xs text-cyan-300">Classes</p>
                                <p className="text-lg font-bold text-white">{myClasses.length} Active</p>
                            </div>
                        </div>
                        <NeonButton variant="danger" onClick={onLogout} className="!px-4"><LogOut className="w-4 h-4 mr-2" /> Logout</NeonButton>
                    </div>
                </div>
            </header>

            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                {['OVERVIEW', 'CLASSES', 'RANKINGS', 'ATTENDANCE', 'GAPS', userRole === 'ADMIN' && 'STUDENTS & CLASSES', userRole === 'ADMIN' && 'FACULTY', 'REMEDIAL_CENTER', 'ASSIGNMENTS', 'CONTENT_HUB', 'ANNOUNCEMENTS'].filter(Boolean).map((tab: any) => (
                    <button key={tab} onClick={() => handleTabChange(tab)} className={`px-5 py-3 rounded-lg font-bold text-sm ${activeTab === tab ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50' : 'bg-white/5 text-gray-400'}`}>{tab === 'CONTENT_HUB' ? 'CONTENT HUB' : tab}</button>
                ))}
            </div>

            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                    {/* New Modern Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Attendance Card */}
                        <div className="bg-black rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                            <div className="absolute top-4 right-4">
                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle className="w-7 h-7 text-green-400" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">Attendance</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-white">{Math.round(myAllStudents.reduce((acc, s) => acc + (s.attendance || 0), 0) / (myAllStudents.length || 1))}%</span>
                                <span className="text-green-400 text-sm font-medium">{myAllStudents.length > 0 && Math.round(myAllStudents.reduce((acc, s) => acc + (s.attendance || 0), 0) / myAllStudents.length) >= 80 ? 'Excellent' : 'Needs Attention'}</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000" style={{ width: `${Math.round(myAllStudents.reduce((acc, s) => acc + (s.attendance || 0), 0) / (myAllStudents.length || 1))}%` }}></div>
                            </div>
                        </div>

                        {/* Assignments Card */}
                        <div className="bg-black rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                            <div className="absolute top-4 right-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                    <BookOpen className="w-7 h-7 text-cyan-400" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">Assignments</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-white">{createdAssignments.length}</span>
                                <span className="text-cyan-400 text-sm font-medium">Created</span>
                            </div>
                            <p className="text-gray-500 text-xs mt-2">
                                {createdAssignments.length > 0
                                    ? `Latest: ${createdAssignments[0]?.title?.slice(0, 20)}...`
                                    : 'No assignments yet'}
                            </p>
                            {/* Progress Bar */}
                            <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(createdAssignments.length * 10, 100)}%` }}></div>
                            </div>
                        </div>

                        {/* Avg Score Card */}
                        <div className="bg-black rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                            <div className="absolute top-4 right-4">
                                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                                    <BarChart2 className="w-7 h-7 text-pink-400" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">Avg Score</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-bold text-white">{Math.round(myAllStudents.reduce((acc, s) => acc + (s.avgScore || 0), 0) / (myAllStudents.length || 1))}%</span>
                                <span className="text-pink-400 text-sm font-medium">{myAllStudents.length} Students</span>
                            </div>
                            {/* Progress Bar */}
                            <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-pink-500 to-purple-400 rounded-full transition-all duration-1000" style={{ width: `${Math.round(myAllStudents.reduce((acc, s) => acc + (s.avgScore || 0), 0) / (myAllStudents.length || 1))}%` }}></div>
                            </div>
                        </div>
                    </div>


                    {/* At Risk & Gaps Cards Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <NeonCard glowColor="red"><p className="text-gray-400 text-xs">At Risk Students</p><p className="text-3xl font-bold text-red-400">{myAllStudents.filter(s => s.status === 'At Risk').length}</p></NeonCard>
                        <NeonCard glowColor="purple"><p className="text-gray-400 text-xs">Open Gaps</p><p className="text-3xl font-bold text-neon-purple">{myAllStudents.reduce((acc, s) => acc + (s.weaknessHistory || []).filter(w => w.status === 'OPEN').length, 0)}</p></NeonCard>
                        <NeonCard glowColor="green"><p className="text-gray-400 text-xs">Resolved Gaps</p><p className="text-3xl font-bold text-green-400">{myAllStudents.reduce((acc, s) => acc + (s.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length, 0)}</p></NeonCard>
                        <NeonCard glowColor="cyan"><p className="text-gray-400 text-xs">School Code</p><p className="text-lg font-bold text-neon-cyan cursor-pointer" onClick={() => navigator.clipboard.writeText(schoolProfile?.inviteCode || '')}>{schoolProfile?.inviteCode || 'N/A'} <Copy className="w-3 h-3 inline" /></p></NeonCard>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <NeonCard className="lg:col-span-2"><h3 className="font-bold text-white mb-4">Class Distribution</h3><div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={myClasses.map(c => ({ name: c.name, students: c.studentIds.length }))}><CartesianGrid strokeDasharray="3 3" stroke="#333" /><XAxis dataKey="name" stroke="#666" /><YAxis stroke="#666" /><Bar dataKey="students" fill="#06b6d4" /></BarChart></ResponsiveContainer></div></NeonCard>
                        <NeonCard><h3 className="font-bold text-white mb-4">Subject Mastery</h3><div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectPerformance}><PolarGrid /><PolarAngleAxis dataKey="subject" /><PolarRadiusAxis angle={30} domain={[0, 100]} /><Radar dataKey="score" stroke="#bc13fe" fill="#bc13fe" fillOpacity={0.6} /></RadarChart></ResponsiveContainer></div></NeonCard>
                    </div>

                    {/* Class Cards */}
                    <h3 className="text-xl font-bold text-white mt-6 mb-4">Your Classes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myClasses.map(c => {
                            const studentCount = students.filter(s => s.classId === c.id).length;
                            return (
                                <NeonCard key={c.id} glowColor="purple" className="cursor-pointer hover:border-neon-purple transition-colors" onClick={() => setSelectedClassForView(c)}>
                                    <div className="flex justify-between">
                                        <h4 className="font-bold text-white">{c.name}</h4>
                                        <span onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.inviteCode); }} className="cursor-pointer text-xs bg-purple-500/20 px-2 py-1 rounded text-purple-300 hover:bg-purple-500/30">
                                            {c.inviteCode} <Copy className="w-3 h-3 inline" />
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2">{studentCount} Students</p>
                                    <p className="text-xs text-gray-500 mt-1">Section: {c.section}</p>
                                </NeonCard>
                            );
                        })}
                    </div>
                </div>
            )}

            {
                activeTab === 'CLASSES' && (
                    selectedClassForView ? (
                        <ClassDetailView
                            classroom={selectedClassForView}
                            students={students}
                            onBack={() => setSelectedClassForView(null)}
                            getDisplayName={getDisplayName}
                            onKickStudent={onKickStudent}
                        />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <NeonCard glowColor="cyan" className="h-fit space-y-4"><h3 className="font-bold text-white">Create Class</h3><Input placeholder="Name" value={newClassData.name} onChange={e => setNewClassData({ ...newClassData, name: e.target.value })} /><Input placeholder="Section" value={newClassData.section} onChange={e => setNewClassData({ ...newClassData, section: e.target.value })} /><NeonButton onClick={() => { if (onCreateClass && newClassData.name) onCreateClass(newClassData); }} className="w-full">Create</NeonButton></NeonCard>
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myClasses.map(c => {
                                    const studentCount = students.filter(s => s.classId === c.id).length;
                                    return (
                                        <NeonCard key={c.id} glowColor="purple" className="cursor-pointer hover:border-neon-purple transition-colors" onClick={() => setSelectedClassForView(c)}>
                                            <div className="flex justify-between">
                                                <h4 className="font-bold text-white">{c.name}</h4>
                                                <span onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.inviteCode); }} className="cursor-pointer text-xs bg-purple-500/20 px-2 py-1 rounded text-purple-300 hover:bg-purple-500/30">
                                                    {c.inviteCode} <Copy className="w-3 h-3 inline" />
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-2">{studentCount} Students</p>
                                            <p className="text-xs text-gray-500 mt-1">Section: {c.section}</p>
                                        </NeonCard>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )
            }

            {
                activeTab === 'RANKINGS' && (
                    <LeaderboardView
                        classrooms={classrooms}
                        students={students}
                        userRole={userRole}
                        currentUser={currentUser}
                    />
                )
            }

            {
                activeTab === 'ATTENDANCE' && (
                    <TeacherAttendance
                        classrooms={myClasses}
                        students={myAllStudents}
                        teacherId={currentUser?.id}
                    />
                )
            }

            {
                activeTab === 'GAPS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Panel: Class Filter + Student List */}
                        <NeonCard className="h-[600px] flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-yellow-400" /> Student Gaps Analysis
                                </h3>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded p-2 text-white"
                                    value={classFilter}
                                    onChange={e => setClassFilter(e.target.value)}
                                >
                                    <option value="ALL">All Classes</option>
                                    {myClasses.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {filteredStudents.map(s => {
                                    const openGaps = (s.weaknessHistory || []).filter(w => w.status === 'OPEN').length;
                                    const resolvedGaps = (s.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedStudentId(s.id)}
                                            className={`w-full text-left p-3 rounded hover:bg-white/5 transition-colors ${selectedStudentId === s.id ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30' : 'text-gray-300 border border-transparent'}`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold">{getDisplayName ? getDisplayName(s) : s.name}</span>
                                                <div className="flex gap-2">
                                                    {openGaps > 0 && <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">{openGaps} Open</span>}
                                                    {resolvedGaps > 0 && <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">{resolvedGaps} Resolved</span>}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{s.grade} • Avg: {s.avgScore}%</div>
                                        </button>
                                    );
                                })}
                                {filteredStudents.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">No students in this class</div>
                                )}
                            </div>
                        </NeonCard>

                        {/* Right Panel: Selected Student Gap Details */}
                        <NeonCard className="lg:col-span-2 h-[600px] overflow-y-auto custom-scrollbar">
                            {selectedStudentId ? (() => {
                                const stu = myAllStudents.find(s => s.id === selectedStudentId);
                                if (!stu) return null;

                                const aiGaps = (stu.weaknessHistory || []).filter(w => w.source === 'AI_LEARNING');
                                const assignmentGaps = (stu.weaknessHistory || []).filter(w => w.source !== 'AI_LEARNING');

                                return (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                            <div>
                                                <h3 className="text-2xl font-bold text-white">{getDisplayName ? getDisplayName(stu) : stu.name}</h3>
                                                <p className="text-gray-400 text-sm">{stu.grade} • Attendance: {stu.attendance}%</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-bold text-neon-cyan">{stu.avgScore}%</div>
                                                <div className="text-xs text-gray-500">Avg Score</div>
                                            </div>
                                        </div>

                                        {/* Summary Stats */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-red-500/10 rounded-lg p-4 text-center border border-red-500/20">
                                                <div className="text-2xl font-bold text-red-400">{(stu.weaknessHistory || []).filter(w => w.status === 'OPEN').length}</div>
                                                <div className="text-xs text-gray-400">Open Gaps</div>
                                            </div>
                                            <div className="bg-green-500/10 rounded-lg p-4 text-center border border-green-500/20">
                                                <div className="text-2xl font-bold text-green-400">{(stu.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length}</div>
                                                <div className="text-xs text-gray-400">Resolved</div>
                                            </div>
                                            <div className="bg-purple-500/10 rounded-lg p-4 text-center border border-purple-500/20">
                                                <div className="text-2xl font-bold text-purple-400">{(stu.weaknessHistory || []).length}</div>
                                                <div className="text-xs text-gray-400">Total Detected</div>
                                            </div>
                                        </div>

                                        {/* AI Detected Gaps */}
                                        <div>
                                            <h4 className="text-neon-purple font-bold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Detected Gaps</h4>
                                            {aiGaps.length === 0 ? <p className="text-gray-500 italic text-sm">No AI-detected gaps.</p> : (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {aiGaps.map(w => (
                                                        <div key={w.id} className="p-3 bg-white/5 border border-neon-purple/30 rounded-lg flex justify-between items-center">
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{w.topic}</p>
                                                                {w.subTopic && <p className="text-xs text-neon-purple">{w.subTopic}</p>}
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {w.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Assignment Gaps */}
                                        <div>
                                            <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Assignment Weaknesses</h4>
                                            {assignmentGaps.length === 0 ? <p className="text-gray-500 italic text-sm">No assignment-based weaknesses.</p> : (
                                                <div className="grid grid-cols-1 gap-2">
                                                    {assignmentGaps.map(w => (
                                                        <div key={w.id} className="p-3 bg-white/5 border border-blue-500/30 rounded-lg flex justify-between items-center">
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{w.topic}</p>
                                                                {w.subTopic && <p className="text-xs text-blue-300">{w.subTopic}</p>}
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {w.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
                                    <p>Select a student to view their learning gaps.</p>
                                </div>
                            )}
                        </NeonCard>
                    </div>
                )
            }

            {
                activeTab === 'STUDENTS & CLASSES' && userRole === 'ADMIN' && (
                    <AdminClassesTab
                        classrooms={classrooms}
                        students={students}
                        onCreateClass={onCreateClass}
                        getDisplayName={getDisplayName}
                        onDeleteClass={onDeleteClass}
                    />
                )
            }

            {
                activeTab === 'FACULTY' && userRole === 'ADMIN' && (
                    <>
                        {selectedTeacherForAssignment && onUpdateTeacher && (
                            <AssignClassesModal
                                teacher={selectedTeacherForAssignment}
                                availableClasses={classrooms}
                                onSave={onUpdateTeacher}
                                onClose={() => setSelectedTeacherForAssignment(null)}
                            />
                        )}
                        <NeonCard glowColor="purple">
                            <h3 className="text-xl font-bold text-white mb-4">Faculty Directory</h3>
                            <div className="space-y-2">
                                {(schoolProfile?.faculty || []).map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/10 hover:bg-white/10 transition-colors">
                                        <div>
                                            <p className="text-white font-bold">{t.name}</p>
                                            <p className="text-gray-400 text-xs">{t.subject}</p>
                                            <p className="text-neon-cyan text-xs mt-1">
                                                Assigned: {t.assignedClasses?.length || 0} Classes
                                            </p>
                                        </div>
                                        <NeonButton size="sm" variant="secondary" onClick={() => setSelectedTeacherForAssignment(t)}>
                                            Assign Classes
                                        </NeonButton>
                                    </div>
                                ))}
                            </div>
                        </NeonCard>
                    </>
                )
            }

            {
                activeTab === 'REMEDIAL_CENTER' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <NeonCard className="h-[600px] flex flex-col">
                            <div className="mb-4">
                                <select className="w-full bg-black/40 border border-white/10 rounded p-2 text-white" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
                                    <option value="ALL">All Classes</option>
                                    {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                                {filteredStudents.map(s => (
                                    <button key={s.id} onClick={() => setSelectedStudentId(s.id)} className={`w-full text-left p-3 rounded hover:bg-white/5 transition-colors ${selectedStudentId === s.id ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30' : 'text-gray-300 border border-transparent'}`}>
                                        <div className="font-bold">{getDisplayName ? getDisplayName(s) : s.name}</div>
                                        <div className="text-xs opacity-70 flex justify-between mt-1">
                                            <span>Open Gaps: {(s.weaknessHistory || []).filter(w => w.status === 'OPEN').length}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </NeonCard>

                        <NeonCard className="lg:col-span-2 h-[600px] overflow-y-auto custom-scrollbar">
                            {selectedStudentId ? (() => {
                                const stu = myAllStudents.find(s => s.id === selectedStudentId);
                                if (!stu) return null;

                                // Filter gaps based on the selected TAB (Open vs Resolved)
                                const filteredGaps = (stu.weaknessHistory || []).filter(w => w.status === activeRemedialTab);

                                const aiGaps = filteredGaps.filter(w => w.source === 'AI_LEARNING' || !w.source);
                                const assignmentGaps = filteredGaps.filter(w => w.source === 'ASSIGNMENT');
                                const practiceGaps = filteredGaps.filter(w => w.source === 'PRACTICE');

                                // Chart Data Preparation
                                const allGaps = stu.weaknessHistory || [];
                                const gapsBySource = [
                                    { name: 'AI Learning', value: allGaps.filter(w => w.source === 'AI_LEARNING' || !w.source).length, color: '#a855f7' }, // Neon Purple
                                    { name: 'Assignment', value: allGaps.filter(w => w.source === 'ASSIGNMENT').length, color: '#3b82f6' }, // Blue
                                    { name: 'Practice', value: allGaps.filter(w => w.source === 'PRACTICE').length, color: '#22c55e' }, // Green
                                ].filter(d => d.value > 0);

                                const gapsByStatus = [
                                    { name: 'Open (Active)', value: allGaps.filter(w => w.status === 'OPEN').length, color: '#ef4444' }, // Red
                                    { name: 'Resolved', value: allGaps.filter(w => w.status === 'RESOLVED').length, color: '#22c55e' }, // Green
                                ];

                                return (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                            <div>
                                                <h3 className="text-3xl font-bold text-white">{getDisplayName ? getDisplayName(stu) : stu.name}</h3>
                                                <p className="text-gray-400">Remedial Profile</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setShowGapAnalysis(!showGapAnalysis)}
                                                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all border ${showGapAnalysis ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                                >
                                                    <PieChartIcon className="w-4 h-4" />
                                                    {showGapAnalysis ? 'Hide Analysis' : 'View Distribution Chart'}
                                                </button>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-neon-cyan">{stu.avgScore}%</div>
                                                    <div className="text-xs text-gray-500">Avg Score</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* OPTIONAL: VISUAL ANALYSIS SECTION */}
                                        {showGapAnalysis && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
                                                <NeonCard className="p-6 bg-black/20">
                                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-neon-purple" /> Distribution by Source</h4>
                                                    <div className="h-64 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={gapsBySource}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={60}
                                                                    outerRadius={80}
                                                                    paddingAngle={5}
                                                                    dataKey="value"
                                                                >
                                                                    {gapsBySource.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip
                                                                    contentStyle={{ backgroundColor: '#0f1115', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                                                    itemStyle={{ color: '#fff' }}
                                                                />
                                                                <Legend verticalAlign="bottom" height={36} />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </NeonCard>

                                                <NeonCard className="p-6 bg-black/20">
                                                    <h4 className="text-white font-bold mb-4 flex items-center gap-2"><BarChart className="w-4 h-4 text-neon-cyan" /> Resolution Status</h4>
                                                    <div className="h-64 w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={gapsByStatus}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                                                <Tooltip
                                                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                                    contentStyle={{ backgroundColor: '#0f1115', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                                                />
                                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                                    {gapsByStatus.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                                    ))}
                                                                </Bar>
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </NeonCard>
                                            </div>
                                        )}

                                        {/* Active / Resolved Tab Switcher */}
                                        <div className="flex gap-4 border-b border-white/10 pb-4">
                                            <button
                                                onClick={() => { setActiveRemedialTab('OPEN'); setSelectedGapCategory(null); }}
                                                className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeRemedialTab === 'OPEN' ? 'border-red-400 text-red-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                                            >
                                                <AlertTriangle className="w-4 h-4" /> Active Gaps
                                                <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{(stu.weaknessHistory || []).filter(w => w.status === 'OPEN').length}</span>
                                            </button>
                                            <button
                                                onClick={() => { setActiveRemedialTab('RESOLVED'); setSelectedGapCategory(null); }}
                                                className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeRemedialTab === 'RESOLVED' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                                            >
                                                <CheckCircle className="w-4 h-4" /> Resolved History
                                                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full">{(stu.weaknessHistory || []).filter(w => w.status === 'RESOLVED').length}</span>
                                            </button>
                                        </div>

                                        {/* Category Selection or List View */}
                                        {!selectedGapCategory ? (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                                <div
                                                    onClick={() => setSelectedGapCategory('AI')}
                                                    className="p-6 bg-gradient-to-br from-neon-purple/20 to-transparent border border-neon-purple/30 rounded-xl cursor-pointer hover:border-neon-purple transition-all hover:scale-[1.02] flex flex-col items-center text-center gap-4 group"
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center group-hover:bg-neon-purple group-hover:text-black transition-colors">
                                                        <Sparkles className="w-8 h-8 text-neon-purple group-hover:text-black" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">AI Learn Gaps</h4>
                                                        <p className="text-gray-400 text-xs mt-1">From AI study sessions.</p>
                                                        <p className="text-neon-purple font-bold mt-2">{aiGaps.length} Found</p>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setSelectedGapCategory('ASSIGNMENT')}
                                                    className="p-6 bg-gradient-to-br from-blue-500/20 to-transparent border border-blue-500/30 rounded-xl cursor-pointer hover:border-blue-500 transition-all hover:scale-[1.02] flex flex-col items-center text-center gap-4 group"
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-black transition-colors">
                                                        <BookOpen className="w-8 h-8 text-blue-500 group-hover:text-black" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">Assignment Gaps</h4>
                                                        <p className="text-gray-400 text-xs mt-1">From assignments.</p>
                                                        <p className="text-blue-400 font-bold mt-2">{assignmentGaps.length} Found</p>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setSelectedGapCategory('PRACTICE')}
                                                    className="p-6 bg-gradient-to-br from-green-500/20 to-transparent border border-green-500/30 rounded-xl cursor-pointer hover:border-green-500 transition-all hover:scale-[1.02] flex flex-col items-center text-center gap-4 group"
                                                >
                                                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500 group-hover:text-black transition-colors">
                                                        <Target className="w-8 h-8 text-green-500 group-hover:text-black" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">Practice Gaps</h4>
                                                        <p className="text-gray-400 text-xs mt-1">From practice quizzes.</p>
                                                        <p className="text-green-400 font-bold mt-2">{practiceGaps.length} Found</p>
                                                    </div>
                                                </div>

                                            </div>
                                        ) : (
                                            <div className="animate-in slide-in-from-right-4">
                                                <button
                                                    onClick={() => setSelectedGapCategory(null)}
                                                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
                                                >
                                                    <ArrowLeft className="w-4 h-4" /> Back to Categories
                                                </button>

                                                {selectedGapCategory === 'AI' && (
                                                    <div>
                                                        <h4 className="text-neon-purple font-bold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Detected Gaps</h4>
                                                        {aiGaps.length === 0 ? <p className="text-gray-500 italic">No AI-detected gaps.</p> : (
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {aiGaps.map(w => (
                                                                    <div
                                                                        key={w.id}
                                                                        className="p-4 bg-white/5 border border-neon-purple/30 rounded-lg flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group"
                                                                        onClick={() => setSelectedGapForView(w)}
                                                                    >
                                                                        <div>
                                                                            <p className="text-white font-bold group-hover:text-neon-purple transition-colors">{w.topic}</p>
                                                                            {w.subTopic && <p className="text-sm text-neon-purple">{w.subTopic}</p>}
                                                                            <p className="text-xs text-gray-500 mt-1">Detected: {new Date(w.detectedAt).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`px-3 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                                {w.status}
                                                                            </span>
                                                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {selectedGapCategory === 'ASSIGNMENT' && (
                                                    <div>
                                                        <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Assignment Weaknesses</h4>
                                                        {assignmentGaps.length === 0 ? <p className="text-gray-500 italic">No assignment-based weaknesses.</p> : (
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {assignmentGaps.map(w => (
                                                                    <div
                                                                        key={w.id}
                                                                        className="p-4 bg-white/5 border border-blue-500/30 rounded-lg flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group"
                                                                        onClick={() => setSelectedGapForView(w)}
                                                                    >
                                                                        <div>
                                                                            <p className="text-white font-bold group-hover:text-blue-400 transition-colors">{w.topic}</p>
                                                                            {w.subTopic && <p className="text-sm text-blue-300">{w.subTopic}</p>}
                                                                            <p className="text-xs text-gray-500 mt-1">Detected: {new Date(w.detectedAt).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`px-3 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                                {w.status}
                                                                            </span>
                                                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {selectedGapCategory === 'PRACTICE' && (
                                                    <div>
                                                        <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Practice Weaknesses</h4>
                                                        {practiceGaps.length === 0 ? <p className="text-gray-500 italic">No practice-based weaknesses.</p> : (
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {practiceGaps.map(w => (
                                                                    <div
                                                                        key={w.id}
                                                                        className="p-4 bg-white/5 border border-green-500/30 rounded-lg flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors group"
                                                                        onClick={() => setSelectedGapForView(w)}
                                                                    >
                                                                        <div>
                                                                            <p className="text-white font-bold group-hover:text-green-400 transition-colors">{w.topic}</p>
                                                                            {w.subTopic && <p className="text-sm text-green-300">{w.subTopic}</p>}
                                                                            <p className="text-xs text-gray-500 mt-1">Detected: {new Date(w.detectedAt).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <span className={`px-3 py-1 rounded text-xs font-bold ${w.status === 'OPEN' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                                {w.status}
                                                                            </span>
                                                                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Assignment History Table */}
                                        <div className="mt-8 pt-8 border-t border-white/10">
                                            <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> Assignment History</h4>
                                            {studentHistory?.length === 0 ? <p className="text-gray-500 italic">No submissions yet.</p> : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="text-gray-400 text-xs border-b border-white/10">
                                                                <th className="p-2">Assignment</th>
                                                                <th className="p-2">Submitted</th>
                                                                <th className="p-2">Time</th>
                                                                <th className="p-2 text-right">Score</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {studentHistory?.map((h: any) => (
                                                                <tr key={h.submissionId} className="border-b border-white/5 hover:bg-white/5">
                                                                    <td className="p-2">
                                                                        <div className="text-white font-bold text-sm">{h.title}</div>
                                                                        <div className="text-xs text-gray-500">{h.subject}</div>
                                                                    </td>
                                                                    <td className="p-2 text-xs text-gray-400">{new Date(h.submittedAt).toLocaleDateString()}</td>
                                                                    <td className="p-2 text-xs text-green-300 font-mono">{h.timeTaken ? `${Math.floor(h.timeTaken / 60)}m ${h.timeTaken % 60}s` : '-'}</td>
                                                                    <td className="p-2 text-right">
                                                                        <span className={`font-bold ${((h.score / h.maxMarks) * 100) >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                                            {h.score}/{h.maxMarks}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })() : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                    <Target className="w-16 h-16 mb-4 opacity-20" />
                                    <p>Select a student to view their remedial profile.</p>
                                </div>
                            )}
                        </NeonCard>
                    </div>
                )
            }

            {
                activeTab === 'ASSIGNMENTS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <NeonCard glowColor="purple">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-white">Create Assignment</h3>
                                    <div className="flex bg-black/40 rounded-lg p-1">
                                        <button onClick={() => { setIsUploadMode(false); setGeneratedAssignment(null); }} className={`px-3 py-1 text-xs font-bold rounded ${!isUploadMode ? 'bg-neon-purple text-white' : 'text-gray-400'}`}>AI Generate</button>
                                        <button onClick={() => { setIsUploadMode(true); setGeneratedAssignment(null); }} className={`px-3 py-1 text-xs font-bold rounded ${isUploadMode ? 'bg-neon-purple text-white' : 'text-gray-400'}`}>Upload File</button>
                                    </div>
                                </div>

                                {isUploadMode ? (
                                    <div className="space-y-4 animate-fade-in">
                                        <Input placeholder="Assignment Title" value={uploadConfig.title} onChange={e => setUploadConfig({ ...uploadConfig, title: e.target.value })} />
                                        <textarea className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-white placeholder-gray-500 min-h-[100px]" placeholder="Instructions..." value={uploadConfig.description} onChange={e => setUploadConfig({ ...uploadConfig, description: e.target.value })} />
                                        <Input type="number" placeholder="Max Marks" value={uploadConfig.maxMarks} onChange={e => setUploadConfig({ ...uploadConfig, maxMarks: parseInt(e.target.value) })} />

                                        <div className="border border-dashed border-white/20 rounded-lg p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative">
                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileUpload} />
                                            <Upload className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
                                            <p className="text-sm text-gray-300 font-bold">{uploadConfig.fileName || "Click to Upload File (PDF/Image)"}</p>
                                            <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input type="datetime-local" value={scheduleConfig.deadline} onChange={e => setScheduleConfig({ ...scheduleConfig, deadline: e.target.value })} title="Deadline" />
                                                <Input type="number" placeholder="Mins" value={scheduleConfig.duration} onChange={e => setScheduleConfig({ ...scheduleConfig, duration: parseInt(e.target.value) })} title="Duration (Minutes)" />
                                            </div>
                                            <select className="bg-black/40 border border-white/10 rounded p-3 text-white" value={assignToClassId} onChange={e => setAssignToClassId(e.target.value)}>
                                                <option value="">Assign to Class...</option>
                                                {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <NeonButton onClick={handlePublishUpload} className="w-full" disabled={!uploadConfig.title || !assignToClassId || !uploadConfig.attachment}>Publish Assignment</NeonButton>
                                    </div>
                                ) : (
                                    <>
                                        <Input placeholder="Topic..." value={assignmentConfig.topic} onChange={e => setAssignmentConfig({ ...assignmentConfig, topic: e.target.value })} className="mb-4" />

                                        {/* Grade Level Selection */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Grade Level</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white"
                                                    value={assignmentConfig.gradeLevel}
                                                    onChange={e => setAssignmentConfig({ ...assignmentConfig, gradeLevel: e.target.value })}
                                                >
                                                    <option value="KG1">KG1</option>
                                                    <option value="KG2">KG2</option>
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                                                        <option key={g} value={`Grade ${g}`}>Grade {g}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Assignment Type</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white"
                                                    value={assignmentConfig.type}
                                                    onChange={e => setAssignmentConfig({ ...assignmentConfig, type: e.target.value as AssignmentType })}
                                                >
                                                    <option value="SUBJECTIVE">Subjective</option>
                                                    <option value="Quiz">Quiz (MCQ)</option>
                                                    <option value="MIXED">Mixed</option>
                                                </select>
                                            </div>
                                        </div>



                                        {/* Subject and Difficulty Selection */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Subject</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white"
                                                    value={assignmentConfig.subject}
                                                    onChange={e => setAssignmentConfig({ ...assignmentConfig, subject: e.target.value })}
                                                >
                                                    <option value="General">General</option>
                                                    <option value="Mathematics">Mathematics</option>
                                                    <option value="Science">Science (Physics/Chem/Bio)</option>
                                                    <option value="English">English</option>
                                                    <option value="History">History</option>
                                                    <option value="Computer Science">Computer Science</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400 mb-1 block">Difficulty</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/10 rounded p-3 text-white"
                                                    value={assignmentConfig.difficulty}
                                                    onChange={e => setAssignmentConfig({ ...assignmentConfig, difficulty: e.target.value })}
                                                >
                                                    <option value="Easy">Easy</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="Hard">Hard</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Question Count Slider */}
                                        <div className="mb-4">
                                            <label className="text-xs text-gray-400 mb-2 block">Number of Questions: <span className="text-neon-cyan font-bold text-lg">{assignmentConfig.count}</span></label>
                                            <input
                                                type="range"
                                                min="20"
                                                max="30"
                                                value={assignmentConfig.count}
                                                onChange={e => setAssignmentConfig({ ...assignmentConfig, count: parseInt(e.target.value) })}
                                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-purple"
                                            />
                                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                <span>20</span>
                                                <span>25</span>
                                                <span>30</span>
                                            </div>
                                        </div>

                                        <NeonButton onClick={handleGenerateAssignment} isLoading={isGeneratingAssignment} className="w-full" disabled={!assignmentConfig.topic}>
                                            {isGeneratingAssignment ? (
                                                <span className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 animate-spin" />
                                                    Generating... {generationCountdown > 0 && <span className="text-neon-cyan font-bold text-lg">{generationCountdown}s</span>}
                                                </span>
                                            ) : (
                                                `Generate ${assignmentConfig.count} Questions`
                                            )}
                                        </NeonButton>


                                    </>
                                )}
                            </NeonCard>

                            {/* [NEW] FOLDER VIEW NAVIGATION */}
                            {
                                assignmentViewMode === 'FOLDERS' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <NeonCard
                                            glowColor="green"
                                            className="cursor-pointer hover:bg-white/5 transition-colors group"
                                            onClick={() => setAssignmentViewMode('ACTIVE')}
                                            hoverEffect
                                        >
                                            <div className="flex flex-col items-center justify-center py-6">
                                                <Timer className="w-12 h-12 text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                                                <h3 className="font-bold text-white text-lg">Active</h3>
                                                <p className="text-xs text-gray-500 mt-1">{createdAssignments.filter(a => new Date(a.deadline) > new Date()).length} Files</p>
                                            </div>
                                        </NeonCard>

                                        <NeonCard
                                            glowColor="purple"
                                            className="cursor-pointer hover:bg-white/5 transition-colors group"
                                            onClick={() => setAssignmentViewMode('PAST')}
                                            hoverEffect
                                        >
                                            <div className="flex flex-col items-center justify-center py-6">
                                                <CalendarClock className="w-12 h-12 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                                                <h3 className="font-bold text-white text-lg">Archive</h3>
                                                <p className="text-xs text-gray-500 mt-1">{createdAssignments.filter(a => new Date(a.deadline) <= new Date()).length} Files</p>
                                            </div>
                                        </NeonCard>
                                    </div>
                                )
                            }

                            {/* ACTIVE ASSIGNMENTS LIST */}
                            {
                                assignmentViewMode === 'ACTIVE' && (
                                    <NeonCard>
                                        <div className="flex items-center gap-2 mb-4">
                                            <button onClick={() => setAssignmentViewMode('FOLDERS')} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <Timer className="w-5 h-5 text-green-400" /> Active Assignments
                                            </h3>
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-auto custom-scrollbar">
                                            {createdAssignments.filter(a => new Date(a.deadline) > new Date()).length === 0 && <p className="text-gray-500 italic text-sm">No active assignments.</p>}
                                            {createdAssignments.filter(a => new Date(a.deadline) > new Date()).map(a => (
                                                <div key={a.id} className="p-3 bg-white/5 rounded border border-white/10 hover:border-green-500/50 transition-colors">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="text-white font-bold">{a.title}</h4>
                                                            <p className="text-xs text-gray-400">{a.className} • Due: {new Date(a.deadline).toLocaleDateString()}</p>
                                                        </div>
                                                        <NeonButton size="sm" variant="secondary" onClick={() => setSelectedAssignmentForView(a)}>View Scores</NeonButton>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </NeonCard>
                                )
                            }

                            {/* PAST ASSIGNMENTS LIST */}
                            {
                                assignmentViewMode === 'PAST' && (
                                    <NeonCard>
                                        <div className="flex items-center gap-2 mb-4">
                                            <button onClick={() => setAssignmentViewMode('FOLDERS')} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-400" /></button>
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                <CalendarClock className="w-5 h-5 text-gray-400" /> Archived Assignments
                                            </h3>
                                        </div>
                                        <div className="space-y-2 max-h-[400px] overflow-auto custom-scrollbar">
                                            {createdAssignments.filter(a => new Date(a.deadline) <= new Date()).length === 0 && <p className="text-gray-500 italic text-sm">No archived assignments.</p>}
                                            {createdAssignments.filter(a => new Date(a.deadline) <= new Date()).map(a => (
                                                <div key={a.id} className="p-3 bg-white/5 rounded border border-white/10 opacity-75 hover:opacity-100 transition-opacity">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="text-gray-300 font-bold">{a.title}</h4>
                                                            <p className="text-xs text-gray-500">{a.className} • Closed: {new Date(a.deadline).toLocaleDateString()}</p>
                                                        </div>
                                                        <NeonButton size="sm" variant="secondary" onClick={() => setSelectedAssignmentForView(a)}>View Scores</NeonButton>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </NeonCard>
                                )
                            }
                        </div >
                        <div>
                            {generatedAssignment ? (
                                <NeonCard glowColor="cyan">
                                    <h3 className="text-xl font-bold text-white">{generatedAssignment.title}</h3>
                                    <pre className="text-sm text-gray-400 whitespace-pre-wrap my-4 bg-black/20 p-4 rounded h-[100px] overflow-auto">{generatedAssignment.description}</pre>

                                    {/* [MOVED] Generated Questions Preview */}
                                    {generatedQuestions.length > 0 && (
                                        <div className="mb-4 pt-4 border-t border-white/10">
                                            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-neon-cyan" /> Questions Preview
                                            </h4>
                                            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar mb-4">
                                                {generatedQuestions.map((q, i) => (
                                                    <div key={i} className="p-3 bg-black/30 rounded-lg border border-white/10">
                                                        <div className="flex items-start gap-2">
                                                            <span className="bg-neon-purple/20 text-neon-purple text-xs font-bold px-2 py-1 rounded">Q{i + 1}</span>
                                                            <div className="flex-1">
                                                                <div className="text-white text-sm font-medium">
                                                                    <ReactMarkdown
                                                                        remarkPlugins={[remarkMath]}
                                                                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                                    >
                                                                        {q.question}
                                                                    </ReactMarkdown>
                                                                </div>
                                                                {q.options && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {q.options.map((opt: string, idx: number) => (
                                                                            <div key={idx} className={`text-xs px-2 py-1 rounded ${idx === q.correctAnswer ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>
                                                                                <div className="flex gap-1">
                                                                                    <span>{String.fromCharCode(65 + idx)}. </span>
                                                                                    <ReactMarkdown
                                                                                        remarkPlugins={[remarkMath]}
                                                                                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                                                    >
                                                                                        {opt}
                                                                                    </ReactMarkdown>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="datetime-local" value={scheduleConfig.deadline} onChange={e => setScheduleConfig({ ...scheduleConfig, deadline: e.target.value })} title="Deadline" />
                                            <Input type="number" placeholder="Mins" value={scheduleConfig.duration} onChange={e => setScheduleConfig({ ...scheduleConfig, duration: parseInt(e.target.value) })} title="Duration (Minutes)" />
                                        </div>
                                        <select className="bg-black/40 border border-white/10 rounded p-3 text-white" value={assignToClassId} onChange={e => setAssignToClassId(e.target.value)}>
                                            <option value="">Assign to Class...</option>
                                            {myClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <NeonButton onClick={handlePublishAssignment} className="w-full" disabled={!assignToClassId}>Publish</NeonButton>
                                </NeonCard>
                            ) : (
                                <div className="h-full border border-dashed border-white/10 rounded flex items-center justify-center text-gray-500">No Draft Generated</div>
                            )}
                        </div>
                    </div >
                )
            }

            {
                activeTab === 'CONTENT_HUB' && (
                    <TeacherContentHub currentUser={currentUser} schoolName={schoolName} schoolLogo={schoolProfile?.logoUrl} />
                )
            }

            {
                activeTab === 'ANNOUNCEMENTS' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Post Announcement Card */}
                        <NeonCard glowColor="purple">
                            <h3 className="text-lg font-bold text-white mb-4">Post Announcement</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Target</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded p-2 text-white"
                                        value={assignToClassId}
                                        onChange={e => setAssignToClassId(e.target.value)}
                                    >
                                        <option value="">📢 School-wide</option>
                                        {myClasses.map(c => (
                                            <option key={c.id} value={c.id}>📚 {c.name} - {c.section}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Type</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded p-2 text-white" id="announcementType">
                                        <option value="THOUGHT">💭 Thought of the Day</option>
                                        <option value="NOTICE">📋 Notice</option>
                                    </select>
                                </div>
                            </div>
                            <textarea
                                className="w-full h-24 bg-black/40 border border-white/10 rounded p-4 text-white resize-none"
                                placeholder="Write your announcement..."
                                value={msgContent}
                                onChange={e => setMsgContent(e.target.value)}
                            />
                            <NeonButton
                                onClick={() => {
                                    if (onPostAnnouncement && msgContent) {
                                        const typeEl = document.getElementById('announcementType') as HTMLSelectElement;
                                        const selectedClass = myClasses.find(c => c.id === assignToClassId);
                                        onPostAnnouncement(
                                            msgContent,
                                            typeEl?.value as 'THOUGHT' | 'NOTICE' || 'THOUGHT',
                                            assignToClassId || undefined,
                                            selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : undefined
                                        );
                                        setMsgContent('');
                                        setAssignToClassId('');
                                    }
                                }}
                                className="mt-4"
                                glow
                            >
                                <Megaphone className="w-4 h-4 mr-2" />
                                Post Announcement
                            </NeonButton>
                        </NeonCard>

                        {/* Announcements List */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">All Announcements</h3>
                            <div className="space-y-3">
                                {announcements.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">No announcements yet</div>
                                ) : announcements.map(a => (
                                    <div key={a.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-neon-cyan font-bold">{a.authorName}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${a.classId ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {a.classId ? `📚 ${a.className || 'Class'}` : '📢 School-wide'}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${a.type === 'NOTICE' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {a.type === 'NOTICE' ? '📋 Notice' : '💭 Thought'}
                                                </span>
                                            </div>
                                            <span className="text-xs text-gray-500">{new Date(a.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-gray-300">{a.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
