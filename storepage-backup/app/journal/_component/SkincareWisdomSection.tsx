"use client";

import Link from "next/link";

// Blog Data
const blogPosts = [
  {
    id: 1,
    title: "Tips for a natural skincare routine",
    image: "/homepage/blog/skincare-routine.jpg",
    tags: ["Tips", "Guide"],
    slug: "tips-natural-skincare-routine",
  },
  {
    id: 2,
    title: "Science behind effective face masks",
    image: "/homepage/blog/face-masks.jpg",
    tags: ["Science"],
    slug: "science-effective-face-masks",
  },
  {
    id: 3,
    title: "Ingredients for glowing skin explained",
    image: "/homepage/blog/glowing-skin.jpg",
    tags: ["Guide", "Insight"],
    slug: "ingredients-glowing-skin",
  },
  {
    id: 4,
    title: "The power of daily hydration",
    image: "/homepage/blog/hydration.jpg",
    tags: ["Tips", "Hydration"],
    slug: "power-daily-hydration",
  },
  {
    id: 5,
    title: "How to spot natural ingredients",
    image: "/homepage/blog/natural-ingredients.jpg",
    tags: ["Guide", "Ingredients"],
    slug: "spot-natural-ingredients",
  },
  {
    id: 6,
    title: "Top 5 face masks for all skin types",
    image: "/homepage/blog/face-masks-types.jpg",
    tags: ["Skincare", "Reviews"],
    slug: "top-face-masks-skin-types",
  },
];

export default function SkincareWisdomSection() {
  return (
    <section className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-12 md:py-16 lg:py-20">
      {/* Section Title */}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-neutral-900 tracking-tight mb-8 md:mb-10">
        Your guide to natural skincare wisdom
      </h2>

      {/* Blog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {blogPosts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

// Blog Card Component
function BlogCard({
  post,
}: {
  post: {
    id: number;
    title: string;
    image: string;
    tags: string[];
    slug: string;
  };
}) {
  return (
    <article className="group">
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden mb-4">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url('${post.image}')`,
          }}
        />

        {/* Tags */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
          {post.tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-white text-neutral-900 text-xs font-medium rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="text-base md:text-lg font-medium text-neutral-900 mb-2 leading-snug">
          {post.title}
        </h3>
        <Link
          href={`/blog/${post.slug}`}
          className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center gap-1"
        >
          Read more
        </Link>
      </div>
    </article>
  );
}