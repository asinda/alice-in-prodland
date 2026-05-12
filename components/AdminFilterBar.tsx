'use client';

import { useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import styles from '../styles/Admin.module.css';

interface Props {
  q: string;
  status: string;
  typeFilter?: string;
  showType?: boolean;
}

export default function AdminFilterBar({ q, status, typeFilter = '', showType = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(updates: Record<string, string>) {
    const merged = { q, status, type: typeFilter, ...updates };
    const params = new URLSearchParams();
    if (merged.q) params.set('q', merged.q);
    if (merged.status) params.set('status', merged.status);
    if (merged.type) params.set('type', merged.type);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function handleSearch(value: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => update({ q: value }), 350);
  }

  return (
    <div className={styles.filterBar}>
      <input
        type="search"
        placeholder="Rechercher par titre ou tag…"
        defaultValue={q}
        onChange={e => handleSearch(e.target.value)}
        className={styles.filterSearch}
      />
      <select
        defaultValue={status}
        onChange={e => update({ status: e.target.value })}
        className={styles.filterSelect}
      >
        <option value="">Tous les statuts</option>
        <option value="published">Publiés</option>
        <option value="draft">Brouillons</option>
      </select>
      {showType && (
        <select
          defaultValue={typeFilter}
          onChange={e => update({ type: e.target.value })}
          className={styles.filterSelect}
        >
          <option value="">Tous les types</option>
          <option value="post">Post</option>
          <option value="tutorial">Tutorial</option>
        </select>
      )}
    </div>
  );
}
