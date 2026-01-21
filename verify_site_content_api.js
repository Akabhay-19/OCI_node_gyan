// Using native fetch available in Node.js v18+

const API_URL = 'http://localhost:5000/api';

async function testPersistence() {
    console.log("--- Testing Site Content Persistence ---");

    const testData = {
        teamMembers: [
            {
                id: 'test-1',
                name: "Test User",
                role: "Tester",
                bio: "Just a test account",
                imageUrl: "https://example.com/image.png",
                socials: {}
            }
        ]
    };

    try {
        // 1. POST new content
        console.log("1. Posting new content...");
        const postRes = await fetch(`${API_URL}/site-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        if (!postRes.ok) {
            console.error("POST failed:", await postRes.text());
            return;
        }
        console.log("POST successful.");

        // 2. GET content and verify
        console.log("2. Fetching content back...");
        const getRes = await fetch(`${API_URL}/site-content`);
        if (!getRes.ok) {
            console.error("GET failed:", await getRes.text());
            return;
        }

        const retrievedData = await getRes.json();
        console.log("Retrieved Data:", JSON.stringify(retrievedData, null, 2));

        if (retrievedData.teamMembers && retrievedData.teamMembers[0].name === "Test User") {
            console.log("\n✅ SUCCESS: Data persisted and retrieved correctly!");
        } else {
            console.log("\n❌ FAILURE: Data mismatch!");
        }

    } catch (e) {
        console.error("Error during test:", e.message);
    }
}

testPersistence();
