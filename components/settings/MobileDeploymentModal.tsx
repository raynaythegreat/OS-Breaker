'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SecureStorage } from '@/lib/secureStorage';

interface DeploymentStep {
  number: number;
  label: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
}

interface DeploymentResult {
  success: boolean;
  tunnel?: {
    id: string;
    public_url: string;
  };
  deployment?: {
    url: string;
    deploymentId: string;
  };
  mobileUrl?: string;
  error?: string;
}

interface MobileDeploymentModalProps {
  open: boolean;
  onClose: () => void;
  onDeploy: (params: {
    repository: string;
    password: string;
    branch?: string;
  }) => Promise<DeploymentResult>;
}

const STEPS: DeploymentStep[] = [
  { number: 1, label: 'Validating API keys...', status: 'pending' },
  { number: 2, label: 'Creating persistent ngrok tunnel...', status: 'pending' },
  { number: 3, label: 'Verifying mobile webapp repository...', status: 'pending' },
  { number: 4, label: 'Deploying to Vercel...', status: 'pending' },
  { number: 5, label: 'Configuring environment variables...', status: 'pending' },
];

type DeploymentState = 'idle' | 'creating_tunnel' | 'deploying' | 'building' | 'ready' | 'error' | 'active';

interface LogEntry {
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface DeploymentProgress {
  state: DeploymentState;
  deploymentId: string | null;
  logs: LogEntry[];
  vercelUrl: string | null;
  tunnelUrl: string | null;
  startedAt: number;
  readyAt?: number;
}

export default function MobileDeploymentModal({
  open,
  onClose,
  onDeploy,
}: MobileDeploymentModalProps) {
  const [repository, setRepository] = useState('os-athena-mobile');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('main');
  const [deploying, setDeploying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<DeploymentStep[]>([]);
  const [result, setResult] = useState<DeploymentResult | null>(null);
  const [error, setError] = useState('');
  const [prerequisites, setPrerequisites] = useState<{
    ngrok: boolean;
    vercel: boolean;
    github: boolean;
  }>({ ngrok: false, vercel: false, github: false });
  const [deploymentState, setDeploymentState] = useState<DeploymentState>('idle');
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  const pollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev.slice(-199), { // Keep last 200 logs
      timestamp: Date.now(),
      message,
      type
    }]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (open) {
      checkPrerequisites();
      setSteps(STEPS.map(step => ({ ...step, status: 'pending' as const })));
      setCurrentStep(0);
      setResult(null);
      setError('');
      setPassword('');
      setRepository('os-athena-mobile');
      setBranch('main');
    }
  }, [open]);

  const checkPrerequisites = async () => {
    try {
      const keys = await SecureStorage.loadKeys();
      setPrerequisites({
        ngrok: Boolean(keys.ngrok && keys.ngrok.trim()),
        vercel: Boolean(keys.vercel && keys.vercel.trim()),
        github: Boolean(keys.github && keys.github.trim()),
      });
    } catch (err) {
      console.error('Failed to check prerequisites:', err);
      setPrerequisites({ ngrok: false, vercel: false, github: false });
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!repository || !repository.trim()) {
      setError('Repository is required');
      return;
    }

    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (!prerequisites.ngrok || !prerequisites.vercel || !prerequisites.github) {
      setError('Please configure Ngrok, Vercel, and GitHub API keys in Settings first');
      return;
    }

    setDeploying(true);
    setError('');
    try {
      // Step 1: Preparing
      setCurrentStep(1);
      setSteps(prev => prev.map((s, i) => i === 0 ? {...s, status: 'in-progress'} : s));

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Calling API
      setSteps(prev => prev.map((s, i) =>
        i === 0 ? {...s, status: 'complete'} :
        i === 1 ? {...s, status: 'in-progress'} : s
      ));
      setCurrentStep(2);

      const deployResult = await onDeploy({ repository, password, branch });

      // Step 3: Creating tunnel (only if deploy succeeded)
      if (deployResult.success && deployResult.tunnel) {
        setSteps(prev => prev.map((s, i) =>
          i === 1 ? {...s, status: 'complete'} :
          i === 2 ? {...s, status: 'in-progress'} : s
        ));
        setCurrentStep(3);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 4: Deploying to Vercel
        setSteps(prev => prev.map((s, i) =>
          i === 2 ? {...s, status: 'complete'} :
          i === 3 ? {...s, status: 'in-progress'} : s
        ));
        setCurrentStep(4);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Step 5: Complete
        setSteps(prev => prev.map((s, i) =>
          i === 3 ? {...s, status: 'complete'} :
          i === 4 ? {...s, status: 'in-progress'} : s
        ));
        setCurrentStep(5);
        await new Promise(resolve => setTimeout(resolve, 300));

        setSteps(prev => prev.map(s => ({...s, status: 'complete'})));
        setResult(deployResult);
      } else {
        throw new Error(deployResult.error || 'Deployment failed - no tunnel or deployment URL returned');
      }
    } catch (err) {
      console.error('Deployment error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMsg);
      setResult({ success: false, error: errorMsg });

      // Fix error state - mark the CURRENT step as failed
      setSteps(prev => prev.map((step, idx) => {
        if (idx < currentStep - 1) return { ...step, status: 'complete' };
        if (idx === currentStep - 1) return { ...step, status: 'error' };  // Current step
        return step;
      }));
    } finally {
      setDeploying(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? 'bg-black/50 backdrop-blur-sm' : 'hidden'}`}>
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-surface-900 dark:text-white">
              Launch Mobile Version to Vercel
            </h2>
            <button
              onClick={onClose}
              className="text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-400 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12 12 12M6 6v6h12v-6H6z" />
              </svg>
            </button>
          </div>

          <p className="text-surface-600 dark:text-surface-400 mb-6">
            Deploy a simplified mobile version to Vercel that connects back to your local OS Athena.
            Tunnels persist across app restarts and all processing happens locally.
          </p>

          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-3.71V7.291c0-2.042-1.962-3.71-3.502-3.71H5.291c-1.54 0-2.502 1.667-2.502-3.71V14.5c0 2.042 1.962 3.71 3.502 3.71h6.938c1.54 0 2.502 1.667 2.502 3.71v-4.25" />
              </svg>
              <div>
                <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  🔒 For Privacy: Use Your Own Repository
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Deploy from your own private copy instead of the original repository.
                  <br />
                  <a
                    href="https://github.com/raynaythegreat/OS-Athena-Mobile"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-800 dark:text-amber-200 hover:underline font-medium"
                  >
                    Fork or copy repository →
                  </a>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleDeploy} className="space-y-6">
            <div>
              <label htmlFor="repository" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Mobile Webapp Repository
              </label>
              <input
                id="repository"
                type="text"
                value={repository}
                onChange={(e) => setRepository(e.target.value)}
                placeholder="owner/repo (e.g., yourusername/os-athena-mobile)"
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                disabled={deploying}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Access Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for mobile access"
                  className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                  disabled={deploying}
                />
              </div>
            </div>

            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Branch (optional)
              </label>
              <input
                id="branch"
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                disabled={deploying}
              />
            </div>

            {prerequisites.ngrok && prerequisites.vercel && prerequisites.github ? (
              <button
                type="submit"
                disabled={deploying || !password.trim()}
                className="w-full bg-gold-500 hover:bg-gold-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deploying ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8 8 0 018 8 0 00-16 0 0 008 0zm0 0a8 8 0 018 8 0 018 8 0 00-16 0 0 008 0z"></path>
                    </svg>
                    <span>Deploying...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825C10.2364 21 6 17.7636 21 6H12.25C6.8364 21 3.2364 21 3.2364 17.7636 21 3H3V12.25C3 6.8364 6.2364 6 9.75 6C6.2364 11.1636 6.8364 15 12.25 15H15M4.5 9.5L9.75 14.25M10.25 14.25H9V15H10.25V16H9V16.75H10.25V18H9V18.75H10.25V21H9V21.75H10.25V24H9Z" />
                    </svg>
                    <span>Launch Mobile Version</span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-3.71V7.291c0-2.042-1.962-3.71-3.502-3.71H5.291c-1.54 0-2.502 1.667-2.502-3.71V14.5c0 2.042 1.962 3.71 3.502 3.71h6.938c1.54 0 2.502 1.667 2.502 3.71v-4.25" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Prerequisites Not Met</h3>
                    <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                      {!prerequisites.ngrok && (
                        <li>Ngrok API key - Configure in Settings</li>
                      )}
                      {!prerequisites.vercel && (
                        <li>Vercel API key - Configure in Settings</li>
                      )}
                      {!prerequisites.github && (
                        <li>GitHub Token - Configure in Settings</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </form>

          {deploying && currentStep > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="h-2 w-full bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        currentStep >= 1 ? 'bg-gold-500' : 'bg-surface-300 dark:bg-surface-600'
                      }`}
                      style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-surface-700 dark:text-surface-300 w-16">
                  Step {currentStep}/{STEPS.length}
                </span>
              </div>

              {steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.status === 'complete' ? 'bg-green-500' :
                    step.status === 'in-progress' ? 'bg-gold-500' :
                    step.status === 'error' ? 'bg-red-500' : 'bg-surface-300 dark:bg-surface-600'
                  }`}>
                    {step.status === 'in-progress' && (
                      <svg className="animate-spin w-3 h-3 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8 8 8 0 018 8 0 00-16 0 0 008 0zm0 0a8 8 0 018 8 0 018 8 0 00-16 0 0 008 0z"></path>
                      </svg>
                    )}
                    {step.status === 'complete' && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L5 5l7 7m0 0l7 7" />
                      </svg>
                    )}
                    {step.status === 'error' && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12 12 12M6 6v6h12v-6H6z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.status === 'complete' ? 'text-green-700 dark:text-green-400' :
                      step.status === 'error' ? 'text-red-700 dark:text-red-400' : 'text-surface-700 dark:text-surface-300'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-3.71V7.291c0-2.042-1.962-3.71-3.502-3.71H5.291c-1.54 0-2.502 1.667-2.502-3.71V14.5c0 2.042 1.962 3.71 3.502 3.71h6.938c1.54 0 2.502 1.667 2.502 3.71v-4.25" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Deployment Failed</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && result.success && (
            <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L5 5l7 7m0 0l7 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                  Deployment Complete!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-400 mb-6">
                  Your mobile webapp has been deployed and is ready to use.
                </p>

                <div className="bg-white dark:bg-surface-800 rounded-lg p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                      Mobile URL
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.mobileUrl!);
                      }}
                      className="text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 text-sm font-medium flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      {result.mobileUrl}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 00-2 2v-6h12a2 2 0 00-2 2 12 0 0 012 0z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                      Tunnel URL
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.tunnel?.public_url || '');
                      }}
                      className="text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 text-sm font-medium flex items-center gap-1"
                      title="Copy to clipboard"
                    >
                      {result.tunnel?.public_url || ''}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 00-2 2v-6h12a2 2 0 00-2 2 12 0 0 012 0z" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
                      Tunnel ID
                    </span>
                    <span className="text-surface-900 dark:text-white font-mono text-sm">
                      {result.tunnel?.id || ''}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4H6v8a2 2 0 00-2 2h12v8a2 2 0 00-2 2-12 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                        Tunnel will persist
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        This tunnel will stay active across app restarts and will not be auto-closed.
                        Open OS Athena Settings to stop mobile access when needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => window.open(result.mobileUrl!, '_blank')}
                    className="flex-1 bg-gold-500 hover:bg-gold-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H9a6 6 0 00-6 6v12a6 6 0 00-6 12 0zm0 0a10 10 0 0110-12 0zm0 8a8 8 0 00-16 0zm0 0a10 10 0 0011.5 12a8 8 0 0016 0z" />
                    </svg>
                    <span>Open Mobile App</span>
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.mobileUrl!);
                    }}
                    className="px-4 py-3 border-2 border-surface-300 dark:border-surface-600 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 text-surface-700 dark:text-surface-300 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 00-2 2v-6h12a2 2 0 00-2 2 12 0z" />
                    </svg>
                    <span>Copy URL</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
