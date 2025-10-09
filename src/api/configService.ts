import { apiGet } from './index';

export interface PublicConfig {
  recaptcha: {
    siteKey?: string;
  };
}

export interface ConfigResponse {
  success: boolean;
  config: PublicConfig;
  error?: string;
}

/**
 * Fetch public configuration from backend
 * This includes non-sensitive config like reCAPTCHA site key
 */
export const configService = {
  async getPublicConfig(): Promise<PublicConfig> {
    try {
      const response = await apiGet<ConfigResponse>('/api/config/public');

      if (response.success && response.config) {
        return response.config;
      }

      throw new Error(response.error || 'Failed to get configuration');
    } catch (error: any) {
      console.error('Error fetching public config:', error);

      // Return default config as fallback
      return {
        recaptcha: {
          siteKey: '6Lc0X-QrAAAAALeq7oHiP6IK6C642fKGCeERAs8d', // Default test key
        },
      };
    }
  },
};
