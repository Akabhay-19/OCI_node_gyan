
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

const queryTable = (tableName) => {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, [], (err, rows) => {
            if (err) reject(err);
            else resolve({ tableName, rows });
        });
    });
};

const inspect = async () => {
    try {
        console.log('--- Database Inspection ---');

        const tables = ['schools', 'teachers', 'students', 'classrooms'];
        for (const table of tables) {
            const data = await queryTable(table);
            console.log(`\n=== ${table.toUpperCase()} (${data.rows.length} records) ===`);
            if (data.rows.length > 0) {
                console.table(data.rows);
            } else {
                console.log('No records found.');
            }
        }

    } catch (error) {
        console.error('Inspection failed:', error);
    } finally {
        db.close();
    }
};

inspect();
