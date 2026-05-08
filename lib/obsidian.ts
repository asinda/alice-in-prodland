import fs from 'fs';
import path from 'path';

export const VAULT_PATH =
  process.env.OBSIDIAN_VAULT_PATH ??
  'C:\\Users\\ASINDAYIGAYA\\Documents\\Obsidian Vault';

export interface VaultEntry {
  name: string;
  relativePath: string;
  type: 'file' | 'dir';
}

export function vaultExists(): boolean {
  return fs.existsSync(VAULT_PATH);
}

export function getVaultEntries(dir: string = ''): VaultEntry[] {
  const fullPath = dir ? path.join(VAULT_PATH, dir) : VAULT_PATH;
  if (!fs.existsSync(fullPath)) return [];

  return fs
    .readdirSync(fullPath, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && !e.name.startsWith('_'))
    .filter(e => e.isDirectory() || e.name.endsWith('.md'))
    .map(e => ({
      name: e.name,
      relativePath: dir ? `${dir}/${e.name}` : e.name,
      type: (e.isDirectory() ? 'dir' : 'file') as 'file' | 'dir',
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, 'fr');
    });
}

export function readVaultFile(relativePath: string): string {
  const fullPath = path.join(VAULT_PATH, relativePath);
  return fs.readFileSync(fullPath, 'utf8');
}

export function cleanObsidianMarkdown(raw: string): string {
  return raw
    .replace(/!\[\[.*?\]\]/g, '')          // embedded images/notes
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')  // [[link|alias]] → alias
    .replace(/\[\[([^\]]+)\]\]/g, '$1')    // [[link]] → link
    .replace(/^---[\s\S]*?---\n?/m, '')    // remove frontmatter
    .replace(/\^[a-zA-Z0-9-]+$/gm, '')    // block references ^abc
    .replace(/%%.*?%%/gs, '')              // Obsidian comments
    .replace(/> \[!.*?\]\n/g, '> ')        // callouts → blockquotes
    .trim();
}

export function extractTitle(raw: string, fallback: string): string {
  // try frontmatter title
  const fm = raw.match(/^---[\s\S]*?title:\s*["']?(.+?)["']?\s*\n/m);
  if (fm) return fm[1].trim();
  // try first H1
  const h1 = raw.match(/^#\s+(.+)/m);
  if (h1) return h1[1].trim();
  return fallback.replace(/\.md$/, '').replace(/[-_]/g, ' ');
}

export function parentDir(relativePath: string): string {
  const parts = relativePath.split('/');
  parts.pop();
  return parts.join('/');
}
