"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { FormInput, FormSection } from "@/components/admin/membership";
import { useCreateArticle } from "@/lib/api/queries";
import { uploadFile } from "@/lib/api/uploads";
import { useToast } from "@/contexts/ToastContext";
import type { ArticleFormData, ArticleStatus } from "@/lib/types/article";

export default function AddArticlePage(): React.JSX.Element {
  const router = useRouter();
  const createArticleMutation = useCreateArticle();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<ArticleFormData>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    thumbnail: "",
    category: "",
    tags: [],
    author: "",
    status: "draft",
    featured: false,
    published_at: "",
  });

  const [tagsInput, setTagsInput] = useState("");

  const handleInputChange = (field: keyof ArticleFormData, value: string | boolean | string[]): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (value: string): void => {
    handleInputChange("title", value);
    // Auto-generate slug from title if slug is empty or was auto-generated
    if (!formData.slug || formData.slug === generateSlug(formData.title)) {
      handleInputChange("slug", generateSlug(value));
    }
  };

  const handleTagsChange = (value: string): void => {
    setTagsInput(value);
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
    handleInputChange("tags", tags);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const url = await uploadFile(file);
      handleInputChange("thumbnail", url);
    } catch (error) {
      console.error("Failed to upload thumbnail:", error);
      showToast("Failed to upload thumbnail. Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent): Promise<void> => {
    e?.preventDefault();

    // Validate required fields
    if (!formData.title.trim()) {
      showToast("Please enter article title", "error");
      return;
    }
    if (!formData.slug.trim()) {
      showToast("Please enter article slug", "error");
      return;
    }
    if (!formData.content.trim()) {
      showToast("Please enter article content", "error");
      return;
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(formData.slug)) {
      showToast("Slug must contain only lowercase letters, numbers, and hyphens", "error");
      return;
    }

    createArticleMutation.mutate(formData, {
      onSuccess: () => {
        router.push("/admin/article");
      },
      onError: (error) => {
        console.error("Failed to create article:", error);
        showToast("Failed to create article. Please try again.", "error");
      },
    });
  };

  const handleCancel = (): void => {
    router.push("/admin/article");
  };

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Create New Article
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleCancel} disabled={createArticleMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={createArticleMutation.isPending || isUploading}>
            {createArticleMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <FormSection title="Basic Information">
          <div className="space-y-4">
            <FormInput
              label="Title"
              placeholder="Enter article title"
              value={formData.title}
              onChange={handleTitleChange}
            />
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[#6A7282]">/articles/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="article-slug"
                  className="flex-1 rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] border-[#E5E5E5] focus:border-[#030712]"
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Thumbnail */}
        <FormSection title="Thumbnail">
          <div className="space-y-4">
            {formData.thumbnail && (
              <div className="relative w-full max-w-md">
                <img
                  src={formData.thumbnail}
                  alt="Thumbnail preview"
                  className="w-full h-48 object-cover rounded-lg border border-[#E5E7EB]"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange("thumbnail", "")}
                  className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                Upload Thumbnail
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleThumbnailUpload}
                disabled={isUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800 file:cursor-pointer"
              />
              {isUploading && <p className="mt-2 text-sm text-[#6A7282]">Uploading...</p>}
            </div>
          </div>
        </FormSection>

        {/* Content */}
        <FormSection title="Content">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                Excerpt (Short Summary)
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleInputChange("excerpt", e.target.value)}
                placeholder="A brief summary of the article (max 500 characters)"
                maxLength={500}
                rows={2}
                className="w-full rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] border-[#E5E5E5] focus:border-[#030712] resize-none"
              />
              <p className="mt-1 text-xs text-[#6A7282]">{formData.excerpt?.length || 0}/500 characters</p>
            </div>
            <div>
              <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                placeholder="Write your article content here... (HTML supported)"
                rows={12}
                className="w-full rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] border-[#E5E5E5] focus:border-[#030712] resize-none"
              />
            </div>
          </div>
        </FormSection>

        {/* Metadata */}
        <FormSection title="Metadata">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Category"
              placeholder="e.g. News, Tutorial, Guide"
              value={formData.category || ""}
              onChange={(value) => handleInputChange("category", value)}
            />
            <FormInput
              label="Author"
              placeholder="Author name"
              value={formData.author || ""}
              onChange={(value) => handleInputChange("author", value)}
            />
          </div>
          <div className="mt-4">
            <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => handleTagsChange(e.target.value)}
              placeholder="e.g. skincare, beauty, tips"
              className="w-full rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors placeholder:text-[#99A1AF] border-[#E5E5E5] focus:border-[#030712]"
            />
            {formData.tags && formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#374151]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* Publishing Options */}
        <FormSection title="Publishing Options">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                Status:
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={formData.status === "draft"}
                    onChange={() => handleInputChange("status", "draft")}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-[14px] text-[#030712]">Draft</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={formData.status === "published"}
                    onChange={() => handleInputChange("status", "published")}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-[14px] text-[#030712]">Published</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleInputChange("featured", e.target.checked)}
                  className="w-4 h-4 accent-black rounded"
                />
                <span className="font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                  Featured Article
                </span>
              </label>
            </div>

            {formData.status === "published" && (
              <div>
                <label className="mb-2 block font-geist text-[14px] font-medium tracking-[-0.14px] text-[#030712]">
                  Publish Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.published_at || ""}
                  onChange={(e) => handleInputChange("published_at", e.target.value)}
                  className="rounded-lg border px-4 py-2 font-public text-[14px] font-medium tracking-[-0.14px] outline-none transition-colors border-[#E5E5E5] focus:border-[#030712]"
                />
              </div>
            )}
          </div>
        </FormSection>
      </form>
    </div>
  );
}
