import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./database.sqlite');

console.log("Checking assignments table...");
db.all("SELECT * FROM assignments", (err, rows) => {
    if (err) {
        console.error("Error:", err);
    } else {
        console.log("Count:", rows.length);
        console.table(rows);
    }
    db.close();
});
