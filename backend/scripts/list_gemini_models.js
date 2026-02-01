
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using Key:", apiKey ? apiKey.substring(0, 5) + '...' : 'NONE');

if (!apiKey) {
    console.error("No API Key found!");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.models) {
            console.log("Available Gemini Models:");
            data.models.forEach(m => {
                if (m.name.includes('gemini')) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("Response Error:", data);
        }
    })
    .catch(err => console.error("Fetch Error:", err));
