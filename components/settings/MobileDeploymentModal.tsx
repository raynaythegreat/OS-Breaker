'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SecureStorage } from '@/lib/secureStorage';

interface DeploymentStep {
  number: number;
  label: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
}

function getActionItemsFromError(errorMsg: string): string[] {
  const actions: string[] = [];
  
  if (errorMsg.includes('ngrok') || errorMsg.includes('tunnel')) {
    if (errorMsg.includes('not found') || errorMsg.includes('CLI')) {
      actions.push('Install ngrok: npm install -g ngrok');
    }
    if (errorMsg.includes('authentication') || errorMsg.includes('401') || errorMsg.includes('Invalid')) {
      actions.push('Verify ngrok API key in Settings');
      actions.push('Check key at: https://dashboard.ngrok.com/api-keys');
    }
    actions.push('Try manual command: ngrok http 3456');
  } else if (errorMsg.includes('401') || errorMsg.includes('403')) {
    actions.push('Check Vercel API key in Settings');
    actions.push('Verify ngrok API key');
    actions.push('Check GitHub token has repo scope');
    actions.push('Verify tokens at: https://vercel.com/account/settings/tokens');
  } else if (errorMsg.includes('404')) {
    actions.push('Verify repository format: owner/repo');
    actions.push('Check if repository exists on GitHub');
    actions.push('Ensure repository is public or you have access');
  } else if (errorMsg.includes('repoId') || errorMsg.includes('repo')) {
    actions.push('Ensure repository is connected to Vercel');
    actions.push('Check GitHub token permissions');
    actions.push('Verify repository is accessible');
  } else if (errorMsg.includes('timeout')) {
    actions.push('Ensure local OS Athena is running on port 3456');
    actions.push('Try restarting the tunnel');
  }
  
  if (actions.length === 0) {
    actions.push('Check browser console for detailed error logs');
    actions.push('Verify all API keys are configured in Settings');
    actions.push('Ensure local OS Athena is running');
  }
  
  return actions;
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
  type?: string;
  actionItems?: string[];
}

interface MobileDeploymentModalProps {
  open: boolean;
  onClose: () => void;
  onDeploy: (params: {
    repository: string;
    password: string;
    branch?: string;
  }) => Promise<DeploymentResult>;
  preForkedRepo?: string;
}

type DeploymentState = 'idle' | 'creating_tunnel' | 'deploying' | 'building' | 'ready' | 'active' | 'error';

type LogEntry = {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error';
};

interface MobileDeploymentInfo {
  tunnelId?: string;
  publicUrl?: string;
  mobileUrl?: string;
  deploymentId?: string;
  createdAt?: string;
  activatedAt?: string;
}

const STEPS: DeploymentStep[] = [
  { number: 1, label: 'Validating API keys...', status: 'pending' },
  { number: 2, label: 'Creating persistent ngrok tunnel...', status: 'pending' },
  { number: 3, label: 'Verifying mobile webapp repository...', status: 'pending' },
  { number: 4, label: 'Deploying to Vercel...', status: 'pending' },
  { number: 5, label: 'Configuring environment variables...', status: 'pending' },
];

function saveDeploymentInfo(mobileUrl?: string | null, publicUrl?: string | null): void {
  if (!mobileUrl) {
    console.warn('No mobile URL provided to save');
    return;
  }
  
  const deploymentInfo: MobileDeploymentInfo = {
    mobileUrl,
    publicUrl: publicUrl || undefined,
    createdAt: new Date().toISOString()
  };
  
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mobile-deployment', JSON.stringify(deploymentInfo));
      console.log('Mobile deployment saved to session storage:', deploymentInfo);
      alert('Deployment information saved to session storage!');
    }
  } catch (error) {
    console.error('Failed to save deployment info:', error);
  }
}

function addToChatHistory(mobileUrl?: string | null, publicUrl?: string | null): void {
  if (!mobileUrl) {
    console.warn('No mobile URL provided to add to chat');
    return;
  }
  
  const message = `Mobile app deployed to: ${mobileUrl}`;
  
  try {
    // Store in session storage for chat to pick up
    if (typeof window !== 'undefined') {
      const deploymentInfo: MobileDeploymentInfo & { timestamp: number } = {
        mobileUrl,
        publicUrl: publicUrl || undefined,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      sessionStorage.setItem('mobile-deployment-chat', JSON.stringify(deploymentInfo));
      console.log('Mobile deployment added to chat history:', deploymentInfo);
      alert('Deployment URL added to chat history!');
    }
  } catch (error) {
    console.error('Failed to add to chat history:', error);
  }
}

export default function MobileDeploymentModal({
  open,
  onClose,
  onDeploy,
  preForkedRepo,
}: MobileDeploymentModalProps) {
  const [repository, setRepository] = useState(preForkedRepo || 'Raynaythegreat/OS-Athena');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [branch, setBranch] = useState('main');
  const [userRepositories, setUserRepositories] = useState<any[]>([]);
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [detectedFork, setDetectedFork] = useState<string | null>(null);
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
      setRepository(preForkedRepo || 'Raynaythegreat/OS-Athena');
      setBranch('main');
    }
  }, [open, preForkedRepo]);

  // Fetch user's repositories and detect fork when modal opens
  useEffect(() => {
    if (open && prerequisites.github) {
      (async () => {
        try {
          const githubToken = await SecureStorage.getKey('github');
          if (githubToken) {
            const { GitHubService } = await import('@/services/github');
            const github = new GitHubService(githubToken);

            // Check for existing fork of OS-Athena
            const fork = await github.findForkOfRepository('Raynaythegreat/OS-Athena');
            if (fork) {
              setDetectedFork(fork);
              if (!preForkedRepo) {
                setRepository(fork);
              }
            }

            // Load user's repositories for dropdown
            const repos = await github.listRepositories();
            setUserRepositories(repos);
          }
        } catch (error) {
          console.error('Failed to load repositories:', error);
        }
      })();
    }
  }, [open, prerequisites.github, preForkedRepo]);

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
        // Use Electron API if available, otherwise window.open
        if (window.electronAPI?.openExternalUrl) {
          window.electronAPI.openExternalUrl(vercelUrl);
        } else {
          window.open(vercelUrl, '_blank', 'noopener,noreferrer');
        }
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
      const deploymentResponse = (err as any)?.response || err;
      const errorType = deploymentResponse?.type;
      const actionItems: string[] = deploymentResponse?.actionItems || getActionItemsFromError(errorMsg);
      
      setError(`${errorMsg}${actionItems.length > 0 ? '\n\nAction items:\n' + actionItems.join('\n') : ''}`);
      setResult({ success: false, error: errorMsg, type: errorType });
      setDeploymentState('error');
      addLog(`✗ ${errorMsg}`, 'error');
      if (actionItems.length > 0) {
        actionItems.forEach(item => addLog(`  → ${item}`, 'info'));
      }
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

          <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Single Repository Deployment
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Mobile is now deployed from your OS-Athena fork. The same repository powers both desktop and mobile!
                  <br />
                  <a
                    href="https://github.com/Raynaythegreat/OS-Athena"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-800 dark:text-blue-200 hover:underline font-medium"
                  >
                    Fork OS-Athena →
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

              {/* Fork detected badge */}
              {detectedFork && (
                <div className="mb-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-xs text-green-700 dark:text-green-300">
                    Using your fork: {detectedFork}
                  </span>
                </div>
              )}

              {/* Repository input with dropdown */}
              <div className="relative">
                <input
                  id="repository"
                  type="text"
                  value={repository}
                  onChange={(e) => {
                    setRepository(e.target.value);
                    setShowRepoDropdown(true);
                  }}
                  onFocus={() => userRepositories.length > 0 && setShowRepoDropdown(true)}
                  onBlur={() => setTimeout(() => setShowRepoDropdown(false), 200)}
                  placeholder="owner/repo (e.g., yourusername/os-athena-mobile)"
                  className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                  disabled={deploying}
                  autoComplete="off"
                />

                {/* Repository dropdown */}
                {showRepoDropdown && !deploying && userRepositories.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {userRepositories
                      .filter(r =>
                        r.full_name.toLowerCase().includes(repository.toLowerCase()) ||
                        r.name.toLowerCase().includes(repository.toLowerCase())
                      )
                      .slice(0, 15)
                      .map(repo => (
                        <button
                          key={repo.full_name}
                          type="button"
                          onClick={() => {
                            setRepository(repo.full_name);
                            setShowRepoDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-between border-b border-surface-100 dark:border-surface-800 last:border-0"
                        >
                          <span className="text-sm text-surface-900 dark:text-white">{repo.full_name}</span>
                          <div className="flex items-center gap-2">
                            {repo.private && (
                              <svg className="w-3 h-3 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            )}
                            {repo.fork && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-500 rounded">fork</span>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        addLog('Checking for .env.local file...', 'info');
                        const response = await fetch('/api/env/local');
                        const data = await response.json();
                        
                        if (data.success && data.env) {
                          const env = data.env;
                          
                          // Auto-fill from common env vars
                          if (env.MOBILE_REPOSITORY) {
                            setRepository(env.MOBILE_REPOSITORY);
                            addLog(`✓ Auto-filled repository from env.local`, 'success');
                          } else if (env.REPOSITORY) {
                            setRepository(env.REPOSITORY);
                            addLog(`✓ Auto-filled repository from env.local`, 'success');
                          }
                          
                          if (env.MOBILE_BRANCH) {
                            setBranch(env.MOBILE_BRANCH);
                            addLog(`✓ Auto-filled branch from env.local`, 'success');
                          }
                          
                          if (!data.env.MOBILE_REPOSITORY && !data.env.REPOSITORY && !data.env.MOBILE_BRANCH) {
                            addLog('⚠ No deployment settings found in env.local. Add MOBILE_REPOSITORY or MOBILE_BRANCH', 'info');
                          }
                        } else {
                          addLog('⚠ .env.local not found or empty', 'info');
                        }
                      } catch (err) {
                        addLog(`✗ Failed to read env.local: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
                      }
                    }}
                    className="inline-flex px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-300 hover:text-white rounded transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Auto-Fill from env.local
                  </button>
                  
                  {repository && (
                    <button
                      type="button"
                      onClick={() => {
                        setRepository('');
                        addLog('Cleared repository input', 'info');
                      }}
                      className="inline-flex px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/20 hover:bg-red-500 dark:hover:bg-red-600 text-red-700 dark:text-red-300 hover:text-white rounded transition-colors"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  )}
                </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Access Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password for mobile access"
                  className="w-full px-4 py-2 pr-10 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                  disabled={deploying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-400"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
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
                className="w-full px-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-surface-900 text-surface-900 dark:text-white"
                disabled={deploying}
              />
            </div>

            {prerequisites.ngrok && prerequisites.vercel && prerequisites.github ? (
              <button
                type="submit"
                disabled={deploying || !password.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <div className="space-y-2">
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
                      
                      {/* Save deployment info section */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveDeploymentInfo(vercelUrl, result.tunnel?.public_url)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                          </svg>
                          Save to Session
                        </button>
                        
                        <button
                          onClick={() => addToChatHistory(vercelUrl, result.tunnel?.public_url)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Add to Chat
                        </button>
                      </div>
                    </div>
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
