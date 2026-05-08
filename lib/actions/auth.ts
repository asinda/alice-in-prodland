'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { signAdminToken } from '../auth';

export async function login(_: unknown, formData: FormData) {
  const password = formData.get('password') as string;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Mot de passe incorrect.' };
  }

  const token = await signAdminToken();
  const jar = await cookies();
  jar.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  });

  redirect('/admin/posts');
}

export async function logout() {
  const jar = await cookies();
  jar.delete('admin-token');
  redirect('/admin/login');
}
