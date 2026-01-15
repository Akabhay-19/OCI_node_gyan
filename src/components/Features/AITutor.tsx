
import React, { useState, useRef, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { MessageCircle, Send, Bot, User, Sparkles, Loader2, Lightbulb, BookOpen } from 'lucide-react';
import { api } from '../../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const QUICK_QUESTIONS = [
    "What is the difference between 'has' and 'have'?",
    "Explain Present Perfect tense",
    "When to use 'a' vs 'an'?",
    "How to form passive voice?",
    "What are modal verbs?",
];

interface AITutorProps {
    initialMessage?: string;
}

export const AITutor: React.FC<AITutorProps> = ({ initialMessage }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "👋 Hello! I'm your AI English tutor. Ask me anything about English grammar, tenses, vocabulary, or translation. I'll help you understand with clear explanations and examples! 📚",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (initialMessage) {
            handleSend(initialMessage);
        }
    }, [initialMessage]);

    const handleSend = async (customMessage?: string) => {
        const messageToSend = customMessage || input.trim();
        if (!messageToSend || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: messageToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.askTutor(messageToSend, 'English Grammar Learning');
            const assistantMessage: Message = {
                role: 'assistant',
                content: res.response,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: Message = {
                role: 'assistant',
                content: "Sorry, I couldn't process that request. Please try again! 🔄",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 px-2 sm:px-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                            AI Tutor <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        </h2>
                        <p className="text-gray-400 text-xs sm:text-sm">Ask any English grammar doubt!</p>
                    </div>
                </div>
            </div>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2">
                {QUICK_QUESTIONS.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => handleSend(q)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs sm:text-sm text-gray-300 hover:text-white transition-all disabled:opacity-50"
                    >
                        <Lightbulb className="w-3 h-3 inline mr-1 text-yellow-400" /> {q}
                    </button>
                ))}
            </div>

            {/* Chat Area */}
            <NeonCard glowColor="purple" className="p-4 sm:p-6">
                <div className="h-[50vh] sm:h-[55vh] overflow-y-auto space-y-4 mb-4 pr-2">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] sm:max-w-[70%] p-3 sm:p-4 rounded-xl sm:rounded-2xl ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30'
                                    : 'bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20'
                                    }`}
                            >
                                <p className="text-sm sm:text-base text-white whitespace-pre-wrap leading-relaxed">
                                    {msg.content}
                                </p>
                                <div className="text-[10px] sm:text-xs text-gray-500 mt-2">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                                </div>
                            )}
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                            </div>
                            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 p-4 rounded-2xl">
                                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="flex gap-2 sm:gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask your doubt..."
                        className="flex-1 bg-black/40 border-2 border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={loading}
                    />
                    <NeonButton onClick={() => handleSend()} variant="primary" disabled={!input.trim() || loading}>
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </NeonButton>
                </div>
            </NeonCard>
        </div>
    );
};
