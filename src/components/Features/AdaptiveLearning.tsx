import React, { useState, useRef, useEffect } from 'react';
import { api, DEFAULT_MODEL } from '../../services/api';
import { StudyPlanItem, QuizQuestion, Student, WeaknessRecord } from '../../types';
import { Bot, Sparkles, ArrowRight, Youtube, ExternalLink, AlertTriangle, BookOpen, Lightbulb, Mic, FileText, Headphones, XCircle, CheckCircle, CircleHelp, Link as LinkIcon, Menu, History, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { VoiceTutor } from './VoiceTutor';
import { NeonCard, NeonButton, Input } from '../UIComponents';
import { HistorySidebar } from './HistorySidebar';
import { getStudentRecommendation, LearningRecommendation } from '../../services/learningAlgorithm';
import { RemedialModal } from './RemedialModal';
import { XP_REWARDS, calculateLevel } from '../../services/gamification';
import { knowledgeGraph } from '../../services/engine/KnowledgeGraph';
import { masteryModel } from '../../services/engine/MasteryModel';
import { gapDetector } from '../../services/engine/GapDetector';
import { ConceptId, MasteryRecord } from '../../services/engine/types';

const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');

interface AdaptiveLearningProps {
    onStartVoice?: () => void;
    currentUser?: Student;
    onUpdateStudent?: (student: Student) => void;
    initialPlan?: StudyPlanItem;
    contextClass?: { subject?: string; grade?: string; name?: string; id: string };
    onStartQuiz?: (questions: QuizQuestion[], topic: string) => void; // [NEW] Callback for external quiz handling
}

export const AdaptiveLearning: React.FC<AdaptiveLearningProps> = ({ onStartVoice, currentUser, onUpdateStudent, initialPlan, contextClass, onStartQuiz }) => {
    const [mode, setMode] = useState<'PLANNER' | 'VOICE' | 'QUIZ'>('PLANNER');

    const [topic, setTopic] = useState('');
    // Initialize subject/grade from context if available, else default
    const [subject, setSubject] = useState(contextClass?.subject || 'Science');
    const [gradeLevel, setGradeLevel] = useState(contextClass?.grade || 'Grade 10');

    // Update state if contextClass changes
    useEffect(() => {
        if (contextClass) {
            if (contextClass.subject) setSubject(contextClass.subject);
            if (contextClass.grade) setGradeLevel(contextClass.grade);
        }
    }, [contextClass]);
    const [loading, setLoading] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'PLAN' | 'QUIZ' | 'NONE'>('NONE');
    const [countDown, setCountDown] = useState(30);
    const [error, setError] = useState<string | null>(null);
    const [studyPlan, setStudyPlan] = useState<StudyPlanItem | null>(null);
    const [chatMode, setChatMode] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [historyRefresh, setHistoryRefresh] = useState(0);
    // Default to false so user clicks to see (as requested), or true if they want it open? 
    // "clicking which students can see" => implies hidden by default.
    const [showHistory, setShowHistory] = useState(false);

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState(0);
    const [analysis, setAnalysis] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);


    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatMode && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, chatMode]);

    useEffect(() => {
        if (onStartVoice) setMode('VOICE');
    }, [onStartVoice]);

    // [NEW] Load initial plan from history/dashboard
    useEffect(() => {
        if (initialPlan) {
            setStudyPlan(initialPlan);
            setMode('PLANNER');
            // Ensure topic input matches for clarity (optional, but good UX)
            if (initialPlan.topic) setTopic(initialPlan.topic);
        }
    }, [initialPlan]);

    // [NEW] Recommendation Logic
    const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]); // [updated] Array
    const [showRemedial, setShowRemedial] = useState(false);
    const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
    const [prerequisiteSuggestion, setPrerequisiteSuggestion] = useState<{ prerequisite: string; reason: string; resourceQuery: string } | null>(null);

    // [NEW] Background Quiz Generation
    const [preGeneratedQuiz, setPreGeneratedQuiz] = useState<QuizQuestion[] | null>(null);

    useEffect(() => {
        if (currentUser) {
            // [UPDATED] Pass context subject for context-aware recs
            const basicRecs = getStudentRecommendation(currentUser, subject);

            // --- KNOWLEDGE ENGINE SIMULATION ---
            // In a real app, we'd fetch the user's persisted mastery map.
            // Here, we simulate a state to demonstrate the engine's capabilities.
            let engineRecs: LearningRecommendation[] = [];

            if (subject === 'Physics' || subject === 'Science') {
                const mockMastery = new Map<ConceptId, MasteryRecord>();

                // Scenario: Student knows 1D Motion well, but fails F=ma (Newton's 2nd Law)
                mockMastery.set('PHYS_MOTION_1D', { ...masteryModel.getInitialState('PHYS_MOTION_1D'), score: 0.95, attempts: 5 });
                mockMastery.set('PHYS_NEWTON_2', { ...masteryModel.getInitialState('PHYS_NEWTON_2'), score: 0.4, attempts: 4 });

                const gaps = gapDetector.detectGaps(mockMastery);

                engineRecs = (gaps || []).map(gap => ({
                    type: 'REMEDIAL',
                    topic: knowledgeGraph.getNode(gap.conceptId)?.label || gap.conceptId,
                    reason: `[AI ENGINE] ${gap.reason}`, // Tagged so user knows it's the new engine
                    actionLabel: gap.recommendedAction,
                    context: { gapType: gap.type, severity: gap.severity }
                }));
            }

            // Merge: Engine Recs on TOP (High Precision) + Basic Recs below
            setRecommendations([...engineRecs, ...basicRecs]);
        }
    }, [currentUser, subject]); // Re-run when user or SUJECT changes

    // [NEW] Auto-generate Quiz when Study Plan is ready
    useEffect(() => {
        if (studyPlan && topic && currentUser?.id && !preGeneratedQuiz) {
            console.log("Auto-generating quiz for:", topic);
            const generateBackgroundQuiz = async () => {
                try {
                    const response = await api.generateQuiz(
                        topic,
                        gradeLevel,
                        5, // Keep usage low for auto-gen, or match UI? Let's use 5 for quick check or 20 per requirement? 
                        // User asked for 20-30 range broadly, but for quick immediate access, maybe 10? 
                        // Stick to 20 as per previous constraint? 
                        // Let's stick to 20 to be consistent with "Question Count" task.
                        20,
                        currentUser.id,
                        difficulty,
                        contextClass?.id
                    );
                    let questions = response.questions || response;
                    // Handle wrapped responses
                    if (!Array.isArray(questions) && questions) {
                        if (Array.isArray(questions.questions)) questions = questions.questions;
                        else if (Array.isArray(questions.quiz)) questions = questions.quiz;
                        else if (Array.isArray(questions.data)) questions = questions.data;
                    }
                    if (Array.isArray(questions)) {
                        console.log("Quiz auto-generated successfully");
                        setPreGeneratedQuiz(questions);
                    }
                } catch (e) {
                    console.error("Background quiz generation failed:", e);
                }
            };
            generateBackgroundQuiz();
        }
    }, [studyPlan, topic, currentUser, gradeLevel, difficulty]);

    const handleHistorySelect = (item: any) => {
        if (item.content) {
            setStudyPlan(item.content);
            setMode('PLANNER');
            if (item.topic) setTopic(item.topic);
            // Reset quiz state if switching plans
            setQuizQuestions([]);
            setQuizSubmitted(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic) return;
        if (!currentUser?.id) {
            alert("Error: Student ID is missing. History will not be saved. Please re-login.");
            console.error("Student ID missing in AdaptiveLearning");
        }
        setLoading(true);
        setLoadingAction('PLAN');
        setError(null);
        setStudyPlan(null);
        setQuizQuestions([]);
        setPreGeneratedQuiz(null); // Reset pre-gen quiz
        setQuizSubmitted(false);
        try {
            console.log("Generating plan for student:", currentUser?.id);
            const plan = await api.generateStudyPlan(
                topic,
                gradeLevel,
                currentUser?.id,
                contextClass?.id // [UPDATED] Pass class context
            );
            console.log("Plan generated, saving to history...");
            setStudyPlan(plan);
            setHistoryRefresh(h => h + 1);

            // [NEW] Award XP for Module Generation
            if (currentUser && onUpdateStudent) {
                const earnedXp = XP_REWARDS.MODULE_GENERATION;
                const updatedStudent = {
                    ...currentUser,
                    xp: (currentUser.xp || 0) + earnedXp,
                    level: calculateLevel((currentUser.xp || 0) + earnedXp)
                };
                onUpdateStudent(updatedStudent);
                // api.updateStudent call is handled by parent or we can do it here?
                // AdaptiveLearning doesn't consistently rely on parent for persistence.
                // handleStartQuiz calls onUpdateStudent AND api.updateStudent sometimes?
                // Actually handleSubmitQuiz calls onUpdateStudent AND api.updateStudent.
                // Let's call api.updateStudent to be safe.
                api.updateStudent(updatedStudent).catch(console.error);
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate plan.");
        } finally {
            setLoading(false);
            setLoadingAction('NONE');
        }
    };

    const handleStartQuiz = async () => {
        if (!topic) return;

        // [OPTIMIZATION] Use pre-generated quiz if available
        if (preGeneratedQuiz && preGeneratedQuiz.length > 0) {
            console.log("Using pre-generated quiz!");
            if (onStartQuiz) {
                onStartQuiz(preGeneratedQuiz, topic);
            } else {
                setQuizQuestions(preGeneratedQuiz);
                setUserAnswers(new Array(preGeneratedQuiz.length).fill(-1));
                setMode('QUIZ');
            }
            return;
        }

        // Normal fallback flow
        setLoading(true);
        setLoadingAction('QUIZ');
        setCountDown(30);

        // Start Countdown Timer
        const timer = setInterval(() => {
            setCountDown((prev) => {
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);

        try {
            setLoadingAction('QUIZ');
            const response = await api.generateQuiz(
                topic,
                gradeLevel,
                5,
                currentUser?.id,
                difficulty
            );
            let questions = response.questions || response;



            // Handle wrapped responses (AI sometimes nests array in object)
            if (!Array.isArray(questions) && questions) {
                if (Array.isArray(questions.questions)) questions = questions.questions;
                else if (Array.isArray(questions.quiz)) questions = questions.quiz;
                else if (Array.isArray(questions.data)) questions = questions.data;
            }

            if (!Array.isArray(questions)) {
                console.error("Invalid quiz response:", response);
                if (response.error) throw new Error(response.error);
                throw new Error("AI generated an invalid quiz format. Please try again.");
            }

            if (onStartQuiz) {
                onStartQuiz(questions, topic);
            } else {
                // Fallback to internal mode if no callback provided
                setQuizQuestions(questions);
                setUserAnswers(new Array(questions.length).fill(-1));
                setMode('QUIZ');
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to generate quiz.");
        } finally {
            clearInterval(timer);
            setLoading(false);
            setLoadingAction('NONE');
        }
    };

    const handleSubmitQuiz = async () => {
        if (quizSubmitted) return;
        if (userAnswers.includes(-1)) {
            alert("Please answer all questions.");
            return;
        }
        setQuizSubmitted(true);
        const score = quizQuestions.reduce((acc: number, q: QuizQuestion, i: number) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
        setQuizScore(score);

        // Dynamic Difficulty Adjustment (DDA)
        const percentage = score / quizQuestions.length;
        if (percentage >= 0.8) setDifficulty('Hard');
        else if (percentage < 0.5) setDifficulty('Easy');
        else setDifficulty('Medium');

        // Award XP ( Bonus for Hard mode )
        let earnedXp = XP_REWARDS.QUIZ_COMPLETION;
        if (percentage >= 0.8) earnedXp += XP_REWARDS.QUIZ_PERFECT_SCORE;
        if (difficulty === 'Hard') earnedXp += 10;

        if (currentUser) {
            // 1. Submit to Backend for Analysis & Persistence
            setIsAnalyzing(true);
            console.log("[QUIZ SUBMIT] Submitting to backend...");

            api.submitQuizResult(
                currentUser.id,
                topic,
                userAnswers,
                quizQuestions,
                contextClass?.id,
                'AI_LEARNING',
                subject
            ).then(res => {
                console.log("[QUIZ SUBMIT] Backend response:", res);

                // Update local student state
                if (onUpdateStudent) {
                    const newHistory = (res.success && res.newGaps && res.newGaps.length > 0)
                        ? [...(currentUser.weaknessHistory || []), ...res.newGaps]
                        : currentUser.weaknessHistory;

                    onUpdateStudent({
                        ...currentUser,
                        xp: (currentUser.xp || 0) + earnedXp,
                        level: calculateLevel((currentUser.xp || 0) + earnedXp),
                        weaknessHistory: newHistory
                    });

                    if (res.newGaps && Array.isArray(res.newGaps) && res.newGaps.length > 0) {
                        setAnalysis(res.newGaps.map((g: any) => g.subTopic));
                    }
                }
            }).catch(err => {
                console.error("Failed to submit quiz result:", err);
                // Fallback: Still award XP locally
                if (onUpdateStudent) {
                    onUpdateStudent({
                        ...currentUser,
                        xp: (currentUser.xp || 0) + earnedXp,
                        level: calculateLevel((currentUser.xp || 0) + earnedXp)
                    });
                }
            }).finally(() => {
                setIsAnalyzing(false);
            });
        }
    };

    const handleChat = async () => {
        if (!chatInput) return;
        const userMsg = chatInput;
        const newHistory = [...chatHistory, { role: 'user' as const, text: userMsg }];
        setChatHistory(newHistory);
        setChatInput('');
        try {
            const response = await api.chat(userMsg, newHistory);
            setChatHistory(prev => [...prev, { role: 'ai', text: response.text || response }]);
        } catch (e: any) {
            setChatHistory(prev => [...prev, { role: 'ai', text: `Error: ${e.message}` }]);
        }
    };

    return (
        <div className="space-y-8">
            {/* MODE SWITCHER */}
            <div className="flex justify-center mb-8">
                <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 flex items-center gap-1 shadow-lg backdrop-blur-sm">
                    <button
                        onClick={() => setMode('PLANNER')}
                        className={`
                        px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-3
                        ${mode === 'PLANNER'
                                ? 'bg-gradient-to-r from-neon-cyan to-blue-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}
                    `}
                    >
                        <FileText className="w-4 h-4" /> Study Planner
                    </button>
                    <button
                        onClick={() => setMode('VOICE')}
                        className={`
                        px-8 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-3
                        ${mode === 'VOICE'
                                ? 'bg-gradient-to-r from-neon-purple to-pink-500 text-white shadow-[0_0_20px_rgba(188,19,254,0.4)] scale-105'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}
                    `}
                    >
                        <Headphones className="w-4 h-4" /> Talk to AI Tutor
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div className="relative min-h-[500px]">
                {mode === 'VOICE' && (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <VoiceTutor
                            onClose={() => setMode('PLANNER')}
                            contextClass={contextClass ? { grade: contextClass.grade, subject: contextClass.subject } : undefined}
                        />
                    </div>
                )}

                {mode === 'QUIZ' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <NeonCard className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-2xl font-bold text-white">Quiz: {topic}</h3>
                                <NeonButton variant="ghost" onClick={() => setMode('PLANNER')} size="sm">Exit Quiz</NeonButton>
                            </div>

                            {!quizSubmitted ? (
                                <div className="space-y-8">
                                    {quizQuestions.map((q, i) => (
                                        <div key={i} className="space-y-4">
                                            <p className="text-lg text-white font-medium">{i + 1}. {q.question}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt: string, optIdx: number) => (
                                                    <button
                                                        key={optIdx}
                                                        onClick={() => {
                                                            const newAnswers = [...userAnswers];
                                                            newAnswers[i] = optIdx;
                                                            setUserAnswers(newAnswers);
                                                        }}
                                                        className={`p-4 rounded-lg text-left transition-all ${userAnswers[i] === optIdx ? 'bg-neon-cyan text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <NeonButton onClick={handleSubmitQuiz} className="w-full mt-8" glow>Submit Quiz</NeonButton>
                                </div>
                            ) : (
                                <div className="text-center space-y-6">
                                    <div className="inline-block p-8 rounded-full bg-white/5 border border-white/10 mb-4">
                                        <div className="text-6xl font-bold text-white mb-2">{Math.round((quizScore / quizQuestions.length) * 100)}%</div>
                                        <div className="text-gray-400">Your Score</div>
                                    </div>

                                    {isAnalyzing ? (
                                        <div className="animate-pulse text-neon-purple">Analyzing your performance to identify gaps...</div>
                                    ) : (
                                        <>
                                            {analysis.length > 0 && (
                                                <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl text-left">
                                                    <h4 className="text-red-400 font-bold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Identified Gaps</h4>
                                                    <p className="text-gray-300 mb-4">Based on your answers, we've detected some gaps in your understanding. These have been added to your profile for remedial learning:</p>
                                                    <ul className="space-y-2">
                                                        {analysis.map((gap: string, i: number) => (
                                                            <li key={i} className="flex items-center gap-2 text-white"><XCircle className="w-4 h-4 text-red-500" /> {gap}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* [Phase 2] Prerequisite Recommendation Card */}
                                            {prerequisiteSuggestion && (
                                                <NeonCard glowColor="purple" className="mb-6 mt-6 border-l-4 border-purple-500 text-left">
                                                    <div className="flex items-start gap-4">
                                                        <div className="p-3 bg-neon-pink/10 rounded-full">
                                                            <div className="text-neon-pink"><Sparkles className="w-6 h-6" /></div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-bold text-white mb-2">Foundational Gap Detected</h3>
                                                            <p className="text-gray-300 mb-2">
                                                                It seems you might be missing some core concepts from <strong>{prerequisiteSuggestion.prerequisite}</strong>.
                                                            </p>
                                                            <p className="text-gray-400 text-sm italic mb-4">"{prerequisiteSuggestion.reason}"</p>

                                                            <div className="flex gap-3">
                                                                <NeonButton size="sm" variant="primary" onClick={() => {
                                                                    setTopic(prerequisiteSuggestion.prerequisite);
                                                                    setMode('PLANNER');
                                                                    // Trigger generation after state update
                                                                    setTimeout(() => {
                                                                        const btn = document.getElementById('generate-btn');
                                                                        if (btn) btn.click();
                                                                        // Better: just call current handleGenerate if accessible or rely on user clicking. 
                                                                        // Actually let's just switch mode and fill topic. User can click Generate.
                                                                    }, 100);
                                                                }}>
                                                                    <BookOpen className="w-4 h-4 mr-2" />
                                                                    Build Foundation: {prerequisiteSuggestion.prerequisite}
                                                                </NeonButton>
                                                                <NeonButton size="sm" variant="secondary" onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(prerequisiteSuggestion.resourceQuery)}`, '_blank')}>
                                                                    <Youtube className="w-4 h-4 mr-2" />
                                                                    Watch Video
                                                                </NeonButton>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </NeonCard>
                                            )}
                                            <div className="space-y-4 text-left mt-8">
                                                <h4 className="font-bold text-white border-b border-white/10 pb-2">Review Answers</h4>
                                                {quizQuestions.map((q: QuizQuestion, i: number) => (
                                                    <div key={i} className={`p-4 rounded border ${userAnswers[i] === q.correctAnswer ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                                        <p className="text-white mb-2">{q.question}</p>
                                                        <p className={`text-sm ${userAnswers[i] === q.correctAnswer ? 'text-green-400' : 'text-red-400'}`}>
                                                            Your Answer: {q.options[userAnswers[i]]}
                                                        </p>
                                                        {userAnswers[i] !== q.correctAnswer && (
                                                            <p className="text-sm text-green-400 mt-1">Correct Answer: {q.options[q.correctAnswer]}</p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-2 italic">{q.explanation}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    <NeonButton onClick={() => { setMode('PLANNER'); setQuizSubmitted(false); }} variant="secondary">Back to Planner</NeonButton>
                                </div>
                            )}
                        </NeonCard>
                    </div>
                )}

                {mode === 'PLANNER' && (
                    <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                        {chatMode ? (
                            <NeonCard className="h-[600px] flex flex-col p-0 overflow-hidden border-neon-purple/30">
                                <div className="shrink-0 p-4 bg-neon-purple/10 border-b border-white/10 flex justify-between items-center">
                                    <h3 className="text-neon-purple font-display font-bold flex items-center gap-2"><Bot className="w-5 h-5" /> AI Tutor Chat</h3>
                                    <NeonButton variant="ghost" onClick={() => setChatMode(false)} className="!py-1 !px-3 text-xs">Close</NeonButton>
                                </div>
                                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                                    <div className="flex justify-start"><div className="bg-white/10 text-gray-200 rounded-2xl rounded-tl-none p-3 max-w-[80%] text-sm">Hello! I can answer questions about the study plan we just generated. What would you like to know?</div></div>
                                    {chatHistory.map((msg: { role: 'user' | 'ai', text: string }, i: number) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`rounded-2xl p-3 max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-neon-cyan/20 text-cyan-100 rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>{msg.text}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="shrink-0 p-4 bg-black/20 border-t border-white/10 flex gap-2">
                                    <Input value={chatInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChatInput(e.target.value)} placeholder="Ask a follow-up..." onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleChat()} />
                                    <NeonButton onClick={handleChat} glow variant="secondary"><ArrowRight className="w-4 h-4" /></NeonButton>
                                </div>
                            </NeonCard>
                        ) : (
                            <>
                                {/* [NEW] AI Recommendation Engine - Dual Cards */}
                                {!studyPlan && recommendations.length > 0 && (
                                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                        {recommendations.map((rec, idx) => (
                                            <NeonCard
                                                key={idx}
                                                glowColor={rec.type === 'REMEDIAL' ? 'red' : 'blue'}
                                                className={`flex flex-col justify-between p-6 border border-white/10 ${rec.type === 'REMEDIAL' ? 'bg-red-950/10' : 'bg-blue-950/10'}`}
                                            >
                                                <div>
                                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                                                        <Sparkles className={`w-5 h-5 ${rec.type === 'REMEDIAL' ? 'text-red-400' : 'text-blue-400'}`} />
                                                        {rec.type === 'REMEDIAL' ? 'Gap Detected' : 'Recommended for You'}
                                                    </h3>
                                                    <p className="text-gray-300 text-sm mb-4 leading-relaxed">{rec.reason}</p>
                                                </div>
                                                <NeonButton
                                                    variant={rec.type === 'REMEDIAL' ? 'secondary' : 'primary'}
                                                    size="sm"
                                                    className="w-full justify-center"
                                                    onClick={() => {
                                                        if (rec.type === 'REMEDIAL') {
                                                            setSelectedGapId(rec.context?.gapId);
                                                            setShowRemedial(true);
                                                        } else if (rec.type === 'PLAN') {
                                                            setTopic(rec.topic);
                                                            // Optional: Trigger generate immediately? User request implies "it will generate a new ai module"
                                                            // State update is async, so we use timeout or hook. 
                                                            // Let's just set the topic and let them click or trigger via a ref/effect if we want strict auto-start.
                                                            // The user said "when hitted it will generate a new ai module". 
                                                            // So we should probably trigger it.
                                                            setTimeout(() => {
                                                                // Changing state `topic` won't be immediate in this closure. 
                                                                // But usually we can just set it and let user click generate to confirm details (model etc). 
                                                                // User said "generate modules when hitted". 
                                                                // I'll stick to pre-filling. Auto-generating without confirming model/grade might be annoying.
                                                                // But to be "agentic" and helpful, I'll scroll them to the input.
                                                            }, 100);
                                                        }
                                                    }}
                                                >
                                                    {rec.actionLabel} <ArrowRight className="w-4 h-4 ml-2" />
                                                </NeonButton>
                                            </NeonCard>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
                                    {/* History Toggle Button */}
                                    <div className="mb-4">
                                        <NeonButton onClick={() => setShowHistory(true)} variant="secondary" size="sm">
                                            <Menu className="w-4 h-4 mr-2" /> Show History
                                        </NeonButton>
                                    </div>

                                    {/* SIDEBAR DRAWER (Overlay) */}
                                    {showHistory && (
                                        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
                                            {/* Backdrop */}
                                            <div
                                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                                onClick={() => setShowHistory(false)}
                                            />

                                            {/* Sidebar Content */}
                                            <div className="relative w-80 h-full bg-[#0a0a0a] border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
                                                <div className="p-4 flex justify-between items-center border-b border-white/10 bg-white/5">
                                                    <h3 className="font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-neon-purple" /> History</h3>
                                                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white transition-colors">
                                                        <XCircle className="w-6 h-6" />
                                                    </button>
                                                </div>
                                                <div className="h-[calc(100%-60px)] overflow-hidden">
                                                    <HistorySidebar
                                                        studentId={currentUser?.id || ''}
                                                        type="STUDY_PLAN"
                                                        onSelect={(item) => {
                                                            handleHistorySelect(item);
                                                            setShowHistory(false);
                                                        }}
                                                        className="h-full border-none bg-transparent"
                                                        refreshTrigger={historyRefresh}
                                                        contextClass={contextClass}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MAIN CONTENT - Always Full Width */}
                                    <div className="col-span-1 lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-8">

                                        <div className="lg:col-span-1">
                                            <NeonCard glowColor="cyan" className="h-fit sticky top-6">
                                                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Sparkles className="text-yellow-400" /> Create Module</h3>
                                                <p className="text-gray-400 text-xs mb-4">Enter a topic to generate a comprehensive study guide, including videos, key concepts, and detailed explanations.</p>



                                                <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white mb-4" value={subject} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubject(e.target.value)}>
                                                    <option value="Science">Science</option>
                                                    <option value="Physics">Physics</option>
                                                    <option value="Chemistry">Chemistry</option>
                                                    <option value="Biology">Biology</option>
                                                    <option value="Mathematics">Mathematics</option>
                                                    <option value="History">History</option>
                                                    <option value="Geography">Geography</option>
                                                    <option value="Literature">Literature</option>
                                                    <option value="Computer Science">Computer Science</option>
                                                </select>

                                                <Input value={topic} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTopic(e.target.value)} placeholder="Enter Topic (e.g. Black Holes)..." className="mb-4" />
                                                <select className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white mb-4" value={gradeLevel} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGradeLevel(e.target.value)}>
                                                    {[...Array(12)].map((_, i) => <option key={i} value={`Grade ${i + 1}`}>Grade {i + 1}</option>)}
                                                    <option>University</option>
                                                </select>
                                                <NeonButton onClick={handleGenerate} isLoading={loading && loadingAction === 'PLAN'} className="w-full" glow variant="primary" disabled={!topic}>Generate Plan</NeonButton>
                                            </NeonCard>
                                        </div>

                                        <div className="lg:col-span-2">
                                            {error && (
                                                <NeonCard glowColor="red" className="mb-6 border-red-500/50 bg-red-950/20">
                                                    <div className="flex items-start gap-4">
                                                        <XCircle className="w-8 h-8 text-red-500 shrink-0 mt-1" />
                                                        <div>
                                                            <h4 className="font-bold text-white text-lg">AI Generation Failed</h4>
                                                            <p className="text-red-300 text-sm mt-1">{error}</p>
                                                            {error.includes("403") && <p className="text-xs text-red-400 mt-2 font-mono bg-black/30 p-2 rounded">Tip: Enable billing in your Google Cloud Project or check your API Key.</p>}
                                                            {error.includes("429") && <p className="text-xs text-red-400 mt-2 font-mono bg-black/30 p-2 rounded">Tip: You are generating too fast. Wait a moment.</p>}
                                                        </div>
                                                    </div>
                                                </NeonCard>
                                            )}

                                            {studyPlan ? (
                                                <NeonCard className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative overflow-hidden">
                                                    {loadingAction === 'QUIZ' && (
                                                        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                                                            <div className="relative mb-6">
                                                                <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-neon-cyan animate-spin"></div>
                                                                <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl text-white font-mono">
                                                                    {countDown}
                                                                </div>
                                                            </div>
                                                            <h3 className="text-xl font-bold text-white mb-2">Generating Quiz...</h3>
                                                            <p className="text-gray-400 text-sm animate-pulse">Analyzing content and creating questions</p>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b border-white/10 pb-6">
                                                        <div>
                                                            <h2 className="text-3xl font-display font-bold text-neon-cyan">{studyPlan.topic}</h2>
                                                            <p className="text-gray-300 mt-2 font-light text-lg">{studyPlan.summary}</p>
                                                        </div>
                                                        <div className="flex gap-2 shrink-0">
                                                            <NeonButton variant="primary" onClick={handleStartQuiz} glow>
                                                                <CircleHelp className="w-4 h-4 mr-2" /> Take Quiz
                                                            </NeonButton>
                                                            <NeonButton variant="secondary" onClick={() => setChatMode(true)}>
                                                                <Bot className="w-4 h-4 mr-2" /> Ask Tutor
                                                            </NeonButton>
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-neon-purple/10 to-transparent p-6 rounded-xl border border-neon-purple/20 relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/20 blur-[50px] rounded-full pointer-events-none"></div>
                                                        <h4 className="text-neon-cyan font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                                                            <BookOpen className="w-4 h-4" /> Deep Dive Explanation
                                                        </h4>
                                                        <div className="prose prose-invert max-w-none text-gray-200 leading-8 text-sm md:text-base">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkMath]}
                                                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                                                                components={{
                                                                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4 border-b border-white/10 pb-2" {...props} />,
                                                                    h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-neon-cyan mt-6 mb-3" {...props} />,
                                                                    h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-purple-400 mt-4 mb-2" {...props} />,
                                                                    p: ({ node, ...props }) => <p className="mb-4 text-justify" {...props} />,
                                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                                                                    li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
                                                                    strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
                                                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-neon-purple pl-4 italic text-gray-400 my-4" {...props} />,
                                                                    code: ({ node, ...props }) => <code className="bg-black/30 px-1 py-0.5 rounded text-neon-cyan font-mono text-sm" {...props} />,
                                                                }}
                                                            >
                                                                {(() => {
                                                                    // [SAFEGUARD] Strip markdown code blocks if AI wraps the entire content
                                                                    let content = studyPlan.detailedExplanation || "";
                                                                    if (content.startsWith("```") && content.endsWith("```")) {
                                                                        content = content.replace(/^```(markdown|json)?/i, "").replace(/```$/, "").trim();
                                                                    }
                                                                    // Double check for cases where it's just wrapped but maybe has whitespace
                                                                    content = content.replace(/```markdown/gi, "").replace(/```/g, ""); // Aggressive strip to prevent "Red Block" issue

                                                                    // [FIX] Replace literal "\n" strings with actual newlines for Markdown
                                                                    // The model sometimes over-escapes: "Line 1\\nLine 2" -> renders as text "\n"
                                                                    content = content.replace(/\\n/g, "\n");

                                                                    return content;
                                                                })()}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>

                                                    <div className="bg-black/20 p-6 rounded-lg border border-white/5">
                                                        <h4 className="text-yellow-400 font-bold uppercase tracking-wider text-sm mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Key Concepts</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{studyPlan.keyPoints?.length ? studyPlan.keyPoints.map((point: string, idx: number) => <div key={idx} className="text-sm text-gray-300 flex items-start gap-2 bg-white/5 p-2 rounded"><span className="text-neon-purple font-bold">•</span> {point}</div>) : <div className="text-gray-500 text-sm">No key points generated.</div>}</div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {/* English Videos */}
                                                        <div>
                                                            <h4 className="text-red-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                                                                <Youtube className="w-5 h-5" /> English Videos
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(studyPlan.resources || []).filter((r: any) => r.language?.toLowerCase().includes('english')).map((res: any, idx: number) => (
                                                                    <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="group p-3 bg-white/5 rounded border border-white/10 hover:border-red-500/50 block transition-all hover:-translate-y-1">
                                                                        <div className="font-bold text-white text-sm group-hover:text-red-400 transition-colors line-clamp-2">{res.title}</div>
                                                                        <div className="flex justify-between items-center mt-2">
                                                                            <span className="text-[10px] text-gray-500 uppercase bg-black/30 px-2 py-0.5 rounded">English</span>
                                                                            <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-red-400" />
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Hinglish Videos */}
                                                        <div>
                                                            <h4 className="text-orange-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2">
                                                                <Youtube className="w-5 h-5" /> Hinglish/Hindi
                                                            </h4>
                                                            <div className="space-y-3">
                                                                {(studyPlan.resources || []).filter((r: any) => !r.language?.toLowerCase().includes('english')).map((res: any, idx: number) => (
                                                                    <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="group p-3 bg-white/5 rounded border border-white/10 hover:border-orange-500/50 block transition-all hover:-translate-y-1">
                                                                        <div className="font-bold text-white text-sm group-hover:text-orange-400 transition-colors line-clamp-2">{res.title}</div>
                                                                        <div className="flex justify-between items-center mt-2">
                                                                            <span className="text-[10px] text-gray-500 uppercase bg-black/30 px-2 py-0.5 rounded">Hinglish</span>
                                                                            <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-orange-400" />
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>


                                                    {/* Other Valuable Sources Section */}
                                                    {studyPlan?.otherResources && studyPlan.otherResources.length > 0 && (
                                                        <div>
                                                            <h4 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-4 flex items-center gap-2"><LinkIcon className="w-5 h-5" /> Other Valuable Sources</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                {studyPlan.otherResources?.map((res: any, idx: number) => (
                                                                    <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="group p-4 bg-white/5 rounded border border-white/10 hover:border-blue-500/50 block transition-all hover:-translate-y-1">
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <div className={`p-1.5 rounded ${res.type === 'pdf' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                                {res.type === 'pdf' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                                                            </div>
                                                                            <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-blue-400" />
                                                                        </div>
                                                                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{res.title}</div>
                                                                        <div className="text-xs text-gray-400 mt-2 line-clamp-2">{res.description}</div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </NeonCard>
                                            ) : (
                                                !loading && (
                                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 border border-dashed border-gray-800 rounded-xl min-h-[400px] bg-black/20">
                                                        <Sparkles className="w-16 h-16 mb-4 opacity-20 text-neon-cyan" />
                                                        <p className="text-lg">AI Learning Engine Ready</p>
                                                        <p className="text-sm opacity-50">Select "Study Planner" to generate text content or switch to "Talk to AI Tutor" for voice mode.</p>
                                                    </div>
                                                )
                                            )}

                                            {loading && (
                                                <div className="h-full flex flex-col items-center justify-center min-h-[400px]">
                                                    <div className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mb-4"></div>
                                                    <p className="text-neon-cyan animate-pulse">Generating Masterclass Content...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {showRemedial && selectedGapId && currentUser && (
                <RemedialModal
                    gap={currentUser.weaknessHistory?.find(w => w.id === selectedGapId)!}
                    onClose={() => setShowRemedial(false)}
                    onResolve={(id) => {
                        const newXp = (currentUser.xp || 0) + XP_REWARDS.REMEDIAL_COMPLETION;
                        const updated = {
                            ...currentUser,
                            xp: newXp,
                            level: calculateLevel(newXp),
                            weaknessHistory: (currentUser.weaknessHistory || []).map(w => w.id === id ? { ...w, status: 'RESOLVED' as const, remedialCompleted: true } : w)
                        };
                        if (onUpdateStudent) onUpdateStudent(updated);
                        api.updateStudent(updated).catch(console.error);
                        setShowRemedial(false);
                    }}
                />
            )}
        </div>
    );
};
