/**
 * Upload API Functions for Storepage
 * Uses Medusa's built-in file upload system with MinIO
 */

import { apiClient } from "./client"

export type UploadResponse = {
  files: Array<{
    id: string
    url: string
    key?: string
  }>
}

/**
 * Convert File to binary string (same as profile upload)
 */
function fileToBinaryString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resolve(binary);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Upload a single file
 */
export async function uploadFile(file: File): Promise<string> {
  const content = await fileToBinaryString(file);

  const response = await apiClient.post<UploadResponse>("/store/uploads", {
    files: [{ name: file.name, content }],
  })

  if (!response.files || response.files.length === 0) {
    throw new Error("Upload failed: No URL returned")
  }

  return response.files[0].url
}

/**
 * Upload multiple files
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const filesData = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      content: await fileToBinaryString(file),
    }))
  )

  const response = await apiClient.post<UploadResponse>("/store/uploads", {
    files: filesData,
  })

  if (!response.files || response.files.length === 0) {
    throw new Error("Upload failed: No URLs returned")
  }

  return response.files.map((file) => file.url)
}
