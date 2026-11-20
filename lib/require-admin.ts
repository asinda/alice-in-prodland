import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken } from './auth';

/**
 * À appeler en première ligne de chaque server action admin : une action est
 * un endpoint POST public, le middleware seul ne suffit pas à la protéger.
 */
export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get('admin-token')?.value;
  if (!token || !(await verifyAdminToken(token))) redirect('/admin/login');
}
