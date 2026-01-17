import { AbstractFileProviderService, MedusaError } from '@medusajs/framework/utils';
import { Logger } from '@medusajs/framework/types';
import {
  ProviderUploadFileDTO,
  ProviderDeleteFileDTO,
  ProviderFileResultDTO,
  ProviderGetFileDTO,
  ProviderGetPresignedUploadUrlDTO
} from '@medusajs/framework/types';
import { Client } from 'minio';
import path from 'path';
import { ulid } from 'ulid';
import { Readable } from 'stream';

type InjectedDependencies = {
  logger: Logger
}

interface MinioServiceConfig {
  endPoint: string
  accessKey: string
  secretKey: string
  bucket?: string
  port?: number
  useSSL?: boolean
}

export interface MinioFileProviderOptions {
  endPoint: string
  accessKey: string
  secretKey: string
  bucket?: string
  port?: number
  useSSL?: boolean
}

const DEFAULT_BUCKET = 'medusa-media'

// Security: Allowed file types for upload
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  // Videos (if needed for product media)
  'video/mp4',
  'video/webm',
])

// Security: Allowed file extensions
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf',
  '.mp4', '.webm',
])

// Security: Maximum file size (50MB - supports video uploads)
const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * Service to handle file storage using MinIO.
 */
class MinioFileProviderService extends AbstractFileProviderService {
  static identifier = 'minio-file'
  protected readonly config_: MinioServiceConfig
  protected readonly logger_: Logger
  protected client: Client
  protected readonly bucket: string

  constructor({ logger }: InjectedDependencies, options: MinioFileProviderOptions) {
    super()
    this.logger_ = logger
    
    // Clean endpoint - remove protocol if present
    const cleanEndpoint = options.endPoint.replace(/^https?:\/\//, '')
    
    this.config_ = {
      endPoint: cleanEndpoint,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
      bucket: options.bucket,
      port: options.port || 443,
      useSSL: options.useSSL !== false // Default true
    }

    // Use provided bucket or default
    this.bucket = this.config_.bucket || DEFAULT_BUCKET
    
    // Initialize Minio client
    this.client = new Client({
      endPoint: this.config_.endPoint,
      port: this.config_.port,
      useSSL: this.config_.useSSL,
      accessKey: this.config_.accessKey,
      secretKey: this.config_.secretKey,
      pathStyle: true, // Important for Railway MinIO
    })

    // Log configuration (without exposing secrets)
    this.logger_.info(`MinIO client initialized`)
    this.logger_.info(`Endpoint: ${this.config_.endPoint}`)
    this.logger_.info(`Port: ${this.config_.port}`)
    this.logger_.info(`SSL: ${this.config_.useSSL}`)
    this.logger_.info(`Bucket: ${this.bucket}`)
    this.logger_.info(`Access Key: ${this.config_.accessKey.substring(0, 8)}...`)

    // Initialize bucket and policy
    this.initializeBucket().catch(error => {
      this.logger_.error(`Failed to initialize MinIO bucket: ${error.message}`)
    })
  }

  static validateOptions(options: Record<string, any>) {
    const requiredFields = [
      'endPoint',
      'accessKey',
      'secretKey'
    ]

    requiredFields.forEach((field) => {
      if (!options[field]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${field} is required in the provider's options`
        )
      }
    })
  }

  private async initializeBucket(): Promise<void> {
    try {
      this.logger_.info(`Checking if bucket "${this.bucket}" exists...`)
      
      // Check if bucket exists
      const bucketExists = await this.client.bucketExists(this.bucket)
      
      if (!bucketExists) {
        this.logger_.info(`Bucket "${this.bucket}" does not exist, creating...`)
        // Create the bucket
        await this.client.makeBucket(this.bucket)
        this.logger_.info(`✅ Created bucket: ${this.bucket}`)

        // Set bucket policy to allow public read access
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicRead',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`]
            }
          ]
        }

        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
        this.logger_.info(`✅ Set public read policy for bucket: ${this.bucket}`)
      } else {
        this.logger_.info(`✅ Using existing bucket: ${this.bucket}`)
        
        // Verify/update policy on existing bucket
        try {
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicRead',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`]
              }
            ]
          }
          await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy))
          this.logger_.info(`✅ Updated public read policy for existing bucket: ${this.bucket}`)
        } catch (policyError: any) {
          this.logger_.warn(`⚠️ Failed to update policy for existing bucket: ${policyError.message}`)
        }
      }
    } catch (error: any) {
      this.logger_.error(`❌ Error initializing bucket: ${error.message}`)
      this.logger_.error(`Error code: ${error.code}`)
      this.logger_.error(`Error details: ${JSON.stringify(error, null, 2)}`)
      throw error
    }
  }

  async upload(
    file: ProviderUploadFileDTO
  ): Promise<ProviderFileResultDTO> {
    if (!file) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file provided'
      )
    }

    if (!file.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    // Security: Validate file extension
    const parsedFilename = path.parse(file.filename)
    const extension = parsedFilename.ext.toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      this.logger_.warn(`[SECURITY] Rejected file upload with disallowed extension: ${extension}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File type not allowed'
      )
    }

    // Security: Validate MIME type
    if (file.mimeType && !ALLOWED_MIME_TYPES.has(file.mimeType)) {
      this.logger_.warn(`[SECURITY] Rejected file upload with disallowed MIME type: ${file.mimeType}`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File type not allowed'
      )
    }

    // Security: Validate file size
    const content = Buffer.from(file.content, 'binary')
    if (content.length > MAX_FILE_SIZE) {
      this.logger_.warn(`[SECURITY] Rejected file upload exceeding size limit: ${content.length} bytes`)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File size exceeds maximum allowed (50MB)'
      )
    }

    try {
      const fileKey = `${parsedFilename.name}-${ulid()}${parsedFilename.ext}`

      this.logger_.info(`Uploading file to MinIO...`)
      this.logger_.info(`Bucket: ${this.bucket}`)
      this.logger_.info(`File key: ${fileKey}`)
      this.logger_.info(`Content type: ${file.mimeType}`)
      this.logger_.info(`Content length: ${content.length} bytes`)

      // Upload file - MinIO doesn't support x-amz-acl header in some configurations
      await this.client.putObject(
        this.bucket,
        fileKey,
        content,
        content.length,
        {
          'Content-Type': file.mimeType || 'application/octet-stream',
        }
      )

      // Generate public URL
      const protocol = this.config_.useSSL ? 'https' : 'http'
      const url = `${protocol}://${this.config_.endPoint}/${this.bucket}/${fileKey}`

      this.logger_.info(`✅ Successfully uploaded file: ${url}`)

      return {
        url,
        key: fileKey
      }
    } catch (error: any) {
      this.logger_.error(`❌ Upload failed`)
      this.logger_.error(`Error message: ${error.message}`)
      this.logger_.error(`Error code: ${error.code}`)
      this.logger_.error(`Error name: ${error.name}`)
      if (error.stack) {
        this.logger_.error(`Stack trace: ${error.stack}`)
      }
      
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to upload file: ${error.message}`
      )
    }
  }

  async delete(
    fileData: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]
  ): Promise<void> {
    const files = Array.isArray(fileData) ? fileData : [fileData];

    for (const file of files) {
      if (!file?.fileKey) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'No file key provided'
        );
      }

      try {
        await this.client.removeObject(this.bucket, file.fileKey);
        this.logger_.info(`✅ Successfully deleted file ${file.fileKey} from MinIO bucket ${this.bucket}`);
      } catch (error: any) {
        this.logger_.warn(`⚠️ Failed to delete file ${file.fileKey}: ${error.message}`);
      }
    }
  }

  async getPresignedDownloadUrl(
    fileData: ProviderGetFileDTO
  ): Promise<string> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const url = await this.client.presignedGetObject(
        this.bucket,
        fileData.fileKey,
        24 * 60 * 60 // URL expires in 24 hours
      )
      this.logger_.info(`Generated presigned URL for file ${fileData.fileKey}`)
      return url
    } catch (error: any) {
      this.logger_.error(`Failed to generate presigned URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate presigned URL: ${error.message}`
      )
    }
  }

  async getPresignedUploadUrl(
    fileData: ProviderGetPresignedUploadUrlDTO
  ): Promise<ProviderFileResultDTO> {
    if (!fileData?.filename) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No filename provided'
      )
    }

    try {
      // Use the filename directly as the key (matches S3 provider behavior for presigned uploads)
      const fileKey = fileData.filename

      // Generate presigned PUT URL that expires in 15 minutes
      const url = await this.client.presignedPutObject(
        this.bucket,
        fileKey,
        15 * 60 // URL expires in 15 minutes
      )

      return {
        url,
        key: fileKey
      }
    } catch (error: any) {
      this.logger_.error(`Failed to generate presigned upload URL: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate presigned upload URL: ${error.message}`
      )
    }
  }

  async getAsBuffer(fileData: ProviderGetFileDTO): Promise<Buffer> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      const stream = await this.client.getObject(this.bucket, fileData.fileKey)
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = []

        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks)))
        stream.on('error', reject)
      })

      this.logger_.info(`Retrieved buffer for file ${fileData.fileKey}`)
      return buffer
    } catch (error: any) {
      this.logger_.error(`Failed to get buffer: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get buffer: ${error.message}`
      )
    }
  }

  async getDownloadStream(fileData: ProviderGetFileDTO): Promise<Readable> {
    if (!fileData?.fileKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'No file key provided'
      )
    }

    try {
      // Get the MinIO stream directly
      const minioStream = await this.client.getObject(this.bucket, fileData.fileKey)

      this.logger_.info(`Retrieved download stream for file ${fileData.fileKey}`)
      return minioStream
    } catch (error: any) {
      this.logger_.error(`Failed to get download stream: ${error.message}`)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get download stream: ${error.message}`
      )
    }
  }
}

export default MinioFileProviderService