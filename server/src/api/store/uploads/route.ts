import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"

interface UploadFileInput {
  name: string
  content: string
}

/**
 * POST /store/uploads
 * Upload files for storefront (profile images, etc.)
 * Mirrors the admin /admin/uploads endpoint functionality
 * 
 * Accepts JSON body with files array:
 * {
 *   files: [{ name: "filename.jpg", content: "base64_or_binary_content" }]
 * }
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    // Accept files from JSON body (same format as admin uploads)
    const body = req.body as { files?: UploadFileInput[] }
    
    console.log("[STORE UPLOAD] Request received:", {
      hasFiles: !!body.files,
      fileCount: body.files?.length || 0,
    })
    
    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      console.error("[STORE UPLOAD] No files provided")
      return res.status(400).json({
        message: "No files provided. Expected { files: [{ name, content }] }",
      })
    }

    // Validate file inputs
    for (const file of body.files) {
      if (!file.name || !file.content) {
        console.error("[STORE UPLOAD] Invalid file:", { hasName: !!file.name, hasContent: !!file.content })
        return res.status(400).json({
          message: "Each file must have 'name' and 'content' properties",
        })
      }
    }

    console.log("[STORE UPLOAD] Uploading files:", body.files.map(f => ({ name: f.name, size: f.content.length })))

    // Use the same workflow as admin uploads
    const { result } = await uploadFilesWorkflow(req.scope).run({
      input: {
        files: body.files.map(file => ({
          filename: file.name,
          mimeType: getMimeType(file.name),
          content: file.content,
          access: "public" as const,
        })),
      },
    })

    console.log("[STORE UPLOAD] Upload successful:", result)

    res.json({
      files: result,
    })
  } catch (error) {
    console.error("[STORE UPLOAD] Failed to upload file:", error)
    console.error("[STORE UPLOAD] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    res.status(500).json({
      message: "Failed to upload file",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * Get MIME type from filename extension
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop()
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
  }
  return mimeTypes[ext || ''] || 'application/octet-stream'
}
