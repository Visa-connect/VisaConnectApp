import React, { lazy } from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import LazyRoute from './components/LazyRoute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import AuthenticatedLayout from './components/AuthenticatedLayout';
import AdminLayout from './components/AdminLayout';
import AdminRoute from './components/AdminRoute';
import { AdminProvider } from './stores/adminStore';

// Public routes (eagerly loaded for fast initial page load)
import LoginPage from './screens/WelcomeScreen';
import CreateAccountPage from './screens/CreateAccountPage';
import SignInScreen from './screens/LoginScreen';
import AdminLoginScreen from './screens/admin/AdminLoginScreen';
import SettingsScreen from './screens/SettingsScreen';
import SocialPortalScreen from './screens/SocialPortalScreen';
import WorkPortalScreen from './screens/WorkPortalScreen';
import ChatScreen from './screens/ChatScreen';
import DashboardScreen from './screens/DashboardScreen';

// Lazy load all protected routes and admin routes (loaded on demand)
// This reduces initial bundle size and improves Time to Interactive (TTI)
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen'));
const EditProfileScreen = lazy(() => import('./screens/EditProfileScreen'));
const AddBusinessScreen = lazy(() => import('./screens/AddBusinessScreen'));
const EditBusinessScreen = lazy(() => import('./screens/EditBusinessScreen'));
const PublicProfileScreen = lazy(() => import('./screens/PublicProfileScreen'));
const SearchJobsScreen = lazy(() => import('./screens/SearchJobsScreen'));
const JobDetailsScreen = lazy(() => import('./screens/JobDetailsScreen'));
const ApplyToJobScreen = lazy(() => import('./screens/ApplyToJobScreen'));
const PostJobScreen = lazy(() => import('./screens/PostJobScreen'));
const MeetupsScreen = lazy(() => import('./screens/MeetupsScreen'));
const MeetupDetailsScreen = lazy(() => import('./screens/MeetupDetailsScreen'));
const PostMeetupScreen = lazy(() => import('./screens/PostMeetupScreen'));
const MeetupsPostedScreen = lazy(() => import('./screens/MeetupsPostedScreen'));
const MeetupsInterestedScreen = lazy(
  () => import('./screens/MeetupsInterestedScreen')
);
const EditMeetupScreen = lazy(() => import('./screens/EditMeetupScreen'));
const JobsAppliedScreen = lazy(() => import('./screens/JobsAppliedScreen'));
const JobsPostedScreen = lazy(() => import('./screens/JobsPostedScreen'));
const JobApplicationsScreen = lazy(
  () => import('./screens/JobApplicationsScreen')
);
const ConnectScreen = lazy(() => import('./screens/ConnectScreen'));
const TipsTripsAdviceScreen = lazy(
  () => import('./screens/TipsTripsAdviceScreen')
);
const TipsTripsAdviceDetailScreen = lazy(
  () => import('./screens/TipsTripsAdviceDetailScreen')
);
const EditTipsTripsAdviceScreen = lazy(
  () => import('./screens/EditTipsTripsAdviceScreen')
);
const UserTipsTripsAdviceScreen = lazy(
  () => import('./screens/UserTipsTripsAdviceScreen')
);
const PostTipsTripsAdviceScreen = lazy(
  () => import('./screens/PostTipsTripsAdviceScreen')
);
const BackgroundScreen = lazy(
  () => import('./screens/wizard/BackgroundScreen')
);
const LifestyleScreen = lazy(() => import('./screens/wizard/LifestyleScreen'));
const AccountCreatedPage = lazy(() => import('./screens/AccountCreatedPage'));
const TravelExplorationScreen = lazy(
  () => import('./screens/wizard/TravelExplorationScreen')
);
const KnowledgeCommunityScreen = lazy(
  () => import('./screens/wizard/KnowledgeCommunityScreen')
);

// Admin routes (lazy loaded)
const AdminDashboardScreen = lazy(
  () => import('./screens/admin/AdminDashboardScreen')
);
const BusinessListScreen = lazy(
  () => import('./screens/admin/BusinessListScreen')
);
const BusinessDetailScreen = lazy(
  () => import('./screens/admin/BusinessDetailScreen')
);
const TipsTripsAdviceListScreen = lazy(
  () => import('./screens/admin/TipsTripsAdviceListScreen')
);
const AdminPostTipsTripsAdviceScreen = lazy(
  () => import('./screens/admin/PostTipsTripsAdviceScreen')
);
const AdminEditTipsTripsAdviceScreen = lazy(
  () => import('./screens/admin/EditTipsTripsAdviceScreen')
);
const ViewTipsTripsAdviceScreen = lazy(
  () => import('./screens/admin/ViewTipsTripsAdviceScreen')
);
const UsersListScreen = lazy(() => import('./screens/admin/UsersListScreen'));
const EmployersListScreen = lazy(
  () => import('./screens/admin/EmployersListScreen')
);
const ReportsListScreen = lazy(
  () => import('./screens/admin/ReportsListScreen')
);
const AdminReportEditScreen = lazy(
  () => import('./screens/admin/AdminReportEditScreen')
);
const AdminUserViewScreen = lazy(
  () => import('./screens/admin/AdminUserViewScreen')
);
const AdminUserEditScreen = lazy(
  () => import('./screens/admin/AdminUserEditScreen')
);
const AdminEmployerViewScreen = lazy(
  () => import('./screens/admin/AdminEmployerViewScreen')
);
const AdminEmployerEditScreen = lazy(
  () => import('./screens/admin/AdminEmployerEditScreen')
);

function App() {
  return (
    <>
      <Routes>
        {/* Public routes - no authentication required */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/sign-in" element={<SignInScreen />} />

        {/* Protected routes - authentication required (lazy loaded) */}
        <Route
          path="/dashboard"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <DashboardScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <NotificationsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tips-trips-advice"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <TipsTripsAdviceScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/post-tips-trips-advice"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <PostTipsTripsAdviceScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tips-trips-advice/posted"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <UserTipsTripsAdviceScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tips-trips-advice/:postId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <TipsTripsAdviceDetailScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-tips-trips-advice/:postId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <EditTipsTripsAdviceScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <SettingsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <EditProfileScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/add-business"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <AddBusinessScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-business/:id"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <EditBusinessScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/public-profile"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <PublicProfileScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/public-profile/:userId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <PublicProfileScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/social"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <SocialPortalScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/work"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <WorkPortalScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/search-jobs"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <SearchJobsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/job/:jobId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <JobDetailsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/apply/:jobId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <ApplyToJobScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/post-job"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <PostJobScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <MeetupsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups/:meetupId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <MeetupDetailsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/post-meetup"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <PostMeetupScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups-posted"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <MeetupsPostedScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups-interested"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <MeetupsInterestedScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/jobs-applied"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <JobsAppliedScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/jobs-posted"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <JobsPostedScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/job-applications/:jobId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <JobApplicationsScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-meetup/:meetupId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <EditMeetupScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/connect"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <ConnectScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <ChatScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <ChatScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/background"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <BackgroundScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/lifestyle"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <LifestyleScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/travel-exploration"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <TravelExplorationScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/knowledge-community"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <KnowledgeCommunityScreen />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/account-created"
          element={
            <AuthenticatedRoute>
              <LazyRoute>
                <AuthenticatedLayout>
                  <AccountCreatedPage />
                </AuthenticatedLayout>
              </LazyRoute>
            </AuthenticatedRoute>
          }
        />

        {/* Admin Routes (lazy loaded) */}
        <Route path="/admin" element={<AdminLoginScreen />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminDashboardScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <TipsTripsAdviceListScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/create"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminPostTipsTripsAdviceScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/edit/:postId"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminEditTipsTripsAdviceScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/view/:postId"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <ViewTipsTripsAdviceScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/businesses"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <BusinessListScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/businesses/:id"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <BusinessDetailScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <UsersListScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/employers"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <EmployersListScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminUserViewScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/users/:userId/edit"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminUserEditScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/employers/:employerId"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminEmployerViewScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/employers/:employerId/edit"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminEmployerEditScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <ReportsListScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/reports/:reportId"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminReportEditScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/reports/:reportId/edit"
          element={
            <AdminProvider>
              <AdminRoute>
                <LazyRoute>
                  <AdminLayout>
                    <AdminReportEditScreen />
                  </AdminLayout>
                </LazyRoute>
              </AdminRoute>
            </AdminProvider>
          }
        />
      </Routes>
      <PWAInstallPrompt />
    </>
  );
}

export default App;
