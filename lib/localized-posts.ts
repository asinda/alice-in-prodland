import { getAllPosts, type PostMeta } from './posts';
import { getPostBySlug } from './db';
import { getTranslation } from './translations';

/** Articles publiés, avec titre et extrait traduits quand la langue demandée est l'anglais. */
export function getLocalizedPosts(locale: string): PostMeta[] {
  const posts = getAllPosts();
  if (locale !== 'en') return posts;
  return posts.map(post => {
    const fileTrans = getTranslation(post.slug);
    const dbPost = getPostBySlug(post.slug);
    return {
      ...post,
      title: fileTrans?.titleEn ?? dbPost?.titleEn ?? post.title,
      excerpt: fileTrans?.excerptEn ?? dbPost?.excerptEn ?? post.excerpt,
    };
  });
}
