
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ModuleHistoryItem, GeneratedModuleType } from '../../types';
import { Clock, ChevronRight, Search, History } from 'lucide-react';

interface HistorySidebarProps {
    studentId: string;
    type?: string | string[]; // Allow "ALL" or specific types
    onSelect: (item: any) => void;
    currentId?: string; // To highlight active item
    className?: string; // For custom styling
    refreshTrigger?: number;
    contextClass?: { id: string; subject?: string }; // [NEW] Filter by class
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ studentId, type, onSelect, currentId, className = '', refreshTrigger = 0, contextClass }) => {
    const [history, setHistory] = useState<ModuleHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            if (!studentId) return;
            try {
                console.log(`[Sidebar] Fetching history for ${studentId}`);
                const data = await api.getModuleHistory(studentId);
                console.log("[Sidebar] Raw Data:", data);

                if (!Array.isArray(data)) {
                    console.warn("[Sidebar] Received non-array data:", data);
                    setHistory([]);
                    return;
                }

                // Filter by type
                let filtered = data.filter((item: ModuleHistoryItem) => item.type === type);

                // Filter by class context
                if (contextClass && contextClass.id) {
                    // CLASS VIEW: Show ONLY items that match this class
                    filtered = filtered.filter((item: ModuleHistoryItem) =>
                        (item.classId === contextClass.id || (item as any).class_id === contextClass.id)
                    );
                }
                // GLOBAL VIEW (no contextClass): Show ALL items

                console.log(`[Sidebar] Filtered for ${type} (class: ${contextClass?.id || 'GLOBAL'}):`, filtered);
                setHistory(filtered);
            } catch (e) {
                console.error("Failed to load history", e);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [studentId, type, refreshTrigger, contextClass?.id]);

    const filteredHistory = history.filter(item =>
        (item.topic || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`flex flex-col h-full border-r border-white/10 bg-black/20 ${className}`}>
            <div className="p-4 border-b border-white/10">
                <h3 className="text-white font-bold flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-neon-purple" /> History
                </h3>
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-neon-purple/50"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {loading ? (
                    <div className="text-center text-gray-500 py-8 text-xs">Loading history...</div>
                ) : filteredHistory.length === 0 ? (
                    <div className="text-center text-gray-500 py-8 text-xs">No history found.</div>
                ) : (
                    filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className={`
                                cursor-pointer p-3 rounded-lg transition-all text-left group
                                ${currentId === item.id
                                    ? 'bg-neon-purple/20 border border-neon-purple/30'
                                    : 'hover:bg-white/5 border border-transparent'}
                            `}
                        >
                            <div className={`font-medium text-sm truncate ${currentId === item.id ? 'text-white' : 'text-gray-300'}`}>
                                {item.topic || 'Untitled Module'}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown Date'}
                                </span>
                                {currentId === item.id && <ChevronRight className="w-3 h-3 text-neon-purple" />}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
