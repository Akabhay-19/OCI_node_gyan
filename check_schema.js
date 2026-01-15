import sqlite3 from 'sqlite3';
const verboseSqlite = sqlite3.verbose();
// Need to identify which DB file is used. server.js imports from ./db.js.
// Let's assume it matches db.js logic.
// Checking 'gyan.db' directly as it appeared in file list.

const db = new verboseSqlite.Database('./gyan.db');

db.serialize(() => {
    db.all("PRAGMA table_info(students)", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("Columns in students table:");
        rows.forEach(r => console.log(r.name));
    });
});

db.close();
