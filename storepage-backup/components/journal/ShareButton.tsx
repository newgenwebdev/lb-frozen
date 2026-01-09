"use client";

import React from "react";

type ShareButtonProps = {
  title: string;
};

export const ShareButton = ({ title }: ShareButtonProps): React.JSX.Element => {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <button
      onClick={handleShare}
      className="cursor-pointer px-8 py-3 border border-neutral-900 rounded-full text-sm font-medium text-black bg-white hover:bg-neutral-900 hover:text-white transition-colors duration-300"
    >
      Share article
    </button>
  );
};
