"use client";

import { useMemo } from "react";
import { useChatHistory } from "@/contexts/ChatHistoryContext";

interface HistoryPageProps {
  onResumeChat: (sessionId: string) => void;
  onNewChat: () => void;
}

export default function HistoryPage({ onResumeChat, onNewChat }: HistoryPageProps) {
  const { sessions, deleteSession, deviceToken } = useChatHistory();

  const visibleSessions = useMemo(() => {
    if (!deviceToken) return sessions;
    return sessions.filter((session) => session.deviceToken === deviceToken);
  }, [deviceToken, sessions]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const groupedSessions = visibleSessions.reduce((groups, session) => {
    const dateKey = formatDate(session.updatedAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, typeof visibleSessions>);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-surface-50 dark:bg-black">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-white">Chat History</h2>
            <p className="text-sm text-surface-500">{visibleSessions.length} conversations</p>
          </div>
          <button
            onClick={onNewChat}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gold-500 text-white text-sm font-medium shadow-sm hover:bg-gold-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Sessions */}
        {visibleSessions.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-surface-300 dark:text-surface-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No chat history</h3>
            <p className="text-surface-500 mb-6">Start a new conversation to get started</p>
            <button
              onClick={onNewChat}
              className="px-6 py-2.5 rounded-xl bg-gold-500 text-white font-medium shadow-sm hover:bg-gold-600 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedSessions).map(([date, dateSessions]) => (
              <div key={date}>
                <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">{date}</h3>
                <div className="space-y-2">
                  {dateSessions.map((session) => (
                    <div
                      key={session.id}
                      className="group bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-4 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => onResumeChat(session.id)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-surface-900 dark:text-white truncate">
                              {session.title}
                            </h4>
                            {session.repoFullName && (
                              <span className="px-2 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 text-xs rounded-full">
                                {session.repoName}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-surface-500 line-clamp-1">
                            {session.messages[session.messages.length - 1]?.content || "No messages"}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-surface-400">
                            <span>{session.messages.length} messages</span>
                            <span>{new Date(session.updatedAt).toLocaleTimeString()}</span>
                            {session.provider && (
                              <span className="capitalize">{session.provider}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          className="p-2 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}