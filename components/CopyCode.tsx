'use client';

import { useEffect } from 'react';

export default function CopyCode({ contentId, copyLabel, copiedLabel, ariaLabel }: { contentId: string; copyLabel: string; copiedLabel: string; ariaLabel: string }) {
  useEffect(() => {
    const container = document.getElementById(contentId);
    if (!container) return;

    const cleanups: (() => void)[] = [];

    container.querySelectorAll('pre').forEach(pre => {
      if (pre.querySelector('.copy-btn')) return; // already added

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = copyLabel;
      btn.type = 'button';
      btn.setAttribute('aria-label', ariaLabel);
      pre.appendChild(btn);

      const handler = () => {
        const code = pre.querySelector('code');
        navigator.clipboard.writeText(code?.textContent ?? '').then(() => {
          btn.textContent = copiedLabel;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = copyLabel;
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
  }, [contentId, copyLabel, copiedLabel, ariaLabel]);

  return null;
}
