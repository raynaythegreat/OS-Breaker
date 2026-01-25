export interface GitHubCommand {
  type: "create_repo" | "commit" | "create_pr" | "deploy";
  name?: string;
  description?: string;
  repo?: string;
  message?: string;
  platform?: "vercel" | "render";
  branch?: string;
  title?: string;
  body?: string;
  head?: string;
  base?: string;
}

/**
 * Parse GitHub commands from AI response content
 * Expected format: <github_command type="..." ... />
 */
export function parseGitHubCommands(content: string): GitHubCommand[] {
  const commands: GitHubCommand[] = [];
  const regex = /<github_command\s+([^>]+)\s*\/>/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const attrs = match[1];
    const command: Partial<GitHubCommand> = {};

    // Parse attributes
    const typeMatch = attrs.match(/type="([^"]+)"/);
    const nameMatch = attrs.match(/name="([^"]+)"/);
    const descMatch = attrs.match(/description="([^"]+)"/);
    const repoMatch = attrs.match(/repo="([^"]+)"/);
    const messageMatch = attrs.match(/message="([^"]+)"/);
    const platformMatch = attrs.match(/platform="([^"]+)"/);
    const branchMatch = attrs.match(/branch="([^"]+)"/);
    const titleMatch = attrs.match(/title="([^"]+)"/);
    const bodyMatch = attrs.match(/body="([^"]+)"/);
    const headMatch = attrs.match(/head="([^"]+)"/);
    const baseMatch = attrs.match(/base="([^"]+)"/);

    if (typeMatch) command.type = typeMatch[1] as GitHubCommand["type"];
    if (nameMatch) command.name = nameMatch[1];
    if (descMatch) command.description = descMatch[1];
    if (repoMatch) command.repo = repoMatch[1];
    if (messageMatch) command.message = messageMatch[1];
    if (platformMatch) command.platform = platformMatch[1] as "vercel" | "render";
    if (branchMatch) command.branch = branchMatch[1];
    if (titleMatch) command.title = titleMatch[1];
    if (bodyMatch) command.body = bodyMatch[1];
    if (headMatch) command.head = headMatch[1];
    if (baseMatch) command.base = baseMatch[1];

    // Validate type and ensure it's not a prototype pollution attempt
    if (command.type && command.type !== "__proto__" && command.type !== "constructor") {
      commands.push(command as GitHubCommand);
    }
  }

  return commands;
}

/**
 * Remove GitHub command tags from content for display
 */
export function stripGitHubCommands(content: string): string {
  return content.replace(/<github_command\s+[^>]+\s*\/>/g, "").trim();
}
