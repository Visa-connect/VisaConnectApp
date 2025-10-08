import { Express } from 'express';
import authApi from './auth';
import userApi from './user';
import photoApi from './photo';
import chatApi from './chat';
import meetupApi from './meetup';
import tipsTripsAdviceApi from './tipsTripsAdvice';
import adminAuthApi from './adminAuth';
import businessApi from './business';
import jobsApi from './jobs';
import applicationsApi from './applications';
import notificationsApi from './notifications';

/**
 * Centralized API service registration
 * All API routes are registered here for better organization
 */
export function registerApiRoutes(app: Express): void {
  console.log('🔗 Registering API routes...');

  // Register all API routes
  app.use('/api/auth', authApi);
  userApi(app);
  photoApi(app);
  chatApi(app);
  meetupApi(app);
  tipsTripsAdviceApi(app);
  adminAuthApi(app);
  businessApi(app);
  jobsApi(app);
  applicationsApi(app);
  notificationsApi(app);

  console.log('✅ All API routes registered successfully');
}

// Export individual API functions for direct use if needed
export {
  authApi,
  userApi,
  photoApi,
  chatApi,
  meetupApi,
  tipsTripsAdviceApi,
  adminAuthApi,
  businessApi,
  jobsApi,
  applicationsApi,
  notificationsApi,
};
