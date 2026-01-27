import React, { useState, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Trophy, Globe, Award, Calendar, ExternalLink, Filter, RotateCw, Sparkles, School } from 'lucide-react';
import { api } from '../../services/api';
import { Student, Opportunity } from '../../types';

interface OpportunitiesViewProps {
    currentUser: Student;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState<'COMPETITION' | 'SCHOLARSHIP'>('COMPETITION');
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const isNew = (createdAt?: string) => {
        if (!createdAt) return false;
        const createdDate = new Date(createdAt);
        const now = new Date();
        const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        return diffHours < 48; // Within last 48 hours
    };

    const fetchOpportunities = async () => {
        if (!currentUser.grade) return;
        setLoading(true);
        try {
            // "Academic" interest is a good default, or we could infer from student's profile/weaknesses
            const ops = await api.findOpportunities(
                'Academic & Extracurricular',
                'Global',
                currentUser.grade,
                activeTab
            );
            setOpportunities(ops);
        } catch (e) {
            console.error("Failed to fetch opportunities:", e);
            setOpportunities([]);
        } finally {
            setLoading(false);
            setHasSearched(true);
        }
    };

    // Auto-fetch on mount or tab change
    useEffect(() => {
        fetchOpportunities();
    }, [activeTab, currentUser.grade]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 md:w-6 md:h-6 text-neon-cyan" />
                        Student Opportunities
                    </h2>
                    <p className="text-sm md:text-base text-gray-400 mt-1">
                        Curated for <span className="text-white font-bold">{currentUser.grade}</span> students.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="bg-white/5 p-1 rounded-xl flex w-full md:w-auto overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('COMPETITION')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'COMPETITION'
                            ? 'bg-neon-purple text-white shadow-lg shadow-neon-purple/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Trophy className="w-3 h-3 md:w-4 md:h-4" /> Competitions
                    </button>
                    <button
                        onClick={() => setActiveTab('SCHOLARSHIP')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'SCHOLARSHIP'
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Award className="w-3 h-3 md:w-4 md:h-4" /> Scholarships
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="py-20 text-center">
                    <RotateCw className="w-8 h-8 mx-auto text-neon-cyan animate-spin mb-4" />
                    <p className="text-gray-400 animate-pulse">Scanning for {activeTab.toLowerCase().endsWith('s') ? activeTab.toLowerCase() : activeTab.toLowerCase() + 's'}...</p>
                </div>
            )}

            {/* List */}
            {!loading && (
                <div className="grid grid-cols-1 gap-4">
                    {opportunities.length > 0 ? (
                        opportunities.map((op, idx) => (
                            <NeonCard
                                key={op.id || idx}
                                className="p-0 overflow-hidden group hover:border-white/30 transition-all"
                                glowColor={activeTab === 'SCHOLARSHIP' ? 'green' : 'purple'}
                            >
                                <div className="p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 relative overflow-hidden">
                                    {isNew(op.createdAt) && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-neon-cyan text-black text-[10px] font-black px-8 py-1 rotate-45 translate-x-3 translate-y-[-2px] shadow-lg flex items-center gap-1 justify-center">
                                                <Sparkles className="w-2 h-2" /> NEW
                                            </div>
                                        </div>
                                    )}

                                    {/* Icon Box */}
                                    <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${op.type === 'SCHOLARSHIP' ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30' :
                                        'bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/30'
                                        }`}>
                                        {op.type === 'SCHOLARSHIP' ? <School className="w-6 h-6 md:w-8 md:h-8" /> : <Trophy className="w-6 h-6 md:w-8 md:h-8" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex flex-col md:flex-row justify-between items-start gap-2 mb-2">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${op.type === 'SCHOLARSHIP' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                                                        'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                                        }`}>
                                                        {op.type}
                                                    </span>
                                                    <span className="text-gray-500 text-xs">• {op.organization}</span>
                                                </div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-neon-cyan transition-colors">{op.title}</h3>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <div className="text-yellow-400 font-bold font-mono">{op.reward}</div>
                                                {op.deadline && (
                                                    <div className="text-gray-500 text-xs flex items-center gap-1 justify-end mt-1">
                                                        <Calendar className="w-3 h-3" /> Due: {new Date(op.deadline).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-gray-400 text-xs md:text-sm mb-4 line-clamp-2">{op.description}</p>

                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                                            <div className="flex flex-wrap gap-2">
                                                {op.tags?.map(tag => (
                                                    <span key={tag} className="text-[10px] md:text-xs text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">#{tag}</span>
                                                ))}
                                            </div>

                                            {op.link && (
                                                <a
                                                    href={op.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`
                                                        w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all text-black
                                                        ${activeTab === 'SCHOLARSHIP' ? 'bg-green-500 hover:bg-green-400' : 'bg-neon-purple hover:bg-neon-purple/90'}
                                                    `}
                                                >
                                                    Apply Now <ExternalLink className="w-3 h-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </NeonCard>
                        ))
                    ) : (
                        hasSearched && (
                            <div className="text-center py-20 px-4">
                                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                                <h3 className="text-xl font-bold text-gray-300 mb-2">No {activeTab.toLowerCase()}s found</h3>
                                <p className="text-gray-500 max-w-md mx-auto">
                                    We couldn't find any active {activeTab.toLowerCase()}s specifically for <span className="text-white font-bold">{currentUser.grade}</span> at this moment.
                                </p>
                                <NeonButton
                                    variant="ghost"
                                    className="mt-6"
                                    onClick={fetchOpportunities}
                                >
                                    <RotateCw className="w-4 h-4 mr-2" /> Refresh
                                </NeonButton>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
};
