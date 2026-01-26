import { NextRequest, NextResponse } from 'next/server';
import { ApiTester } from '@/services/apiTester';

export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    let result;
    switch (provider) {
      case 'anthropic':
        result = await ApiTester.testAnthropic(apiKey);
        break;
      case 'openai':
        result = await ApiTester.testOpenAI(apiKey);
        break;
      case 'groq':
        result = await ApiTester.testGroq(apiKey);
        break;
      case 'gemini':
        result = await ApiTester.testGemini(apiKey);
        break;
      case 'openrouter':
        result = await ApiTester.testOpenRouter(apiKey);
        break;
      case 'fireworks':
        result = await ApiTester.testFireworks(apiKey);
        break;
      case 'mistral':
        result = await ApiTester.testMistral(apiKey);
        break;
      case 'render':
        result = await ApiTester.testRender(apiKey);
        break;
      case 'ngrok':
        result = await ApiTester.testNgrok(apiKey);
        break;
      case 'zai':
        result = await ApiTester.testZai(apiKey);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported provider' },
          { status: 400 }
        );
    }

    if (result.status === 'success') {
      return NextResponse.json({ success: true, result });
    } else if (result.status === 'not_configured') {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Test API key error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to test API key' },
      { status: 500 }
    );
  }
}
