"use client";

import { useState, useEffect, useRef } from "react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private?: boolean;
}

interface RepoSelectorProps {
  selectedRepo: Repository | null;
  onSelect: (repo: Repository | null) => void;
}

export default function RepoSelector({ selectedRepo, onSelect }: RepoSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        resetForm();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && repos.length === 0) {
      fetchRepos();
    }
  }, [isOpen, repos.length]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/github/repos");
      const data = await response.json();
      setRepos(data.repos || []);
    } catch (error) {
      console.error("Failed to fetch repos:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewRepoName("");
    setNewRepoDescription("");
    setIsPrivate(false);
    setError("");
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      setError("Repository name is required");
      return;
    }

    // Validate repo name
    const validName = /^[a-zA-Z0-9._-]+$/.test(newRepoName);
    if (!validName) {
      setError("Name can only contain letters, numbers, hyphens, underscores, and periods");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRepoName.trim(),
          description: newRepoDescription.trim() || undefined,
          isPrivate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create repository");
      }

      // Add new repo to list and select it
      const newRepo: Repository = {
        id: data.repo.id,
        name: data.repo.name,
        full_name: data.repo.full_name,
        description: data.repo.description,
        default_branch: data.repo.default_branch || "main",
        private: data.repo.private,
      };

      setRepos([newRepo, ...repos]);
      onSelect(newRepo);
      setShowCreateForm(false);
      setIsOpen(false);
      resetForm();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create repository");
    } finally {
      setCreating(false);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 w-full md:w-72 px-3 py-2 rounded-xl border border-cyan-300/30 bg-black/60 hover:border-cyan-300/70 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-5 h-5 text-cyan-200/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
          <span className="text-sm font-medium text-cyan-100 truncate">
            {selectedRepo ? selectedRepo.name : "Select or Create Repo"}
          </span>
        </div>
        <svg className="w-4 h-4 text-cyan-200/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full md:w-96 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-hidden rounded-xl border border-cyan-300/30 bg-black/80 shadow-xl z-[80] animate-scale-in backdrop-blur-xl">
          {showCreateForm ? (
            /* Create Repository Form */
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Create New Repository</h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Repository Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="my-awesome-project"
                    className="w-full px-3 py-2 text-base md:text-sm rounded-lg border border-cyan-300/30 bg-black/40 text-cyan-100 placeholder-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-300"
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newRepoDescription}
                    onChange={(e) => setNewRepoDescription(e.target.value)}
                    placeholder="A short description of your project"
                    className="w-full px-3 py-2 text-base md:text-sm rounded-lg border border-cyan-300/30 bg-black/40 text-cyan-100 placeholder-cyan-200/50 focus:outline-none focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-300"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/50 border border-cyan-300/20">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isPrivate ? "bg-amber-100 dark:bg-amber-500/10" : "bg-green-100 dark:bg-green-500/10"}`}>
                      {isPrivate ? (
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {isPrivate ? "Private" : "Public"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {isPrivate ? "Only you can see this repository" : "Anyone can see this repository"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPrivate ? "bg-cyan-300" : "bg-cyan-900/60"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPrivate ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRepo}
                    disabled={creating || !newRepoName.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Repository
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Repository Selection */
            <>
              {/* Create New Button */}
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border-b border-slate-200 dark:border-slate-700 transition-colors group"
              >
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-500/20 transition-colors">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Create New Repository</div>
                  <div className="text-xs text-slate-500">Start a new project from scratch</div>
                </div>
              </button>

              {/* Search */}
              <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search existing repositories..."
                  className="w-full px-3 py-2 text-base md:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Clear Selection */}
              {selectedRepo && (
                <button
                  onClick={() => {
                    onSelect(null);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear selection
                </button>
              )}

              {/* Repos List */}
              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <svg className="animate-spin h-5 w-5 text-indigo-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">
                    {search ? "No repositories found" : "No repositories yet"}
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => {
                        onSelect(repo);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                        selectedRepo?.id === repo.id ? "bg-indigo-50 dark:bg-indigo-500/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${repo.private ? "bg-amber-100 dark:bg-amber-500/10" : "bg-slate-100 dark:bg-slate-700"}`}>
                          {repo.private ? (
                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {repo.name}
                            </span>
                            {repo.private && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <div className="text-xs text-slate-500 truncate">{repo.description}</div>
                          )}
                        </div>
                        {selectedRepo?.id === repo.id && (
                          <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
