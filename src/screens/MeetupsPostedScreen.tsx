import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';
import { meetupService, Meetup } from '../api/meetupService';
import Button from '../components/Button';

const MeetupsPostedScreen: React.FC = () => {
  const navigate = useNavigate();
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserMeetups();
  }, []);

  const fetchUserMeetups = async () => {
    try {
      setLoading(true);
      setError(null);
      const userMeetups = await meetupService.getUserCreatedMeetups();
      setMeetups(userMeetups);
    } catch (err) {
      console.error('Error fetching user meetups:', err);
      setError('Failed to load your meetups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    navigate('/settings');
  };

  const handleMeetupClick = (meetupId: number) => {
    navigate(`/meetup/${meetupId}`);
  };

  const handleEditMeetup = (e: React.MouseEvent, meetupId: number) => {
    e.stopPropagation(); // Prevent triggering the card click
    navigate(`/edit-meetup/${meetupId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Mobile Back Button */}
        <div className="md:hidden mb-6">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Settings
          </button>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meetups I Posted</h1>
          <p className="text-gray-600 mt-2">
            Manage and view all the meetups you've created
          </p>
        </div>

        {/* Meetup Listings */}
        <div className="space-y-6">
          {loading && (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading your meetups...</div>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">{error}</div>
              <Button variant="secondary" onClick={fetchUserMeetups}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && meetups.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                You haven't posted any meetups yet.
              </div>
              <Button
                variant="primary"
                onClick={() => navigate('/post-meetup')}
              >
                Create Your First Meetup
              </Button>
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
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}

                  <div className="text-sm text-gray-500 mb-3">
                    Posted {new Date(meetup.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-blue-600 text-xl">
                      {meetup.title}
                    </h3>
                    <button
                      onClick={(e) => handleEditMeetup(e, meetup.id)}
                      className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 transition-colors"
                      title="Edit meetup"
                    >
                      <PencilIcon className="h-4 w-4" />
                      <span className="text-sm">Edit</span>
                    </button>
                  </div>

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

                    {meetup.current_participants > 0 && (
                      <div>
                        <span className="font-bold text-gray-700">
                          Participants:
                        </span>{' '}
                        <span className="text-gray-600">
                          {meetup.current_participants}
                          {meetup.max_participants &&
                            ` / ${meetup.max_participants}`}
                        </span>
                      </div>
                    )}
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

export default MeetupsPostedScreen;
