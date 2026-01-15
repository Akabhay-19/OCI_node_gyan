
import fetch from 'node-fetch';

async function testStudyPlan() {
    try {
        const response = await fetch('http://localhost:5000/api/study-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: 'Photosynthesis', gradeLevel: 'Grade 10' })
        });

        const data = await response.json();

        console.log("Topic:", data.topic);
        console.log("\nResources:");
        data.resources.forEach((r, i) => {
            console.log(`${i + 1}. [${r.language}] ${r.title}`);
            console.log(`   Query: ${r.searchQuery}`);
            console.log(`   URL: ${r.url}`);
        });

        // Validation
        const englishCount = data.resources.filter(r => r.language.toLowerCase().includes('english')).length;
        const hindiCount = data.resources.filter(r => r.language.toLowerCase().includes('hindi') || r.language.toLowerCase().includes('hinglish')).length;

        console.log(`\nStats: English: ${englishCount}, Hindi: ${hindiCount}`);

        if (englishCount === 2 && hindiCount === 2) {
            console.log("PASS: Language mix is correct.");
        } else {
            console.log("FAIL: Language mix incorrect.");
        }

        if (data.resources.every(r => r.url.includes('youtube.com/results?search_query='))) {
            console.log("PASS: All URLs are search queries.");
        } else {
            console.log("FAIL: Some URLs are not search queries.");
        }

    } catch (err) {
        console.error("Test Failed:", err);
    }
}

testStudyPlan();
