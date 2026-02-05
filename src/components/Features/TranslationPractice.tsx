
import React, { useState, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Mic, Volume2, Send, CheckCircle, XCircle, ArrowRight, Languages, Trophy, Target, RotateCcw, Zap, Star, Sparkles, Award } from 'lucide-react';
import { api } from '../../services/api';

import { Student, WeaknessRecord } from '../../types';

interface TranslationPracticeProps {
    topic: string;
    level: string;
    currentUser?: Student;
    onUpdateStudent?: (s: Student) => void;
}

const TOTAL_QUESTIONS = 30;

export const TranslationPractice: React.FC<TranslationPracticeProps> = ({ topic, level, currentUser, onUpdateStudent }) => {
    const [loading, setLoading] = useState(true);
    const [currentProblem, setCurrentProblem] = useState<any>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState<any>(null);
    const [streak, setStreak] = useState(0);
    const [completed, setCompleted] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [xp, setXp] = useState(0);
    const [mistakes, setMistakes] = useState<any[]>([]);
    const [adaptiveMode, setAdaptiveMode] = useState(false);
    const [generatingAdaptive, setGeneratingAdaptive] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Text-to-Speech Handler
    const handleSpeak = () => {
        if (!currentProblem?.question) return;
        const utterance = new SpeechSynthesisUtterance(currentProblem.question);
        utterance.lang = 'hi-IN'; // Hindi
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

    // Speech-to-Text Handler
    const handleMic = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US'; // Expecting English answer
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            return;
        }

        setIsListening(true);
        recognition.start();

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserAnswer(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };
    };

    const loadProblem = async () => {
        if (completed >= TOTAL_QUESTIONS) {
            setSessionComplete(true);
            return;
        }
        setLoading(true);
        setFeedback(null);
        setUserAnswer('');
        try {
            // [UPDATED] If adaptive, pass mistakes as context (simplified for now as just a "focus" topic string or similar)
            // Ideally backend takes an extra param. Let's send focusContext if adaptiveMode is true.
            const focusContext = adaptiveMode && mistakes.length > 0
                ? `Focus on recent mistakes: ${mistakes.map(m => m.question).join('; ')}`
                : undefined;

            const problem = await api.generateEnglishPractice(topic, level, focusContext);
            setCurrentProblem(problem);
        } catch (error) {
            console.error("Failed to load practice", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProblem();
    }, [topic, level, adaptiveMode]);

    const handleSubmit = async () => {
        if (!userAnswer.trim() || !currentProblem) return;

        try {
            const res = await api.validateTranslation(currentProblem.question, userAnswer, topic);
            setFeedback(res);
            setCompleted(c => c + 1);
            if (res.correct) {
                setStreak(s => s + 1);
                setCorrectCount(c => c + 1);
                setXp(x => x + (10 * Math.min(streak + 1, 5)));
            } else {
                setStreak(0);
                // Track mistake
                setMistakes(prev => [...prev, { ...currentProblem, userAns: userAnswer }]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleNextQuestion = () => {
        if (completed >= TOTAL_QUESTIONS) {
            setSessionComplete(true);
        } else {
            loadProblem();
        }
    };

    const handleRestart = () => {
        setCompleted(0);
        setCorrectCount(0);
        setStreak(0);
        setXp(0);
        setSessionComplete(false);
        setMistakes([]);
        setAdaptiveMode(false);
        loadProblem();
    };

    const handleGenerateAdaptive = async () => {
        if (mistakes.length === 0) return;
        setGeneratingAdaptive(true);

        // Logic: 
        // 1. Create a Remedial Gap for the mistakes? (Optional, maybe for "Saved for later")
        // 2. Restart session in "Adaptive Mode" reusing the mistakes context.

        // Let's autosave a gap if score was low
        const percentage = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
        if (percentage < 70 && currentUser && onUpdateStudent) {
            const newGap: WeaknessRecord = {
                id: Date.now().toString(),
                topic: "English Translation",
                subTopic: `${topic} - ${adaptiveMode ? 'Adaptive' : 'Practice'}`, // e.g. "Tenses - Practice"
                score: percentage,
                detectedAt: new Date().toISOString(),
                status: 'OPEN',
                subject: 'English',
                remedialCompleted: false
            };
            // Append
            onUpdateStudent({
                ...currentUser,
                weaknessHistory: [newGap, ...(currentUser.weaknessHistory || [])]
            });
        }

        setCompleted(0);
        setCorrectCount(0);
        setStreak(0);
        setXp(0);
        setSessionComplete(false);
        setAdaptiveMode(true);
        setGeneratingAdaptive(false);
        // Effect will trigger loadProblem with adaptiveMode
    };

    // Session Complete Screen
    if (sessionComplete) {
        const percentage = Math.round((correctCount / TOTAL_QUESTIONS) * 100);
        const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : 'D';
        return (
            <div className="max-w-2xl mx-auto text-center p-4 sm:p-8 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_60px_rgba(251,191,36,0.5)]">
                        <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">Session Complete!</h2>
                <p className="text-gray-400 text-base sm:text-lg mb-6 sm:mb-8">You've mastered {TOTAL_QUESTIONS} challenges!</p>

                {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/10 p-3 sm:p-4 rounded-xl border border-green-500/30">
                        <div className="text-2xl sm:text-4xl font-bold text-green-400">{correctCount}</div>
                        <div className="text-xs sm:text-sm text-green-400/70">Correct</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/20 to-rose-600/10 p-3 sm:p-4 rounded-xl border border-red-500/30">
                        <div className="text-2xl sm:text-4xl font-bold text-red-400">{TOTAL_QUESTIONS - correctCount}</div>
                        <div className="text-xs sm:text-sm text-red-400/70">Mistakes</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/10 p-3 sm:p-4 rounded-xl border border-blue-500/30">
                        <div className="text-2xl sm:text-4xl font-bold text-blue-400">{percentage}%</div>
                        <div className="text-xs sm:text-sm text-blue-400/70">Accuracy</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/10 p-3 sm:p-4 rounded-xl border border-purple-500/30">
                        <div className="text-2xl sm:text-4xl font-bold text-purple-400">+{xp}</div>
                        <div className="text-xs sm:text-sm text-purple-400/70">XP</div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4 sm:p-6 rounded-xl border border-yellow-500/30 mb-6 sm:mb-8">
                    <div className="flex items-center justify-center gap-3">
                        <Award className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
                        <div className="text-left">
                            <div className="text-xs sm:text-sm text-yellow-400/70">Your Grade</div>
                            <div className="text-4xl sm:text-5xl font-bold text-yellow-400">{grade}</div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <NeonButton onClick={handleRestart} variant="secondary" size="lg">
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> New Session
                    </NeonButton>

                    {mistakes.length > 0 && (
                        <NeonButton onClick={handleGenerateAdaptive} variant="primary" size="lg" glow>
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Generate Adaptive Set
                        </NeonButton>
                    )}
                </div>
            </div>
        );
    }

    // Loading State
    if (loading) return (
        <div className="max-w-3xl mx-auto p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                <Languages className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
            </div>
            <div className="text-lg sm:text-xl text-gray-400">Loading Challenge...</div>
        </div>
    );

    // Error State
    if (!currentProblem) return (
        <div className="max-w-3xl mx-auto p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-red-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4">
                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
            </div>
            <div className="text-lg sm:text-xl text-red-400 mb-4">Failed to load</div>
            <NeonButton onClick={loadProblem} variant="secondary">Retry</NeonButton>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
            {/* Header - Stack on mobile, row on desktop */}
            <div className="bg-gradient-to-r from-green-500/5 via-cyan-500/5 to-blue-500/5 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    {/* Title */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <Languages className="w-5 h-5 sm:w-7 sm:h-7 text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white">Hindi → English</h2>
                            <p className="text-xs sm:text-sm text-gray-400">
                                <span className="text-green-400">{topic}</span> · <span className="text-cyan-400">{level}</span>
                            </p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                        {/* XP */}
                        <div className="flex items-center gap-1 bg-purple-500/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-purple-500/30">
                            <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
                            <span className="text-base sm:text-xl font-bold text-purple-400">{xp}</span>
                        </div>
                        {/* Streak */}
                        <div className="flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl border border-orange-500/30">
                            <span className="text-base sm:text-xl font-bold text-orange-400">{streak}</span>
                            <span className="text-sm sm:text-lg">🔥</span>
                        </div>
                        {/* Progress */}
                        <div>
                            <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                <Target className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                                <span className="text-sm sm:text-xl font-bold text-white">{completed + 1}<span className="text-gray-500">/{TOTAL_QUESTIONS}</span></span>
                            </div>
                            <div className="w-20 sm:w-40 h-2 sm:h-3 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500 rounded-full" style={{ width: `${(completed / TOTAL_QUESTIONS) * 100}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Challenge Card */}
            <NeonCard glowColor="green" className="p-4 sm:p-8">
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <div className="w-1 h-6 sm:h-8 bg-gradient-to-b from-green-400 to-cyan-400 rounded-full" />
                        <span className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">
                            {topic.includes("Active & Passive Voice") ? "Convert to Passive Voice" : topic.includes("Nouns & Verbs") ? "Identify Nouns & Verbs" : "Translate to English"}
                        </span>
                    </div>
                    <h3 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white leading-relaxed pl-2 sm:pl-3 border-l-4 border-green-500/50">
                        {currentProblem.question}
                    </h3>
                    <button
                        onClick={handleSpeak}
                        className="mt-3 sm:mt-4 ml-2 sm:ml-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-green-500/10 hover:bg-green-500/20 rounded-lg sm:rounded-xl text-green-400 flex items-center gap-2 text-xs sm:text-sm transition-all border border-green-500/20"
                    >
                        <Volume2 className="w-3 h-3 sm:w-4 sm:h-4" /> Listen
                    </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                    <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder={
                            topic === "Active & Passive Voice"
                                ? "Enter the passive voice here..."
                                : topic === "Nouns & Verbs"
                                    ? "Enter nouns and verbs here..."
                                    : "Type your English translation..."
                        }
                        className="w-full bg-black/40 border-2 border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 text-base sm:text-xl text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-all resize-none h-28 sm:h-36"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                    />

                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleMic}
                            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all border border-white/10 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}
                        >
                            <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>

                        {!feedback ? (
                            <NeonButton onClick={handleSubmit} variant="primary" disabled={!userAnswer.trim()}>
                                <Send className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Submit</span> <span className="sm:hidden">Go</span>
                            </NeonButton>
                        ) : (
                            <NeonButton onClick={handleNextQuestion} variant="secondary">
                                {completed >= TOTAL_QUESTIONS ? 'Results' : 'Next'} <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                            </NeonButton>
                        )}
                    </div>
                </div>
            </NeonCard>

            {/* Feedback Card */}
            {feedback && (
                <NeonCard glowColor={feedback.correct ? 'green' : 'red'} className="p-4 sm:p-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex-shrink-0 ${feedback.correct ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10' : 'bg-gradient-to-br from-red-500/20 to-rose-500/10'}`}>
                            {feedback.correct ? <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" /> : <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h4 className={`text-lg sm:text-xl font-bold ${feedback.correct ? 'text-green-400' : 'text-red-400'}`}>
                                    {feedback.correct ? '✨ Excellent!' : '⚠️ Try Again'}
                                </h4>
                                {feedback.correct && streak > 1 && (
                                    <span className="px-2 py-0.5 sm:px-3 sm:py-1 bg-orange-500/20 rounded-full text-orange-400 text-xs sm:text-sm font-bold flex items-center gap-1">
                                        <Star className="w-3 h-3 sm:w-4 sm:h-4" /> {streak}x
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-300 text-sm sm:text-lg mb-3 sm:mb-4">{feedback.feedback}</p>

                            {!feedback.correct && (
                                <div className="bg-black/40 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-green-500/20">
                                    <div className="text-xs sm:text-sm text-gray-400 mb-1">Correct Answer:</div>
                                    <div className="text-base sm:text-xl text-green-400 font-medium break-words">{feedback.improved || feedback.answer}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </NeonCard>
            )}
        </div>
    );
};
