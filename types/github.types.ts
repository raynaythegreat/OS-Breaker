export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: "file" | "dir";
  content?: string;
  encoding?: string;
  url: string;
  html_url: string;
  download_url: string | null;
}

export interface GitHubCreateRepoParams {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
}

export interface GitHubUpdateFileParams {
  path: string;
  message: string;
  content: string;
  sha?: string;
  branch?: string;
}

export interface GitHubRepoStructure {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: GitHubRepoStructure[];
  content?: string;
}
