// Note: SDKs assumed installed; add to package.json if needed

export interface TestResult {
  status: 'success' | 'error' | 'not_configured';
  message: string;
  latency?: number;
}

export class ApiTester {
  static async testAnthropic(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      });

      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 403) throw new Error('API key does not have permission');
      if (!response.ok && response.status !== 400) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testOpenAI(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.status === 401) throw new Error('Invalid API key');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testGroq(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      if (response.status === 401) throw new Error('Invalid API key');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testOllama(baseUrl?: string): Promise<TestResult> {
    try {
      const start = Date.now();
      const response = await fetch(`${baseUrl || 'http://localhost:11434'}/api/tags`);
      if (!response.ok) throw new Error('Ollama not running');
      await response.json();
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async testOpenRouter(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid API key');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testFireworks(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.fireworks.ai/inference/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid API key');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testGemini(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!response.ok) throw new Error('Invalid API key');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testGitHub(token: string): Promise<TestResult> {
    if (!token) return { status: 'not_configured', message: 'Token not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Invalid token');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testVercel(token: string): Promise<TestResult> {
    if (!token) return { status: 'not_configured', message: 'Token not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.vercel.com/v2/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Invalid token');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testRender(apiKey: string): Promise<TestResult> {
    if (!apiKey) return { status: 'not_configured', message: 'API key not configured' };
    try {
      const start = Date.now();
      const response = await fetch('https://api.render.com/v1/services', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (!response.ok) throw new Error('Invalid API key');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }

  static async testCustom(baseUrl: string, endpoint?: string): Promise<TestResult> {
    if (!baseUrl) return { status: 'not_configured', message: 'Base URL not configured' };
    try {
      const start = Date.now();
      const url = `${baseUrl}${endpoint || ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to connect to custom API');
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : 'Connection failed' };
    }
  }
}