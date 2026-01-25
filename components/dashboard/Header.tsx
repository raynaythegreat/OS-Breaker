"use client";

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  chat: { title: "AI Athena", subtitle: "Build and improve your web projects with AI" },
  repos: { title: "GitHub Repos", subtitle: "Create, edit, and manage your repositories" },
  deploy: { title: "Deployments", subtitle: "Deploy your projects to Vercel or Render" },
  mobile: { title: "Mobile", subtitle: "Deploy and manage mobile access with persistent tunnels" },
  history: { title: "Chat History", subtitle: "View and resume previous conversations" },
  settings: { title: "Settings", subtitle: "Configure your API keys and preferences" },
};

interface HeaderProps {
  activeTab: string;
}

export default function Header({ activeTab }: HeaderProps) {
  const { title, subtitle } = tabTitles[activeTab] || tabTitles.chat;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b-3 border-border bg-background sticky top-0 z-10 shadow-flat">
        <div className="flex items-center gap-6">
        <div className="md:hidden">
            {/* Mobile Title Placeholder */}
            <h1 className="text-lg font-bold text-primary">OS Athena</h1>
        </div>

        <div className="hidden md:block">
          <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground font-bold">{subtitle}</p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 border-2 border-emerald-600 shadow-flat">
          <div className="w-2 h-2 bg-white rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-wider text-white">System Online</span>
        </div>
      </div>
    </header>
  );
}