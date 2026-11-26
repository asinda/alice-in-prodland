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
import { actionImportAsPost, actionImportAsLesson, actionImportFolderAsCourse } from '../../../lib/actions/obsidian';
import { getCourses } from '../../../lib/db';
import ImportNoteForm from '../../../components/admin/ImportNoteForm';
import importStyles from '../../../styles/AdminImport.module.css';
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
  const courses = getCourses().map(c => ({ id: c.id, title: c.title }));

  if (!vaultExists()) {
    return (
      <div>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Importer des notes</h1>
        </div>
        <p className={styles.empty}>
          Vault introuvable. Définir <code>OBSIDIAN_VAULT_PATH</code> dans <code>.env.local</code> pour parcourir vos notes.
        </p>
        <div className={importStyles.section}><ImportNoteForm courses={courses} /></div>
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
          {courses.length > 0 && (
            <form action={actionImportAsLesson} className={importStyles.bar} style={{ padding: 0, border: 0, background: 'none' }}>
              <input type="hidden" name="filePath" value={file} />
              <select name="courseId" defaultValue="" required aria-label="Cours qui reçoit la leçon">
                <option value="" disabled>Ajouter comme leçon à…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button type="submit">Ajouter comme leçon</button>
            </form>
          )}
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
          <h1 className={styles.pageTitle}>Importer des notes</h1>
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

      {entries.some(e => e.type === 'file' && /\.md$/i.test(e.name)) && (
        <div className={importStyles.bar}>
          <form action={actionImportFolderAsCourse}>
            <input type="hidden" name="dir" value={dir} />
            <input name="title" placeholder="Titre du cours (par défaut : nom du dossier)" maxLength={200} aria-label="Titre du cours" size={34} />
            <button type="submit">Créer un cours depuis ce dossier</button>
          </form>
          <span className={importStyles.hint}>Une leçon par note .md du dossier, dans l’ordre des noms (01, 02, … 10). Brouillon à relire.</span>
        </div>
      )}

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

      <div className={importStyles.section}><ImportNoteForm courses={courses} /></div>
    </div>
  );
}
