import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FadeIn } from "@/components/ui/FadeIn";
import { SanitizedHtml } from "@/components/ui/SanitizedHtml";
import { ShareButton } from "@/components/journal/ShareButton";
import {
  getArticleBySlug,
  getArticles,
  formatPublishedDate,
  getTagsArray,
  type Article,
} from "@/lib/api/journal";

// Force dynamic rendering
export const dynamic = "force-dynamic";

type JournalDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: JournalDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Article Not Found - KingJess",
    };
  }

  return {
    title: `${article.title} - KingJess Journal`,
    description: article.excerpt || `Read ${article.title} on KingJess Journal`,
    openGraph: {
      title: article.title,
      description: article.excerpt || undefined,
      images: article.thumbnail ? [article.thumbnail] : undefined,
    },
  };
}

// Related Article Card Component
function RelatedArticleCard({ article }: { article: Article }) {
  return (
    <article className="group cursor-pointer">
      <Link href={`/journal/${article.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden mb-4">
          {article.thumbnail ? (
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-100 transition-transform duration-500 group-hover:scale-105" />
          )}
        </div>
      </Link>
      <div className="flex flex-wrap gap-2 mb-3">
        {article.category && (
          <span className="px-3 py-1 border border-neutral-300 text-black text-xs font-medium rounded-full uppercase tracking-wide">
            {article.category}
          </span>
        )}
        {getTagsArray(article.tags).slice(0, 2).map((tag, index) => (
          <span
            key={index}
            className="px-3 py-1 border border-neutral-300 text-black text-xs font-medium rounded-full uppercase tracking-wide"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link href={`/journal/${article.slug}`}>
        <h3 className="text-base md:text-lg font-medium text-black mb-2 leading-snug group-hover:text-neutral-600 transition-colors">
          {article.title}
        </h3>
      </Link>
      <Link
        href={`/journal/${article.slug}`}
        className="text-sm text-neutral-500 hover:text-black transition-colors"
      >
        Read more
      </Link>
    </article>
  );
}

export default async function JournalDetailPage({
  params,
}: JournalDetailPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Fetch related articles (excluding current article)
  let relatedArticles: Article[] = [];
  try {
    const { articles } = await getArticles({ limit: 4 });
    relatedArticles = articles.filter((a) => a.id !== article.id).slice(0, 3);
  } catch {
    // Ignore errors for related articles
  }

  // Format the author and date display
  const authorDate = [
    article.published_at ? formatPublishedDate(article.published_at) : null,
    article.author,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full h-[400px] sm:h-[500px] md:h-[600px] lg:h-[700px]">
        {/* Background Image */}
        <div className="absolute inset-0">
          {article.thumbnail ? (
            <Image
              src={article.thumbnail}
              alt={article.title}
              fill
              priority
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-200" />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end">
          <div className="max-w-7xl mx-auto w-full px-6 md:px-10 lg:px-16 pb-10 md:pb-14 lg:pb-16">
            {/* Tags */}
            <FadeIn>
              <div className="flex flex-wrap gap-2 mb-4">
                {article.category && (
                  <span className="px-4 py-1.5 bg-neutral-800/80 backdrop-blur-sm text-white text-xs font-medium rounded-full uppercase tracking-wide">
                    {article.category}
                  </span>
                )}
                {getTagsArray(article.tags).slice(0, 2).map((tag, index) => (
                  <span
                    key={index}
                    className="px-4 py-1.5 bg-neutral-800/80 backdrop-blur-sm text-white text-xs font-medium rounded-full uppercase tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </FadeIn>

            {/* Title */}
            <FadeIn delay={0.1}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white tracking-tight mb-4 max-w-4xl leading-tight">
                {article.title}
              </h1>
            </FadeIn>

            {/* Date & Author */}
            {authorDate && (
              <FadeIn delay={0.2}>
                <p className="text-white/80 text-sm md:text-base">{authorDate}</p>
              </FadeIn>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16 lg:py-20">
        <article className="space-y-6">
          {/* Excerpt */}
          {article.excerpt && (
            <FadeIn>
              <p className="text-lg md:text-xl text-black font-bold leading-relaxed">
                {article.excerpt}
              </p>
            </FadeIn>
          )}

          {/* Main Content - Sanitized to prevent XSS attacks */}
          <FadeIn>
            <SanitizedHtml
              html={article.content}
              className="prose prose-neutral prose-lg max-w-none text-neutral-900
                prose-headings:font-semibold prose-headings:tracking-tight
                prose-h2:text-xl prose-h2:md:text-2xl prose-h2:pt-4
                prose-p:text-neutral-600 prose-p:leading-relaxed prose-p:text-sm prose-p:md:text-black
                prose-a:text-neutral-900 prose-a:underline prose-a:hover:text-neutral-600
                prose-strong:text-neutral-900
                prose-img:rounded-lg"
            />
          </FadeIn>

          {/* Share Button */}
          <FadeIn>
            <div className="pt-8">
              <ShareButton title={article.title} />
            </div>
          </FadeIn>
        </article>
      </section>

      {/* More to Read Section */}
      {relatedArticles.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16 lg:py-20 border-t border-neutral-100">
          <FadeIn>
            <h2 className="text-2xl md:text-3xl font-semibold text-black tracking-tight mb-8 md:mb-10">
              More to read
            </h2>
          </FadeIn>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {relatedArticles.map((relatedArticle, index) => (
              <FadeIn key={relatedArticle.id} delay={index * 0.1}>
                <RelatedArticleCard article={relatedArticle} />
              </FadeIn>
            ))}
          </div>
        </section>
      )}

      {/* Subscribe Section */}
      <section className="relative w-full">
        <div className="relative h-[450px] md:h-[700px] overflow-hidden">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/homepage/return-policy-img.jpg')`,
            }}
          />

          {/* Content - Left aligned */}
          <div className="relative z-10 h-full flex flex-col justify-center items-center px-8 md:px-16 lg:px-24">
            <div className="max-w-md">
              <FadeIn>
                <h2 className="text-3xl md:text-4xl font-normal text-white mb-4 tracking-tight leading-tight">
                  Subscribe for
                  <br />
                  exclusive deals
                </h2>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="text-white/90 text-sm md:text-base mb-8 leading-relaxed">
                  Get exclusive access to the latest natural skincare deals
                  <br className="hidden md:block" />
                  and tips delivered straight to your inbox!
                </p>
              </FadeIn>

              {/* Email Form - Underline style */}
              <FadeIn delay={0.2}>
                <form className="w-full max-w-sm">
                  <div className="relative flex items-center border-b border-white/60">
                    <input
                      type="email"
                      id="journal-email"
                      name="email"
                      placeholder="Enter your email"
                      className="w-full py-3 bg-transparent text-white placeholder-white/70 text-sm focus:outline-none transition-all duration-300"
                      required
                    />
                    <button
                      type="submit"
                      className="cursor-pointer text-white text-xl hover:translate-x-1 transition-transform duration-300"
                      aria-label="Subscribe"
                    >
                      →
                    </button>
                  </div>
                </form>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
