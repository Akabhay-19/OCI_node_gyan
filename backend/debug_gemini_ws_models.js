
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load Environment Variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.GEMINI_AUDIO_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API Key found in .env (GEMINI_AUDIO_API_KEY or GEMINI_API_KEY)");
    process.exit(1);
}

async function listBidiModels() {
    console.log("🔍 Querying Google Gemini API for Bidi-supported models...");
    const url = `https://generativelanguage.googleapis.com/v1alpha/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", JSON.stringify(data.error, null, 2));
            return;
        }

        if (!data.models) {
            console.log("⚠️ No models returned.");
            return;
        }

        console.log(`\n✅ Found ${data.models.length} total models. Filtering for 'BidiGenerateContent'...`);

        const bidiModels = data.models.filter(m =>
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes("bidiGenerateContent")
        );

        if (bidiModels.length === 0) {
            console.log("⚠️ No models found with 'bidiGenerateContent' support.");
            console.log("Listing ALL models for manual inspection:");
            data.models.forEach(m => console.log(`- ${m.name} [Methods: ${m.supportedGenerationMethods?.join(', ')}]`));
        } else { // Corrected syntax here
            console.log(`\n🎉 Found ${bidiModels.length} compatible models:\n`);
            bidiModels.forEach(m => {
                console.log(`Model: ${m.name}`);
                console.log(`Display: ${m.displayName}`);
                console.log(`Vers: ${m.version}`);
                console.log(`Methods: ${m.supportedGenerationMethods.join(', ')}`);
                console.log('---');
            });
        }

    } catch (error) {
        console.error("❌ Network or Parsing Error:", error.message);
    }
}

listBidiModels();
