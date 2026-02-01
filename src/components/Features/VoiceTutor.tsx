
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { NeonCard, NeonButton } from '../UIComponents';
import { Mic, MicOff, Volume2, Activity, Zap, Radio, X, AlertTriangle, FileText } from 'lucide-react';
import { gapDetector } from '../../services/engine/GapDetector'; // (Placeholder for future engine integration)
import { GapType } from '../../services/engine/types';

interface DetectedGapReport {
    topic: string;
    gapType: string;
    reason: string;
    recommendation: string;
}

interface VoiceTutorProps {
    onClose?: () => void;
    contextClass?: { grade: string; subject: string };
}



export const VoiceTutor: React.FC<VoiceTutorProps> = ({ onClose, contextClass }) => {
    const [connected, setConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [status, setStatus] = useState<'IDLE' | 'CONNECTING' | 'LISTENING' | 'SPEAKING'>('IDLE');
    const [error, setError] = useState<string | null>(null);

    // Analysis State
    const [analysisReport, setAnalysisReport] = useState<DetectedGapReport[]>([]);
    const [showReport, setShowReport] = useState(false);

    const inputContextRef = useRef<AudioContext | null>(null);
    const outputContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    useEffect(() => {
        return () => disconnect();
    }, []);

    const disconnect = () => {
        if (sessionRef.current && typeof sessionRef.current.close === 'function') {
            try { sessionRef.current.close(); } catch (e) { console.error("Error closing session:", e); }
            sessionRef.current = null;
        }
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (inputContextRef.current) { inputContextRef.current.close(); inputContextRef.current = null; }
        if (outputContextRef.current) { outputContextRef.current.close(); outputContextRef.current = null; }
        setConnected(false); setStatus('IDLE'); setIsSpeaking(false);
    };

    const connect = async () => {
        setError(null); setStatus('CONNECTING');
        console.log('[VoiceTutor] Starting connection...');

        try {
            const apiKey = (import.meta as any).env.VITE_GEMINI_AUDIO_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
            console.log('[VoiceTutor] API Key check:', apiKey ? 'API Key found' : 'API Key MISSING');
            if (!apiKey) throw new Error("API Key missing. Please set VITE_GEMINI_AUDIO_API_KEY or VITE_GEMINI_API_KEY.");

            // 1. Initialize Audio Contexts (Synchronous within user gesture)
            console.log('[VoiceTutor] Creating Audio Contexts...');
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            // Resume immediately to handle autoplay policies
            if (inputCtx.state === 'suspended') await inputCtx.resume();
            if (outputCtx.state === 'suspended') await outputCtx.resume();

            inputContextRef.current = inputCtx;
            outputContextRef.current = outputCtx;

            // 2. Request Microphone Access (Before Websocket)
            console.log('[VoiceTutor] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            console.log('[VoiceTutor] ✅ Microphone access granted!');

            if (inputContextRef.current) console.log('[VoiceTutor] Input Context State:', inputContextRef.current.state);
            if (outputContextRef.current) console.log('[VoiceTutor] Output Context State:', outputContextRef.current.state);

            console.log('[VoiceTutor] Initializing Google GenAI...');
            const ai = new GoogleGenAI({ apiKey });

            console.log('[VoiceTutor] Connecting to Gemini Live API...');

            // Fetch configuration first
            let modelId = 'gemini-2.0-flash-exp';
            try {
                const API_URL = (import.meta as any).env.VITE_API_URL ||
                    ((import.meta as any).env.PROD ? '/api' : 'http://localhost:5000/api');
                const res = await fetch(`${API_URL}/ai/config`);
                if (res.ok) {
                    const config = await res.json();
                    if (config.currentAudioModel) {
                        modelId = config.currentAudioModel;
                        console.log('[VoiceTutor] Using configured Audio Model:', modelId);
                    }
                }
            } catch (e) {
                console.warn('[VoiceTutor] Failed to fetch config, using default model', e);
            }

            const sessionPromise = ai.live.connect({
                model: modelId,
                config: {
                    responseModalities: [Modality.AUDIO],
                    // speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                    systemInstruction: {
                        parts: [{ text: `You are a friendly AI tutor ${contextClass ? `for a ${contextClass.grade} student studying ${contextClass.subject}` : ''}. Engage the student in conversation to check their understanding. You can speak/respond in Hinglish (Hindi + English mix) if the student prefers or speaks in it. \n\nIMPORTANT: If you detect the student clearly misunderstands a concept, or is struggling, or at the END of the conversation, you MUST call the 'report_gaps' tool with a summary of the gaps. \n\nDo not just say goodbye, always report gaps if any found.` }]
                    },
                    tools: [{
                        functionDeclarations: [{
                            name: "report_gaps",
                            description: "Report learning gaps detected during the conversation.",
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    gaps: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                topic: { type: Type.STRING, description: "The concept the student is struggling with" },
                                                gapType: { type: Type.STRING, enum: ["CONCEPTUAL", "PREREQUISITE", "APPLICATION"], description: "Type of gap" },
                                                reason: { type: Type.STRING, description: "Why you think this is a gap based on their response" },
                                                recommendation: { type: Type.STRING, description: "What they should do to fix it" }
                                            },
                                            required: ["topic", "gapType", "reason", "recommendation"]
                                        }
                                    }
                                },
                                required: ["gaps"]
                            }
                        }]
                    }]
                },
                callbacks: {
                    onopen: async () => {
                        console.log("[VoiceTutor] ✅ Gemini Live Session Opened Successfully!");
                        setConnected(true); setStatus('LISTENING');

                        // Setup Audio Processing Pipeline
                        if (!inputContextRef.current || !streamRef.current) return;

                        try {
                            const inputCtx = inputContextRef.current;
                            sourceRef.current = inputCtx.createMediaStreamSource(streamRef.current);
                            processorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);

                            processorRef.current.onaudioprocess = (e) => {
                                const inputData = e.inputBuffer.getChannelData(0);

                                // Optional: Detect volume to confirm mic is working
                                let sum = 0;
                                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                                const rms = Math.sqrt(sum / inputData.length);
                                if (rms > 0.01) {
                                    if (rms > 0.05) console.log("Mic Input Detected, RMS:", rms.toFixed(4));
                                }

                                const pcmBlob = createBlob(inputData);

                                sessionPromise.then(session => {
                                    if (sessionRef.current && sessionRef.current === session && (status === 'LISTENING' || status === 'SPEAKING')) {
                                        try {
                                            if (typeof (session as any).sendRealtimeInput === 'function') {
                                                (session as any).sendRealtimeInput([{
                                                    mimeType: "audio/pcm;rate=16000",
                                                    data: pcmBlob.data // Correct usage: createBlob returns {data:base64, mimeType}
                                                }]);
                                            }
                                        } catch (sendErr) {
                                            // Silent fail
                                        }
                                    }
                                });
                            };

                            sourceRef.current.connect(processorRef.current);
                            processorRef.current.connect(inputCtx.destination);

                        } catch (pipelineErr) {
                            console.error("[VoiceTutor] Audio Pipeline Error:", pipelineErr);
                            setError("Audio processing failed.");
                        }
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // 1. Handle Audio
                        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputContextRef.current) {
                            setStatus('SPEAKING'); setIsSpeaking(true);
                            const ctx = outputContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                            const source = ctx.createBufferSource(); source.buffer = audioBuffer; source.connect(ctx.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) { setIsSpeaking(false); setStatus('LISTENING'); }
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }

                        // 2. Handle Interruption
                        if (msg.serverContent?.interrupted) {
                            console.log("[VoiceTutor] Interruption Detected");
                            sourcesRef.current.forEach(s => s.stop()); sourcesRef.current.clear();
                            nextStartTimeRef.current = 0; setIsSpeaking(false); setStatus('LISTENING');
                        }

                        // 3. Handle Tool Calls
                        const toolCall = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.functionCall);
                        if (toolCall && toolCall.functionCall && toolCall.functionCall.name === 'report_gaps') {
                            console.log("[VoiceTutor] Gap Report Received:", toolCall.functionCall.args);
                            const args = toolCall.functionCall.args as any;
                            if (args.gaps && Array.isArray(args.gaps)) {
                                setAnalysisReport(args.gaps);
                                setShowReport(true);
                            }
                        }
                    },
                    onclose: (event: any) => {
                        console.log("[VoiceTutor] Session Closed", event);
                        console.log("[VoiceTutor] Close Code:", event?.code, "Reason:", event?.reason);
                        if (connected) disconnect();
                    },
                    onerror: (e) => {
                        console.error("[VoiceTutor] ❌ Session Error:", e);
                        setError(`Connection failed: ${e?.message || 'Check connection'}`);
                        disconnect();
                    }
                }
            });



            const session = await sessionPromise;
            sessionRef.current = session;
            console.log('[VoiceTutor] ✅ Session established!');

            // Send initial greeting to kickstart the conversation
            if (typeof (session as any).sendRealtimeInput === 'function') {
                setTimeout(() => {
                    console.log('[VoiceTutor] Sending initial greeting...');
                    (session as any).sendRealtimeInput([{
                        mimeType: "text/plain",
                        data: "Hello! Please introduce yourself briefly to the student."
                    }]);
                }, 1000); // 1s delay to ensure connection is stable
            }

        } catch (err: any) {
            console.error("[VoiceTutor] ❌ Connection Failed:", err);
            setError(err.message || "Failed to connect. Please check settings.");
            disconnect();
        }
    };

    function createBlob(data: Float32Array): { data: string, mimeType: string } {
        const l = data.length; const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) { const s = Math.max(-1, Math.min(1, data[i])); int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
        return { data: arrayBufferToBase64(int16.buffer), mimeType: 'audio/pcm;rate=16000' };
    }
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = ''; const bytes = new Uint8Array(buffer); const len = bytes.byteLength;
        for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }
    function decode(base64: string): Uint8Array {
        const binaryString = atob(base64); const len = binaryString.length; const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }
    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer); const frameCount = dataInt16.length / numChannels; const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
        return buffer;
    }

    return (
        <div className="max-w-3xl mx-auto relative">
            {onClose && (
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-gray-300 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            )}
            <NeonCard glowColor={connected ? "cyan" : "purple"} className="min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden">
                {connected && <div className="absolute inset-0 z-0"><div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[100px] transition-all duration-500 ${isSpeaking ? 'bg-neon-cyan/30 scale-125' : 'bg-neon-purple/20 scale-100'}`}></div></div>}
                <div className="relative z-10 text-center space-y-8">
                    <div className="mb-8"><h2 className="text-4xl font-display font-bold text-white mb-2">AI Voice Tutor</h2><p className="text-gray-400">Real-time conversational learning powered by Gemini Native Audio.</p></div>
                    <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center transition-all duration-500 relative ${connected ? (isSpeaking ? 'border-neon-cyan shadow-[0_0_50px_rgba(6,182,212,0.6)]' : 'border-neon-purple shadow-[0_0_30px_rgba(188,19,254,0.4)]') : 'border-gray-700 bg-black/40'}`}>
                        {connected ? (<div className="space-y-2">{isSpeaking ? <Volume2 className="w-16 h-16 text-neon-cyan animate-pulse mx-auto" /> : <Mic className="w-16 h-16 text-neon-purple animate-bounce mx-auto" />}<p className={`text-xs font-bold uppercase tracking-widest ${isSpeaking ? 'text-neon-cyan' : 'text-neon-purple'}`}>{isSpeaking ? 'Speaking' : 'Listening'}</p></div>) : (<Zap className="w-16 h-16 text-gray-600" />)}
                    </div>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm max-w-md mx-auto flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <div className="text-left">{error}</div>
                        </div>
                    )}
                    <div className="flex justify-center gap-4">
                        {!connected ? <NeonButton onClick={connect} glow variant="primary" className="!px-8 !py-4 text-lg" disabled={status === 'CONNECTING'}>{status === 'CONNECTING' ? 'Connecting...' : 'Start Session'}</NeonButton> : <NeonButton onClick={disconnect} variant="danger" className="!px-8 !py-4 text-lg"><MicOff className="w-5 h-5 mr-2" /> End Session</NeonButton>}
                    </div>

                    {/* Analysis Report Overlay */}
                    {showReport && (
                        <div className="absolute inset-0 bg-black/95 z-20 p-6 flex flex-col animate-in fade-in text-left">
                            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-neon-cyan" /> Voice Analysis Report
                                </h3>
                                <button onClick={() => setShowReport(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {analysisReport.length === 0 ? (
                                    <div className="text-center mt-10 space-y-4">
                                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-400"><Zap className="w-8 h-8" /></div>
                                        <p className="text-gray-400">Great job! No specific learning gaps detected in this session.</p>
                                    </div>
                                ) : (
                                    analysisReport.map((gap, i) => (
                                        <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-bold text-white text-lg">{gap.topic}</span>
                                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">{gap.gapType}</span>
                                            </div>
                                            <p className="text-gray-300 text-sm mb-3">"{gap.reason}"</p>
                                            <div className="flex items-center gap-2 text-neon-cyan text-sm font-medium p-2 bg-cyan-500/10 rounded-lg">
                                                <Zap className="w-4 h-4" /> Recommendation: {gap.recommendation}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                <NeonButton variant="primary" onClick={() => setShowReport(false)}>Continue Learning</NeonButton>
                            </div>
                        </div>
                    )}
                </div>
            </NeonCard>
        </div>
    );
};
