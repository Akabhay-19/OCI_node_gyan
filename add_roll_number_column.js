
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    console.log("Adding rollNumber column to students table...");
    db.run("ALTER TABLE students ADD COLUMN rollNumber TEXT", (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("Column rollNumber already exists.");
            } else {
                console.error("Failed to add column:", err.message);
            }
        } else {
            console.log("Column rollNumber added successfully.");
        }
    });
});
