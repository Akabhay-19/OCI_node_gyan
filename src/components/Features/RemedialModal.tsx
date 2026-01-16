import React, { useState, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { WeaknessRecord, RemedialContent } from '../../types';
import { api } from '../../services/api';
import { X, BookOpen, CheckCircle, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

interface RemedialModalProps {
    gap: WeaknessRecord;
    onClose: () => void;
    onResolve: (gapId: string, data?: any) => void;
    gradeLevel?: string; // [NEW] Contextual grade
}

export const RemedialModal: React.FC<RemedialModalProps> = ({ gap, onClose, onResolve, gradeLevel = 'Grade 10' }) => {
    const [step, setStep] = useState<'LOADING' | 'LEARN' | 'QUIZ' | 'RESULT'>('LOADING');
    const [content, setContent] = useState<RemedialContent | null>(null);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [score, setScore] = useState(0);

    useEffect(() => {
        // Lock body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        const loadContent = async () => {
            try {
                // [UPDATED] Use passed gradeLevel
                // Sanitize topic: If subTopic looks like a performance string, use main topic
                let topicToLearn = gap.subTopic || gap.topic;
                if (topicToLearn && (topicToLearn.includes('Quiz performance') || topicToLearn.includes('Score:'))) {
                    topicToLearn = gap.topic;
                }

                // Pass both main topic and specific sub-topic for context
                const data = await api.generateRemedialContent(gap.topic, topicToLearn, gradeLevel, gap.subject);
                setContent(data);
                setStep('LEARN');
            } catch (e) {
                console.error(e);
                alert("Failed to load remedial content.");
                onClose();
            }
        };
        loadContent();
    }, [gap]);

    const handleSubmitQuiz = async () => {
        if (!content) return;

        // precise calculation
        const calculatedScore = content.practiceQuestions.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);

        // Call Backend to Resolve
        try {
            const studentId = localStorage.getItem('GYAN_USER_ID');
            if (!studentId) return;

            const res = await api.resolveGap(
                studentId,
                gap.id,
                calculatedScore,
                content.practiceQuestions.length,
                gap.topic,
                gap.subTopic || gap.topic // Fallback
            );

            setScore(res.percentage);
            setStep('RESULT');

            if (res.resolved) {
                // Determine if we need to call onResolve (parent update) immediately or wait
                setTimeout(() => {
                    onResolve(gap.id, {
                        explanation: content.explanation,
                        questions: content.practiceQuestions,
                        userAnswers: userAnswers,
                        resolvedAt: new Date().toISOString()
                    });
                }, 2000);
            }
        } catch (e) {
            console.error("Failed to submit resolution:", e);
            alert("Error submitting quiz. Please try again.");
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onWheel={(e) => e.stopPropagation()}
        >
            <NeonCard className="max-w-2xl w-full h-[80vh] animate-in zoom-in-95 duration-300" glowColor="purple">
                <div className="h-full flex flex-col relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"><X className="w-6 h-6" /></button>

                    <div className="flex-none mb-4 border-b border-white/10 pb-4 pt-6 px-6">
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            <AlertTriangle className="text-yellow-400" /> Remedial Session
                        </h2>
                        <p className="text-neon-purple font-bold uppercase tracking-wider text-lg">
                            {(gap.subTopic && !gap.subTopic.includes('performance') && !gap.subTopic.includes('Score')) ? gap.subTopic : gap.topic}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                        {step === 'LOADING' && (
                            <div className="py-20 text-center">
                                <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-gray-400 animate-pulse">AI is preparing your personalized lesson...</p>
                            </div>
                        )}

                        {step === 'LEARN' && content && (
                            <div className="space-y-6 animate-in slide-in-from-right-8">
                                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                                    <h3 className="text-lg font-bold text-neon-cyan mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Concept Explanation</h3>
                                    <p className="text-gray-200 leading-relaxed text-lg">{content.explanation}</p>
                                </div>
                                <NeonButton onClick={() => setStep('QUIZ')} className="w-full" glow>
                                    I'm Ready for the Quiz <ArrowRight className="w-4 h-4 ml-2" />
                                </NeonButton>
                            </div>
                        )}

                        {step === 'QUIZ' && content && (
                            <div className="space-y-8 animate-in slide-in-from-right-8">
                                {content.practiceQuestions.map((q, i) => (
                                    <div key={i} className="space-y-3">
                                        <p className="text-white font-medium">{i + 1}. {q.question}</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {q.options.map((opt, optIdx) => (
                                                <button
                                                    key={optIdx}
                                                    onClick={() => {
                                                        const newAns = [...userAnswers];
                                                        newAns[i] = optIdx;
                                                        setUserAnswers(newAns);
                                                    }}
                                                    className={`p-3 rounded text-left text-sm transition-all ${userAnswers[i] === optIdx ? 'bg-neon-purple text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                <NeonButton onClick={handleSubmitQuiz} disabled={userAnswers.length < content.practiceQuestions.length} className="w-full" glow>Submit Answers</NeonButton>
                            </div>
                        )}

                        {step === 'RESULT' && (
                            <div className="text-center py-10 animate-in zoom-in-90">
                                <div className="text-6xl font-bold text-white mb-4">{Math.round(score)}%</div>
                                {score >= 80 ? (
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-green-400 flex items-center justify-center gap-2"><CheckCircle className="w-8 h-8" /> Gap Resolved!</h3>
                                        <p className="text-gray-400">Great job! You've mastered this concept.</p>
                                        <p className="text-xs text-gray-500">Closing in 2 seconds...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-red-400">Keep Trying!</h3>
                                        <p className="text-gray-400">You need 80% to resolve this gap. Review the concept and try again.</p>
                                        <NeonButton onClick={() => { setStep('LEARN'); setUserAnswers([]); }} variant="secondary">
                                            <RotateCcw className="w-4 h-4 mr-2" /> Review Concept
                                        </NeonButton>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </NeonCard>
        </div>
    );
};
