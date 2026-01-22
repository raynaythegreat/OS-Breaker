"use client";

import React, { useState, useEffect } from 'react';
import { ApiTester, TestResult } from '@/services/apiTester';

interface ApiKeys {
  anthropic: string;
  openai: string;
  groq: string;
  ollamaBaseUrl: string;
  // Add others as needed
}

const SettingsPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    anthropic: '',
    openai: '',
    groq: '',
    ollamaBaseUrl: 'http://localhost:11434',
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api-keys');
    if (saved) {
      setApiKeys(JSON.parse(saved));
    }
  }, []);

  // Auto-save
  useEffect(() => {
    localStorage.setItem('api-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const updateKey = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const runTest = async (provider: string) => {
    setTesting(provider);
    let result: TestResult;
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
      case 'ollama':
        result = await ApiTester.testOllama(apiKeys.ollamaBaseUrl);
        break;
      default:
        result = { status: 'error', message: 'Test not implemented' };
    }
    setTestResults(prev => ({ ...prev, [provider]: result }));
    setTesting(null);
  };

  const runAllTests = async () => {
    setTesting('all');
    const providers = ['anthropic', 'openai', 'groq', 'ollama'];
    const results: Record<string, TestResult> = {};
    for (const provider of providers) {
      await runTest(provider);
    }
    setTesting(null);
  };

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-12 bg-background">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Configuration & API Keys</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold text-foreground mb-2">Cloud Providers</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Configure your AI model providers. Your keys are stored locally in your browser and never shared.
          </p>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {[
            { key: 'anthropic', label: 'Anthropic AI', placeholder: 'sk-ant-...', icon: 'A' },
            { key: 'openai', label: 'OpenAI', placeholder: 'sk-...', icon: 'O' },
            { key: 'groq', label: 'Groq', placeholder: 'gsk_...', icon: 'G' },
          ].map(({ key, label, placeholder, icon }) => (
            <div key={key} className="group p-6 rounded-2xl bg-card border border-border hover:border-gold-500/30 transition-all shadow-lovable dark:shadow-lovable-dark">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center font-bold border border-gold-500/20">
                  {icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">{label}</h3>
                  <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">API Configuration</div>
                </div>
                <button
                  onClick={() => runTest(key)}
                  disabled={testing === key || testing === 'all'}
                  className="px-3 py-1.5 bg-surface-100 dark:bg-surface-900 text-foreground text-xs font-medium rounded-lg border border-border hover:border-gold-500/50 disabled:opacity-50 transition-colors"
                >
                  {testing === key ? 'Testing...' : 'Test'}
                </button>
              </div>

              <div className="space-y-1">
                <input
                  type="password"
                  value={apiKeys[key as keyof ApiKeys]}
                  onChange={(e) => updateKey(key as keyof ApiKeys, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-100 dark:bg-surface-900 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 transition-colors font-mono text-sm"
                />
              </div>

              {testResults[key] && (
                <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg border ${testResults[key].status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${testResults[key].status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{testResults[key].message}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border/50" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold text-foreground mb-2">Local Infrastructure</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Run open-source models locally on your machine using Ollama.
          </p>
        </div>

        <div className="lg:col-span-2">
          <div className="p-6 rounded-2xl bg-card border border-border hover:border-gold-500/30 transition-all shadow-lovable dark:shadow-lovable-dark">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-500 flex items-center justify-center font-bold border border-gold-500/20">
                L
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">Ollama (Local)</h3>
                <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">Instance Configuration</div>
              </div>
              <button
                onClick={() => runTest('ollama')}
                disabled={testing === 'ollama' || testing === 'all'}
                className="px-4 py-2 bg-secondary text-foreground text-xs font-bold uppercase tracking-widest rounded-lg border border-border hover:border-gold-500/50 disabled:opacity-50 transition-all"
              >
                {testing === 'ollama' ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1 mb-2 block">Base URL</label>
              <input
                type="text"
                value={apiKeys.ollamaBaseUrl}
                onChange={(e) => updateKey('ollamaBaseUrl', e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:ring-4 focus:ring-gold-500/5 focus:border-gold-500/50 transition-all font-mono text-sm"
              />
            </div>

            {testResults.ollama && (
              <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg border ${testResults.ollama.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${testResults.ollama.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{testResults.ollama.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-8 border-t border-border gap-3">
        <button
          onClick={async () => {
            if (typeof window !== 'undefined' && (window as any).electronAPI) {
              try {
                const result = await (window as any).electronAPI.createDesktopEntry();
                alert(result.message);
              } catch (error) {
                alert('Failed to create desktop entry: ' + error);
              }
            }
          }}
          className="px-6 py-3 bg-surface-100 dark:bg-surface-900 text-foreground text-xs font-medium rounded-lg border border-gold-500/20 hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors"
        >
          Create Desktop Entry
        </button>
        <button
          onClick={runAllTests}
          disabled={testing === 'all'}
          className="px-8 py-3 bg-gold-500 text-white text-xs font-bold uppercase tracking-[0.2em] rounded-lg hover:bg-gold-600 disabled:opacity-50 transition-colors shadow-lg shadow-gold-500/20 active:scale-95"
        >
          {testing === 'all' ? 'Verifying Connections...' : 'Verify All Connections'}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;