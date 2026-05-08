'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createCourse, updateCourse, deleteCourse, publishCourse, getCourseById,
  addLesson, updateLesson, deleteLesson,
} from '../db';
import { postToLinkedIn } from '../integrations/linkedin';
import { linkGumroad } from '../integrations/gumroad';
import { prepareTikTokPost } from '../integrations/tiktok';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function pushIntegrations(course: NonNullable<ReturnType<typeof getCourseById>>) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const payload = {
    title: course.title,
    excerpt: course.description,
    url: `${siteUrl}/cours/${course.slug}`,
    tags: course.tags,
    type: 'course',
  };
  const [linkedin, gumroad, tiktok] = await Promise.all([
    postToLinkedIn(payload),
    linkGumroad(course.gumroadUrl),
    prepareTikTokPost(payload),
  ]);
  updateCourse(course.id, { integrations: { linkedin, gumroad, tiktok } });
}

export async function actionCreateCourse(_: unknown, formData: FormData) {
  const title = (formData.get('title') as string).trim();
  const description = (formData.get('description') as string).trim();
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) return { error: 'Le titre est requis.' };

  const course = createCourse({
    slug: slugify(title),
    title,
    description,
    tags,
    status: 'draft',
    publishedAt: null,
    gumroadUrl: '',
  });

  revalidatePath('/admin/cours');
  redirect(`/admin/cours/${course.id}`);
}

export async function actionUpdateCourse(_: unknown, formData: FormData) {
  const id = formData.get('id') as string;
  const title = (formData.get('title') as string).trim();
  const description = (formData.get('description') as string).trim();
  const tagsRaw = (formData.get('tags') as string).trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const gumroadUrl = (formData.get('gumroadUrl') as string ?? '').trim();

  if (!title) return { error: 'Le titre est requis.' };
  updateCourse(id, { title, description, tags, gumroadUrl });
  revalidatePath('/admin/cours');
  revalidatePath(`/admin/cours/${id}`);
  return { success: true };
}

export async function actionPublishCourse(id: string) {
  const course = getCourseById(id);
  if (!course) return;
  publishCourse(id);
  await pushIntegrations(course);
  revalidatePath('/admin/cours');
  revalidatePath(`/admin/cours/${id}`);
  revalidatePath('/cours');
}

export async function actionRepushCourseIntegrations(id: string) {
  const course = getCourseById(id);
  if (!course || course.status !== 'published') return;
  await pushIntegrations(course);
  revalidatePath('/admin/cours');
  revalidatePath(`/admin/cours/${id}`);
}

export async function actionDeleteCourse(id: string) {
  deleteCourse(id);
  revalidatePath('/admin/cours');
  redirect('/admin/cours');
}

export async function actionAddLesson(_: unknown, formData: FormData) {
  const courseId = formData.get('courseId') as string;
  const title = (formData.get('title') as string).trim();
  const content = (formData.get('content') as string).trim();
  const order = parseInt(formData.get('order') as string) || 0;

  if (!title) return { error: 'Le titre est requis.' };

  addLesson(courseId, { slug: slugify(title), title, content, order });
  revalidatePath(`/admin/cours/${courseId}`);
  return { success: true };
}

export async function actionUpdateLesson(_: unknown, formData: FormData) {
  const courseId = formData.get('courseId') as string;
  const lessonId = formData.get('lessonId') as string;
  const title = (formData.get('title') as string).trim();
  const content = (formData.get('content') as string).trim();
  const order = parseInt(formData.get('order') as string) || 0;

  if (!title) return { error: 'Le titre est requis.' };
  updateLesson(courseId, lessonId, { title, content, order });
  revalidatePath(`/admin/cours/${courseId}`);
  return { success: true };
}

export async function actionDeleteLesson(courseId: string, lessonId: string) {
  deleteLesson(courseId, lessonId);
  revalidatePath(`/admin/cours/${courseId}`);
}
