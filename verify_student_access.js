import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
const API_URL = 'http://localhost:5000/api';

if (!JWT_SECRET) {
    console.error("JWT_SECRET missing");
    process.exit(1);
}

// Mock Student Data from user logs: STU-1770651109363
const studentPayload = {
    id: 'STU-1770651109363',
    email: 'student@example.com',
    role: 'STUDENT',
    schoolId: 'SCH-1770650161344'
};

const token = jwt.sign(studentPayload, JWT_SECRET, { expiresIn: '7d' });
console.log("Generated Test Token:", token);

async function testEndpoint(endpoint) {
    console.log(`\nTesting ${endpoint}...`);
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log("Response Data Preview:", JSON.stringify(data).substring(0, 100));
        } else {
            const text = await res.text();
            console.log("Error Response:", text);
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

async function runTests() {
    await testEndpoint('/students/STU-1770651109363/suggestions');
    await testEndpoint('/students/STU-1770651109363/submissions');
    // Class ID from logs: CLS-1770651184185
    await testEndpoint('/assignments?classId=CLS-1770651184185');

    // Test Study Plan (POST)
    console.log("\nTesting POST /api/study-plan...");
    try {
        const res = await fetch(`${API_URL}/study-plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                topic: 'Photosynthesis',
                gradeLevel: 'Grade 10',
                studentId: 'STU-1770651109363'
            })
        });
        console.log(`Status: ${res.status}`);
        if (res.ok) {
            const data = await res.json();
            console.log("Plan Generated:", JSON.stringify(data).substring(0, 100));
        } else {
            const text = await res.text();
            console.log("Error Response:", text);
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

runTests();
