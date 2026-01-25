# Mobile Deployment Progress Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time Vercel build log streaming to mobile deployment modal with automatic browser tab opening when deployment completes.

**Architecture:** Replace the current 5-step progress UI with a log viewer that polls Vercel's deployment events API every 2 seconds. Parse events into readable log entries, display in scrollable panel with auto-scroll. Detect READY state transition and auto-open the deployed URL in a new browser tab.

**Tech Stack:** Next.js, React hooks (useState, useEffect, useRef), Vercel API v2/v13 events endpoint, TypeScript

---

## Task 1: Add Deployment State Types

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:1-50`

**Step 1: Add new type definitions at top of file**

After the existing imports and STEPS constant, add:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 3: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: add deployment progress types for mobile deployment"
```

---

## Task 2: Add State Management for Logs

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:60-90`

**Step 1: Add new state variables**

In the MobileDeploymentModal component, after existing useState hooks (around line 80), add:

```typescript
const [deploymentState, setDeploymentState] = useState<DeploymentState>('idle');
const [deploymentId, setDeploymentId] = useState<string | null>(null);
const [logs, setLogs] = useState<LogEntry[]>([]);
const [vercelUrl, setVercelUrl] = useState<string | null>(null);
const [hasAutoOpened, setHasAutoOpened] = useState(false);
const logsEndRef = useRef<HTMLDivElement>(null);
const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

**Step 2: Add helper function to add log entries**

```typescript
const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
  setLogs(prev => [...prev.slice(-199), { // Keep last 200 logs
    timestamp: Date.now(),
    message,
    type
  }]);
}, []);
```

**Step 3: Add auto-scroll effect**

```typescript
useEffect(() => {
  logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [logs]);
```

**Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: add state management for deployment logs"
```

---

## Task 3: Create Vercel Events Polling Function

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:100-150`

**Step 1: Add pollDeploymentEvents function**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: add Vercel events polling function"
```

---

## Task 4: Add Auto-Open Logic

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:150-180`

**Step 1: Add auto-open effect**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: add auto-open logic for deployed site"
```

---

## Task 5: Update Deploy Handler to Use Logs

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:100-140`

**Step 1: Find and update handleDeploy function**

Replace the existing handleDeploy function (around line 100-150) with:

```typescript
const handleDeploy = async () => {
  setDeploying(true);
  setError(null);
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
```

**Step 2: Add cleanup on unmount**

```typescript
useEffect(() => {
  return () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  };
}, []);
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: update deploy handler to track progress with logs"
```

---

## Task 6: Replace Step Progress UI with Log Viewer

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:200-400`

**Step 1: Replace the step progress section**

Find the section that renders steps (search for "STEPS.map") and replace the entire progress section with:

```typescript
{/* Deployment Progress - Log Viewer */}
{deploying && (
  <div className="space-y-4">
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
```

**Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: replace step progress with log viewer UI"
```

---

## Task 7: Update Success/Error Result Display

**Files:**
- Modify: `components/settings/MobileDeploymentModal.tsx:400-500`

**Step 1: Update success result display**

Find the section that shows result (search for "result?.success") and update to show final logs:

```typescript
{!deploying && result?.success && (
  <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-4">
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
```

**Step 2: Keep error display with logs**

Update error display to preserve logs:

```typescript
{error && !deploying && (
  <div className="space-y-3">
    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
            Deployment Failed
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200">
            {error}
          </p>
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
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add components/settings/MobileDeploymentModal.tsx
git commit -m "feat: update success/error displays to show deployment logs"
```

---

## Task 8: Test End-to-End Flow

**Files:**
- Test: Manual testing in browser

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on localhost:3000

**Step 2: Navigate to mobile page**

1. Open http://localhost:3000/mobile
2. Click "Launch Mobile Version"
3. Fill in repository: `Raynaythegreat/OS-Athena-Mobile`
4. Fill in password and branch
5. Click Deploy

**Step 3: Verify log streaming**

Expected to see:
- "Starting mobile deployment..." log appears
- "Creating ngrok tunnel..." log appears
- Status badge changes: Creating Tunnel → Deploying → Building
- Build logs start streaming from Vercel
- Logs auto-scroll to bottom
- "View on Vercel" link appears and works

**Step 4: Verify auto-open**

Expected:
- When deployment completes, status badge shows "✓ Ready"
- After 1 second, new browser tab opens with deployed site
- Status badge changes to "✓ Active"
- Success message shows with clickable URL

**Step 5: Test error handling**

1. Try deploying with invalid repository
2. Verify error logs appear
3. Verify "View Deployment Logs" collapsible works

**Step 6: Document any issues**

If issues found, note them for fixes.

---

## Task 9: Final Build & Commit

**Files:**
- All modified files

**Step 1: Run final build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings

**Step 2: Check git status**

Run: `git status`
Expected: Only `components/settings/MobileDeploymentModal.tsx` modified

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: add real-time deployment progress tracking with auto-open

- Replace step-by-step progress with streaming build logs
- Poll Vercel events API every 2 seconds during build
- Display logs in scrollable terminal-style viewer
- Auto-scroll to latest log entries
- Detect READY state and auto-open deployed URL in new tab
- Show 'View on Vercel' link to deployment dashboard
- Preserve logs on error for debugging
- Clean up polling interval on unmount

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

- [ ] TypeScript compiles with no errors
- [ ] Build succeeds (`npm run build`)
- [ ] Deployment starts and shows initial logs
- [ ] Logs stream in real-time from Vercel
- [ ] Logs auto-scroll to bottom
- [ ] Status badge updates correctly (Creating Tunnel → Deploying → Building → Ready)
- [ ] New tab opens automatically when deployment completes
- [ ] "View on Vercel" link works
- [ ] Error cases show logs in collapsible section
- [ ] Polling stops when deployment completes or errors
- [ ] No memory leaks (interval cleanup on unmount)

---

## Notes

- Vercel events API may return different event structures depending on deployment type
- The polling interval (2 seconds) balances responsiveness with API rate limits
- Auto-open has 1-second delay to ensure user sees success message
- Logs are capped at 200 entries to prevent memory issues on long builds
- The `noopener,noreferrer` flags prevent security issues with window.open()
