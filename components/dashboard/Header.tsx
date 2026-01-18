"use client";

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  chat: { title: "AI Chat", subtitle: "Build and improve your web projects with AI" },
  repos: { title: "GitHub Repos", subtitle: "Create, edit, and manage your repositories" },
  deploy: { title: "Deployments", subtitle: "Deploy your projects to Vercel or Render" },
  history: { title: "Chat History", subtitle: "View and resume previous conversations" },
  settings: { title: "Settings", subtitle: "Configure your API keys and preferences" },
};

interface HeaderProps {
  activeTab: string;
}

export default function Header({ activeTab }: HeaderProps) {
  const { title, subtitle } = tabTitles[activeTab] || tabTitles.chat;

  return (
    <header className="flex items-center justify-between px-3 py-2 sm:px-6 sm:py-4 border-b border-cyan-300/20 bg-black/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-lg font-bold gradient-text font-display">
              GateKeep
            </h1>
          </div>
        </div>
        <div className="hidden sm:block w-px h-8 bg-cyan-300/30" />
        <div className="hidden sm:block">
          <h2 className="text-sm font-semibold text-cyan-100">{title}</h2>
          <p className="text-xs text-cyan-200/70">{subtitle}</p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="hidden sm:flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10">
          <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-100">Online</span>
        </div>
      </div>
    </header>
  );
}
