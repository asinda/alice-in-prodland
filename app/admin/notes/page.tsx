import { getNotes, buildPlan } from '@/lib/notes';
import { getSchedule } from '@/lib/schedule';
import { getAllAdminPosts } from '@/lib/posts';
import { nextPublicationSlots, formatSlot } from '@/lib/schedule-slots';
import NotesBoard, { type NoteView, type PlanView } from '@/components/admin/NotesBoard';

export const dynamic = 'force-dynamic';

export default function NotesPage() {
  const notes = getNotes();
  const slots = nextPublicationSlots(9).map(d => d.toISOString());

  const titles = new Map(getAllAdminPosts().map(p => [p.slug, p.title]));
  const scheduled = getSchedule()
    .filter(e => e.status === 'pending' || e.status === 'processing')
    .map(e => ({ scheduledAt: e.scheduledAt, title: titles.get(e.slug) ?? e.slug }));

  const plan: PlanView[] = buildPlan(slots, scheduled, notes).map(r => ({
    slot: r.slot,
    label: formatSlot(r.slot),
    scheduledTitle: r.scheduledTitle,
    noteTitle: r.note?.title,
  }));

  const view: NoteView[] = notes.map(n => ({
    id: n.id, title: n.title, body: n.body, tags: n.tags, status: n.status, starred: n.starred,
    targetSlot: n.targetSlot, postId: n.postId, updatedAt: n.updatedAt,
  }));

  return <NotesBoard notes={view} plan={plan} />;
}
