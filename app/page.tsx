"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryPage from "@/components/chat/HistoryPage";
import ReposPage from "@/components/github/ReposPage";
import DeploymentsPage from "@/components/deploy/DeploymentsPage";
import SettingsPage from "@/components/settings/SettingsPage";
import AppLauncher from "@/components/applauncher/AppLauncher";
import { useChatHistory } from "@/contexts/ChatHistoryContext";
import { AppLauncherProvider } from "@/contexts/AppLauncherContext";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const { loadSession, clearCurrentSession } = useChatHistory();

  useEffect(() => {
    clearCurrentSession();
  }, [clearCurrentSession]);

  const handleResumeChat = (sessionId: string) => {
    loadSession(sessionId);
    setActiveTab("chat");
  };

  const handleNewChat = () => {
    clearCurrentSession();
    setActiveTab("chat");
  };

  return (
    <AppLauncherProvider>
      <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "launcher" && <AppLauncher />}
        {activeTab === "chat" && <ChatInterface />}
        {activeTab === "history" && <HistoryPage onResumeChat={handleResumeChat} onNewChat={handleNewChat} />}
        {activeTab === "repos" && <ReposPage />}
        {activeTab === "deploy" && <DeploymentsPage />}
        {activeTab === "settings" && <SettingsPage />}
      </DashboardLayout>
    </AppLauncherProvider>
  );
}
