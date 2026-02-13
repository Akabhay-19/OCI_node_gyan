
import WebSocket from 'ws';

/**
 * Handles WebSocket upgrades for the Gemini Live Proxy.
 * Route: /gemini-stream
 */
export function handleGeminiStream(wss, req) {
    const apiKey = process.env.GEMINI_AUDIO_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("[GeminiProxy] No GEMINI_API_KEY found!");
        req.socket.destroy(); // Close connection
        return;
    }

    // Default Model Configuration
    // We can also parse query params from req.url if needed
    // Use the validated model (Flash 2.5 does NOT support bidi stream yet)
    // Use the user-specified native audio preview model
    const model = 'gemini-2.5-flash-native-audio-preview-12-2025';
    const host = 'generativelanguage.googleapis.com';
    const path = `/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const uri = `wss://${host}${path}`;

    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        console.log(`[GeminiProxy] Client connected. Proxying to ${model}...`);

        // Connect to Google Gemini
        const googleWs = new WebSocket(uri);

        // Buffer messages from client until Google is ready
        const messageQueue = [];

        googleWs.on('open', () => {
            console.log("[GeminiProxy] Connected to Google Gemini!");

            // Parse query params for context
            const url = new URL(req.url, `http://${req.headers.host}`);
            const grade = url.searchParams.get('grade') || 'Grade 10';
            const subject = url.searchParams.get('subject') || 'General Knowledge';

            const systemInstruction = `You are a friendly AI tutor for a ${grade} student studying ${subject}. Engage the student in conversation to check their understanding. 
            IMPORTANT: If you detect the student clearly misunderstands a concept, or is struggling, or at the END of the conversation, you MUST call the 'report_gaps' tool with a summary of the gaps. and also make these flexible as per the class level so that the result become student friendly and also try to make them the results short for lower class levels and professional and high level with good descriptions for the upper class levels`;

            // Send Initial Setup Message (Config)
            const setupMsg = {
                setup: {
                    model: `models/${model}`,
                    generation_config: {
                        response_modalities: ["AUDIO"],
                        speech_config: {
                            voice_config: { prebuilt_voice_config: { voice_name: "Puck" } }
                        }
                    },
                    system_instruction: {
                        parts: [{ text: systemInstruction }]
                    },
                    tools: [{
                        function_declarations: [{
                            name: "report_gaps",
                            description: "Report detected learning gaps to the system.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    gaps: {
                                        type: "ARRAY",
                                        items: {
                                            type: "OBJECT",
                                            properties: {
                                                topic: { type: "STRING" },
                                                gapType: { type: "STRING", enum: ["Conceptual", "Factual", "Procedural"] },
                                                reason: { type: "STRING" },
                                                recommendation: { type: "STRING" }
                                            }
                                        }
                                    }
                                },
                                required: ["gaps"]
                            }
                        }]
                    }]
                }
            };
            googleWs.send(JSON.stringify(setupMsg));

            // Flush queue
            while (messageQueue.length > 0) {
                googleWs.send(messageQueue.shift());
            }
        });

        googleWs.on('message', (data) => {
            // Forward data from Google -> Client
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        googleWs.on('close', (code, reason) => {
            console.log(`[GeminiProxy] Google closed connection: ${code}`);
            if (ws.readyState === WebSocket.OPEN) ws.close(code, reason);
        });

        googleWs.on('error', (err) => {
            console.error("[GeminiProxy] Google WebSocket Error:", err);
            if (ws.readyState === WebSocket.OPEN) ws.close(1011, "Upstream Error");
        });

        // Client -> Google
        ws.on('message', (data) => {
            if (googleWs.readyState === WebSocket.OPEN) {
                googleWs.send(data);
            } else {
                messageQueue.push(data);
            }
        });

        ws.on('close', () => {
            console.log("[GeminiProxy] Client disconnected.");
            if (googleWs.readyState === WebSocket.OPEN) googleWs.close();
        });

        ws.on('error', (err) => {
            console.error("[GeminiProxy] Client WebSocket Error:", err);
            if (googleWs.readyState === WebSocket.OPEN) googleWs.close();
        });
    });
}
