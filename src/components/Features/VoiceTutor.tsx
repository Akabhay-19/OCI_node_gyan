
import React, { useState, useRef, useEffect } from 'react';
import { NeonCard, NeonButton } from '../UIComponents';
import { Mic, MicOff, Volume2, Activity, Zap, X, AlertTriangle } from 'lucide-react';

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
    const wsRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    useEffect(() => {
        return () => disconnect();
    }, []);

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
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
        console.log('[VoiceTutor] Starting connection to Backend Proxy...');

        try {
            // 1. Initialize Audio Contexts
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            if (inputCtx.state === 'suspended') await inputCtx.resume();
            if (outputCtx.state === 'suspended') await outputCtx.resume();

            inputContextRef.current = inputCtx;
            outputContextRef.current = outputCtx;

            // 2. Request Microphone Access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 3. Connect to Backend WebSocket Proxy
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = (import.meta as any).env.VITE_API_URL
                ? (import.meta as any).env.VITE_API_URL.replace(/^https?:\/\//, '')
                : window.location.host;

            // If development and port 5173, point to backend 5000
            const wsUrl = `${protocol}//${host.includes(':5173') ? host.replace(':5173', ':5000') : host}/gemini-stream`;

            console.log('[VoiceTutor] Connecting to:', wsUrl);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log("[VoiceTutor] ✅ Proxy connection opened!");
                setConnected(true);
                setStatus('LISTENING');

                // Setup Audio Processing Pipeline
                setupAudioPipeline();
            };

            ws.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleServerMessage(data);
                } catch (e) {
                    // Handle binary audio from Gemini if packaged differently, 
                    // but usually it's JSON with base64 audio
                }
            };

            ws.onclose = (e) => {
                console.log("[VoiceTutor] Proxy Closed:", e.code, e.reason);
                disconnect();
            };

            ws.onerror = (e) => {
                console.error("[VoiceTutor] Proxy Error:", e);
                setError("Connection failed. Check if backend is running.");
                disconnect();
            };

        } catch (err: any) {
            console.error("[VoiceTutor] ❌ Connection Failed:", err);
            setError(err.message || "Failed to connect.");
            disconnect();
        }
    };

    const setupAudioPipeline = () => {
        if (!inputContextRef.current || !streamRef.current || !wsRef.current) return;

        const inputCtx = inputContextRef.current;
        sourceRef.current = inputCtx.createMediaStreamSource(streamRef.current);
        processorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);

        processorRef.current.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);

            // Detect volume
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
            const rms = Math.sqrt(sum / inputData.length);
            if (rms > 0.05) {
                // console.log("Mic Input:", rms.toFixed(4));
            }

            const pcmBase64 = createPcmBase64(inputData);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: "audio/pcm;rate=16000",
                            data: pcmBase64
                        }]
                    }
                }));
            }
        };

        sourceRef.current.connect(processorRef.current);
        processorRef.current.connect(inputCtx.destination);
    };

    const handleServerMessage = async (msg: any) => {
        // 1. Handle Audio Response
        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
        if (base64Audio && outputContextRef.current) {
            setStatus('SPEAKING'); setIsSpeaking(true);
            const ctx = outputContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
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
            sourcesRef.current.forEach(s => s.stop()); sourcesRef.current.clear();
            nextStartTimeRef.current = 0; setIsSpeaking(false); setStatus('LISTENING');
        }

        // 3. Handle Tool Calls (Report Gaps)
        const toolCall = msg.serverContent?.modelTurn?.parts?.find((p: any) => p.functionCall);
        if (toolCall?.functionCall?.name === 'report_gaps') {
            const args = toolCall.functionCall.args as any;
            if (args.gaps) {
                setAnalysisReport(args.gaps);
                setShowReport(true);
            }
        }
    };

    function createPcmBase64(data: Float32Array): string {
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const s = Math.max(-1, Math.min(1, data[i]));
            int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        let binary = '';
        const bytes = new Uint8Array(int16.buffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    function decodeBase64(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return bytes;
    }

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
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
                    <div className="mb-8"><h2 className="text-4xl font-display font-bold text-white mb-2">AI Voice Tutor</h2><p className="text-gray-400">Secure real-time conversational learning.</p></div>
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
                                    <div className="text-center mt-10 space-y-4 text-gray-400">No specific learning gaps detected.</div>
                                ) : (
                                    analysisReport.map((gap, i) => (
                                        <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                            <div className="flex justify-between mb-2">
                                                <span className="font-bold text-white text-lg">{gap.topic}</span>
                                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">{gap.gapType}</span>
                                            </div>
                                            <p className="text-gray-300 text-sm">{gap.reason}</p>
                                            <div className="mt-2 text-neon-cyan text-sm">💡 {gap.recommendation}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </NeonCard>
        </div>
    );
};
