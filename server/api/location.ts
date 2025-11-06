import { Express, Request, Response } from 'express';
import * as locationService from '../services/locationService';

export default function locationApi(app: Express): void {
  /**
   * GET /api/location/search - Search for locations using Nominatim API
   * Query params:
   *   - q: Search query string (required, min 3 characters)
   */
  app.get('/api/location/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;

      if (!query || query.length < 3) {
        return res.status(400).json({
          success: false,
          error:
            'Query parameter "q" is required and must be at least 3 characters',
        });
      }

      const results = await locationService.searchLocations(query);

      res.json({
        success: true,
        data: results,
      });
    } catch (error: any) {
      console.error('Location search error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search locations',
        message: error.message || 'An error occurred while searching locations',
      });
    }
  });

  /**
   * GET /api/location/reverse - Reverse geocode coordinates to get address
   * Query params:
   *   - lat: Latitude (required)
   *   - lng: Longitude (required)
   */
  app.get('/api/location/reverse', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          success: false,
          error:
            'Query parameters "lat" and "lng" are required and must be valid numbers',
        });
      }

      const result = await locationService.reverseGeocode(lat, lng);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Location not found or not in USA',
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reverse geocode',
        message: error.message || 'An error occurred while reverse geocoding',
      });
    }
  });
}
