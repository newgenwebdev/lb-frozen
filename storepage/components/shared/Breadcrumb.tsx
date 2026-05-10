import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <div
      className={
        className ??
        "flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-4 sm:mb-8"
      }
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-gray-900">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-gray-900 font-medium" : undefined}>
                {item.label}
              </span>
            )}
            {!isLast && <span>›</span>}
          </span>
        );
      })}
    </div>
  );
}
