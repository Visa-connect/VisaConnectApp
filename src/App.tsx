import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import LoginPage from './screens/WelcomeScreen';
import CreateAccountPage from './screens/CreateAccountPage';
import AccountCreatedPage from './screens/AccountCreatedPage';
import BackgroundScreen from './screens/wizard/BackgroundScreen';
import LifestyleScreen from './screens/wizard/LifestyleScreen';
import DashboardScreen from './screens/DashboardScreen';
import SignInScreen from './screens/LoginScreen';
import SettingsScreen from './screens/SettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import PublicProfileScreen from './screens/PublicProfileScreen';
import SocialPortalScreen from './screens/SocialPortalScreen';
import MeetupsScreen from './screens/MeetupsScreen';
import MeetupDetailsScreen from './screens/MeetupDetailsScreen';
import PostMeetupScreen from './screens/PostMeetupScreen';
import MeetupsPostedScreen from './screens/MeetupsPostedScreen';
import MeetupsInterestedScreen from './screens/MeetupsInterestedScreen';
import EditMeetupScreen from './screens/EditMeetupScreen';
import ConnectScreen from './screens/ConnectScreen';
import ChatScreen from './screens/ChatScreen';
import TravelExplorationScreen from './screens/wizard/TravelExplorationScreen';
import KnowledgeCommunityScreen from './screens/wizard/KnowledgeCommunityScreen';
import TipsTripsAdviceScreen from './screens/TipsTripsAdviceScreen';
import TipsTripsAdviceDetailScreen from './screens/TipsTripsAdviceDetailScreen';
import AdminLayout from './components/AdminLayout';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import TipsTripsAdviceListScreen from './screens/admin/TipsTripsAdviceListScreen';
import PostTipsTripsAdviceScreen from './screens/admin/PostTipsTripsAdviceScreen';
import EditTipsTripsAdviceScreen from './screens/admin/EditTipsTripsAdviceScreen';
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
        <Route
          path="/admin"
          element={
            <AuthenticatedRoute>
              <AdminLayout>
                <AdminDashboardScreen />
              </AdminLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice"
          element={
            <AuthenticatedRoute>
              <AdminLayout>
                <TipsTripsAdviceListScreen />
              </AdminLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/create"
          element={
            <AuthenticatedRoute>
              <AdminLayout>
                <PostTipsTripsAdviceScreen />
              </AdminLayout>
            </AuthenticatedRoute>
          }
        />
        <Route
          path="/admin/tipsTripsAndAdvice/edit/:postId"
          element={
            <AuthenticatedRoute>
              <AdminLayout>
                <EditTipsTripsAdviceScreen />
              </AdminLayout>
            </AuthenticatedRoute>
          }
        />
      </Routes>
      <PWAInstallPrompt />
    </>
  );
}

export default App;
