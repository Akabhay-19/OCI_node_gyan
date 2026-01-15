
import React, { useState, useEffect } from 'react';
import { Teacher, Classroom } from '../types';
import { NeonCard, NeonButton } from './UIComponents';
import { X, Check, BookOpen } from 'lucide-react';

interface AssignClassesModalProps {
    teacher: Teacher;
    availableClasses: Classroom[];
    onSave: (teacherId: string, assignedClassIds: string[]) => Promise<void>;
    onClose: () => void;
}

export const AssignClassesModal: React.FC<AssignClassesModalProps> = ({ teacher, availableClasses, onSave, onClose }) => {
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        if (teacher.assignedClasses) {
            setSelectedClassIds(teacher.assignedClasses);
        }
    }, [teacher]);

    const toggleClass = (classId: string) => {
        setSelectedClassIds(prev =>
            prev.includes(classId)
                ? prev.filter(id => id !== classId)
                : [...prev, classId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(teacher.id, selectedClassIds);
            onClose();
        } catch (e) {
            alert("Failed to save assignments");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="w-full max-w-lg relative" glowColor="purple">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-2">Assign Classes</h2>
                <p className="text-gray-400 mb-6">Select classes for <span className="text-neon-purple font-bold">{teacher.name}</span></p>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar my-4">
                    {availableClasses.map(c => (
                        <div
                            key={c.id}
                            onClick={() => toggleClass(c.id)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${selectedClassIds.includes(c.id)
                                ? 'bg-neon-purple/20 border-neon-purple text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <BookOpen className={`w-5 h-5 ${selectedClassIds.includes(c.id) ? 'text-neon-purple' : 'text-gray-500'}`} />
                                <div>
                                    <p className="font-bold">{c.name}</p>
                                    <p className="text-xs opacity-70">Section: {c.section}</p>
                                </div>
                            </div>
                            {selectedClassIds.includes(c.id) && <Check className="w-5 h-5 text-neon-purple" />}
                        </div>
                    ))}
                    {availableClasses.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No classes available.</p>
                    )}
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex justify-end gap-3">
                    <NeonButton variant="ghost" onClick={onClose}>Cancel</NeonButton>
                    <NeonButton onClick={handleSave} isLoading={isSaving} glow>Assign Classes</NeonButton>
                </div>
            </NeonCard>
        </div>
    );
};
