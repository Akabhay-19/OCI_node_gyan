// Native fetch is available in Node 18+ 
// Since we are in node environment for testing, and node 18+ has fetch built-in, we might not need require if running with node 18+.
// But to be safe, let's assume we might need to run this in a way that supports fetch.
// Actually, for a quick test script, I'll use standard http or just assume node 18+.

// Let's try to use the built-in fetch if available, or error out.
if (!globalThis.fetch) {
    console.error("This script requires Node.js 18+ or a fetch polyfill.");
    process.exit(1);
}

const API_URL = 'http://localhost:5000/api';

async function testApi() {
    console.log("Starting API Test...");

    try {
        // 1. Test Schools
        console.log("\n--- Testing Schools ---");
        const schoolsRes = await fetch(`${API_URL}/schools`);
        const schools = await schoolsRes.json();
        console.log(`Fetched ${schools.length} schools.`);

        const newSchool = {
            id: `SCH-${Date.now()}`,
            name: "Test Academy",
            inviteCode: "TEST-123",
            adminEmail: "test@test.com",
            subscriptionStatus: "TRIAL",
            trialEndsAt: new Date().toISOString(),
            studentCount: 0,
            maxStudents: 100,
            plan: "TRIAL",
            logoUrl: ""
        };
        const createSchoolRes = await fetch(`${API_URL}/schools`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSchool)
        });
        const createdSchool = await createSchoolRes.json();
        console.log("Created School:", createdSchool.id);

        // 2. Test Students
        console.log("\n--- Testing Students ---");
        const newStudent = {
            id: `STU-${Date.now()}`,
            schoolId: createdSchool.id,
            classId: 'CLS-TEST',
            name: "Test Student",
            grade: "10",
            attendance: 100,
            avgScore: 90,
            status: "Active",
            weakerSubjects: [],
            weaknessHistory: []
        };
        const createStudentRes = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newStudent)
        });
        const createdStudent = await createStudentRes.json();
        console.log("Created Student:", createdStudent.name);

        const studentsRes = await fetch(`${API_URL}/students`);
        const students = await studentsRes.json();
        console.log(`Fetched ${students.length} students.`);
        const foundStudent = students.find(s => s.id === newStudent.id);
        if (foundStudent) {
            console.log("Verified Student exists.");
        } else {
            console.error("FAILED: Student not found.");
        }

        // 3. Test Update Student
        console.log("\n--- Testing Update Student ---");
        const updateRes = await fetch(`${API_URL}/students/${newStudent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avgScore: 95 })
        });
        const updateResult = await updateRes.json();
        console.log("Update Result:", updateResult.message);

        // Verify Update
        const studentsRes2 = await fetch(`${API_URL}/students`);
        const students2 = await studentsRes2.json();
        const updatedStudent = students2.find(s => s.id === newStudent.id);
        if (updatedStudent.avgScore === 95) {
            console.log("Verified Student updated.");
        } else {
            console.error("FAILED: Student not updated. Score is " + updatedStudent.avgScore);
        }

        console.log("\nAPI Test Completed Successfully.");

    } catch (e) {
        console.error("Test Failed:", e);
    }
}

testApi();
