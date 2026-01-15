import React, { useState, useRef } from 'react';
import { Student, Teacher, Parent } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { X, Mail, Phone, User, Hash, School, BookOpen, Camera, Save, Edit2 } from 'lucide-react';

interface UserProfileModalProps {
    user: Student | Teacher | Parent;
    onClose: () => void;
    onUpdateUser?: (updatedUser: any) => void;
    role?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onUpdateUser, role = 'STUDENT' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email || '',
        mobileNumber: (user as any).mobileNumber || '',
        profilePic: (user as any).profilePic || '' // Assuming we add this field or just handle it here
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const isStudent = (u: any): u is Student => u.grade !== undefined;

    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleSave = () => {
        if (onUpdateUser) {
            onUpdateUser({
                ...user,
                ...formData
            });
        }
        setIsEditing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, profilePic: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="w-full max-w-md relative" glowColor="cyan" onClick={(e) => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center mb-6 relative">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg shadow-cyan-500/20 overflow-hidden border-2 border-white/20">
                            {formData.profilePic ? (
                                <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                user.name.charAt(0)
                            )}
                        </div>
                        {isEditing && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                            >
                                <Camera className="w-8 h-8 text-white" />
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {isEditing ? (
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-white/10 border border-white/20 rounded px-3 py-1 text-center font-bold text-white mb-1 focus:outline-none focus:border-neon-cyan"
                        />
                    ) : (
                        <h2 className="text-2xl font-bold text-white text-center">{user.name}</h2>
                    )}

                    <p className="text-cyan-400 font-mono text-sm">@{(user as any).username || user.name.toLowerCase().replace(/\s/g, '')}</p>
                    <span className="mt-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold text-gray-300 border border-white/10">
                        {role}
                    </span>
                </div>

                <div className="space-y-4">
                    {/* Email */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Email</p>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-transparent border-b border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                                />
                            ) : (
                                <p className="text-white">{user.email || 'Not provided'}</p>
                            )}
                        </div>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                            <p className="text-xs text-gray-500">Mobile</p>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={formData.mobileNumber}
                                    onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                                    className="w-full bg-transparent border-b border-white/20 text-white focus:outline-none focus:border-neon-cyan"
                                />
                            ) : (
                                <p className="text-white">{(user as any).mobileNumber || 'Not provided'}</p>
                            )}
                        </div>
                    </div>

                    {/* Student Specifics (Read Only for now) */}
                    {isStudent(user) && (
                        <>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 opacity-70">
                                <Hash className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Roll Number</p>
                                    <p className="text-white">{user.rollNumber || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 opacity-70">
                                <BookOpen className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Grade</p>
                                    <p className="text-white">{user.grade}</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Teacher Specifics */}
                    {!isStudent(user) && (user as Teacher).subject && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 opacity-70">
                            <BookOpen className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500">Subject</p>
                                <p className="text-white">{(user as Teacher).subject}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    {isEditing ? (
                        <NeonButton onClick={handleSave} glow variant="primary" size="sm">
                            <Save className="w-4 h-4 mr-2" /> Save Changes
                        </NeonButton>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 text-sm text-neon-cyan hover:text-white transition-colors"
                        >
                            <Edit2 className="w-4 h-4" /> Edit Profile
                        </button>
                    )}
                </div>
            </NeonCard>
        </div>
    );
};
