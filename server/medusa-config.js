import { loadEnv, Modules, defineConfig } from '@medusajs/utils';
import {
  ADMIN_CORS,
  AUTH_CORS,
  BACKEND_URL,
  COOKIE_SECRET,
  JWT_SECRET,
  REDIS_URL,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL,
  SHOULD_DISABLE_ADMIN,
  STORE_CORS,
  STRIPE_API_KEY,
  STRIPE_WEBHOOK_SECRET,
  WORKER_MODE,
  MINIO_ENDPOINT,
  MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY,
  MINIO_BUCKET,
  MEILISEARCH_HOST,
  MEILISEARCH_ADMIN_KEY
} from './src/lib/constants';

loadEnv(process.env.NODE_ENV, process.cwd());

// Get DATABASE_URL directly from env to allow build without it
const DATABASE_URL = process.env.DATABASE_URL || '';

const medusaConfig = {
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseLogging: false,
    redisUrl: REDIS_URL,
    workerMode: WORKER_MODE,
    http: {
      adminCors: ADMIN_CORS,
      authCors: AUTH_CORS,
      storeCors: STORE_CORS,
      jwtSecret: JWT_SECRET,
      cookieSecret: COOKIE_SECRET
    },
    openapi: {
      enabled: true,
      path: "/docs"
    },
    build: {
      rollupOptions: {
        external: ["@medusajs/dashboard"]
      }
    }
  },
  admin: {
    backendUrl: BACKEND_URL,
    disable: SHOULD_DISABLE_ADMIN,
    vite: () => {
      // Extract hostname from BACKEND_URL for allowedHosts
      const allowedHosts = ['localhost', '127.0.0.1'];
      try {
        const url = new URL(BACKEND_URL);
        if (url.hostname && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
          allowedHosts.push(url.hostname);
          // Also add wildcard for the domain (e.g., .railway.app)
          if (url.hostname.includes('.railway.app')) {
            allowedHosts.push('.railway.app');
          }
        }
      } catch (e) {
        console.warn('Could not parse BACKEND_URL for allowedHosts:', e);
      }

      return {
        server: {
          allowedHosts
        },
        define: {
          __AUTH_TYPE__: JSON.stringify(process.env.AUTH_TYPE || 'session'),
          __JWT_TOKEN_STORAGE_KEY__: JSON.stringify('medusa_admin_token')
        }
      };
    }
  },
  modules: [
    {
      key: Modules.FILE,
      resolve: '@medusajs/file',
      options: {
        providers: [
          ...(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY ? [{
            resolve: './src/modules/minio-file',
            id: 'minio',
            options: {
              port: 443,
              useSsl: true,
              bucket: MINIO_BUCKET,
              accessKey: MINIO_ACCESS_KEY,
              secretKey: MINIO_SECRET_KEY,
              endPoint: MINIO_ENDPOINT,
            }
          }] : [{
            resolve: '@medusajs/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: `${BACKEND_URL}/static`
            }
          }])
        ]
      }
    },
    ...(REDIS_URL ? [{
      key: Modules.EVENT_BUS,
      resolve: '@medusajs/event-bus-redis',
      options: {
        redisUrl: REDIS_URL
      }
    },
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: '@medusajs/workflow-engine-redis',
      options: {
        redis: {
          url: REDIS_URL,
        }
      }
    }] : []),
    ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL || RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
      key: Modules.NOTIFICATION,
      resolve: '@medusajs/notification',
      options: {
        providers: [
          ...(SENDGRID_API_KEY && SENDGRID_FROM_EMAIL ? [{
            resolve: '@medusajs/notification-sendgrid',
            id: 'sendgrid',
            options: {
              channels: ['email'],
              api_key: SENDGRID_API_KEY,
              from: SENDGRID_FROM_EMAIL,
            }
          }] : []),
          ...(RESEND_API_KEY && RESEND_FROM_EMAIL ? [{
            resolve: './src/modules/email-notifications',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: RESEND_API_KEY,
              from: RESEND_FROM_EMAIL,
            },
          }] : []),
        ]
      }
    }] : []),
    ...(STRIPE_API_KEY ? [{
      key: Modules.PAYMENT,
      resolve: '@medusajs/payment',
      options: {
        providers: [
          {
            resolve: '@medusajs/payment-stripe',
            id: 'stripe',
            options: {
              apiKey: STRIPE_API_KEY,
              ...(STRIPE_WEBHOOK_SECRET && { webhookSecret: STRIPE_WEBHOOK_SECRET }),
            },
          },
        ],
      },
    }] : []),
    {
      resolve: './src/modules/membership'
    },
    {
      resolve: './src/modules/membership-config'
    },
    {
      resolve: './src/modules/membership-promo'
    },
    {
      resolve: './src/modules/tier-config'
    },
    {
      resolve: './src/modules/points'
    },
    {
      resolve: './src/modules/order-extension'
    },
    {
      resolve: './src/modules/return'
    },
    {
      resolve: './src/modules/promo'
    },
    {
      resolve: './src/modules/banner'
    },
    {
      resolve: './src/modules/brand'
    },
    {
       resolve: './src/modules/article'
    },
    {
      resolve: './src/modules/review'
    },
    {
      resolve: './src/modules/wishlist'
    },
    {
      resolve: './src/modules/shipment'
    },
    {
      resolve: './src/modules/shipping-settings'
    },
    {
      resolve: './src/modules/easyparcel-order'
    },
    {
      resolve: './src/modules/easyparcel-return'
    }
  ],
  plugins: [
  ...(MEILISEARCH_HOST && MEILISEARCH_ADMIN_KEY ? [{
      resolve: '@rokmohar/medusa-plugin-meilisearch',
      options: {
        config: {
          host: MEILISEARCH_HOST,
          apiKey: MEILISEARCH_ADMIN_KEY
        },
        settings: {
          products: {
            type: 'products',
            enabled: true,
            fields: ['id', 'title', 'description', 'handle', 'variant_sku', 'thumbnail'],
            indexSettings: {
              searchableAttributes: ['title', 'description', 'variant_sku'],
              displayedAttributes: ['id', 'handle', 'title', 'description', 'variant_sku', 'thumbnail'],
              filterableAttributes: ['id', 'handle'],
            },
            primaryKey: 'id',
          }
        }
      }
    }] : [])
  ]
};

console.log(JSON.stringify(medusaConfig, null, 2));
export default defineConfig(medusaConfig);
