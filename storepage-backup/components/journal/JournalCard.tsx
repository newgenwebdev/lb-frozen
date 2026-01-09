import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Article } from "@/lib/api/journal";
import { formatPublishedDate } from "@/lib/api/journal";

type JournalCardProps = {
  article: Article;
};

export const JournalCard = ({ article }: JournalCardProps): React.JSX.Element => {
  const { slug, title, excerpt, thumbnail, category, published_at } = article;

  return (
    <Link href={`/journal/${slug}`} className="group block">
      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-lg bg-gray-200">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100">
            <span className="text-gray-400">No image</span>
          </div>
        )}
        {category && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-black px-3 py-1 text-[12px] font-medium uppercase tracking-wider text-white">
            {category}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {published_at && (
          <p className="text-[12px] font-medium uppercase tracking-wider text-gray-500">
            {formatPublishedDate(published_at)}
          </p>
        )}
        <h3 className="text-[18px] font-medium leading-[1.3] tracking-[-0.5px] text-black group-hover:underline">
          {title}
        </h3>
        {excerpt && (
          <p className="line-clamp-2 text-[14px] leading-[1.5] text-gray-600">
            {excerpt}
          </p>
        )}
      </div>
    </Link>
  );
};
