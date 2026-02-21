import React, { useState, lazy, Suspense } from 'react';
import { UserRole, Student, SchoolProfile, Classroom, Announcement, WeaknessRecord } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { AdaptiveLearning } from './Features/AdaptiveLearning';
import { QuizMode } from './Features/QuizMode';
import { Leaderboard } from './Features/Leaderboard';
import { StoryMode } from './Features/StoryMode';
import { StudentAssignments } from './Features/StudentAssignments';

// Lazy load heavy dashboard components
const TeacherDashboard = lazy(() => import('./TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const ParentDashboard = lazy(() => import('./ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const StudentDashboard = lazy(() => import('./StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const AdminDashboard = lazy(() => import('./AdminDashboard').then(m => ({ default: m.AdminDashboard })));

import { UserProfileModal } from './UserProfileModal';
import { RemedialModal } from './Features/RemedialModal';
import { BookOpen, Target, Clock, Award, Zap, Brain, ChevronRight, PlayCircle, CheckCircle2, AlertCircle, MessageSquare, Feather, Sparkles, Trophy, School, Megaphone, ClipboardList } from 'lucide-react';

const DashboardFallback = () => (
    <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
    </div>
);

interface DashboardProps {
    userRole: UserRole;
    schoolName: string;
    schoolProfile?: SchoolProfile;
    students?: Student[];
    classrooms?: Classroom[];
    announcements?: Announcement[];
    setStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
    currentUser?: any;
    onLogout: () => void;
    onCreateClass?: any;
    onJoinClass?: (studentId: string, code: string) => Promise<boolean> | boolean;
    onPostAnnouncement?: any;
    getDisplayName?: (student: Student) => string;
    onDeleteClass?: (classId: string) => void;
    onRenameClass?: (classId: string, newSectionName: string) => void;
    onUpdateTeacher?: (teacherId: string, assignedClassIds: string[]) => Promise<void>;
    onUpdateStudent?: (student: Student) => void;
    onToggleClassLock?: (classId: string, locked: boolean) => void;
    onLockAllClasses?: () => void;
    onArchiveClass?: (classId: string) => void;
    onRestoreClass?: (classId: string) => void;
    onKickStudent?: (studentId: string, classId: string) => void;
    onJoinClassClick?: () => void;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    userRole, schoolName, schoolProfile, students, classrooms, announcements, setStudents, currentUser, onLogout, onCreateClass, onJoinClass, onPostAnnouncement, getDisplayName, onDeleteClass, onRenameClass, onUpdateTeacher, onUpdateStudent, onToggleClassLock, onLockAllClasses, onArchiveClass, onRestoreClass, onKickStudent, onJoinClassClick, activeTab, onTabChange
}) => {
    const [localActiveTab, setLocalActiveTab] = useState('LEARN');
    const [learnRefreshKey, setLearnRefreshKey] = useState(0); // Key to force remount
    const [classInviteCode, setClassInviteCode] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedGap, setSelectedGap] = useState<WeaknessRecord | null>(null);

    const handleResolveGap = (gapId: string) => {
        if (!currentUser || !onUpdateStudent) return;
        const updatedStudent = {
            ...currentUser,
            weaknessHistory: (currentUser.weaknessHistory || []).map((w: WeaknessRecord) =>
                w.id === gapId ? { ...w, status: 'RESOLVED', remedialCompleted: true } : w
            )
        };
        onUpdateStudent(updatedStudent);
        setSelectedGap(null);
    };

    // --- TEACHER VIEW ---
    if (userRole === 'TEACHER') {
        return (
            <Suspense fallback={<DashboardFallback />}>
                <TeacherDashboard
                    schoolName={schoolName} schoolProfile={schoolProfile} students={students || []} classrooms={classrooms || []} announcements={announcements || []} setStudents={setStudents!} onLogout={onLogout} userRole={userRole} currentUser={currentUser} onCreateClass={onCreateClass} onPostAnnouncement={onPostAnnouncement} getDisplayName={getDisplayName} onDeleteClass={onDeleteClass} onRenameClass={onRenameClass} onUpdateTeacher={onUpdateTeacher} onKickStudent={onKickStudent}
                    activeTab={activeTab} onTabChange={onTabChange}
                />
            </Suspense>
        );
    }

    // --- ADMIN VIEW ---
    if (userRole === 'ADMIN') {
        return (
            <Suspense fallback={<DashboardFallback />}>
                <AdminDashboard
                    schoolName={schoolName}
                    schoolProfile={schoolProfile}
                    students={students || []}
                    classrooms={classrooms || []}
                    announcements={announcements || []}
                    onLogout={onLogout}
                    currentUser={currentUser}
                    onUpdateTeacher={onUpdateTeacher}
                    onPostAnnouncement={onPostAnnouncement}
                    onCreateClass={onCreateClass}
                    onToggleClassLock={onToggleClassLock}
                    onLockAllClasses={onLockAllClasses}
                    onArchiveClass={onArchiveClass}
                    onRestoreClass={onRestoreClass}
                    onUpdateStudent={onUpdateStudent}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                />
            </Suspense>
        );
    }

    // --- PARENT VIEW ---
    if (userRole === 'PARENT') {
        return (
            <Suspense fallback={<DashboardFallback />}>
                <ParentDashboard
                    schoolName={schoolName}
                    onLogout={onLogout}
                    currentUser={currentUser}
                    students={students || []}
                    classrooms={classrooms || []}
                />
            </Suspense>
        );
    }

    // --- STUDENT VIEW ---
    if (!currentUser) return <div className="text-white text-center p-20">Loading profile...</div>;

    return (
        <Suspense fallback={<DashboardFallback />}>
            <StudentDashboard
                student={currentUser as Student}
                classrooms={classrooms}
                announcements={announcements}
                schoolName={schoolName}
                schoolProfile={schoolProfile}
                onUpdateStudent={onUpdateStudent}
                students={students}
                onJoinClassClick={onJoinClassClick}
                activeTab={activeTab}
                onTabChange={onTabChange}
            />
        </Suspense>
    );
};
