import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DrawerMenu from '../components/DrawerMenu';
import ResponsiveTest from '../components/ResponsiveTest';
import Modal from '../components/Modal';
import { resetPassword } from '../api';
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

  const handleEmailVisaConnect = () => {
    const email = 'contact@visaconnectus.com';
    const subject = encodeURIComponent('VisaConnect Support');
    const body = encodeURIComponent('Hi VisaConnect team,\n\n');
    const mailtoUrl = `mailto:${email}?subject=${subject}&body=${body}`;

    // Create and click a temporary link immediately (within user gesture)
    try {
      const tempLink = document.createElement('a');
      tempLink.href = mailtoUrl;
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    } catch (error) {
      console.error('Failed to open email client:', error);
      // Fallback: show instructions
      alert(
        'Unable to open email client automatically.\n\n' +
          'Please manually send an email to: ' +
          email +
          '\n' +
          'Subject: VisaConnect Support'
      );
    }
  };

  const menuItemsAccount = [
    {
      label: 'Edit profile',
      icon: UserIcon,
      onClick: () => navigate('/edit-profile'),
    },
    { label: 'Change Email', icon: LockClosedIcon, onClick: () => {} },
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
    {
      label: 'Delete account',
      icon: TrashIcon,
      onClick: () => {},
      danger: true,
    },
  ];

  const menuItemsPreferences = [
    {
      label: 'Preferences',
      icon: InformationCircleIcon,
      onClick: () => {},
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
                const isEnabled =
                  isLogout ||
                  isEditProfile ||
                  isEmailVisaConnect ||
                  isChangePassword;

                return (
                  <button
                    key={item.label}
                    className={`flex items-center w-full px-4 py-4 text-left gap-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                      item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-800 hover:bg-gray-50'
                    } ${
                      isEnabled
                        ? 'cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={isEnabled ? item.onClick : undefined}
                    disabled={!isEnabled}
                  >
                    <item.icon
                      className={`h-5 w-5 ${
                        item.danger ? 'text-red-500' : 'text-gray-400'
                      }`}
                    />
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
                const isMeetupsPosted = item.label === 'Meetups posted';
                const isMeetupsInterested =
                  item.label === "Meetups I'm interested in";
                const isJobsApplied = item.label === 'Jobs applied to';
                const isJobsPosted =
                  item.label === 'Jobs posted (only for approved employers)';
                const isEnabled =
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

      {/* Responsive Test Component */}
      <ResponsiveTest />
    </div>
  );
};

export default SettingsScreen;
