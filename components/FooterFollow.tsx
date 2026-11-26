'use client';

import { openFollow } from './FollowDialog';

export default function FooterFollow({ label, className }: { label: string; className?: string }) {
  return <button type="button" className={className} onClick={openFollow}>{label}</button>;
}
