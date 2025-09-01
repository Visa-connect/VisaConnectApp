import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface DrawerMenuProps {
  open: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
  highlight?: string;
}

const menuItems = [
  { label: 'Dashboard', route: '/dashboard', key: 'dashboard', enabled: true },
  { label: 'Work', route: '/work', key: 'work', enabled: false },
  { label: 'Social', route: '/social', key: 'social', enabled: true },
  { label: 'Chat', route: '/chat', key: 'chat', enabled: true },
  { label: 'Settings', route: '/settings', key: 'settings', enabled: true },
  { label: 'Contact us', route: '/contact', key: 'contact', enabled: false },
];

const DrawerMenu: React.FC<DrawerMenuProps> = ({
  open,
  onClose,
  navigate,
  highlight,
}) => {
  if (!open) return null;

  const handleMenuItemClick = (item: (typeof menuItems)[0]) => {
    if (item.enabled) {
      onClose();
      if (item.route) {
        navigate(item.route);
      }
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 left-0 w-72 bg-white shadow-2xl z-40 flex flex-col rounded-tr-2xl rounded-br-2xl overflow-hidden animate-slideIn max-w-xs">
        {/* Header with logo and close button */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-sky-700">V</span>
            <span className="font-semibold text-lg">Visa</span>
            <span className="font-light text-lg">Connect</span>
          </div>
          <button onClick={onClose} aria-label="Close menu">
            <XMarkIcon className="h-7 w-7 text-gray-500" />
          </button>
        </div>
        {/* Menu Items */}
        <nav className="flex flex-col px-2 pt-2 pb-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`w-full text-left px-6 py-3 rounded transition font-medium text-base ${
                item.enabled
                  ? item.key === highlight
                    ? 'bg-gray-100 font-bold text-gray-900'
                    : 'text-gray-800 hover:bg-gray-50'
                  : 'text-gray-400 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => handleMenuItemClick(item)}
              disabled={!item.enabled}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
};

export default DrawerMenu;
