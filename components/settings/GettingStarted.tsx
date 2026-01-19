import React from 'react';

const GettingStarted = () => {
  return (
    <div>
      <h2>Welcome to GateKeep!</h2>
      <p>To get started, follow these steps:</p>
      <ol>
        <li>
          Configure your API keys under <a href="#api-keys">API Keys</a>.
        </li>
        <li>
          Optionally, set up <a href="https://ollama.ai/download">Ollama</a> for local usage under{' '}
          <a href="#local-ollama">Local Ollama</a>.
        </li>
      </ol>
    </div>
  );
};

export default GettingStarted;