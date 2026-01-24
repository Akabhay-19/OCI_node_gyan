
import fetch from 'node-fetch';

async function testProd() {
    console.log("Hitting https://gyanai.online/api/study-plan...");
    try {
        const res = await fetch('https://gyanai.online/api/study-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic: "Photosynthesis",
                gradeLevel: "Grade 10",
                studentId: "TEST_USER"
            })
        });

        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body length:", text.length);

        // Use fs to write to file since console log is truncated in tool output
        const fs = await import('fs');
        fs.writeFileSync('prod_error.txt', text);
        console.log("Error saved to prod_error.txt");
    } catch (e) {
        console.error("Error:", e);
    }
}

testProd();
