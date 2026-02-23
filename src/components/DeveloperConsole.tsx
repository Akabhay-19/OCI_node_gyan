import React, { useEffect, useState } from 'react';
import { NeonCard, NeonButton, Input } from './UIComponents';
import { SchoolProfile, Classroom, Student, SiteContent, TeamMember } from '../types';
import { LayoutDashboard, Users, School, GraduationCap, ArrowLeft, RefreshCw, BarChart, Copy, Layers, ChevronRight, ChevronDown, Monitor, Trash2, Plus, Save, Terminal, Cpu, Zap, Sparkles, Check } from 'lucide-react';
import { api, API_URL } from '../services/api';
import { DeveloperAPI } from './Features/DeveloperAPI';

interface DevStats {
    schools: number;
    teachers: number;
    students: number;
    parents: number;
}

interface EnrichedSchool extends SchoolProfile {
    teacherCount: number;
    studentCount: number;
}

interface AIConfig {
    currentProvider: 'openrouter' | 'gemini';
    currentModel: string;
    currentAudioModel?: string;
    availableProviders: string[];
    geminiModel: string;
}

interface FreeModel {
    id: string;
    name: string;
    context: number;
    provider: string;
}

export const DeveloperConsole: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [stats, setStats] = useState<DevStats>({ schools: 0, teachers: 0, students: 0, parents: 0 });
    const [schools, setSchools] = useState<EnrichedSchool[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSchool, setSelectedSchool] = useState<EnrichedSchool | null>(null);
    const [detailView, setDetailView] = useState<'FOLDERS' | 'TEACHERS' | 'STUDENTS' | 'PARENTS' | 'CLASSES'>('FOLDERS');
    const [schoolDetails, setSchoolDetails] = useState<{ teachers: any[], students: any[], parents: any[], classrooms: any[] }>({ teachers: [], students: [], parents: [], classrooms: [] });
    const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
    const [displayMode, setDisplayMode] = useState<'DATA' | 'CONTENT' | 'UPDATES' | 'API' | 'AI_CONFIG' | 'CONTACT' | 'INBOX' | 'PATENT'>('DATA');
    const [siteContent, setSiteContent] = useState<SiteContent>({ teamMembers: [] });
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    // Contact & Inbox State
    const [contactEdit, setContactEdit] = useState({ email: '', phone: '', address: '' });
    const [submissions, setSubmissions] = useState<any[]>([]);

    // AI Configuration State
    const [aiConfig, setAiConfig] = useState<AIConfig>({ currentProvider: 'openrouter', currentModel: 'openai/gpt-4o-mini', availableProviders: [], geminiModel: 'gemini-2.0-flash-exp' });
    const [freeModels, setFreeModels] = useState<FreeModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [savingConfig, setSavingConfig] = useState(false);


    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, schoolsRes] = await Promise.all([
                api.getDevStats(),
                api.getDevSchools()
            ]);

            setStats(statsRes);
            setSchools(schoolsRes);

        } catch (error) {
            console.error("Dev Console Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchContent = async () => {
        try {
            const content = await api.getSiteContent();
            setSiteContent(content);
            if (content.contactInfo) {
                setContactEdit(content.contactInfo);
            }
        } catch (e) {
            console.error("Failed to fetch site content", e);
        }
    };

    const fetchSubmissions = async () => {
        try {
            const subs = await api.getContactSubmissions();
            setSubmissions(subs);
        } catch (e) { console.error(e); }
    };

    const handleSaveContactInfo = async () => {
        if (!siteContent) return;
        const updatedContent = { ...siteContent, contactInfo: contactEdit };
        try {
            await api.updateSiteContent(updatedContent);
            alert("Contact Info Updated!");
        } catch (e) {
            alert("Failed to update contact info");
        }
    };

    const fetchAIConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/ai/config`, { headers: api.getAuthHeaders() });
            if (res.ok) {
                const config = await res.json();
                setAiConfig(config);
            }
        } catch (e) {
            console.error("Failed to fetch AI config", e);
        }
    };

    const fetchFreeModels = async () => {
        setLoadingModels(true);
        try {
            const res = await fetch(`${API_URL}/ai/free-models`, { headers: api.getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setFreeModels(data.models || []);
            }
        } catch (e) {
            console.error("Failed to fetch free models", e);
        } finally {
            setLoadingModels(false);
        }
    };

    const saveAIConfig = async (provider: 'openrouter' | 'gemini', model: string) => {
        setSavingConfig(true);
        try {

            const res = await fetch(`${API_URL}/ai/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, model })
            });
            if (res.ok) {
                const updated = await res.json();
                setAiConfig(prev => ({ ...prev, currentProvider: updated.currentProvider, currentModel: updated.currentModel }));
                alert(`AI Configuration Updated!\nProvider: ${updated.currentProvider}\nModel: ${updated.currentModel}`);
            }
        } catch (e) {
            console.error("Failed to save AI config", e);
            alert("Failed to save AI configuration");
        } finally {
            setSavingConfig(false);
        }
    };

    const saveAudioModel = async (audioModel: string) => {
        setSavingConfig(true);
        try {
            const res = await fetch(`${API_URL}/ai/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioModel })
            });
            if (res.ok) {
                const updated = await res.json();
                setAiConfig(prev => ({ ...prev, currentAudioModel: updated.currentAudioModel }));
                alert(`Audio Model Updated!\nNew Model: ${updated.currentAudioModel}`);
            }
        } catch (e) {
            console.error("Failed to save Audio Config", e);
            alert("Failed to save Audio configuration");
        } finally {
            setSavingConfig(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (displayMode === 'CONTENT' || displayMode === 'CONTACT') fetchContent();
        if (displayMode === 'INBOX') fetchSubmissions();
    }, [displayMode]);

    const handleSaveContent = async () => {
        try {
            await api.updateSiteContent(siteContent);
            alert("Site Content Updated Successfully!");
        } catch (e) {
            alert("Failed to update content");
        }
    };

    const handleAddMember = () => {
        const newMember: TeamMember = {
            id: Date.now().toString(),
            name: "New Member",
            role: "Role",
            bio: "Bio...",
            imageUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + Date.now(),
            socials: {}
        };
        setSiteContent(prev => ({ ...prev, teamMembers: [...prev.teamMembers, newMember] }));
        setEditingMember(newMember);
    };

    const handleUpdateMember = (id: string, updates: Partial<TeamMember>) => {
        setSiteContent(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
        if (editingMember?.id === id) {
            setEditingMember(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const handleDeleteMember = (id: string) => {
        if (!confirm("Are you sure?")) return;
        setSiteContent(prev => ({
            ...prev,
            teamMembers: prev.teamMembers.filter(m => m.id !== id)
        }));
        if (editingMember?.id === id) setEditingMember(null);
    };

    const fetchSchoolDetails = async (schoolId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/dev/school/${schoolId}/details`, { headers: api.getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setSchoolDetails(data);
            }
        } catch (error) {
            console.error("Error fetching school details", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSchoolClick = (school: EnrichedSchool) => {
        setSelectedSchool(school);
        setDetailView('FOLDERS');
        fetchSchoolDetails(school.id);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, onClick }: any) => (
        <NeonCard glowColor={color} className={`flex items-center p-6 ${onClick ? 'cursor-pointer hover:bg-white/5 transition-all' : ''}`} onClick={onClick}>
            <div className={`p-4 rounded-full bg-${color}-500/20 mr-4`}>
                <Icon className={`w-8 h-8 text-${color}-400`} />
            </div>
            <div>
                <p className="text-gray-400 text-sm uppercase font-bold">{title}</p>
                <h3 className="text-3xl font-bold text-white">{value}</h3>
            </div>
        </NeonCard>
    );

    return (
        <div className="min-h-screen bg-gray-950 p-8 text-white">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <NeonButton onClick={selectedSchool ? () => {
                            if (detailView !== 'FOLDERS') setDetailView('FOLDERS');
                            else setSelectedSchool(null);
                        } : onBack} variant="secondary" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" /> {selectedSchool ? (detailView !== 'FOLDERS' ? 'Back to Folders' : 'Back to List') : 'Back to App'}
                        </NeonButton>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-purple to-neon-cyan">
                            {selectedSchool ? `${selectedSchool.name} Console` : 'Developer Console'}
                        </h1>
                    </div>
                    {!selectedSchool && (
                        <NeonButton onClick={fetchData} variant="primary" size="sm">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
                        </NeonButton>
                    )}
                </div>

                {/* Mode Switcher */}
                <div className="flex gap-4 border-b border-white/10 pb-4">
                    <button
                        onClick={() => setDisplayMode('DATA')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'DATA' ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <BarChart className="w-4 h-4" /> Data Management
                    </button>
                    <button
                        onClick={() => setDisplayMode('CONTENT')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'CONTENT' ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Monitor className="w-4 h-4" /> Site Content
                    </button>
                    <button
                        onClick={() => { setDisplayMode('CONTACT'); fetchContent(); }}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'CONTACT' ? 'bg-pink-500/20 text-pink-500 border border-pink-500/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Users className="w-4 h-4" /> Contact Info
                    </button>
                    <button
                        onClick={() => { setDisplayMode('INBOX'); fetchSubmissions(); }}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'INBOX' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <RefreshCw className="w-4 h-4" /> Inbox
                    </button>
                    <button
                        onClick={() => setDisplayMode('API')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'API' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Terminal className="w-4 h-4" /> API & Integration
                    </button>
                    <button
                        onClick={() => setDisplayMode('UPDATES')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'UPDATES' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <RefreshCw className="w-4 h-4" /> Updates & Roadmap
                    </button>
                    <button
                        onClick={() => setDisplayMode('PATENT')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'PATENT' ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Sparkles className="w-4 h-4" /> Patent Algorithms
                    </button>
                    <button
                        onClick={() => setDisplayMode('AI_CONFIG')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${displayMode === 'AI_CONFIG' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Cpu className="w-4 h-4" /> AI Configuration
                    </button>
                </div>

                {displayMode === 'PATENT' ? (
                    <div className="space-y-8">
                        <NeonCard className="p-8" glowColor="purple">
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-600 mb-6">
                                GyanAI Adaptive Learning System (Patent Pending)
                            </h2>
                            <p className="text-gray-400 mb-8 max-w-3xl">
                                Visualization of the manufacturing-grade control algorithms used to optimize student learning trajectories.
                            </p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* 1. GMI Algorithm */}
                                <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <div className="p-2 bg-blue-500/20 rounded-lg"><BarChart className="w-5 h-5 text-blue-400" /></div>
                                        1. GyanAI Mastery Index (GMI)
                                    </h3>
                                    <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20 mb-4">
                                        <code className="text-xs text-blue-300 font-mono block mb-2">
                                            M(t) = σ( α·P(t) + (1-α)·M(t-1)·ψ(Δt) ) · C(t)
                                        </code>
                                        <p className="text-sm text-gray-400">
                                            Recursive state estimation fusing cognitive performance with behavioral metrics.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Problem: Cramming</span>
                                            <span className="text-green-400 font-bold">Solved</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Standard apps effectively lie by showing 100% mastery after a cram session. Our
                                            <strong className="text-blue-400"> Forgetting Curve Function ψ(Δt)</strong> acts as a
                                            truth serum, decaying scores daily if consistency is lacking.
                                        </p>
                                    </div>
                                </div>

                                {/* 2. PID DDA */}
                                <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <div className="p-2 bg-green-500/20 rounded-lg"><Zap className="w-5 h-5 text-green-400" /></div>
                                        2. PID Dynamic Difficulty
                                    </h3>
                                    <div className="bg-green-900/10 p-4 rounded-lg border border-green-500/20 mb-4">
                                        <code className="text-xs text-green-300 font-mono block mb-2">
                                            ΔD = Kp·e(t) + Ki∫e(τ)dτ + Kd·de(t)/dt
                                        </code>
                                        <p className="text-sm text-gray-400">
                                            Industrial control theory applied to pedagogical difficulty scaling.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Problem: Rage Quitting</span>
                                            <span className="text-green-400 font-bold">Solved</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            The <strong className="text-green-400">Integral Term (Ki)</strong> detects subtle, long-term struggle
                                            before a student fails, gently lowering difficulty to maintain the "Flow State".
                                        </p>
                                    </div>
                                </div>

                                {/* 3. NBA Utility */}
                                <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <div className="p-2 bg-purple-500/20 rounded-lg"><Sparkles className="w-5 h-5 text-purple-400" /></div>
                                        3. Next Best Action (NBA)
                                    </h3>
                                    <div className="bg-purple-900/10 p-4 rounded-lg border border-purple-500/20 mb-4">
                                        <code className="text-xs text-purple-300 font-mono block mb-2">
                                            U(a) = Σ wi · fi(State, Action)
                                        </code>
                                        <p className="text-sm text-gray-400">
                                            Utility maximization engine for assigning learning interventions.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Problem: Decision Paralysis</span>
                                            <span className="text-green-400 font-bold">Solved</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Eliminates "What should I study?". The system mathematically proves which 5-minute activity
                                            yields the highest ROI for the student right now.
                                        </p>
                                    </div>
                                </div>

                                {/* 4. Voice Sentiment */}
                                <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                        <div className="p-2 bg-pink-500/20 rounded-lg"><Cpu className="w-5 h-5 text-pink-400" /></div>
                                        4. Sentiment-Aware Mastery
                                    </h3>
                                    <div className="bg-pink-900/10 p-4 rounded-lg border border-pink-500/20 mb-4">
                                        <code className="text-xs text-pink-300 font-mono block mb-2">
                                            S_voice ∈ [0.8, 1.2]
                                        </code>
                                        <p className="text-sm text-gray-400">
                                            Modulating mastery based on verbal confidence cues.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Problem: Lucky Guesses</span>
                                            <span className="text-green-400 font-bold">Solved</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Detects "Unconfident Correct" answers. If a student guesses right but sounds hesitant,
                                            we treat it as a partial gap, building <strong className="text-pink-400">True Confidence</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                ) : displayMode === 'AI_CONFIG' ? (
                    <div className="space-y-6">
                        <NeonCard className="p-8" glowColor="purple">
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Cpu className="w-6 h-6 text-orange-400" />
                                Universal AI Model Configuration
                            </h2>
                            <p className="text-gray-400 mb-8">
                                Choose the AI provider and model used for ALL content generation across schools (Study Plans, Quizzes, Assignments, Remedial, etc.)
                            </p>

                            {/* Current Status */}
                            <div className="bg-black/30 rounded-xl p-6 mb-8 border border-white/10">
                                <h3 className="text-lg font-bold text-white mb-4">Current Configuration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Provider</p>
                                        <p className="text-xl font-mono text-neon-cyan">{aiConfig.currentProvider}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase">Active Model</p>
                                        <p className="text-xl font-mono text-orange-400 truncate" title={aiConfig.currentModel}>{aiConfig.currentModel}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Toggle */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div
                                    onClick={() => saveAIConfig('gemini', 'gemini-2.0-flash-exp')}
                                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${aiConfig.currentProvider === 'gemini' ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/10 hover:border-white/30 bg-black/20'}`}
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Zap className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">Google Gemini</h4>
                                            <p className="text-sm text-gray-400">Direct API (Your Key)</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 text-sm">Uses your GEMINI_API_KEY from .env file. Model: <span className="text-neon-cyan font-mono">gemini-2.0-flash-exp</span></p>
                                    {aiConfig.currentProvider === 'gemini' && <span className="inline-block mt-3 text-xs bg-neon-cyan/20 text-neon-cyan px-2 py-1 rounded">✓ Active</span>}
                                </div>

                                <div
                                    onClick={() => setDisplayMode('AI_CONFIG')} // Keep on this tab, model selection below
                                    className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${aiConfig.currentProvider === 'openrouter' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/30 bg-black/20'}`}
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                            <Cpu className="w-6 h-6 text-orange-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">OpenRouter</h4>
                                            <p className="text-sm text-gray-400">350+ Models (GPT, Claude, Llama)</p>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 text-sm">Uses your OPENROUTER_API_KEY. Select from free models below.</p>
                                    {aiConfig.currentProvider === 'openrouter' && <span className="inline-block mt-3 text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">✓ Active</span>}
                                </div>
                            </div>

                            {/* OpenRouter Model Selection */}
                            <div className="bg-black/30 rounded-xl p-6 border border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">Select OpenRouter Model</h3>
                                    <NeonButton onClick={fetchFreeModels} variant="secondary" size="sm" disabled={loadingModels}>
                                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingModels ? 'animate-spin' : ''}`} /> Refresh Models
                                    </NeonButton>
                                </div>

                                {loadingModels ? (
                                    <p className="text-gray-500 text-center py-4">Loading free models...</p>
                                ) : freeModels.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No free models found. Click Refresh.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
                                        {freeModels.map(model => (
                                            <div
                                                key={model.id}
                                                onClick={() => saveAIConfig('openrouter', model.id)}
                                                className={`cursor-pointer p-3 rounded-lg border transition-all ${aiConfig.currentModel === model.id ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/30 bg-black/20'}`}
                                            >
                                                <p className="font-bold text-white text-sm truncate" title={model.name}>{model.name}</p>
                                                <p className="text-xs text-gray-500 truncate" title={model.id}>{model.id}</p>
                                                <div className="flex justify-between mt-2 text-xs">
                                                    <span className="text-gray-600">{model.provider}</span>
                                                    <span className="text-green-400">FREE</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Audio Model Selection */}
                            <div className="bg-black/30 rounded-xl p-6 border border-white/10 mt-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <div className="p-1 bg-neon-cyan/20 rounded">
                                        <Zap className="w-4 h-4 text-neon-cyan" />
                                    </div>
                                    Talk to AI Audio Model (Gemini Live)
                                </h3>
                                <p className="text-gray-400 text-sm mb-6">
                                    Select the default model for the real-time "Voice Tutor". These models support native multimodal (audio) streaming.
                                </p>

                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', desc: 'Fastest, Native Audio, Low Latency', recommended: true },
                                        // { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'High Reasoning (May not support Live API)' }, // Disabled due to API error
                                    ].map(model => (
                                        <div
                                            key={model.id}
                                            onClick={() => saveAudioModel(model.id)}
                                            className={`cursor-pointer p-4 rounded-xl border transition-all flex items-center justify-between ${aiConfig.currentAudioModel === model.id ? 'border-neon-cyan bg-neon-cyan/10 ring-1 ring-neon-cyan/50' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${aiConfig.currentAudioModel === model.id ? 'bg-neon-cyan/20' : 'bg-gray-800'}`}>
                                                    {model.recommended && aiConfig.currentAudioModel !== model.id ? <Zap className="w-5 h-5 text-yellow-400" /> : <Sparkles className={`w-5 h-5 ${aiConfig.currentAudioModel === model.id ? 'text-neon-cyan' : 'text-gray-400'}`} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-white">{model.name}</p>
                                                        {model.recommended && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold">RECOMMENDED</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-mono">{model.id} • {model.desc}</p>
                                                </div>
                                            </div>

                                            {aiConfig.currentAudioModel === model.id && (
                                                <div className="flex items-center gap-2 bg-neon-cyan/20 px-3 py-1 rounded-full">
                                                    <Check className="w-4 h-4 text-neon-cyan" />
                                                    <span className="text-xs font-bold text-neon-cyan">Active Default</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mt-4 mb-2">
                                    <p className="text-xs text-red-300">
                                        <strong>Note:</strong> Most standard Gemini 1.5 models do NOT support the WebSocket "Live" API used by Voice Tutor. Please stick to <code>gemini-2.0-flash-exp</code> unless you are sure another model supports <code>bidiGenerateContent</code>.
                                    </p>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/10">
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-2 block">Advanced: Custom Model ID</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. fine-tuned-model-id"
                                            className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan transition-colors"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveAudioModel((e.target as HTMLInputElement).value);
                                            }}
                                        />
                                        <NeonButton onClick={(e: any) => saveAudioModel((e.target.previousSibling as HTMLInputElement).value)} variant="secondary" size="md">Set Default</NeonButton>
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-2">Only use models compatible with the Google GenAI "Live" API (WebSocket).</p>
                                </div>
                            </div>

                            {savingConfig && (
                                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                    <div className="bg-gray-900 p-6 rounded-xl border border-white/10">
                                        <RefreshCw className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-3" />
                                        <p className="text-white">Saving configuration...</p>
                                    </div>
                                </div>
                            )}
                        </NeonCard>
                    </div>
                ) : displayMode === 'API' ? (
                    <DeveloperAPI currentSchoolId={selectedSchool?.id || 'demo-school-01'} />
                ) : displayMode === 'CONTENT' ? (
                    <div className="space-y-8">
                        {/* Team Management */}
                        <NeonCard className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Users className="w-5 h-5 text-neon-purple" /> Team Members
                                </h2>
                                <div className="flex gap-2">
                                    <NeonButton onClick={handleAddMember} variant="secondary" size="sm">
                                        <Plus className="w-4 h-4 mr-2" /> Add Member
                                    </NeonButton>
                                    <NeonButton onClick={handleSaveContent} variant="primary" size="sm">
                                        <Save className="w-4 h-4 mr-2" /> Save Changes
                                    </NeonButton>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {siteContent.teamMembers.map(member => (
                                    <div key={member.id} className="border border-white/10 rounded-xl p-4 bg-black/20 hover:border-white/30 transition-colors">
                                        <div className="flex items-start gap-4 mb-4">
                                            <img src={member.imageUrl} alt={member.name} className="w-16 h-16 rounded-full bg-white/5 object-cover" />
                                            <div>
                                                <input
                                                    value={member.name}
                                                    onChange={e => handleUpdateMember(member.id, { name: e.target.value })}
                                                    className="bg-transparent text-white font-bold border-b border-transparent focus:border-neon-purple focus:outline-none w-full mb-1"
                                                />
                                                <input
                                                    value={member.role}
                                                    onChange={e => handleUpdateMember(member.id, { role: e.target.value })}
                                                    className="bg-transparent text-neon-cyan text-sm border-b border-transparent focus:border-neon-cyan focus:outline-none w-full"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            value={member.bio}
                                            onChange={e => handleUpdateMember(member.id, { bio: e.target.value })}
                                            className="w-full bg-black/30 text-gray-400 text-sm p-2 rounded mb-4 resize-none focus:outline-none focus:ring-1 focus:ring-white/20 h-20"
                                        />

                                        <div className="grid grid-cols-1 gap-2 mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-blue-400">LI</span>
                                                </div>
                                                <input
                                                    placeholder="LinkedIn URL"
                                                    value={member.socials?.linkedin || ''}
                                                    onChange={e => handleUpdateMember(member.id, { socials: { ...member.socials, linkedin: e.target.value } })}
                                                    className="flex-1 bg-black/30 text-gray-400 text-xs p-2 rounded focus:outline-none border border-white/5 focus:border-white/20"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-cyan-500/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-cyan-400">TW</span>
                                                </div>
                                                <input
                                                    placeholder="Twitter URL"
                                                    value={member.socials?.twitter || ''}
                                                    onChange={e => handleUpdateMember(member.id, { socials: { ...member.socials, twitter: e.target.value } })}
                                                    className="flex-1 bg-black/30 text-gray-400 text-xs p-2 rounded focus:outline-none border border-white/5 focus:border-white/20"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-gray-500/10 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-gray-400">GH</span>
                                                </div>
                                                <input
                                                    placeholder="GitHub URL"
                                                    value={member.socials?.github || ''}
                                                    onChange={e => handleUpdateMember(member.id, { socials: { ...member.socials, github: e.target.value } })}
                                                    className="flex-1 bg-black/30 text-gray-400 text-xs p-2 rounded focus:outline-none border border-white/5 focus:border-white/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4 mb-4">
                                            {/* Avatar Selection UI */}
                                            <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-3">
                                                <label className="text-xs font-bold text-gray-400 uppercase">Avatar Settings</label>

                                                <div className="flex gap-2">
                                                    <select
                                                        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-neon-cyan focus:outline-none flex-1"
                                                        onChange={(e) => {
                                                            const style = e.target.value;
                                                            // If switching to custom, we don't change URL immediately, just let user edit
                                                            if (style === 'custom') return;

                                                            // Update with new style but keep existing seed (name) if possible
                                                            const seed = member.name || Date.now().toString();
                                                            handleUpdateMember(member.id, {
                                                                imageUrl: `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`
                                                            });
                                                        }}
                                                        defaultValue="avataaars"
                                                    >
                                                        <optgroup label="Style">
                                                            <option value="avataaars">Avatars</option>
                                                            <option value="bottts">Robots</option>
                                                            <option value="initials">Initials</option>
                                                            <option value="micah">Micah (Minimal)</option>
                                                            <option value="open-peeps">Open Peeps</option>
                                                            <option value="personas">Personas</option>
                                                            <option value="shapes">Shapes</option>
                                                            <option value="thumbs">Thumbs</option>
                                                        </optgroup>
                                                        <option value="custom">Custom URL</option>
                                                    </select>

                                                    <button
                                                        onClick={() => {
                                                            const seed = Math.random().toString(36).substring(7);
                                                            // Try to regex extract style from current URL or default to avataaars
                                                            const currentStyle = member.imageUrl.match(/7\.x\/([^/]+)\//)?.[1] || 'avataaars';
                                                            handleUpdateMember(member.id, {
                                                                imageUrl: `https://api.dicebear.com/7.x/${currentStyle}/svg?seed=${seed}`
                                                            });
                                                        }}
                                                        className="bg-white/5 hover:bg-white/10 p-1.5 rounded border border-white/10 transition-colors"
                                                        title="Randomize"
                                                    >
                                                        <RefreshCw className="w-4 h-4 text-neon-purple" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span className="w-12">URL:</span>
                                                    <input
                                                        value={member.imageUrl}
                                                        onChange={e => handleUpdateMember(member.id, { imageUrl: e.target.value })}
                                                        className="bg-transparent flex-1 px-2 py-1 rounded focus:outline-none focus:text-white border-b border-transparent focus:border-white/20"
                                                        placeholder="https://..."
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 border-t border-white/5">
                                                    <span className="w-12">Upload:</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-neon-cyan hover:file:bg-white/20 cursor-pointer"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    handleUpdateMember(member.id, { imageUrl: reader.result as string });
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-2 border-t border-white/5">
                                            <button
                                                onClick={() => handleDeleteMember(member.id)}
                                                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </NeonCard>
                    </div>
                ) : displayMode === 'UPDATES' ? (
                    <div className="space-y-6">
                        <NeonCard className="p-8">
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 mb-6">
                                System Updates & Algorithms
                            </h2>

                            <div className="space-y-8">
                                <div className="border-l-4 border-neon-cyan pl-6">
                                    <h3 className="text-xl font-bold text-white mb-2">v2.1.0 - Adaptive Learning Engine</h3>
                                    <p className="text-gray-400 mb-4">Released: January 2026</p>
                                    <p className="text-gray-300 mb-4">
                                        We have deployed a major upgrade to the "Learn with AI" system, transitioning from static content to a dynamic, self-optimizing learning engine.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                        <div className="bg-white/5 p-4 rounded-xl">
                                            <h4 className="font-bold text-neon-cyan mb-2">1. Dynamic Difficulty Adjustment (DDA)</h4>
                                            <p className="text-sm text-gray-400">
                                                The system now tracks student performance in real-time using an Item Response Theory (IRT) inspired model.
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
                                                <li><strong>Score &gt; 80%:</strong> Difficulty increases to "Hard" (+10 XP Bonus).</li>
                                                <li><strong>Score &lt; 50%:</strong> Difficulty decreases to "Easy" to build confidence.</li>
                                                <li><strong>Context Aware:</strong> Difficulty persists across sessions for the same topic.</li>
                                            </ul>
                                        </div>

                                        <div className="bg-white/5 p-4 rounded-xl">
                                            <h4 className="font-bold text-neon-pink mb-2">2. Knowledge Graph Analysis</h4>
                                            <p className="text-sm text-gray-400">
                                                We no longer just check "Correct/Incorrect". The AI now attempts to understand <em>why</em> a student failed.
                                            </p>
                                            <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
                                                <li><strong>Prerequisite Detection:</strong> Identifies missing foundational concepts (e.g., failing Calculus due to weak Algebra).</li>
                                                <li><strong>Remediation:</strong> Suggests specific prerequisite study plans instantly.</li>
                                                <li><strong>Resource Mapping:</strong> Auto-fetches video tutorials for the gap.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-l-4 border-orange-500 pl-6">
                                    <h3 className="text-xl font-bold text-white mb-2">v2.2.0 - Diagnostic Pedagogy Framework</h3>
                                    <p className="text-gray-400 mb-4">Released: January 2026</p>
                                    <p className="text-gray-300 mb-4">
                                        Upgraded quiz analysis to use a comprehensive Diagnostic Pedagogy Framework that transforms simple quiz grading into sophisticated misconception detection.
                                    </p>

                                    <div className="overflow-x-auto mb-6">
                                        <table className="w-full text-sm border-collapse">
                                            <thead>
                                                <tr className="text-left border-b border-white/10">
                                                    <th className="p-3 text-orange-400 font-bold">Feature</th>
                                                    <th className="p-3 text-gray-400">What It Does</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                <tr className="hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">Expert Persona</td>
                                                    <td className="p-3 text-gray-500">AI acts as "Senior Academic Diagnostician" with 20+ years experience</td>
                                                </tr>
                                                <tr className="hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">Atomic Detail</td>
                                                    <td className="p-3 text-gray-500">Breaks topics into smallest units (e.g., "Single-digit carrying" not just "Math")</td>
                                                </tr>
                                                <tr className="hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">Distractor Analysis</td>
                                                    <td className="p-3 text-gray-500">Analyzes WHY student picked the wrong answer to find misconceptions</td>
                                                </tr>
                                                <tr className="hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">Gap Classification</td>
                                                    <td className="p-3 text-gray-500">Tags gaps as PROCEDURAL, FACTUAL, or CONCEPTUAL</td>
                                                </tr>
                                                <tr className="hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">Grade-Locked Vocab</td>
                                                    <td className="p-3 text-gray-500">Uses age-appropriate analogies (Lego bricks for Grade 3, molecular bonds for Grade 11)</td>
                                                </tr>
                                                <tr className="hover:bg-white/5">
                                                    <td className="p-3 text-white font-medium">Syllabus Alignment</td>
                                                    <td className="p-3 text-gray-500">Maps gaps to CBSE/NCERT chapters</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="border-l-4 border-gray-600 pl-6 opacity-75">
                                    <h3 className="text-xl font-bold text-white mb-2">Coming Soon: v2.3.0</h3>
                                    <div className="space-y-4 mt-4">
                                        <div className="flex gap-4 items-center bg-black/20 p-3 rounded-lg">
                                            <div className="p-2 bg-purple-500/20 rounded">
                                                <RefreshCw className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-200">Spaced Repetition System (SRS)</h4>
                                                <p className="text-xs text-gray-500">We will implement a forgetting curve algorithm to schedule reviews automatically.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-center bg-black/20 p-3 rounded-lg">
                                            <div className="p-2 bg-blue-500/20 rounded">
                                                <Monitor className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-200">iOS Mobile App</h4>
                                                <p className="text-xs text-gray-500">Native Swift application is in the planning phase (Prompt Generated).</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </NeonCard>
                    </div>
                ) : displayMode === 'CONTACT' ? (
                    <div className="glass-panel p-6 border border-white/10 rounded-xl space-y-6">
                        <h2 className="text-2xl font-bold mb-4">Edit Contact Information</h2>
                        <div className="space-y-4 max-w-xl">
                            <div>
                                <label className="block text-gray-400 mb-1">Email</label>
                                <input
                                    type="text"
                                    value={contactEdit.email}
                                    onChange={e => setContactEdit({ ...contactEdit, email: e.target.value })}
                                    className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={contactEdit.phone}
                                    onChange={e => setContactEdit({ ...contactEdit, phone: e.target.value })}
                                    className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 mb-1">Address</label>
                                <textarea
                                    value={contactEdit.address}
                                    onChange={e => setContactEdit({ ...contactEdit, address: e.target.value })}
                                    className="w-full bg-black/50 border border-white/20 rounded p-2 text-white"
                                    rows={3}
                                />
                            </div>
                            <button
                                onClick={handleSaveContactInfo}
                                className="bg-neon-cyan text-black px-6 py-2 rounded-lg font-bold hover:bg-cyan-400 transition"
                            >
                                Save Contact Info
                            </button>
                        </div>
                    </div>
                ) : displayMode === 'INBOX' ? (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold">Form Submissions</h2>
                        <div className="glass-panel border border-white/10 rounded-xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-gray-400">
                                    <tr>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Message</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {submissions.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No submissions yet.</td></tr>
                                    ) : (
                                        submissions.map((sub: any) => (
                                            <tr key={sub.id} className="hover:bg-white/5">
                                                <td className="p-4 text-gray-400 text-sm">
                                                    {new Date(sub.submittedAt).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 font-medium">{sub.name}</td>
                                                <td className="p-4 text-cyan-400">{sub.email}</td>
                                                <td className="p-4 text-gray-300 max-w-md truncate" title={sub.message}>
                                                    {sub.message}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${sub.status === 'UNREAD' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    !selectedSchool ? (
                        <>
                            {/* Global Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <StatCard title="Total Schools" value={stats.schools} icon={School} color="purple" />
                                <StatCard title="Total Teachers" value={stats.teachers} icon={GraduationCap} color="blue" />
                                <StatCard title="Total Students" value={stats.students} icon={Users} color="cyan" />
                                <StatCard title="Parents" value={stats.parents} icon={Users} color="green" />
                            </div>

                            {/* Raw API Access */}
                            <div className="flex gap-4">
                                <a href={`${API_URL}/dev/teachers`} target="_blank" rel="noopener noreferrer">
                                    <NeonButton variant="secondary" size="sm">
                                        <BarChart className="w-4 h-4 mr-2" /> All Teachers JSON
                                    </NeonButton>
                                </a>
                                <a href={`${API_URL}/dev/students`} target="_blank" rel="noopener noreferrer">
                                    <NeonButton variant="secondary" size="sm">
                                        <BarChart className="w-4 h-4 mr-2" /> All Students JSON
                                    </NeonButton>
                                </a>
                            </div>

                            {/* Schools Table */}
                            <NeonCard className="p-6" glowColor="blue">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <BarChart className="w-5 h-5 text-neon-cyan" /> School Registry
                                    </h2>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-gray-400 text-sm border-b border-white/10">
                                                <th className="p-4">School Name</th>
                                                <th className="p-4">Invite Code</th>
                                                <th className="p-4">Plan Status</th>
                                                <th className="p-4 text-center">Teachers</th>
                                                <th className="p-4 text-center">Students</th>
                                                <th className="p-4 text-right">Admin Email</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {schools.map((school) => (
                                                <tr key={school.id} onClick={() => handleSchoolClick(school)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                                                    <td className="p-4 font-bold text-white group-hover:text-neon-cyan transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            {school.logoUrl ? (
                                                                <img src={school.logoUrl} alt="logo" className="w-8 h-8 rounded-full border border-white/20" />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-xs">
                                                                    {school.name.substring(0, 2)}
                                                                </div>
                                                            )}
                                                            {school.name}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/30 cursor-pointer hover:bg-purple-500/20 transition-all w-fit"
                                                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(school.inviteCode); }}
                                                            title="Click to copy"
                                                        >
                                                            <span className="text-purple-400 font-mono font-bold text-sm">{school.inviteCode}</span>
                                                            <Copy className="w-3 h-3 text-purple-400" />
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${school.subscriptionStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                            school.subscriptionStatus === 'TRIAL' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                                'bg-red-500/20 text-red-400 border-red-500/30'
                                                            }`}>
                                                            {school.subscriptionStatus}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center text-lg font-mono text-blue-400">
                                                        {school.teacherCount}
                                                    </td>
                                                    <td className="p-4 text-center text-lg font-mono text-cyan-400">
                                                        {school.studentCount}
                                                    </td>
                                                    <td className="p-4 text-right text-sm text-gray-500">
                                                        {school.adminEmail}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </NeonCard>
                        </>
                    ) : (
                        <>
                            {/* Detail View */}
                            {detailView === 'FOLDERS' && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
                                    <NeonCard glowColor="blue" className="p-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => setDetailView('TEACHERS')}>
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                                                <GraduationCap className="w-8 h-8 text-blue-400" />
                                            </div>
                                            <h3 className="text-xl font-bold">Teachers</h3>
                                            <p className="text-3xl font-mono text-blue-400">{schoolDetails.teachers.length}</p>
                                            <p className="text-gray-400 text-sm">View Faculty</p>
                                        </div>
                                    </NeonCard>
                                    <NeonCard glowColor="cyan" className="p-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => setDetailView('STUDENTS')}>
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                                <Users className="w-8 h-8 text-cyan-400" />
                                            </div>
                                            <h3 className="text-xl font-bold">Students</h3>
                                            <p className="text-3xl font-mono text-cyan-400">{schoolDetails.students.length}</p>
                                            <p className="text-gray-400 text-sm">View Roster</p>
                                        </div>
                                    </NeonCard>
                                    <NeonCard glowColor="purple" className="p-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => setDetailView('CLASSES')}>
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                <Layers className="w-8 h-8 text-purple-400" />
                                            </div>
                                            <h3 className="text-xl font-bold">Classes</h3>
                                            <p className="text-3xl font-mono text-purple-400">{schoolDetails.classrooms.length}</p>
                                            <p className="text-gray-400 text-sm">Class Hierarchy</p>
                                        </div>
                                    </NeonCard>
                                    <NeonCard glowColor="green" className="p-6 cursor-pointer hover:scale-105 transition-transform" onClick={() => setDetailView('PARENTS')}>
                                        <div className="flex flex-col items-center gap-3 text-center">
                                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <Users className="w-8 h-8 text-green-400" />
                                            </div>
                                            <h3 className="text-xl font-bold">Parents</h3>
                                            <p className="text-3xl font-mono text-green-400">{schoolDetails.parents.length}</p>
                                            <p className="text-gray-400 text-sm">View Accounts</p>
                                        </div>
                                    </NeonCard>
                                </div>
                            )}

                            {detailView === 'TEACHERS' && (
                                <NeonCard className="p-6">
                                    <h2 className="text-2xl font-bold mb-4 text-blue-400">Faculty Directory</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="text-gray-400 border-b border-white/10">
                                                    <th className="p-3">Name / ID</th>
                                                    <th className="p-3">Email</th>
                                                    <th className="p-3">Subject</th>
                                                    <th className="p-3">Joined At</th>
                                                    <th className="p-3">Assigned Classes</th>
                                                    <th className="p-3 text-right">API</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {schoolDetails.teachers.map((t: any) => (
                                                    <tr key={t.id} className="hover:bg-white/5">
                                                        <td className="p-3">
                                                            <div className="font-bold">{t.name}</div>
                                                            <div className="text-xs text-gray-500">{t.id}</div>
                                                        </td>
                                                        <td className="p-3 text-gray-300">{t.email}</td>
                                                        <td className="p-3 text-blue-400">{t.subject}</td>
                                                        <td className="p-3 text-gray-400">{t.joinedAt}</td>
                                                        <td className="p-3 font-mono text-xs text-gray-500 max-w-xs truncate" title={t.assignedClasses}>
                                                            {t.assignedClasses}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <a href={`${API_URL}/dev/teacher/${t.id}`} target="_blank" rel="noopener noreferrer">
                                                                <button className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/30">JSON</button>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {schoolDetails.teachers.length === 0 && <p className="text-center text-gray-500 py-8">No teachers enrolled.</p>}
                                    </div>
                                </NeonCard>
                            )}

                            {detailView === 'STUDENTS' && (
                                <NeonCard className="p-6">
                                    <h2 className="text-2xl font-bold mb-4 text-cyan-400">Student Roster</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="text-gray-400 border-b border-white/10">
                                                    <th className="p-3">Name / ID</th>
                                                    <th className="p-3">Credentials</th>
                                                    <th className="p-3">Contact</th>
                                                    <th className="p-3">Academic</th>
                                                    <th className="p-3">Stats</th>
                                                    <th className="p-3">Status</th>
                                                    <th className="p-3 text-right">API</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {schoolDetails.students.map((s: any) => (
                                                    <tr key={s.id} className="hover:bg-white/5">
                                                        <td className="p-3">
                                                            <div className="font-bold">{s.name}</div>
                                                            <div className="text-xs text-gray-500">{s.id}</div>
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="text-cyan-300">{s.username}</div>
                                                            <div className="text-xs text-gray-500">Pass: {s.password}</div>
                                                        </td>
                                                        <td className="p-3 text-gray-300">
                                                            <div>{s.mobileNumber}</div>
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="text-white">Grade: {s.grade}</div>
                                                            <div className="text-xs text-gray-500">Roll: {s.rollNumber}</div>
                                                            <div className="text-xs text-gray-500">ClassID: {s.classId}</div>
                                                        </td>
                                                        <td className="p-3 text-gray-300">
                                                            <div>Att: {s.attendance}%</div>
                                                            <div>Avg: {s.avgScore}</div>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-0.5 rounded text-xs border ${s.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                                }`}>
                                                                {s.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <a href={`${API_URL}/dev/student/${s.id}`} target="_blank" rel="noopener noreferrer">
                                                                <button className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded hover:bg-cyan-500/30">JSON</button>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {schoolDetails.students.length === 0 && <p className="text-center text-gray-500 py-8">No students enrolled.</p>}
                                    </div>
                                </NeonCard>
                            )}

                            {detailView === 'PARENTS' && (
                                <NeonCard className="p-6">
                                    <h2 className="text-2xl font-bold mb-4 text-green-400">Parent Accounts</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-sm">
                                            <thead>
                                                <tr className="text-gray-400 border-b border-white/10">
                                                    <th className="p-3">Name / ID</th>
                                                    <th className="p-3">Email</th>
                                                    <th className="p-3">Mobile</th>
                                                    <th className="p-3">Child Link</th>
                                                    <th className="p-3">Joined At</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {schoolDetails.parents.map((p: any) => (
                                                    <tr key={p.id} className="hover:bg-white/5">
                                                        <td className="p-3">
                                                            <div className="font-bold">{p.name}</div>
                                                            <div className="text-xs text-gray-500">{p.id}</div>
                                                        </td>
                                                        <td className="p-3 text-gray-300">{p.email}</td>
                                                        <td className="p-3 text-gray-300">{p.mobileNumber}</td>
                                                        <td className="p-3 text-green-400">
                                                            Child ID: {p.childId}
                                                        </td>
                                                        <td className="p-3 text-gray-400">{p.joinedAt}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {schoolDetails.parents.length === 0 && <p className="text-center text-gray-500 py-8">No parents registered.</p>}
                                    </div>
                                </NeonCard>
                            )}

                            {detailView === 'CLASSES' && (
                                <NeonCard className="p-6">
                                    <h2 className="text-2xl font-bold mb-4 text-purple-400">Classes & Students</h2>
                                    <div className="space-y-3">
                                        {schoolDetails.classrooms.map((cls: any) => {
                                            const classStudents = schoolDetails.students.filter((s: any) =>
                                                s.classId === cls.id || (s.classIds && JSON.parse(s.classIds || '[]').includes(cls.id))
                                            );
                                            const isExpanded = expandedClasses.has(cls.id);

                                            return (
                                                <div key={cls.id} className="border border-white/10 rounded-lg overflow-hidden">
                                                    {/* Class Header */}
                                                    <div
                                                        className="p-4 bg-white/5 hover:bg-white/10 cursor-pointer flex justify-between items-center transition-all"
                                                        onClick={() => {
                                                            const newExpanded = new Set(expandedClasses);
                                                            if (isExpanded) newExpanded.delete(cls.id);
                                                            else newExpanded.add(cls.id);
                                                            setExpandedClasses(newExpanded);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            {isExpanded ? <ChevronDown className="w-5 h-5 text-purple-400" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                                                            <div>
                                                                <h3 className="text-white font-bold">{cls.name} - {cls.section}</h3>
                                                                <p className="text-xs text-gray-500">ID: {cls.id}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6">
                                                            <div
                                                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/30 cursor-pointer hover:bg-purple-500/20"
                                                                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(cls.inviteCode); }}
                                                                title="Click to copy class invite code"
                                                            >
                                                                <span className="text-purple-400 font-mono text-sm">{cls.inviteCode}</span>
                                                                <Copy className="w-3 h-3 text-purple-400" />
                                                            </div>
                                                            <span className="text-sm text-cyan-400 font-mono">{classStudents.length} students</span>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Student List */}
                                                    {isExpanded && (
                                                        <div className="border-t border-white/10 bg-black/30">
                                                            {classStudents.length === 0 ? (
                                                                <p className="text-gray-500 text-center py-4 text-sm">No students in this class</p>
                                                            ) : (
                                                                <div className="divide-y divide-white/5">
                                                                    {classStudents.map((s: any) => (
                                                                        <div key={s.id} className="px-6 py-3 flex justify-between items-center hover:bg-white/5">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs font-bold">
                                                                                    {s.name?.charAt(0) || '?'}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-white font-medium">{s.name}</p>
                                                                                    <p className="text-xs text-gray-500">Roll: {s.rollNumber} • Grade: {s.grade}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 text-sm">
                                                                                <span className="text-gray-400">Att: {s.attendance}%</span>
                                                                                <span className="text-cyan-400 font-mono">Avg: {s.avgScore}</span>
                                                                                <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                                    {s.status}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {schoolDetails.classrooms.length === 0 && <p className="text-center text-gray-500 py-8">No classes created yet.</p>}
                                    </div>
                                </NeonCard>
                            )}
                        </>
                    ))}
            </div>
        </div>
    );
};
