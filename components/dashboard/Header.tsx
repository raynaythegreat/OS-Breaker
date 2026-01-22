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
    <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-10">
      <div className="flex items-center gap-6">
        <div className="md:hidden">
            {/* Mobile Title Placeholder */}
            <h1 className="text-lg font-bold text-gold-500">OS Athena</h1>
        </div>

        <div className="hidden md:block">
          <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System Online</span>
        </div>
      </div>
    </header>
  );
}