import React, { useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Classroom, Student } from '../../types';
import { Users, CheckCircle2, XCircle, ArrowLeft, Save, Calendar, Folder, History, X } from 'lucide-react';
import { AttendanceView } from './AttendanceView';

interface TeacherAttendanceProps {
    classrooms: Classroom[];
    students: Student[];
    teacherId?: string; // New prop to identify teacher
    onSaveAttendance?: (classId: string, date: string, records: { studentId: string, status: 'PRESENT' | 'ABSENT' | 'HOLIDAY' }[]) => void;
}

export const TeacherAttendance: React.FC<TeacherAttendanceProps> = ({ classrooms, students, teacherId, onSaveAttendance }) => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [attendanceData, setAttendanceData] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'HOLIDAY'>>({});
    const [isSaved, setIsSaved] = useState(false);
    const [viewHistoryStudent, setViewHistoryStudent] = useState<Student | null>(null);

    const activeClass = classrooms.find(c => c.id === selectedClassId);

    // Filter students for the selected class
    const classStudents = students.filter(s => s.classId === selectedClassId);

    const [showMissedPrompt, setShowMissedPrompt] = useState(false);
    const [missedDate, setMissedDate] = useState<string>("");

    const handleClassSelect = (classId: string) => {
        setSelectedClassId(classId);

        // CHECK YESTERDAY'S ATTENDANCE
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = `attendance_${classId}_${yesterday.toLocaleDateString()}`;

        // Only check if yesterday was NOT a Sunday (simple logic for now)
        // Adjust logic if needed (e.g. check if yesterday was holiday via other means?)
        // For MVP: If yesterday data missing and yesterday wasn't Sunday, PROMPT.
        if (yesterday.getDay() !== 0 && !localStorage.getItem(yesterdayKey)) {
            setMissedDate(yesterday.toLocaleDateString());
            setShowMissedPrompt(true);
        }

        // CHECK TODAY'S ATTENDANCE
        const todayKey = `attendance_${classId}_${new Date().toLocaleDateString()}`;
        const savedData = localStorage.getItem(todayKey);

        if (savedData) {
            setAttendanceData(JSON.parse(savedData));
            setIsSaved(true); // Treat as saved/locked
        } else {
            // Reset attendance data for new class selection, initially empty
            // AUTO-DETECT SUNDAY
            const today = new Date();
            if (today.getDay() === 0) { // 0 is Sunday
                const holidayData: Record<string, 'HOLIDAY'> = {};
                students.filter(s => s.classId === classId).forEach(s => {
                    holidayData[s.id] = 'HOLIDAY'; // Mark all as Holiday
                });
                setAttendanceData(holidayData);
                // Auto-lock for Sunday
                // We need to SAVE it so it persists and doesn't trigger "missed" tomorrow
                localStorage.setItem(todayKey, JSON.stringify(holidayData));
                setIsSaved(true);
            } else {
                setAttendanceData({});
                setIsSaved(false);
            }
        }
    };

    const resolveMissed = (type: 'HOLIDAY' | 'LEAVE') => {
        if (!selectedClassId) return;
        const key = `attendance_${selectedClassId}_${missedDate}`;

        if (type === 'HOLIDAY') {
            // Save generic holiday data
            const holidayData: Record<string, 'HOLIDAY'> = {};
            students.filter(s => s.classId === selectedClassId).forEach(s => {
                holidayData[s.id] = 'HOLIDAY';
            });
            localStorage.setItem(key, JSON.stringify(holidayData));
        } else {
            // LEAVE logic: Mark Teacher Absent
            if (teacherId) {
                const teacherKey = `teacher_status_${teacherId}_${missedDate}`;
                localStorage.setItem(teacherKey, 'LEAVE');
            }

            const leaveData: Record<string, 'HOLIDAY'> = {}; // Reuse holiday status for students
            students.filter(s => s.classId === selectedClassId).forEach(s => {
                leaveData[s.id] = 'HOLIDAY';
            });
            localStorage.setItem(key, JSON.stringify(leaveData));
            console.log(`Teacher marked LEAVE for ${missedDate}`);
        }
        setShowMissedPrompt(false);
    };

    const setStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'HOLIDAY') => {
        if (isSaved) return; // Prevent editing once saved
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: status
        }));
    };

    const markAll = (status: 'PRESENT' | 'ABSENT' | 'HOLIDAY') => {
        if (isSaved) return; // Prevent editing once saved
        const newData: Record<string, 'PRESENT' | 'ABSENT' | 'HOLIDAY'> = {};
        classStudents.forEach(s => {
            newData[s.id] = status;
        });
        setAttendanceData(newData);
    };

    const handleSave = () => {
        if (!selectedClassId) return;

        // VALIDATION: Ensure all students are marked
        const unmarked = classStudents.filter(s => !attendanceData[s.id]);
        if (unmarked.length > 0) {
            alert(`Please mark attendance for all students. ${unmarked.length} remaining.`);
            return;
        }

        const records = Object.entries(attendanceData).map(([studentId, status]) => ({ studentId, status }));

        // PERSIST TO LOCAL STORAGE
        const todayKey = `attendance_${selectedClassId}_${new Date().toLocaleDateString()}`;
        localStorage.setItem(todayKey, JSON.stringify(attendanceData));

        // Mock API call or callback
        console.log("Saving attendance:", { classId: selectedClassId, date: new Date().toISOString(), records });
        if (onSaveAttendance) {
            onSaveAttendance(selectedClassId, new Date().toISOString(), records);
        }

        setIsSaved(true);
        alert("Attendance Saved! It cannot be edited again for today.");
    };

    // --- FOLDER VIEW (Select Class) ---
    if (!selectedClassId) {
        return (
            <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Calendar className="w-6 h-6 text-neon-cyan" /> Mark Attendance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {classrooms.map(c => {
                        const count = students.filter(s => s.classId === c.id).length;
                        return (
                            <NeonCard
                                key={c.id}
                                glowColor="cyan"
                                className="cursor-pointer hover:scale-105 transition-transform group"
                                onClick={() => handleClassSelect(c.id)}
                            >
                                <Folder className="w-10 h-10 text-neon-cyan mb-4 group-hover:text-white transition-colors" />
                                <h3 className="text-xl font-bold text-white clip-text">{c.name}</h3>
                                <p className="text-gray-400 text-sm">Section: {c.section}</p>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {count} Students</span>
                                </div>
                            </NeonCard>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- LIST VIEW (Mark Attendance) ---
    return (
        <div className="animate-fade-in space-y-6">
            {viewHistoryStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in">
                    <div className="bg-[#0f1115] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                        <button
                            onClick={() => setViewHistoryStudent(null)}
                            className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-50"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="p-8">
                            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                                <History className="w-8 h-8 text-neon-purple" />
                                Attendance History
                            </h2>
                            <p className="text-gray-400 mb-8">Viewing record for <span className="text-neon-cyan font-bold">{viewHistoryStudent.name}</span></p>
                            <AttendanceView student={viewHistoryStudent} />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedClassId(null)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{activeClass?.name} - {activeClass?.section}</h2>
                        <p className="text-gray-400 text-sm">{new Date().toLocaleDateString()} • {classStudents.length} Students</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isSaved ? (
                        // CHECK IF IT WAS A HOLIDAY SAVE
                        Object.values(attendanceData).every(v => v === 'HOLIDAY') ? (
                            <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5" /> Holiday Marked for Today
                            </div>
                        ) : (
                            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" /> Attendance Locked for Today
                            </div>
                        )
                    ) : (
                        <>
                            <NeonButton size="sm" variant="secondary" onClick={() => { markAll('HOLIDAY'); handleSave(); }} className="!bg-orange-500/10 !text-orange-400 !border-orange-500/20 hover:!bg-orange-500/20">
                                Holiday
                            </NeonButton>
                            <NeonButton size="sm" variant="secondary" onClick={() => markAll('PRESENT')}>Mark All Present</NeonButton>
                            <NeonButton
                                onClick={handleSave}
                                glow
                            >
                                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Attendance</span>
                            </NeonButton>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-white/10">
                    <div className="col-span-1">Roll No</div>
                    <div className="col-span-4">Student Name</div>
                    <div className="col-span-4">Current Status</div>
                    <div className="col-span-3 text-right">Action</div>
                </div>

                <div className="divide-y divide-white/5">
                    {classStudents.map(student => (
                        <div key={student.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors">
                            <div className="col-span-1 text-gray-400 font-mono text-sm">
                                {student.rollNumber || '#'}
                            </div>
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-white text-xs">
                                    {student.name.charAt(0)}
                                </div>
                                <span className="text-white font-medium">{student.name}</span>
                                <button
                                    onClick={() => setViewHistoryStudent(student)}
                                    className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-neon-purple transition-colors"
                                    title="View Attendance History"
                                >
                                    <History className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="col-span-4">
                                {attendanceData[student.id] === 'PRESENT' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Present
                                    </span>
                                )}
                                {attendanceData[student.id] === 'ABSENT' && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Absent
                                    </span>
                                )}
                                {!attendanceData[student.id] && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div> Pending
                                    </span>
                                )}
                            </div>
                            <div className="col-span-3 text-right flex justify-end gap-2">
                                <button
                                    onClick={() => setStatus(student.id, 'PRESENT')}
                                    className={`
                                        p-2 rounded-lg border transition-all flex items-center gap-2
                                        ${attendanceData[student.id] === 'PRESENT'
                                            ? 'bg-green-500 text-white border-green-500'
                                            : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                                        }
                                    `}
                                    title="Mark Present"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setStatus(student.id, 'ABSENT')}
                                    className={`
                                        p-2 rounded-lg border transition-all flex items-center gap-2
                                        ${attendanceData[student.id] === 'ABSENT'
                                            ? 'bg-red-500 text-white border-red-500'
                                            : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                        }
                                    `}
                                    title="Mark Absent"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {classStudents.length === 0 && (
                        <div className="p-8 text-center text-gray-500 italic">
                            No students enrolled in this class.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
