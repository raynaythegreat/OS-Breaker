import React from 'react';

const GettingStarted = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Getting Started with GateKeep</h2>
      <ol className="list-decimal list-inside mb-4">
        <li>Configure your API keys under <strong>Settings &gt; API Keys</strong>.</li>
        <li>Optionally, set up Local Ollama under <strong>Settings &gt; Local Ollama</strong>.</li>
        <li>Start using GateKeep to enhance your web development workflow!</li>
      </ol>
    </div>
  );
};

export default GettingStarted;