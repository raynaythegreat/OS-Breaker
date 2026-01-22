"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAppLauncher } from "@/contexts/AppLauncherContext";

export default function AppLauncher() {
  const { apps, launchApp } = useAppLauncher();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(apps.map(app => app.category).filter((cat): cat is string => Boolean(cat))))];

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">App Launcher</h1>
        <p className="text-muted-foreground">Launch your favorite applications quickly</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
          />
          <svg
            className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === category
                  ? "bg-gold-500 text-white"
                  : "bg-surface-100 dark:bg-surface-900 text-muted-foreground hover:bg-surface-200 dark:hover:bg-surface-800"
              }`}
            >
              {category === "all" ? "All Apps" : category}
            </button>
          ))}
        </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredApps.map((app) => (
          <motion.button
            key={app.id}
            onClick={() => launchApp(app)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center p-4 bg-surface-100 dark:bg-surface-900 rounded-xl hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors border border-surface-200 dark:border-surface-800 hover:border-gold-500/50"
          >
            <div className="text-4xl mb-2">{app.icon}</div>
            <div className="text-sm font-medium text-foreground text-center">{app.name}</div>
            {app.description && (
              <div className="text-xs text-muted-foreground text-center mt-1">{app.description}</div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Empty State */}
      {filteredApps.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-foreground mb-2">No applications found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}