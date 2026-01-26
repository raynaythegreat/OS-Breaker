import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ChatHistoryProvider } from "@/contexts/ChatHistoryContext";
import { ApiUsageProvider } from "@/contexts/ApiUsageContext";
import { DeploymentProvider } from "@/contexts/DeploymentContext";
import { FileAccessProvider } from "@/contexts/FileAccessContext";

export const metadata: Metadata = {
  title: "OS Athena - AI Dev Command Center",
  description:
    "OS Athena is a professional AI command center for planning, building, and deploying web applications with confidence.",
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isRemoteMode = process.env.OS_REMOTE_MODE === 'true';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme === 'light') {
                document.documentElement.classList.remove('dark');
              } else if (theme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}
          })();
        `}} />
      </head>
      <body className={`antialiased overflow-x-hidden ${isRemoteMode ? 'mobile-mode' : 'desktop-mode'}`}>
        <ThemeProvider>
          <ChatHistoryProvider>
            <ApiUsageProvider>
              <DeploymentProvider>
                <FileAccessProvider>
                  <div className={`min-h-screen ${isRemoteMode ? 'bg-white dark:bg-surface-900' : 'bg-background text-foreground'}`}>
                    {children}
                  </div>
                </FileAccessProvider>
              </DeploymentProvider>
            </ApiUsageProvider>
          </ChatHistoryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}