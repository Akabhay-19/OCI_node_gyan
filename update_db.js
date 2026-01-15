
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

const DEFAULT_SCHOOL = {
    id: 'SCH-DEMO',
    name: 'Nebula Academy',
    inviteCode: 'NEB-2025',
    adminEmail: 'admin@nebula.edu',
    subscriptionStatus: 'ACTIVE',
    trialEndsAt: '2025-12-31',
    studentCount: 150,
    maxStudents: 500,
    plan: 'ENTERPRISE',
    logoUrl: ''
};

db.serialize(() => {
    db.get("SELECT count(*) as count FROM schools", (err, row) => {
        if (err) {
            console.error("Error checking schools:", err);
            return;
        }

        if (row.count === 0) {
            console.log("Schools table is empty. Inserting default school...");
            const stmt = db.prepare("INSERT INTO schools VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            stmt.run(
                DEFAULT_SCHOOL.id,
                DEFAULT_SCHOOL.name,
                DEFAULT_SCHOOL.inviteCode,
                DEFAULT_SCHOOL.adminEmail,
                DEFAULT_SCHOOL.subscriptionStatus,
                DEFAULT_SCHOOL.trialEndsAt,
                DEFAULT_SCHOOL.studentCount,
                DEFAULT_SCHOOL.maxStudents,
                DEFAULT_SCHOOL.plan,
                DEFAULT_SCHOOL.logoUrl
                , (err) => {
                    if (err) console.error("Failed to insert school:", err);
                    else console.log("Default school inserted successfully.");
                });
            stmt.finalize();
        } else {
            console.log("Schools table already has data. No action needed.");
        }
    });
});
