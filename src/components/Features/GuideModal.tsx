import React, { useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { X, Trophy, Star, BookOpen, Brain, Zap, Target, Sparkles, CircleHelp } from 'lucide-react';
import { LEVEL_TITLES, XP_REWARDS } from '../../services/gamification';

interface GuideModalProps {
    onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'GAME' | 'FEATURES'>('GAME');

    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col relative" glowColor="cyan" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-col h-full relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10">
                        <X className="w-6 h-6" />
                    </button>

                    {/* Header */}
                    <div className="p-6 border-b border-white/10 bg-black/40">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <CircleHelp className="w-6 h-6 text-neon-cyan" />
                            Student Guide
                        </h2>
                        <p className="text-gray-400">Everything you need to know about GyanAI</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/10 bg-black/20 shrink-0">
                        <button
                            onClick={() => setActiveTab('GAME')}
                            className={`flex-1 py-4 text-center font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'GAME' ? 'text-neon-cyan bg-white/5 border-b-2 border-neon-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            XP & Ranks
                        </button>
                        <button
                            onClick={() => setActiveTab('FEATURES')}
                            className={`flex-1 py-4 text-center font-bold uppercase tracking-wider text-sm transition-colors ${activeTab === 'FEATURES' ? 'text-neon-cyan bg-white/5 border-b-2 border-neon-cyan' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            App Features
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-black/40 min-h-0 custom-scrollbar">

                        {/* GAMIFICATION TAB */}
                        {activeTab === 'GAME' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">

                                {/* How to Earn XP */}
                                <section>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-400" /> How to Earn XP
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                                            <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400 mb-3">
                                                <Target className="w-6 h-6" />
                                            </div>
                                            <div className="text-2xl font-bold text-white mb-1">+{XP_REWARDS.QUIZ_COMPLETION} XP</div>
                                            <div className="text-gray-400 text-sm">Complete a Quiz</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors">
                                            <div className="p-3 rounded-full bg-neon-purple/20 text-neon-purple mb-3">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <div className="text-2xl font-bold text-white mb-1">+{XP_REWARDS.QUIZ_PERFECT_SCORE} XP</div>
                                            <div className="text-gray-400 text-sm">Score 80%+ Bonus</div>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center text-center hover:bg-white/10 transition-colors border-green-500/30">
                                            <div className="p-3 rounded-full bg-green-500/20 text-green-400 mb-3">
                                                <Brain className="w-6 h-6" />
                                            </div>
                                            <div className="text-2xl font-bold text-white mb-1">+{XP_REWARDS.REMEDIAL_COMPLETION} XP</div>
                                            <div className="text-gray-400 text-sm">Fix a Weakness (Remedial)</div>
                                        </div>
                                    </div>
                                </section>

                                {/* Rank System */}
                                <section>
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-neon-cyan" /> Rank System
                                    </h3>
                                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-gray-400 text-xs uppercase">
                                                <tr>
                                                    <th className="p-4 font-medium">Rank Title</th>
                                                    <th className="p-4 font-medium">Level Required</th>
                                                    <th className="p-4 font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/10 text-sm">
                                                {[...LEVEL_TITLES].map((rank, i) => (
                                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-white font-bold flex items-center gap-2">
                                                            {i === 4 ? <Trophy className="w-4 h-4 text-yellow-500" /> :
                                                                i >= 2 ? <Trophy className="w-4 h-4 text-gray-400" /> :
                                                                    <div className="w-4 h-4 rounded-full border border-white/30"></div>}
                                                            {rank.title}
                                                        </td>
                                                        <td className="p-4 text-gray-400">Level {rank.level}+</td>
                                                        <td className="p-4 text-neon-cyan">{i === 4 ? 'Legendary' : i >= 2 ? 'Elite' : 'Student'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="mt-4 text-sm text-gray-500 text-center italic">
                                        XP requirements increase as you level up. Keep learning to rise through the ranks!
                                    </p>
                                </section>
                            </div>
                        )}

                        {/* FEATURES TAB */}
                        {activeTab === 'FEATURES' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* AI Learn */}
                                    <div className="p-5 bg-white/5 rounded-xl border border-white/10 hover:border-neon-purple/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-neon-purple/10 rounded-lg text-neon-purple mt-1">
                                                <BookOpen className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">AI Learn</h4>
                                                <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                                                    Generate personalized study plans on any topic. The AI explains concepts simply and provides resources.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remembrance (Remedial) */}
                                    <div className="p-5 bg-white/5 rounded-xl border border-white/10 hover:border-yellow-500/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500 mt-1">
                                                <Sparkles className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Remedial Center</h4>
                                                <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                                                    The AI detects your weak spots from quizzes and creates special mini-lessons to help you fix them.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mind Maps */}
                                    <div className="p-5 bg-white/5 rounded-xl border border-white/10 hover:border-neon-cyan/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-neon-cyan/10 rounded-lg text-neon-cyan mt-1">
                                                <Brain className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Mind Maps</h4>
                                                <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                                                    Visualize complex topics as interactive diagrams. Great for revision and seeing how ideas connect.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Flashcards */}
                                    <div className="p-5 bg-white/5 rounded-xl border border-white/10 hover:border-green-500/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-green-500/10 rounded-lg text-green-500 mt-1">
                                                <Zap className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">Flashcards</h4>
                                                <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                                                    Quick-fire revision cards. Perfect for memorizing definitions, formulas, and key dates.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-white/10 bg-black/40 text-right shrink-0">
                        <NeonButton onClick={onClose} glow>Got it, Thanks!</NeonButton>
                    </div>
                </div>
            </NeonCard>
        </div>
    );
};
