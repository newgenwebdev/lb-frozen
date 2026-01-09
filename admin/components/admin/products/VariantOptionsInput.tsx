"use client";

import React, { useState, useRef } from "react";

export type OptionImage = {
  file?: File;
  preview?: string;
};

type VariantOptionsInputProps = {
  variantType: string;
  values: string[];
  addPictures: boolean;
  optionImages?: Record<string, OptionImage>;
  onChange: (values: string[]) => void;
  onAddPicturesChange: (enabled: boolean) => void;
  onOptionImageChange?: (optionValue: string, file: File | null) => void;
  onRemove: () => void;
  onTypeChange: (newType: string) => void;
};

const VARIANT_TYPES = [
  "Color",
  "Size",
  "Material",
  "Style",
  "Pattern",
  "Weight",
  "Volume",
  "Scent",
  "Custom",
];

export function VariantOptionsInput({
  variantType,
  values,
  addPictures,
  optionImages = {},
  onChange,
  onAddPicturesChange,
  onOptionImageChange,
  onRemove,
  onTypeChange,
}: VariantOptionsInputProps): React.JSX.Element {
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  const handleAddOption = (): void => {
    onChange([...values, ""]);
  };

  const handleRemoveOption = (index: number): void => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string): void => {
    const updated = [...values];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="mb-4 rounded-lg border border-[#E5E7EB] bg-[#F5F5F5] p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <span className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
          Variant
        </span>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={addPictures}
            onChange={(e) => onAddPicturesChange(e.target.checked)}
            className="peer sr-only"
          />
          <div className="flex h-4 w-4 items-center justify-center rounded border border-[#E3E3E3] bg-white transition-all peer-checked:border-black peer-checked:bg-black peer-checked:[&>svg]:opacity-100">
            <svg
              className="h-3 w-3 text-white opacity-0 transition-opacity"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
            Add Pictures
          </span>
        </label>
      </div>

      {/* Variant Type Dropdown */}
      <div className="mb-3">
        <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
          Variant Type
        </label>
        <div ref={typeDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-[#E3E3E3] bg-white px-4 py-3 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors hover:border-[#999] focus:border-black"
          >
            <span>{variantType || "Choose Variant Type"}</span>
            <svg
              className={`h-4 w-4 text-[#030712] transition-transform ${
                isTypeDropdownOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isTypeDropdownOpen && (
            <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-[#E3E3E3] bg-white shadow-lg">
              {VARIANT_TYPES.map((type) => (
                <li
                  key={type}
                  onClick={() => {
                    onTypeChange(type);
                    setIsTypeDropdownOpen(false);
                  }}
                  className={`cursor-pointer px-4 py-3 font-geist text-[16px] tracking-[-0.16px] text-[#030712] transition-colors hover:bg-[#F9FAFB] ${
                    variantType === type
                      ? "bg-[#F9FAFB] font-medium"
                      : "font-normal"
                  }`}
                >
                  {type}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Options List */}
      <div className="mb-3">
        <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
          Option
        </label>
        <div className="space-y-3">
          {values.map((value, index) => (
            <OptionRow
              key={index}
              value={value}
              showImageUpload={addPictures}
              imagePreview={optionImages[value]?.preview}
              onChange={(newValue) => handleOptionChange(index, newValue)}
              onImageChange={(file) => onOptionImageChange?.(value, file)}
              onRemove={() => handleRemoveOption(index)}
            />
          ))}

          {/* Add Option Button - shown as a new row with placeholder */}
          {values.length === 0 && (
            <OptionRow
              value=""
              showImageUpload={addPictures}
              onChange={(newValue) => {
                if (newValue.trim()) {
                  onChange([newValue]);
                }
              }}
              onImageChange={() => {}}
              onRemove={() => {}}
              isPlaceholder
            />
          )}
        </div>
      </div>

      {/* Add Option Button - shown when there are already options */}
      {values.length > 0 && (
        <button
          type="button"
          onClick={handleAddOption}
          className="mb-3 flex cursor-pointer items-center gap-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#030712] transition-colors hover:text-black"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M8 3.33333V12.6667M3.33333 8H12.6667"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Add Option
        </button>
      )}

      {/* Remove Variant Type Button */}
      <button
        type="button"
        onClick={onRemove}
        className="flex cursor-pointer items-center gap-2 font-geist text-[14px] font-normal tracking-[-0.14px] text-[#DC2626] transition-colors hover:text-[#B91C1C]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.7667 14H5.23333C4.54 14 3.96 13.46 3.90667 12.7667L3.31 4.66667H12.6767L12.09 12.76C12.0383 13.4583 11.4583 14 10.7667 14Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 7.33333V11.3333"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.66667 4.66667H13.3333"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Remove Variant Type
      </button>
    </div>
  );
}

type OptionRowProps = {
  value: string;
  showImageUpload: boolean;
  imagePreview?: string;
  onChange: (value: string) => void;
  onImageChange: (file: File | null) => void;
  onRemove: () => void;
  isPlaceholder?: boolean;
};

function OptionRow({
  value,
  showImageUpload,
  imagePreview,
  onChange,
  onImageChange,
  onRemove,
  isPlaceholder = false,
}: OptionRowProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  return (
    <div className="flex items-start gap-3">
      {/* Drag handle */}
      <button
        type="button"
        className="mt-2 cursor-grab active:cursor-grabbing"
        aria-label="Reorder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <circle cx="7" cy="5" r="1.5" fill="#6A7282" />
          <circle cx="13" cy="5" r="1.5" fill="#6A7282" />
          <circle cx="7" cy="10" r="1.5" fill="#6A7282" />
          <circle cx="13" cy="10" r="1.5" fill="#6A7282" />
          <circle cx="7" cy="15" r="1.5" fill="#6A7282" />
          <circle cx="13" cy="15" r="1.5" fill="#6A7282" />
        </svg>
      </button>

      {/* Input field and image upload stacked vertically */}
      <div className="flex-1 space-y-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Set Option Variant"
          className="w-full rounded-lg border border-[#E3E3E3] bg-white px-4 py-3 font-geist text-[16px] font-normal tracking-[-0.16px] text-[#030712] outline-none transition-colors placeholder:text-[#6A7282] focus:border-black"
        />

        {/* Image upload box - shown below the input when addPictures is checked */}
        {showImageUpload && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`group relative flex aspect-square h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed transition-colors overflow-hidden ${
              imagePreview
                ? "border-[#D1D5DB] bg-[#F9FAFB]"
                : "border-[#D1D5DB] bg-[#FAFAFA] hover:border-[#9CA3AF] hover:bg-[#F5F5F5]"
            }`}
          >
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Option preview"
                  className="h-full w-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M14.167 6.667L10 2.5 5.833 6.667M10 2.5v10"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M17.5 12.5v3.333a1.667 1.667 0 01-1.667 1.667H4.167A1.667 1.667 0 012.5 15.833V12.5M14.167 6.667L10 2.5 5.833 6.667M10 2.5v10"
                  stroke="#6A7282"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Delete button - don't show for placeholder */}
      {!isPlaceholder && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 cursor-pointer rounded p-1 transition-colors hover:bg-[#FEE2E2]"
          aria-label="Remove option"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M13.4583 17.5H6.54167C5.675 17.5 4.95 16.825 4.88333 15.9583L4.1375 5.83333H15.8458L15.1125 15.95C15.0479 16.8229 14.3229 17.5 13.4583 17.5Z"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 9.16667V14.1667"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3.33333 5.83333H16.6667"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14.1667 5.83333L13.3808 3.60417C13.2433 3.20333 12.8658 2.9375 12.4408 2.9375H7.55917C7.13417 2.9375 6.75667 3.20333 6.61917 3.60417L5.83333 5.83333"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12.8583 9.16667L12.5 14.1667"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.14167 9.16667L7.5 14.1667"
              stroke="#DC2626"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
