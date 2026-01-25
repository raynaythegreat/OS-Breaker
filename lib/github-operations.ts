import { Octokit } from "@octokit/rest";

export interface RepositoryInfo {
  name: string;
  description: string;
  private: boolean;
  url: string;
  cloneUrl: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  url: string;
}

/**
 * Create a new GitHub repository
 */
export async function createRepository(
  name: string,
  description: string,
  isPrivate: boolean,
  token?: string
): Promise<RepositoryInfo> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    throw new Error("GitHub token not configured");
  }

  const octokit = new Octokit({ auth: authToken });

  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: true,
  });

  return {
    name: data.name,
    description: data.description || "",
    private: data.private,
    url: data.html_url,
    cloneUrl: data.clone_url,
  };
}

/**
 * Create a commit with file changes
 */
export async function createCommit(
  owner: string,
  repo: string,
  branch: string,
  message: string,
  changes: { path: string; content: string }[],
  token?: string
): Promise<CommitInfo> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    throw new Error("GitHub token not configured");
  }

  const octokit = new Octokit({ auth: authToken });

  // Get current commit SHA
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });

  const currentSha = refData.object.sha;

  // Create tree
  const { data: treeData } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: currentSha,
    tree: changes.map((change) => ({
      path: change.path,
      mode: "100644" as const,
      type: "blob" as const,
      content: change.content,
    })),
  });

  // Create commit
  const { data: commitData } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: treeData.sha,
    parents: [currentSha],
  });

  // Update reference
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commitData.sha,
  });

  return {
    sha: commitData.sha,
    message,
    url: commitData.html_url,
  };
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string,
  token?: string
) {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    throw new Error("GitHub token not configured");
  }

  const octokit = new Octokit({ auth: authToken });

  const { data } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body,
    head,
    base,
  });

  return {
    number: data.number,
    url: data.html_url,
    title: data.title,
  };
}

/**
 * Check if a repository exists
 */
export async function repositoryExists(
  owner: string,
  repo: string,
  token?: string
): Promise<boolean> {
  const authToken = token || process.env.GITHUB_TOKEN;
  if (!authToken) {
    return false;
  }

  const octokit = new Octokit({ auth: authToken });

  try {
    await octokit.repos.get({
      owner,
      repo,
    });
    return true;
  } catch {
    return false;
  }
}
