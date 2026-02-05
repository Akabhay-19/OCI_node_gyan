import React, { useState, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { WeaknessRecord, RemedialContent } from '../../types';
import { api } from '../../services/api';
import { X, BookOpen, CheckCircle, AlertTriangle, ArrowRight, Clock, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface TeacherRemedialViewProps {
    gap: WeaknessRecord;
    studentName: string;
    onClose: () => void;
    gradeLevel?: string;
}

export const TeacherRemedialView: React.FC<TeacherRemedialViewProps> = ({ gap, studentName, onClose, gradeLevel = 'Grade 10' }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [previewContent, setPreviewContent] = useState<RemedialContent | null>(null);

    const hasRemedialData = Boolean(gap.remedialData);
    const isStatusResolved = gap.status === 'RESOLVED';
    const isResolved = isStatusResolved && hasRemedialData;

    useEffect(() => {
        // Lock body scroll when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
            console.log('Restoring body scroll');
        };
    }, []);

    const handleGeneratePreview = async () => {
        setIsLoading(true);
        try {
            // Logic similar to RemedialModal for fetching content
            let topicToLearn = gap.subTopic || gap.topic;
            if (topicToLearn && (topicToLearn.includes('Quiz performance') || topicToLearn.includes('Score:'))) {
                topicToLearn = gap.topic;
            }

            const data = await api.generateRemedialContent(gap.topic, gap.subTopic || "General", gradeLevel, gap.subject);
            setPreviewContent(data);
        } catch (error) {
            console.error("Failed to generate preview:", error);
            alert("Failed to generate preview content.");
        } finally {
            setIsLoading(false);
        }
    };

    // Data to display
    const explanation = isResolved ? gap.remedialData?.explanation : previewContent?.explanation;
    const questions = isResolved ? gap.remedialData?.questions : previewContent?.practiceQuestions;
    const userAnswers = gap.remedialData?.userAnswers || [];

    // Calculate score for resolved gaps if not explicitly saved
    let score = gap.remedialScore;
    if (isResolved && score === undefined && questions) {
        const correctCount = questions.reduce((acc: number, q: any, i: number) => acc + (userAnswers[i] === q.correctAnswer ? 1 : 0), 0);
        score = (correctCount / questions.length) * 100;
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <NeonCard
                className="max-w-4xl w-full h-[85vh] relative animate-in zoom-in-95 duration-200"
                glowColor={isResolved ? "green" : "purple"}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-full flex flex-col">
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={onClose} className="text-gray-400 hover:text-white bg-black/50 rounded-full p-1"><X className="w-6 h-6" /></button>
                    </div>

                    {/* Header */}
                    <div className="flex-none p-6 border-b border-white/10">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${isResolved ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {gap.status}
                                    </span>
                                    <span className="text-gray-400 text-sm">Detected: {new Date(gap.detectedAt).toLocaleDateString()}</span>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">{gap.topic}</h2>
                                {gap.subTopic && <p className="text-neon-cyan font-medium">{gap.subTopic}</p>}
                                <p className="text-gray-400 text-sm mt-1">Student: <span className="text-white font-bold">{studentName}</span></p>
                            </div>

                            {/* Score Badge for Resolved */}
                            {isResolved && (
                                <div className="text-right">
                                    <div className="text-4xl font-bold text-green-400">{Math.round(score || 0)}%</div>
                                    <div className="text-xs text-gray-400 uppercase tracking-widest">Remedial Score</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                        {/* EMPTY STATE / PREVIEW TRIGGER */}
                        {!hasRemedialData && !previewContent && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center animate-pulse ${isStatusResolved ? 'bg-green-500/20' : 'bg-neon-purple/20'}`}>
                                    {isStatusResolved ? (
                                        <CheckCircle className="w-10 h-10 text-green-500" />
                                    ) : (
                                        <Sparkles className="w-10 h-10 text-neon-purple" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        {isStatusResolved ? "Gap Resolved (Details Unavailable)" : "Remedial Gap Pending"}
                                    </h3>
                                    <p className="text-gray-400 max-w-md mx-auto">
                                        {isStatusResolved
                                            ? "The student has resolved this gap, but the detailed session history (explanation and quiz results) was not saved."
                                            : "The student hasn't completed the remedial session for this gap yet."
                                        }
                                        <br className="mb-2" />
                                        You can generate a preview of the remedial content to review the material.
                                    </p>
                                </div>
                                <NeonButton onClick={handleGeneratePreview} isLoading={isLoading} size="lg" glow>
                                    {isLoading ? "Generating Content..." : "View Content Material"}
                                </NeonButton>
                            </div>
                        )}

                        {/* CONTENT DISPLAY (Used for both Resolved & Preview) */}
                        {(explanation || questions) && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4">

                                {/* Explanation Section */}
                                {explanation && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                                        <h3 className="text-lg font-bold text-neon-cyan mb-4 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5" />
                                            Concept Explanation
                                            {!isResolved && <span className="text-xs bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded ml-2">Preview</span>}
                                        </h3>
                                        <div className="prose prose-invert max-w-none text-gray-300">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex, rehypeRaw]}
                                            >
                                                {explanation}
                                            </ReactMarkdown>
                                        </div>
                                    </div>
                                )}

                                {/* Quiz Section */}
                                {questions && questions.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                            {isResolved ? "Performance Report" : "Quiz Preview"}
                                        </h3>
                                        <div className="space-y-4">
                                            {questions.map((q: any, i: number) => {
                                                const userAnswerId = isResolved ? userAnswers[i] : null;
                                                const isCorrect = userAnswerId === q.correctAnswer;
                                                const isSkipped = userAnswerId === undefined || userAnswerId === null; // Should not happen in resolved usually

                                                return (
                                                    <div key={i} className={`p-4 rounded-lg border ${isResolved
                                                        ? (isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30')
                                                        : 'bg-white/5 border-white/10'
                                                        }`}>
                                                        <p className="text-white font-medium mb-3">
                                                            <span className="opacity-50 mr-2">{i + 1}.</span> {q.question}
                                                        </p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                                                            {q.options.map((opt: string, optIdx: number) => {
                                                                let optionClass = "bg-black/20 text-gray-400 border-transparent";

                                                                if (isResolved) {
                                                                    if (optIdx === q.correctAnswer) {
                                                                        optionClass = "bg-green-500/20 text-green-400 border-green-500/50 font-bold";
                                                                    } else if (optIdx === userAnswerId) {
                                                                        optionClass = "bg-red-500/20 text-red-400 border-red-500/50";
                                                                    }
                                                                } else {
                                                                    // Preview mode - just highlight correct answer subtly or normal
                                                                    if (optIdx === q.correctAnswer) {
                                                                        optionClass = "bg-white/10 text-white border-white/20"; // Subtle hint or just standard? Let's keep it standard for preview
                                                                    }
                                                                }

                                                                return (
                                                                    <div key={optIdx} className={`px-3 py-2 rounded text-sm border ${optionClass} flex items-center justify-between`}>
                                                                        <span>{opt}</span>
                                                                        {isResolved && optIdx === q.correctAnswer && <CheckCircle className="w-4 h-4 text-green-400" />}
                                                                        {isResolved && optIdx === userAnswerId && optIdx !== q.correctAnswer && <X className="w-4 h-4 text-red-400" />}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        {isResolved && !isCorrect && (
                                                            <div className="mt-3 pl-6 text-xs text-red-300">
                                                                <span className="font-bold">Explanation:</span> {q.explanation || "No explanation provided."}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 flex justify-end">
                        <NeonButton variant="secondary" onClick={onClose}>Close Report</NeonButton>
                    </div>
                </div>

            </NeonCard>
        </div>
    );
};
