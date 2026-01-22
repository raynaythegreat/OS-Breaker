"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryPage from "@/components/chat/HistoryPage";
import ReposPage from "@/components/github/ReposPage";
import DeploymentsPage from "@/components/deploy/DeploymentsPage";
import SettingsPage from "@/components/settings/SettingsPage";
import { useChatHistory } from "@/contexts/ChatHistoryContext";

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
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "chat" && <ChatInterface />}
      {activeTab === "history" && <HistoryPage onResumeChat={handleResumeChat} onNewChat={handleNewChat} />}
      {activeTab === "repos" && <ReposPage />}
      {activeTab === "deploy" && <DeploymentsPage />}
      {activeTab === "settings" && <SettingsPage />}
    </DashboardLayout>
  );
}
