
import React, { useState, useEffect } from 'react';
import { Classroom, Student } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { ArrowLeft, Users, User, BookOpen, Trash2, LogOut, Calendar, CheckCircle2, History, X, Save, XCircle } from 'lucide-react';
import { TeacherAttendance } from './Features/TeacherAttendance';

interface ClassDetailViewProps {
    classroom: Classroom;
    students: Student[];
    onBack: () => void;
    getDisplayName?: (student: Student) => string;
    onKickStudent?: (studentId: string, classId: string) => void;
    teacherId?: string;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({ classroom, students, onBack, getDisplayName, onKickStudent, teacherId }) => {
    const [activeSubTab, setActiveSubTab] = useState<'STUDENTS' | 'ATTENDANCE'>('STUDENTS');

    // Robust filtering: Match by classId directly OR if it's in their list of classes
    const classStudents = students.filter(s => s.classId === classroom.id || s.classIds?.includes(classroom.id));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/10"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-display font-bold text-white mb-1">{classroom.name}</h2>
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan text-xs font-bold border border-neon-cyan/30">
                                Section {classroom.section}
                            </span>
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                <Users className="w-4 h-4" /> {classStudents.length} Students
                            </span>
                            <span className="text-gray-400 text-sm flex items-center gap-1">
                                <BookOpen className="w-4 h-4" /> {classroom.subjects?.length || 0} Subjects
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-tabs inside Header */}
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => setActiveSubTab('STUDENTS')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'STUDENTS' ? 'bg-neon-cyan text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Users className="w-4 h-4" /> Students
                    </button>
                    <button
                        onClick={() => setActiveSubTab('ATTENDANCE')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeSubTab === 'ATTENDANCE' ? 'bg-neon-purple text-white shadow-[0_0_15px_rgba(188,19,254,0.5)]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Calendar className="w-4 h-4" /> Attendance
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeSubTab === 'STUDENTS' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Subjects Summary Strip */}
                    <div className="flex flex-wrap gap-2 pb-2">
                        {classroom.subjects?.map(sub => (
                            <span key={sub.id} className="px-3 py-1 bg-white/5 text-gray-300 rounded-lg text-xs border border-white/10 hover:border-neon-cyan/30 transition-colors">
                                {sub.name}
                            </span>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classStudents.map(student => (
                            <NeonCard key={student.id} glowColor="cyan" className="group relative overflow-hidden">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-blue-500/20 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan font-bold text-2xl group-hover:scale-105 transition-transform">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-white text-lg group-hover:text-neon-cyan transition-colors truncate">
                                            {getDisplayName ? getDisplayName(student) : student.name}
                                        </h4>
                                        <p className="text-xs text-gray-500 font-medium">Roll: {student.rollNumber || student.id.slice(-4).toUpperCase()}</p>

                                        <div className="flex gap-2 mt-2">
                                            <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10 flex flex-col">
                                                <span className="text-[8px] text-gray-500 uppercase font-black leading-none mb-1">Attendance</span>
                                                <span className={`text-xs font-bold ${student.attendance >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{student.attendance}%</span>
                                            </div>
                                            <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10 flex flex-col">
                                                <span className="text-[8px] text-gray-500 uppercase font-black leading-none mb-1">Score</span>
                                                <span className="text-xs font-bold text-neon-purple">{student.avgScore}%</span>
                                            </div>
                                            <div className="bg-white/5 px-2 py-1 rounded-md border border-white/10 flex flex-col">
                                                <span className="text-[8px] text-gray-500 uppercase font-black leading-none mb-1">Status</span>
                                                <span className={`text-xs font-bold ${student.status === 'At Risk' ? 'text-red-400' : 'text-neon-cyan'}`}>{student.status}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {onKickStudent && (
                                        <button
                                            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove Student from Class"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Are you sure you want to remove ${student.name} from this class?`)) {
                                                    onKickStudent(student.id, classroom.id);
                                                }
                                            }}
                                        >
                                            <LogOut className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Hover background effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                            </NeonCard>
                        ))}
                        {classStudents.length === 0 && (
                            <div className="col-span-full bg-white/5 rounded-2xl border border-dashed border-white/10 p-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <Users className="w-8 h-8 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-400">Empty Class</h3>
                                <p className="text-gray-500 mt-1">No students have joined this section yet.</p>
                                <div className="mt-6 flex justify-center">
                                    <div className="px-4 py-2 bg-neon-cyan/10 border border-neon-cyan/20 rounded-lg text-neon-cyan font-mono text-sm">
                                        Invite Code: <span className="font-bold underline">{classroom.inviteCode}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeSubTab === 'ATTENDANCE' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 bg-white/5 p-6 rounded-2xl border border-white/10">
                    <TeacherAttendance
                        classrooms={[classroom]}
                        students={classStudents}
                        teacherId={teacherId}
                    // Manual select is not needed here as we are already in class view
                    />
                </div>
            )}
        </div >
    );
};
