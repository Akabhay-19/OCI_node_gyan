import React, { useState } from 'react';
import { NeonCard, NeonButton, Input } from '../UIComponents';
import { Sparkles, BookOpen, ArrowLeft, Download, FileText, Search, Filter, PlayCircle, File, History, Clock, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { api } from '../../services/api'; // Ensure you have this or use fetch directly

// Mock Data for School Library
const SCHOOL_RESOURCES = [
    { id: '1', title: 'Calculus Fundamentals', type: 'PDF', subject: 'Math', grade: 'Grade 12', size: '2.4 MB' },
    { id: '2', title: 'Organic Chemistry Basics', type: 'PPT', subject: 'Chemistry', grade: 'Grade 11', size: '5.1 MB' },
    { id: '3', title: 'Shakespearean Tragedy Analysis', type: 'DOC', subject: 'English', grade: 'Grade 10', size: '1.2 MB' },
    { id: '4', title: 'World War II Detailed Timeline', type: 'PDF', subject: 'History', grade: 'Grade 9', size: '3.5 MB' },
    { id: '5', title: 'Physics: Laws of Motion', type: 'VIDEO', subject: 'Physics', grade: 'Grade 11', size: '150 MB' },
];

export const TeacherContentHub: React.FC<{ currentUser?: any; schoolName?: string; schoolLogo?: string }> = ({ currentUser, schoolName, schoolLogo }) => {
    const [viewMode, setViewMode] = useState<'HOME' | 'AI' | 'LIBRARY' | 'HISTORY' | 'PRESENTATION_GEN' | 'PRESENTATION_PREVIEW'>('HOME');

    // AI State
    const [topic, setTopic] = useState('');
    const [gradeLevel, setGradeLevel] = useState('Grade 10');
    const [subject, setSubject] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);

    // Presentation State
    const [presentationDescription, setPresentationDescription] = useState('');
    const [generatedSlides, setGeneratedSlides] = useState<any[]>([]);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Library State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const fetchHistory = async () => {
        if (!currentUser?.id) return;
        setIsLoadingHistory(true);
        try {
            const data = await api.getTeacherHistory(currentUser.id);
            setHistory(data);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleGenerate = async () => {
        if (!topic || !subject) return;
        setIsGenerating(true);
        try {
            // Using the raw fetch or api wrapper if available
            const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');

            const res = await fetch(`${API_URL}/teacher/lesson-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    subject,
                    gradeLevel,
                    duration: '60 minutes',
                    depth: 'Detailed',
                    teacherId: currentUser?.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedContent(data.markdown);
            } else {
                alert("Failed to generate lesson plan. Please try again.");
            }
        } catch (error) {
            console.error("Lesson Plan Error:", error);
            alert("An error occurred. Check your connection.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGeneratePresentation = async () => {
        if (!topic || !subject) return;
        setIsGenerating(true);
        try {
            const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.PROD ? '/api' : 'http://localhost:5000/api');

            const res = await fetch(`${API_URL}/teacher/presentation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    subject,
                    gradeLevel,
                    description: presentationDescription,
                    teacherId: currentUser?.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                setGeneratedSlides(data.slides);
                setCurrentSlideIndex(0);
                setViewMode('PRESENTATION_PREVIEW');
            } else {
                alert("Failed to generate presentation. Please try again.");
            }
        } catch (error) {
            console.error("Presentation Generation Error:", error);
            alert("An error occurred while building slides.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportPDF = () => {
        if (!generatedContent && (!generatedSlides || generatedSlides.length === 0)) return;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const isPresentation = viewMode === 'PRESENTATION_PREVIEW' || (generatedSlides && generatedSlides.length > 0 && !generatedContent);

            printWindow.document.write(`
                <html>
                <head>
                    <title>${isPresentation ? 'Presentation' : 'Lesson Plan'} - ${topic}</title>
                    <style>
                        body { 
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                            padding: 40px; 
                            line-height: 1.6; 
                            position: relative;
                            color: #1a1a1a;
                        }
                        h1 { color: #2c3e50; font-size: 2rem; border-left: 5px solid #3b82f6; padding-left: 15px; }
                        h2 { color: #34495e; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                        h3 { color: #4b5563; }
                        ul { margin-bottom: 20px; padding-left: 20px; }
                        li { margin-bottom: 8px; }
                        strong { color: #000; font-weight: 600; }
                        p { margin-bottom: 15px; }
                    </style>
                </head>
                <body>
                    <!-- Watermark -->
                    <div class="watermark">GYAN AI</div>

                    <!-- Header -->
                    <div class="header">
                        ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" />` : ''}
                        <div class="school-name">${schoolName || 'School Name'}</div>
                    </div>

                    <!-- Content -->
                    <h1>${topic}</h1>
                    <p style="color: #666; font-style: italic; margin-bottom: 30px;">
                        Subject: ${subject} | Grade: ${gradeLevel} | Generated by Gyan AI
                    </p>
                    
                    <div id="content">${document.querySelector('.prose')?.innerHTML || generatedContent}</div>
                    
                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <div className="w-full min-h-[80vh] flex flex-col space-y-6 p-1">

            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    {viewMode === 'HOME' && <><BookOpen className="w-8 h-8 text-neon-cyan" /> Content Hub</>}
                    {viewMode === 'AI' && <><Sparkles className="w-8 h-8 text-neon-purple" /> AI Lesson Generator</>}
                    {viewMode === 'LIBRARY' && <><FileText className="w-8 h-8 text-green-400" /> School Library</>}
                    {viewMode === 'HISTORY' && <><History className="w-8 h-8 text-blue-400" /> Lesson Plan History</>}
                </h2>
                {viewMode !== 'HOME' && (
                    <NeonButton variant="secondary" onClick={() => setViewMode('HOME')} size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
                    </NeonButton>
                )}
            </div>

            {/* MODE: HOME SELECTION */}
            {viewMode === 'HOME' && (
                <div className="space-y-8 mt-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* AI Lesson Generator Card */}
                        <NeonCard
                            onClick={() => setViewMode('AI')}
                            className="p-10 cursor-pointer hover:scale-[1.02] transition-transform group flex flex-col items-center text-center gap-6 min-h-[350px] justify-center"
                            glowColor="purple"
                        >
                            <div className="w-24 h-24 rounded-full bg-neon-purple/20 flex items-center justify-center group-hover:bg-neon-purple/30 transition-colors">
                                <Sparkles className="w-12 h-12 text-neon-purple" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">AI Lesson Generator</h3>
                                <p className="text-gray-400">Create comprehensive lesson plans, activities, and notes instantly tailored to your topic.</p>
                            </div>
                            <NeonButton className="mt-4">Start Generating</NeonButton>
                        </NeonCard>

                        {/* School Content Card */}
                        <NeonCard
                            onClick={() => setViewMode('LIBRARY')}
                            className="p-10 cursor-pointer hover:scale-[1.02] transition-transform group flex flex-col items-center text-center gap-6 min-h-[350px] justify-center"
                            glowColor="green"
                        >
                            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                                <BookOpen className="w-12 h-12 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">School Library</h3>
                                <p className="text-gray-400">Access approved curriculum resources, textbooks, and multimedia provided by the school.</p>
                            </div>
                            <NeonButton variant="secondary" className="mt-4">Browse Library</NeonButton>
                        </NeonCard>

                        {/* AI Presentation Generator Card */}
                        <NeonCard
                            onClick={() => setViewMode('PRESENTATION_GEN')}
                            className="p-10 cursor-pointer hover:scale-[1.02] transition-transform group flex flex-col items-center text-center gap-6 min-h-[350px] justify-center"
                            glowColor="purple"
                        >
                            <div className="w-24 h-24 rounded-full bg-pink-500/20 flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                                <PlayCircle className="w-12 h-12 text-pink-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Presentation Generator</h3>
                                <p className="text-gray-400">Generate stunning, slide-based presentations for any topic with pedagogical insights.</p>
                            </div>
                            <NeonButton variant="secondary" className="mt-4">Build Presentation</NeonButton>
                        </NeonCard>

                        {/* Recent History Card */}
                        <NeonCard
                            onClick={() => {
                                fetchHistory();
                                setViewMode('HISTORY');
                            }}
                            className="p-10 cursor-pointer hover:scale-[1.02] transition-transform group flex flex-col items-center text-center gap-6 min-h-[350px] justify-center"
                            glowColor="cyan"
                        >
                            <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                <History className="w-12 h-12 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Recent History</h3>
                                <p className="text-gray-400">View and reuse your previously generated lesson plans and educational materials.</p>
                            </div>
                            <NeonButton variant="secondary" className="mt-4">View History</NeonButton>
                        </NeonCard>
                    </div>
                </div>
            )}

            {/* MODE: AI GENERATOR */}
            {viewMode === 'AI' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* Input Panel */}
                    <NeonCard className="lg:col-span-1 space-y-6 h-fit">
                        <h3 className="font-bold text-lg text-white border-b border-white/10 pb-2">Lesson Parameters</h3>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Subject</label>
                            <Input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g. Physics, History"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Topic</label>
                            <Input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Laws of Thermodynamics"
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-gray-400 mb-1 block">Grade Level</label>
                            <select
                                value={gradeLevel}
                                onChange={(e) => setGradeLevel(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:border-neon-purple outline-none"
                            >
                                {['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4">
                            <NeonButton
                                onClick={handleGenerate}
                                isLoading={isGenerating}
                                disabled={!topic || !subject}
                                className="w-full"
                                glow
                            >
                                {isGenerating ? 'Generating Plan...' : 'Generate Lesson Plan'}
                            </NeonButton>
                        </div>
                    </NeonCard>

                    {/* Output Panel */}
                    <NeonCard className="lg:col-span-2 h-[600px] relative">
                        <div className="flex flex-col h-full">
                            <div className="border-b border-white/10 pb-4 mb-4 flex justify-between items-center bg-inherit z-10 shrink-0">
                                <h3 className="font-bold text-lg text-white">Generated Content</h3>
                                {generatedContent && (
                                    <NeonButton size="sm" variant="secondary" onClick={handleExportPDF}>
                                        <Download className="w-4 h-4 mr-2" /> Export PDF
                                    </NeonButton>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 min-h-0">
                                {generatedContent ? (
                                    <div className="prose prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {generatedContent}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                                        <Sparkles className="w-16 h-16 mb-4" />
                                        <p>Enter details and click generate to create a lesson plan.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </NeonCard>
                </div>
            )}

            {/* MODE: SCHOOL LIBRARY */}
            {viewMode === 'LIBRARY' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/50 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white outline-none focus:border-neon-cyan"
                            />
                        </div>
                        <select
                            value={selectedSubjectFilter}
                            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                            className="bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white outline-none focus:border-neon-cyan"
                        >
                            <option value="All">All Subjects</option>
                            <option value="Math">Math</option>
                            <option value="Physics">Physics</option>
                            <option value="Chemistry">Chemistry</option>
                            <option value="English">English</option>
                            <option value="History">History</option>
                        </select>
                    </div>

                    {/* Resource List */}
                    <div className="h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar overscroll-contain pb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {SCHOOL_RESOURCES
                                .filter(r => selectedSubjectFilter === 'All' || r.subject === selectedSubjectFilter)
                                .filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(resource => (
                                    <NeonCard key={resource.id} className="p-4 group hover:bg-white/10 transition-colors cursor-pointer border-white/10">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                                                {resource.type === 'PDF' && <FileText className="w-6 h-6 text-red-400" />}
                                                {resource.type === 'PPT' && <File className="w-6 h-6 text-orange-400" />}
                                                {resource.type === 'DOC' && <FileText className="w-6 h-6 text-blue-400" />}
                                                {resource.type === 'VIDEO' && <PlayCircle className="w-6 h-6 text-purple-400" />}
                                            </div>
                                            <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">{resource.size}</span>
                                        </div>
                                        <h4 className="font-bold text-white mb-1 group-hover:text-neon-cyan transition-colors">{resource.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                            <span>{resource.subject}</span>
                                            <span>•</span>
                                            <span>{resource.grade}</span>
                                        </div>
                                        <NeonButton size="sm" variant="secondary" className="w-full">
                                            <Download className="w-4 h-4 mr-2" /> Download
                                        </NeonButton>
                                    </NeonCard>
                                ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODE: HISTORY */}
            {viewMode === 'HISTORY' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    {/* History Sidebar */}
                    <NeonCard className="lg:col-span-1 h-[600px] flex flex-col" glowColor="cyan">
                        <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                            <Clock className="w-5 h-5" /> Recent Generations
                        </h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 min-h-0">
                            {isLoadingHistory ? (
                                <div className="flex items-center justify-center h-40 text-gray-500">
                                    Loading history...
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">
                                    No history found.
                                </div>
                            ) : (
                                history.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (item.type === 'PRESENTATION') {
                                                const slides = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                                                setGeneratedSlides(slides);
                                                setCurrentSlideIndex(0);
                                                setGeneratedContent(null);
                                                setTopic(item.topic);
                                                setSubject(item.subject);
                                                setGradeLevel(item.gradeLevel);
                                                setViewMode('PRESENTATION_PREVIEW');
                                            } else {
                                                setGeneratedContent(item.content);
                                                setGeneratedSlides([]);
                                                setTopic(item.topic);
                                                setSubject(item.subject);
                                                setGradeLevel(item.gradeLevel);
                                            }
                                        }}
                                        className={`p-4 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-500/50 cursor-pointer transition-all flex justify-between items-center group/item ${topic === item.topic ? 'border-cyan-500 bg-cyan-500/10' : ''
                                            }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white truncate group-hover/item:text-cyan-400 transition-colors">{item.topic}</div>
                                            <div className="text-xs text-gray-400 flex justify-between mt-1">
                                                <span>{item.subject}</span>
                                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${topic === item.topic ? 'text-cyan-400 translate-x-1' : 'text-gray-600'}`} />
                                    </div>
                                ))
                            )}
                        </div>
                    </NeonCard>

                    {/* History Preview */}
                    <NeonCard className="lg:col-span-2 h-[600px] relative">
                        <div className="flex flex-col h-full">
                            <div className="border-b border-white/10 pb-4 mb-4 flex justify-between items-center bg-inherit z-10 shrink-0">
                                <h3 className="font-bold text-lg text-white">Generation Preview</h3>
                                {generatedContent && (
                                    <NeonButton size="sm" variant="secondary" onClick={handleExportPDF}>
                                        <Download className="w-4 h-4 mr-2" /> Export PDF
                                    </NeonButton>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 min-h-0">
                                {generatedContent ? (
                                    <div className="prose prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                        >
                                            {generatedContent}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                        <div className="mb-6 p-6 rounded-full bg-cyan-500/10">
                                            <History className="w-16 h-16 text-cyan-400/50" />
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-2">Saved generations</h4>
                                        <p className="text-gray-400 max-w-sm">
                                            Select a topic from the left sidebar to view the generated lesson plan and export it as a PDF.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </NeonCard>
                </div>
            )}

            {/* MODE: PRESENTATION GENERATOR */}
            {viewMode === 'PRESENTATION_GEN' && (
                <div className="max-w-4xl mx-auto space-y-8 mt-12">
                    <div className="flex items-center gap-4 mb-8">
                        <NeonButton variant="secondary" size="sm" onClick={() => setViewMode('HOME')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </NeonButton>
                        <h2 className="text-3xl font-bold text-white">Presentation Builder</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Topic / Title</label>
                                <Input
                                    placeholder="Enter presentation topic..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Subject</label>
                                <Input
                                    placeholder="e.g. Science, Literature..."
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Grade Level</label>
                                <select
                                    value={gradeLevel}
                                    onChange={(e) => setGradeLevel(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                                >
                                    {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                                        <option key={g} value={g} className="bg-gray-900">{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Key points to include</label>
                                <textarea
                                    placeholder="Describe specific sections or details you want in the slides..."
                                    value={presentationDescription}
                                    onChange={(e) => setPresentationDescription(e.target.value)}
                                    className="w-full h-40 bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12">
                        <NeonButton
                            size="lg"
                            glow
                            onClick={handleGeneratePresentation}
                            disabled={isGenerating || !topic || !subject}
                            className="px-12 py-6 text-xl"
                        >
                            {isGenerating ? (
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Designing Slides...
                                </div>
                            ) : 'Generate Presentation'}
                        </NeonButton>
                    </div>
                </div>
            )}

            {/* MODE: PRESENTATION PREVIEW */}
            {viewMode === 'PRESENTATION_PREVIEW' && (
                <div className="h-full flex flex-col gap-6 mt-4">
                    <div className="flex items-center justify-between">
                        <NeonButton variant="secondary" size="sm" onClick={() => setViewMode('PRESENTATION_GEN')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Editor
                        </NeonButton>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-400 text-sm">Slide {currentSlideIndex + 1} of {generatedSlides.length}</span>
                            <NeonButton size="sm" onClick={() => {
                                // Simple print/export logic or future feature
                                handleExportPDF(); // Re-use lesson plan export for now or create a better one
                            }}>
                                <Download className="w-4 h-4 mr-2" /> Export
                            </NeonButton>
                        </div>
                    </div>

                    <div className="flex-1 flex gap-6 min-h-0">
                        {/* Slide Thumbnails (Left) */}
                        <div className="w-64 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                            {generatedSlides.map((slide, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setCurrentSlideIndex(idx)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${currentSlideIndex === idx
                                        ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
                                        : 'border-white/10 bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="text-[10px] text-gray-500 mb-1">Slide {idx + 1}</div>
                                    <div className="flex gap-1">{/* Badges removed as not in Student type yet */}</div>
                                    <div className="text-xs font-bold text-white truncate">{slide.title}</div>
                                </div>
                            ))}
                        </div>

                        {/* Current Slide Display */}
                        <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 p-12 flex flex-col relative overflow-hidden group">
                            {/* Decorative Background Element */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />

                            <div className="relative z-10 flex flex-col h-full">
                                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-12">
                                    {generatedSlides[currentSlideIndex]?.title}
                                </h1>

                                <div className="flex-1">
                                    <ul className="space-y-6">
                                        {generatedSlides[currentSlideIndex]?.content.map((point: string, pIdx: number) => (
                                            <li key={pIdx} className="flex items-start gap-4 text-xl text-gray-200 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${pIdx * 100}ms` }}>
                                                <div className="w-2 h-2 rounded-full bg-pink-500 mt-3 flex-shrink-0 shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                                                <span>{point}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* AI Generated Image for Slide */}
                                    <div className="mt-8 rounded-xl overflow-hidden border border-white/10 bg-black/20 aspect-video relative group/img">
                                        <img
                                            src={`https://image.pollinations.ai/prompt/${encodeURIComponent(generatedSlides[currentSlideIndex]?.visualSuggestion || topic + ' educational diagram')}?width=1024&height=576&nologo=true&seed=${currentSlideIndex}`}
                                            alt={generatedSlides[currentSlideIndex]?.title}
                                            className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity"
                                            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                            <p className="text-xs text-pink-400 font-medium flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> AI Generated Visualization
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Suggestion Box */}
                                <div className="mt-auto p-6 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm">
                                    <div className="flex items-center gap-2 text-pink-400 font-bold mb-2">
                                        <Sparkles className="w-5 h-5" />
                                        Visual Tip for Teacher
                                    </div>
                                    <p className="text-sm text-gray-400 italic">
                                        {generatedSlides[currentSlideIndex]?.visualSuggestion}
                                    </p>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-sm text-gray-500 font-medium">
                                    <span>{generatedSlides[currentSlideIndex]?.footer}</span>
                                    <span>{schoolName || 'Gyan AI'}</span>
                                </div>
                            </div>

                            {/* Navigation Overlays */}
                            <button
                                onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
                                disabled={currentSlideIndex === 0}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/0 hover:bg-white/10 text-white/20 hover:text-white transition-all disabled:opacity-0"
                            >
                                <ArrowLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={() => setCurrentSlideIndex(Math.min(generatedSlides.length - 1, currentSlideIndex + 1))}
                                disabled={currentSlideIndex === generatedSlides.length - 1}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/0 hover:bg-white/10 text-white/20 hover:text-white transition-all disabled:opacity-0"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
