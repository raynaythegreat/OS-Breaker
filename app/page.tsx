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
  const { loadSession, clearCurrentSession } = useChatHistory();

  useEffect(() => {
    setIsHydrated(true);
    clearCurrentSession();

    // Check if onboarding has been completed
    const onboardingCompleted = localStorage.getItem('onboarding-completed');
    if (!onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [clearCurrentSession]);

  if (!isHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto animate-pulse">
            <AthenaLogo className="w-full h-full" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Initializing OS Athena...</p>
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
