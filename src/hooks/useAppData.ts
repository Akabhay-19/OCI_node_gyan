import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { SchoolProfile, Student, Classroom, Announcement, Teacher } from '../types';

export const useAppData = () => {
    const [schools, setSchools] = useState<SchoolProfile[]>([]);
    const [globalStudents, setGlobalStudents] = useState<Student[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [needsMigration, setNeedsMigration] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            let schoolsRes: SchoolProfile[] = [];
            let studentsRes: Student[] = [];
            let classroomsRes: Classroom[] = [];
            let announcementsRes: Announcement[] = [];
            let teachersRes: Teacher[] = [];

            try {
                schoolsRes = await api.getSchools(true);
            } catch (e) {
                console.error("Public schools fetch failed:", e);
                throw new Error("Failed to connect to the server. Please ensure the backend is running.");
            }

            if (localStorage.getItem('GYAN_TOKEN')) {
                try {
                    [studentsRes, classroomsRes, announcementsRes, teachersRes] = await Promise.all([
                        api.getStudents(),
                        api.getClassrooms(),
                        api.getAnnouncements(),
                        api.getTeachers()
                    ]);
                } catch (e) {
                    console.warn("Protected data fetch failed (likely expired token). Clearing session.", e);
                    localStorage.removeItem('GYAN_TOKEN');
                    localStorage.removeItem('GYAN_USER_ID');
                    localStorage.removeItem('GYAN_USER_ROLE');
                    localStorage.removeItem('GYAN_SCHOOL_ID');
                }
            }

            // Merge Teachers into Schools (Faculty) for Admin Dashboard compatibility
            const schoolsWithFaculty = schoolsRes.map(school => ({
                ...school,
                faculty: teachersRes.filter(t => t.schoolId === school.id)
            }));

            setSchools(schoolsWithFaculty);
            setGlobalStudents(studentsRes);
            setClassrooms(classroomsRes);
            setAnnouncements(announcementsRes);
            setTeachers(teachersRes);

            if (schoolsRes.length === 0 && localStorage.getItem('GYAN_V2_SCHOOLS')) {
                setNeedsMigration(true);
            }
        } catch (e: any) {
            setError(e.message || "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        schools,
        setSchools,
        globalStudents,
        setGlobalStudents,
        classrooms,
        setClassrooms,
        announcements,
        setAnnouncements,
        teachers,
        setTeachers,
        isLoading,
        setIsLoading,
        error,
        setError,
        needsMigration,
        setNeedsMigration,
        refreshData: fetchData
    };
};
