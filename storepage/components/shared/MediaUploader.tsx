"use client";

import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadFiles } from "@/lib/api/uploads";

interface MediaFile {
  id: string;
  file: File;
  preview: string;
}

export interface MediaUploaderRef {
  uploadAll: () => Promise<string[]>;
  hasFiles: () => boolean;
  isUploading: () => boolean;
}

interface MediaUploaderProps {
  onMediaChange?: (urls: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const MediaUploader = forwardRef<MediaUploaderRef, MediaUploaderProps>(
  ({ onMediaChange, maxFiles = 5, maxSizeMB = 10 }, ref) => {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      uploadAll: async () => {
        if (mediaFiles.length === 0) return [];
        
        setUploading(true);
        try {
          const files = mediaFiles.map((m) => m.file);
          const urls = await uploadFiles(files);
          onMediaChange?.(urls);
          return urls;
        } catch (error) {
          console.error("Upload failed:", error);
          throw error;
        } finally {
          setUploading(false);
        }
      },
      hasFiles: () => mediaFiles.length > 0,
      isUploading: () => uploading,
    }));

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      // Check total files limit
      if (mediaFiles.length + files.length > maxFiles) {
        alert(`Maximum ${maxFiles} photos allowed`);
        return;
      }

      // Process each file
      const newMediaFiles: MediaFile[] = [];
      for (const file of files) {
        // Check file type - only images
        if (!file.type.startsWith("image/")) {
          alert(`File ${file.name} is not a valid image`);
          continue;
        }

        // Check file size
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSizeMB) {
          alert(`File ${file.name} is too large. Max size: ${maxSizeMB}MB`);
          continue;
        }

        // Create preview
        const preview = URL.createObjectURL(file);
        newMediaFiles.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
        });
      }

      if (newMediaFiles.length > 0) {
        setMediaFiles((prev) => [...prev, ...newMediaFiles]);
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const removeFile = (id: string) => {
      setMediaFiles((prev) => prev.filter((m) => m.id !== id));
    };

    return (
      <div className="space-y-4">
        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={mediaFiles.length >= maxFiles || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Upload className="w-4 h-4" />
            Add Photos ({mediaFiles.length}/{maxFiles})
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Max {maxFiles} photos, {maxSizeMB}MB each. Photos will be uploaded when you submit.
          </p>
        </div>

        {/* Preview Grid */}
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {mediaFiles.map((media) => (
              <div
                key={media.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
              >
                {/* Preview */}
                <img
                  src={media.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />

                {/* Uploading Overlay */}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}

                {/* Remove Button */}
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(media.id)}
                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Image Icon */}
                <div className="absolute bottom-2 right-2">
                  <ImageIcon className="w-4 h-4 text-white drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Status */}
        {uploading && (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading {mediaFiles.length} photo{mediaFiles.length > 1 ? "s" : ""}...
          </p>
        )}
      </div>
    );
  }
);

MediaUploader.displayName = "MediaUploader";

export default MediaUploader;
