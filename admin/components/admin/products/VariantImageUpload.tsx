"use client";

import React, { useRef, useState } from "react";

type VariantImageUploadProps = {
  value?: File;
  onChange: (file: File | null) => void;
  previewUrl?: string;
};

export function VariantImageUpload({
  value,
  onChange,
  previewUrl,
}: VariantImageUploadProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(previewUrl || null);

  const handleFileChange = (file: File | null): void => {
    if (file) {
      onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      onChange(null);
      setPreview(null);
    }
  };

  const handleClick = (): void => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent): void => {
    e.stopPropagation();
    handleFileChange(null);
  };

  return (
    <div className="relative">
      {preview ? (
        <div className="group relative h-12 w-12 overflow-hidden rounded-lg border border-[#E5E7EB]">
          <img
            src={preview}
            alt="Variant"
            className="h-full w-full object-cover"
          />
          {/* Hover overlay with remove button */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={handleRemove}
              className="cursor-pointer rounded bg-white p-1 transition-colors hover:bg-[#FEE2E2]"
              aria-label="Remove image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M12 4L4 12M4 4l8 8"
                  stroke="#DC2626"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[#E5E7EB] bg-[#FAFAFA] transition-colors hover:bg-[#F5F5F5]"
          aria-label="Upload image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M10 4.167v11.666M4.167 10h11.666"
              stroke="#6A7282"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileChange(file);
        }}
      />
    </div>
  );
}
