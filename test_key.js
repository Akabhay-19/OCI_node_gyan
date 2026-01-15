const fs = require('fs');
const API_KEY = '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';

async function test() {
    let output = [];
    output.push('=== OpenRouter API Key Test Results ===\n');

    // Test 1: Basic completion
    output.push('Test 1: Chat Completion Test');
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Say "API key working!" in exactly those words' }],
                max_tokens: 20
            })
        });
        const data = await response.json();
        output.push(`  Status: ${response.status}`);
        output.push(`  Model: ${data.model || 'N/A'}`);
        output.push(`  Response: ${data.choices?.[0]?.message?.content || 'No response'}`);
        output.push(`  Result: ${response.status === 200 ? 'SUCCESS' : 'FAILED'}\n`);
    } catch (e) {
        output.push(`  Error: ${e.message}\n`);
    }

    // Test 2: Account info
    output.push('Test 2: Account Information');
    try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const data = await response.json();
        output.push(`  Status: ${response.status}`);
        output.push(`  Label: ${data.data?.label || 'Default'}`);
        output.push(`  Credit Limit: $${data.data?.limit || 'Unlimited'}`);
        output.push(`  Usage: $${data.data?.usage?.toFixed(4) || '0.0000'}`);
        output.push(`  Rate Limit: ${data.data?.rate_limit?.requests || 'N/A'} req/interval\n`);
    } catch (e) {
        output.push(`  Error: ${e.message}\n`);
    }

    // Test 3: Popular models
    output.push('Test 3: Available Models (Top 15)');
    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const data = await response.json();
        const popular = data.data.filter(m =>
            m.id.includes('gpt-4') ||
            m.id.includes('gpt-3.5') ||
            m.id.includes('claude') ||
            m.id.includes('gemini')
        ).slice(0, 15);

        popular.forEach(m => {
            output.push(`  - ${m.id} (ctx: ${m.context_length})`);
        });
        output.push(`\n  Total models available: ${data.data.length}`);
    } catch (e) {
        output.push(`  Error: ${e.message}\n`);
    }

    fs.writeFileSync('api_test_results.txt', output.join('\n'));
    console.log('Results written to api_test_results.txt');
}

test();
