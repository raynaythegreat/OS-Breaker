import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SettingsPage() {
  const [currentVersion, setCurrentVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/github/releases')
      .then(response => response.json())
      .then(data => {
        setLatestVersion(data.tag_name);
        setUpdateAvailable(data.tag_name !== currentVersion);
      })
      .catch(error => console.error('Failed to fetch latest release:', error));
  }, [currentVersion]);

  const handleCheckUpdates = () => {
    fetch('/api/github/releases')
      .then(response => response.json())
      .then(data => {
        setLatestVersion(data.tag_name);
        setUpdateAvailable(data.tag_name !== currentVersion);
      })
      .catch(error => console.error('Failed to fetch latest release:', error));
  };

  const handleOpenReleases = () => {
    window.open('https://github.com/raynaythegreat/AI-Gatekeep/releases', '_blank');
  };

  return (
    <div>
      <h2>App Updates</h2>
      <p>Current Version: {currentVersion}</p>
      <p>Latest Version: {latestVersion}</p>
      {updateAvailable && (
        <div>
          <p>Update available!</p>
          <button onClick={handleOpenReleases}>Download Latest Release</button>
        </div>
      )}
      <button onClick={handleCheckUpdates}>Check for Updates</button>
    </div>
  );
}