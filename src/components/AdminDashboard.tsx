
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { UserRole, Student, Classroom, SchoolProfile, Teacher, Assignment, Announcement } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import {
    Users, BookOpen, Calendar, Settings, Folder, FileText, ChevronRight, ArrowLeft,
    UserCircle, School, Plus, BarChart2, Clock, CheckCircle, Megaphone, Copy,
    Trash2, Lock, Unlock, UserPlus, Search, RotateCcw, Award, Star, Medal,
    AlertTriangle, ArrowRight, Activity, Phone, Mail, Globe, Filter, UserCheck
} from 'lucide-react';
import { api, API_URL } from '../services/api';

// Lazy load feature components
const AttendanceView = lazy(() => import('./Features/AttendanceView').then(m => ({ default: m.AttendanceView })));
const AssignClassesModal = lazy(() => import('./AssignClassesModal').then(m => ({ default: m.AssignClassesModal })));
const StudentAnalyticsModal = lazy(() => import('./StudentAnalyticsModal').then(m => ({ default: m.StudentAnalyticsModal })));

const DashboardFallback = () => (
    <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const LEVEL_CONFIG = {
    GENERAL: { border: 'border-blue-500', badge: 'bg-blue-500/20 text-blue-400', label: 'General' },
    IMPORTANT: { border: 'border-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400', label: 'Important' },
    URGENT: { border: 'border-red-500', badge: 'bg-red-500/20 text-red-400', label: 'Urgent' },
    EVENT: { border: 'border-purple-500', badge: 'bg-purple-500/20 text-purple-400', label: 'Event' },
    ACADEMIC: { border: 'border-green-500', badge: 'bg-green-500/20 text-green-400', label: 'Academic' }
};

interface AdminDashboardProps {
    schoolName: string;
    schoolProfile?: SchoolProfile;
    students: Student[];
    classrooms: Classroom[];
    announcements?: Announcement[];
    onLogout: () => void;
    currentUser?: any;
    onUpdateTeacher?: (teacherId: string, assignedClassIds: string[]) => Promise<void>;
    onPostAnnouncement?: (content: string, type: 'THOUGHT' | 'NOTICE', classId?: string, className?: string) => void;
    onCreateClass?: (data: { name: string, section: string, motto: string, subjects?: string }) => void;
    onToggleClassLock?: (classId: string, locked: boolean) => void;
    onLockAllClasses?: () => void;
    onAddStudent?: (student: Partial<Student>, classId: string) => void;
    onArchiveClass?: (classId: string) => void;
    onRestoreClass?: (classId: string) => void;
    onRenameClass?: (classId: string, newSectionName: string) => void;
    onUpdateStudent?: (student: Student) => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

// Sub-component for Class Detail View in Teacher drill-down
const TeacherClassDetailView: React.FC<{
    classroom: Classroom;
    students: Student[];
    onBack: () => void;
    onStudentClick: (student: Student) => void;
}> = ({ classroom, students, onBack, onStudentClick }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                const res = await api.authFetch(`${API_URL}/assignments?classId=${classroom.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setAssignments(data);
                }
            } catch (e) {
                console.error("Failed to fetch assignments", e);
            } finally {
                setLoading(false);
            }
        };
        fetchAssignments();
    }, [classroom.id]);

    // Count assignments created today
    const today = new Date().toDateString();
    const todayAssignments = assignments.filter(a => new Date(a.createdAt).toDateString() === today).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white">{classroom.name}</h2>
                    <p className="text-gray-400">Section {classroom.section} • Code: {classroom.inviteCode}</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <NeonCard className="p-4">
                    <div className="flex items-center gap-3">
                        <Users className="w-8 h-8 text-cyan-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{students.length}</div>
                            <div className="text-sm text-gray-400">Students</div>
                        </div>
                    </div>
                </NeonCard>
                <NeonCard className="p-4">
                    <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-purple-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{loading ? '...' : assignments.length}</div>
                            <div className="text-sm text-gray-400">Total Assignments</div>
                        </div>
                    </div>
                </NeonCard>
                <NeonCard className="p-4">
                    <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-green-400" />
                        <div>
                            <div className="text-2xl font-bold text-white">{loading ? '...' : todayAssignments}</div>
                            <div className="text-sm text-gray-400">Created Today</div>
                        </div>
                    </div>
                </NeonCard>
            </div>

            {/* Students List */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4">Students in Class</h3>
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    {students.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No students enrolled yet</div>
                    ) : (
                        students.map((student, i) => (
                            <div
                                key={student.id}
                                className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all"
                                onClick={() => onStudentClick(student)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                        {student.name?.charAt(0) || 'S'}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{student.name}</p>
                                        <p className="text-xs text-gray-400">Roll: {student.rollNumber || 'N/A'} • Score: {student.avgScore}%</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-xs ${student.status === 'Exceling' ? 'bg-green-500/20 text-green-400' :
                                        student.status === 'At Risk' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {student.status}
                                    </span>
                                    <BarChart2 className="w-4 h-4 text-gray-500" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Component for Admin Leaderboard
const AdminLeaderboardManager: React.FC<{ students: Student[], classrooms: Classroom[] }> = ({ students, classrooms }) => {
    const [view, setView] = useState<'GRADES' | 'SECTIONS' | 'LEADERBOARD'>('GRADES');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');

    // Helper to get classes for a grade
    const getClassesForGrade = (grade: string) => {
        const activeClassrooms = classrooms.filter(c => c.status !== 'ARCHIVED');
        return activeClassrooms.filter(c => {
            const gradeName = c.name.split(' - ')[0]; // Approx grade extraction
            return gradeName === grade || c.name.startsWith(grade);
        });
    };

    if (view === 'GRADES') {
        const validGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">Select Grade for Leaderboard</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {validGrades.map((grade, i) => {
                        const colors = ['cyan', 'purple', 'green', 'orange', 'pink', 'red'];
                        const color = colors[i % colors.length];
                        return (
                            <NeonCard
                                key={grade}
                                glowColor={color as any}
                                className="cursor-pointer hover:scale-105 transition-transform min-h-[100px] flex flex-col justify-center items-center"
                                onClick={() => { setSelectedGrade(grade); setView('SECTIONS'); }}
                            >
                                <h4 className="text-xl font-bold text-white">{grade}</h4>
                            </NeonCard>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (view === 'SECTIONS') {
        const sections = getClassesForGrade(selectedGrade);
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('GRADES')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <h2 className="text-2xl font-bold text-white">{selectedGrade} - Select Section</h2>
                </div>

                {sections.length === 0 ? (
                    <div className="text-gray-500 text-center p-8">No sections found for this grade.</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sections.map(section => (
                            <NeonCard
                                key={section.id}
                                className="p-6 cursor-pointer hover:bg-white/5 flex flex-col items-center justify-center gap-4"
                                onClick={() => { setSelectedClassId(section.id); setView('LEADERBOARD'); }}
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-neon-cyan flex items-center justify-center text-xl font-bold text-white">
                                    {section.section}
                                </div>
                                <span className="text-sm text-gray-400">{section.studentIds?.length || 0} Students</span>
                            </NeonCard>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    if (view === 'LEADERBOARD') {
        const sectionStudents = students.filter(s => s.classId === selectedClassId)
            .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0)); // Sort by Score

        const section = classrooms.find(c => c.id === selectedClassId);

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setView('SECTIONS')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{section?.name} - Section {section?.section}</h2>
                        <p className="text-neon-cyan text-sm font-bold">Leaderboard</p>
                    </div>
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    {sectionStudents.map((student, index) => {
                        const rank = index + 1;
                        const isTop3 = rank <= 3;
                        const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'gray';

                        return (
                            <div key={student.id} className={`p-4 border-b border-white/5 flex items-center justify-between ${isTop3 ? 'bg-white/5' : ''}`}>
                                <div className="flex items-center gap-6">
                                    <div
                                        className="w-8 h-8 flex items-center justify-center font-bold rounded-full"
                                        style={{ backgroundColor: isTop3 ? `${rankColor}33` : 'transparent', color: rankColor }}
                                    >
                                        #{rank}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{student.name}</p>
                                            <p className="text-xs text-gray-400">Roll: {student.rollNumber}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Award className={`w-5 h-5`} style={{ color: rankColor }} />
                                    <span className="text-xl font-bold text-white">{student.avgScore}%</span>
                                </div>
                            </div>
                        );
                    })}
                    {sectionStudents.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            No students in this section yet.
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    schoolName, schoolProfile, students, classrooms, announcements = [], onLogout, currentUser, onUpdateTeacher, onPostAnnouncement, onCreateClass, onToggleClassLock, onLockAllClasses, onAddStudent, onArchiveClass, onRestoreClass, onRenameClass, onUpdateStudent, activeTab: propActiveTab, onTabChange
}) => {
    const [localActiveTab, setLocalActiveTab] = useState('OVERVIEW');
    const activeTab = propActiveTab || localActiveTab;

    const handleTabChange = (tab: string) => {
        setLocalActiveTab(tab);
        if (onTabChange) onTabChange(tab);
    };
    const [attendancePath, setAttendancePath] = useState<string[]>(['root']);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Teacher drill-down state
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedClassForDetail, setSelectedClassForDetail] = useState<Classroom | null>(null);
    const [showStudentAnalytics, setShowStudentAnalytics] = useState<Student | null>(null);

    // Assignment data for class details
    const [classAssignments, setClassAssignments] = useState<Assignment[]>([]);

    // Announcement form state
    const [announcementContent, setAnnouncementContent] = useState('');
    const [announcementClassId, setAnnouncementClassId] = useState('');
    const [announcementType, setAnnouncementType] = useState<'THOUGHT' | 'NOTICE'>('THOUGHT');

    // Grade hierarchy state (for CLASSES tab)
    const [classView, setClassView] = useState<'GRADES' | 'SUBJECTS' | 'SECTIONS' | 'STUDENTS'>('GRADES');
    const [selectedGrade, setSelectedGrade] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [selectedClassIdForView, setSelectedClassIdForView] = useState<string>('');
    const [newSectionName, setNewSectionName] = useState('');
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');
    const [isAddingSubject, setIsAddingSubject] = useState(false);

    // Add Student Modal state
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [addStudentClassId, setAddStudentClassId] = useState('');
    const [newStudentData, setNewStudentData] = useState({ name: '', rollNumber: '', email: '', parentName: '', parentMobile: '' });

    // Student search state (for STUDENTS tab)
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [studentViewGrade, setStudentViewGrade] = useState('');
    const [studentViewClassId, setStudentViewClassId] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    // [UPGRADE] Announcement States
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [targetMode, setTargetMode] = useState<'ALL' | 'CUSTOM'>('ALL');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [announcementLevel, setAnnouncementLevel] = useState<keyof typeof LEVEL_CONFIG>('GENERAL');
    const [isPosting, setIsPosting] = useState(false);
    const [audienceFilters, setAudienceFilters] = useState({ classId: '', subject: '' });

    const handleRoleToggle = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };


    // Navigation Helpers
    const navigateTo = (path: string) => setAttendancePath([...attendancePath, path]);
    const navigateBack = () => {
        if (attendancePath.length > 1) {
            setAttendancePath(attendancePath.slice(0, -1));
            if (selectedStudent) setSelectedStudent(null);
        }
    };

    const renderAttendanceContent = () => {
        const currentView = attendancePath[attendancePath.length - 1];

        // ROOT VIEW
        if (currentView === 'root') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <NeonCard
                        className="p-12 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 group transition-all"
                        onClick={() => navigateTo('teachers')}
                        glowColor="purple"
                    >
                        <UserCircle className="w-24 h-24 text-gray-600 group-hover:text-purple-400 transition-colors mb-6" />
                        <h3 className="text-2xl font-bold text-white mb-2">Teachers</h3>
                        <p className="text-gray-400">View Teacher Attendance & Leave Records</p>
                    </NeonCard>

                    <NeonCard
                        className="p-12 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 group transition-all"
                        onClick={() => navigateTo('students')}
                        glowColor="cyan"
                    >
                        <Users className="w-24 h-24 text-gray-600 group-hover:text-cyan-400 transition-colors mb-6" />
                        <h3 className="text-2xl font-bold text-white mb-2">Students</h3>
                        <p className="text-gray-400">Drill-down by Class & Section</p>
                    </NeonCard>
                </div>
            );
        }

        // TEACHERS VIEW
        if (currentView === 'teachers') {
            // Use faculty from profile or derive unique teachers from classrooms if needed
            // If faculty is empty, use mock list but try to make it look real or at least explain
            const facultyList = schoolProfile?.faculty || [];
            // If no faculty list, maybe fallback to a mock loop? 
            // Let's use the mock loop if empty, but try to read attendance
            const displayList = facultyList.length > 0 ? facultyList : [
                { id: 'mock_t1', name: 'Mock Teacher 1', assignedClasses: [] },
                { id: 'mock_t2', name: 'Mock Teacher 2', assignedClasses: [] }
            ];

            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={navigateBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
                        <h2 className="text-2xl font-bold text-white">Teachers Attendance</h2>
                    </div>
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        {displayList.map((teacher: any, i: number) => {
                            // Default status logic (until Teacher Attendance API is implemented)
                            let statusBadge = <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Present</div>;

                            // Check if Sunday
                            if (new Date().getDay() === 0) {
                                statusBadge = <div className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full border border-orange-500/20">Holiday</div>;
                            }

                            return (
                                <div key={i} className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                                            {teacher.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{teacher.name}</p>
                                            <p className="text-xs text-gray-400">ID: {teacher.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {statusBadge}
                                        <button className="text-gray-400 hover:text-white"><ChevronRight /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // STUDENTS ROOT -> LIST CLASSES
        if (currentView === 'students') {
            // Group classrooms by name (e.g. "Class 10") to show Sections inside? 
            // Or just list all classes directly as folders?
            // "provide the list of classes then by clicking it ll provide it with the list of sections"
            // So Class -> Section
            const uniqueClassNames = Array.from(new Set(classrooms.map(c => c.name))).sort();

            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={navigateBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
                        <h2 className="text-2xl font-bold text-white">Select Class</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {uniqueClassNames.map(clsName => (
                            <NeonCard
                                key={clsName}
                                className="p-6 cursor-pointer hover:bg-white/5 flex flex-col items-center justify-center gap-4"
                                onClick={() => navigateTo(`class_${clsName}`)}
                            >
                                <Folder className="w-12 h-12 text-neon-cyan" />
                                <span className="text-lg font-bold text-white">{clsName}</span>
                            </NeonCard>
                        ))}
                    </div>
                </div>
            );
        }

        // CLASS SELECTED -> LIST SECTIONS
        if (currentView.startsWith('class_')) {
            const className = currentView.replace('class_', '');
            const sections = classrooms.filter(c => c.name === className);

            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={navigateBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
                        <h2 className="text-2xl font-bold text-white">{className} - Sections</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sections.map(section => (
                            <NeonCard
                                key={section.id}
                                className="p-6 cursor-pointer hover:bg-white/5 flex flex-col items-center justify-center gap-4"
                                onClick={() => navigateTo(`section_${section.id}`)}
                            >
                                <div className="w-12 h-12 rounded-full border-2 border-neon-purple flex items-center justify-center text-xl font-bold text-white">
                                    {section.section}
                                </div>
                                <span className="text-sm text-gray-400">{section.studentIds?.length || 0} Students</span>
                            </NeonCard>
                        ))}
                    </div>
                </div>
            );
        }

        // SECTION SELECTED -> LIST STUDENTS
        if (currentView.startsWith('section_')) {
            const sectionId = currentView.replace('section_', '');
            const section = classrooms.find(c => c.id === sectionId);
            const sectionStudents = students.filter(s => s.classId === sectionId);

            if (selectedStudent) {
                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 mb-6">
                            <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
                            <h2 className="text-2xl font-bold text-white">Attendance History: {selectedStudent.name}</h2>
                        </div>
                        <Suspense fallback={<DashboardFallback />}>
                            <AttendanceView student={selectedStudent} />
                        </Suspense>
                    </div>
                );
            }

            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={navigateBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
                        <h2 className="text-2xl font-bold text-white">{section?.name} {section?.section} - Students</h2>
                    </div>
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        {sectionStudents.map(student => (
                            <div
                                key={student.id}
                                className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer"
                                onClick={() => setSelectedStudent(student)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{student.name}</p>
                                        <p className="text-xs text-gray-400">Roll: {student.rollNumber}</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-500" />
                            </div>
                        ))}
                        {sectionStudents.length === 0 && <div className="p-8 text-center text-gray-500">No students found.</div>}
                    </div>
                </div>
            );
        }

        return <div>Unknown Path</div>;
    };

    return (
        <div className="min-h-screen bg-[#050510] relative overflow-hidden font-sans">
            {/* Top Navigation Bar */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-[#0f1115]/50 backdrop-blur-md border-b border-white/5 z-20 flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neon-purple/20 border border-neon-purple/50 flex items-center justify-center">
                        <School className="w-5 h-5 text-neon-purple" />
                    </div>
                    <span className="font-bold text-white text-lg tracking-tight">Admin<span className="text-neon-cyan">Console</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onLogout} className="text-gray-400 hover:text-white transition-colors text-sm font-medium">Sign Out</button>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                </div>
            </div>

            <div className="pt-24 px-8 pb-12 max-w-7xl mx-auto">
                {/* School Header - Compact Horizontal Layout */}
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-white/5 gap-6">
                    <div className="flex items-center gap-5">
                        {schoolProfile?.logoUrl ? (
                            <img
                                src={schoolProfile.logoUrl}
                                alt={schoolName}
                                className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-lg"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-white/10 flex items-center justify-center text-xl font-bold text-white">
                                {schoolName?.charAt(0) || 'S'}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white tracking-tight">{schoolName}</h1>
                                <span className="px-2 py-0.5 rounded-md bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 text-[10px] font-black uppercase tracking-wider">
                                    {schoolProfile?.subscriptionStatus || 'TRIAL'}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                                {schoolProfile?.mobileNumber && <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> {schoolProfile.mobileNumber}</span>}
                                {schoolProfile?.adminEmail && <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> {schoolProfile.adminEmail}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {schoolProfile?.inviteCode && (
                            <div
                                className="group flex items-center gap-3 px-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl hover:border-neon-purple/50 transition-all cursor-pointer"
                                onClick={() => { navigator.clipboard.writeText(schoolProfile.inviteCode || ''); alert('Invite code copied!'); }}
                            >
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">School Invite Code</span>
                                    <span className="text-sm font-mono font-bold text-neon-purple group-hover:text-white transition-colors">{schoolProfile.inviteCode}</span>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-neon-purple/10 flex items-center justify-center group-hover:bg-neon-purple transition-all">
                                    <Copy className="w-4 h-4 text-neon-purple group-hover:text-white" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 flex-wrap">
                    {[
                        { id: 'OVERVIEW', label: 'OVERVIEW' },
                        { id: 'TEACHERS', label: 'TEACHERS' },
                        { id: 'STUDENTS', label: 'STUDENTS' },
                        { id: 'CLASSES', label: 'MANAGE CLASSES' },
                        { id: 'RESOURCES', label: 'RESOURCES' },
                        { id: 'ATTENDANCE', label: 'ATTENDANCE' },
                        { id: 'LEADERBOARD', label: 'LEADERBOARD' },
                        { id: 'ANNOUNCEMENTS', label: 'ANNOUNCEMENTS' },
                        { id: 'SETTINGS', label: 'SETTINGS' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`pb-4 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id ? 'text-neon-cyan border-neon-cyan' : 'text-gray-400 border-transparent hover:text-white'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'OVERVIEW' && (() => {
                    const healthScore =
                        (students.length > 0 ? 40 : 0) +
                        (classrooms.length > 0 ? 30 : 0) +
                        (schoolProfile?.faculty?.length && schoolProfile.faculty.length > 0 ? 20 : 0) +
                        (schoolProfile?.subscriptionStatus === 'ACTIVE' ? 10 : 0);

                    const mockActivities = [
                        { text: 'New student added to Grade 10-A', time: '2h ago', icon: <UserPlus className="w-3 h-3" /> },
                        { text: 'Class "Physics Lab" created', time: '5h ago', icon: <Plus className="w-3 h-3" /> },
                        { text: 'New announcement posted: "Annual Sports Meet"', time: '1d ago', icon: <Megaphone className="w-3 h-3" /> }
                    ];

                    return (
                        <div className="space-y-10 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        {
                                            label: 'Total Students',
                                            value: students.length,
                                            icon: <Users className="w-6 h-6" />,
                                            color: 'cyan'
                                        },
                                        {
                                            label: 'Teachers',
                                            value: schoolProfile?.faculty?.length || 0,
                                            icon: <UserCircle className="w-6 h-6" />,
                                            color: 'purple'
                                        },
                                        {
                                            label: 'Active Classes',
                                            value: classrooms.length,
                                            icon: <BookOpen className="w-6 h-6" />,
                                            color: 'pink'
                                        }
                                    ].map((stat, i) => (
                                        <div
                                            key={i}
                                            className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/50 hover:border-white/10 cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${stat.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-400' :
                                                    stat.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                                                        'bg-pink-500/10 text-pink-400'
                                                    }`}>
                                                    {stat.icon}
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <div className="text-3xl md:text-4xl font-bold text-white tracking-tight">{stat.value}</div>
                                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1 group-hover:text-gray-400 transition-colors">{stat.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Health Score Card */}
                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 rounded-2xl p-6 hover:shadow-cyan-500/10 transition-all group relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-neon-cyan/5 rounded-full blur-3xl group-hover:bg-neon-cyan/10 transition-all"></div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className="text-[10px] font-black text-neon-cyan uppercase tracking-[0.2em]">Health Score</span>
                                            <div className="text-4xl font-black text-white mt-1 italic">{healthScore}<span className="text-lg text-gray-700 not-italic ml-1">/100</span></div>
                                        </div>
                                        <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-neon-cyan flex items-center justify-center">
                                            <Star className="w-5 h-5 text-neon-cyan animate-pulse" />
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                                        <div className="h-full bg-neon-cyan transition-all duration-1000" style={{ width: `${healthScore}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-4 leading-relaxed font-medium">Overall operational health of your school system.</p>
                                </div>
                            </div>

                            {/* Activity and Suggestions Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Activity Timeline */}
                                <div className="lg:col-span-2 bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                            <Activity className="w-5 h-5 text-purple-400" />
                                            Recent Activity
                                        </h3>
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Real-time Insight</span>
                                    </div>

                                    <div className="relative pl-4 space-y-6 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-purple-500/50 before:to-transparent">
                                        {mockActivities.length > 0 ? mockActivities.map((act, i) => (
                                            <div key={i} className="relative group pl-6">
                                                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-purple-500 group-hover:scale-125 transition-transform shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                                                    <span className="text-sm text-gray-200 font-medium group-hover:text-white transition-colors">{act.text}</span>
                                                    <span className="text-[10px] text-gray-500 font-bold whitespace-nowrap">{act.time}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-4 text-center">
                                                <p className="text-sm text-gray-500 italic">No recent activity. Start managing your school to see updates here.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Smart Suggestions */}
                                <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6 space-y-6">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                        <Award className="w-5 h-5 text-orange-400" />
                                        System Suggestions
                                    </h3>

                                    <div className="space-y-4">
                                        {students.length === 0 && (
                                            <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl group hover:border-neon-cyan/30 transition-all active:scale-95 cursor-pointer">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center shrink-0">
                                                        <UserPlus className="w-4 h-4 text-neon-cyan" />
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed font-medium">You haven't added students yet. Consider <span className="text-neon-cyan font-bold">creating your first class</span> to begin.</p>
                                                </div>
                                            </div>
                                        )}
                                        {schoolProfile?.faculty?.length === 0 && (
                                            <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl group hover:border-purple-500/30 transition-all active:scale-95 cursor-pointer">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                                        <UserCircle className="w-4 h-4 text-purple-400" />
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed font-medium">No teachers assigned. <span className="text-purple-400 font-bold">Add teachers</span> to activate classes and start curriculum tracking.</p>
                                                </div>
                                            </div>
                                        )}
                                        {classrooms.length > 0 && students.length > 0 && (
                                            <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl group hover:border-green-500/30 transition-all active:scale-95 cursor-pointer">
                                                <div className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed font-medium">Looking good! <span className="text-green-400 font-bold">Post a notice</span> to welcome your community to the platform.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Management */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="h-6 w-1 bg-neon-cyan rounded-full"></div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Quick Management</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Add Student', icon: <UserPlus className="w-5 h-5" />, action: () => { handleTabChange('CLASSES'); setIsAddingSection(false); }, color: 'from-cyan-500/10 to-transparent', hoverBorder: 'hover:border-cyan-500/40' },
                                        { label: 'Add Teacher', icon: <Plus className="w-5 h-5" />, action: () => handleTabChange('ATTENDANCE'), color: 'from-purple-500/10 to-transparent', hoverBorder: 'hover:border-purple-500/40' },
                                        { label: 'Create Class', icon: <Plus className="w-5 h-5" />, action: () => { handleTabChange('CLASSES'); setIsAddingSection(true); }, color: 'from-green-500/10 to-transparent', hoverBorder: 'hover:border-green-500/40' },
                                        { label: 'Post Notice', icon: <Megaphone className="w-5 h-5" />, action: () => handleTabChange('ANNOUNCEMENTS'), color: 'from-orange-500/10 to-transparent', hoverBorder: 'hover:border-orange-500/40' }
                                    ].map((btn, i) => (
                                        <button
                                            key={i}
                                            onClick={btn.action}
                                            className={`flex flex-col items-center justify-center p-6 gap-3 bg-gradient-to-b ${btn.color} border border-white/5 rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${btn.hoverBorder} group`}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                                {btn.icon}
                                            </div>
                                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{btn.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Institution Details Improved */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-slate-900 border border-white/5 rounded-2xl p-8 space-y-6">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <School className="w-5 h-5 text-neon-cyan" />
                                        Institution Details
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-black">Official Name</span>
                                                <span className="text-white font-bold">{schoolName}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-black">Administration Email</span>
                                                <span className="text-white font-medium">{schoolProfile?.adminEmail || 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-black">Enrollment Capacity</span>
                                                <span className="text-white font-bold">{schoolProfile?.maxStudents || '500'} Students</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-gray-500 uppercase font-black">Current Motto</span>
                                                <span className="text-gray-400 italic text-sm">"{schoolProfile?.motto || 'Empowering through AI'}"</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-2xl p-8 flex flex-col justify-center text-center group">
                                    <div className="relative mb-4">
                                        <Medal className="w-12 h-12 text-yellow-500 mx-auto transition-transform group-hover:scale-110 duration-300" />
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-yellow-500/20 blur-xl rounded-full"></div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Power Admin</h3>
                                    <p className="text-gray-400 text-sm mb-6">Manage institutional growth with our quantum intelligence tools.</p>
                                    <div className="pt-4 border-t border-white/5">
                                        <div className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-widest">Active System Modules</div>
                                        <div className="flex flex-wrap justify-center gap-2 text-[10px] font-bold">
                                            <span className="px-2 py-1 rounded bg-green-500/10 text-green-400">Attendance</span>
                                            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400">LMS</span>
                                            <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400">AI Tutor</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* LEADERBOARD TAB */}
                {activeTab === 'LEADERBOARD' && (
                    <div className="space-y-6">
                        <AdminLeaderboardManager
                            students={students}
                            classrooms={classrooms}
                        />
                    </div>
                )}

                {/* TEACHERS TAB */}
                {activeTab === 'TEACHERS' && (
                    <div className="space-y-6">
                        {/* Level 3: Class Detail View */}
                        {selectedClassForDetail ? (
                            <TeacherClassDetailView
                                classroom={selectedClassForDetail}
                                students={students.filter(s => s.classId === selectedClassForDetail.id)}
                                onBack={() => setSelectedClassForDetail(null)}
                                onStudentClick={(student) => setShowStudentAnalytics(student)}
                            />
                        ) : selectedTeacher ? (
                            /* Level 2: Teacher Detail View */
                            <div className="space-y-6">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setSelectedTeacher(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center text-2xl text-purple-400 font-bold">
                                            {selectedTeacher.name?.charAt(0) || 'T'}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">{selectedTeacher.name}</h2>
                                            <p className="text-gray-400">{selectedTeacher.email} • {selectedTeacher.subject || 'General'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Assigned Classes */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-white">Assigned Classes</h3>
                                    <NeonButton
                                        size="sm"
                                        onClick={() => setShowAssignModal(true)}
                                        className="flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Assign Classes
                                    </NeonButton>
                                </div>

                                {selectedTeacher.assignedClasses?.length === 0 ? (
                                    <NeonCard className="p-8 text-center" glowColor="purple">
                                        <UserCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-400 mb-4">No classes assigned yet</p>
                                        <NeonButton onClick={() => setShowAssignModal(true)} glow>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Assign Classes Now
                                        </NeonButton>
                                    </NeonCard>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(selectedTeacher.assignedClasses || []).map(classId => {
                                            const cls = classrooms.find(c => c.id === classId);
                                            if (!cls) return null;
                                            const studentCount = students.filter(s => s.classId === classId).length;
                                            return (
                                                <NeonCard
                                                    key={classId}
                                                    className="p-4 cursor-pointer hover:border-neon-cyan/50 transition-all"
                                                    onClick={() => setSelectedClassForDetail(cls)}
                                                >
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <Folder className="w-8 h-8 text-neon-cyan" />
                                                        <div>
                                                            <h4 className="font-bold text-white">{cls.name}</h4>
                                                            <p className="text-sm text-gray-400">Section {cls.section}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-gray-400">{studentCount} Students</span>
                                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                </NeonCard>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Level 1: Teacher List */
                            <>
                                <h2 className="text-2xl font-bold text-white">Faculty Management</h2>
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    {(schoolProfile?.faculty || []).length === 0 ? (
                                        <div className="p-12 text-center text-gray-500">No teachers registered yet.</div>
                                    ) : (
                                        (schoolProfile?.faculty || []).map((teacher: Teacher) => (
                                            <div
                                                key={teacher.id}
                                                className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-all"
                                                onClick={() => setSelectedTeacher(teacher)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                                                        {teacher.name?.charAt(0) || 'T'}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">{teacher.name}</p>
                                                        <p className="text-xs text-gray-400">{teacher.email} • {teacher.subject || 'General'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2 py-1 rounded text-xs ${(teacher.assignedClasses?.length || 0) > 0
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-orange-500/20 text-orange-400'
                                                        }`}>
                                                        {teacher.assignedClasses?.length || 0} Classes
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}

                        {/* Assign Classes Modal */}
                        {showAssignModal && selectedTeacher && onUpdateTeacher && (
                            <Suspense fallback={null}>
                                <AssignClassesModal
                                    teacher={selectedTeacher}
                                    availableClasses={classrooms}
                                    onSave={async (teacherId, classIds) => {
                                        await onUpdateTeacher(teacherId, classIds);
                                        setSelectedTeacher({ ...selectedTeacher, assignedClasses: classIds });
                                        setShowAssignModal(false);
                                    }}
                                    onClose={() => setShowAssignModal(false)}
                                />
                            </Suspense>
                        )}
                    </div>
                )}

                {/* STUDENTS TAB - Grade → Section → Search Drill-Down */}
                {activeTab === 'STUDENTS' && (() => {
                    // Helper to get classes for a grade
                    const getClassesForGrade = (grade: string) => {
                        const activeClassrooms = classrooms.filter(c => c.status !== 'ARCHIVED');
                        if (grade.includes('KG')) return activeClassrooms.filter(c => c.name.includes(grade));
                        return activeClassrooms.filter(c => {
                            // Match exact "Grade X" or "Grade X ..." or "Grade X-..." but NOT "Grade 10" when searching for "Grade 1"
                            return c.name === grade ||
                                c.name.startsWith(grade + ' ') ||
                                c.name.startsWith(grade + '-');
                        });
                    };

                    // Identify Unassigned Students
                    const unassignedStudents = students.filter(s => !s.classId && (!s.classIds || s.classIds.length === 0));

                    const studentsToShow = studentViewClassId === 'UNASSIGNED'
                        ? unassignedStudents
                        : studentViewClassId
                            ? students.filter(s => s.classId === studentViewClassId)
                            : [];

                    // Filter by search query
                    const filteredStudents = studentsToShow.filter(s => {
                        if (!studentSearchQuery) return true;
                        const query = studentSearchQuery.toLowerCase();
                        return s.name?.toLowerCase().includes(query) ||
                            s.rollNumber?.toLowerCase().includes(query);
                    });

                    const currentSectionData = classrooms.find(c => c.id === studentViewClassId);

                    // GRADES VIEW (with global search)
                    if (!studentViewGrade && !studentViewClassId) {
                        const GradeCard = ({ grade, color }: { grade: string, color: string }) => {
                            const count = getClassesForGrade(grade).length;
                            const studentCount = students.filter(s => getClassesForGrade(grade).some(c => c.id === s.classId)).length;
                            return (
                                <NeonCard
                                    glowColor={color as any}
                                    className="cursor-pointer hover:scale-105 transition-transform min-h-[100px] flex flex-col justify-center items-center"
                                    onClick={() => setStudentViewGrade(grade)}
                                >
                                    <h4 className="text-2xl font-bold text-white mb-1">{grade}</h4>
                                    <p className="text-gray-400 text-sm">{count} Sections • {studentCount} Students</p>
                                </NeonCard>
                            );
                        };

                        // Global search results
                        const globalSearchResults = studentSearchQuery
                            ? students.filter(s => {
                                const query = studentSearchQuery.toLowerCase();
                                return s.name?.toLowerCase().includes(query) || s.rollNumber?.toLowerCase().includes(query);
                            })
                            : [];

                        return (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white">Students by Grade</h2>
                                    {/* Global Search Bar */}
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="🔍 Quick search by name or roll..."
                                            value={studentSearchQuery}
                                            onChange={e => setStudentSearchQuery(e.target.value)}
                                            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan w-80"
                                        />
                                    </div>
                                </div>

                                {/* Unassigned Students Alert */}
                                {unassignedStudents.length > 0 && !studentSearchQuery && (
                                    <NeonCard
                                        glowColor="red"
                                        className="p-4 flex items-center justify-between cursor-pointer border-red-500/30 hover:bg-red-500/5 transition-all"
                                        onClick={() => setStudentViewClassId('UNASSIGNED')}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                                                <AlertTriangle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">Action Required: Unassigned Students</h3>
                                                <p className="text-red-300">
                                                    There are {unassignedStudents.length} students who have not joined any class yet.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-red-400 font-bold">
                                            View List <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </NeonCard>
                                )}

                                {/* Show search results if searching */}
                                {studentSearchQuery && (
                                    <div className="animate-fade-in">
                                        <h3 className="text-lg font-bold text-neon-cyan mb-4">
                                            Search Results ({globalSearchResults.length} found)
                                        </h3>
                                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden max-h-[400px] overflow-y-auto">
                                            {globalSearchResults.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500">
                                                    No students match "{studentSearchQuery}"
                                                </div>
                                            ) : globalSearchResults.map(student => {
                                                const cls = classrooms.find(c => c.id === student.classId);
                                                return (
                                                    <div
                                                        key={student.id}
                                                        className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors"
                                                        onClick={() => {
                                                            if (cls) {
                                                                // Navigate to CLASSES tab and open the student's section
                                                                setStudentSearchQuery('');
                                                                handleTabChange('CLASSES');
                                                                // Extract grade from class name (e.g., "Grade 5 - Section A" → "Grade 5")
                                                                const grade = cls.name.split(' - ')[0].trim();
                                                                setSelectedGrade(grade);
                                                                setClassView('SECTIONS');
                                                                setSelectedClassIdForView(cls.id);
                                                                // After a tick, switch to STUDENTS view
                                                                setTimeout(() => setClassView('STUDENTS'), 100);
                                                            } else {
                                                                // No class - show student analytics modal
                                                                setShowStudentAnalytics(student);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                                                {student.name?.charAt(0) || 'S'}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold">{student.name}</p>
                                                                <p className="text-xs text-gray-400">
                                                                    Roll: {student.rollNumber || 'N/A'} • {cls ? `${cls.name} - Section ${cls.section}` : 'No Class'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-sm text-gray-400">Score: {student.avgScore}%</span>
                                                            <span className={`px-2 py-1 rounded text-xs ${student.status === 'At Risk' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                                {student.status}
                                                            </span>
                                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Show grade cards when not searching */}
                                {!studentSearchQuery && (
                                    <>
                                        <div>
                                            <h3 className="text-xl font-bold text-purple-400 mb-4">Pre-Primary</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <GradeCard grade="KG1" color="purple" />
                                                <GradeCard grade="KG2" color="purple" />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-green-400 mb-4">Primary</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                {[1, 2, 3, 4, 5].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="green" />)}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-yellow-400 mb-4">Middle</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {[6, 7, 8].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="cyan" />)}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-pink-400 mb-4">Secondary</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {[9, 10].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="red" />)}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-blue-400 mb-4">Senior Secondary</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {[11, 12].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="blue" />)}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    }

                    // SECTIONS VIEW
                    if (studentViewGrade && !studentViewClassId) {
                        const currentClasses = getClassesForGrade(studentViewGrade);
                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setStudentViewGrade('')} className="p-2 hover:bg-white/10 rounded-full">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <h2 className="text-2xl font-bold text-white">{studentViewGrade} - Select Section</h2>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {currentClasses.map(c => {
                                        const studentCount = students.filter(s => s.classId === c.id).length;
                                        return (
                                            <NeonCard
                                                key={c.id}
                                                glowColor="cyan"
                                                className="cursor-pointer hover:scale-105 transition-transform p-4"
                                                onClick={() => setStudentViewClassId(c.id)}
                                            >
                                                <h3 className="text-xl font-bold text-white mb-2">Section {c.section}</h3>
                                                <p className="text-gray-400 text-sm">{studentCount} Students</p>
                                            </NeonCard>
                                        );
                                    })}
                                    {currentClasses.length === 0 && (
                                        <div className="col-span-full text-center py-8 text-gray-500">No sections for {studentViewGrade}</div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // STUDENT LIST VIEW (Specific Section OR Unassigned)
                    if (studentViewClassId) {
                        const isUnassignedView = studentViewClassId === 'UNASSIGNED';
                        const viewTitle = isUnassignedView ? 'Unassigned Students' : `${currentSectionData?.name} - Section ${currentSectionData?.section}`;

                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setStudentViewClassId('')} className="p-2 hover:bg-white/10 rounded-full">
                                            <ArrowLeft className="w-5 h-5 text-white" />
                                        </button>
                                        <h2 className={`text-2xl font-bold ${isUnassignedView ? 'text-red-400' : 'text-white'}`}>
                                            {isUnassignedView && <AlertTriangle className="w-6 h-6 inline mr-2" />}
                                            {viewTitle}
                                        </h2>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or roll..."
                                                value={studentSearchQuery}
                                                onChange={e => setStudentSearchQuery(e.target.value)}
                                                className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-cyan w-64"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden max-h-[500px] overflow-y-auto">
                                    {filteredStudents.length === 0 ? (
                                        <div className="p-12 text-center text-gray-500">
                                            {studentSearchQuery ? 'No students match your search' : 'No students found'}
                                        </div>
                                    ) : filteredStudents.map(student => (
                                        <div
                                            key={student.id}
                                            className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setShowStudentAnalytics(student)}>
                                                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                                    {student.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{student.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        Roll: {student.rollNumber || 'N/A'} {student.grade ? `• ${student.grade}` : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Assignment Action (Only in Unassigned View) */}
                                            {isUnassignedView && onUpdateStudent ? (
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <select
                                                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500"
                                                        onChange={(e) => {
                                                            const selectedClassId = e.target.value;
                                                            if (!selectedClassId) return;
                                                            if (window.confirm(`Assign ${student.name} to this class?`)) {
                                                                const studentToUpdate: Student = {
                                                                    ...student,
                                                                    classId: selectedClassId,
                                                                    classIds: [selectedClassId]
                                                                };
                                                                onUpdateStudent(studentToUpdate);
                                                            }
                                                            e.target.value = ""; // Reset
                                                        }}
                                                        defaultValue=""
                                                    >
                                                        <option value="" disabled>Assign Class</option>
                                                        {(() => {
                                                            // Filter classes: Active, and if student has grade, match it
                                                            // Logic: If student.grade is "Grade 10", show classes that start with "Grade 10"
                                                            // Or show all if no grade metadata
                                                            const validClasses = classrooms.filter(c =>
                                                                c.status !== 'ARCHIVED' &&
                                                                (!student.grade || c.name.startsWith(student.grade))
                                                            );
                                                            return validClasses.length > 0
                                                                ? validClasses.map(c => (
                                                                    <option key={c.id} value={c.id}>
                                                                        {c.name} - Sec {c.section}
                                                                    </option>
                                                                ))
                                                                : <option disabled>No matching classes</option>;
                                                        })()}
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm text-gray-400">Score: {student.avgScore}%</span>
                                                    <span className={`px-2 py-1 rounded text-xs ${student.status === 'At Risk' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {student.status}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return null;
                })()}

                {/* MANAGE CLASSES TAB - Grade Hierarchy */}
                {activeTab === 'CLASSES' && (() => {
                    // Helper to get ACTIVE classes for a grade (exclude archived)
                    const getClassesForGrade = (grade: string) => {
                        const activeClassrooms = classrooms.filter(c => c.status !== 'ARCHIVED');
                        if (grade.includes('KG')) return activeClassrooms.filter(c => c.name.includes(grade));
                        return activeClassrooms.filter(c => {
                            // Match exact "Grade X" or "Grade X ..." or "Grade X-..."
                            const baseName = c.name.split('-')[0].trim();
                            return baseName === grade;
                        });
                    };

                    // Filter classes by Grade AND Subject for Sections View
                    const getClassesForSubject = (grade: string, subject: string) => {
                        return classrooms.filter(c => {
                            if (c.status === 'ARCHIVED') return false;
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
                            const sub = c.subject || (c.name.includes('-') ? c.name.split('-')[1].trim() : 'General');
                            subjects.add(sub);
                        });
                        return Array.from(subjects).sort();
                    };

                    // Get archived classes for restore view
                    const archivedClasses = classrooms.filter(c => c.status === 'ARCHIVED');

                    const currentClasses = getClassesForSubject(selectedGrade, selectedSubject);
                    const currentSubjects = getSubjectsForGrade(selectedGrade);
                    const currentClassData = classrooms.find(c => c.id === selectedClassIdForView);
                    const currentStudents = students.filter(s => s.classId === selectedClassIdForView);

                    const handleGradeClick = (grade: string) => {
                        setSelectedGrade(grade);
                        setClassView('SUBJECTS');
                    };

                    const handleSubjectClick = (subject: string) => {
                        setSelectedSubject(subject);
                        setClassView('SECTIONS');
                    };

                    const handleAddSubject = () => {
                        if (!newSubjectName || !onCreateClass) return;
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

                        // Check for duplicates: same grade + section name already exists
                        const existingMatch = currentClasses.find(
                            c => c.section?.toLowerCase() === newSectionName.toLowerCase()
                        );
                        if (existingMatch) {
                            alert(`Section "${newSectionName}" already exists for ${selectedGrade}. Please use a different section name.`);
                            return;
                        }

                        onCreateClass({
                            name: selectedGrade,
                            section: newSectionName,
                            motto: 'Excellence',
                            subjects: selectedSubject
                        });
                        setNewSectionName('');
                        setIsAddingSection(false);
                    };

                    // Grade Card Component
                    const GradeCard = ({ grade, color }: { grade: string, color: string }) => {
                        const count = getClassesForGrade(grade).length;
                        return (
                            <NeonCard
                                glowColor={color as any}
                                className="cursor-pointer hover:scale-105 transition-transform min-h-[120px] flex flex-col justify-center items-center"
                                onClick={() => handleGradeClick(grade)}
                            >
                                <h4 className="text-2xl font-bold text-white mb-2">{grade}</h4>
                                <p className="text-gray-400">{getSubjectsForGrade(grade).length} Subjects</p>
                            </NeonCard>
                        );
                    };

                    // ARCHIVED VIEW
                    if (showArchived) {
                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setShowArchived(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <h3 className="text-xl font-bold text-red-400 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" />
                                        Archived Classes
                                        <span className="text-xs text-gray-500 font-normal ml-2">Auto-purged after 7 days</span>
                                    </h3>
                                </div>

                                {archivedClasses.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500 bg-white/5 rounded-xl border border-white/10">
                                        <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        No archived classes found.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {archivedClasses.map(c => {
                                            const archivedDate = c.archivedAt ? new Date(c.archivedAt) : new Date();
                                            const expiryDate = new Date(archivedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                                            const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

                                            return (
                                                <NeonCard key={c.id} glowColor="red" className="p-4 opacity-80">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-white">{c.name}</h4>
                                                            <p className="text-xs text-gray-500">Section {c.section}</p>
                                                        </div>
                                                        <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
                                                            {daysRemaining} days left
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-400 mb-3">
                                                        {students.filter(s => s.classId === c.id).length} students
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="flex-1 py-2 px-4 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 font-bold flex items-center justify-center gap-2"
                                                            onClick={() => {
                                                                if (onRestoreClass) onRestoreClass(c.id);
                                                            }}
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                            Restore
                                                        </button>
                                                    </div>
                                                </NeonCard>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // GRADES VIEW
                    if (classView === 'GRADES') {
                        return (
                            <div className="space-y-8 animate-fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-white">Class Management</h2>
                                    <NeonButton
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setShowArchived(true)}
                                        className="flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Archived
                                    </NeonButton>
                                </div>

                                {/* Pre-Primary */}
                                <div>
                                    <h3 className="text-xl font-bold text-purple-400 mb-4 border-b border-white/10 pb-2">Pre-Primary</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <GradeCard grade="KG1" color="purple" />
                                        <GradeCard grade="KG2" color="purple" />
                                    </div>
                                </div>

                                {/* Primary */}
                                <div>
                                    <h3 className="text-xl font-bold text-green-400 mb-4 border-b border-white/10 pb-2">Primary</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {[1, 2, 3, 4, 5].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="green" />)}
                                    </div>
                                </div>

                                {/* Middle */}
                                <div>
                                    <h3 className="text-xl font-bold text-yellow-400 mb-4 border-b border-white/10 pb-2">Middle</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {[6, 7, 8].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="cyan" />)}
                                    </div>
                                </div>

                                {/* Secondary */}
                                <div>
                                    <h3 className="text-xl font-bold text-pink-400 mb-4 border-b border-white/10 pb-2">Secondary</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                                        {[9, 10].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="red" />)}
                                    </div>
                                </div>

                                {/* Senior Secondary */}
                                <div>
                                    <h3 className="text-xl font-bold text-blue-400 mb-4 border-b border-white/10 pb-2">Senior Secondary</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[11, 12].map(g => <GradeCard key={g} grade={`Grade ${g}`} color="blue" />)}
                                    </div>
                                </div>


                            </div>
                        );
                    }

                    // SUBJECTS VIEW
                    if (classView === 'SUBJECTS') {
                        const RECOMMENDED_SUBJECTS = ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi', 'Computer Science', 'EVS', 'Arts', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'Economics', 'Accountancy', 'Business Studies'];
                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setClassView('GRADES')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <h2 className="text-2xl font-bold text-white">{selectedGrade} <span className="text-gray-500 text-lg">/ Subjects</span></h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {/* Add Subject Card */}
                                    <NeonCard className="border-dashed border-2 border-white/20 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:bg-white/5" onClick={() => setIsAddingSubject(true)}>
                                        {isAddingSubject ? (
                                            <div className="w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
                                                <Input
                                                    autoFocus
                                                    placeholder="Subject Name"
                                                    value={newSubjectName}
                                                    onChange={e => setNewSubjectName(e.target.value)}
                                                    list="admin-subject-suggestions"
                                                />
                                                <datalist id="admin-subject-suggestions">
                                                    {RECOMMENDED_SUBJECTS.map(s => <option key={s} value={s} />)}
                                                </datalist>
                                                <div className="flex gap-2">
                                                    <NeonButton size="sm" onClick={handleAddSubject}>Create</NeonButton>
                                                    <button onClick={() => setIsAddingSubject(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Plus className="w-10 h-10 text-gray-400 mb-2" />
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
                                                className="cursor-pointer hover:scale-105 transition-transform flex flex-col justify-center items-center p-4 min-h-[180px]"
                                                onClick={() => handleSubjectClick(subject)}
                                            >
                                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                                                    <BookOpen className="w-6 h-6 text-blue-400" />
                                                </div>
                                                <h4 className="text-xl font-bold text-white mb-2">{subject}</h4>
                                                <p className="text-gray-400 text-sm">{subjectClasses.length} Sections</p>
                                            </NeonCard>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // SECTIONS VIEW
                    if (classView === 'SECTIONS') {
                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setClassView('SUBJECTS')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <h2 className="text-2xl font-bold text-white">{selectedGrade} <span className="text-neon-cyan">{selectedSubject}</span> <span className="text-gray-500 text-lg">/ Sections</span></h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {/* Add Section Card */}
                                    <NeonCard
                                        className="border-dashed border-2 border-white/20 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:bg-white/5"
                                        onClick={() => setIsAddingSection(true)}
                                    >
                                        {isAddingSection ? (
                                            <div className="w-full p-4 space-y-3" onClick={e => e.stopPropagation()}>
                                                <Input
                                                    autoFocus
                                                    placeholder="Section Name (e.g. A)"
                                                    value={newSectionName}
                                                    onChange={e => setNewSectionName(e.target.value)}
                                                />
                                                <div className="flex gap-2">
                                                    <NeonButton size="sm" onClick={handleAddSection}>Create</NeonButton>
                                                    <button onClick={() => setIsAddingSection(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Plus className="w-10 h-10 text-gray-400 mb-2" />
                                                <span className="text-gray-400 font-bold">Add Section</span>
                                            </>
                                        )}
                                    </NeonCard>

                                    {/* Existing Sections */}
                                    {currentClasses.map(c => {
                                        const studentCount = students.filter(s => s.classId === c.id).length;
                                        const isLocked = c.status === 'LOCKED';
                                        return (
                                            <NeonCard
                                                key={c.id}
                                                glowColor={isLocked ? "red" : "cyan"}
                                                className={`cursor-pointer hover:scale-105 transition-transform p-4 ${isLocked ? 'opacity-80' : ''}`}
                                                onClick={() => {
                                                    setSelectedClassIdForView(c.id);
                                                    setClassView('STUDENTS');
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-xl font-bold text-white">Section {c.section}</h3>
                                                        {isLocked && (
                                                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs flex items-center gap-1">
                                                                <Lock className="w-3 h-3" /> Locked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">{studentCount} Students</span>
                                                </div>
                                                <p className="text-gray-400 text-sm">{c.name}</p>

                                                {/* Action Buttons */}
                                                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                                    <span
                                                        className="text-xs text-neon-cyan flex items-center gap-2 cursor-pointer hover:text-white"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(c.inviteCode);
                                                        }}
                                                    >
                                                        Code: {c.inviteCode} <Copy className="w-3 h-3" />
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        {/* Add Student Button */}
                                                        <button
                                                            className={`p-1.5 rounded ${isLocked ? 'bg-gray-500/20 text-gray-500 cursor-not-allowed' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!isLocked) {
                                                                    setAddStudentClassId(c.id);
                                                                    setShowAddStudentModal(true);
                                                                }
                                                            }}
                                                            title={isLocked ? "Class is locked" : "Add Student"}
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                        </button>
                                                        {/* Lock/Unlock Toggle */}
                                                        <button
                                                            className={`p-1.5 rounded ${isLocked ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onToggleClassLock) onToggleClassLock(c.id, !isLocked);
                                                            }}
                                                            title={isLocked ? "Unlock Class" : "Lock Class"}
                                                        >
                                                            {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                                        </button>
                                                        {/* Delete/Archive Button */}
                                                        <button
                                                            className="p-1.5 rounded bg-red-600/20 text-red-500 hover:bg-red-600/40"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`⚠️ DELETE SECTION\n\nAre you sure you want to delete "${c.name}"?\n\nThis section will be moved to Archive and permanently deleted after 7 days if not restored.`)) {
                                                                    if (onArchiveClass) onArchiveClass(c.id);
                                                                }
                                                            }}
                                                            title="Delete Section"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {c.subjects && c.subjects.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {c.subjects.slice(0, 3).map(sub => (
                                                            <span key={sub.id} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">{sub.name}</span>
                                                        ))}
                                                        {c.subjects.length > 3 && <span className="text-xs text-gray-500">+{c.subjects.length - 3}</span>}
                                                    </div>
                                                )}
                                            </NeonCard>
                                        );
                                    })}

                                    {currentClasses.length === 0 && !isAddingSection && (
                                        <div className="col-span-full text-center py-8 text-gray-500">No sections created for {selectedGrade} yet</div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    // STUDENTS VIEW
                    if (classView === 'STUDENTS' && currentClassData) {
                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-4 mb-6">
                                    <button onClick={() => setClassView('SECTIONS')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                        <ArrowLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{currentClassData.name} - Section {currentClassData.section}</h2>
                                        <p className="text-gray-400 text-sm">Invite Code: {currentClassData.inviteCode}</p>
                                    </div>
                                </div>

                                {/* Subjects */}
                                {currentClassData.subjects && currentClassData.subjects.length > 0 && (
                                    <NeonCard className="p-4">
                                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-purple-400" /> Subjects
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {currentClassData.subjects.map(sub => (
                                                <span key={sub.id} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">{sub.name}</span>
                                            ))}
                                        </div>
                                    </NeonCard>
                                )}

                                {/* Students List */}
                                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <div className="p-4 border-b border-white/10">
                                        <h3 className="text-lg font-bold text-white">Students ({currentStudents.length})</h3>
                                    </div>
                                    {currentStudents.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500">No students enrolled yet</div>
                                    ) : currentStudents.map(student => (
                                        <div key={student.id} className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                                                    {student.name?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold">{student.name}</p>
                                                    <p className="text-xs text-gray-400">Roll: {student.rollNumber || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-400">Score: {student.avgScore}%</span>
                                                <span className={`px-2 py-1 rounded text-xs ${student.status === 'At Risk' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                                    {student.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return null;
                })()}


                {/* ARCHIVED CLASSES LOGIC (Merged into MANAGE CLASSES via toggles) */}
                {/* Previous separate MANAGE CLASSES tab removed. Logic integrated above. */}


                {/* ATTENDANCE TAB */}
                {activeTab === 'ATTENDANCE' && renderAttendanceContent()}

                {/* LEADERBOARD TAB */}
                {activeTab === 'LEADERBOARD' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">School Leaderboard</h2>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            {[...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 20).map((student, idx) => {
                                const cls = classrooms.find(c => c.id === student.classId);
                                return (
                                    <div key={student.id} className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx < 3 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/10 text-gray-400'}`}>
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{student.name}</p>
                                                <p className="text-xs text-gray-400">{cls ? `${cls.name} - ${cls.section}` : 'No Class'}</p>
                                            </div>
                                        </div>
                                        <div className="text-xl font-bold text-neon-cyan">{student.avgScore}%</div>
                                    </div>
                                );
                            })}
                            {students.length === 0 && <div className="p-12 text-center text-gray-500">No students to rank.</div>}
                        </div>
                    </div>
                )}

                {/* ANNOUNCEMENTS TAB - UPGRADED */}
                {activeTab === 'ANNOUNCEMENTS' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                        {/* Form Column */}
                        <div className="lg:col-span-7 space-y-6">
                            <NeonCard className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 border-white/5 rounded-2xl">
                                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-neon-purple" />
                                    Post Announcement
                                </h3>

                                <div className="space-y-6">
                                    {/* 1. Target Audience Selector */}
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Target Audience</label>
                                        <div className="flex gap-4">
                                            <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${targetMode === 'ALL' ? 'bg-neon-purple/10 border-neon-purple text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10'}`}>
                                                <input type="radio" name="targetMode" className="hidden" checked={targetMode === 'ALL'} onChange={() => { setTargetMode('ALL'); setSelectedRoles([]); }} />
                                                <Globe className="w-4 h-4" />
                                                <span className="text-sm font-bold">All Users</span>
                                            </label>
                                            <label className={`flex-1 flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${targetMode === 'CUSTOM' ? 'bg-neon-cyan/10 border-neon-cyan text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10'}`}>
                                                <input type="radio" name="targetMode" className="hidden" checked={targetMode === 'CUSTOM'} onChange={() => setTargetMode('CUSTOM')} />
                                                <Users className="w-4 h-4" />
                                                <span className="text-sm font-bold">Custom Selection</span>
                                            </label>
                                        </div>

                                        {targetMode === 'CUSTOM' && (
                                            <div className="grid grid-cols-3 gap-3 animate-slide-up">
                                                {['STUDENTS', 'TEACHERS', 'PARENTS'].map(role => (
                                                    <label key={role} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${selectedRoles.includes(role) ? 'bg-white/10 border-white/20 text-white' : 'bg-black/20 border-white/5 text-gray-500'}`}>
                                                        <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-black/40 text-neon-purple focus:ring-neon-purple" checked={selectedRoles.includes(role)} onChange={() => handleRoleToggle(role)} />
                                                        <span className="text-xs font-bold">{role}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 2. Conditional Filters */}
                                    {targetMode === 'CUSTOM' && (selectedRoles.includes('STUDENTS') || selectedRoles.includes('TEACHERS') || selectedRoles.includes('PARENTS')) && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                                            {(selectedRoles.includes('STUDENTS') || selectedRoles.includes('PARENTS')) && (
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Class Filter</label>
                                                    <select
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-neon-cyan focus:outline-none"
                                                        value={audienceFilters.classId}
                                                        onChange={e => setAudienceFilters({ ...audienceFilters, classId: e.target.value })}
                                                    >
                                                        <option value="">All Classes</option>
                                                        {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {selectedRoles.includes('TEACHERS') && (
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Subject Filter</label>
                                                    <select
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-neon-purple focus:outline-none"
                                                        value={audienceFilters.subject}
                                                        onChange={e => setAudienceFilters({ ...audienceFilters, subject: e.target.value })}
                                                    >
                                                        <option value="">All Subjects</option>
                                                        {Array.from(new Set(classrooms.map(c => c.subject || 'General'))).map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. Content Section */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Title</label>
                                                <Input
                                                    placeholder="Enter announcement title..."
                                                    value={announcementTitle}
                                                    onChange={e => setAnnouncementTitle(e.target.value)}
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Type</label>
                                                <select
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:border-neon-pink focus:outline-none"
                                                    value={announcementLevel}
                                                    onChange={e => setAnnouncementLevel(e.target.value as any)}
                                                >
                                                    {Object.entries(LEVEL_CONFIG).map(([key, cfg]) => (
                                                        <option key={key} value={key}>{cfg.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Message</label>
                                            <textarea
                                                className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white resize-none placeholder-gray-600 focus:border-neon-purple focus:outline-none transition-all"
                                                placeholder="Write your message here..."
                                                value={announcementContent}
                                                onChange={e => setAnnouncementContent(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <NeonButton
                                        className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 group overflow-hidden relative"
                                        glowColor={announcementLevel === 'URGENT' ? 'red' : 'purple'}
                                        disabled={!announcementTitle.trim() || !announcementContent.trim() || (targetMode === 'CUSTOM' && selectedRoles.length === 0) || isPosting}
                                        onClick={async () => {
                                            if (!onPostAnnouncement) return;
                                            setIsPosting(true);
                                            try {
                                                const combinedContent = `${announcementTitle}\n\n${announcementContent}`;
                                                // Map announcementLevel to existing types for compatibility
                                                const apiType = announcementLevel === 'GENERAL' ? 'THOUGHT' : 'NOTICE';

                                                await onPostAnnouncement(
                                                    combinedContent,
                                                    apiType,
                                                    audienceFilters.classId || undefined,
                                                    audienceFilters.classId ? classrooms.find(c => c.id === audienceFilters.classId)?.name : undefined
                                                );

                                                // Reset form
                                                setAnnouncementTitle('');
                                                setAnnouncementContent('');
                                                setSelectedRoles([]);
                                                setTargetMode('ALL');
                                                setAudienceFilters({ classId: '', subject: '' });
                                                alert('Announcement posted successfully!');
                                            } catch (error) {
                                                console.error(error);
                                            } finally {
                                                setIsPosting(false);
                                            }
                                        }}
                                    >
                                        {isPosting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Megaphone className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                                <span>Send Announcement Now</span>
                                            </>
                                        )}
                                    </NeonButton>
                                </div>
                            </NeonCard>
                        </div>

                        {/* Preview Column */}
                        <div className="lg:col-span-5 sticky top-24">
                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] block pl-2">Live Preview</label>
                                <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border-l-4 rounded-2xl p-6 shadow-2xl transition-all duration-500 scale-100 ${LEVEL_CONFIG[announcementLevel].border}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex flex-col gap-1.5">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest w-fit ${LEVEL_CONFIG[announcementLevel].badge}`}>
                                                {LEVEL_CONFIG[announcementLevel].label}
                                            </span>
                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                <Clock className="w-3 h-3" />
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Today
                                            </div>
                                        </div>
                                        <div className="flex -space-x-2">
                                            {targetMode === 'ALL' ? (
                                                <div className="w-8 h-8 rounded-full bg-neon-purple/20 border border-white/10 flex items-center justify-center text-neon-purple" title="All Users">
                                                    <Globe className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                selectedRoles.map(role => (
                                                    <div key={role} className="w-8 h-8 rounded-full bg-slate-700 border border-white/10 flex items-center justify-center text-white text-[10px] font-bold shadow-lg" title={role}>
                                                        {role.charAt(0)}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <h4 className={`text-xl font-bold mb-3 transition-colors ${announcementTitle ? 'text-white' : 'text-gray-700'}`}>
                                        {announcementTitle || 'No Title Provided'}
                                    </h4>

                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap transition-colors ${announcementContent ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {announcementContent || 'Your announcement message will appear here as you type. Choose a style and target audience on the left to see the final look.'}
                                    </p>

                                    <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                                            <span className="text-[10px] text-gray-500 font-bold">Post by Admin Console</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            <span className="text-[10px] text-white font-bold opacity-50 uppercase tracking-tighter">Live Insight</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-neon-purple/5 border border-neon-purple/20 rounded-xl">
                                    <div className="flex gap-3">
                                        <AlertTriangle className="w-5 h-5 text-neon-purple shrink-0" />
                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                                            Notifications will be sent to the {targetMode === 'ALL' ? 'entire institution' : `${selectedRoles.join(', ')}`}
                                            {audienceFilters.classId ? ` in ${classrooms.find(c => c.id === audienceFilters.classId)?.name}` : ''}.
                                            This action is immediate and cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent History Section */}
                        <div className="lg:col-span-12 mt-12 space-y-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-neon-cyan" />
                                Announcement History
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {announcements.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-gray-500 bg-white/5 border border-white/10 rounded-2xl">
                                        No announcements posted yet. Correct that by using the form above.
                                    </div>
                                ) : announcements.slice(0, 6).map(a => (
                                    <div key={a.id} className="p-5 bg-slate-900 border border-white/5 rounded-2xl hover:border-white/10 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${a.type === 'NOTICE' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                {a.type}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-bold">{new Date(a.timestamp).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-300 line-clamp-3 mb-4 group-hover:text-white transition-colors">{a.content}</p>
                                        <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{a.classId ? `📚 ${a.className}` : '📢 School-wide'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {/* SETTINGS TAB */}
                {activeTab === 'SETTINGS' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-white">School Settings</h2>
                        <NeonCard className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">School Name</label>
                                    <div className="text-white text-lg">{schoolName}</div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Subscription Status</label>
                                    <div className="text-neon-cyan text-lg">{schoolProfile?.subscriptionStatus || 'TRIAL'}</div>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">School Invite Code</label>
                                    <div className="text-white text-lg font-mono bg-white/5 p-3 rounded-lg">{schoolProfile?.inviteCode}</div>
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                )}

                {/* MANAGE CLASSES TAB (Admin Only - Lock/Unlock) */}
                {/* MANAGE CLASSES TAB (Legacy block merged into CLASSES tab above) */}

                {/* RESOURCES TAB (File Offerings) */}
                {
                    activeTab === 'RESOURCES' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white">Study Materials & Resources</h2>
                                <NeonButton glow onClick={() => alert('Upload feature coming soon!')}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Upload Resource
                                </NeonButton>
                            </div>
                            <NeonCard className="p-8 text-center">
                                <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Resource Library</h3>
                                <p className="text-gray-400 mb-4">Upload study materials, notes, and documents for students</p>
                                <p className="text-sm text-gray-500">Organized by Class → Subject → Files</p>
                            </NeonCard>
                        </div>
                    )
                }
            </div >

            {/* Student Analytics Modal */}
            {
                showStudentAnalytics && (
                    <Suspense fallback={null}>
                        <StudentAnalyticsModal
                            student={showStudentAnalytics}
                            onClose={() => setShowStudentAnalytics(null)}
                        />
                    </Suspense>
                )
            }

            {/* Add Student Modal */}
            {
                showAddStudentModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowAddStudentModal(false)}>
                        <NeonCard className="w-full max-w-md p-6" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-green-400" />
                                Add New Student
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Student Name *</label>
                                    <Input
                                        placeholder="Enter student name"
                                        value={newStudentData.name}
                                        onChange={e => setNewStudentData({ ...newStudentData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Roll Number</label>
                                    <Input
                                        placeholder="Enter roll number"
                                        value={newStudentData.rollNumber}
                                        onChange={e => setNewStudentData({ ...newStudentData, rollNumber: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Email (optional)</label>
                                    <Input
                                        type="email"
                                        placeholder="student@example.com"
                                        value={newStudentData.email}
                                        onChange={e => setNewStudentData({ ...newStudentData, email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Parent Name</label>
                                    <Input
                                        placeholder="Parent/Guardian name"
                                        value={newStudentData.parentName}
                                        onChange={e => setNewStudentData({ ...newStudentData, parentName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 mb-1 block">Parent Mobile</label>
                                    <Input
                                        placeholder="10-digit mobile number"
                                        value={newStudentData.parentMobile}
                                        onChange={e => setNewStudentData({ ...newStudentData, parentMobile: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <NeonButton
                                    glow
                                    onClick={() => {
                                        if (!newStudentData.name) {
                                            alert('Please enter student name');
                                            return;
                                        }
                                        if (onAddStudent) {
                                            const targetClass = classrooms.find(c => c.id === addStudentClassId);
                                            onAddStudent({
                                                name: newStudentData.name,
                                                rollNumber: newStudentData.rollNumber,
                                                email: newStudentData.email,
                                                parentName: newStudentData.parentName,
                                                parentMobile: newStudentData.parentMobile,
                                                grade: targetClass?.name || '',
                                                classId: addStudentClassId,
                                                schoolId: schoolProfile?.id,
                                                createdAt: new Date().toISOString()
                                            }, addStudentClassId);
                                        }
                                        setNewStudentData({ name: '', rollNumber: '', email: '', parentName: '', parentMobile: '' });
                                        setShowAddStudentModal(false);
                                    }}
                                    className="flex-1"
                                >
                                    Add Student
                                </NeonButton>
                                <button
                                    onClick={() => setShowAddStudentModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </NeonCard>
                    </div>
                )
            }
        </div >
    );
};
