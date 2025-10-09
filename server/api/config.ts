import { Request, Response } from 'express';
import { config } from '../config/env';

/**
 * API endpoint to get public configuration values
 * This allows the frontend to get configuration without exposing secrets
 */
export function registerConfigRoutes(app: any) {
  // Get public configuration values
  app.get('/api/config/public', (req: Request, res: Response) => {
    try {
      const publicConfig = {
        recaptcha: {
          siteKey: config.recaptcha.siteKey,
        },
        // Add other public config values here as needed
      };

      res.json({
        success: true,
        config: publicConfig,
      });
    } catch (error: any) {
      console.error('Error getting public config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
      });
    }
  });
}
