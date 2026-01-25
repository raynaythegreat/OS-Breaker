'use client';

import React, { useState, useEffect } from 'react';
import MobileDeploymentModal from '@/components/settings/MobileDeploymentModal';

interface TunnelStatus {
  active: boolean;
  url?: string;
  id?: string;
}

export default function MobilePage() {
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus>({ active: false });
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkTunnelStatus();
  }, []);

  const checkTunnelStatus = async () => {
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
    } catch (error) {
      console.error('Failed to check mobile status:', error);
    }
  };

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
        const deploymentInfo = {
          tunnelId: result.tunnel.id,
          publicUrl: result.tunnel.public_url,
          mobileUrl: result.mobileUrl,
          deploymentId: result.deployment?.deploymentId,
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
                onClick={() => window.open(tunnelStatus.url, '_blank')}
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

        {/* How It Works */}
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
        onClose={() => setShowDeployModal(false)}
        onDeploy={handleDeploy}
      />
    </div>
  );
}
