
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Adding auth columns to students table...");

    db.run("ALTER TABLE students ADD COLUMN username TEXT", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding username:", err.message);
        else console.log("Added username column.");
    });

    db.run("ALTER TABLE students ADD COLUMN password TEXT", (err) => {
        if (err && !err.message.includes("duplicate column")) console.error("Error adding password:", err.message);
        else console.log("Added password column.");
    });
});
