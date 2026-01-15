
import React from 'react';
import { Classroom, Student } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { ArrowLeft, Users, User, BookOpen, Trash2, LogOut } from 'lucide-react';

interface ClassDetailViewProps {
    classroom: Classroom;
    students: Student[];
    onBack: () => void;
    getDisplayName?: (student: Student) => string;
    onKickStudent?: (studentId: string, classId: string) => void;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({ classroom, students, onBack, getDisplayName, onKickStudent }) => {
    // Robust filtering: Match by classId directly OR if it's in their list of classes
    const classStudents = students.filter(s => s.classId === classroom.id || s.classIds?.includes(classroom.id));

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <NeonButton variant="ghost" onClick={onBack} className="!p-2">
                    <ArrowLeft className="w-6 h-6" />
                </NeonButton>
                <div>
                    <h2 className="text-3xl font-bold text-white">{classroom.name}</h2>
                    <p className="text-gray-400">Section: {classroom.section} • {classStudents.length} Students</p>
                </div>
            </div>

            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-neon-purple" /> Subjects
                </h3>
                <div className="flex flex-wrap gap-2">
                    {classroom.subjects?.map(sub => (
                        <span key={sub.id} className="px-3 py-1 bg-neon-purple/20 text-purple-300 rounded-full text-sm border border-neon-purple/30">
                            {sub.name}
                        </span>
                    ))}
                    {(!classroom.subjects || classroom.subjects.length === 0) && (
                        <span className="text-gray-500 text-sm italic">No subjects assigned.</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classStudents.map(student => (
                    <NeonCard key={student.id} glowColor="cyan" className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold text-xl">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="font-bold text-white">{getDisplayName ? getDisplayName(student) : student.name}</h4>
                            <p className="text-xs text-gray-400">Roll: {student.rollNumber || 'N/A'}</p>
                            <div className="flex gap-2 mt-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded ${student.status === 'At Risk' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {student.status}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                    {student.attendance}% Att.
                                </span>
                            </div>
                        </div>
                        {onKickStudent && (
                            <button
                                className="ml-auto p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                title="Remove Student from Class"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Are you sure you want to remove ${student.name} from this class?`)) {
                                        onKickStudent(student.id, classroom.id);
                                    }
                                }}
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </NeonCard>
                ))}
                {classStudents.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No students enrolled in this class yet.</p>
                    </div>
                )}
            </div>
        </div >
    );
};
