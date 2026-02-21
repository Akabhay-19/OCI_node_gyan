
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    console.log('--- Setting up Test Environment ---');

    // 1. Create/Find Test School
    const adminEmail = 'test_admin@gyan.ai';
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const { data: existingSchool, error: schoolError } = await supabase
        .from('schools')
        .select('*')
        .eq('adminEmail', adminEmail)
        .single();

    let schoolId;
    if (existingSchool) {
        console.log('Test School already exists.');
        schoolId = existingSchool.id;
    } else {
        const newSchool = {
            id: 'SCH-TEST-001',
            name: 'Test Audit Academy',
            adminEmail: adminEmail,
            password: hashedPassword,
            subscriptionStatus: 'PRODUCTION_TEST',
            inviteCode: 'TEST1234',
            motto: 'Testing for Excellence',
            maxStudents: 100
        };
        const { data, error } = await supabase.from('schools').insert([newSchool]).select().single();
        if (error) {
            console.error('Error creating school:', error);
            return;
        }
        console.log('Test School created:', data.id);
        schoolId = data.id;
    }

    // 2. Create Grade 5 Class
    const { data: existingClass, error: classError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('schoolId', schoolId)
        .eq('name', 'Grade 5')
        .single();

    let classId;
    if (existingClass) {
        console.log('Grade 5 class already exists.');
        classId = existingClass.id;
    } else {
        const newClass = {
            id: 'CLS-TEST-005',
            name: 'Grade 5',
            section: 'A',
            schoolId: schoolId,
            status: 'ACTIVE',
            inviteCode: 'G5TEST',
            studentIds: []
        };
        const { data, error } = await supabase.from('classrooms').insert([newClass]).select().single();
        if (error) {
            console.error('Error creating class:', error);
        } else {
            console.log('Grade 5 class created:', data.id);
            classId = data.id;
        }
    }

    // 3. Create Test Student
    const studentUsername = 'test_student';
    const studentHashedPassword = await bcrypt.hash('Student@123', 10);

    const { data: existingStudent, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('username', studentUsername)
        .single();

    if (existingStudent) {
        console.log('Test Student already exists.');
        // Update class if needed
        if (existingStudent.classId !== classId) {
            await supabase.from('students').update({ classId: classId }).eq('id', existingStudent.id);
            console.log('Updated student class enrolment.');
        }
    } else {
        const newStudent = {
            id: 'STU-TEST-001',
            name: 'Audit Tester',
            username: studentUsername,
            password: studentHashedPassword,
            schoolId: schoolId,
            classId: classId,
            rollNumber: 'TEST-01',
            status: 'Exceling',
            attendance: 95,
            avgScore: 88
        };
        const { data, error } = await supabase.from('students').insert([newStudent]).select().single();
        if (error) {
            console.error('Error creating student:', error);
        } else {
            console.log('Test Student created:', data.id);
        }
    }

    console.log('--- Setup Complete ---');
    console.log('Admin Account: test_admin@gyan.ai / Admin@123');
    console.log('Student Account: test_student / Student@123');
    console.log('School Invite Code: TEST1234');
    console.log('Class Invite Code: G5TEST');
}

setup();
