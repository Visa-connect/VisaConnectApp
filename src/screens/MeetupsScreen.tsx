import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
        // Sort meetups by date, newest first
        const sortedMeetups = fetchedMeetups.sort(
          (a, b) =>
            new Date(b.meetup_date).getTime() -
            new Date(a.meetup_date).getTime()
        );
        setMeetups(sortedMeetups);
      } catch (err) {
        console.error('Error fetching meetups:', err);
        setError('Failed to load meetups. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetups();
  }, [searchQuery]);

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
      {/* Desktop Header Navigation */}

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
          Meetups & Free Time
        </h1>

        {/* Post a Meetup Button */}
        <div className="mb-6">
          <Button
            variant="primary"
            onClick={handlePostMeetup}
            className="w-full py-4 text-lg font-medium"
          >
            Post a Meetup
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search keywords"
              value={searchQuery}
              onChange={handleSearchChange}
              className="block w-full pl-12 pr-12 py-4 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Meetup Listings */}
        <div className="space-y-6">
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
                  className="bg-white rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
                  onClick={() => handleMeetupClick(meetup.id)}
                >
                  {/* Meetup Photo */}
                  {meetup.photo_url && (
                    <div className="mb-4">
                      <img
                        src={meetup.photo_url}
                        alt={meetup.title}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  )}

                  <div className="text-sm text-gray-500 mb-3">
                    Posted by{' '}
                    {meetup.creator?.first_name && meetup.creator?.last_name ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the card click
                          navigate(`/public-profile/${meetup.creator.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {meetup.creator.first_name} {meetup.creator.last_name}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering the card click
                          navigate(`/public-profile/${meetup.creator?.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {meetup.creator?.email || 'Unknown User'}
                      </button>
                    )}
                  </div>

                  <h3 className="font-bold text-blue-600 text-xl mb-4">
                    {meetup.title}
                  </h3>

                  <div className="space-y-3 text-base">
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
                      <span className="text-gray-600">
                        {meetup.description}
                      </span>
                    </div>
                  </div>
                </div>

                {index < meetups.length - 1 && (
                  <div className="border-t border-gray-200 my-6"></div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MeetupsScreen;
