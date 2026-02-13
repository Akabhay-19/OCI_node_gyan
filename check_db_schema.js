
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking "students" table schema...');

    // Try to select a single record to see available columns
    const { data, error } = await supabase.from('students').select('*').limit(1);

    if (error) {
        console.error('Error fetching students:', error);
        return;
    }

    if (data && data.length > 0) {
        const student = data[0];
        console.log('Columns found in students table:');
        console.log(Object.keys(student).join(', '));

        const performanceDataExists = 'performanceData' in student;
        const weaknessHistoryExists = 'weaknessHistory' in student;

        console.log(`\nHas 'performanceData': ${performanceDataExists}`);
        console.log(`Has 'weaknessHistory': ${weaknessHistoryExists}`);

        if (performanceDataExists) {
            console.log('performanceData type:', typeof student.performanceData);
            console.log('performanceData value:', JSON.stringify(student.performanceData, null, 2));
        }
    } else {
        console.log('No students found to inspect schema. Assuming standard schema.');
    }
}

checkSchema();
