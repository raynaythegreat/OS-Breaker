"use client";

import React, { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCcw, 
  ShieldCheck, 
  Server, 
  Globe, 
  Cpu 
} from "lucide-react";

interface HealthStatus {
  status: "healthy" | "unhealthy" | "offline" | "not_configured";
  latency?: number;
  code?: number;
  error?: string;
}

interface HealthData {
  timestamp: number;
  checks: Record<string, HealthStatus>;
}

export const DiagnosticsPage: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.error("Diagnostics failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const StatusIcon = ({ status }: { status: HealthStatus["status"] }) => {
    switch (status) {
      case "healthy": return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "unhealthy": return <XCircle className="w-5 h-5 text-red-500" />;
      case "not_configured": return <ShieldCheck className="w-5 h-5 text-surface-400" />;
      default: return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 bg-surface-50 dark:bg-black min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">System Diagnostics</h1>
          <p className="text-surface-500 dark:text-surface-400">Verify connectivity and configuration status</p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run Check
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {health && Object.entries(health.checks).map(([key, data]) => (
          <div key={key} className="p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-surface-100 dark:bg-surface-800 rounded-lg">
                {key === 'ollama' ? <Cpu className="w-5 h-5 text-gold-500" /> :
                 key === 'github' ? <Globe className="w-5 h-5 text-gold-500" /> :
                 <Server className="w-5 h-5 text-gold-500" />}
              </div>
              <div>
                <p className="font-medium text-surface-900 dark:text-white capitalize">{key}</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                  {data.status === 'healthy' ? `Latency: ${data.latency}ms` : 
                   data.status === 'not_configured' ? 'Not Configured' : 
                   data.error || `Error ${data.code}`}
                </p>
              </div>
            </div>
            <StatusIcon status={data.status} />
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/20 rounded-xl">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> Diagnostics check connectivity to provider APIs using your configured keys. If a service shows &quot;Offline&quot;, please check your local network or the provider&apos;s official status page.
          </p>
        </div>
      </div>
    </div>
  );
};
