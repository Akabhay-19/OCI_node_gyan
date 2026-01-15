import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { NeonCard, NeonButton, Input } from '../UIComponents';
import { api, AI_MODELS, DEFAULT_MODEL } from '../../services/api';
import { Flashcard } from '../../types';
import { Sparkles, RotateCw, BookOpen, AlertCircle, ArrowLeft, ArrowRight, Menu, History, XCircle } from 'lucide-react';
import { HistorySidebar } from './HistorySidebar';

interface FlashcardGeneratorProps {
    studentId?: string;
    initialFlashcards?: Flashcard[];
    contextClass?: any;
}

export const FlashcardGenerator: React.FC<FlashcardGeneratorProps> = ({ studentId, initialFlashcards, contextClass }) => {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);



    React.useEffect(() => {
        if (initialFlashcards && initialFlashcards.length > 0) {
            setFlashcards(initialFlashcards);
            setCurrentIndex(0);
            setIsFlipped(false);
        }
    }, [initialFlashcards]);

    const handleHistorySelect = (item: any) => {
        if (item.content) {
            setFlashcards(item.content);
            setCurrentIndex(0);
            setIsFlipped(false);
            setShowHistory(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        setError(null);
        setFlashcards([]);
        setCurrentIndex(0);
        setIsFlipped(false);
        try {
            // Updated to use backend API
            const response = await api.generateFlashcards(
                topic,
                contextClass?.grade || 'Grade 10',
                8,
                studentId,
                contextClass?.id // Pass class context for history
            );
            // Verify structure, backend returns { flashcards: [...] }
            setFlashcards(response.flashcards || response);
        } catch (e: any) {
            setError(e.message || "Failed to generate flashcards.");
        } finally {
            setLoading(false);
        }
    };


    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(c => c + 1), 150);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(c => c - 1), 150);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up relative">
            {/* History Toggle Button */}
            <div className="absolute top-0 left-0">
                <NeonButton onClick={() => setShowHistory(true)} variant="secondary" size="sm">
                    <Menu className="w-4 h-4 mr-2" /> History
                </NeonButton>
            </div>

            {/* SIDEBAR DRAWER (Overlay) */}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowHistory(false)}
                    />
                    <div className="relative w-80 h-full bg-[#0a0a0a] border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
                        <div className="p-4 flex justify-between items-center border-b border-white/10 bg-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-neon-purple" /> Flashcard History</h3>
                            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white transition-colors">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="h-[calc(100%-60px)] overflow-hidden">
                            <HistorySidebar
                                studentId={studentId || ''}
                                type="FLASHCARDS"
                                onSelect={handleHistorySelect}
                                className="h-full border-none bg-transparent"
                                contextClass={contextClass}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center pt-8">
                <h2 className="text-3xl font-display font-bold mb-2">AI Flashcards</h2>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                    <p>Master any topic with instant smart cards</p>


                </div>
            </div>

            {/* Input Section */}
            <NeonCard className="p-6 md:p-8 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow w-full">
                    <Input
                        label="What do you want to learn?"
                        placeholder="e.g. Periodic Table Elements, French Verbs..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                </div>
                <NeonButton
                    onClick={handleGenerate}
                    disabled={loading || !topic}
                    glow
                    className="w-full md:w-auto h-12 flex items-center justify-center gap-2"
                >
                    {loading ? <RotateCw className="animate-spin" /> : <Sparkles size={18} />}
                    <span className="whitespace-nowrap">Generate Deck</span>
                </NeonButton>
            </NeonCard>

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle /> {error}
                </div>
            )}

            {/* Flashcard Display */}
            {flashcards.length > 0 && (
                <div className="relative h-[400px] w-full perspective-1000">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {/* Side Indicator */}
                        <div className="mb-4 text-center">
                            <span className={`text-xs font-bold tracking-[0.2em] uppercase ${isFlipped ? 'text-neon-purple' : 'text-neon-cyan'}`}>
                                {isFlipped ? 'Back Side' : 'Front Side'}
                            </span>
                        </div>

                        <div
                            className={`relative w-full max-w-xl h-80 transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            {/* Front */}
                            <div className="absolute inset-0 backface-hidden">
                                <NeonCard glowColor="blue" className="w-full h-full flex flex-col items-center justify-center p-8 text-center border-neon-cyan/30 bg-black/80 backdrop-blur-xl">
                                    <h3 className="text-2xl md:text-3xl font-bold text-white select-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                                            components={{
                                                p: ({ node, ...props }) => <span {...props} />,
                                            }}
                                        >
                                            {flashcards[currentIndex].front}
                                        </ReactMarkdown>
                                    </h3>
                                </NeonCard>
                            </div>

                            {/* Back */}
                            <div className="absolute inset-0 backface-hidden rotate-y-180">
                                <NeonCard glowColor="purple" className="w-full h-full flex flex-col items-center justify-center p-8 text-center border-neon-purple/30 bg-black/80 backdrop-blur-xl">
                                    <div className="text-xl text-gray-200 leading-relaxed select-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex, rehypeRaw]}
                                            components={{
                                                p: ({ node, ...props }) => <span {...props} />,
                                            }}
                                        >
                                            {flashcards[currentIndex].back}
                                        </ReactMarkdown>
                                    </div>
                                </NeonCard>
                            </div>
                        </div>

                        {/* Flip Instruction */}
                        <p className="mt-4 text-xs text-gray-500 flex items-center gap-2">
                            <RotateCw className="w-3 h-3" /> Click card to flip
                        </p>

                        {/* Controls */}
                        <div className="flex items-center gap-8 mt-6">
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <span className="text-lg font-bold font-mono text-neon-cyan">
                                {currentIndex + 1} / {flashcards.length}
                            </span>
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === flashcards.length - 1}
                                className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                            >
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!loading && flashcards.length === 0 && !error && (
                <div className="text-center py-20 opacity-50">
                    <BookOpen size={64} className="mx-auto mb-4 text-gray-600" />
                    <p>Enter a topic above to create your study set</p>
                </div>
            )}
        </div>
    );
};
