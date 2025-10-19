/**
 * Test AI Integration
 * Run this to verify connection to ai-wrapper service
 *
 * Usage:
 * 1. Ensure ai-wrapper service is running on localhost:3200
 * 2. Open browser console
 * 3. Copy and paste this code
 */

import { testConnection, sendChat, listProviders } from '../../../services/ai.service';

/**
 * Test 1: Check connection to ai-wrapper
 */
export async function testAIConnection() {
  console.log('🔍 Testing AI Wrapper Connection...\n');

  try {
    const { connected, providers } = await testConnection();

    if (connected) {
      console.log('✅ Connected to ai-wrapper service');
      console.log(`📡 Available providers: ${providers.join(', ')}`);
      console.log(`📊 Total: ${providers.length} out of 5 providers online\n`);
      return true;
    } else {
      console.log('❌ Failed to connect to ai-wrapper service');
      console.log('💡 Make sure the service is running on localhost:3200\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

/**
 * Test 2: List all providers
 */
export async function testListProviders() {
  console.log('📋 Listing AI Providers...\n');

  try {
    const { available, providers } = await listProviders();

    console.log('Available providers:', available);
    console.table(providers.map(p => ({
      Provider: p.name,
      Status: p.available ? '🟢 Online' : '🔴 Offline',
      Models: p.models?.length || 0,
    })));

    return providers;
  } catch (error) {
    console.error('❌ Failed to list providers:', error);
    return [];
  }
}

/**
 * Test 3: Send a chat message to each provider
 */
export async function testAllProviders() {
  console.log('🤖 Testing all AI providers...\n');

  const providers = ['claude', 'copilot', 'q', 'gemini', 'codex'] as const;
  const testMessage = 'Say hello in one sentence.';

  for (const provider of providers) {
    console.log(`Testing ${provider}...`);

    try {
      const response = await sendChat({
        message: testMessage,
        provider,
      });

      console.log(`✅ ${provider}: ${response.content.substring(0, 100)}...`);
      console.log(`   Model: ${response.model || 'unknown'}`);
      console.log(`   Tokens: ${response.tokens?.total || 'N/A'}\n`);
    } catch (error) {
      console.error(`❌ ${provider} failed:`, error instanceof Error ? error.message : error);
      console.log('');
    }
  }
}

/**
 * Test 4: Send a coding question
 */
export async function testCodingQuestion(provider: 'claude' | 'copilot' | 'q' | 'gemini' | 'codex' = 'claude') {
  console.log(`💻 Testing coding question with ${provider}...\n`);

  const question = 'Write a TypeScript function that reverses a string. Include type annotations.';

  try {
    const response = await sendChat({
      message: question,
      provider,
    });

    console.log('✅ Response received:');
    console.log(response.content);
    console.log(`\nModel: ${response.model || 'unknown'}`);
    console.log(`Tokens: ${response.tokens?.total || 'N/A'}\n`);

    return response;
  } catch (error) {
    console.error('❌ Coding test failed:', error);
    return null;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('🚀 Starting AI Integration Tests\n');
  console.log('=================================\n');

  // Test 1: Connection
  const connected = await testAIConnection();
  if (!connected) {
    console.log('⚠️  Cannot continue tests - service not connected\n');
    return;
  }

  // Test 2: List providers
  await testListProviders();
  console.log('\n');

  // Test 3: Test all providers
  await testAllProviders();

  // Test 4: Coding question
  await testCodingQuestion('claude');

  console.log('=================================\n');
  console.log('✅ All tests completed!\n');
}

// For browser console usage
if (typeof window !== 'undefined') {
  (window as any).aiTests = {
    testConnection: testAIConnection,
    listProviders: testListProviders,
    testAllProviders,
    testCodingQuestion,
    runAllTests,
  };

  console.log('💡 AI Test utilities loaded!');
  console.log('Available commands:');
  console.log('  - aiTests.testConnection()');
  console.log('  - aiTests.listProviders()');
  console.log('  - aiTests.testAllProviders()');
  console.log('  - aiTests.testCodingQuestion(provider)');
  console.log('  - aiTests.runAllTests()');
}
