
// Node 20+ has built-in fetch
async function checkRateLimit() {
    const url = 'http://localhost:5000/api/health';
    console.log(`Starting rate limit test on ${url}...`);
    let successCount = 0;
    let rateLimitedCount = 0;

    for (let i = 1; i <= 310; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 200) {
                successCount++;
            } else if (res.status === 429) {
                rateLimitedCount++;
                console.log(`[Request ${i}] Hit Rate Limit! Status: ${res.status}`);
            }

            if (i % 50 === 0) {
                console.log(`Processed ${i} requests...`);
            }
        } catch (err) {
            console.error(`Request ${i} failed: ${err.message}`);
        }
    }

    console.log('\n--- Test Result ---');
    console.log(`Total Requests: 310`);
    console.log(`Successful (200): ${successCount}`);
    console.log(`Rate Limited (429): ${rateLimitedCount}`);
}

checkRateLimit();
