import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'terriers-'));
  vi.spyOn(process, 'cwd').mockReturnValue(tmp);
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmp, { recursive: true, force: true });
});

const terrierData = {
  slug: 'k8s', title: 'K8s', hook: '', description: '', status: 'active' as const, plannedDepth: 3,
};
const chapterBase = {
  hook: '', content: '', takeaways: [], status: 'published' as const,
  plannedDate: null, publishedAt: null,
};

describe('terriers data layer', () => {
  it('creates a terrier and lists chapters sorted by order', async () => {
    const db = await import('./terriers');
    const t = db.createTerrier(terrierData);
    db.createChapter({ ...chapterBase, terrierId: t.id, slug: 'b', order: 2, title: 'B' });
    db.createChapter({ ...chapterBase, terrierId: t.id, slug: 'a', order: 1, title: 'A' });
    expect(db.getChapters(t.id).map(c => c.title)).toEqual(['A', 'B']);
    expect(db.nextChapterOrder(t.id)).toBe(3);
  });

  it('filters chapters by status and deletes chapters with their terrier', async () => {
    const db = await import('./terriers');
    const t = db.createTerrier(terrierData);
    db.createChapter({ ...chapterBase, terrierId: t.id, slug: 'a', order: 1, title: 'A' });
    db.createChapter({ ...chapterBase, terrierId: t.id, slug: 'b', order: 2, title: 'B', status: 'planned' });
    expect(db.getChapters(t.id, { status: 'published' })).toHaveLength(1);
    db.deleteTerrier(t.id);
    expect(db.getTerriers()).toHaveLength(0);
    expect(db.getChapters(t.id)).toHaveLength(0);
  });
});
