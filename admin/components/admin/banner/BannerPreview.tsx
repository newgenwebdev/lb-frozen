import React from "react";

type BannerPreviewProps = {
  text: string;
  backgroundColor: string;
  textColor: string;
  link?: string;
};

export function BannerPreview({
  text,
  backgroundColor,
  textColor,
  link,
}: BannerPreviewProps): React.JSX.Element {
  const displayText = text || "Your Announcement Here";

  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-6">
      <label className="mb-4 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
        Preview
      </label>
      <div
        className="flex items-center justify-between rounded-lg px-6 py-4 transition-colors"
        style={{
          backgroundColor: backgroundColor || "#007AFF",
          color: textColor || "#FFFFFF",
        }}
      >
        <span className="font-public text-[16px] font-medium">{displayText}</span>
        {link && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M7.5 12.5L12.5 7.5M12.5 7.5H8.75M12.5 7.5V11.25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

