"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import HistoryPage from "@/components/chat/HistoryPage";
import ReposPage from "@/components/github/ReposPage";
import DeploymentsPage from "@/components/deploy/DeploymentsPage";
import SettingsPage from "@/components/settings/SettingsPage";
import LoginPage from "@/components/auth/LoginPage";
import GlassesLogo from "@/components/ui/GlassesLogo";
import { useChatHistory } from "@/contexts/ChatHistoryContext";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { loadSession, clearCurrentSession } = useChatHistory();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      clearCurrentSession();
    }
  }, [isLoading, isAuthenticated, clearCurrentSession]);

  const checkAuth = async () => {
    const deviceToken = localStorage.getItem("gatekeep-device-token");
    const tokenHash = localStorage.getItem("gatekeep-token-hash");

    if (!deviceToken || !tokenHash) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken, tokenHash }),
      });

      const data = await response.json();
      if (data.valid) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("gatekeep-device-token");
        localStorage.removeItem("gatekeep-token-hash");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("gatekeep-device-token");
    localStorage.removeItem("gatekeep-token-hash");
    setIsAuthenticated(false);
  };

  const handleResumeChat = (sessionId: string) => {
    loadSession(sessionId);
    setActiveTab("chat");
  };

  const handleNewChat = () => {
    clearCurrentSession();
    setActiveTab("chat");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        return <ChatInterface />;
      case "history":
        return <HistoryPage onResumeChat={handleResumeChat} onNewChat={handleNewChat} />;
      case "repos":
        return <ReposPage />;
      case "deploy":
        return <DeploymentsPage />;
      case "settings":
        return <SettingsPage onLogout={handleLogout} />;
      default:
        return <ChatInterface />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-black/60 border border-cyan-300/30 flex items-center justify-center shadow-glow animate-pulse">
            <GlassesLogo className="w-7 h-7 text-cyan-100" />
          </div>
          <div className="flex items-center gap-2 text-cyan-200/70">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Login page
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </DashboardLayout>
  );
}
