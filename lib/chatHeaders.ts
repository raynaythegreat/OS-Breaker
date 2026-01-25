// Helper function to build headers with API keys for chat API
// SERVER-SIDE: Only uses environment variables
// Client will send keys via headers when making requests
export async function buildChatApiHeaders(baseHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers = { ...baseHeaders };

  // On server, we only use environment variables
  // Client will send keys via headers when making API requests
  const envMap: Record<string, string> = {
    'X-API-Key-Anthropic': process.env.CLAUDE_API_KEY || '',
    'X-API-Key-Openai': process.env.OPENAI_API_KEY || '',
    'X-API-Key-Gemini': process.env.GEMINI_API_KEY || '',
    'X-API-Key-Groq': process.env.GROQ_API_KEY || '',
    'X-API-Key-Openrouter': process.env.OPENROUTER_API_KEY || '',
    'X-API-Key-Fireworks': process.env.FIREWORKS_API_KEY || '',
    'X-API-Key-Mistral': process.env.MISTRAL_API_KEY || '',
    'X-API-Key-Perplexity': process.env.PERPLEXITY_API_KEY || '',
    'X-API-Key-Zai': process.env.ZAI_API_KEY || '',
    'X-API-Key-Nanobanana': process.env.NANOBANANA_API_KEY || '',
    'X-API-Key-Ideogram': process.env.IDEOGRAM_API_KEY || '',
    'X-API-Key-GitHub': process.env.GITHUB_TOKEN || '',
    'X-API-Key-Vercel': process.env.VERCEL_TOKEN || '',
    'X-API-Key-Render': process.env.RENDER_API_KEY || '',
    'X-API-Key-Ngrok': process.env.NGROK_API_KEY || '',
    'X-API-Key-Opencodezen': process.env.OPENCODE_API_KEY || '',
  };

  for (const [headerName, value] of Object.entries(envMap)) {
    if (value && value.trim()) {
      headers[headerName] = value.trim();
    }
  }

  return headers;
}