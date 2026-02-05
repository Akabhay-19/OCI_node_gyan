
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
    const path = `/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const uri = `wss://${host}${path}`;

    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
        console.log(`[GeminiProxy] Client connected. Proxying to ${model}...`);

        // Connect to Google Gemini
        const googleWs = new WebSocket(uri);

        // Buffer messages from client until Google is ready
        const messageQueue = [];

        googleWs.on('open', () => {
            console.log("[GeminiProxy] Connected to Google Gemini!");

            // Send Initial Setup Message (Config)
            const setupMsg = {
                setup: {
                    model: `models/${model}`,
                    generationConfig: {
                        responseModalities: ["AUDIO"]
                    }
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
