import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { FadeIn } from "@/components/ui/FadeIn";
import { getArticles, getFeaturedArticles, formatPublishedDate, getTagsArray, type Article } from "@/lib/api/journal";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal - KingJess",
  description:
    "Discover skincare tips, beauty trends, and expert advice on our journal.",
};

// Blog Card Component
function BlogCard({ article }: { article: Article }) {
  return (
    <article className="group cursor-pointer">
      {/* Image Container */}
      <Link href={`/journal/${article.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden mb-4 rounded-sm">
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

          {/* Tags */}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {article.category && (
              <span className="px-3 py-1 bg-white text-neutral-900 text-xs font-medium rounded-full shadow-sm">
                {article.category}
              </span>
            )}
            {getTagsArray(article.tags).slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white text-neutral-900 text-xs font-medium rounded-full shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* Content */}
      <div>
        {article.published_at && (
          <p className="text-xs text-neutral-500 mb-2">
            {formatPublishedDate(article.published_at)}
          </p>
        )}
        <Link href={`/journal/${article.slug}`}>
          <h3 className="text-base md:text-lg font-medium text-neutral-900 mb-2 leading-snug group-hover:text-neutral-600 transition-colors">
            {article.title}
          </h3>
        </Link>
        {article.excerpt && (
          <p className="text-sm text-neutral-600 mb-2 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <Link
          href={`/journal/${article.slug}`}
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center gap-1 underline-offset-2 hover:underline"
        >
          Read more
        </Link>
      </div>
    </article>
  );
}

export default async function BlogPage(): Promise<React.JSX.Element> {
  // Fetch articles from backend
  let articles: Article[] = [];
  let featuredArticles: Article[] = [];

  try {
    const [articlesResult, featured] = await Promise.all([
      getArticles({ limit: 20 }),
      getFeaturedArticles(3),
    ]);

    articles = articlesResult.articles;
    featuredArticles = featured;
  } catch {
    // Return empty arrays if fetch fails
  }

  // Filter out featured articles from the main list to avoid duplicates
  const featuredIds = new Set(featuredArticles.map((a) => a.id));
  const regularArticles = articles.filter((a) => !featuredIds.has(a.id));

  return (
    <main className="min-h-screen bg-white mt-14">
      <section className="w-full px-10 py-12 md:py-16 lg:py-20">
        {/* Section Title */}
        <FadeIn>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight mb-8 md:mb-10">
            Your guide to natural skincare wisdom
          </h1>
        </FadeIn>

        {/* Featured Articles */}
        {featuredArticles.length > 0 && (
          <div className="mb-12">
            <FadeIn>
              <h2 className="text-lg md:text-xl font-medium text-neutral-900 mb-6">
                Featured
              </h2>
            </FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {featuredArticles.map((article, index) => (
                <FadeIn key={article.id} delay={(index % 3) * 0.1}>
                  <BlogCard article={article} />
                </FadeIn>
              ))}
            </div>
          </div>
        )}

        {/* All Articles */}
        {regularArticles.length > 0 && (
          <div>
            <FadeIn>
              <h2 className="text-lg md:text-xl font-medium text-neutral-900 mb-6">
                Latest Articles
              </h2>
            </FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {regularArticles.map((article, index) => (
                <FadeIn key={article.id} delay={(index % 3) * 0.1}>
                  <BlogCard article={article} />
                </FadeIn>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {articles.length === 0 && (
          <FadeIn>
            <div className="py-12 w-full text-center">
              <p className="text-neutral-500">
                No articles available yet. Check back soon!
              </p>
            </div>
          </FadeIn>
        )}
      </section>

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
