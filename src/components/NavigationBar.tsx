import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserIcon } from '@heroicons/react/24/outline';
import { useUserStore } from '../stores/userStore';
import { openVisaConnectEmail } from '../utils/emailUtils';
import logo from '../assets/images/logo.png';

interface NavigationBarProps {
  currentPage?: string;
  onMenuClick: () => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  currentPage = 'dashboard',
  onMenuClick,
}) => {
  const navigate = useNavigate();
  const { user } = useUserStore();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', key: 'dashboard', enabled: true },
    { name: 'Work', path: '/work', key: 'work', enabled: true },
    { name: 'Social', path: '/social', key: 'social', enabled: true },
    { name: 'Chat', path: '/chat', key: 'chat', enabled: true },
    { name: 'Settings', path: '/settings', key: 'settings', enabled: true },
    { name: 'Contact', path: '/contact', key: 'contact', enabled: true },
  ];

  const handleEmailVisaConnect = () => {
    openVisaConnectEmail();
  };

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.enabled) {
      if (item.key === 'contact') {
        handleEmailVisaConnect();
      } else {
        navigate(item.path);
      }
    }
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Mobile menu button and Logo */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button - Always visible on mobile, hidden on desktop */}
            <button
              className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Logo */}
            <div className="flex items-center">
              <img src={logo} alt="VisaConnect Logo" className="h-8 w-auto" />
            </div>
          </div>

          {/* Center - Navigation Links (Desktop only) */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  item.enabled
                    ? currentPage === item.key
                      ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                      : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed opacity-50'
                }`}
                disabled={!item.enabled}
              >
                {item.name}
              </button>
            ))}
          </div>

          {/* Right side - User avatar */}
          <div className="flex items-center space-x-3">
            {/* User avatar */}
            <button
              onClick={() => navigate('/edit-profile')}
              className="h-8 w-8 rounded-full overflow-hidden bg-gray-300 flex items-center justify-center hover:bg-gray-400 transition-colors cursor-pointer"
              aria-label="Edit Profile"
            >
              {user?.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserIcon className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
