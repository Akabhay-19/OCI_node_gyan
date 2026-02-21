import React, { useState, useEffect } from 'react';
import { NeonCard } from '../UIComponents';
import { Student } from '../../types';
import { Calendar, CheckCircle2, XCircle, Info, Clock, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface AttendanceViewProps {
    student: Student;
    classId?: string; // [NEW]
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ student, classId }) => {
    const [selectedDate, setSelectedDate] = useState<{ date: Date, status: string | null, time: string } | null>(null);
    const [hoveredDate, setHoveredDate] = useState<{ date: Date, status: string | null, time: string } | null>(null);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ present: 0, absent: 0, percentage: 100 });

    // Fetch attendance from API on mount
    useEffect(() => {
        const fetchAttendance = async () => {
            setIsLoading(true);
            const targetClassId = (classId && classId !== 'ALL') ? classId : student.classId;

            try {
                // Fetch from database
                const result = await api.getStudentAttendance(student.id, targetClassId, 365);

                const data = (result.records || []).map((record: any) => ({
                    date: new Date(record.date),
                    status: record.status,
                    value: record.status === 'PRESENT' ? 1 : 0,
                    time: record.checkInTime || record.time || '-'
                }));

                // Add missing dates (weekends vs not recorded) for visual consistency
                const visualData = fillMissingDates(data, student.createdAt);

                setAttendanceData(visualData);
                if (result.stats) {
                    setStats({
                        present: result.stats.present,
                        absent: result.stats.absent,
                        percentage: result.stats.percentage
                    });
                }
            } catch (error) {
                console.error('Error fetching attendance from API:', error);
                setAttendanceData([]);
            } finally {
                setIsLoading(false);
            }
        };

        const fillMissingDates = (data: any[], createdAt?: string | number | Date) => {
            const resultData = [];
            const today = new Date();
            const joiningDate = createdAt ? new Date(createdAt) : (() => {
                const d = new Date();
                d.setDate(d.getDate() - 90); // Default to last 90 days if no creation date
                return d;
            })();

            // Normalize dates to start of day for comparison
            const dateMap = new Map();
            data.forEach(item => {
                const dayStr = item.date.toISOString().split('T')[0];
                dateMap.set(dayStr, item);
            });

            const dayCount = Math.ceil((today.getTime() - joiningDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const limit = Math.min(dayCount, 365);

            for (let i = 0; i < limit; i++) {
                const date = new Date(joiningDate);
                date.setDate(joiningDate.getDate() + i);
                if (date > today) break;

                const dayStr = date.toISOString().split('T')[0];
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                if (dateMap.has(dayStr)) {
                    resultData.push(dateMap.get(dayStr));
                } else if (isWeekend) {
                    resultData.push({ date, status: null, value: 0, time: '-' });
                } else {
                    resultData.push({ date, status: 'NOT_RECORDED', value: 0, time: '-' });
                }
            }
            return resultData;
        };

        fetchAttendance();
    }, [student.classId, student.id, student.createdAt, classId]);

    // Calculate totals from data
    const totalPresent = stats.present;
    const totalAbsent = stats.absent;

    // Grid helper: split into weeks
    const weeks: any[] = [];
    let currentWeek: any[] = [];
    attendanceData.forEach((day, index) => {
        currentWeek.push(day);
        if (currentWeek.length === 7 || index === attendanceData.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <NeonCard glowColor="green" className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Present Days</p>
                        <p className="text-3xl font-bold text-white">{totalPresent}</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                </NeonCard>
                <NeonCard glowColor="red" className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Absent Days</p>
                        <p className="text-3xl font-bold text-white">{totalAbsent}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                        <XCircle className="w-8 h-8" />
                    </div>
                </NeonCard>
                <NeonCard glowColor="blue" className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm font-medium">Overall Rate</p>
                        <p className="text-3xl font-bold text-white">{student.attendance}%</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                        <Calendar className="w-8 h-8" />
                    </div>
                </NeonCard>
            </div>

            <NeonCard className="p-6 md:p-8 overflow-x-auto" glowColor="purple">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-neon-purple" />
                        Attendance History
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-[#161b22] border border-white/5"></div> Weekend</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-600/40 border border-gray-500/60"></div> Not Recorded</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500/40 border border-red-500/60"></div> Absent</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-500/40 border border-green-500/60"></div> Present</div>
                    </div>
                </div>

                <div className="min-w-[800px]">
                    {/* Contributions Graph */}
                    <div className="flex gap-1">
                        {weeks.map((week: any[], wIdx: number) => (
                            <div key={wIdx} className="flex flex-col gap-1">
                                {week.map((day: any, dIdx: number) => (
                                    <div
                                        key={dIdx}
                                        onClick={() => setSelectedDate({ date: day.date, status: day.status, time: day.time })}
                                        onMouseEnter={() => setHoveredDate({ date: day.date, status: day.status, time: day.time })}
                                        onMouseLeave={() => setHoveredDate(null)}
                                        className={`
                                            w-3 h-3 rounded-sm transition-all duration-200 relative cursor-pointer border
                                            ${selectedDate?.date.toDateString() === day.date.toDateString() ? 'ring-2 ring-white z-10' : ''}
                                            ${hoveredDate?.date.toDateString() === day.date.toDateString() ? 'scale-150 z-50 ring-2 ring-neon-purple' : 'hover:scale-125 hover:z-20'}
                                            ${day.status === 'PRESENT' ? 'bg-green-500/40 border-green-500/60' :
                                                day.status === 'ABSENT' ? 'bg-red-500/40 border-red-500/60' :
                                                    day.status === 'NOT_RECORDED' ? 'bg-gray-600/40 border-gray-500/60' :
                                                        'bg-[#161b22] border-white/5'}
                                        `}
                                    >
                                        {/* Single Active Tooltip */}
                                        {hoveredDate?.date.toDateString() === day.date.toDateString() && (
                                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-[100] whitespace-nowrap bg-gray-900/95 backdrop-blur-md text-white text-xs px-4 py-3 rounded-xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-150 pointer-events-none">
                                                <div className="font-bold text-sm mb-1 text-white border-b border-white/10 pb-1">
                                                    {day.date.toLocaleDateString('en-US', { weekday: 'long' })}
                                                </div>
                                                <div className="text-gray-400 text-[10px] mb-2">{day.date.toLocaleDateString()}</div>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${day.status === 'PRESENT' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' :
                                                        day.status === 'ABSENT' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]' :
                                                            day.status === 'NOT_RECORDED' ? 'bg-gray-400' :
                                                                'bg-gray-500'
                                                        }`}></div>
                                                    <span className={`font-bold ${day.status === 'PRESENT' ? 'text-green-400' :
                                                        day.status === 'ABSENT' ? 'text-red-400' :
                                                            day.status === 'NOT_RECORDED' ? 'text-gray-400' :
                                                                'text-gray-500'
                                                        }`}>
                                                        {day.status === 'NOT_RECORDED' ? 'Not Recorded' : day.status || 'No Class'}
                                                    </span>
                                                    {day.status === 'PRESENT' && <span className="text-gray-500 pl-1 border-l border-white/10 ml-1">{day.time}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-gray-500 text-xs flex justify-between">
                        <span>{weeks[0]?.[0]?.date.toLocaleDateString()}</span>
                        <span>Today</span>
                    </div>
                </div>
            </NeonCard>

            {/* Selected Date Detail Panel */}
            {selectedDate && (
                <NeonCard className="p-6 animate-fade-in" glowColor={selectedDate.status === 'PRESENT' ? 'green' : selectedDate.status === 'ABSENT' ? 'red' : 'purple'}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedDate.status === 'PRESENT' ? 'bg-green-500/20 text-green-400' :
                                selectedDate.status === 'ABSENT' ? 'bg-red-500/20 text-red-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                {selectedDate.status === 'PRESENT' ? <CheckCircle2 className="w-6 h-6" /> :
                                    selectedDate.status === 'ABSENT' ? <XCircle className="w-6 h-6" /> :
                                        <Info className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {selectedDate.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h3>
                                <p className={`text-sm ${selectedDate.status === 'PRESENT' ? 'text-green-400' :
                                    selectedDate.status === 'ABSENT' ? 'text-red-400' :
                                        selectedDate.status === 'NOT_RECORDED' ? 'text-gray-400' :
                                            'text-gray-500'
                                    }`}>
                                    {selectedDate.status === 'PRESENT' ? 'Present' :
                                        selectedDate.status === 'ABSENT' ? 'Absent' :
                                            selectedDate.status === 'NOT_RECORDED' ? 'Attendance Not Recorded' :
                                                'No Class (Weekend)'}
                                </p>
                            </div>
                        </div>
                        {selectedDate.status === 'PRESENT' && selectedDate.time !== '-' && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Check-in: {selectedDate.time}</span>
                            </div>
                        )}
                    </div>
                </NeonCard>
            )}
        </div>
    );
};
