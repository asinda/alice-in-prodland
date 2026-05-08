import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getVaultEntries,
  readVaultFile,
  cleanObsidianMarkdown,
  extractTitle,
  vaultExists,
  parentDir,
} from '../../../lib/obsidian';
import { actionImportAsPost } from '../../../lib/actions/obsidian';
import styles from '../../../styles/Admin.module.css';
import vaultStyles from '../../../styles/Obsidian.module.css';

function Breadcrumb({ dir }: { dir: string }) {
  if (!dir) return <span className={vaultStyles.breadcrumb}>vault</span>;
  const parts = dir.split('/');
  return (
    <span className={vaultStyles.breadcrumb}>
      <Link href="/admin/obsidian" className={vaultStyles.breadcrumbLink}>vault</Link>
      {parts.map((part, i) => {
        const path = parts.slice(0, i + 1).join('/');
        return (
          <span key={path}>
            <span className={vaultStyles.breadcrumbSep}> / </span>
            <Link href={`/admin/obsidian?dir=${encodeURIComponent(path)}`} className={vaultStyles.breadcrumbLink}>
              {part}
            </Link>
          </span>
        );
      })}
    </span>
  );
}

export default async function ObsidianPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string; file?: string }>;
}) {
  if (!vaultExists()) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}><span>◎</span> Obsidian Vault</h1>
        </div>
        <p className={styles.empty}>
          Vault introuvable. Définir <code>OBSIDIAN_VAULT_PATH</code> dans <code>.env.local</code>.
        </p>
      </div>
    );
  }

  const { dir = '', file } = await searchParams;

  // File preview mode
  if (file) {
    let raw: string;
    try {
      raw = readVaultFile(file);
    } catch {
      notFound();
    }
    const cleaned = cleanObsidianMarkdown(raw);
    const title = extractTitle(raw, file.split('/').pop() ?? file);
    const backDir = parentDir(file);
    const backHref = backDir
      ? `/admin/obsidian?dir=${encodeURIComponent(backDir)}`
      : '/admin/obsidian';

    return (
      <div>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}><span>◎</span> {title}</h1>
            <p className={vaultStyles.filePath}>{file}</p>
          </div>
          <Link href={backHref} className={styles.btnSecondary}>← Retour</Link>
        </div>

        <div className={vaultStyles.importBar}>
          <form action={actionImportAsPost}>
            <input type="hidden" name="filePath" value={file} />
            <button type="submit" className={styles.btnGreen}>
              ↓ Importer comme article (brouillon)
            </button>
          </form>
          <span className={vaultStyles.importHint}>
            Crée un brouillon éditable dans Posts &amp; Tutoriels
          </span>
        </div>

        <div className={vaultStyles.previewWrap}>
          <pre className={vaultStyles.preview}>{cleaned}</pre>
        </div>
      </div>
    );
  }

  // Directory browser mode
  const entries = getVaultEntries(dir);
  const backDir = dir ? parentDir(dir) : null;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}><span>◎</span> Obsidian Vault</h1>
          <Breadcrumb dir={dir} />
        </div>
        {backDir !== null && (
          <Link
            href={backDir ? `/admin/obsidian?dir=${encodeURIComponent(backDir)}` : '/admin/obsidian'}
            className={styles.btnSecondary}
          >
            ← Retour
          </Link>
        )}
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>Dossier vide.</p>
      ) : (
        <div className={vaultStyles.fileList}>
          {entries.map(entry => (
            <Link
              key={entry.relativePath}
              href={
                entry.type === 'dir'
                  ? `/admin/obsidian?dir=${encodeURIComponent(entry.relativePath)}`
                  : `/admin/obsidian?file=${encodeURIComponent(entry.relativePath)}`
              }
              className={`${vaultStyles.fileItem} ${entry.type === 'dir' ? vaultStyles.fileItemDir : vaultStyles.fileItemFile}`}
            >
              <span className={vaultStyles.fileIcon}>
                {entry.type === 'dir' ? '📁' : '📄'}
              </span>
              <span className={vaultStyles.fileName}>{entry.name}</span>
              {entry.type === 'file' && (
                <span className={vaultStyles.fileAction}>Voir & importer →</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
