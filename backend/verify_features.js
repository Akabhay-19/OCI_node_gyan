
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5012';

async function testEndpoint(name, url, method = 'GET', body = null) {
    console.log(`\nTesting ${name}...`);
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }

        if (res.ok) {
            console.log(`✅ ${name} SUCCESS:`, res.status);
            return true;
        } else {
            console.error(`❌ ${name} FAILED:`, res.status);
            return false;
        }
    } catch (error) {
        console.error(`❌ ${name} ERROR:`, error.message);
        return false;
    }
}

async function runTests() {
    console.log('Starting Feature Verification on ' + BASE_URL);

    await testEndpoint('Health Check', `${BASE_URL}/api/health`);

    await testEndpoint('Quiz Generation', `${BASE_URL}/api/quiz`, 'POST', {
        topic: 'Solar System',
        gradeLevel: 'Grade 6',
        count: 3
    });

    console.log('\nVerification Complete.');
}

runTests();
