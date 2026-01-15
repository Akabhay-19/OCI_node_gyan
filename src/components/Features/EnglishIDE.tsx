
import React, { useState } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Play, Sparkles, AlertCircle, CheckCircle, Wand2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface EnglishIDEProps {
    onAskTutor?: (message: string) => void;
}

export const EnglishIDE: React.FC<EnglishIDEProps> = ({ onAskTutor }) => {
    const [code, setCode] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    const runAnalysis = async () => {
        if (!code.trim()) return;
        setAnalyzing(true);
        try {
            // Mocking the backend call for initial UI setup - will replace with api.analyzeEnglish(code)
            const result = await api.analyzeEnglish(code);
            setAnalysis(result);
        } catch (error) {
            console.error(error);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Editor Pane */}
            <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                <NeonCard className="flex-1 p-0 overflow-hidden flex flex-col border-gray-700 bg-[#1e1e1e]">
                    {/* Toolbar */}
                    <div className="bg-[#252526] p-2 flex items-center gap-2 border-b border-white/5">
                        <div className="flex gap-1.5 px-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                            <div className="w-3 h-3 rounded-full bg-green-500/50" />
                        </div>
                        <span className="text-xs text-gray-500 ml-2 font-mono">untitled.en</span>
                        <div className="flex-1" />
                        <button
                            onClick={runAnalysis}
                            disabled={analyzing}
                            className="text-xs bg-green-600/20 text-green-400 px-3 py-1 rounded hover:bg-green-600/30 flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {analyzing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            COMPILE (ANALYZE)
                        </button>
                    </div>

                    {/* Text Area with Line Numbers */}
                    <div className="flex-1 flex relative">
                        <div className="w-10 bg-[#1e1e1e] border-r border-white/5 text-gray-600 text-right pr-2 pt-4 font-mono text-sm select-none">
                            {code.split('\n').map((_, i) => (
                                <div key={i} className="leading-6">{i + 1}</div>
                            ))}
                        </div>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="flex-1 bg-[#1e1e1e] text-gray-300 p-4 font-mono text-base resize-none focus:outline-none leading-6"
                            placeholder="// Write your English text here...
// The AI 'Compiler' will check for grammar, tone, and style errors.

I goes to the market yesterday."
                            spellCheck={false}
                        />
                    </div>
                </NeonCard>

                {/* Problems / Terminal */}
                <NeonCard className="h-48 p-0 overflow-hidden flex flex-col bg-[#1e1e1e]">
                    <div className="bg-[#252526] px-4 py-1 flex gap-6 text-xs font-bold border-b border-white/5">
                        <span className="text-white border-b-2 border-blue-500 py-1">PROBLEMS {analysis?.errors?.length ? `(${analysis.errors.length})` : ''}</span>
                        <span className="text-gray-500 py-1 hover:text-gray-300 cursor-pointer">OUTPUT</span>
                        <span className="text-gray-500 py-1 hover:text-gray-300 cursor-pointer">DEBUG CONSOLE</span>
                    </div>
                    <div className="p-4 font-mono text-sm text-gray-400 overflow-y-auto">
                        {!analysis ? (
                            <p className="opacity-50">Ready to analyze. Press Compile.</p>
                        ) : analysis.errors && analysis.errors.length > 0 ? (
                            <ul className="space-y-2">
                                {analysis.errors.map((err: any, idx: number) => (
                                    <li key={idx} className="flex gap-2 text-red-400">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <p className="font-medium text-red-200">Line {err.line}: {err.message}</p>
                                            <p className="text-gray-400 text-sm mt-1">Suggestion: <span className="text-green-400">{err.suggestion}</span></p>
                                        </div>
                                        {onAskTutor && (
                                            <NeonButton
                                                onClick={() => onAskTutor(`I have an error in my English code: "${err.message}". The text is: "${code.split('\n')[err.line - 1] || code}". How do I fix it?`)}
                                                variant="secondary"
                                                size="sm"
                                                className="!py-1 !px-2 text-xs"
                                            >
                                                Ask Tutor
                                            </NeonButton>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-green-400 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> No problems found. Build successful.
                            </div>
                        )}
                    </div>
                </NeonCard>
            </div>

            {/* Sidebar Tools */}
            <div className="flex flex-col gap-6">
                <NeonCard className="flex-1 p-4 bg-[#252526] border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" /> AI Refactoring
                    </h3>

                    {analysis?.score && (
                        <div className="mb-6 space-y-4">
                            <div>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">CEFR Level</span>
                                    <span className="text-white font-bold">{analysis.cefrLevel}</span>
                                </div>
                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        style={{ width: `${(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(analysis.cefrLevel) + 1) / 6 * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-black/20 p-2 rounded border border-white/5">
                                    <div className="text-xs text-gray-500">Tone</div>
                                    <div className="text-sm text-blue-300">{analysis.tone}</div>
                                </div>
                                <div className="bg-black/20 p-2 rounded border border-white/5">
                                    <div className="text-xs text-gray-500">Readability</div>
                                    <div className="text-sm text-green-300">{analysis.readability}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <p className="text-xs text-gray-500 mb-2">Quick Actions</p>
                        <button className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-300 flex items-center gap-2 transition-colors">
                            <Wand2 className="w-3 h-3 text-purple-400" /> Refactor to Formal Tone
                        </button>
                        <button className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-300 flex items-center gap-2 transition-colors">
                            <Wand2 className="w-3 h-3 text-blue-400" /> Expnad Vacabulary
                        </button>
                    </div>
                </NeonCard>
            </div>
        </div>
    );
};
