import React, { useState, useEffect } from 'react';
import Button from '../../components/Button';
import LocationInput from '../../components/LocationInput';
import { useNavigate } from 'react-router-dom';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { apiPatch } from '../../api';
import { useUserStore } from '../../stores/userStore';
import { LocationData } from '../../types/location';

const TravelExplorationScreen: React.FC = () => {
  const [form, setForm] = useState({
    roadTrips: 'yes' as 'yes' | 'no',
    favoritePlace: { address: '' } as LocationData,
    travelTips: '',
    willingToGuide: 'yes' as 'yes' | 'no',
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Zustand store
  const { user, updateUser } = useUserStore();

  // Handle location change
  const handleLocationChange = (location: LocationData) => {
    setForm({ ...form, favoritePlace: location });
  };

  // Pre-populate form with existing user data
  useEffect(() => {
    if (user) {
      setForm({
        roadTrips:
          user.road_trips !== undefined
            ? user.road_trips
              ? 'yes'
              : 'no'
            : 'yes',
        favoritePlace: { address: user.favorite_place || '' },
        travelTips: user.travel_tips || '',
        willingToGuide:
          user.willing_to_guide !== undefined
            ? user.willing_to_guide
              ? 'yes'
              : 'no'
            : 'yes',
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user?.uid) {
      navigate('/sign-in');
    }
  }, [user, navigate]);

  const handleContinue = async () => {
    setLoading(true);
    setApiError('');
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      // Update user profile with travel exploration information
      const updateData = {
        road_trips: form.roadTrips === 'yes',
        favorite_place: form.favoritePlace.address,
        travel_tips: form.travelTips,
        willing_to_guide: form.willingToGuide === 'yes',
        profile_answers: {
          travel_exploration: {
            roadTrips: form.roadTrips,
            favoritePlace: form.favoritePlace.address,
            travelTips: form.travelTips,
            willingToGuide: form.willingToGuide,
          },
        },
      };

      await apiPatch('/api/user/profile', updateData);

      // Update local store with new data
      updateUser(updateData);

      setLoading(false);
      navigate('/knowledge-community');
    } catch (err: any) {
      setApiError(err.message || 'Failed to save travel exploration info');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 flex flex-col items-center pb-4">
      {/* Loading state for form submission */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <svg
            className="animate-spin h-10 w-10 text-sky-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}

      {/* Loading state for user data */}
      {!user && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      )}

      {user && (
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Header */}
          <div className="w-full bg-blue-100 rounded-b-3xl flex flex-col items-center py-6 mb-6 relative">
            <h1 className="text-xl font-bold text-gray-900 mb-2 text-center px-4">
              Tell us about your travel and exploration in the U.S.
            </h1>
            <MapPinIcon className="h-12 w-12 text-sky-500 mb-2" />
            {/* Progress dots */}
            <div className="flex gap-1 mb-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-800 rounded-full inline-block" />
              {/* Current step */}
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
            </div>
          </div>
          {/* Form Fields */}
          <div className="w-full flex flex-col px-4">
            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                Have you taken any road trips in the U.S.?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.roadTrips === 'yes'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => setForm({ ...form, roadTrips: 'yes' })}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.roadTrips === 'no'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => setForm({ ...form, roadTrips: 'no' })}
                >
                  No
                </button>
              </div>
            </div>
            <div className="mb-4">
              <LocationInput
                value={form.favoritePlace.address}
                onChange={handleLocationChange}
                placeholder="Enter your favorite place"
                label="What's your favorite city or place you've visited here?"
                allowCurrentLocation={true}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                Do you have tips for others traveling in the U.S.?
              </label>
              <textarea
                name="travelTips"
                placeholder="Share your travel tips"
                value={form.travelTips}
                onChange={(e) =>
                  setForm({ ...form, travelTips: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4 min-h-[80px]"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-800 font-medium mb-2">
                Are you open to being a travel guide for a city you know well?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.willingToGuide === 'yes'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => setForm({ ...form, willingToGuide: 'yes' })}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.willingToGuide === 'no'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => setForm({ ...form, willingToGuide: 'no' })}
                >
                  No
                </button>
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full max-w-md mb-2 mx-4"
            onClick={handleContinue}
            disabled={loading}
          >
            Save & Continue
          </Button>
          {apiError && (
            <div className="text-red-500 text-center mt-2">{apiError}</div>
          )}
          <button
            className="text-gray-500 underline text-base mt-2"
            onClick={() => navigate('/dashboard')}
          >
            Skip and finish later
          </button>
        </div>
      )}
    </div>
  );
};

export default TravelExplorationScreen;
