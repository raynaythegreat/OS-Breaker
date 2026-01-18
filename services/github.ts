import { Octokit } from "@octokit/rest";
import {
  GitHubRepository,
  GitHubFile,
  GitHubCreateRepoParams,
  GitHubUpdateFileParams,
  GitHubRepoStructure,
} from "@/types/github.types";

interface GitHubCommitFile {
  path: string;
  content: string;
}

interface GitHubCommitFilesParams {
  message: string;
  branch?: string;
  files: GitHubCommitFile[];
}

interface GitHubCommitFilesResult {
  branch: string;
  commitSha: string;
  commitUrl: string;
  previewUrl: string | null;
  filesChanged: number;
}

interface GitHubCopyRepoParams {
  name: string;
  description?: string;
  private?: boolean;
}

export class GitHubService {
  private octokit: Octokit;
  private username: string;

  constructor(token?: string, username?: string) {
    const authToken = token || process.env.GITHUB_TOKEN;
    if (!authToken) {
      throw new Error("GitHub token not provided");
    }

    this.octokit = new Octokit({ auth: authToken });
    this.username = username || process.env.GITHUB_USERNAME || "";
  }

  async getAuthenticatedUser(): Promise<{ login: string; avatar_url: string }> {
    const { data } = await this.octokit.users.getAuthenticated();
    return { login: data.login, avatar_url: data.avatar_url };
  }

  async listRepositories(perPage = 100): Promise<GitHubRepository[]> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: "updated",
      direction: "desc",
      per_page: perPage,
    });
    return data as GitHubRepository[];
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data as GitHubRepository;
  }

  async createRepository(params: GitHubCreateRepoParams): Promise<GitHubRepository> {
    const { data } = await this.octokit.repos.createForAuthenticatedUser({
      name: params.name,
      description: params.description || "",
      private: params.private ?? false,
      auto_init: params.auto_init ?? true,
      gitignore_template: params.gitignore_template,
    });
    return data as GitHubRepository;
  }

  async deleteRepository(owner: string, repo: string): Promise<void> {
    await this.octokit.repos.delete({ owner, repo });
  }

  async updateRepository(
    owner: string,
    repo: string,
    updates: { name?: string; description?: string; private?: boolean }
  ): Promise<GitHubRepository> {
    const { data } = await this.octokit.repos.update({
      owner,
      repo,
      ...updates,
    });
    return data as GitHubRepository;
  }

  async getContents(owner: string, repo: string, path = ""): Promise<GitHubFile | GitHubFile[]> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
    });
    return data as GitHubFile | GitHubFile[];
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(ref ? { ref } : {}),
    });

    if (Array.isArray(data) || data.type !== "file") {
      throw new Error("Path is not a file");
    }

    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    throw new Error("Unable to decode file content");
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    params: GitHubUpdateFileParams
  ): Promise<void> {
    let sha: string | undefined = params.sha;

    if (!sha) {
      try {
        const existing = await this.octokit.repos.getContent({
          owner,
          repo,
          path: params.path,
        });
        if (!Array.isArray(existing.data) && existing.data.sha) {
          sha = existing.data.sha;
        }
      } catch {
        // File doesn't exist, will create new
      }
    }

    await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: params.path,
      message: params.message,
      content: Buffer.from(params.content).toString("base64"),
      sha,
      branch: params.branch,
    });
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string
  ): Promise<void> {
    await this.octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
    });
  }

  async getRepoStructure(
    owner: string,
    repo: string,
    path = "",
    depth = 3
  ): Promise<GitHubRepoStructure[]> {
    if (depth <= 0) return [];

    try {
      const contents = await this.getContents(owner, repo, path);
      const items = Array.isArray(contents) ? contents : [contents];

      const structure: GitHubRepoStructure[] = [];

      for (const item of items) {
        const node: GitHubRepoStructure = {
          name: item.name,
          path: item.path,
          type: item.type as "file" | "dir",
        };

        if (item.type === "dir" && depth > 1) {
          node.children = await this.getRepoStructure(owner, repo, item.path, depth - 1);
        }

        structure.push(node);
      }

      return structure.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    } catch {
      return [];
    }
  }

  async getRepoStructureAsText(owner: string, repo: string, maxDepth = 3): Promise<string> {
    const structure = await this.getRepoStructure(owner, repo, "", maxDepth);

    function formatTree(items: GitHubRepoStructure[], prefix = ""): string {
      let result = "";
      items.forEach((item, index) => {
        const isLast = index === items.length - 1;
        const connector = isLast ? "└── " : "├── ";
        const icon = item.type === "dir" ? "📁 " : "📄 ";
        result += `${prefix}${connector}${icon}${item.name}\n`;

        if (item.children && item.children.length > 0) {
          const newPrefix = prefix + (isLast ? "    " : "│   ");
          result += formatTree(item.children, newPrefix);
        }
      });
      return result;
    }

    return formatTree(structure);
  }

  async getRelevantFiles(
    owner: string,
    repo: string,
    extensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"]
  ): Promise<{ path: string; content: string }[]> {
    const files: { path: string; content: string }[] = [];
    const maxFiles = 20;
    const maxFileSize = 50000;

    async function collectFiles(
      service: GitHubService,
      currentPath: string
    ): Promise<void> {
      if (files.length >= maxFiles) return;

      try {
        const contents = await service.getContents(owner, repo, currentPath);
        const items = Array.isArray(contents) ? contents : [contents];

        for (const item of items) {
          if (files.length >= maxFiles) break;

          if (item.type === "dir") {
            if (!item.name.startsWith(".") && item.name !== "node_modules") {
              await collectFiles(service, item.path);
            }
          } else if (item.type === "file") {
            const hasValidExtension = extensions.some((ext) =>
              item.name.toLowerCase().endsWith(ext)
            );
            if (hasValidExtension && item.size < maxFileSize) {
              try {
                const content = await service.getFileContent(owner, repo, item.path);
                files.push({ path: item.path, content });
              } catch {
                // Skip files that can't be read
              }
            }
          }
        }
      } catch {
        // Skip directories that can't be accessed
      }
    }

    await collectFiles(this, "");
    return files;
  }

  async validateToken(): Promise<boolean> {
    try {
      await this.getAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  private normalizeBranch(branch: string): string {
    return branch.replace(/^refs\/heads\//, "").trim();
  }

  private async getBranchHeadSha(owner: string, repo: string, branch: string): Promise<string> {
    const ref = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    return ref.data.object.sha;
  }

  private async ensureBranchExists(owner: string, repo: string, branch: string): Promise<void> {
    try {
      await this.getBranchHeadSha(owner, repo, branch);
      return;
    } catch {
      // Branch may not exist; create it from default branch
    }

    const repoInfo = await this.getRepository(owner, repo);
    const defaultBranch = this.normalizeBranch(repoInfo.default_branch || "main");
    const baseSha = await this.getBranchHeadSha(owner, repo, defaultBranch);

    await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });
  }

  private isEmptyRepositoryError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : "";
    return /git repository is empty/i.test(message);
  }

  async commitFiles(owner: string, repo: string, params: GitHubCommitFilesParams): Promise<GitHubCommitFilesResult> {
    const message = params.message?.trim();
    if (!message) {
      throw new Error("Commit message is required");
    }
    if (!Array.isArray(params.files) || params.files.length === 0) {
      throw new Error("At least one file is required");
    }

    const repoInfo = await this.getRepository(owner, repo);
    const targetBranch = this.normalizeBranch(params.branch || repoInfo.default_branch || "main");

    const normalizePath = (input: string) => {
      const trimmed = input.trim().replace(/^`|`$/g, "").replace(/^"|"$/g, "");
      const stripped = trimmed.replace(/^\.?\//, "").replace(/^\/+/, "");
      if (!stripped) {
        throw new Error("Each file must include a path");
      }
      const parts = stripped.split("/").filter(Boolean);
      if (parts.some((part) => part === "..")) {
        throw new Error(`Invalid path "${input}"`);
      }
      return parts.join("/");
    };

    const uniqueFiles = new Map<string, string>();
    for (const file of params.files) {
      const path = normalizePath(file.path);
      if (typeof file.content !== "string") {
        throw new Error(`Invalid content for ${path}`);
      }
      uniqueFiles.set(path, file.content);
    }

    const candidates = Array.from(uniqueFiles.entries()).map(([path, content]) => ({ path, content }));
    const filesToCommit: GitHubCommitFile[] = [];

    for (const file of candidates) {
      try {
        const existing = await this.getFileContent(owner, repo, file.path, targetBranch);
        if (existing === file.content) continue;
      } catch {
        // file does not exist yet or cannot be read; treat as changed
      }
      filesToCommit.push(file);
    }

    if (filesToCommit.length === 0) {
      throw new Error("No changes to apply (all files match the current branch).");
    }

    try {
      await this.ensureBranchExists(owner, repo, targetBranch);

      const headSha = await this.getBranchHeadSha(owner, repo, targetBranch);
      const headCommit = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: headSha,
      });
      const baseTreeSha = headCommit.data.tree.sha;

      const treeItems = await Promise.all(
        filesToCommit.map(async (file) => {
          const blob = await this.octokit.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: "utf-8",
          });

          return {
            path: file.path,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blob.data.sha,
          };
        })
      );

      const tree = await this.octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeItems,
      });

      const commit = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.data.sha,
        parents: [headSha],
      });

      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${targetBranch}`,
        sha: commit.data.sha,
        force: false,
      });

      return {
        branch: targetBranch,
        commitSha: commit.data.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.data.sha}`,
        previewUrl: null,
        filesChanged: filesToCommit.length,
      };
    } catch (error) {
      if (!this.isEmptyRepositoryError(error)) {
        throw error;
      }

      const treeItems = await Promise.all(
        filesToCommit.map(async (file) => {
          const blob = await this.octokit.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: "utf-8",
          });

          return {
            path: file.path,
            mode: "100644" as const,
            type: "blob" as const,
            sha: blob.data.sha,
          };
        })
      );

      const tree = await this.octokit.git.createTree({
        owner,
        repo,
        tree: treeItems,
      });

      const commit = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.data.sha,
        parents: [],
      });

      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${targetBranch}`,
        sha: commit.data.sha,
      });

      return {
        branch: targetBranch,
        commitSha: commit.data.sha,
        commitUrl: `https://github.com/${owner}/${repo}/commit/${commit.data.sha}`,
        previewUrl: null,
        filesChanged: filesToCommit.length,
      };
    }
  }

  async copyRepositorySnapshot(
    sourceOwner: string,
    sourceRepo: string,
    params: GitHubCopyRepoParams
  ): Promise<GitHubRepository> {
    const newName = params.name?.trim();
    if (!newName) {
      throw new Error("New repository name is required");
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(newName)) {
      throw new Error("Repository name can only contain letters, numbers, hyphens, underscores, and periods");
    }

    const sourceInfo = await this.getRepository(sourceOwner, sourceRepo);
    const sourceDefaultBranch = this.normalizeBranch(sourceInfo.default_branch || "main");
    const sourceHeadSha = await this.getBranchHeadSha(sourceOwner, sourceRepo, sourceDefaultBranch);

    const description =
      typeof params.description === "string" && params.description.trim()
        ? params.description.trim()
        : sourceInfo.description || `Copy of ${sourceOwner}/${sourceRepo}`;

    const { data: createdRepo } = await this.octokit.repos.createForAuthenticatedUser({
      name: newName,
      description,
      private: params.private ?? sourceInfo.private ?? false,
      auto_init: true,
    });

    const targetOwner = createdRepo.owner?.login || this.username || (await this.getAuthenticatedUser()).login;
    const targetRepo = createdRepo.name;
    const targetDefaultBranch = this.normalizeBranch(createdRepo.default_branch || "main");

    const targetHeadSha = await this.getBranchHeadSha(targetOwner, targetRepo, targetDefaultBranch);

    const sourceCommit = await this.octokit.git.getCommit({
      owner: sourceOwner,
      repo: sourceRepo,
      commit_sha: sourceHeadSha,
    });

    const treeResponse = await this.octokit.git.getTree({
      owner: sourceOwner,
      repo: sourceRepo,
      tree_sha: sourceCommit.data.tree.sha,
      recursive: "true",
    });

    const blobEntries = (treeResponse.data.tree || [])
      .filter((entry) => entry.type === "blob")
      .filter(
        (entry): entry is { path: string; mode: string; sha: string } =>
          typeof entry.path === "string" &&
          typeof entry.mode === "string" &&
          typeof entry.sha === "string"
      );

    const MAX_COPY_FILES = 600;
    if (blobEntries.length > MAX_COPY_FILES) {
      throw new Error(
        `Repository is too large to copy via API snapshot (${blobEntries.length} files). Try copying a smaller repo, or clone/push manually.`
      );
    }

    type GitTreeMode = "100644" | "100755" | "040000" | "160000" | "120000";
    const isGitTreeMode = (value: string): value is GitTreeMode =>
      value === "100644" ||
      value === "100755" ||
      value === "040000" ||
      value === "160000" ||
      value === "120000";

    const concurrency = 6;
    const treeItems: Array<{ path: string; mode: GitTreeMode; type: "blob"; sha: string }> = new Array(
      blobEntries.length
    );

    let cursor = 0;
    const workers = new Array(Math.min(concurrency, blobEntries.length)).fill(null).map(async () => {
      while (cursor < blobEntries.length) {
        const index = cursor;
        cursor += 1;
        const entry = blobEntries[index];

        const blob = await this.octokit.git.getBlob({
          owner: sourceOwner,
          repo: sourceRepo,
          file_sha: entry.sha,
        });

        const encoding = blob.data.encoding;
        const rawContent = blob.data.content;
        if (typeof rawContent !== "string") {
          throw new Error(`Failed to read ${entry.path}`);
        }

        const base64Content =
          encoding === "base64"
            ? rawContent.replace(/\n/g, "")
            : Buffer.from(rawContent, "utf8").toString("base64");

        const createdBlob = await this.octokit.git.createBlob({
          owner: targetOwner,
          repo: targetRepo,
          content: base64Content,
          encoding: "base64",
        });

        treeItems[index] = {
          path: entry.path,
          mode: isGitTreeMode(entry.mode) ? entry.mode : "100644",
          type: "blob",
          sha: createdBlob.data.sha,
        };
      }
    });

    await Promise.all(workers);

    const newTree = await this.octokit.git.createTree({
      owner: targetOwner,
      repo: targetRepo,
      tree: treeItems,
    });

    const commit = await this.octokit.git.createCommit({
      owner: targetOwner,
      repo: targetRepo,
      message: `Copy snapshot from ${sourceOwner}/${sourceRepo}@${sourceHeadSha.slice(0, 7)}`,
      tree: newTree.data.sha,
      parents: [targetHeadSha],
    });

    await this.octokit.git.updateRef({
      owner: targetOwner,
      repo: targetRepo,
      ref: `heads/${targetDefaultBranch}`,
      sha: commit.data.sha,
      force: false,
    });

    return this.getRepository(targetOwner, targetRepo);
  }
}
