
import fetch from 'node-fetch';

async function testLogin() {
    console.log('Testing Developer Login...');
    try {
        const res = await fetch('http://localhost:5000/api/auth/dev-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@gyan.ai',
                password: 'admin123'
            })
        });

        const status = res.status;
        const data = await res.json();

        console.log('Status:', status);
        console.log('Response Body:', data);

        if (status === 200 && data.token) {
            console.log('SUCCESS: Developer Login is working!');
        } else {
            console.error('FAILED: Developer Login issue persists.');
        }
    } catch (err) {
        console.error('Network Error:', err.message);
    }
}

testLogin();
