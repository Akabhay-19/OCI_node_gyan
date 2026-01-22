import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { api } from './services/api';
import { Layout } from './components/Layout';
import { RoleSelection } from './components/RoleSelection';
import { SchoolJoin } from './components/SchoolJoin';
import { ClassSelection } from './components/ClassSelection';
import { Dashboard } from './components/Dashboard';
import { AppState, UserRole, SchoolProfile, Student, Teacher, Parent, Classroom, Announcement } from './types';
import { Home } from './components/Home';
import { DeveloperConsole } from './components/DeveloperConsole';
import { NeonCard, NeonButton, Input } from './components/UIComponents';
import { SmoothScroll } from './components/SmoothScroll';
import { AboutUs } from './components/AboutUs';
import { Team } from './components/Team';
import { Contact } from './components/Contact';

const INITIAL_SCHOOLS: SchoolProfile[] = [];
const INITIAL_STUDENTS: Student[] = [];
const INITIAL_CLASSROOMS: Classroom[] = [];
const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

const GRADE_SUBJECTS: Record<string, string[]> = {
  'Grade 1': ['Mathematics', 'English', 'EVS', 'Arts'],
  'Grade 2': ['Mathematics', 'English', 'EVS', 'Arts'],
  'Grade 3': ['Mathematics', 'English', 'Science', 'Social Studies'],
  'Grade 4': ['Mathematics', 'English', 'Science', 'Social Studies'],
  'Grade 5': ['Mathematics', 'English', 'Science', 'Social Studies'],
  'Grade 6': ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi'],
  'Grade 7': ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi'],
  'Grade 8': ['Mathematics', 'English', 'Science', 'Social Studies', 'Hindi'],
  'Grade 9': ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'],
  'Grade 10': ['Mathematics', 'English', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'],
  'Grade 11': ['Physics', 'Chemistry', 'Mathematics', 'English', 'Computer Science'],
  'Grade 12': ['Physics', 'Chemistry', 'Mathematics', 'English', 'Computer Science'],
};


const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [schools, setSchools] = useState<SchoolProfile[]>([]);
  const [globalStudents, setGlobalStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [schoolsRes, studentsRes, classroomsRes, announcementsRes] = await Promise.all([
          api.getSchools(),
          api.getStudents(),
          api.getClassrooms(),
          api.getAnnouncements()
        ]);

        setSchools(schoolsRes);
        setGlobalStudents(studentsRes);
        setClassrooms(classroomsRes);
        setAnnouncements(announcementsRes);

        // [NEW] Restore Session
        const storedUserId = localStorage.getItem('GYAN_USER_ID');
        const storedUserRole = localStorage.getItem('GYAN_USER_ROLE') as UserRole;

        if (storedUserId && storedUserRole) {
          console.log("Restoring session for:", storedUserId, storedUserRole);
          let restoredUser: any = null;
          let restoredSchool: SchoolProfile | undefined;

          if (storedUserRole === 'STUDENT') {
            restoredUser = studentsRes.find(s => s.id === storedUserId);
            if (restoredUser) restoredSchool = schoolsRes.find(s => s.id === restoredUser.schoolId);
          } else if (storedUserRole === 'TEACHER' || storedUserRole === 'ADMIN') {
            // Search across all schools' faculty
            for (const school of schoolsRes) {
              const teacher = school.faculty?.find(t => t.id === storedUserId);
              if (teacher) {
                restoredUser = teacher;
                restoredSchool = school;
                break;
              }
            }
            // Admin fallback for demo/hardcoded
            if (!restoredUser && storedUserId === 'ADMIN-001') {
              restoredSchool = schoolsRes[0];
              restoredUser = {
                id: 'ADMIN-001',
                schoolId: restoredSchool?.id,
                name: 'School Administrator',
                email: 'admin@school.com',
                subject: 'Administration',
                joinedAt: new Date().toISOString(),
                assignedClasses: []
              };
            }
          } else if (storedUserRole === 'PARENT') {
            // Demo parent restoration
            if (storedUserId === 'P1') {
              restoredSchool = schoolsRes[0];
              restoredUser = { id: 'P1', schoolId: restoredSchool?.id, name: 'Parent', email: '', childId: '1' };
            }
          }

          if (restoredUser) {
            // [FIX] Defensive coding: Ensure arrays are initialized to prevent downstream map/filter crashes
            if (storedUserRole === 'STUDENT') {
              restoredUser.weaknessHistory = restoredUser.weaknessHistory || [];
              restoredUser.classIds = restoredUser.classIds || [];
              restoredUser.weakerSubjects = restoredUser.weakerSubjects || [];
            } else if (storedUserRole === 'TEACHER') {
              restoredUser.assignedClasses = restoredUser.assignedClasses || [];
            }

            setAppState(prev => ({
              ...prev,
              userRole: storedUserRole,
              currentUser: restoredUser,
              schoolName: restoredSchool?.name || null,
              schoolId: restoredSchool?.id,
              schoolLogo: restoredSchool?.logoUrl
            }));
          }
        }

        // Check for migration need (if DB is empty but localStorage has data)
        if (schoolsRes.length === 0 && localStorage.getItem('GYAN_V2_SCHOOLS')) {
          setNeedsMigration(true);
        }
      } catch (e) {
        console.error("Failed to load data:", e);
        setError("Failed to connect to server. Please ensure 'npm run server' is running.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleMigration = async () => {
    try {
      setIsLoading(true);
      const localSchools = JSON.parse(localStorage.getItem('GYAN_V2_SCHOOLS') || '[]');
      const localStudents = JSON.parse(localStorage.getItem('GYAN_V2_STUDENTS') || '[]');
      const localClassrooms = JSON.parse(localStorage.getItem('GYAN_V2_CLASSROOMS') || '[]');
      const localAnnouncements = JSON.parse(localStorage.getItem('GYAN_V2_ANNOUNCEMENTS') || '[]');

      await api.migrateData({
        schools: localSchools,
        students: localStudents,
        classrooms: localClassrooms,
        announcements: localAnnouncements
      });

      // Refresh data
      window.location.reload();
    } catch (e) {
      alert("Migration failed. See console.");
      setIsLoading(false);
    }
  };

  const [appState, setAppState] = useState<AppState>({ view: 'HOME', userRole: null, schoolName: null });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [tempSignupData, setTempSignupData] = useState<any>(null);
  const [devAuthenticated, setDevAuthenticated] = useState(false);

  // Derive dashboard tab from URL path
  const getDashboardTabFromUrl = (): string => {
    const path = location.pathname;
    if (path.startsWith('/dashboard/')) {
      const tabSlug = path.split('/dashboard/')[1]?.split('/')[0]?.toUpperCase();
      // Map URL slugs to tab names
      const tabMap: Record<string, string> = {
        'LEARN': 'LEARN',
        'LEARN_AI': 'LEARN_AI',
        'ASSIGNMENTS': 'ASSIGNMENTS',
        'MINDMAP': 'MINDMAP',
        'PRACTICE': 'PRACTICE',
        'LEADERBOARD': 'LEADERBOARD',
        'REMEDIAL': 'REMEDIAL',
        'ATTENDANCE': 'ATTENDANCE',
        'ANNOUNCEMENTS': 'ANNOUNCEMENTS',
        'OPPORTUNITIES': 'OPPORTUNITIES',
        'HISTORY': 'HISTORY',
        // Teacher tabs
        'OVERVIEW': 'OVERVIEW',
        'CLASSES': 'CLASSES',
        'GRADEBOOK': 'GRADEBOOK',
        'RANKINGS': 'RANKINGS',
        'GAPS': 'GAPS',
        'REMEDIAL_CENTER': 'REMEDIAL_CENTER',
        'CONTENT_HUB': 'CONTENT_HUB',
        // Admin tabs
        'TEACHERS': 'TEACHERS',
        'STUDENTS': 'STUDENTS',
        // Parent tabs
        'CHARTS': 'CHARTS',
        // Common
        'HOME': 'HOME',
      };
      return tabMap[tabSlug] || 'HOME';
    }
    // Default tab based on role
    if (appState.userRole === 'STUDENT') return 'LEARN';
    if (appState.userRole === 'TEACHER') return 'OVERVIEW';
    if (appState.userRole === 'ADMIN') return 'OVERVIEW';
    if (appState.userRole === 'PARENT') return 'OVERVIEW';
    return 'HOME';
  };

  const dashboardTab = getDashboardTabFromUrl();

  // Navigate to dashboard tab
  const navigateToDashboardTab = (tab: string) => {
    const tabSlug = tab.toLowerCase();
    navigate(`/dashboard/${tabSlug}`);
  };

  const handleRegisterSchool = async (data: any) => {
    const uniqueCode = `${data.schoolName.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newSchool: SchoolProfile = {
      id: `SCH-${Date.now()}`,
      name: data.schoolName,
      adminEmail: data.adminEmail,
      password: data.password, // [FIX] Store admin password
      mobileNumber: data.mobileNumber,
      motto: data.motto,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      subscriptionStatus: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      studentCount: 0,
      maxStudents: 100,
      plan: 'TRIAL',
      inviteCode: uniqueCode,
      logoUrl: data.logoUrl,
      faculty: []
    };
    try {
      await api.createSchool(newSchool);
      setSchools(prev => [...prev, newSchool]);
      setAppState(prev => ({ ...prev, userRole: 'ADMIN', schoolName: newSchool.name, schoolId: newSchool.id, schoolLogo: newSchool.logoUrl }));
      navigate('/dashboard');
      alert(`School Created Successfully!\n\nSchool Invite Code: ${uniqueCode}\n\nShare this code with teachers and students to join.`);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to register school: ${e.message || "Unknown error"}`);
    }
  };

  const handleSyncUserToSchool = async (schoolId: string) => {
    const targetSchool = schools.find(s => s.id === schoolId); if (!targetSchool) return;

    if (appState.userRole === 'STUDENT') {
      // Generate Username: Name_SchoolInitials_RollNo
      const schoolInitials = targetSchool.name.split(' ').map(w => w[0].toLowerCase()).join('');
      const generatedUsername = `${tempSignupData.name.replace(/\s+/g, '_')}_${schoolInitials}_${tempSignupData.rollNumber}`;

      const newStudent: Student = {
        id: `STU-${Date.now()}`,
        schoolId: targetSchool.id,
        name: tempSignupData.name,
        mobileNumber: tempSignupData.mobileNumber,
        rollNumber: tempSignupData.rollNumber,
        username: generatedUsername,
        password: tempSignupData.password,
        grade: tempSignupData.className,
        attendance: 100,
        avgScore: 0,
        status: 'Active',
        weakerSubjects: [],
        weaknessHistory: []
      };

      try {
        await api.createStudent(newStudent);
        setGlobalStudents(prev => [...prev, newStudent]);
        alert(`Registration Successful!\n\nYour Username is: ${generatedUsername}\nPlease save this for login.`);
        setAppState(prev => ({ ...prev, schoolName: targetSchool.name, schoolId: targetSchool.id, schoolLogo: targetSchool.logoUrl, currentUser: newStudent }));
        navigate('/class-selection');
      } catch (e) {
        alert("Failed to join school");
      }
    } else if (appState.userRole === 'TEACHER') {
      const newTeacher: Teacher = {
        id: `TCH-${Date.now()}`,
        schoolId: targetSchool.id,
        name: tempSignupData.name,
        email: tempSignupData.email,
        mobileNumber: tempSignupData.mobileNumber,
        subject: tempSignupData.stream,
        joinedAt: new Date().toISOString(),
        assignedClasses: []
      };
      try {
        await api.createTeacher(newTeacher);
        // Update local schools state to include new faculty
        setSchools(prev => prev.map(s => s.id === targetSchool.id ? { ...s, faculty: [...(s.faculty || []), newTeacher] } : s));
        setAppState(prev => ({ ...prev, schoolName: targetSchool.name, schoolId: targetSchool.id, schoolLogo: targetSchool.logoUrl, currentUser: newTeacher }));
        navigate('/dashboard/overview');
      } catch (e) {
        alert("Failed to join school as teacher");
      }
    }
  };

  const handleCreateClassroom = async (data: any) => {
    const teacher = appState.currentUser as Teacher;
    // For Admin, use a generic ID if teacher.id is missing (though handleLogin will now set it)
    const creatorId = teacher?.id || 'ADMIN';

    // Get primary subject if subjects provided, otherwise default to grade subjects
    const defaultSubjects = GRADE_SUBJECTS[data.name] || ['General'];
    const primarySubject = data.subjects
      ? data.subjects.split(',')[0].trim()
      : (defaultSubjects[0] || 'General');

    // [UPDATED] Naming Convention: "Grade 10 - Mathematics"
    // Section is stored separately in `section` field.
    // This allows grouping all sections of "Grade 10 - Mathematics" together.
    const className = `${data.name} - ${primarySubject}`;

    // Check for duplicate in current school's classrooms (Same Name + Same Section)
    const schoolClassrooms = classrooms.filter(c => c.schoolId === appState.schoolId);
    const duplicate = schoolClassrooms.find(
      c => c.name.toLowerCase() === className.toLowerCase() && c.section.toLowerCase() === data.section.toLowerCase()
    );
    if (duplicate) {
      alert(`Section "${data.section}" for "${className}" already exists.`);
      return;
    }

    const subjectList = data.subjects
      ? data.subjects.split(',').map((s: string) => s.trim()).filter(Boolean)
      : defaultSubjects;

    const newClass: Classroom = {
      id: `CLS-${Date.now()}`,
      schoolId: appState.schoolId!,
      teacherId: creatorId,
      name: className, // "Grade 10 - Physics"
      subject: primarySubject, // [NEW] Explicit subject
      section: data.section,
      motto: data.motto,
      inviteCode: `${primarySubject.substring(0, 3).toUpperCase()}-${data.section}-${Math.floor(Math.random() * 9999)}`,
      studentIds: [],
      subjects: subjectList.map((sub: string) => ({ id: `SUB-${Date.now()}-${Math.random()}`, name: sub })),
      status: 'ACTIVE'
    };
    try {
      await api.createClassroom(newClass);
      setClassrooms(prev => [...prev, newClass]);
      alert(`Created ${className} successfully!`);
    } catch (e) {
      console.error(e);
      alert("Failed to create classroom");
    }
  };

  // Archive class (soft delete)
  const handleArchiveClass = async (classId: string) => {
    try {
      await api.updateClassroom(classId, { status: 'ARCHIVED', archivedAt: new Date().toISOString() });
      setClassrooms(prev => prev.map(c =>
        c.id === classId ? { ...c, status: 'ARCHIVED' as const, archivedAt: new Date().toISOString() } : c
      ));
      alert('Section moved to archive. It will be permanently deleted after 7 days if not restored.');
    } catch (e) {
      alert("Failed to archive class");
    }
  };

  // Restore archived class
  const handleRestoreClass = async (classId: string) => {
    try {
      if (appState.userRole !== 'ADMIN') return;

      const updatedClass = await api.updateClassroom(classId, { status: 'ACTIVE', archivedAt: undefined });

      setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, status: 'ACTIVE' as const, archivedAt: undefined } : c));
      alert('Section restored successfully!');
    } catch (error) {
      console.error('Failed to restore class:', error);
      alert('Failed to restore section');
    }
  };

  const handleRemoveStudentFromClass = async (studentId: string, classId: string) => {
    try {
      if (appState.userRole !== 'TEACHER' && appState.userRole !== 'ADMIN') return;

      // In a real backend, this would likely be a separate API call like api.removeStudentFromClass
      // For now, we update the student to remove classId and sectionId
      const student = globalStudents.find(s => s.id === studentId);
      if (!student) return;

      const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);
      const newClassIds = currentClassIds.filter(id => id !== classId);
      const newPrimaryClassId = newClassIds.length > 0 ? newClassIds[0] : undefined;

      const updatedStudent = { ...student, classId: newPrimaryClassId, classIds: newClassIds, sectionId: undefined };
      await api.updateStudent(updatedStudent);

      setGlobalStudents(prev => prev.map(s => s.id === studentId ? { ...updatedStudent } : s));
      // Also update currentUser if it's the same person
      if (appState.currentUser?.id === studentId) {
        setAppState(prev => prev ? { ...prev, currentUser: { ...prev.currentUser, ...updatedStudent } as Student } : prev);
      }
      // Also remove student from the classroom's studentIds list
      setClassrooms(prev => prev.map(c =>
        c.id === classId ? { ...c, studentIds: c.studentIds.filter(id => id !== studentId) } : c
      ));

      alert('Student removed from class successfully');
    } catch (error) {
      console.error('Failed to remove student:', error);
      alert('Failed to remove student');
    }
  };

  // Permanently delete class (for purge after 7 days or manual)
  const handlePermanentDeleteClass = async (classId: string) => {
    try {
      await api.deleteClassroom(classId);
      setClassrooms(prev => prev.filter(c => c.id !== classId));
      // Unassign students
      const studentsInClass = globalStudents.filter(s => s.classId === classId);
      for (const s of studentsInClass) {
        await api.updateStudent({ ...s, classId: undefined });
      }
      setGlobalStudents(prev => prev.map(s => s.classId === classId ? { ...s, classId: undefined } : s));
    } catch (e) {
      alert("Failed to delete class");
    }
  };

  // Auto-purge expired archived classes (older than 7 days)
  useEffect(() => {
    const purgeExpiredArchives = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const expiredClasses = classrooms.filter(c =>
        c.status === 'ARCHIVED' && c.archivedAt && new Date(c.archivedAt) < sevenDaysAgo
      );
      for (const expired of expiredClasses) {
        await handlePermanentDeleteClass(expired.id);
      }
    };
    purgeExpiredArchives();
  }, [classrooms]);

  const handleRenameClass = async (classId: string, newSectionName: string) => {
    try {
      await api.updateClassroom(classId, { section: newSectionName });
      setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, section: newSectionName } : c));
    } catch (e) {
      alert("Failed to rename section");
    }
  };

  const handleToggleClassLock = async (classId: string, locked: boolean) => {
    const newStatus = locked ? 'LOCKED' : 'ACTIVE';
    try {
      await api.updateClassroom(classId, { status: newStatus });
      setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, status: newStatus } : c));
    } catch (e) {
      console.error("Failed to toggle class lock:", e);
      alert("Failed to update class status");
    }
  };

  const handleLockAllClasses = async () => {
    try {
      await Promise.all(classrooms.map(c => api.updateClassroom(c.id, { status: 'LOCKED' })));
      setClassrooms(prev => prev.map(c => ({ ...c, status: 'LOCKED' })));
    } catch (e) {
      console.error("Failed to lock all classes:", e);
      alert("Failed to lock all classes");
    }
  };

  const handleUpdateTeacher = async (teacherId: string, assignedClassIds: string[]) => {
    try {
      await api.updateTeacher(teacherId, { assignedClasses: assignedClassIds });
      // Update local state
      setSchools(prev => prev.map(s => ({
        ...s,
        faculty: s.faculty?.map(t => t.id === teacherId ? { ...t, assignedClasses: assignedClassIds } : t) || []
      })));
    } catch (e) {
      console.error(e);
      alert("Failed to update teacher assignments");
      throw e;
    }
  };


  const handleJoinClass = async (studentId: string, inviteCode: string) => {
    const targetClass = classrooms.find(c => c.inviteCode === inviteCode);
    const student = globalStudents.find(s => s.id === studentId);

    if (targetClass && student) {
      try {
        const updatedStudentIds = [...targetClass.studentIds, studentId];
        await api.updateClassroom(targetClass.id, { studentIds: updatedStudentIds });

        // [NEW] Support multiple classes
        const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);
        // Prevent duplicate join
        if (currentClassIds.includes(targetClass.id)) return true;

        const newClassIds = [...currentClassIds, targetClass.id];
        await api.updateStudent({ ...student, classId: targetClass.id, classIds: newClassIds });

        setGlobalStudents(prev => prev.map(s => s.id === studentId ? { ...s, classId: targetClass.id, classIds: newClassIds } : s));
        setClassrooms(prev => prev.map(c => c.id === targetClass.id ? { ...c, studentIds: updatedStudentIds } : c));
        return true;
      } catch (e: any) {
        alert(`Failed to join class: ${e.message || "Unknown error"}`);
        return false;
      }
    }
    return false;
  };

  const handleClassSelected = async (classId: string) => {
    if (!appState.currentUser || appState.userRole !== 'STUDENT') return;

    try {
      console.log("Joining class:", classId);
      // 1. Update Student record
      const student = appState.currentUser as Student;
      const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);

      if (!currentClassIds.includes(classId)) {
        const newClassIds = [...currentClassIds, classId];
        await api.updateStudent({ ...student, classId, classIds: newClassIds });
        console.log("Student updated with new class");

        // 3. Update local state
        const updatedUser = { ...student, classId, classIds: newClassIds };
        setGlobalStudents(prev => prev.map(s => s.id === updatedUser.id ? updatedUser : s));
        setAppState(prev => ({ ...prev, currentUser: updatedUser }));
        navigate('/dashboard');
      } else {
        // Already joined, just switch view
        navigate('/dashboard');
      }

      // 2. Update Classroom record (add student ID)
      const targetClass = classrooms.find(c => c.id === classId);
      if (targetClass) {
        const currentIds = targetClass.studentIds || [];
        if (!currentIds.includes(appState.currentUser.id)) {
          const updatedStudentIds = [...currentIds, appState.currentUser.id];
          await api.updateClassroom(classId, { studentIds: updatedStudentIds });
          setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, studentIds: updatedStudentIds } : c));
        }
      }
      console.log("Classroom updated");

    } catch (e: any) {
      console.error("Join Error:", e);
      alert(`Failed to join class: ${e.message || JSON.stringify(e)}`);
    }
  };

  const handlePostAnnouncement = async (content: string, type: 'THOUGHT' | 'NOTICE', classId?: string, className?: string) => {
    const newAnnouncement: Announcement = {
      id: `ANN-${Date.now()}`,
      schoolId: appState.schoolId!,
      classId,
      className: className || (classId ? 'Class' : 'School-wide'),
      authorId: appState.currentUser?.id,
      authorName: appState.currentUser?.name || 'Admin',
      content,
      type,
      timestamp: new Date().toISOString()
    };
    try {
      await api.createAnnouncement(newAnnouncement);
      setAnnouncements(prev => [newAnnouncement, ...prev]);
    } catch (e) {
      alert("Failed to post announcement");
    }
  };



  const handleLogin = async (role: UserRole, schoolName: string, credentials?: any) => {
    if (!credentials) return;

    try {
      // Authenticate using API for ALL roles
      // For Parent, we pass role='PARENT' but asParent=true in api.login logic usually handles or we pass logic here.
      // Actually RoleSelection passes { ..., asParent: true } for Parent.
      // And api.login takes credentials.
      // So we just pass credentials and role.
      // Wait, RoleSelection passes role as first arg to onLogin.
      // credentials object has username/password.

      const loginPayload = { ...credentials, role };
      const user = await api.login(loginPayload);

      const userSchoolId = user.schoolId || user.school?.id; // backend might return flattened or nested
      const userSchool = schools.find(s => s.id === userSchoolId);

      // Decide next route based on Role
      let nextRoute = '/dashboard';
      if (role === 'STUDENT') {
        nextRoute = user.classId ? '/dashboard' : '/class-selection';
      } else if (role === 'PARENT') {
        nextRoute = '/dashboard';
      } else if (role === 'TEACHER') {
        nextRoute = '/dashboard/overview';
      } else if (role === 'ADMIN') {
        nextRoute = '/dashboard/overview';
      }

      setAppState(prev => ({
        ...prev,
        userRole: role,
        schoolName: userSchool?.name || schoolName || "Nebula Academy",
        schoolId: userSchoolId,
        schoolLogo: userSchool?.logoUrl,
        currentUser: user
      }));
      navigate(nextRoute);
    } catch (e: any) {
      console.error("Login Failed:", e);
      alert(e.message || "Invalid Credentials");
    }
  };

  const getDisplayName = (student: Student) => {
    return globalStudents.filter(s => s.name === student.name && s.classId === student.classId).length > 1 ? `${student.name} (ID#${student.id.slice(-4)})` : student.name;
  };

  if (isLoading) return <div style={{ color: 'white', textAlign: 'center', marginTop: '20%' }}>Loading Gyan System...</div>;
  if (error) return <div style={{ color: 'red', textAlign: 'center', marginTop: '20%' }}><h1>Error</h1><p>{error}</p></div>;

  const handleUpdateStudent = async (updatedStudent: Student) => {
    // Update local state
    setGlobalStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));

    // Update current user if it matches
    if (appState.currentUser?.id === updatedStudent.id) {
      setAppState(prev => ({ ...prev, currentUser: updatedStudent }));
    }

    // Persist to backend
    try {
      await api.updateStudent(updatedStudent);
    } catch (e) {
      console.error("Failed to update student:", e);
    }
  };

  const handleJoinClasses = async (classIds: string[]) => {
    if (!appState.currentUser || appState.userRole !== 'STUDENT') return;
    try {
      const student = appState.currentUser as Student;
      const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);

      // Filter out already joined classes
      const newIdsToJoin = classIds.filter(id => !currentClassIds.includes(id));
      console.log("Bulk Joining Classes - Input:", classIds);
      console.log("Current ClassIds:", currentClassIds);
      console.log("New IDs to Join:", newIdsToJoin);

      if (newIdsToJoin.length === 0) {
        navigate('/dashboard');
        return;
      }

      const newClassIds = [...currentClassIds, ...newIdsToJoin];
      const primaryClassId = newClassIds[0];

      // Update Student
      const updatedUser = { ...student, classId: primaryClassId, classIds: newClassIds };
      await api.updateStudent(updatedUser);

      // Update Classrooms (one by one or bulk if api supported, do one by one for now as it's safer for classroom integrity)
      // Note: This is still parallel but on different resources (classrooms), so less risk of race condition on the USER object.
      await Promise.all(newIdsToJoin.map(async (classId) => {
        const targetClass = classrooms.find(c => c.id === classId);
        if (targetClass && !targetClass.studentIds.includes(student.id)) {
          const updatedStudentIds = [...targetClass.studentIds, student.id];
          await api.updateClassroom(classId, { studentIds: updatedStudentIds });
          // Update local classroom state immediately to avoid lag
          setClassrooms(prev => prev.map(c => c.id === classId ? { ...c, studentIds: updatedStudentIds } : c));
        }
      }));

      setGlobalStudents(prev => prev.map(s => s.id === updatedUser.id ? updatedUser : s));
      setAppState(prev => ({ ...prev, currentUser: updatedUser }));
      navigate('/dashboard');

    } catch (e: any) {
      console.error("Bulk Join Error:", e);
      alert(`Failed to join classes: ${e.message}`);
    }
  };


  /* State for controlling Dashboard Tabs from Sidebar - Moved to top */

  // Helper to get current view from URL
  const getCurrentView = () => {
    const path = location.pathname;
    if (path === '/') return 'HOME';
    if (path === '/about') return 'ABOUT';
    if (path === '/team') return 'TEAM';
    if (path === '/contact') return 'CONTACT';
    if (path === '/auth') return 'ROLE_SELECTION';
    if (path === '/join-school') return 'SCHOOL_JOIN';
    if (path === '/class-selection') return 'CLASS_SELECTION';
    if (path === '/dashboard') return 'DASHBOARD';
    if (path === '/developer') return 'DEV_CONSOLE';
    return 'HOME';
  };

  return (
    <SmoothScroll>
      <Layout
        logoUrl={appState.schoolLogo}
        userRole={appState.userRole}
        currentUser={appState.currentUser}
        onLogout={() => {
          api.logout(); // [NEW] Clear session
          setAppState(prev => ({ ...prev, userRole: null, currentUser: undefined }));
          navigate('/');
        }}
        /* Pass Tab Control to Layout */
        activeTab={dashboardTab}
        onNavigate={(tab) => {
          if (tab === 'ABOUT') {
            navigate('/about');
          } else if (tab === 'TEAM') {
            navigate('/team');
          } else if (tab === 'CONTACT') {
            navigate('/contact');
          } else if (tab === 'HOME' && !appState.userRole) {
            navigate('/');
          } else {
            navigateToDashboardTab(tab);
          }
        }}

        onUpdateUser={(updated) => {
          if (appState.userRole === 'STUDENT') {
            handleUpdateStudent(updated as Student);
          } else if (appState.userRole === 'TEACHER') {
            // Update local state for teacher
            setSchools(prev => prev.map(s => ({
              ...s,
              faculty: s.faculty.map(f => f.id === updated.id ? { ...f, ...updated } : f)
            })));
            setAppState(prev => ({ ...prev, currentUser: updated }));
            // Note: Backend updateTeacher not assumed to exist in full form, but local update is critical for UX
          }
        }}
        hideHeader={false}
      >
        <>
          {needsMigration && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#f59e0b', color: 'black', padding: '10px', textAlign: 'center', zIndex: 9999 }}>
              <span>We found local data. Do you want to sync it to the server?</span>
              <button onClick={handleMigration} style={{ marginLeft: '10px', padding: '5px 10px', background: 'black', color: 'white', border: 'none', cursor: 'pointer' }}>Sync Now</button>
              <button onClick={() => setNeedsMigration(false)} style={{ marginLeft: '10px', padding: '5px 10px', background: 'transparent', border: '1px solid black', cursor: 'pointer' }}>Dismiss</button>
            </div>
          )}

          <Routes>
            <Route path="/" element={
              <Home
                onGetStarted={() => { setAuthMode('signup'); navigate('/auth'); }}
                onLogin={() => { setAuthMode('login'); navigate('/auth'); }}
                onDevConsole={() => navigate('/developer')}
                onNavigate={(page) => {
                  if (page === 'ABOUT') navigate('/about');
                  else if (page === 'TEAM') navigate('/team');
                  else if (page === 'CONTACT') navigate('/contact');
                }}
              />
            } />

            <Route path="/about" element={<AboutUs onBack={() => navigate('/')} />} />
            <Route path="/team" element={<Team onBack={() => navigate('/')} />} />
            <Route path="/contact" element={<Contact onBack={() => navigate('/')} />} />

            <Route path="/auth" element={
              <RoleSelection
                onSelectRole={(r) => { setAppState(prev => ({ ...prev, userRole: r })); navigate('/join-school'); }}
                onLogin={handleLogin}
                onSignupDetails={setTempSignupData}
                onRegisterSchool={handleRegisterSchool}
                onBackToHome={() => navigate('/')}
                faculty={schools[0]?.faculty}
                initialView={authMode === 'login' ? 'LOGIN' : 'HOME'}
                showLoginButton={authMode !== 'signup'}
              />
            } />

            <Route path="/join-school" element={
              <SchoolJoin
                role={appState.userRole}
                availableSchools={schools}
                onJoinSchool={handleSyncUserToSchool}
                onBack={() => navigate('/auth')}
                tempStudentName={tempSignupData?.name}
                prefilledCode={tempSignupData?.inviteCode}
              />
            } />

            <Route path="/class-selection" element={
              appState.currentUser && appState.userRole === 'STUDENT' ? (
                <ClassSelection
                  studentName={appState.currentUser.name}
                  username={(appState.currentUser as Student).username}
                  schoolName={appState.schoolName || "your School"}
                  studentGrade={(appState.currentUser as Student).grade}
                  classrooms={classrooms.filter(c =>
                    c.schoolId === appState.schoolId && c.status !== 'ARCHIVED' && c.status !== 'LOCKED' &&
                    (!(appState.currentUser as Student).grade || c.name.startsWith((appState.currentUser as Student).grade)) &&
                    !((appState.currentUser as Student).classIds?.includes(c.id) || (appState.currentUser as Student).classId === c.id)
                  )}
                  debugClassrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                  onSelectClass={handleClassSelected}
                  onJoinClasses={handleJoinClasses}
                  onJoinByCode={async (code) => {
                    const trimmedCode = code.trim();
                    const success = await handleJoinClass(appState.currentUser!.id, trimmedCode);
                    if (success) {
                      const targetClass = classrooms.find(c => c.inviteCode === trimmedCode);
                      if (targetClass) handleClassSelected(targetClass.id);
                    } else {
                      alert(`Failed to join. Please check the code: "${trimmedCode}"`);
                    }
                  }}
                  onBack={() => { setAppState(prev => ({ ...prev, currentUser: undefined, userRole: null })); navigate('/auth'); }}
                  currentUser={appState.currentUser}
                />
              ) : (
                <div className="min-h-screen flex items-center justify-center bg-black">
                  <p className="text-white">Please log in first.</p>
                </div>
              )
            } />

            <Route path="/developer" element={
              devAuthenticated ? (
                <DeveloperConsole
                  onBack={() => navigate('/')}
                />
              ) : (
                <div className="min-h-screen flex items-center justify-center bg-black p-4">
                  <div className="absolute top-4 left-4">
                    <NeonButton variant="ghost" onClick={() => navigate('/')}>Back</NeonButton>
                  </div>
                  <NeonCard className="w-full max-w-md p-8 border-neon-cyan/50">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Developer Access</h2>
                    <DevLogin
                      onLogin={(success) => setDevAuthenticated(success)}
                    />
                  </NeonCard>
                </div>
              )
            } />

            <Route path="/dashboard/*" element={
              <Dashboard
                userRole={appState.userRole!}
                schoolName={appState.schoolName!}
                schoolProfile={schools.find(s => s.id === appState.schoolId)}
                students={globalStudents.filter(s => s.schoolId === appState.schoolId)}
                classrooms={classrooms.filter(c => c.schoolId === appState.schoolId)}
                announcements={announcements.filter(a => a.schoolId === appState.schoolId)}
                setStudents={setGlobalStudents}
                onLogout={() => { setAppState(prev => ({ ...prev, userRole: null, currentUser: undefined })); navigate('/'); }}
                currentUser={appState.currentUser}
                onCreateClass={handleCreateClassroom}
                onJoinClass={handleJoinClass}
                onPostAnnouncement={handlePostAnnouncement}
                getDisplayName={getDisplayName}
                onRenameClass={handleRenameClass}
                onUpdateTeacher={handleUpdateTeacher}
                onUpdateStudent={handleUpdateStudent}
                onToggleClassLock={handleToggleClassLock}
                onLockAllClasses={handleLockAllClasses}
                onArchiveClass={handleArchiveClass}
                onRestoreClass={handleRestoreClass}
                onKickStudent={handleRemoveStudentFromClass}
                onJoinClassClick={() => navigate('/class-selection')}
                /* Pass Control Pass-Through */
                activeTab={dashboardTab}
                onTabChange={navigateToDashboardTab}
              />
            } />
          </Routes>
        </>
      </Layout>
    </SmoothScroll>
  );
};

const DevLogin: React.FC<{ onLogin: (success: boolean) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (email === 'akabhay.official@gmail.com' && password === '1234567890a@A') {
      onLogin(true);
    } else {
      setError('Invalid Credentials');
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-500/20 border border-red-500 rounded text-red-200 text-sm">{error}</div>}
      <div>
        <label className="block text-gray-400 text-sm mb-1">Email</label>
        <Input
          value={email}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          placeholder="admin@example.com"
        />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1">Password</label>
        <Input
          type="password"
          value={password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <NeonButton onClick={handleLogin} className="w-full mt-4" glow>
        Access Console
      </NeonButton>
    </div>
  );
};

// App wrapper that provides BrowserRouter context
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;