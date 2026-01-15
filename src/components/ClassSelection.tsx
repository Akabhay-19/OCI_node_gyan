
import React, { useState } from 'react';
import { Classroom } from '../types';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { UserProfileModal } from './UserProfileModal';
import { Users, ArrowRight, Target } from 'lucide-react';

interface ClassSelectionProps {
    studentName: string;
    username?: string;
    schoolName: string;
    studentGrade?: string;
    classrooms: Classroom[];
    debugClassrooms?: Classroom[];
    onSelectClass: (classId: string) => void;
    onJoinByCode: (code: string) => void;
    onBack?: () => void;
    currentUser?: any;
    onJoinClasses?: (classIds: string[]) => void;
}

export const ClassSelection: React.FC<ClassSelectionProps> = ({
    studentName,
    username,
    schoolName,
    studentGrade,
    classrooms,
    debugClassrooms,
    onSelectClass,
    onJoinClasses,
    onJoinByCode,
    onBack,
    currentUser
}) => {
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [inviteCode, setInviteCode] = useState('');
    const [showProfileModal, setShowProfileModal] = useState(false);

    return (
        <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center relative">
            {showProfileModal && currentUser && (
                <UserProfileModal
                    user={currentUser}
                    onClose={() => setShowProfileModal(false)}
                    role="STUDENT"
                />
            )}
            <div className="absolute top-4 left-4 flex items-center gap-4">
                {onBack && (
                    <NeonButton variant="ghost" onClick={onBack} className="!p-2">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                    </NeonButton>
                )}
                <div
                    className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-white transition-colors"
                    onClick={() => setShowProfileModal(true)}
                >
                    <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan font-bold">
                        {studentName[0]}
                    </div>
                    <span className="font-mono text-sm">@{username || studentName}</span>
                </div>
            </div>

            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                        Welcome to {schoolName}!
                    </h1>
                    <p className="text-xl text-gray-400">
                        Hello {studentName}, {studentGrade ? `please select your Section for ${studentGrade}` : 'please select your Class and Section'}
                    </p>
                </div>

                <div className="flex flex-col items-center gap-8 w-full">
                    {/* Option 1: Join by Code */}
                    <NeonCard className="w-full max-w-2xl p-8 border-neon-purple/30 bg-black/40">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Target className="w-6 h-6 text-neon-purple" />
                            Option 1: Have an Invite Code?
                        </h2>
                        <div className="flex gap-4">
                            <Input
                                placeholder="Enter Class Invite Code"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                                className="flex-1"
                            />
                            <NeonButton
                                onClick={() => onJoinByCode(inviteCode)}
                                disabled={!inviteCode}
                                variant="primary"
                            >
                                Join
                            </NeonButton>
                        </div>
                    </NeonCard>

                    <div className="flex items-center gap-4 w-full max-w-2xl">
                        <div className="h-px bg-white/10 flex-1" />
                        <span className="text-gray-500 font-bold text-sm">OR SELECT FROM LIST</span>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>

                    {/* Option 2: Select from List */}
                    <div className="w-full max-w-6xl flex flex-col items-center gap-6">
                        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 justify-center">
                            <Users className="w-6 h-6 text-neon-cyan" />
                            Option 2: Available Sections for {studentGrade || 'You'}
                        </h2>

                        {classrooms.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                {(() => {
                                    // Calculate if there are classes for this grade that are simply not in 'classrooms' (meaning they are joined)
                                    const totalClassesForGrade = debugClassrooms?.filter(c => !studentGrade || c.name.startsWith(studentGrade)) || [];
                                    const hasJoinedAll = totalClassesForGrade.length > 0 && classrooms.length === 0;

                                    if (hasJoinedAll) {
                                        return (
                                            <>
                                                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                                    <Users className="w-8 h-8 text-green-500" />
                                                </div>
                                                <p className="text-lg text-white font-medium">You have joined all available classes!</p>
                                                <p className="text-sm mt-2 text-gray-400">You are already a member of all active sections for {studentGrade}.</p>
                                            </>
                                        );
                                    } else {
                                        return (
                                            <>
                                                <p>No active sections found for {studentGrade || 'this school'}.</p>
                                                <p className="text-sm mt-2">Please contact your school admin.</p>
                                            </>
                                        );
                                    }
                                })()}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                                {classrooms.map(cls => (
                                    <NeonCard
                                        key={cls.id}
                                        className={`cursor-pointer transition-all duration-300 ${selectedClassIds.includes(cls.id) ? 'ring-2 ring-cyan-400 scale-105' : 'hover:bg-white/5'}`}
                                        glowColor={selectedClassIds.includes(cls.id) ? 'cyan' : 'purple'}
                                        onClick={() => {
                                            setSelectedClassIds(prev =>
                                                prev.includes(cls.id) ? prev.filter(id => id !== cls.id) : [...prev, cls.id]
                                            );
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-3xl font-bold text-white">Section {cls.section}</h3>
                                                <p className="text-sm text-gray-400 mt-1">{cls.name}</p>
                                            </div>
                                            <Users className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <div className="flex justify-between items-center text-sm text-gray-400 border-t border-white/10 pt-4 mt-2">
                                            <span>{cls.studentIds.length} Students</span>
                                            {cls.teacherId && <span className="text-cyan-400">Teacher Assigned</span>}
                                        </div>
                                    </NeonCard>
                                ))}
                            </div>
                        )}

                        <NeonButton
                            onClick={() => {
                                if (onJoinClasses) {
                                    onJoinClasses(selectedClassIds);
                                } else {
                                    selectedClassIds.forEach(id => onSelectClass(id));
                                }
                            }}
                            disabled={selectedClassIds.length === 0}
                            glow={selectedClassIds.length > 0}
                            className={`w-64 mt-4 ${selectedClassIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Join Selected Sections ({selectedClassIds.length}) <ArrowRight className="ml-2 w-4 h-4" />
                        </NeonButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
