import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '../../lib/posts';
import styles from '../../styles/Blog.module.css';

export const metadata: Metadata = {
  title: 'Blog — alice-in-prodland',
  description: 'Articles sur Kubernetes, SRE, CI/CD et la vie en production.',
};

const TAG_COLORS: Record<string, string> = {
  kubernetes: 'blue', 'github-actions': 'purple', SRE: 'green',
  devops: 'orange', debugging: 'yellow', OOM: 'red',
  cheatsheet: 'blue', postmortem: 'red', incidents: 'red',
  postgresql: 'orange', CKA: 'green', certification: 'green',
  career: 'yellow', kubectl: 'blue',
};

function tagColor(tag: string) { return TAG_COLORS[tag] ?? 'default'; }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.slash}>/</span>blog
        </h1>
        <p className={styles.subtitle}>
          {posts.length} articles · Kubernetes, SRE, CI/CD, post-mortems
        </p>
      </div>

      <div className={styles.postList}>
        {posts.map(post => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.postRow}>
            <div className={styles.postLeft}>
              <span className={styles.postDate}>{formatDate(post.date)}</span>
            </div>
            <div className={styles.postRight}>
              <h2 className={styles.postTitle}>{post.title}</h2>
              <p className={styles.postExcerpt}>{post.excerpt}</p>
              <div className={styles.postFooter}>
                <div className={styles.tagList}>
                  {post.tags.slice(0, 4).map(tag => (
                    <span key={tag} className={styles.tag} data-color={tagColor(tag)}>
                      {tag}
                    </span>
                  ))}
                </div>
                <span className={styles.readTime}>{post.readTime} min</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
