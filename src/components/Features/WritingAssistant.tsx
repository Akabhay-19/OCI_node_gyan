
import React, { useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { PenTool, BookOpen, CheckCircle, AlertTriangle, FileText, Send, RefreshCw, Feather, Mail, File } from 'lucide-react';
import { api } from '../../services/api';

const WRITING_TYPES = [
    { id: 'APPLICATION', label: 'Application', icon: FileText, desc: 'Formal requests (Leave, Job, etc.)' },
    { id: 'ARTICLE', label: 'Article', icon: Feather, desc: 'Creative or informative articles' },
    { id: 'EMAIL', label: 'Email', icon: Mail, desc: 'Formal or informal emails' },
    { id: 'ESSAY', label: 'Essay', icon: BookOpen, desc: 'Structured long-form writing' },
];

export const WritingAssistant: React.FC = () => {
    const [step, setStep] = useState<'SELECT' | 'GUIDE' | 'WRITE' | 'FEEDBACK'>('SELECT');
    const [selectedType, setSelectedType] = useState<string>('');
    const [topic, setTopic] = useState('');
    const [guide, setGuide] = useState<any>(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<any>(null);

    const handleGenerateGuide = async () => {
        if (!topic) return alert("Please enter a topic");
        setLoading(true);
        try {
            const res = await api.generateWritingGuide(selectedType, topic);
            setGuide(res);
            setStep('GUIDE');
        } catch (e) {
            console.error(e);
            alert("Failed to generate guide");
        } finally {
            setLoading(false);
        }
    };

    const handleEvaluate = async () => {
        if (!content) return alert("Please write something");
        setLoading(true);
        try {
            const res = await api.evaluateWriting(selectedType, topic, content);
            setFeedback(res);
            setStep('FEEDBACK');
        } catch (e) {
            console.error(e);
            alert("Failed to evaluate");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                    <PenTool className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Writing Assistant</h2>
                    <p className="text-gray-400 text-sm">Draft perfect applications, emails, and articles.</p>
                </div>
            </div>

            {/* STEP 1: SELECT TYPE */}
            {step === 'SELECT' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {WRITING_TYPES.map(t => (
                            <NeonCard
                                key={t.id}
                                className={`p-4 cursor-pointer hover:border-pink-500/50 transition-all ${selectedType === t.id ? 'border-pink-500 bg-pink-500/10' : ''}`}
                                onClick={() => setSelectedType(t.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg ${selectedType === t.id ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-gray-400'}`}>
                                        <t.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{t.label}</h3>
                                        <p className="text-xs text-gray-400">{t.desc}</p>
                                    </div>
                                </div>
                            </NeonCard>
                        ))}
                    </div>

                    {selectedType && (
                        <div className="animate-in fade-in">
                            <label className="block text-sm text-gray-400 mb-2">What is the topic?</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    placeholder={`e.g., ${selectedType === 'APPLICATION' ? 'Sick leave for 2 days' : 'Importance of Trees'}`}
                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-pink-500/50 outline-none"
                                />
                                <NeonButton variant="primary" onClick={handleGenerateGuide} disabled={loading || !topic}>
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Start
                                </NeonButton>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 2: GUIDE */}
            {step === 'GUIDE' && guide && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Visual Guide */}
                    <div className="space-y-4">
                        <NeonCard className="p-6 border-pink-500/30">
                            <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5" /> Structure Guide
                            </h3>
                            <div className="space-y-3">
                                {guide.structure.map((item: any, i: number) => (
                                    <div key={i} className="bg-black/40 p-3 rounded-lg border border-white/5">
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">{item.part}</div>
                                        <div className="text-sm text-gray-300">{item.instruction}</div>
                                    </div>
                                ))}
                            </div>
                        </NeonCard>

                        <NeonCard className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Example</h3>
                            <div className="bg-white/5 p-4 rounded-xl text-sm leading-relaxed text-gray-300 font-serif whitespace-pre-wrap">
                                {guide.example}
                            </div>
                        </NeonCard>
                    </div>

                    {/* Writing Area */}
                    <div className="flex flex-col h-full">
                        <div className="flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-white mb-2">Your Draft</h3>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Start writing here..."
                                className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-pink-500/50 font-serif leading-relaxed min-h-[400px]"
                            />
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <NeonButton variant="secondary" onClick={() => setStep('SELECT')}>Back</NeonButton>
                            <NeonButton variant="primary" onClick={handleEvaluate} disabled={loading}>{loading ? 'Analyzing...' : 'Analyze & Score'}</NeonButton>
                        </div>
                    </div>
                </div>
            )}

            {/* FEEDBACK & STEP 'WRITE' IS MERGED ABOVE VISUALLY BUT LOGICALLY SEPARATE IF NEEDED. 
                ACTUALLY LET'S SHOW FEEDBACK OVERLAY OR NEXT STEP */}

            {step === 'FEEDBACK' && feedback && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
                        <NeonButton variant="secondary" onClick={() => setStep('GUIDE')}>Keep Editing</NeonButton>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <NeonCard className="p-4 text-center border-pink-500/30">
                            <div className="text-4xl font-bold text-pink-400 mb-2">{feedback.score}/100</div>
                            <div className="text-sm text-gray-400">Total Score</div>
                        </NeonCard>
                        <NeonCard className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-400 mb-2">{feedback.grammarScore}%</div>
                            <div className="text-sm text-gray-400">Grammar</div>
                        </NeonCard>
                        <NeonCard className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-400 mb-2">{feedback.vocabScore}%</div>
                            <div className="text-sm text-gray-400">Vocabulary</div>
                        </NeonCard>
                        <NeonCard className="p-4 text-center">
                            <div className="text-2xl font-bold text-orange-400 mb-2">{feedback.toneScore}%</div>
                            <div className="text-sm text-gray-400">Tone</div>
                        </NeonCard>
                    </div>

                    <NeonCard className="p-6">
                        <h3 className="text-xl font-bold text-white mb-4">Detailed Feedback</h3>
                        <div className="space-y-4">
                            {feedback.corrections.map((c: any, i: number) => (
                                <div key={i} className="flex gap-4 p-3 bg-white/5 rounded-xl border border-red-500/10">
                                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                                    <div>
                                        <div className="text-red-300 line-through text-sm mb-1">{c.original}</div>
                                        <div className="text-green-400 font-bold mb-1">{c.suggestion}</div>
                                        <div className="text-xs text-gray-500">{c.reason}</div>
                                    </div>
                                </div>
                            ))}
                            {feedback.corrections.length === 0 && (
                                <div className="text-center text-green-400 py-8">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>No major errors found! Great job!</p>
                                </div>
                            )}
                        </div>
                    </NeonCard>

                    <NeonCard className="p-6 border-blue-500/20">
                        <h3 className="text-lg font-bold text-blue-400 mb-2">💡 Tips for Improvement</h3>
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            {feedback.tips.map((tip: string, i: number) => (
                                <li key={i}>{tip}</li>
                            ))}
                        </ul>
                    </NeonCard>
                </div>
            )}

        </div>
    );
};
