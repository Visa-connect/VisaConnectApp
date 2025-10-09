// Load environment variables from root directory
import dotenv from 'dotenv';
import path from 'path';

// Load .env file if it exists (dotenv is safe to call in production)
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  database: {
    user: string | undefined;
    host: string | undefined;
    database: string | undefined;
    password: string | undefined;
    port: number;
    url: string | undefined;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  firebase: {
    serviceAccount: string | undefined;
    webApiKey: string | undefined;
  };
  cloudinary: {
    cloudName: string | undefined;
    apiKey: string | undefined;
    apiSecret: string | undefined;
  };
  email: {
    sendGridApiKey: string | undefined;
    adminEmail: string | undefined;
    fromEmail: string | undefined;
    adminDashboardUrl: string | undefined;
    appUrl: string | undefined;
  };
  recaptcha: {
    siteKey: string | undefined;
    secretKey: string | undefined;
  };
}

export const config: Config = {
  database: {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5431,
    url: process.env.DATABASE_URL,
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 8080,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
    webApiKey: process.env.REACT_APP_FIREBASE_WEB_API_KEY,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  email: {
    sendGridApiKey: process.env.SENDGRID_API_KEY,
    adminEmail: process.env.ADMIN_EMAIL,
    fromEmail: process.env.FROM_EMAIL,
    adminDashboardUrl: process.env.ADMIN_DASHBOARD_URL,
    appUrl: process.env.APP_URL,
  },
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
  },
};
