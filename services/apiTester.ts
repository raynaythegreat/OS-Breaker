// Note: SDKs assumed installed; add to package.json if needed

export interface TestResult {
  status: 'success' | 'error' | 'not_configured';
  message: string;
  latency?: number;
}

// Utility function to add timeout to fetch requests
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - server took too long to respond');
    }
    throw error;
  }
}

// Validate API key format
function validateApiKey(key: string, pattern?: RegExp): boolean {
  if (!key || key.trim() === '') return false;
  if (pattern) return pattern.test(key);
  return key.length > 10; // Basic length check
}

// Format error messages
function formatError(error: unknown): string {
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('Failed to fetch')) {
      return 'Network error - check your internet connection';
    }
    if (error.message.includes('CORS')) {
      return 'CORS error - API not accessible from browser';
    }
    if (error.message.includes('timeout')) {
      return 'Request timeout - server too slow';
    }
    return error.message;
  }
  return 'Unknown error occurred';
}

export class ApiTester {
  static async testAnthropic(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^sk-ant-/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with sk-ant-)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
      }, 8000);

      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 403) throw new Error('API key lacks permission');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok && response.status !== 400) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testOpenAI(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^sk-/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with sk-)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }, 6000);

      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testGroq(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^gsk_/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with gsk_)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }, 5000);

      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testOllama(baseUrl?: string): Promise<TestResult> {
    const url = baseUrl || 'http://localhost:11434';
    try {
      const start = Date.now();
      const response = await fetchWithTimeout(`${url}/api/tags`, {}, 3000);
      if (!response.ok) throw new Error('Ollama not running');
      await response.json();
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      const errorMsg = formatError(error);
      if (errorMsg.includes('Network error') || errorMsg.includes('Failed to fetch')) {
        return { status: 'error', message: 'Ollama not running - start with: ollama serve' };
      }
      return { status: 'error', message: errorMsg };
    }
  }

  static async testOpenRouter(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^sk-or-v1-/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with sk-or-v1-)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }, 6000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testFireworks(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.fireworks.ai/inference/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }, 6000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testGemini(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^AIza/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with AIza)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {}, 6000);
      if (response.status === 400) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testGitHub(token: string): Promise<TestResult> {
    if (!validateApiKey(token, /^(ghp_|github_pat_)/)) {
      return { status: 'not_configured', message: 'Invalid token format (should start with ghp_ or github_pat_)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      }, 5000);
      if (response.status === 401) throw new Error('Invalid token');
      if (response.status === 403) throw new Error('Token lacks required permissions');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testVercel(token: string): Promise<TestResult> {
    if (!validateApiKey(token)) {
      return { status: 'not_configured', message: 'Token not configured' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.vercel.com/v2/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      }, 5000);
      if (response.status === 401 || response.status === 403) throw new Error('Invalid token');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testRender(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^rnd_/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with rnd_)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.render.com/v1/services', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }, 5000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testMistral(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }, 6000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testCohere(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.cohere.ai/v1/check-api-key', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }, 6000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testPerplexity(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey, /^pplx-/)) {
      return { status: 'not_configured', message: 'Invalid API key format (should start with pplx-)' };
    }
    try {
      const start = Date.now();
      const response = await fetchWithTimeout('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      }, 8000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok && response.status !== 400) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testCustom(baseUrl: string, endpoint?: string, apiKey?: string): Promise<TestResult> {
    if (!baseUrl) return { status: 'not_configured', message: 'Base URL not configured' };

    // Basic URL validation
    try {
      new URL(baseUrl);
    } catch {
      return { status: 'error', message: 'Invalid URL format' };
    }

    try {
      const start = Date.now();
      const url = `${baseUrl}${endpoint || ''}`;
      const headers: HeadersInit = {};

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetchWithTimeout(url, { headers }, 5000);
      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status} - check URL and authentication`);
      }
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }
}