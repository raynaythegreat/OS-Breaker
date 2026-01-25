import React from 'react';

const GettingStarted = () => {
  return (
    <div className="p-6 bg-surface-50 dark:bg-black min-h-full">
      <div className="max-w-2xl">
         <h2 className="text-2xl font-display font-bold text-foreground mb-6">Getting Started</h2>
        <div className="space-y-6">
          <div className="bg-card dark:bg-surface-900 p-6 rounded-xl border-2 border-border dark:border-surface-800 shadow-flat">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
              Configure API Keys
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Access the full power of OS Athena by setting up your provider keys.
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-surface-100 dark:bg-surface-800 p-2 rounded border border-border">
              Settings &gt; API Keys
            </p>
          </div>

          <div className="bg-card dark:bg-surface-900 p-6 rounded-xl border-2 border-border dark:border-surface-800 shadow-flat">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
              Set Up Local AI (Optional)
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you prefer running models locally, ensure Ollama is installed and active.
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-surface-100 dark:bg-surface-800 p-2 rounded border border-border">
              Settings &gt; Local Ollama
            </p>
          </div>

          <div className="bg-card dark:bg-surface-900 p-6 rounded-xl border-2 border-border dark:border-surface-800 shadow-flat">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</span>
              Start Building
            </h3>
            <p className="text-sm text-muted-foreground">
              Navigate to the Chat interface, select a repository, and begin your development journey with AI assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GettingStarted;
