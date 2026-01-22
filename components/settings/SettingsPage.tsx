"use client";

import React, { useState, useEffect } from 'react';
import { ApiTester, TestResult } from '@/services/apiTester';

interface ApiKeys {
  anthropic: string;
  openai: string;
  groq: string;
  openrouter: string;
  fireworks: string;
  gemini: string;
  github: string;
  vercel: string;
  render: string;
  ollamaBaseUrl: string;
}

interface ProviderConfig {
  key: keyof ApiKeys;
  label: string;
  placeholder: string;
  icon: string;
  category: 'ai' | 'deployment' | 'local';
  description?: string;
}

const providers: ProviderConfig[] = [
  // AI Providers
  { key: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', icon: '🤖', category: 'ai', description: 'Claude 3.5 Sonnet & Opus' },
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-...', icon: '🔮', category: 'ai', description: 'GPT-4, GPT-4o, GPT-3.5' },
  { key: 'groq', label: 'Groq', placeholder: 'gsk_...', icon: '⚡', category: 'ai', description: 'Ultra-fast LLM inference' },
  { key: 'openrouter', label: 'OpenRouter', placeholder: 'sk-or-v1-...', icon: '🌐', category: 'ai', description: 'Access 100+ models' },
  { key: 'fireworks', label: 'Fireworks AI', placeholder: 'fw_...', icon: '🎆', category: 'ai', description: 'Fast inference platform' },
  { key: 'gemini', label: 'Google Gemini', placeholder: 'AIza...', icon: '💎', category: 'ai', description: 'Gemini Pro & Ultra' },

  // Development Tools
  { key: 'github', label: 'GitHub', placeholder: 'ghp_...', icon: '📦', category: 'deployment', description: 'Repository management' },
  { key: 'vercel', label: 'Vercel', placeholder: 'vercel_...', icon: '▲', category: 'deployment', description: 'One-click deployments' },
  { key: 'render', label: 'Render', placeholder: 'rnd_...', icon: '🚀', category: 'deployment', description: 'Cloud deployment platform' },
];

const SettingsPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    anthropic: '',
    openai: '',
    groq: '',
    openrouter: '',
    fireworks: '',
    gemini: '',
    github: '',
    vercel: '',
    render: '',
    ollamaBaseUrl: 'http://localhost:11434',
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
  }, []);

  // Auto-save to localStorage whenever keys change
  useEffect(() => {
    localStorage.setItem('api-keys', JSON.stringify(apiKeys));
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [apiKeys]);

  const updateKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
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

  const aiProviders = providers.filter(p => p.category === 'ai');
  const deploymentProviders = providers.filter(p => p.category === 'deployment');

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

      {/* AI Providers */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight">AI Providers</h2>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              Configure your AI model providers. Keys are stored locally and encrypted.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aiProviders.map(({ key, label, placeholder, icon, description }) => (
            <div
              key={key}
              className="group p-5 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl border-2 border-primary shadow-flat-gold">
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-black text-foreground text-sm">{label}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      {description}
                    </p>
                  </div>
                </div>
              </div>

              <input
                type="password"
                value={apiKeys[key]}
                onChange={(e) => updateKey(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 mb-3 rounded-lg border-2 border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-xs input-flat"
              />

              <button
                onClick={() => runTest(key)}
                disabled={testing === key || testing === 'all' || !apiKeys[key]}
                className="w-full px-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-flat-secondary"
              >
                {testing === key ? 'Testing...' : 'Test & Save'}
              </button>

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
          {deploymentProviders.map(({ key, label, placeholder, icon, description }) => (
            <div
              key={key}
              className="group p-5 rounded-lg bg-card border-2 border-border hover:border-primary transition-all shadow-flat card-flat-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xl border-2 border-primary shadow-flat-gold">
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-black text-foreground text-sm">{label}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      {description}
                    </p>
                  </div>
                </div>
              </div>

              <input
                type="password"
                value={apiKeys[key]}
                onChange={(e) => updateKey(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 mb-3 rounded-lg border-2 border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors font-mono text-xs input-flat"
              />

              <button
                onClick={() => runTest(key)}
                disabled={testing === key || testing === 'all' || !apiKeys[key]}
                className="w-full px-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg border-2 border-border hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-flat-secondary"
              >
                {testing === key ? 'Testing...' : 'Test & Save'}
              </button>

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
    </div>
  );
};

export default SettingsPage;
