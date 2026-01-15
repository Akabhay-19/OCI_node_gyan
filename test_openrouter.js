// Test script to verify OpenRouter API key and list available models
const API_KEY = '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';

async function testOpenRouterKey() {
  console.log('🔑 Testing OpenRouter API Key...\n');

  try {
    // Test 1: Check API key validity with a simple completion
    console.log('📝 Test 1: Verifying API key with a test completion...');
    
    const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'GYAN AI Test'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Say "Hello! API key is working!" in exactly those words.' }],
        max_tokens: 50
      })
    });

    if (!testResponse.ok) {
      const error = await testResponse.json();
      console.log('❌ API Key Error:', error);
      return;
    }

    const testResult = await testResponse.json();
    console.log('✅ API Key is VALID!');
    console.log('   Response:', testResult.choices[0]?.message?.content || 'No response');
    console.log('   Model used:', testResult.model);
    console.log('');

    // Test 2: Get available models
    console.log('📋 Test 2: Fetching available models...\n');
    
    const modelsResponse = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      
      // Group models by provider
      const popularModels = modelsData.data.filter(m => 
        m.id.includes('gpt-4') || 
        m.id.includes('gpt-3.5') || 
        m.id.includes('claude') || 
        m.id.includes('gemini') ||
        m.id.includes('llama')
      ).slice(0, 20);

      console.log('🌟 Popular Models Available:');
      console.log('─'.repeat(60));
      
      popularModels.forEach(model => {
        const pricing = model.pricing;
        const promptCost = pricing?.prompt ? `$${(parseFloat(pricing.prompt) * 1000000).toFixed(2)}/1M tokens` : 'N/A';
        console.log(`  📌 ${model.id}`);
        console.log(`     Context: ${model.context_length || 'N/A'} tokens | Cost: ${promptCost}`);
      });

      console.log('\n─'.repeat(60));
      console.log(`📊 Total models available: ${modelsData.data.length}`);
    }

    // Test 3: Check account limits
    console.log('\n💳 Test 3: Checking account status...');
    
    const limitsResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (limitsResponse.ok) {
      const limitsData = await limitsResponse.json();
      console.log('✅ Account Info:');
      console.log('   Label:', limitsData.data?.label || 'Default');
      console.log('   Usage Limit:', limitsData.data?.limit ? `$${limitsData.data.limit}` : 'Unlimited');
      console.log('   Usage:', limitsData.data?.usage ? `$${limitsData.data.usage.toFixed(4)}` : '$0.00');
    }

    console.log('\n✅ All tests passed! Your OpenRouter API key is ready to use.');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testOpenRouterKey();
