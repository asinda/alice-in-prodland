'use client';

import { useEffect } from 'react';

export default function CopyCode({ contentId }: { contentId: string }) {
  useEffect(() => {
    const container = document.getElementById(contentId);
    if (!container) return;

    const cleanups: (() => void)[] = [];

    container.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.copy-btn')) return; // already added

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      pre.appendChild(btn);

      const handler = () => {
        const code = pre.querySelector('code');
        navigator.clipboard.writeText(code?.textContent ?? '').then(() => {
          btn.textContent = '✓ Copied';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = 'Copy';
            btn.classList.remove('copied');
          }, 2000);
        });
      };

      btn.addEventListener('click', handler);
      cleanups.push(() => {
        btn.removeEventListener('click', handler);
        btn.remove();
      });
    });

    return () => cleanups.forEach(c => c());
  }, [contentId]);

  return null;
}
