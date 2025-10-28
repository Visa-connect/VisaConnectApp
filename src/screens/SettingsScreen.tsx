import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DrawerMenu from '../components/DrawerMenu';
import ResponsiveTest from '../components/ResponsiveTest';
import Modal from '../components/Modal';
import { resetPassword, initiateEmailChange, verifyEmailChange } from '../api';
import { openVisaConnectEmail } from '../utils/emailUtils';
import { isValidEmail } from '../utils/validation';
import { useUserStore } from '../stores/userStore';
import {
  UserIcon,
  LockClosedIcon,
  TrashIcon,
  InformationCircleIcon,
  BriefcaseIcon,
  CameraIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  ArrowLeftOnRectangleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalContent, setPasswordModalContent] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalContent, setEmailModalContent] = useState<{
    type: 'form' | 'success' | 'error' | 'verification';
    title: string;
    message: string;
  } | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUserStore();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/sign-in');
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      setPasswordModalContent({
        type: 'error',
        title: 'Error',
        message: 'Unable to retrieve your email address. Please try again.',
      });
      setShowPasswordModal(true);
      return;
    }

    try {
      const result = await resetPassword(user.email);
      if (result.success) {
        setPasswordModalContent({
          type: 'success',
          title: 'Email Sent!',
          message:
            'Password reset email sent! Please check your inbox and follow the instructions to reset your password.',
        });
      } else {
        setPasswordModalContent({
          type: 'error',
          title: 'Failed',
          message: 'Failed to send password reset email. Please try again.',
        });
      }
      setShowPasswordModal(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setPasswordModalContent({
        type: 'error',
        title: 'Error',
        message:
          'An error occurred while sending the password reset email. Please try again.',
      });
      setShowPasswordModal(true);
    }
  };

  const handleChangeEmail = () => {
    setNewEmail('');
    setPassword('');
    setEmailModalContent({
      type: 'form',
      title: 'Change Email Address',
      message:
        'Enter your new email address and current password to change your email.',
    });
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async () => {
    if (!newEmail.trim() || !password.trim()) {
      setEmailModalContent({
        type: 'error',
        title: 'Error',
        message: 'Please fill in all fields.',
      });
      return;
    }

    // Basic email validation
    if (!isValidEmail(newEmail)) {
      setEmailModalContent({
        type: 'error',
        title: 'Error',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await initiateEmailChange(newEmail, password);
      if (result.success) {
        setEmailModalContent({
          type: 'verification',
          title: 'Check Your Email',
          message:
            "We've sent a verification email to your new address. Please check your inbox and follow the instructions.",
        });
      } else {
        setEmailModalContent({
          type: 'error',
          title: 'Failed',
          message: result.message,
        });
      }
    } catch (error) {
      setEmailModalContent({
        type: 'error',
        title: 'Error',
        message:
          'An error occurred while changing your email. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailVerification = async () => {
    if (!verificationToken.trim()) {
      setEmailModalContent({
        type: 'error',
        title: 'Error',
        message: 'Please enter the verification code from your email.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await verifyEmailChange(verificationToken);
      if (result.success) {
        setEmailModalContent({
          type: 'success',
          title: 'Email Changed Successfully!',
          message: result.message,
        });
        // Clear the form data
        setNewEmail('');
        setPassword('');
        setVerificationToken('');
      } else {
        setEmailModalContent({
          type: 'error',
          title: 'Verification Failed',
          message: result.message,
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setEmailModalContent({
        type: 'error',
        title: 'Error',
        message:
          'An error occurred while verifying your email. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailVisaConnect = () => {
    openVisaConnectEmail();
  };

  const menuItemsAccount = [
    {
      label: 'Edit profile',
      icon: UserIcon,
      onClick: () => navigate('/edit-profile'),
    },
    { label: 'Change Email', icon: LockClosedIcon, onClick: handleChangeEmail },
    {
      label: 'Change Password',
      icon: LockClosedIcon,
      onClick: handleChangePassword,
    },
    {
      label: 'Email VisaConnect',
      icon: EnvelopeIcon,
      onClick: handleEmailVisaConnect,
    },
    { label: 'Logout', icon: ArrowLeftOnRectangleIcon, onClick: handleLogout },
  ];

  const menuItemsPreferences = [
    {
      label: 'Preferences',
      icon: InformationCircleIcon,
      onClick: () => navigate('/background'),
    },
    {
      label: 'Jobs applied to',
      icon: BriefcaseIcon,
      onClick: () => navigate('/jobs-applied'),
    },
    {
      label: 'Jobs posted (only for approved employers)',
      icon: CameraIcon,
      onClick: () => navigate('/jobs-posted'),
    },
    {
      label: 'Meetups posted',
      icon: CameraIcon,
      onClick: () => navigate('/meetups-posted'),
    },
    {
      label: "Meetups I'm interested in",
      icon: ArrowRightIcon,
      onClick: () => navigate('/meetups-interested'),
    },
  ];

  const handleOverlayClick = () => setMenuOpen(false);

  return (
    <div>
      <DrawerMenu
        open={menuOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight="settings"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Account Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {menuItemsAccount.map((item, idx) => {
                const isLogout = item.label === 'Logout';
                const isEditProfile = item.label === 'Edit profile';
                const isEmailVisaConnect = item.label === 'Email VisaConnect';
                const isChangePassword = item.label === 'Change Password';
                const isChangeEmail = item.label === 'Change Email';
                const isEnabled =
                  isLogout ||
                  isEditProfile ||
                  isEmailVisaConnect ||
                  isChangePassword ||
                  isChangeEmail;

                return (
                  <button
                    key={item.label}
                    className={`flex items-center w-full px-4 py-4 text-left gap-3 border-b border-gray-100 last:border-b-0 transition-colors 'text-gray-800 hover:bg-gray-50} ${
                      isEnabled
                        ? 'cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={isEnabled ? item.onClick : undefined}
                    disabled={!isEnabled}
                  >
                    <item.icon className={`h-5 w-5'text-gray-400`} />
                    <span className="flex-1 text-base font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferences Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preferences
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {menuItemsPreferences.map((item, idx) => {
                const isPreferences = item.label === 'Preferences';
                const isMeetupsPosted = item.label === 'Meetups posted';
                const isMeetupsInterested =
                  item.label === "Meetups I'm interested in";
                const isJobsApplied = item.label === 'Jobs applied to';
                const isJobsPosted =
                  item.label === 'Jobs posted (only for approved employers)';
                const isEnabled =
                  isPreferences ||
                  isMeetupsPosted ||
                  isMeetupsInterested ||
                  isJobsApplied ||
                  isJobsPosted;

                return (
                  <button
                    key={item.label}
                    className={`flex items-center w-full px-4 py-4 text-left gap-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                      isEnabled
                        ? 'text-gray-800 hover:bg-gray-50 cursor-pointer'
                        : 'text-gray-800 opacity-50 cursor-not-allowed'
                    }`}
                    onClick={isEnabled ? item.onClick : undefined}
                    disabled={!isEnabled}
                  >
                    <item.icon className="h-5 w-5 text-gray-400" />
                    <span className="flex-1 text-base font-medium">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={passwordModalContent?.title}
        showCloseButton={true}
        size="md"
      >
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {passwordModalContent?.type === 'success' ? (
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
            ) : (
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
            )}
          </div>
          <p className="text-gray-700 mb-6 leading-relaxed">
            {passwordModalContent?.message}
          </p>
          <button
            onClick={() => setShowPasswordModal(false)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              passwordModalContent?.type === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            OK
          </button>
        </div>
      </Modal>

      {/* Email Change Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title={emailModalContent?.title}
        showCloseButton={true}
        size="md"
      >
        {emailModalContent?.type === 'form' ? (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">{emailModalContent?.message}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new email address"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your current password"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowEmailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleEmailSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Verification'}
              </button>
            </div>
          </div>
        ) : emailModalContent?.type === 'verification' ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <EnvelopeIcon className="w-12 h-12 text-blue-500" />
              </div>
              <p className="text-gray-700 mb-4">{emailModalContent?.message}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Check your new email address:</strong> {newEmail}
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Click the verification link in the email, then enter the
                  verification code below.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter verification code from email"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setEmailModalContent({
                    type: 'form',
                    title: 'Change Email Address',
                    message:
                      'Enter your new email address and current password to change your email.',
                  });
                  setVerificationToken('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                onClick={handleEmailVerification}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {emailModalContent?.type === 'success' ? (
                <CheckCircleIcon className="w-12 h-12 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
              )}
            </div>
            <p className="text-gray-700 mb-6 leading-relaxed">
              {emailModalContent?.message}
            </p>
            <button
              onClick={() => setShowEmailModal(false)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                emailModalContent?.type === 'success'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              OK
            </button>
          </div>
        )}
      </Modal>

      {/* Responsive Test Component */}
      <ResponsiveTest />
    </div>
  );
};

export default SettingsScreen;
