
import React, { useState, useEffect } from 'react';
import { UserRole, Student, Classroom, SchoolProfile, Teacher, Assignment, Announcement } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import {
    Users, BookOpen, Calendar, Settings, Folder, FileText, ChevronRight, ArrowLeft,
    UserCircle, School, Plus, BarChart2, Clock, CheckCircle, Megaphone, Copy,
    Trash2, Lock, Unlock, UserPlus, Search, RotateCcw, Award, Star, Medal
} from 'lucide-react';
import { AttendanceView } from './Features/AttendanceView';
import { AssignClassesModal } from './AssignClassesModal';
import { StudentAnalyticsModal } from './StudentAnalyticsModal';

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
    onRenameClass?: (classId: string, newSectionName: string) => void;
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
                const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');
                const res = await fetch(`${API_URL}/assignments?classId=${classroom.id}`);
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
    schoolName, schoolProfile, students, classrooms, announcements = [], onLogout, currentUser, onUpdateTeacher, onPostAnnouncement, onCreateClass, onToggleClassLock, onLockAllClasses, onAddStudent, onArchiveClass, onRestoreClass, onRenameClass, activeTab: propActiveTab, onTabChange
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
                            // Check status
                            const dateStr = new Date().toLocaleDateString();
                            // Check for specific LEAVE record
                            const leaveStatus = localStorage.getItem(`teacher_status_${teacher.id}_${dateStr}`);

                            let statusBadge = <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20">Present</div>;

                            if (leaveStatus === 'LEAVE') {
                                statusBadge = <div className="px-3 py-1 bg-red-500/10 text-red-400 text-xs rounded-full border border-red-500/20">On Leave</div>;
                            } else {
                                // Can also check if sunday
                                if (new Date().getDay() === 0) {
                                    statusBadge = <div className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full border border-orange-500/20">Holiday</div>;
                                }
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
                        <AttendanceView student={selectedStudent} />
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
                {/* School Header with Logo and Name - Centered */}
                <div className="flex flex-col items-center justify-center mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-4 mb-3">
                        {schoolProfile?.logoUrl ? (
                            <img
                                src={schoolProfile.logoUrl}
                                alt={schoolName}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-neon-cyan/30 shadow-[0_0_20px_rgba(0,255,255,0.2)]"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center text-2xl font-bold text-white shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                                {schoolName?.charAt(0) || 'S'}
                            </div>
                        )}
                        <div className="text-center">
                            <h1 className="text-3xl font-display font-bold text-white">{schoolName}</h1>
                            {schoolProfile?.motto && (
                                <p className="text-gray-400 text-sm italic mt-1">"{schoolProfile.motto}"</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                        {schoolProfile?.mobileNumber && (
                            <span>📞 {schoolProfile.mobileNumber}</span>
                        )}
                        {schoolProfile?.adminEmail && (
                            <span>✉️ {schoolProfile.adminEmail}</span>
                        )}
                        <span className="px-3 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                            {schoolProfile?.subscriptionStatus || 'TRIAL'}
                        </span>
                        {schoolProfile?.inviteCode && (
                            <span
                                className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 cursor-pointer hover:bg-purple-500/20 flex items-center gap-2"
                                onClick={() => { navigator.clipboard.writeText(schoolProfile.inviteCode || ''); alert('Invite code copied!'); }}
                            >
                                🎟️ Code: <span className="font-mono font-bold">{schoolProfile.inviteCode}</span>
                                <Copy className="w-3 h-3" />
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 flex-wrap">
                    {['OVERVIEW', 'TEACHERS', 'STUDENTS', 'CLASSES', 'MANAGE CLASSES', 'RESOURCES', 'ATTENDANCE', 'LEADERBOARD', 'ANNOUNCEMENTS', 'SETTINGS'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleTabChange(tab)}
                            className={`pb-4 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'text-neon-cyan border-neon-cyan' : 'text-gray-400 border-transparent hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === 'OVERVIEW' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <NeonCard glowColor="cyan" className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{students.length}</div>
                                        <div className="text-sm text-gray-400">Total Students</div>
                                    </div>
                                </div>
                            </NeonCard>
                            <NeonCard glowColor="purple" className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                        <UserCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{schoolProfile?.faculty?.length || 0}</div>
                                        <div className="text-sm text-gray-400">Teachers</div>
                                    </div>
                                </div>
                            </NeonCard>
                            <NeonCard glowColor="red" className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{classrooms.length}</div>
                                        <div className="text-sm text-gray-400">Classes</div>
                                    </div>
                                </div>
                            </NeonCard>
                            <NeonCard glowColor="green" className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
                                        <School className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">{schoolProfile?.subscriptionStatus || 'TRIAL'}</div>
                                        <div className="text-sm text-gray-400">Plan Status</div>
                                    </div>
                                </div>
                            </NeonCard>
                        </div>
                        <NeonCard className="p-6">
                            <h3 className="text-xl font-bold text-white mb-4">School Information</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-gray-400">School Name:</span> <span className="text-white ml-2">{schoolName}</span></div>
                                <div><span className="text-gray-400">Admin Email:</span> <span className="text-white ml-2">{schoolProfile?.adminEmail || 'N/A'}</span></div>
                                <div><span className="text-gray-400">Invite Code:</span> <span className="text-neon-cyan ml-2 font-mono">{schoolProfile?.inviteCode || 'N/A'}</span></div>
                                <div><span className="text-gray-400">Max Students:</span> <span className="text-white ml-2">{schoolProfile?.maxStudents || 'N/A'}</span></div>
                            </div>
                        </NeonCard>
                    </div>
                )}

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

                    const studentsToShow = studentViewClassId
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
                    if (!studentViewGrade) {
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
                                                                setActiveTab('CLASSES');
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

                    // STUDENT LIST VIEW
                    if (studentViewClassId && currentSectionData) {
                        return (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setStudentViewClassId('')} className="p-2 hover:bg-white/10 rounded-full">
                                            <ArrowLeft className="w-5 h-5 text-white" />
                                        </button>
                                        <h2 className="text-2xl font-bold text-white">{currentSectionData.name} - Section {currentSectionData.section}</h2>
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
                                            {studentSearchQuery ? 'No students match your search' : 'No students in this section'}
                                        </div>
                                    ) : filteredStudents.map(student => (
                                        <div
                                            key={student.id}
                                            className="p-4 border-b border-white/5 flex items-center justify-between hover:bg-white/10 cursor-pointer transition-colors"
                                            onClick={() => setShowStudentAnalytics(student)}
                                        >
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
                                                <ChevronRight className="w-4 h-4 text-gray-500" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    return null;
                })()}

                {/* CLASSES TAB - Grade Hierarchy */}
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

                    // GRADES VIEW
                    if (classView === 'GRADES') {
                        return (
                            <div className="space-y-8 animate-fade-in">
                                <h2 className="text-2xl font-bold text-white">Class Management</h2>

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


                {/* MANAGE CLASSES TAB */}
                {activeTab === 'MANAGE CLASSES' && (() => {
                    const archivedClasses = classrooms.filter(c => c.status === 'ARCHIVED');

                    return (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-6">Class Management</h2>

                            {!showArchived ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <NeonCard
                                        className="p-8 flex flex-col items-center justify-center cursor-pointer hover:border-red-500/50 group transition-all min-h-[200px]"
                                        onClick={() => setShowArchived(true)}
                                        glowColor="red"
                                    >
                                        <Trash2 className="w-6 h-6 text-gray-600 group-hover:text-red-400 transition-colors mb-4" />
                                        <h3 className="text-xl font-bold text-white">Archived Classes</h3>
                                        <p className="text-gray-400 text-sm mt-2 text-center">View and restore deleted sections ({archivedClasses.length})</p>
                                    </NeonCard>
                                    {/* Placeholder for other management features */}
                                </div>
                            ) : (
                                <div className="space-y-6">
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
                            )}
                        </div>
                    );
                })()}

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

                {/* ANNOUNCEMENTS TAB */}
                {activeTab === 'ANNOUNCEMENTS' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Post Announcement Card */}
                        <NeonCard glowColor="purple" className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Post Announcement</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Target</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded p-2 text-white"
                                        value={announcementClassId}
                                        onChange={e => setAnnouncementClassId(e.target.value)}
                                    >
                                        <option value="">📢 School-wide</option>
                                        {classrooms.map(c => (
                                            <option key={c.id} value={c.id}>📚 {c.name} - {c.section}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Type</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded p-2 text-white"
                                        value={announcementType}
                                        onChange={e => setAnnouncementType(e.target.value as 'THOUGHT' | 'NOTICE')}
                                    >
                                        <option value="THOUGHT">💭 Thought of the Day</option>
                                        <option value="NOTICE">📋 Notice</option>
                                    </select>
                                </div>
                            </div>
                            <textarea
                                className="w-full h-24 bg-black/40 border border-white/10 rounded p-4 text-white resize-none placeholder-gray-500"
                                placeholder="Write your announcement..."
                                value={announcementContent}
                                onChange={e => setAnnouncementContent(e.target.value)}
                            />
                            <NeonButton
                                onClick={() => {
                                    if (onPostAnnouncement && announcementContent) {
                                        const selectedClass = classrooms.find(c => c.id === announcementClassId);
                                        onPostAnnouncement(
                                            announcementContent,
                                            announcementType,
                                            announcementClassId || undefined,
                                            selectedClass ? `${selectedClass.name} - ${selectedClass.section}` : undefined
                                        );
                                        setAnnouncementContent('');
                                        setAnnouncementClassId('');
                                        setAnnouncementType('THOUGHT');
                                    }
                                }}
                                className="mt-4"
                                glow
                                disabled={!announcementContent.trim()}
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
                {activeTab === 'MANAGE CLASSES' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Manage Classes</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2 text-sm">
                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded flex items-center gap-1">
                                        <Unlock className="w-3 h-3" /> Active: {classrooms.filter(c => c.status !== 'LOCKED').length}
                                    </span>
                                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Locked: {classrooms.filter(c => c.status === 'LOCKED').length}
                                    </span>
                                </div>
                                {/* Lock All Button */}
                                <NeonButton
                                    variant="danger"
                                    onClick={() => {
                                        if (!window.confirm('Are you sure you want to lock ALL classes? Students will not be able to join.')) return;
                                        if (onLockAllClasses) onLockAllClasses();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Lock className="w-4 h-4" />
                                    Lock All Classes
                                </NeonButton>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <div className="grid grid-cols-5 gap-4 p-3 bg-white/5 text-xs text-gray-400 uppercase tracking-wider border-b border-white/10">
                                <div>Class Name</div>
                                <div>Section</div>
                                <div>Students</div>
                                <div>Status</div>
                                <div>Actions</div>
                            </div>
                            {classrooms.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No classes created yet</div>
                            ) : classrooms.map(c => (
                                <div key={c.id} className={`grid grid-cols-5 gap-4 p-4 border-b border-white/5 hover:bg-white/5 transition-all ${c.status === 'LOCKED' ? 'opacity-60 bg-red-500/5' : ''}`}>
                                    <div className="text-white font-medium flex items-center gap-2">
                                        {c.status === 'LOCKED' ? (
                                            <Lock className="w-4 h-4 text-red-400 animate-pulse" />
                                        ) : (
                                            <Unlock className="w-4 h-4 text-green-400" />
                                        )}
                                        {c.name}
                                    </div>
                                    <div className="text-gray-400">{c.section}</div>
                                    <div className="text-gray-400">{students.filter(s => s.classId === c.id).length}</div>
                                    <div>
                                        <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 w-fit ${c.status === 'LOCKED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {c.status === 'LOCKED' ? (
                                                <><Lock className="w-3 h-3" /> Locked</>
                                            ) : (
                                                <><Unlock className="w-3 h-3" /> Active</>
                                            )}
                                        </span>
                                    </div>
                                    <div>
                                        <button
                                            onClick={() => {
                                                const newLocked = c.status !== 'LOCKED';
                                                if (onToggleClassLock) onToggleClassLock(c.id, newLocked);
                                            }}
                                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${c.status === 'LOCKED' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                                            title={c.status === 'LOCKED' ? "Unlock Class" : "Lock Class"}
                                        >
                                            {c.status === 'LOCKED' ? (
                                                <><Unlock className="w-3.5 h-3.5" /> Unlock</>
                                            ) : (
                                                <><Lock className="w-3.5 h-3.5" /> Lock</>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`⚠️ DELETE CLASS\n\nAre you sure you want to delete "${c.name}"?\n\nThis class will be moved to Archive and permanently deleted after 7 days if not restored.`)) {
                                                    if (onArchiveClass) onArchiveClass(c.id);
                                                }
                                            }}
                                            className="px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 bg-red-600/20 text-red-500 hover:bg-red-600/40 ml-2"
                                            title="Delete Class"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                    <StudentAnalyticsModal
                        student={showStudentAnalytics}
                        onClose={() => setShowStudentAnalytics(null)}
                    />
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
