"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryPage from "@/components/chat/HistoryPage";
import ReposPage from "@/components/github/ReposPage";
import DeploymentsPage from "@/components/deploy/DeploymentsPage";
import MobilePage from '@/app/mobile/page';
import SettingsPage from "@/components/settings/SettingsPage";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import AthenaLogo from "@/components/ui/AthenaLogo";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [isHydrated, setIsHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const { loadSession, clearCurrentSession } = useChatHistory();

  useEffect(() => {
    setIsHydrated(true);
    clearCurrentSession();

    // Check if onboarding has been completed
    const onboardingCompleted = localStorage.getItem('onboarding-completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }

    // Check if we're in remote mode
    fetch('/api/env/mode')
      .then(res => res.json())
      .then(data => setIsRemoteMode(data.remoteMode))
      .catch(() => setIsRemoteMode(false));
  }, [clearCurrentSession]);

  if (!isHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-blue-50/5 to-background dark:from-surface-900 dark:via-blue-900/5 dark:to-surface-900">
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="w-20 h-20 mx-auto animate-pulse transition-all">
            <AthenaLogo className="w-full h-full" />
          </div>
          <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-blue-600 dark:text-blue-400 text-lg font-bold tracking-wide animate-pulse">
              Loading Athena AI<span className="loading-dots">
                <span className="dot-1 animate-blink">.</span>
                <span className="dot-2 animate-blink">.</span>
                <span className="dot-3 animate-blink">.</span>
              </span>
            </p>
            <p className="text-blue-500/80 dark:text-blue-300/80 text-xs font-medium">
              Initializing secure connections
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If in remote mode, redirect to mobile interface
  if (isHydrated && isRemoteMode) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-blue-50/5 to-background dark:from-surface-900 dark:via-blue-900/5 dark:to-surface-900">
        <div className="text-center space-y-6 px-6">
          <div className="w-20 h-20 mx-auto">
            <AthenaLogo className="w-full h-full" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
              OS Athena Mobile Mode
            </h1>
            <p className="text-surface-600 dark:text-surface-400">
              Redirecting to mobile interface...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-surface-500">Please wait</span>
          </div>
        </div>
      </div>
    );
  }

  const handleResumeChat = (sessionId: string) => {
    loadSession(sessionId);
    setActiveTab("chat");
  };

  const handleNewChat = () => {
    clearCurrentSession();
    setActiveTab("chat");
  };

  return (
    <>
      {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "chat" && <ChatInterface />}
        {activeTab === "history" && <HistoryPage onResumeChat={handleResumeChat} onNewChat={handleNewChat} />}
        {activeTab === "repos" && <ReposPage />}
        {activeTab === "deploy" && <DeploymentsPage />}
        {activeTab === "settings" && <SettingsPage setActiveTab={setActiveTab} />}
        {activeTab === "mobile" && <MobilePage />}
      </DashboardLayout>
    </>
  );
}
