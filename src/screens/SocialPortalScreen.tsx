import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import DrawerMenu from '../components/DrawerMenu';

const SocialPortalScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  const handleConnectClick = () => {
    navigate('/connect');
  };

  const handleMeetupsClick = () => {
    navigate('/meetups');
  };

  const handleTripsClick = () => {
    // TODO: Navigate to trips section
    console.log('Navigate to trips');
  };

  return (
    <div className="relative">
      <DrawerMenu
        open={isDrawerOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight={undefined}
      />

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-6 max-w-4xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Social Portal
          </h1>
        </div>

        {/* Feature Cards */}
        <div className="space-y-6">
          {/* Connect Card */}
          <div className="bg-green-50 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg text-gray-900">Connect</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectClick}
                className="px-6 py-2"
              >
                Explore
              </Button>
            </div>
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
              Expand your network and connect with others.
            </p>
          </div>

          {/* Meetups & Free Time Card */}
          <div className="bg-green-50 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg text-gray-900">
                Meetups & Free Time
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleMeetupsClick}
                className="px-6 py-2"
              >
                Explore
              </Button>
            </div>
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
              Discover who's free when you are. Browse or post meetups based on
              shared interests, locations, and times.
            </p>
          </div>

          {/* Trips, Tips & Advice Card */}
          <div className="bg-green-50 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-bold text-lg text-gray-900">
                Trips, Tips & Advice
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTripsClick}
                className="px-6 py-2"
              >
                Explore
              </Button>
            </div>
            <p className="text-gray-700 text-sm mb-4 leading-relaxed">
              Receive guidance featuring travel insights, popular destinations,
              and general advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPortalScreen;
