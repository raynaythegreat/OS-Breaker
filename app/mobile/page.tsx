'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MobileDeploymentModal from '@/components/settings/MobileDeploymentModal';
import { SecureStorage } from '@/lib/secureStorage';
import NgrokQuickStatus from '@/components/mobile/NgrokQuickStatus';

interface TunnelStatus {
  active: boolean;
  url?: string;
  id?: string;
  recovering?: boolean;
  errorMessage?: string;
}

interface ApiKeys {
  [key: string]: string | null;
}

export default function MobilePage() {
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>({ active: false });
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [forkLoading, setForkLoading] = useState(false);
  const [forkError, setForkError] = useState('');
  const [forkSuccess, setForkSuccess] = useState('');
  const [forkedRepo, setForkedRepo] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ ngrok: null, vercel: null, github: null });

  const loadApiKeys = async () => {
    try {
      const { SecureStorage } = await import('@/lib/secureStorage');
      await SecureStorage.loadKeys();
      setApiKeys({
        ngrok: await SecureStorage.getKey('ngrok'),
        vercel: await SecureStorage.getKey('vercel'),
        github: await SecureStorage.getKey('github'),
      });
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  };

  const handleCopyForkRepo = async () => {
    const repoNameInput = document.getElementById('fork-repo-name') as HTMLInputElement;
    const repoName = repoNameInput?.value.trim();

    if (!repoName) {
      setForkError('Please enter a repository name');
      return;
    }

    setForkLoading(true);
    setForkError('');
    setForkSuccess('');

    try {
      const response = await fetch('/api/github/repos/raynaythegreat/os-athena-mobile/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: repoName,
          private: true, // Always create as private for security
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy repository');
      }

      // The API returns { repo: GitHubRepository } with full_name property
      const newRepoFullName = data.repo?.full_name || repoName;
      setForkSuccess(`Repository copied successfully! Use "${newRepoFullName}" in the deployment modal.`);
      // Set the forked repo to be used when modal opens
      setForkedRepo(newRepoFullName);
      // Reset the input
      repoNameInput.value = '';
    } catch (err) {
      console.error('Failed to copy repository:', err);
      setForkError(err instanceof Error ? err.message : 'Failed to copy repository');
    } finally {
      setForkLoading(false);
    }
  };

  const recoverTunnel = useCallback(async (deployment: any) => {
    try {
      // Parse the repository name to get project info
      const repository = deployment.repository || 'raynaythegreat/os-athena-mobile';
      const projectName = deployment.projectName || repository.split('/')?.[1] || 'os-athena-mobile';

      // Try to recover the tunnel
      const recoverResponse = await fetch('/api/mobile/recover-tunnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectName,
          repository: repository
        })
      });

      if (recoverResponse.ok) {
        const data = await recoverResponse.json();
        if (data.success && data.tunnel) {
          // Update localStorage with new tunnel info
          const updatedDeployment = {
            ...deployment,
            tunnelId: data.tunnel.id,
            publicUrl: data.tunnel.public_url,
          };
          localStorage.setItem('mobile-deployment', JSON.stringify(updatedDeployment));

          setTunnelStatus({
            active: true,
            url: data.tunnel.public_url,
            id: data.tunnel.id,
            recovering: false
          });
        } else {
          setTunnelStatus({
            active: false,
            recovering: false,
            errorMessage: data.error || 'Failed to recover tunnel'
          });
        }
      } else {
        const errorData = await recoverResponse.json().catch(() => ({}));
        setTunnelStatus({
          active: false,
          recovering: false,
          errorMessage: errorData.error || 'Failed to recover tunnel'
        });
      }
    } catch (error) {
      console.error('Failed to recover tunnel:', error);
      setTunnelStatus({
        active: false,
        recovering: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to recover tunnel'
      });
    }
  }, []);

  const checkTunnelStatus = useCallback(async () => {
    try {
      // Get deployment info from localStorage
      const storedDeployment = localStorage.getItem('mobile-deployment');
      if (storedDeployment) {
        const deployment = JSON.parse(storedDeployment);

        const response = await fetch('/api/mobile/status', {
          headers: {
            'x-mobile-active': 'true',
            'x-mobile-deployment-id': deployment.tunnelId || '',
            'x-mobile-public-url': deployment.publicUrl || '',
            'x-mobile-url': deployment.mobileUrl || ''
          }
        });

        if (response.ok) {
          const data = await response.json();

          // Check if tunnel was verified and found
          if (data.verified && !data.active) {
            // Tunnel was verified but not found - trigger auto-recovery
            console.log('Tunnel not found, attempting auto-recovery...');
            setTunnelStatus({
              active: false,
              recovering: true,
              errorMessage: 'Tunnel not found. Attempting to recover...'
            });

            await recoverTunnel(deployment);
          } else {
            setTunnelStatus({
              active: data.active || true,
              url: data.url || data.publicUrl,
              id: data.id || data.tunnelId,
            });
          }
        } else {
          setTunnelStatus({
            active: false,
            url: undefined,
            id: undefined
          });
        }
      } else {
        setTunnelStatus({
          active: false,
          url: undefined,
          id: undefined
        });
      }
    } catch (error) {
      console.error('Failed to check mobile status:', error);
    }
  }, [recoverTunnel]);

  useEffect(() => {
    checkTunnelStatus();
    loadApiKeys();
  }, [checkTunnelStatus]);

  const handleCopyUrl = async () => {
    if (tunnelStatus.url) {
      await navigator.clipboard.writeText(tunnelStatus.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStopTunnel = async () => {
    try {
      const deployment = JSON.parse(localStorage.getItem('mobile-deployment') || '{}');

      const response = await fetch('/api/mobile/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tunnelId: deployment.tunnelId  // Send tunnel ID
        })
      });

      if (response.ok) {
        // Clear deployment info from localStorage
        localStorage.removeItem('mobile-deployment');
        setTunnelStatus({ active: false, url: undefined, id: undefined });
      }
    } catch (error) {
      console.error('Failed to stop tunnel:', error);
    }
  };

  const handleDeploy = async (params: {
    repository: string;
    password: string;
    branch?: string;
  }) => {
    try {
      const response = await fetch('/api/mobile/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Deployment failed');
      }

      if (result.success && result.tunnel) {
        // Extract project name from repository
        const repoName = params.repository.split('/')?.[1] || 'os-athena-mobile';

        const deploymentInfo = {
          tunnelId: result.tunnel.id,
          publicUrl: result.tunnel.public_url,
          mobileUrl: result.mobileUrl,
          deploymentId: result.deployment?.deploymentId,
          repository: params.repository,
          projectName: repoName,
          activeAt: new Date().toISOString()
        };
        localStorage.setItem('mobile-deployment', JSON.stringify(deploymentInfo));

        setTunnelStatus({
          active: true,
          url: result.tunnel.public_url,
          id: result.tunnel.id,
        });
      } else if (result.error) {
        throw new Error(result.error);
      } else {
        throw new Error('Deployment failed - no response data');
      }

      return result;
    } catch (err) {
      console.error('Deploy error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Deployment failed';

      if (errorMessage.includes('Authentication')) {
        throw new Error('Authentication failed. Please verify your API keys in Settings.');
      } else if (errorMessage.includes('Repository not found')) {
        throw new Error('Repository not found. Please check the owner/repo format.');
      } else if (errorMessage.includes('resolve GitHub repository')) {
        throw new Error('Could not resolve GitHub repository. Ensure it exists and has been connected to Vercel at least once.');
      }

      throw err;
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface-50 dark:bg-black overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Mobile Access
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Access OS Athena from your mobile device via secure tunnel
          </p>
        </div>

        {/* API Key Requirements Card */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
            API Key Requirements
          </h2>
          <div className="space-y-2">
            {!apiKeys.ngrok ? (
              <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 2.502-3.71V7.291c0-2.042-1.962-3.71-3.502-3.71H5.291c-1.54 0-2.502 1.667-2.502 3.71v8.378c0 2.042 1.962 3.71 3.502 3.71z" />
                  </svg>
                  Ngrok API Key
                </span>
                <a
                  href="#settings"
                  onClick={() => {
                    // Scroll to settings or open modal
                    document.querySelector('[data-settings-page]')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Configure in Settings
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Ngrok API Key configured
              </div>
            )}
            {!apiKeys.vercel ? (
              <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Vercel API Key
                </span>
                <a
                  href="#settings"
                  onClick={() => {
                    document.querySelector('[data-settings-page]')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Configure in Settings
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Vercel API Key configured
              </div>
            )}
            {!apiKeys.github ? (
              <div className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300">
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  GitHub Token
                </span>
                <a
                  href="#settings"
                  onClick={() => {
                    document.querySelector('[data-settings-page]')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Configure in Settings
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                GitHub Token configured
              </div>
            )}
          </div>
        </div>

        {/* Ngrok Status & Quick Start Card */}
        <NgrokQuickStatus />

        {/* How It Works Section - Moved to Top */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            How Mobile Access Works
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gold-100 dark:bg-gold-900/30 rounded-full flex items-center justify-center text-gold-600 dark:text-gold-400 font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-medium text-surface-900 dark:text-white">Secure Tunnel</h3>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  A persistent ngrok tunnel connects your local OS Athena to the internet securely.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gold-100 dark:bg-gold-900/30 rounded-full flex items-center justify-center text-gold-600 dark:text-gold-400 font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-medium text-surface-900 dark:text-white">Mobile Web App</h3>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  A lightweight mobile interface is deployed to Vercel, accessible from any device.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-gold-100 dark:bg-gold-900/30 rounded-full flex items-center justify-center text-gold-600 dark:text-gold-400 font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-medium text-surface-900 dark:text-white">Local Processing</h3>
                <p className="text-sm text-surface-600 dark:text-surface-400">
                  All AI processing happens on your local machine. Mobile just sends requests through the tunnel.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status Card */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
              Connection Status
            </h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              tunnelStatus.active
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                tunnelStatus.active ? 'bg-green-500 animate-pulse' : 'bg-surface-400'
              }`} />
              {tunnelStatus.active ? 'Active' : 'Inactive'}
            </div>
          </div>

          {tunnelStatus.active && tunnelStatus.url ? (
            <div className="space-y-4">
              <div className="bg-surface-50 dark:bg-surface-800 rounded-lg p-4">
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                  Tunnel URL
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-surface-900 dark:text-white font-mono bg-surface-100 dark:bg-surface-700 px-3 py-2 rounded-lg truncate">
                    {tunnelStatus.url}
                  </code>
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {tunnelStatus.id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-600 dark:text-surface-400">Tunnel ID</span>
                  <code className="font-mono text-surface-900 dark:text-white">
                    {tunnelStatus.id}
                  </code>
                </div>
              )}

              <button
                onClick={handleStopTunnel}
                className="w-full py-2 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
              >
                Stop Tunnel
              </button>
            </div>
          ) : tunnelStatus.recovering ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-surface-600 dark:text-surface-400 mb-1">
                Recovering tunnel...
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-500">
                Creating a new tunnel and updating deployment
              </p>
            </div>
          ) : tunnelStatus.errorMessage ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 mb-2 font-medium">
                {tunnelStatus.errorMessage}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-500 mb-4">
                The tunnel was lost. You can try recovering it or deploy a new mobile version.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    const storedDeployment = localStorage.getItem('mobile-deployment');
                    if (storedDeployment) {
                      setTunnelStatus({ ...tunnelStatus, recovering: true, errorMessage: undefined });
                      recoverTunnel(JSON.parse(storedDeployment));
                    }
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Recover Tunnel
                </button>
                <button
                  onClick={() => setShowDeployModal(true)}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Deploy New
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-surface-600 dark:text-surface-400 mb-4">
                No active tunnel. Deploy a mobile version to get started.
              </p>
              <button
                onClick={() => setShowDeployModal(true)}
                className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-white font-semibold rounded-lg transition-colors"
              >
                Deploy Mobile Version
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {tunnelStatus.active && (
          <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!tunnelStatus.url) return;
                  // Use Electron API if available, otherwise window.open
                  if (window.electronAPI?.openExternalUrl) {
                    window.electronAPI.openExternalUrl(tunnelStatus.url);
                  } else {
                    window.open(tunnelStatus.url, '_blank');
                  }
                }}
                className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-gold-500 dark:hover:border-gold-500 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gold-100 dark:bg-gold-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gold-600 dark:text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-surface-900 dark:text-white">Open in Browser</div>
                  <div className="text-sm text-surface-500 dark:text-surface-400">View mobile app</div>
                </div>
              </button>

              <button
                onClick={() => setShowDeployModal(true)}
                className="flex items-center gap-3 p-4 bg-surface-50 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-gold-500 dark:hover:border-gold-500 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-surface-900 dark:text-white">Redeploy</div>
                  <div className="text-sm text-surface-500 dark:text-surface-400">Update mobile app</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Copy/Fork Section */}
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 p-6">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Clone OS-Athena-Mobile
          </h2>
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
            Copy the OS-Athena-Mobile repository to deploy your own custom mobile app version
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              id="fork-repo-name"
              placeholder="your-repo-name"
              className="flex-1 px-4 py-2.5 rounded-lg border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
            <button
              onClick={handleCopyForkRepo}
              disabled={forkLoading}
              className="px-6 py-2.5 bg-gold-500 hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {forkLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Copying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Repository
                </>
              )}
            </button>
          </div>
          {forkError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">{forkError}</p>
          )}
          {forkSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">{forkSuccess}</p>
          )}
        </div>

        {/* Deploy Button (when no active tunnel) */}
        {!tunnelStatus.active && (
          <button
            onClick={() => setShowDeployModal(true)}
            className="w-full py-4 bg-gold-500 hover:bg-gold-600 text-white font-bold text-lg rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Launch Mobile Version
          </button>
        )}
      </div>

      {/* Deployment Modal */}
      <MobileDeploymentModal
        open={showDeployModal}
        onClose={() => {
          setShowDeployModal(false);
          setForkedRepo('');
        }}
        onDeploy={handleDeploy}
        preForkedRepo={forkedRepo || undefined}
      />
    </div>
  );
}
