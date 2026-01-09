"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { FormInput, FormSection } from "@/components/admin/membership";
import { useArticle, useUpdateArticle } from "@/lib/api/queries";
import { uploadFile } from "@/lib/api/uploads";
import { useToast } from "@/contexts/ToastContext";
import type { ArticleFormData } from "@/lib/types/article";

export default function EditArticlePage(): React.JSX.Element {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const { data: article, isLoading: isLoadingArticle, isError } = useArticle(articleId);
  const updateArticleMutation = useUpdateArticle();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Initialize form data when article is loaded
  useEffect(() => {
    if (article && !isInitialized) {
      // Parse tags - handle both string and array formats from API
      // Cast to unknown first since API may return string despite type definition
      const rawTags = article.tags as unknown;
      let parsedTags: string[] = [];
      if (Array.isArray(rawTags)) {
        parsedTags = rawTags;
      } else if (typeof rawTags === "string" && rawTags) {
        // Handle comma-separated string
        parsedTags = rawTags.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      }

      setFormData({
        title: article.title,
        slug: article.slug,
        content: article.content,
        excerpt: article.excerpt || "",
        thumbnail: article.thumbnail || "",
        category: article.category || "",
        tags: parsedTags,
        author: article.author || "",
        status: article.status,
        featured: article.featured,
        published_at: article.published_at ? article.published_at.slice(0, 16) : "",
      });
      setTagsInput(parsedTags.join(", "));
      setIsInitialized(true);
    }
  }, [article, isInitialized]);

  const handleInputChange = (field: keyof ArticleFormData, value: string | boolean | string[]): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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

    updateArticleMutation.mutate(
      { id: articleId, data: formData },
      {
        onSuccess: () => {
          router.push("/admin/article");
        },
        onError: (error) => {
          console.error("Failed to update article:", error);
          showToast("Failed to update article. Please try again.", "error");
        },
      }
    );
  };

  const handleCancel = (): void => {
    router.push("/admin/article");
  };

  // Loading state
  if (isLoadingArticle) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-black border-r-transparent"></div>
            <p className="mt-4 font-public text-[14px] text-[#6A7282]">Loading article...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !article) {
    return (
      <div className="px-4 md:px-8">
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-[16px] font-medium text-[#030712]">Article not found</h3>
            <p className="mt-2 text-[14px] text-[#6A7282]">
              The article you are looking for does not exist or has been deleted.
            </p>
            <button
              onClick={() => router.push("/admin/article")}
              className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Back to Articles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-geist text-[24px] font-medium leading-[120%] tracking-[-0.48px] text-[#030712]">
          Edit Article
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleCancel} disabled={updateArticleMutation.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={updateArticleMutation.isPending || isUploading}>
            {updateArticleMutation.isPending ? "Saving..." : "Save Changes"}
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
              onChange={(value) => handleInputChange("title", value)}
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
