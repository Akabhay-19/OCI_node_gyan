import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    db.all("SELECT id, title, classId, subject, createdAt FROM assignments", (err, rows) => {
        console.log("--- ASSIGNMENTS ---");
        if (err) console.error(err);
        else console.table(rows);
        db.close();
    });
});
