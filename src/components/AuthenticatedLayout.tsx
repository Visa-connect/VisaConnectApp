import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NavigationBar from './NavigationBar';
import DrawerMenu from './DrawerMenu';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Determine current page based on pathname
  const getCurrentPage = (pathname: string): string => {
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/settings') return 'settings';
    if (pathname === '/edit-profile') return 'settings';
    if (pathname.startsWith('/public-profile')) return 'dashboard';
    if (pathname === '/social') return 'social';
    if (pathname === '/connect') return 'social';
    if (pathname === '/chat') return 'chat';
    if (
      pathname === '/background' ||
      pathname === '/lifestyle' ||
      pathname === '/travel-exploration' ||
      pathname === '/knowledge-community'
    ) {
      return 'dashboard';
    }
    return 'dashboard';
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleOverlayClick = () => {
    setIsMenuOpen(false);
  };

  const currentPage = getCurrentPage(location.pathname);

  return (
    <div className="min-h-screen bg-gray-50">
      <DrawerMenu
        open={isMenuOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight={currentPage}
      />
      <NavigationBar currentPage={currentPage} onMenuClick={handleMenuClick} />
      {children}
    </div>
  );
};

export default AuthenticatedLayout;
