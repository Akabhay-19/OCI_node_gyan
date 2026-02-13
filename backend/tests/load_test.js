const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000/api';
const CONCURRENCY_LEVELS = [10, 50, 100];
const DURATION_PER_BATCH = 5000; // 5 seconds

async function runTest(concurrency, endpoint = '/health') {
    console.log(`\n--- Testing Concurrency: ${concurrency} on ${endpoint} ---`);
    const results = {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        latencies: [],
        startTime: Date.now()
    };

    const endTime = Date.now() + DURATION_PER_BATCH;

    const workers = Array(concurrency).fill(null).map(async () => {
        while (Date.now() < endTime) {
            const start = Date.now();
            try {
                const res = await fetch(`${API_URL}${endpoint}`);
                if (res.ok) {
                    results.successCount++;
                } else {
                    results.errorCount++;
                }
            } catch (err) {
                results.errorCount++;
            }
            results.totalRequests++;
            results.latencies.push(Date.now() - start);
        }
    });

    await Promise.all(workers);

    const actualDuration = (Date.now() - results.startTime) / 1000;
    const avgLatency = results.latencies.reduce((a, b) => a + b, 0) / results.latencies.length;

    console.log(`Requests: ${results.totalRequests}`);
    console.log(`Throughput: ${(results.totalRequests / actualDuration).toFixed(2)} req/s`);
    console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Error Rate: ${((results.errorCount / results.totalRequests) * 100).toFixed(2)}%`);

    return {
        concurrency,
        throughput: results.totalRequests / actualDuration,
        avgLatency,
        errorRate: (results.errorCount / results.totalRequests) * 100
    };
}

async function main() {
    console.log("Starting Load Test...");
    const report = [];

    // 1. Health check (API Overhead)
    for (const c of CONCURRENCY_LEVELS) {
        report.push(await runTest(c, '/health'));
    }

    // 2. DB Bound (Recommendations) - Assuming a valid studentId or static recommendations
    // Note: Usually we'd use a real studentId from DB
    // report.push(await runTest(50, '/recommendations?studentId=...'));

    console.log("\n--- Final Summary ---");
    console.table(report);
}

main().catch(console.error);
