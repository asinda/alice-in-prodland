/** Transforme les citations « > [!NOTE] » en encadrés (note, astuce, attention, important). Appelé sur du HTML déjà assaini. */
export type CalloutKind = 'note' | 'tip' | 'warning' | 'important';

export function applyCallouts(html: string, labels: Record<CalloutKind, string>): string {
  return html.replace(/<blockquote>\s*<p>\[!(NOTE|TIP|WARNING|IMPORTANT)\]\s*/gi, (_m, kind: string) => {
    const k = kind.toLowerCase() as CalloutKind;
    return `<blockquote data-callout="${k}" data-label="${labels[k]}"><p>`;
  });
}
