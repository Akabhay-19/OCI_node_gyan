import React, { useState, useEffect } from 'react';
import { API_URL } from '../services/api';
import { Sparkles, ChevronDown, Check, Zap } from 'lucide-react';

interface AIModel {
    id: string;
    name: string;
    provider: string;
    description: string;
    free?: boolean;
    recommended?: boolean;
}

interface ModelSelectorProps {
    onModelChange?: (model: string) => void;
    compact?: boolean;
}


export const ModelSelector: React.FC<ModelSelectorProps> = ({ onModelChange, compact = false }) => {
    const [models, setModels] = useState<AIModel[]>([]);
    const [currentModel, setCurrentModel] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showFreeOnly, setShowFreeOnly] = useState(false);

    useEffect(() => {
        fetchModels();
    }, [showFreeOnly]);

    const fetchModels = async () => {
        try {
            const url = showFreeOnly ? `${API_URL}/ai/models?free=true` : `${API_URL}/ai/models`;
            const res = await fetch(url);
            const data = await res.json();
            setModels(data.availableModels || []);
            setCurrentModel(data.currentModel || '');
        } catch (e) {
            console.error('Failed to fetch models:', e);
        }
    };

    const selectModel = async (modelId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/ai/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelId })
            });
            const data = await res.json();
            if (data.success) {
                setCurrentModel(modelId);
                onModelChange?.(modelId);
            }
        } catch (e) {
            console.error('Failed to set model:', e);
        } finally {
            setLoading(false);
            setIsOpen(false);
        }
    };

    const currentModelInfo = models.find(m => m.id === currentModel);
    const freeModels = models.filter(m => m.free);
    const paidModels = models.filter(m => !m.free);

    if (compact) {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-lg text-sm text-purple-300 hover:border-purple-400 transition-all"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="max-w-[100px] truncate">{currentModelInfo?.name || 'Select Model'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                        <div className="p-2 border-b border-slate-700">
                            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showFreeOnly}
                                    onChange={() => setShowFreeOnly(!showFreeOnly)}
                                    className="rounded bg-slate-800 border-slate-600"
                                />
                                <Zap className="w-3 h-3 text-green-400" />
                                Show free models only
                            </label>
                        </div>

                        {freeModels.length > 0 && (
                            <div className="p-2">
                                <div className="text-xs text-green-400 font-medium mb-1 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Free Models
                                </div>
                                {freeModels.map(model => (
                                    <ModelItem key={model.id} model={model} isSelected={currentModel === model.id} onSelect={selectModel} loading={loading} />
                                ))}
                            </div>
                        )}

                        {!showFreeOnly && paidModels.length > 0 && (
                            <div className="p-2 border-t border-slate-700">
                                <div className="text-xs text-purple-400 font-medium mb-1">Premium Models</div>
                                {paidModels.map(model => (
                                    <ModelItem key={model.id} model={model} isSelected={currentModel === model.id} onSelect={selectModel} loading={loading} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">AI Model</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showFreeOnly}
                        onChange={() => setShowFreeOnly(!showFreeOnly)}
                        className="rounded bg-slate-800 border-slate-600"
                    />
                    <Zap className="w-3 h-3 text-green-400" />
                    Free only
                </label>
            </div>

            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-left hover:border-purple-500/50 transition-all"
                >
                    <div>
                        <div className="font-medium text-white flex items-center gap-2">
                            {currentModelInfo?.name || 'Select a model'}
                            {currentModelInfo?.free && <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">FREE</span>}
                        </div>
                        <div className="text-xs text-slate-400">{currentModelInfo?.provider} • {currentModelInfo?.description}</div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                        {freeModels.length > 0 && (
                            <div className="p-2">
                                <div className="text-xs text-green-400 font-medium mb-1 px-2 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Free Models ({freeModels.length})
                                </div>
                                {freeModels.map(model => (
                                    <ModelItem key={model.id} model={model} isSelected={currentModel === model.id} onSelect={selectModel} loading={loading} />
                                ))}
                            </div>
                        )}

                        {!showFreeOnly && paidModels.length > 0 && (
                            <div className="p-2 border-t border-slate-700">
                                <div className="text-xs text-purple-400 font-medium mb-1 px-2">Premium Models ({paidModels.length})</div>
                                {paidModels.map(model => (
                                    <ModelItem key={model.id} model={model} isSelected={currentModel === model.id} onSelect={selectModel} loading={loading} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ModelItem: React.FC<{ model: AIModel; isSelected: boolean; onSelect: (id: string) => void; loading: boolean }> = ({ model, isSelected, onSelect, loading }) => (
    <button
        onClick={() => onSelect(model.id)}
        disabled={loading}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${isSelected ? 'bg-purple-500/20 border border-purple-500/50' : 'hover:bg-slate-800'
            }`}
    >
        <div>
            <div className="text-sm font-medium text-white flex items-center gap-2">
                {model.name}
                {model.free && <span className="text-[10px] bg-green-500/20 text-green-400 px-1 py-0.5 rounded">FREE</span>}
                {model.recommended && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1 py-0.5 rounded">⭐</span>}
            </div>
            <div className="text-xs text-slate-500">{model.description}</div>
        </div>
        {isSelected && <Check className="w-4 h-4 text-purple-400" />}
    </button>
);

export default ModelSelector;
