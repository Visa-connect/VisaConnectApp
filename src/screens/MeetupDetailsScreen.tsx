import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Button from '../components/Button';
import { meetupService, Meetup } from '../api/meetupService';

// Remove the local interface since we're using the one from the service

const MeetupDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { meetupId } = useParams<{ meetupId: string }>();
  const [meetup, setMeetup] = useState<Meetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestMessage, setInterestMessage] = useState<string | null>(null);

  // Fetch meetup details on component mount
  useEffect(() => {
    const fetchMeetup = async () => {
      if (!meetupId) return;

      try {
        setLoading(true);
        setError(null);
        const meetupData = await meetupService.getMeetup(parseInt(meetupId));
        setMeetup(meetupData);
      } catch (err) {
        console.error('Error fetching meetup:', err);
        setError('Failed to load meetup details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetup();
  }, [meetupId]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleImInterested = async () => {
    if (!meetup || interestLoading) return;

    try {
      setInterestLoading(true);
      setInterestMessage(null);

      const result = await meetupService.expressInterest(meetup.id);

      if (result.success) {
        setIsInterested(true);
        setInterestMessage(result.message);
      } else {
        setInterestMessage(result.message);
        // If it's an "already interested" error, update the state
        if (result.code === 'MEETUP_ALREADY_INTERESTED') {
          setIsInterested(true);
        }
      }

      // Clear message after 3 seconds for success, 5 seconds for error
      setTimeout(() => setInterestMessage(null), result.success ? 3000 : 5000);
    } catch (err: unknown) {
      console.error('Error expressing interest:', err);
      setInterestMessage('An unexpected error occurred. Please try again.');
      setTimeout(() => setInterestMessage(null), 5000);
    } finally {
      setInterestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">Loading meetup details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">Meetup not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={handleBackClick}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Meetups
        </button>

        {/* Meetup Details */}
        <div className="space-y-6">
          {/* Posted By Info */}
          <div className="text-sm text-gray-500 mb-4">
            Posted {new Date(meetup.created_at).toLocaleDateString()} by{' '}
            {meetup.creator?.first_name && meetup.creator?.last_name ? (
              <button
                onClick={() => navigate(`/public-profile/${meetup.creator.id}`)}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {meetup.creator.first_name} {meetup.creator.last_name}
              </button>
            ) : (
              <button
                onClick={() =>
                  navigate(`/public-profile/${meetup.creator?.id}`)
                }
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {meetup.creator?.email || 'Unknown User'}
              </button>
            )}
          </div>

          {/* Meetup Title */}
          <h2 className="font-bold text-blue-600 text-xl mb-4">
            {meetup.title}
          </h2>

          {/* Key Details */}
          <div className="space-y-3 mb-6">
            <div>
              <span className="font-bold text-gray-900">Date:</span>{' '}
              <span className="text-gray-700">
                {new Date(meetup.meetup_date).toLocaleDateString()}
              </span>
            </div>

            <div>
              <span className="font-bold text-gray-900">Time:</span>{' '}
              <span className="text-gray-700">
                {new Date(meetup.meetup_date).toLocaleTimeString()}
              </span>
            </div>

            <div>
              <span className="font-bold text-gray-900">Location:</span>{' '}
              <span className="text-gray-700">{meetup.location}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <span className="font-bold text-gray-900">Description:</span>{' '}
            <span className="text-gray-700 leading-relaxed">
              {meetup.description}
            </span>
          </div>

          {/* Illustrative Image */}
          {meetup.photo_url && (
            <div className="mb-6">
              <img
                src={meetup.photo_url}
                alt="Meetup location"
                className="w-full h-full object-contain rounded-lg shadow-sm"
              />
            </div>
          )}

          {/* Call to Action Button */}
          <div className="pb-20 space-y-4">
            {/* Interest Message */}
            {interestMessage && (
              <div
                className={`text-center p-3 rounded-lg ${
                  interestMessage.includes('successfully')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {interestMessage}
              </div>
            )}

            {/* Interest Button */}
            <Button
              variant={isInterested ? 'secondary' : 'primary'}
              onClick={handleImInterested}
              className="w-full py-4 text-lg font-bold"
              disabled={interestLoading || isInterested}
            >
              {interestLoading
                ? 'Processing...'
                : isInterested
                ? 'Interest Expressed ✓'
                : "I'm Interested"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetupDetailsScreen;
