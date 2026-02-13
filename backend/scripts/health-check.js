
import fetch from 'node-fetch';

async function check() {
    try {
        const resApi = await fetch('http://localhost:5000/api');
        const dataApi = await resApi.json();
        console.log('Health Check /api:', dataApi);

        const resRoot = await fetch('http://localhost:5000/');
        const dataRoot = await resRoot.text();
        console.log('Health Check /:', dataRoot);
    } catch (err) {
        console.error('Health Check Failed:', err.message);
    }
}

check();
