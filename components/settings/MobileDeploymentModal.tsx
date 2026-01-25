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

  const pollDeploymentEvents = useCallback(async (depId: string) => {
    try {
      const response = await fetch(`/api/vercel/deployments/${depId}/events`);

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();

      // Parse Vercel events into log entries
      if (Array.isArray(data)) {
        data.forEach((event: any) => {
          if (event.type === 'stdout' || event.type === 'stderr') {
            const message = event.payload?.text || event.text || '';
            if (message.trim()) {
              addLog(message.trim(), event.type === 'stderr' ? 'error' : 'info');
            }
          }
        });
      }

      // Check deployment status
      const statusResponse = await fetch(`/api/vercel/deployments/${depId}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const state = statusData.readyState || statusData.state;

        if (state === 'READY') {
          setDeploymentState('ready');
          addLog('✓ Deployment complete!', 'success');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (state === 'ERROR' || state === 'CANCELED') {
          setDeploymentState('error');
          addLog(`✗ Deployment failed: ${state}`, 'error');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (state === 'BUILDING') {
          setDeploymentState('building');
        }
      }
    } catch (error) {
      console.error('Poll events error:', error);
      addLog(`Warning: Failed to fetch deployment status`, 'error');
    }
  }, [addLog]);

  useEffect(() => {
    if (deploymentState === 'ready' && vercelUrl && !hasAutoOpened) {
      // Wait 1 second before opening
      const timer = setTimeout(() => {
        addLog(`Opening ${vercelUrl} in new tab...`, 'success');
        window.open(vercelUrl, '_blank', 'noopener,noreferrer');
        setHasAutoOpened(true);
        setDeploymentState('active');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [deploymentState, vercelUrl, hasAutoOpened, addLog]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

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
    setResult(null);
    setLogs([]);
    setHasAutoOpened(false);
    setDeploymentState('creating_tunnel');

    addLog('Starting mobile deployment...', 'info');
    addLog('Creating ngrok tunnel...', 'info');

    try {
      const deployResult = await onDeploy({ repository, password, branch });

      if (deployResult.success && deployResult.tunnel) {
        addLog(`✓ Tunnel created: ${deployResult.tunnel.id}`, 'success');
        addLog(`Deploying to Vercel...`, 'info');

        setDeploymentState('deploying');
        setVercelUrl(deployResult.mobileUrl || deployResult.deployment?.url || null);

        const depId = deployResult.deployment?.deploymentId;
        if (depId) {
          setDeploymentId(depId);
          setDeploymentState('building');
          addLog('Fetching build logs...', 'info');

          // Start polling
          pollIntervalRef.current = setInterval(() => {
            pollDeploymentEvents(depId);
          }, 2000);

          // Initial poll
          pollDeploymentEvents(depId);
        } else {
          addLog('Warning: No deployment ID received, cannot track progress', 'error');
        }

        setResult(deployResult);
      } else {
        throw new Error(deployResult.error || 'Deployment failed - no tunnel or deployment URL returned');
      }
    } catch (err) {
      console.error('Deployment error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Deployment failed';
      setError(errorMsg);
      setResult({ success: false, error: errorMsg });
      setDeploymentState('error');
      addLog(`✗ ${errorMsg}`, 'error');
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

          {/* Deployment Progress - Log Viewer */}
          {deploying && (
            <div className="mt-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                  deploymentState === 'ready' || deploymentState === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : deploymentState === 'error'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                }`}>
                  {(deploymentState === 'building' || deploymentState === 'deploying' || deploymentState === 'creating_tunnel') && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {deploymentState === 'creating_tunnel' && 'Creating Tunnel...'}
                  {deploymentState === 'deploying' && 'Deploying...'}
                  {deploymentState === 'building' && 'Building...'}
                  {deploymentState === 'ready' && '✓ Ready'}
                  {deploymentState === 'active' && '✓ Active'}
                  {deploymentState === 'error' && '✗ Error'}
                </div>
              </div>

              {/* Build Logs Panel */}
              <div className="bg-black dark:bg-surface-950 rounded-lg border border-surface-700 overflow-hidden">
                <div className="px-4 py-2 bg-surface-800 border-b border-surface-700 flex items-center justify-between">
                  <span className="text-xs font-medium text-surface-300">Build Logs</span>
                  <span className="text-xs text-surface-500">{logs.length} entries</span>
                </div>
                <div className="p-3 font-mono text-xs overflow-y-auto max-h-96 space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-surface-500">Waiting for logs...</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${
                          log.type === 'error'
                            ? 'text-red-400'
                            : log.type === 'success'
                            ? 'text-green-400'
                            : 'text-surface-300'
                        }`}
                      >
                        {log.message}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* View on Vercel Link */}
              {deploymentId && (
                <a
                  href={`https://vercel.com/deployments/${deploymentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View on Vercel
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {error && !deploying && (
            <div className="space-y-3">
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

              {/* Show logs on error too */}
              {logs.length > 0 && (
                <details className="bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-800">
                  <summary className="px-4 py-2 cursor-pointer font-medium text-sm text-surface-700 dark:text-surface-300">
                    View Deployment Logs
                  </summary>
                  <div className="p-3 font-mono text-xs max-h-64 overflow-y-auto space-y-1 bg-black dark:bg-surface-950">
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${
                          log.type === 'error'
                            ? 'text-red-400'
                            : log.type === 'success'
                            ? 'text-green-400'
                            : 'text-surface-300'
                        }`}
                      >
                        {log.message}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {!deploying && result?.success && (
            <div className="mt-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Deployment Complete!
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Your mobile site has been deployed and opened in a new tab.
                  </p>
                  {vercelUrl && (
                    <a
                      href={vercelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 hover:underline"
                    >
                      {vercelUrl}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
