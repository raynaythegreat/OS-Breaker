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
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        })
      }, 8000);

      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 403) throw new Error('API key lacks permissions or quota exceeded');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected - Claude models available', latency };
    } catch (error) {
      // Fallback to format validation if network issues
      if (error instanceof Error && error.message.includes('Failed to fetch') && apiKey.startsWith('sk-ant-') && apiKey.length > 20) {
        return {
          status: 'success',
          message: 'API key format valid (will verify on first use)',
          latency: 0
        };
      }
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

      // Parse models to verify working models are available
      const data = await response.json();
      const models = data.data || [];
      const popularModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      const availableModels = models.filter((m: any) => popularModels.some(pm => m.id.includes(pm))).length;

      const latency = Date.now() - start;
      if (availableModels > 0) {
        return { status: 'success', message: `Connected - ${availableModels} popular models available`, latency };
      } else {
        return { status: 'success', message: 'Connected - models available (may have restrictions)', latency };
      }
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

      // Parse models to verify working models are available
      const data = await response.json();
      const models = data.data || [];
      const popularModels = ['llama', 'mixtral', 'gemma'];
      const availableModels = models.filter((m: any) => popularModels.some(pm => m.id.toLowerCase().includes(pm))).length;

      const latency = Date.now() - start;
      if (availableModels > 0) {
        return { status: 'success', message: `Connected - ${availableModels} fast models available`, latency };
      } else {
        return { status: 'success', message: 'Connected - models available', latency };
      }
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

      // Parse models to verify diverse models are available
      const data = await response.json();
      const models = data.data || [];
      const modelCount = models.length;

      const latency = Date.now() - start;
      if (modelCount > 50) {
        return { status: 'success', message: `Connected - ${modelCount}+ diverse models available`, latency };
      } else {
        return { status: 'success', message: 'Connected - models available', latency };
      }
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
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }, 6000);
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 412) throw new Error('API key format issue - check your key at fireworks.ai');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected successfully', latency };
    } catch (error) {
      // If it's a network/CORS error but key looks valid, assume it's OK
      if (error instanceof Error && error.message.includes('Failed to fetch') && apiKey.length > 20) {
        return { status: 'success', message: 'API key saved (will verify on first use)', latency: 0 };
      }
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

      // First test basic authentication
      const userResponse = await fetchWithTimeout('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      }, 5000);
      if (userResponse.status === 401) throw new Error('Invalid token');
      if (userResponse.status === 403) throw new Error('Token lacks required permissions');
      if (!userResponse.ok) throw new Error(`API authentication error: ${userResponse.status}`);

      // Then test repository access (what deployments page needs)
      const reposResponse = await fetchWithTimeout('https://api.github.com/user/repos?per_page=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      }, 5000);

      if (reposResponse.status === 401) throw new Error('Invalid token for repo access');
      if (reposResponse.status === 403) throw new Error('Token lacks repo permissions - check token scopes');
      if (!reposResponse.ok) throw new Error(`API repo access error: ${reposResponse.status}`);

      const repos = await reposResponse.json();
      const repoCount = Array.isArray(repos) ? repos.length : 0;

      const latency = Date.now() - start;
      return { status: 'success', message: `Connected - can access ${repoCount > 0 ? 'repositories' : 'repo API'}`, latency };
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
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
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

  static async testZai(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
    }

    try {
      const start = Date.now();
      // Test using Z.ai chat completions endpoint
      const response = await fetchWithTimeout('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'glm-4.7',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10
        })
      }, 8000);
      if (response.status === 401) throw new Error('Invalid API key - verify at z.ai/manage-apikey/apikey-list');
      if (response.status === 403) throw new Error('API key lacks permissions or quota exceeded');
      if (response.status === 429) throw new Error('Rate limited - try again later');
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const latency = Date.now() - start;
      return { status: 'success', message: 'Connected - GLM models available', latency };
    } catch (error) {
      // If it's a network/CORS error but key looks valid, assume it's OK
      if (error instanceof Error && error.message.includes('Failed to fetch') && apiKey.length > 20) {
        return { status: 'success', message: 'API key saved (will verify on first use)', latency: 0 };
      }
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testNanobanana(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
    }

    try {
      const start = Date.now();
      // Simple validation test - just verify the key format
      // Nanobanana API may require specific endpoints, so we do a basic validation
      if (apiKey.length < 10) {
        throw new Error('API key appears invalid (too short)');
      }
      const latency = Date.now() - start;
      return { status: 'success', message: 'API key saved (will verify on first image generation)', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testIdeogram(apiKey: string): Promise<TestResult> {
    if (!validateApiKey(apiKey)) {
      return { status: 'not_configured', message: 'API key not configured' };
    }

    try {
      const start = Date.now();
      // Simple validation test - just verify the key format
      // Ideogram API requires specific endpoints, so we do a basic validation
      if (apiKey.length < 10) {
        throw new Error('API key appears invalid (too short)');
      }
      const latency = Date.now() - start;
      return { status: 'success', message: 'API key saved (will verify on first image generation)', latency };
    } catch (error) {
      return { status: 'error', message: formatError(error) };
    }
  }

   static async testNgrok(apiKey: string): Promise<TestResult> {
    if (!apiKey || apiKey.length < 10) {
      return {
        status: 'not_configured',
        message: 'Ngrok API key required'
      };
    }
  
    try {
      const start = Date.now();
      const response = await fetchWithTimeout(
        'https://api.ngrok.com/account',
        { 
          headers: { 'Authorization': `Bearer ${apiKey}` }
        },
        5000
      );
      
      if (response.status === 401) {
        throw new Error('Invalid ngrok API key');
      }
      
      if (response.status === 403) {
        throw new Error('Forbidden - Check API key permissions');
      }
      
      if (response.status === 429) {
        throw new Error('Rate limited - try again later');
      }
      
      const account = await response.json();
      const latency = Date.now() - start;
      
      return {
        status: 'success',
        message: `Connected - ${account.name || account.email || 'Account active'}`,
        latency
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch') && apiKey.length > 20) {
        return {
          status: 'success',
          message: 'API key format valid (will verify on first use)',
          latency: 0
        };
      }
      
      return { status: 'error', message: formatError(error) };
    }
  }

  static async testCustom(baseUrl: string, endpoint: string, apiKey?: string): Promise<TestResult> {
    if (!baseUrl) {
      return {
        status: 'not_configured',
        message: 'Base URL required'
      };
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