import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { AppState, UserRole, Student, Teacher, SchoolProfile } from '../types';

interface UseAuthProps {
    schools: SchoolProfile[];
    globalStudents: Student[];
    teachers: Teacher[];
}

export const useAuth = ({ schools, globalStudents, teachers }: UseAuthProps) => {
    const [appState, setAppState] = useState<AppState>({ view: 'HOME', userRole: null, schoolName: null });
    const [devAuthenticated, setDevAuthenticated] = useState(!!api.getDevToken());
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
    const [tempSignupData, setTempSignupData] = useState<any>(null);

    const restoreSession = useCallback(() => {
        const storedUserId = localStorage.getItem('GYAN_USER_ID');
        const storedUserRole = localStorage.getItem('GYAN_USER_ROLE') as UserRole;

        if (storedUserId && storedUserRole && schools.length > 0) {
            console.log("[useAuth] Restoring session:", storedUserId, storedUserRole);
            let restoredUser: any = null;
            let restoredSchool: SchoolProfile | undefined;

            if (storedUserRole === 'STUDENT') {
                restoredUser = globalStudents.find(s => String(s.id) === String(storedUserId));
                if (restoredUser) restoredSchool = schools.find(s => s.id === restoredUser.schoolId);
            } else if (storedUserRole === 'ADMIN') {
                const school = schools.find(s => s.id === storedUserId);
                if (school) {
                    restoredSchool = school;
                    restoredUser = {
                        id: school.id,
                        schoolId: school.id,
                        name: 'School Administrator',
                        email: school.adminEmail,
                        role: 'ADMIN'
                    };
                } else {
                    restoredUser = teachers.find(t => t.id === storedUserId);
                    if (restoredUser) restoredSchool = schools.find(s => s.id === restoredUser.schoolId);
                }
            } else if (storedUserRole === 'TEACHER') {
                restoredUser = teachers.find(t => t.id === storedUserId);
                if (restoredUser) {
                    restoredSchool = schools.find(s => s.id === restoredUser.schoolId);
                } else {
                    for (const school of schools) {
                        const teacher = school.faculty?.find(t => t.id === storedUserId);
                        if (teacher) {
                            restoredUser = teacher;
                            restoredSchool = school;
                            break;
                        }
                    }
                }
            } else if (storedUserRole === 'PARENT') {
                if (storedUserId === 'P1') {
                    restoredSchool = schools[0];
                    restoredUser = { id: 'P1', schoolId: restoredSchool?.id, name: 'Parent', email: '', childId: '1' };
                }
            }

            if (restoredUser) {
                // Defensive initializations
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
    }, [schools, globalStudents, teachers]);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    return {
        appState,
        setAppState,
        devAuthenticated,
        setDevAuthenticated,
        authMode,
        setAuthMode,
        tempSignupData,
        setTempSignupData,
        restoreSession
    };
};
