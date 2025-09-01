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

  const handleMoreOptions = () => {
    // TODO: Show options menu (report, etc.)
    console.log('More options clicked');
  };

  const handleImInterested = async () => {
    if (!meetup) return;

    try {
      await meetupService.expressInterest(meetup.id);
      // TODO: Show success message or update UI
      console.log('Interest expressed successfully');
    } catch (err) {
      console.error('Error expressing interest:', err);
      // TODO: Show error message
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
      {/* App Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b">
        <button onClick={handleBackClick} className="p-2 -ml-2">
          <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="font-bold text-lg text-gray-900 leading-tight">
          {meetup.title}
        </h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      {/* Meetup Details */}
      <div className="px-4 py-6">
        {/* Posted By Info */}
        <div className="text-sm text-gray-500 mb-4">
          Posted {new Date(meetup.created_at).toLocaleDateString()} by{' '}
          {meetup.creator_name}
        </div>

        {/* Meetup Title */}
        <h2 className="font-bold text-blue-600 text-xl mb-4">{meetup.title}</h2>

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
              className="w-full h-48 object-cover rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* Call to Action Button */}
        <div className="pb-20">
          <Button
            variant="primary"
            onClick={handleImInterested}
            className="w-full py-4 text-lg font-bold"
          >
            I'm Interested
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MeetupDetailsScreen;
