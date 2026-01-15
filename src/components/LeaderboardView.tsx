
import React, { useState, useMemo } from 'react';
import { Classroom, Student, UserRole, Teacher } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { Leaderboard } from './Features/Leaderboard';
import { ArrowLeft, ChevronRight } from 'lucide-react';

interface LeaderboardViewProps {
    classrooms: Classroom[];
    students: Student[];
    userRole: UserRole;
    currentUser?: any;
    onBack?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ classrooms, students, userRole, currentUser, onBack }) => {
    const [view, setView] = useState<'SELECT_CLASS' | 'LEADERBOARD'>('SELECT_CLASS');
    const [selectedClass, setSelectedClass] = useState<Classroom | null>(null);

    // Filter available classes based on role
    const availableClasses = useMemo(() => {
        if (userRole === 'ADMIN') return classrooms;
        if (userRole === 'TEACHER') {
            const teacher = currentUser as Teacher;
            return classrooms.filter(c => teacher.assignedClasses?.includes(c.id));
        }
        return [];
    }, [classrooms, userRole, currentUser]);

    // Group classes by Grade (for Admin view mostly)
    const groupedClasses = useMemo(() => {
        const groups: { [key: string]: Classroom[] } = {};
        availableClasses.forEach(c => {
            // Extract Grade from name (e.g., "Grade 6 - Section A" -> "Grade 6")
            const grade = c.name.split('-')[0].trim();
            if (!groups[grade]) groups[grade] = [];
            groups[grade].push(c);
        });
        return groups;
    }, [availableClasses]);

    const handleClassSelect = (c: Classroom) => {
        setSelectedClass(c);
        setView('LEADERBOARD');
    };

    if (view === 'LEADERBOARD' && selectedClass) {
        const classStudents = students.filter(s => s.classId === selectedClass.id);
        return (
            <div className="space-y-6 animate-fade-in">
                <NeonButton variant="ghost" onClick={() => setView('SELECT_CLASS')} className="!p-2">
                    <ArrowLeft className="w-6 h-6" /> Back to Classes
                </NeonButton>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white">{selectedClass.name}</h2>
                    <p className="text-gray-400">Section {selectedClass.section}</p>
                </div>
                <Leaderboard students={classStudents} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-3xl font-bold text-white mb-6">Select Class for Leaderboard</h2>

            {Object.entries(groupedClasses).map(([grade, classes]) => (
                <div key={grade} className="space-y-4">
                    <h3 className="text-xl font-bold text-neon-cyan border-b border-white/10 pb-2">{grade}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classes.map(c => (
                            <NeonCard
                                key={c.id}
                                glowColor="purple"
                                className="cursor-pointer hover:border-neon-purple transition-colors group"
                                onClick={() => handleClassSelect(c)}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-white">{c.name}</h4>
                                        <p className="text-sm text-gray-400">Section: {c.section}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                            </NeonCard>
                        ))}
                    </div>
                </div>
            ))}

            {availableClasses.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <p>No classes available.</p>
                </div>
            )}
        </div>
    );
};
