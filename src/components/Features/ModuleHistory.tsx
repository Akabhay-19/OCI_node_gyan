
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ModuleHistoryItem } from '../../types';
import { NeonCard, NeonButton } from '../UIComponents';
import { Clock, Book, Brain, FileText, Zap, ChevronRight, ChevronDown } from 'lucide-react';

interface ModuleHistoryProps {
    studentId: string;
    onLoad?: (item: ModuleHistoryItem) => void;
    contextClass?: any; // [NEW]
}

export const ModuleHistory: React.FC<ModuleHistoryProps> = ({ studentId, onLoad, contextClass }) => {
    const [history, setHistory] = useState<ModuleHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadHistory();
    }, [studentId]);

    const loadHistory = async () => {
        try {
            const data = await api.getModuleHistory(studentId);
            setHistory(data);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setLoading(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'QUIZ': return <Brain className="text-yellow-400" />;
            case 'FLASHCARDS': return <Zap className="text-neon-cyan" />;
            case 'STUDY_PLAN': return <Book className="text-neon-purple" />;
            case 'STORY': return <FileText className="text-pink-400" />;
            default: return <FileText className="text-gray-400" />;
        }
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return <div className="p-8 text-center animate-pulse text-gray-400">Loading history...</div>;

    if (history.length === 0) return (
        <div className="text-center py-20 text-gray-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>No generation history found yet.</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pb-8 animate-fade-in-up">
            <h2 className="text-3xl font-display font-bold mb-4 flex items-center gap-3">
                <Clock className="text-neon-cyan" /> Generation History
            </h2>

            <div className="grid gap-4">
                {history.filter(item => {
                    // If no context (ALL), show everything
                    if (!contextClass) return true;
                    // If item has classId, must match
                    if (item.classId && item.classId !== contextClass.id) return false;
                    // For legacy items without classId, maybe filter by subject if available?
                    // For now, show legacy items everywhere or just ALL? 
                    // Let's show legacy items everywhere to avoid hiding old user data.
                    return true;
                }).map((item) => (
                    <NeonCard key={item.id} className="transition-all hover:bg-white/5">
                        <div
                            className="p-4 flex items-center gap-4 cursor-pointer"
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        >
                            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                {getTypeIcon(item.type)}
                            </div>
                            <div className="flex-grow">
                                <h3 className="font-bold text-lg text-gray-200">{item.topic || 'Untitled'}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                    <span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">{item.type}</span>
                                    <span>{formatDate(item.createdAt)}</span>
                                </div>
                            </div>
                            <div className="text-gray-500">
                                {expandedId === item.id ? <ChevronDown /> : <ChevronRight />}
                            </div>
                        </div>

                        {expandedId === item.id && (
                            <div className="p-4 border-t border-white/10 bg-black/20 text-sm overflow-x-auto">
                                <pre className="text-gray-400 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                                    {JSON.stringify(item.content, null, 2)}
                                </pre>
                                <div className="mt-4 flex justify-end">
                                    <NeonButton size="sm" onClick={() => onLoad && onLoad(item)}>
                                        Open Module
                                    </NeonButton>
                                </div>
                            </div>
                        )}
                    </NeonCard>
                ))}
            </div>
        </div>
    );
};
