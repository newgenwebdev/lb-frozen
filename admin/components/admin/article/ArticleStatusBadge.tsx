import React from "react";
import type { ArticleStatus } from "@/lib/types/article";

type ArticleStatusBadgeProps = {
  status: ArticleStatus;
};

export function ArticleStatusBadge({ status }: ArticleStatusBadgeProps): React.JSX.Element {
  const statusConfig = {
    published: {
      bgColor: "bg-[#DCFCE7]",
      textColor: "text-[#166534]",
      label: "Published",
    },
    draft: {
      bgColor: "bg-[#FEF3C7]",
      textColor: "text-[#92400E]",
      label: "Draft",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}
