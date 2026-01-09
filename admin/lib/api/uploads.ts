/**
 * Upload API Functions
 *
 * API layer for file uploads to Medusa backend
 */

import { api } from "./client"

export type UploadResponse = {
  files: Array<{
    id: string
    url: string
    key?: string
  }>
}

/**
 * Upload a single file to Medusa backend
 * @param file - File to upload
 * @returns URL of the uploaded file
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("files", file)

  const response = await api.post<UploadResponse>("/admin/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  if (!response.data.files || response.data.files.length === 0) {
    throw new Error("Upload failed: No URL returned")
  }

  return response.data.files[0].url
}

/**
 * Upload multiple files to Medusa backend
 * @param files - Array of files to upload
 * @returns Array of URLs of the uploaded files
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append("files", file)
  })

  const response = await api.post<UploadResponse>("/admin/uploads", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  if (!response.data.files || response.data.files.length === 0) {
    throw new Error("Upload failed: No URLs returned")
  }

  return response.data.files.map((file) => file.url)
}
