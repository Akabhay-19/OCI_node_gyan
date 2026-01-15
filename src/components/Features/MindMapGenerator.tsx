
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { api, DEFAULT_MODEL } from '../../services/api';
import MindMapGraph from './MindMapGraph';
import { MindMapData } from './types';
import {
    BookOpen,
    Download,
    Share2,
    Maximize2,
    Plus,
    Minus,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Sparkles,
    FileUp,
    Info,
    Circle,
    ArrowRight,
    XCircle,
    Menu,
    History
} from 'lucide-react';
import { NeonCard, NeonButton } from '../UIComponents';
import { HistorySidebar } from './HistorySidebar';

const MindMapGenerator: React.FC<{ studentId?: string; contextClass?: any }> = ({ studentId, contextClass }) => {
    const [loading, setLoading] = useState(false);
    const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);


    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);
        setMindMapData(null);
        setSelectedNode(null);

        try {
            // Use backend API directly with the File object
            const data = await api.generateMindMap(
                file,
                'file',
                undefined,
                contextClass ? { grade: contextClass.grade, subject: contextClass.subject } : undefined
            );
            setMindMapData(data);
        } catch (err: any) {
            setError(err.message || "Failed to generate. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-full w-full text-[#e8eaed] overflow-hidden selection:bg-blue-500/30 font-sans relative bg-[#050510]">

            {/* Background Layer - Contained */}
            <div className="absolute inset-0 bg-[#050510]/50 -z-20"></div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(circle_at_center,black_70%,transparent)] -z-10"></div>

            {/* Sidebar - Knowledge Insights */}
            <aside className={`w-full md:w-[350px] border-r border-white/10 glass-panel flex flex-col transition-all duration-700 ease-in-out z-20 ${!mindMapData && !loading ? '-translate-x-full absolute h-full' : 'translate-x-0 relative h-full'} bg-[#0a0a16]/80 backdrop-blur-xl`}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">Intelligence Panel</h2>
                            <p className="text-[9px] text-blue-400/60 uppercase tracking-widest font-bold">PDF Context</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {selectedNode ? (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[9px] font-bold text-blue-400 uppercase tracking-widest border border-blue-500/30">Active Node</span>
                            </div>
                            <h3 className="text-2xl font-bold mb-4 text-white leading-tight">
                                {selectedNode.label}
                            </h3>
                            <div className="space-y-4">
                                <div className="text-gray-400 text-sm leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex, rehypeRaw]}
                                    >
                                        {selectedNode.summary}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 px-4">
                            <Sparkles className="w-10 h-10 text-blue-500/40 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Select a Node</p>
                            <p className="text-sm text-gray-400">Click on any node in the graph to view details extracted from your PDF.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Graph Area */}
            <main className="flex-1 relative flex flex-col bg-transparent overflow-hidden h-full">
                {/* Navigation Overlay - Visible only when data exists */}
                {mindMapData && (
                    <header className="absolute top-0 left-0 right-0 p-6 z-30 pointer-events-none flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
                        <div className="pointer-events-auto flex items-center gap-4">
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight">
                                    {mindMapData.title}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-[10px] uppercase tracking-widest text-white/50">Interactive Mode</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pointer-events-auto">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/60 hover:text-white" title="Fit to Screen"><Maximize2 className="w-4 h-4" /></button>
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/60 hover:text-white" title="Download PDF"><Download className="w-4 h-4" /></button>
                        </div>
                    </header>
                )}

                {!mindMapData && !loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
                        <div className="max-w-xl animate-in zoom-in-95 duration-500">
                            <div className="mb-8 relative inline-block">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                                <FileUp className="w-20 h-20 text-blue-400 relative z-10" />
                            </div>

                            <h2 className="text-3xl font-bold text-white mb-3">Mind Map Generator</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                Upload a PDF document to automatically generate an interactive 3D knowledge graph.
                            </p>

                            {/* UPLOAD SECTION - SIMPLIFIED */}
                            <div className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">


                                <label className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-all shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5">
                                    <FileUp className="w-5 h-5" />
                                    <span>Upload PDF Document</span>
                                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                                </label>
                                <p className="text-[10px] text-gray-500">Supported formats: .pdf (Max 10MB)</p>
                            </div>

                            {error && (
                                <div className="mt-6 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl flex items-center gap-3 text-left">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                                    <span className="text-red-400 text-sm">{error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center z-10">
                        <div className="relative mb-8">
                            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Analyzing Document...</h3>
                        <p className="text-sm text-gray-400">Extracting concepts and relationships</p>
                    </div>
                ) : (
                    <div className="flex-1 relative h-full">
                        <MindMapGraph data={mindMapData!} onNodeClick={setSelectedNode} />

                        {/* Interactive Controls */}
                        <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-auto z-30">
                            <div className="flex flex-col bg-black/60 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                                <button className="p-3 hover:bg-white/10 transition-colors" title="Zoom In"><Plus className="w-4 h-4 text-white" /></button>
                                <div className="h-px bg-white/10 mx-2"></div>
                                <button className="p-3 hover:bg-white/10 transition-colors" title="Zoom Out"><Minus className="w-4 h-4 text-white" /></button>
                            </div>
                            <button
                                className="p-3 bg-black/60 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/60 hover:text-white"
                                onClick={() => window.location.reload()}
                                title="Reset"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* History Sidebar Floating integration - Responsive Drawer */}
            {studentId && !mindMapData && !loading && (
                <>
                    {/* Desktop Floating Card */}
                    <div className="hidden md:block absolute left-6 top-6 z-40">
                        <NeonCard glowColor="cyan" className="p-2 border-white/10 bg-black/40 backdrop-blur-md">
                            <HistorySidebar
                                studentId={studentId}
                                type="MINDMAP"
                                onSelect={(item) => console.log('Selected history:', item)}
                                className="max-h-[300px] w-[250px]"
                                contextClass={contextClass}
                            />
                        </NeonCard>
                    </div>

                    {/* Mobile Toggle & Drawer */}
                    <div className="md:hidden absolute left-4 top-4 z-40">
                        <NeonButton onClick={() => setShowHistory(true)} variant="secondary" size="sm">
                            <Menu className="w-4 h-4 mr-2" /> History
                        </NeonButton>
                    </div>

                    {showHistory && (
                        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200 md:hidden">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
                            <div className="relative w-80 h-full bg-[#0a0a0a] border-r border-white/10 shadow-2xl animate-in slide-in-from-left duration-300">
                                <div className="p-4 flex justify-between items-center border-b border-white/10 bg-white/5">
                                    <h3 className="font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-neon-purple" /> History</h3>
                                    <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white transition-colors">
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="h-[calc(100%-60px)] overflow-hidden">
                                    <HistorySidebar
                                        studentId={studentId}
                                        type="MINDMAP"
                                        onSelect={(item) => {
                                            console.log('Selected history:', item);
                                            setShowHistory(false);
                                        }}
                                        className="h-full border-none bg-transparent"
                                        contextClass={contextClass}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export { MindMapGenerator };
