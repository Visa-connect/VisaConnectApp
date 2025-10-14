import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './screens/WelcomeScreen';
import CreateAccountPage from './screens/CreateAccountPage';
import AccountCreatedPage from './screens/AccountCreatedPage';
import BackgroundScreen from './screens/wizard/BackgroundScreen';
import LifestyleScreen from './screens/wizard/LifestyleScreen';
import DashboardScreen from './screens/DashboardScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SignInScreen from './screens/LoginScreen';
import SettingsScreen from './screens/SettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import AddBusinessScreen from './screens/AddBusinessScreen';
import EditBusinessScreen from './screens/EditBusinessScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import SocialPortalScreen from './screens/SocialPortalScreen';
import WorkPortalScreen from './screens/WorkPortalScreen';
import SearchJobsScreen from './screens/SearchJobsScreen';
import JobDetailsScreen from './screens/JobDetailsScreen';
import ApplyToJobScreen from './screens/ApplyToJobScreen';
import PostJobScreen from './screens/PostJobScreen';
import MeetupsScreen from './screens/MeetupsScreen';
import MeetupDetailsScreen from './screens/MeetupDetailsScreen';
import PostMeetupScreen from './screens/PostMeetupScreen';
import MeetupsPostedScreen from './screens/MeetupsPostedScreen';
import MeetupsInterestedScreen from './screens/MeetupsInterestedScreen';
import EditMeetupScreen from './screens/EditMeetupScreen';
import JobsAppliedScreen from './screens/JobsAppliedScreen';
import JobsPostedScreen from './screens/JobsPostedScreen';
import JobApplicationsScreen from './screens/JobApplicationsScreen';
import ConnectScreen from './screens/ConnectScreen';
import ChatScreen from './screens/ChatScreen';
import TipsTripsAdviceScreen from './screens/TipsTripsAdviceScreen';
import TipsTripsAdviceDetailScreen from './screens/TipsTripsAdviceDetailScreen';
import TravelExplorationScreen from './screens/wizard/TravelExplorationScreen';
import KnowledgeCommunityScreen from './screens/wizard/KnowledgeCommunityScreen';
import AdminLayout from './components/AdminLayout';
import AdminRoute from './components/AdminRoute';
import { AdminProvider } from './stores/adminStore';
import AdminLoginScreen from './screens/admin/AdminLoginScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import BusinessListScreen from './screens/admin/BusinessListScreen';
import BusinessDetailScreen from './screens/admin/BusinessDetailScreen';
import TipsTripsAdviceListScreen from './screens/admin/TipsTripsAdviceListScreen';
import PostTipsTripsAdviceScreen from './screens/admin/PostTipsTripsAdviceScreen';
import EditTipsTripsAdviceScreen from './screens/admin/EditTipsTripsAdviceScreen';
import ViewTipsTripsAdviceScreen from './screens/admin/ViewTipsTripsAdviceScreen';
import UsersListScreen from './screens/admin/UsersListScreen';
import EmployersListScreen from './screens/admin/EmployersListScreen';
import ReportsListScreen from './screens/admin/ReportsListScreen';
import AdminUserViewScreen from './screens/admin/AdminUserViewScreen';
import AdminUserEditScreen from './screens/admin/AdminUserEditScreen';
import AdminEmployerViewScreen from './screens/admin/AdminEmployerViewScreen';
import AdminEmployerEditScreen from './screens/admin/AdminEmployerEditScreen';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import AuthenticatedLayout from './components/AuthenticatedLayout';

function App() {
  return (
    <>
      <Routes>
        {/* Public routes - no authentication required */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/sign-in" element={<SignInScreen />} />

        {/* Protected routes - authentication required */}
        <Route
          path="/dashboard"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <DashboardScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <NotificationsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tips-trips-advice"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <TipsTripsAdviceScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/tips-trips-advice/:postId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <TipsTripsAdviceDetailScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <SettingsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <EditProfileScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/add-business"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <AddBusinessScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-business/:id"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <EditBusinessScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/public-profile"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <PublicProfileScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/public-profile/:userId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <PublicProfileScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/social"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <SocialPortalScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/work"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <WorkPortalScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/search-jobs"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <SearchJobsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/job/:jobId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <JobDetailsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/apply/:jobId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <ApplyToJobScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/post-job"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <PostJobScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <MeetupsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups/:meetupId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <MeetupDetailsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/post-meetup"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <PostMeetupScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups-posted"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <MeetupsPostedScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/meetups-interested"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <MeetupsInterestedScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/jobs-applied"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <JobsAppliedScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/jobs-posted"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <JobsPostedScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/job-applications/:jobId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <JobApplicationsScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/edit-meetup/:meetupId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <EditMeetupScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/connect"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <ConnectScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <ChatScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/chat/:conversationId"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <ChatScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/background"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <BackgroundScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/lifestyle"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <LifestyleScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/travel-exploration"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <TravelExplorationScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/knowledge-community"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <KnowledgeCommunityScreen />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/account-created"
          element={
            <AuthenticatedRoute>
              <AuthenticatedLayout>
                <AccountCreatedPage />
              </AuthenticatedLayout>
            </AuthenticatedRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLoginScreen />} />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <AdminDashboardScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <TipsTripsAdviceListScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/create"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <PostTipsTripsAdviceScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/edit/:postId"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <EditTipsTripsAdviceScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/view/:postId"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <ViewTipsTripsAdviceScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/businesses"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <BusinessListScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/businesses/:id"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <BusinessDetailScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <UsersListScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/employers"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <EmployersListScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/users/:userId"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <AdminUserViewScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/users/:userId/edit"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <AdminUserEditScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/employers/:employerId"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <AdminEmployerViewScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/employers/:employerId/edit"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <AdminEmployerEditScreen />
                </AdminLayout>
              </AdminRoute>
            </AdminProvider>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <AdminProvider>
              <AdminRoute>
                <AdminLayout>
                  <ReportsListScreen />
                </AdminLayout>
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
