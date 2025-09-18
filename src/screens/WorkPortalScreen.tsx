import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

const WorkPortalScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleExplore = (feature: string) => {
    // TODO: Implement navigation to specific feature screens
    console.log(`Exploring ${feature}`);
  };

  return (
    <div className="relative">
      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-6 max-w-4xl mx-auto">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Work Portal
          </h1>
        </div>
        <div className="space-y-6">
          {/* Search Jobs Card */}
          <div className="bg-amber-50 rounded-xl p-6 shadow-sm relative">
            <Button
              variant="primary"
              size="sm"
              className="absolute top-4 right-4 text-sm px-6 py-2"
              onClick={() => handleExplore('Search Jobs')}
            >
              Explore
            </Button>

            <div className="flex-1 pr-24">
              <h3 className="font-bold text-xl text-gray-900 mb-3">
                Search Jobs
              </h3>
              <p className="text-gray-700 text-base mb-4">
                Find jobs and submit your resume or skillsets.
              </p>
            </div>
          </div>

          {/* Post Jobs - Apply Card */}
          <div className="bg-amber-50 rounded-xl p-6 shadow-sm relative">
            <Button
              variant="primary"
              size="sm"
              className="absolute top-4 right-4 text-sm px-6 py-2"
              onClick={() => handleExplore('Post Jobs - Apply')}
            >
              Explore
            </Button>

            <div className="flex-1 pr-24">
              <h3 className="font-bold text-xl text-gray-900 mb-3">
                Post Jobs - Apply
              </h3>
              <p className="text-gray-700 text-base mb-4">
                Post jobs and receive potential candidates to work for you.
              </p>
            </div>
          </div>

          {/* Post Jobs - Approved Card */}
          <div className="bg-amber-50 rounded-xl p-6 shadow-sm relative">
            <Button
              variant="primary"
              size="sm"
              className="absolute top-4 right-4 text-sm px-6 py-2"
              onClick={() => handleExplore('Post Jobs - Approved')}
            >
              Explore
            </Button>

            <div className="flex-1 pr-24">
              <h3 className="font-bold text-xl text-gray-900 mb-3">
                Post Jobs - Approved
              </h3>
              <p className="text-gray-700 text-base mb-4">
                Post jobs and receive potential candidates to work for you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkPortalScreen;
