
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

db.serialize(() => {
    db.all("SELECT id, schoolId FROM students LIMIT 5", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log("Students:", rows);
        }
    });
});
