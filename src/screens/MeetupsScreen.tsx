import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Bars3Icon } from '@heroicons/react/24/solid';
import Button from '../components/Button';
import { meetupService, Meetup } from '../api/meetupService';

const MeetupsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch meetups on component mount
  useEffect(() => {
    const fetchMeetups = async () => {
      try {
        setLoading(true);
        setError(null);
        const fetchedMeetups = await meetupService.getMeetups({
          keyword: searchQuery,
          limit: 20,
        });
        setMeetups(fetchedMeetups);
      } catch (err) {
        console.error('Error fetching meetups:', err);
        setError('Failed to load meetups. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetups();
  }, [searchQuery]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handlePostMeetup = () => {
    navigate('/post-meetup');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleMeetupClick = (meetupId: number) => {
    navigate(`/meetups/${meetupId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* App Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-center border-b">
        <h1 className="font-bold text-lg text-gray-900">Meetups & Free Time</h1>
        <div className="w-6"></div> {/* Spacer for centering */}
      </div>

      {/* Post a Meetup Button */}
      <div className="p-4">
        <Button
          variant="primary"
          onClick={handlePostMeetup}
          className="w-full py-3 text-lg font-medium"
        >
          Post a Meetup
        </Button>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search keywords"
            value={searchQuery}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* Meetup Listings */}
      <div className="px-4 pb-20">
        {loading && (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading meetups...</div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">{error}</div>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && meetups.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">No meetups found.</div>
          </div>
        )}

        {!loading &&
          !error &&
          meetups.map((meetup, index) => (
            <div key={meetup.id}>
              <div
                className="bg-white rounded-lg p-4 mb-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleMeetupClick(meetup.id)}
              >
                {/* Meetup Photo */}
                {meetup.photo_url && (
                  <div className="mb-3">
                    <img
                      src={meetup.photo_url}
                      alt={meetup.title}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="text-xs text-gray-500 mb-2">
                  Posted {new Date(meetup.created_at).toLocaleDateString()} by{' '}
                  {meetup.creator_name}
                </div>

                <h3 className="font-bold text-blue-600 text-lg mb-3">
                  {meetup.title}
                </h3>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-bold text-gray-700">Date:</span>{' '}
                    <span className="text-gray-600">
                      {new Date(meetup.meetup_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-700">Time:</span>{' '}
                    <span className="text-gray-600">
                      {new Date(meetup.meetup_date).toLocaleTimeString()}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-700">Location:</span>{' '}
                    <span className="text-gray-600">{meetup.location}</span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-700">
                      Description:
                    </span>{' '}
                    <span className="text-gray-600">{meetup.description}</span>
                  </div>
                </div>
              </div>

              {index < meetups.length - 1 && (
                <div className="border-t border-gray-200 mb-4"></div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
};

export default MeetupsScreen;
