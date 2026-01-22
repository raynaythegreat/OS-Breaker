"use client";

import { useState, useEffect } from "react";
import { GitHubRepository } from "@/types/github.types";

export default function ReposPage() {
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRepo, setNewRepo] = useState({ name: "", description: "", isPrivate: false });
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copySourceRepo, setCopySourceRepo] = useState<GitHubRepository | null>(null);
  const [copyRepoName, setCopyRepoName] = useState("");
  const [copyIsPrivate, setCopyIsPrivate] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/github/repos");
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setRepos(data.repos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch repositories");
    } finally {
      setLoading(false);
    }
  };

  const createRepo = async () => {
    if (!newRepo.name.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRepo),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setRepos([data.repo, ...repos]);
      setShowCreateModal(false);
      setNewRepo({ name: "", description: "", isPrivate: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create repository");
    } finally {
      setCreating(false);
    }
  };

  const openCopyModal = (repo: GitHubRepository) => {
    setError(null);
    setCopySourceRepo(repo);
    setCopyRepoName(`${repo.name}-copy`);
    setCopyIsPrivate(repo.private);
    setShowCopyModal(true);
  };

  const copyRepo = async () => {
    if (!copySourceRepo || !copyRepoName.trim()) return;

    setCopying(true);
    setError(null);
    try {
      const [owner, repo] = copySourceRepo.full_name.split("/");
      const response = await fetch(`/api/github/repos/${owner}/${repo}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copyRepoName.trim(),
          isPrivate: copyIsPrivate,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.error) {
        throw new Error(data?.error || "Failed to copy repository");
      }

      setRepos((prev) => [data.repo, ...prev]);
      setShowCopyModal(false);
      setCopySourceRepo(null);
      setCopyRepoName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy repository");
    } finally {
      setCopying(false);
    }
  };

  const deleteRepo = async (fullName: string) => {
    setDeleting(true);
    try {
      const [owner, repo] = fullName.split("/");
      const response = await fetch(`/api/github/repos/${owner}/${repo}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setRepos(repos.filter((r) => r.full_name !== fullName));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete repository");
    } finally {
      setDeleting(false);
    }
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 bg-surface-50 dark:bg-black">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-gold-500 text-white font-medium shadow-sm hover:bg-gold-600 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Repository
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-gold-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto text-surface-300 dark:text-surface-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
              {search ? "No matching repositories" : "No repositories yet"}
            </h3>
            <p className="text-surface-500">
              {search ? "Try a different search term" : "Create your first repository to get started"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-700 p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-semibold text-gold-600 dark:text-gold-400 hover:underline truncate"
                      >
                        {repo.name}
                      </a>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          repo.private
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>
                    {repo.description && (
                      <p className="text-sm text-surface-600 dark:text-surface-400 mb-3 line-clamp-2">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-surface-500">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-gold-500" />
                          {repo.language}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                        </svg>
                        {repo.stargazers_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                        </svg>
                        {repo.forks_count}
                      </span>
                      <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500 dark:text-surface-400"
                      title="View on GitHub"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                    </a>
                    <button
                      type="button"
                      onClick={() => openCopyModal(repo)}
                      className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-surface-500 dark:text-surface-400"
                      title="Copy repository"
                      aria-label={`Copy ${repo.full_name}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18A2.25 2.25 0 0120.25 10.5v7.5A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6A2.25 2.25 0 008.25 10.5v6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(repo.full_name)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-500 dark:text-surface-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete repository"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">Create Repository</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={newRepo.name}
                    onChange={(e) => setNewRepo({ ...newRepo, name: e.target.value })}
                    placeholder="my-awesome-project"
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newRepo.description}
                    onChange={(e) => setNewRepo({ ...newRepo, description: e.target.value })}
                    placeholder="A brief description..."
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRepo.isPrivate}
                    onChange={(e) => setNewRepo({ ...newRepo, isPrivate: e.target.checked })}
                    className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 text-gold-600 focus:ring-gold-500 bg-surface-50 dark:bg-surface-800"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">Private repository</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createRepo}
                  disabled={!newRepo.name.trim() || creating}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gold-500 text-white font-medium hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Copy Modal */}
        {showCopyModal && copySourceRepo && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Copy Repository</h3>
              <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
                Copying <strong>{copySourceRepo.full_name}</strong> into a new repository.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    New Repository Name
                  </label>
                  <input
                    type="text"
                    value={copyRepoName}
                    onChange={(e) => setCopyRepoName(e.target.value)}
                    placeholder="my-awesome-project-copy"
                    className="w-full px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-all"
                    autoFocus
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={copyIsPrivate}
                    onChange={(e) => setCopyIsPrivate(e.target.checked)}
                    className="w-5 h-5 rounded border-surface-300 dark:border-surface-600 text-gold-600 focus:ring-gold-500 bg-surface-50 dark:bg-surface-800"
                  />
                  <span className="text-sm text-surface-700 dark:text-surface-300">Private repository</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    if (copying) return;
                    setShowCopyModal(false);
                    setCopySourceRepo(null);
                    setCopyRepoName("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={copyRepo}
                  disabled={!copyRepoName.trim() || copying}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-gold-500 text-white font-medium hover:bg-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {copying ? "Copying..." : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-900 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Delete Repository</h3>
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                Are you sure you want to delete <strong>{deleteConfirm}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteRepo(deleteConfirm)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}