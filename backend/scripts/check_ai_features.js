import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import aiService from '../ai-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log('--- Checking Database Tables ---');
    const tables = ['schools', 'teachers', 'students', 'classrooms', 'teacher_history', 'generated_modules'];

    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.error(`❌ Table "${table}": ${error.message}`);
        } else {
            console.log(`✅ Table "${table}": Exists`);
        }
    }
}

async function checkAIService() {
    console.log('\n--- Checking AI Service ---');
    try {
        const status = aiService.getStatus();
        console.log(`Current Provider: ${status.provider}`);
        console.log(`OpenRouter Configured: ${status.openrouter.configured}`);
        console.log(`Gemini Configured: ${status.gemini.configured}`);

        console.log('\nTesting Lesson Plan Generation...');
        const prompt = "Create a 1-sentence lesson plan for 'Photosynthesis' for Grade 10.";
        const result = await aiService.generate(prompt, { maxTokens: 100 });
        console.log('✅ AI Response received:', result.text.substring(0, 50) + '...');
    } catch (error) {
        console.error('❌ AI Service Error:', error.message);
    }
}

async function runDiagnostics() {
    await checkDatabase();
    await checkAIService();
    console.log('\nDiagnostic complete.');
}

runDiagnostics();
