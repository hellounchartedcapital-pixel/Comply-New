import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/landing/navbar';
import { Footer } from '@/components/landing/footer';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Insights on COI compliance, insurance tracking, and property management best practices from the SmartCOI team.',
  alternates: {
    canonical: '/blog',
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pb-20 pt-32">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Blog
        </h1>
        <p className="mt-2 text-muted-foreground">
          Insights on COI compliance, insurance tracking, and property
          management best practices.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 text-center text-muted-foreground">
            No posts yet. Check back soon!
          </p>
        ) : (
          <div className="mt-10 space-y-8">
            {posts.map((post) => (
              <article key={post.slug} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <time className="text-xs text-muted-foreground">
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <h2 className="mt-1 text-lg font-semibold text-foreground group-hover:text-brand-dark transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {post.description}
                  </p>
                  <span className="mt-2 inline-block text-sm font-medium text-brand-dark">
                    Read more &rarr;
                  </span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
