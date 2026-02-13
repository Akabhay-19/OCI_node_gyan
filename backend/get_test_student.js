import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function getTestData() {
    const { data: students, error } = await supabase.from('students').select('id').limit(1);
    if (error) {
        console.error('Error fetching student:', error);
        process.exit(1);
    }
    if (students && students.length > 0) {
        console.log(`STUDENT_ID=${students[0].id}`);
    } else {
        console.log('No students found');
    }
}

getTestData();
