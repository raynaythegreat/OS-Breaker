"use client";

import React, { useState, useEffect } from 'react';
import { ApiTester, TestResult } from '@/services/apiTester';
import { useFileAccess } from '@/contexts/FileAccessContext';
import FileAccessPermissionModal from '@/components/FileAccessPermissionModal';

interface CustomEndpoint {
  id: string;
  name: string;
  baseUrl: string;
  endpoint: string;
  apiKey?: string;
  authHeader?: string;
}

interface ApiKeys {
  anthropic: string;
  openai: string;
  groq: string;
  openrouter: string;
  fireworks: string;
  gemini: string;
  mistral: string;
  cohere: string;
  perplexity: string;
  github: string;
  vercel: string;
  render: string;
  ollamaBaseUrl: string;
  customBaseUrl: string;
  customEndpoint: string;
}

interface ProviderConfig {
  key: keyof ApiKeys;
  label: string;
  placeholder: string;
  icon: string;
  category: 'ai' | 'deployment' | 'local' | 'custom';
  description?: string;
  docsUrl?: string;
  envKey?: string;
}

const providers: ProviderConfig[] = [
  // AI Providers
  { key: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', icon: '🤖', category: 'ai', description: 'Claude 3.5 Sonnet & Opus', docsUrl: 'https://console.anthropic.com/settings/keys', envKey: 'CLAUDE_API_KEY' },
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-...', icon: '🔮', category: 'ai', description: 'GPT-4, GPT-4o, GPT-3.5', docsUrl: 'https://platform.openai.com/api-keys', envKey: 'OPENAI_API_KEY' },
  { key: 'groq', label: 'Groq', placeholder: 'gsk_...', icon: '⚡', category: 'ai', description: 'Ultra-fast LLM inference', docsUrl: 'https://console.groq.com/keys', envKey: 'GROQ_API_KEY' },
  { key: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-...', icon: '🌐', category: 'ai', description: 'Access 100+ models', docsUrl: 'https://openrouter.ai/keys', envKey: 'OPENROUTER_API_KEY' },
  { key: 'fireworks', label: 'Fireworks AI', placeholder: 'fw_...', icon: '🎆', category: 'ai', description: 'Fast inference platform', docsUrl: 'https://fireworks.ai/api-keys', envKey: 'FIREWORKS_API_KEY' },
  { key: 'gemini', label: 'Google Gemini', placeholder: 'AIza...', icon: '💎', category: 'ai', description: 'Gemini Pro & Ultra', docsUrl: 'https://aistudio.google.com/app/apikey', envKey: 'GEMINI_API_KEY' },
  { key: 'mistral', label: 'Mistral AI', placeholder: 'Enter API key', icon: '🌊', category: 'ai', description: 'Mistral Large & Medium', docsUrl: 'https://console.mistral.ai/api-keys', envKey: 'MISTRAL_API_KEY' },
  { key: 'cohere', label: 'Cohere', placeholder: 'Enter API key', icon: '🧠', category: 'ai', description: 'Command & Embed models', docsUrl: 'https://dashboard.cohere.com/api-keys', envKey: 'COHERE_API_KEY' },
  { key: 'perplexity', label: 'Perplexity', placeholder: 'pplx-...', icon: '🔍', category: 'ai', description: 'Sonar models with online search', docsUrl: 'https://www.perplexity.ai/settings/api', envKey: 'PERPLEXITY_API_KEY' },

  // Development Tools
  { key: 'github', label: 'GitHub', placeholder: 'ghp_...', icon: '📦', category: 'deployment', description: 'Repository management', docsUrl: 'https://github.com/settings/tokens', envKey: 'GITHUB_TOKEN' },
  { key: 'vercel', label: 'Vercel', placeholder: 'vercel_...', icon: '▲', category: 'deployment', description: 'One-click deployments', docsUrl: 'https://vercel.com/account/tokens', envKey: 'VERCEL_TOKEN' },
  { key: 'render', label: 'Render', placeholder: 'rnd_...', icon: '🚀', category: 'deployment', description: 'Cloud deployment platform', docsUrl: 'https://dashboard.render.com/u/settings#api-keys', envKey: 'RENDER_API_KEY' },

  // Custom Models
  { key: 'customBaseUrl', label: 'Custom Base URL', placeholder: 'https://api.example.com', icon: '🔗', category: 'custom', description: 'Custom API base URL' },
  { key: 'customEndpoint', label: 'Custom Endpoint', placeholder: '/v1/chat/completions', icon: '🔌', category: 'custom', description: 'Custom API endpoint path' },
];

const SettingsPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    anthropic: '',
    openai: '',
    groq: '',
    openrouter: '',
    fireworks: '',
    gemini: '',
    mistral: '',
    cohere: '',
    perplexity: '',
    github: '',
    vercel: '',
    render: '',
    ollamaBaseUrl: 'http://localhost:11434',
    customBaseUrl: '',
    customEndpoint: '',
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [requestedAction, setRequestedAction] = useState<'enable' | 'disable'>('enable');
  const { enabled: fileAccessEnabled, toggleAccess: toggleFileAccess } = useFileAccess();
  const [newCustomEndpoint, setNewCustomEndpoint] = useState<Omit<CustomEndpoint, 'id'>>({
    name: '',
    baseUrl: '',
    endpoint: '',
    apiKey: '',
    authHeader: 'Authorization',
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('api-keys');
    if (saved) {
      try {
        setApiKeys(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved API keys:', e);
      }
    }

    const savedCustom = localStorage.getItem('custom-endpoints');
    if (savedCustom) {
      try {
        setCustomEndpoints(JSON.parse(savedCustom));
      } catch (e) {
        console.error('Failed to parse saved custom endpoints:', e);
      }
    }

    const savedSystemPrompt = localStorage.getItem('system-prompt');
    if (savedSystemPrompt) {
      setSystemPrompt(savedSystemPrompt);
    }
  }, []);

  // Auto-save to localStorage whenever keys change
  useEffect(() => {
    localStorage.setItem('api-keys', JSON.stringify(apiKeys));
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [apiKeys]);

  // Auto-save system prompt to localStorage
  useEffect(() => {
    localStorage.setItem('system-prompt', systemPrompt);
  }, [systemPrompt]);

  const updateKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  // Save API key to .env.local
  const saveToEnv = async (provider: keyof ApiKeys) => {
    const providerConfig = providers.find(p => p.key === provider);
    if (!providerConfig?.envKey || !apiKeys[provider]) return;

    setSaving(provider);
    try {
      const response = await fetch('/api/settings/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: providerConfig.envKey,
          value: apiKeys[provider],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save to .env.local');
      }

      // Show success feedback
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving to .env.local:', error);
      alert('Failed to save API key to .env.local. Please check console for details.');
    } finally {
      setSaving(null);
    }
  };

  // Delete API key from .env.local
  const deleteFromEnv = async (provider: keyof ApiKeys) => {
    const providerConfig = providers.find(p => p.key === provider);
    if (!providerConfig?.envKey) return;

    if (!confirm(`Delete ${providerConfig.label} API key from .env.local?`)) {
      return;
    }

    setDeleting(provider);
    try {
      const response = await fetch('/api/settings/env', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: providerConfig.envKey,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete from .env.local');
      }

      // Clear the key from state
      updateKey(provider, '');

      // Clear test result
      setTestResults(prev => {
        const newResults = { ...prev };
        delete newResults[provider];
        return newResults;
      });

      // Show success feedback
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error deleting from .env.local:', error);
      alert('Failed to delete API key from .env.local. Please check console for details.');
    } finally {
      setDeleting(null);
    }
  };

  const runTest = async (provider: string) => {
    // Save before testing
    localStorage.setItem('api-keys', JSON.stringify(apiKeys));

    setTesting(provider);
    let result: TestResult;

    try {
      switch (provider) {
        case 'anthropic':
          result = await ApiTester.testAnthropic(apiKeys.anthropic);
          break;
        case 'openai':
          result = await ApiTester.testOpenAI(apiKeys.openai);
          break;
        case 'groq':
          result = await ApiTester.testGroq(apiKeys.groq);
          break;
        case 'openrouter':
          result = await ApiTester.testOpenRouter(apiKeys.openrouter);
          break;
        case 'fireworks':
          result = await ApiTester.testFireworks(apiKeys.fireworks);
          break;
        case 'gemini':
          result = await ApiTester.testGemini(apiKeys.gemini);
          break;
        case 'mistral':
          result = await ApiTester.testMistral(apiKeys.mistral);
          break;
        case 'cohere':
          result = await ApiTester.testCohere(apiKeys.cohere);
          break;
        case 'perplexity':
          result = await ApiTester.testPerplexity(apiKeys.perplexity);
          break;
        case 'github':
          result = await ApiTester.testGitHub(apiKeys.github);
          break;
        case 'vercel':
          result = await ApiTester.testVercel(apiKeys.vercel);
          break;
         case 'render':
           result = await ApiTester.testRender(apiKeys.render);
           break;
         case 'ollama':
           result = await ApiTester.testOllama(apiKeys.ollamaBaseUrl);
           break;
         case 'customBaseUrl':
         case 'customEndpoint':
           result = await ApiTester.testCustom(apiKeys.customBaseUrl, apiKeys.customEndpoint);
           break;
         default:
           result = { status: 'error', message: 'Test not implemented' };
      }
    } catch (error) {
      result = { status: 'error', message: error instanceof Error ? error.message : 'Test failed' };
    }

    setTestResults(prev => ({ ...prev, [provider]: result }));
    setTesting(null);
  };

  const runAllTests = async () => {
    setTesting('all');
    const allProviders = [...providers.map(p => p.key), 'ollama'];

    for (const provider of allProviders) {
      await runTest(provider);
    }

    setTesting(null);
  };

  const addCustomEndpoint = () => {
    if (!newCustomEndpoint.name || !newCustomEndpoint.baseUrl) {
      return;
    }

    const endpoint: CustomEndpoint = {
      id: Date.now().toString(),
      ...newCustomEndpoint,
    };

    const updated = [...customEndpoints, endpoint];
    setCustomEndpoints(updated);
    localStorage.setItem('custom-endpoints', JSON.stringify(updated));

    // Reset form
    setNewCustomEndpoint({
      name: '',
      baseUrl: '',
      endpoint: '',
      apiKey: '',
      authHeader: 'Authorization',
    });
  };

  const removeCustomEndpoint = (id: string) => {
    const updated = customEndpoints.filter(e => e.id !== id);
    setCustomEndpoints(updated);
    localStorage.setItem('custom-endpoints', JSON.stringify(updated));
    // Remove test result
    setTestResults(prev => {
      const newResults = { ...prev };
      delete newResults[`custom-${id}`];
      return newResults;
    });
  };

  const handleFileAccessToggle = () => {
    setRequestedAction(fileAccessEnabled ? 'disable' : 'enable');
    setShowPermissionModal(true);
  };

  const testCustomEndpoint = async (endpoint: CustomEndpoint) => {
    setTesting(`custom-${endpoint.id}`);
    try {
      const result = await ApiTester.testCustom(endpoint.baseUrl, endpoint.endpoint, endpoint.apiKey);
      setTestResults(prev => ({ ...prev, [`custom-${endpoint.id}`]: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [`custom-${endpoint.id}`]: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Test failed'
        }
      }));
    }
    setTesting(null);
  };

  const aiProviders = providers.filter(p => p.category === 'ai');
  const deploymentProviders = providers.filter(p => p.category === 'deployment');
  const localProviders = providers.filter(p => p.category === 'local');
  const customProviders = providers.filter(p => p.category === 'custom');

  return (
    <div className="h-full overflow-y-auto p-6 max-w-7xl mx-auto space-y-12 bg-background">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
          API Configuration & Integrations
        </p>
        {saved && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Auto-saved
            </span>
          </div>
        )}
      </div>

      {/* Connection Status Overview */}
      {Object.keys(testResults).length > 0 && (
        <div className="p-6 rounded-lg bg-card border-2 border-border shadow-flat">
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight mb-4">Connection Status</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(testResults).map(([provider, result]) => {
              const providerConfig = providers.find(p => p.key === provider);
              if (!providerConfig || result.status === 'not_configured') return null;

              return (
                <div
                  key={provider}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                    result.status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    result.status === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`} />
                  <span className="text-xs font-bold">
                    {providerConfig.icon} {providerConfig.label}
                  </span>
                  {result.latency && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {result.latency}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {Object.values(testResults).every(r => r.status === 'success' || r.status === 'not_configured') &&
           Object.values(testResults).some(r => r.status === 'success') && (
            <div className="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-bold">All configured providers connected!</span>
            </div>
          )}
        </div>
      )}

      {/* Chat Configuration */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Chat Configuration</h2>
          <p className="text-sm text-muted-foreground font-bold mt-1">
            Customize AI behavior with a custom system prompt
          </p>
        </div>

        <div className="max-w-3xl">
          <div className="p-6 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gold-500 text-white flex items-center justify-center text-xl border-2 border-gold-600 shadow-flat-gold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-black text-foreground text-lg">System Prompt</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    Guide AI responses
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSystemPrompt('')}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                System Prompt Instructions
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Example: You are a senior developer helping build modern web applications. Focus on clean, maintainable code with proper error handling. Always explain your reasoning before suggesting solutions."
                className="w-full min-h-[120px] px-4 py-3 rounded-lg border-2 border-gold-500/20 bg-background text-foreground placeholder-muted-foreground focus:border-gold-500/40 focus:outline-none focus:ring-2 focus:ring-gold-500/10 transition-all font-mono text-sm resize-y"
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {systemPrompt.length} characters
                </span>
                <span className="text-[10px] text-gold-600 dark:text-gold-400 font-medium">
                  Auto-saved
                </span>
              </div>
            </div>
          </div>
        </div>
       </div>
 
       {/* File System Access */}
       <div className="space-y-6">
         <div>
           <h2 className="text-xl font-black text-foreground uppercase tracking-tight">File System Access</h2>
           <p className="text-sm text-muted-foreground font-bold mt-1">
             Allow AI to read and edit files on your computer
           </p>
         </div>

         <div className="max-w-3xl">
           <div className="p-6 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover">
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 rounded-lg bg-gold-500/10 text-gold-600 dark:text-gold-400 flex items-center justify-center text-xl border-2 border-gold-500/20 flex-shrink-0">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                 </svg>
               </div>
               <div className="flex-1">
                 <div className="flex items-start justify-between gap-4 mb-3">
                   <div>
                     <h3 className="font-black text-foreground text-lg">Local File Access</h3>
                     <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                       Read & edit files on your computer
                     </p>
                   </div>
                 </div>

                  <div className="space-y-4">
                    <p className="text-sm text-foreground leading-relaxed">
                      When enabled, Athena can read files from your entire home directory, make edits, create new files, and browse directories. Use this for working with local projects and documents.
                    </p>

                   <div className={`p-4 rounded-lg border-2 ${
                     fileAccessEnabled
                       ? 'bg-emerald-500/10 border-emerald-500/30'
                       : 'bg-surface-100 dark:bg-surface-900 border-gold-500/20'
                   }`}>
                     <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center border-2 ${
                         fileAccessEnabled
                           ? 'bg-emerald-500 text-white border-emerald-600'
                           : 'bg-surface-200 dark:bg-surface-800 text-muted-foreground border-gold-500/20'
                       }`}>
                         {fileAccessEnabled ? (
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                           </svg>
                         ) : (
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                           </svg>
                         )}
                       </div>
                       <div className="flex-1">
                         <div className="font-semibold text-sm mb-1">
                           {fileAccessEnabled ? 'Access Enabled (Automatic)' : 'Access Disabled (Manual Confirmation)'}
                         </div>
                         <div className="text-xs text-muted-foreground">
                           {fileAccessEnabled
                             ? 'Athena can read and edit your files automatically'
                             : 'Athena requires confirmation for each file operation'}
                         </div>
                       </div>
                       <button
                         onClick={handleFileAccessToggle}
                         className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                           fileAccessEnabled
                             ? 'bg-red-500/10 text-red-600 border-2 border-red-500/30 hover:bg-red-500/20'
                             : 'bg-gradient-to-r from-gold-500 to-amber-500 text-black border-2 border-gold-600 hover:from-gold-600 hover:to-amber-600'
                         }`}
                       >
                         {fileAccessEnabled ? 'Disable Access' : 'Enable Access'}
                       </button>
                     </div>
                   </div>

                   {fileAccessEnabled && (
                     <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                       <div className="flex items-start gap-2">
                         <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                           <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                           File access is active with automatic operations. You can revoke access or require manual confirmation at any time.
                         </p>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             </div>
           </div>
         </div>
       </div>

       {/* AI Providers */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">AI Providers</h2>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              Configure your AI model providers. Click &quot;Save&quot; to store keys in .env.local for persistent use.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiProviders.map(({ key, label, placeholder, icon, description, docsUrl }) => (
            <div
              key={key}
              className="group p-5 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl border-2 border-primary shadow-flat-gold">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground text-sm">{label}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      {description}
                    </p>
                  </div>
                </div>
                {docsUrl && (
                  <a
                    href={docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary hover:text-primary-foreground hover:bg-primary rounded border border-primary transition-colors"
                    title="Get API Key"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </a>
                )}
              </div>

              <input
                type="password"
                value={apiKeys[key]}
                onChange={(e) => updateKey(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 mb-3 rounded-lg border-2 border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-xs input-flat"
              />

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => runTest(key)}
                  disabled={testing === key || testing === 'all' || !apiKeys[key]}
                  className="flex-1 px-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-flat-secondary"
                >
                  {testing === key ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => saveToEnv(key)}
                  disabled={saving === key || !apiKeys[key]}
                  className="flex-1 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border-2 border-emerald-500/30 hover:bg-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Save to .env.local"
                >
                  {saving === key ? 'Saving...' : 'Save'}
                </button>
              </div>

              {apiKeys[key] && (
                <button
                  onClick={() => deleteFromEnv(key)}
                  disabled={deleting === key}
                  className="w-full px-3 py-2 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border-2 border-red-500/30 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {deleting === key ? 'Deleting...' : 'Delete API Key'}
                </button>
              )}

              {testResults[key] && (
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                  testResults[key].status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : testResults[key].status === 'not_configured'
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    testResults[key].status === 'success' ? 'bg-emerald-500' :
                    testResults[key].status === 'not_configured' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-wider flex-1">
                    {testResults[key].message}
                  </span>
                  {testResults[key].latency && (
                    <span className="text-[10px] font-mono">{testResults[key].latency}ms</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Deployment Tools */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Deployment & Tools</h2>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              GitHub, Vercel, and Render integrations for seamless deployments.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deploymentProviders.map(({ key, label, placeholder, icon, description, docsUrl }) => (
            <div
              key={key}
              className="group p-5 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl border-2 border-primary shadow-flat-gold">
                    {icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground text-sm">{label}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      {description}
                    </p>
                  </div>
                </div>
                {docsUrl && (
                  <a
                    href={docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary hover:text-primary-foreground hover:bg-primary rounded border border-primary transition-colors"
                    title="Get API Key"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </a>
                )}
              </div>

              <input
                type="password"
                value={apiKeys[key]}
                onChange={(e) => updateKey(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 mb-3 rounded-lg border-2 border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-xs input-flat"
              />

              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => runTest(key)}
                  disabled={testing === key || testing === 'all' || !apiKeys[key]}
                  className="flex-1 px-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-flat-secondary"
                >
                  {testing === key ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => saveToEnv(key)}
                  disabled={saving === key || !apiKeys[key]}
                  className="flex-1 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border-2 border-emerald-500/30 hover:bg-emerald-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Save to .env.local"
                >
                  {saving === key ? 'Saving...' : 'Save'}
                </button>
              </div>

              {apiKeys[key] && (
                <button
                  onClick={() => deleteFromEnv(key)}
                  disabled={deleting === key}
                  className="w-full px-3 py-2 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border-2 border-red-500/30 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {deleting === key ? 'Deleting...' : 'Delete API Key'}
                </button>
              )}

              {testResults[key] && (
                <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                  testResults[key].status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : testResults[key].status === 'not_configured'
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    testResults[key].status === 'success' ? 'bg-emerald-500' :
                    testResults[key].status === 'not_configured' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-wider flex-1">
                    {testResults[key].message}
                  </span>
                  {testResults[key].latency && (
                    <span className="text-[10px] font-mono">{testResults[key].latency}ms</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Local Infrastructure */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Local Infrastructure</h2>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              Run open-source AI models locally on your machine using Ollama.
            </p>
          </div>
        </div>

        <div className="max-w-2xl">
          <div className="p-6 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-2xl border-2 border-primary shadow-flat-gold">
                🦙
              </div>
              <div className="flex-1">
                <h3 className="font-black text-foreground text-lg">Ollama</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  Local LLM Instance
                </p>
              </div>
              <button
                onClick={() => runTest('ollama')}
                disabled={testing === 'ollama' || testing === 'all'}
                className="px-4 py-2 bg-secondary text-foreground text-xs font-bold uppercase tracking-wider rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 transition-all"
              >
                {testing === 'ollama' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">
                Base URL
              </label>
              <input
                type="text"
                value={apiKeys.ollamaBaseUrl}
                onChange={(e) => updateKey('ollamaBaseUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-sm input-flat"
              />
            </div>

            {testResults.ollama && (
              <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg border-2 ${
                testResults.ollama.status === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  testResults.ollama.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`} />
                <span className="text-xs font-black uppercase tracking-wider flex-1">
                  {testResults.ollama.message}
                </span>
                {testResults.ollama.latency && (
                  <span className="text-xs font-mono">{testResults.ollama.latency}ms</span>
                )}
              </div>
            )}
          </div>
          </div>
       </div>

      {/* Custom Models */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Custom Endpoints</h2>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              Add custom API endpoints with authentication support.
            </p>
          </div>
          <button
            onClick={() => setShowAddCustom(!showAddCustom)}
            className="px-3 py-1.5 rounded-lg bg-gold-500/10 dark:bg-gold-500/10 border border-gold-500/20 text-gold-700 dark:text-gold-300 text-xs font-bold hover:bg-gold-500/20 transition-colors"
          >
            {showAddCustom ? 'Cancel' : '+ Add Custom Endpoint'}
          </button>
        </div>

        {/* Add new custom endpoint form */}
        {showAddCustom && (
          <div className="p-6 rounded-xl bg-gradient-to-r from-gold-100/50 to-amber-100/50 dark:from-gold-500/10 dark:to-amber-500/10 border-2 border-gold-500/20 shadow-md space-y-4">
            <h3 className="text-lg font-black text-foreground flex items-center gap-2">
              <span className="text-2xl">🔗</span>
              Add New Custom Endpoint
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={newCustomEndpoint.name}
                  onChange={(e) => setNewCustomEndpoint({ ...newCustomEndpoint, name: e.target.value })}
                  placeholder="My Custom API"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold-500/20 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-500 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Base URL *
                </label>
                <input
                  type="text"
                  value={newCustomEndpoint.baseUrl}
                  onChange={(e) => setNewCustomEndpoint({ ...newCustomEndpoint, baseUrl: e.target.value })}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold-500/20 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-500 transition-colors font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Endpoint Path
                </label>
                <input
                  type="text"
                  value={newCustomEndpoint.endpoint}
                  onChange={(e) => setNewCustomEndpoint({ ...newCustomEndpoint, endpoint: e.target.value })}
                  placeholder="/v1/chat/completions"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold-500/20 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-500 transition-colors font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  value={newCustomEndpoint.apiKey}
                  onChange={(e) => setNewCustomEndpoint({ ...newCustomEndpoint, apiKey: e.target.value })}
                  placeholder="Enter API key if required"
                  className="w-full px-3 py-2 rounded-lg border-2 border-gold-500/20 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-gold-500 transition-colors font-mono text-sm"
                />
              </div>
            </div>

            <button
              onClick={addCustomEndpoint}
              disabled={!newCustomEndpoint.name || !newCustomEndpoint.baseUrl}
              className="w-full px-4 py-3 bg-gold-500 dark:bg-gold-600 text-white text-sm font-bold uppercase tracking-wider rounded-lg border-2 border-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-flat-gold"
            >
              Add Endpoint
            </button>
          </div>
        )}

        {/* List of custom endpoints */}
        {customEndpoints.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customEndpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="p-5 rounded-lg bg-card border-2 border-border hover:border-gold-500/50 transition-all shadow-flat"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gold-500 text-white flex items-center justify-center text-xl border-2 border-gold-600 shadow-flat-gold">
                      🔗
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-foreground text-sm truncate">{endpoint.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        {endpoint.baseUrl}{endpoint.endpoint}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeCustomEndpoint(endpoint.id)}
                    className="text-red-500 hover:text-red-600 text-lg"
                    title="Remove endpoint"
                  >
                    ×
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => testCustomEndpoint(endpoint)}
                    disabled={testing === `custom-${endpoint.id}`}
                    className="flex-1 px-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg border-2 border-border hover:border-gold-500 hover:bg-gold-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {testing === `custom-${endpoint.id}` ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {testResults[`custom-${endpoint.id}`] && (
                  <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border-2 ${
                    testResults[`custom-${endpoint.id}`].status === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      testResults[`custom-${endpoint.id}`].status === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                    <span className="text-[10px] font-black uppercase tracking-wider flex-1">
                      {testResults[`custom-${endpoint.id}`].message}
                    </span>
                    {testResults[`custom-${endpoint.id}`].latency && (
                      <span className="text-[10px] font-mono">
                        {testResults[`custom-${endpoint.id}`].latency}ms
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !showAddCustom && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <div className="text-4xl mb-3">🔗</div>
            <p className="text-muted-foreground mb-4">No custom endpoints configured</p>
            <button
              onClick={() => setShowAddCustom(true)}
              className="px-4 py-2 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-700 dark:text-gold-300 text-xs font-bold hover:bg-gold-500/20 transition-colors"
            >
              + Add First Custom Endpoint
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-8 border-t-2 border-border">
        <div className="text-xs text-muted-foreground font-bold">
          All API keys are stored locally in your browser&apos;s secure storage.
        </div>
        <div className="flex gap-3">
          <button
            onClick={runAllTests}
            disabled={testing === 'all'}
            className="px-8 py-3 bg-primary text-primary-foreground text-sm font-black uppercase tracking-wider rounded-lg border-2 border-primary hover:bg-accent hover:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-flat-gold hover:shadow-flat-lg active:translate-y-[1px]"
          >
            {testing === 'all' ? 'Testing All Connections...' : 'Test All Connections'}
          </button>
        </div>
       </div>

       {showPermissionModal && (
         <FileAccessPermissionModal
           isOpen={showPermissionModal}
           onClose={() => setShowPermissionModal(false)}
           requestedAction={requestedAction}
         />
       )}
     </div>
   );
 };

export default SettingsPage;
