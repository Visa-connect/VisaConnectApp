import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import DrawerMenu from '../components/DrawerMenu';

interface ProfileUser {
  id: string;
  first_name: string;
  last_name: string;
  visa_type: string;
  current_location: {
    city: string;
    state: string;
    country: string;
  };
  occupation: string;
  profile_photo_url?: string;
  bio?: string;
  nationality?: string;
  languages?: string[];
  hobbies?: string[];
  favorite_state?: string;
  preferred_outings?: string[];
  has_car?: boolean;
  offers_rides?: boolean;
  relationship_status?: string;
  road_trips?: boolean;
  favorite_place?: string;
  travel_tips?: string;
  willing_to_guide?: boolean;
  mentorship_interest?: boolean;
  created_at?: Date;
}

const PublicProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useUserStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [similarities, setSimilarities] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOverlayClick = () => {
    setIsDrawerOpen(false);
  };

  // Calculate similarities between current user and profile user
  const calculateSimilarities = useCallback(
    (profileUser: ProfileUser) => {
      if (!currentUser || !profileUser) return;

      const similaritiesList: string[] = [];

      // Visa type similarity
      if (
        currentUser.visa_type &&
        profileUser.visa_type &&
        currentUser.visa_type === profileUser.visa_type
      ) {
        similaritiesList.push(`${currentUser.visa_type} Visa`);
      }

      // Location similarity
      if (currentUser.current_location && profileUser.current_location) {
        if (
          currentUser.current_location.state ===
          profileUser.current_location.state
        ) {
          similaritiesList.push(
            `${profileUser.current_location.state} Resident`
          );
        }
        if (
          currentUser.current_location.country ===
          profileUser.current_location.country
        ) {
          similaritiesList.push(
            `${profileUser.current_location.country} National`
          );
        }
      }

      // Language similarity
      if (currentUser.languages && profileUser.languages) {
        const commonLanguages = currentUser.languages.filter((lang) =>
          profileUser.languages!.includes(lang)
        );
        if (commonLanguages.length > 0) {
          similaritiesList.push(`${commonLanguages[0]} Speaker`);
        }
      }

      // Hobby similarity
      if (currentUser.hobbies && profileUser.hobbies) {
        const commonHobbies = currentUser.hobbies.filter((hobby) =>
          profileUser.hobbies!.includes(hobby)
        );
        if (commonHobbies.length > 0) {
          similaritiesList.push(`${commonHobbies[0]} Enthusiast`);
        }
      }

      // Favorite state similarity
      if (
        currentUser.favorite_state &&
        profileUser.favorite_state &&
        currentUser.favorite_state === profileUser.favorite_state
      ) {
        similaritiesList.push(`${profileUser.favorite_state} Lover`);
      }

      // Preferred outings similarity
      if (currentUser.preferred_outings && profileUser.preferred_outings) {
        const commonOutings = currentUser.preferred_outings.filter((outing) =>
          profileUser.preferred_outings!.includes(outing)
        );
        if (commonOutings.length > 0) {
          similaritiesList.push(`${commonOutings[0]} Fan`);
        }
      }

      // Car ownership similarity
      if (
        currentUser.has_car !== undefined &&
        profileUser.has_car !== undefined &&
        currentUser.has_car === profileUser.has_car
      ) {
        similaritiesList.push(
          currentUser.has_car ? 'Car Owner' : 'Public Transport User'
        );
      }

      // Mentorship interest similarity
      if (currentUser.mentorship_interest && profileUser.mentorship_interest) {
        similaritiesList.push('Mentorship Interested');
      }

      // Willing to guide similarity
      if (currentUser.willing_to_guide && profileUser.willing_to_guide) {
        similaritiesList.push('Willing to Guide');
      }

      setSimilarities(similaritiesList);
    },
    [currentUser]
  );

  // Fetch profile user data
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (!userId) return;

      try {
        const token = useUserStore.getState().getToken();
        const response = await fetch(`/api/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setProfileUser(result.data);
            // Calculate similarities after setting profile user
            calculateSimilarities(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch profile user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileUser();
  }, [userId, calculateSimilarities]);

  const handleChatClick = async () => {
    if (!profileUser || !currentUser) return;

    try {
      // Create or get existing conversation with this user
      const token = useUserStore.getState().getToken();
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: [currentUser.uid, profileUser.id],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Navigate directly to the specific conversation
          navigate(`/chat/${result.data.id}`, {
            state: {
              otherUserId: profileUser.id,
              otherUserName: `${profileUser.first_name} ${profileUser.last_name}`,
              otherUserPhoto: profileUser.profile_photo_url || null,
            },
          });
        } else {
          console.error('Failed to create conversation:', result.message);
          // Fallback: navigate to general chat
          navigate('/chat');
        }
      } else {
        console.error('Failed to create conversation');
        // Fallback: navigate to general chat
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      // Fallback: navigate to general chat
      navigate('/chat');
    }
  };

  // Helper function to format travel experience
  const formatTravelExperience = (user: ProfileUser) => {
    const experiences = [];
    if (user.favorite_place) experiences.push(user.favorite_place);
    if (user.favorite_state) experiences.push(user.favorite_state);
    if (user.road_trips) experiences.push('road trips');

    if (experiences.length === 0) return 'Various destinations';
    if (experiences.length === 1) return experiences[0];
    if (experiences.length === 2) return experiences.join(' and ');
    return `${experiences.slice(0, -1).join(', ')}, and ${
      experiences[experiences.length - 1]
    }`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            User not found
          </h2>
          <p className="text-gray-600">
            The profile you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DrawerMenu
        open={isDrawerOpen}
        onClose={handleOverlayClick}
        navigate={navigate}
        highlight={undefined}
      />

      {/* Profile Header - Name and Chat Icon */}
      <div className="max-w-4xl mx-auto py-4">
        <div className="flex items-center justify-between">
          {/* Left spacer to balance the layout */}
          <div className="w-10"></div>

          {/* User Name - Centered */}
          <h1 className="text-xl font-bold text-gray-900">
            {profileUser.first_name} {profileUser.last_name}
          </h1>

          {/* Chat Icon - Right side */}
          <button
            onClick={handleChatClick}
            className="w-12 h-12 rounded-full bg-transparent text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
            aria-label="Start chat with this user"
            title="Start chat"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="black"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18l-4-4h8l-4 4z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 md:px-6 py-6 max-w-4xl mx-auto">
        {/* Profile Information Card */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
          <div className="flex items-start space-x-4">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              {profileUser.profile_photo_url ? (
                <img
                  src={profileUser.profile_photo_url}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* User Attributes/Badges */}
            <div className="flex-1 space-y-2">
              {/* Occupation */}
              {profileUser.occupation && (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    {profileUser.occupation}
                  </span>
                </div>
              )}

              {/* Location */}
              {profileUser.current_location && (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    {profileUser.current_location.city},{' '}
                    {profileUser.current_location.state}
                  </span>
                </div>
              )}

              {/* Visa type */}
              {profileUser.visa_type && (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    {profileUser.visa_type} Visa
                  </span>
                </div>
              )}

              {/* Mentorship interest */}
              {profileUser.mentorship_interest && (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    Has helped people
                  </span>
                </div>
              )}

              {/* Travel experience */}
              {(profileUser.favorite_place ||
                profileUser.favorite_state ||
                profileUser.road_trips) && (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-700">
                    Has been to {formatTravelExperience(profileUser)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bio/Quote */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-gray-900 text-sm leading-relaxed italic">
              "
              {profileUser.bio ||
                'Looking to connect with fellow visa holders and build meaningful relationships.'}
              "
            </p>
          </div>
        </div>

        {/* Things you have in common Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-3">
            Things you have in common with {profileUser.first_name}
          </h2>

          {similarities.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {similarities.map((similarity, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium"
                >
                  {similarity}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">
                No similarities found yet. Start a conversation to discover
                common interests!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfileScreen;
