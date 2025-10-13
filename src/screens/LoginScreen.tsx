import React, { useState } from 'react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { apiPostPublic } from '../api';
import { useUserStore } from '../stores/userStore';
import logo from '../assets/images/logo.png';

// Types for login response
interface LoginResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    visa_type?: string;
    current_location?: {
      city: string;
      state: string;
      country: string;
    };
    occupation?: string;
    employer?: string;
    nationality?: string;
    languages?: string[];
    other_us_jobs?: string[];
    relationship_status?: string;
    hobbies?: string[];
    favorite_state?: string;
    preferred_outings?: string[];
    has_car?: boolean;
    offers_rides?: boolean;
    road_trips?: boolean;
    favorite_place?: string;
    travel_tips?: string;
    willing_to_guide?: boolean;
    mentorship_interest?: boolean;
    job_boards?: string[];
    visa_advice?: string;
    profile_photo_url?: string;
    profile_photo_public_id?: string;
    bio?: string;
  };
  token?: string; // Firebase ID token for authenticated API calls
}

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4 ${className}`}
    {...props}
  />
));
Input.displayName = 'Input';

const SignInScreen: React.FC = () => {
  // Email/password login state
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  // Zustand store
  const { setUser, setToken } = useUserStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setApiError('');
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.email.trim()) newErrors.email = 'Email is required.';
    if (!form.password) newErrors.password = 'Password is required.';
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setApiError('');

    try {
      // Simple email/password login
      const loginResponse = await apiPostPublic<LoginResponse>(
        '/api/auth/login',
        {
          email: form.email,
          password: form.password,
        }
      );

      if (loginResponse.user) {
        // Store the Firebase ID token if provided by backend
        if (loginResponse.token) {
          setToken(loginResponse.token);
        }

        const userData = {
          uid: loginResponse.user.id,
          email: loginResponse.user.email,
          first_name: loginResponse.user.first_name || '',
          last_name: loginResponse.user.last_name || '',
          visa_type: loginResponse.user.visa_type || '',
          current_location: loginResponse.user.current_location || {},
          occupation: loginResponse.user.occupation || '',
          employer: loginResponse.user.employer || '',
          nationality: loginResponse.user.nationality,
          languages: loginResponse.user.languages || [],
          other_us_jobs: loginResponse.user.other_us_jobs || [],
          relationship_status: loginResponse.user.relationship_status,
          hobbies: loginResponse.user.hobbies || [],
          favorite_state: loginResponse.user.favorite_state,
          preferred_outings: loginResponse.user.preferred_outings || [],
          has_car: loginResponse.user.has_car,
          offers_rides: loginResponse.user.offers_rides,
          road_trips: loginResponse.user.road_trips,
          favorite_place: loginResponse.user.favorite_place,
          travel_tips: loginResponse.user.travel_tips,
          willing_to_guide: loginResponse.user.willing_to_guide,
          mentorship_interest: loginResponse.user.mentorship_interest,
          job_boards: loginResponse.user.job_boards || [],
          visa_advice: loginResponse.user.visa_advice,
          profile_photo_url: loginResponse.user.profile_photo_url,
          profile_photo_public_id: loginResponse.user.profile_photo_public_id,
          bio: loginResponse.user.bio,
        };

        setUser(userData);

        // Store in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(userData));
        if (loginResponse.token) {
          localStorage.setItem('token', loginResponse.token);
        }

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setApiError('Login failed. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setApiError(
        error.response?.data?.message ||
          error.message ||
          'Login failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 pt-8 pb-4">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <img src={logo} alt="VisaConnect Logo" className="h-16 w-auto" />
          </div>
          <p className="text-gray-600 text-center">Sign in to your account</p>
        </div>

        {/* Email/Password Login Form */}
        <div className="w-full">
          <form className="w-full" onSubmit={handleSubmit}>
            {apiError && (
              <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 text-sm">{apiError}</p>
              </div>
            )}

            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              disabled={submitting}
            />
            {errors.email && (
              <p className="text-red-500 text-sm -mt-2 mb-2">{errors.email}</p>
            )}

            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              disabled={submitting}
            />
            {errors.password && (
              <p className="text-red-500 text-sm -mt-2 mb-2">
                {errors.password}
              </p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>

        {/* Back to Welcome */}
        <button
          className="text-gray-500 underline text-base"
          onClick={() => navigate('/')}
        >
          ← Back to Welcome
        </button>
      </div>
    </div>
  );
};

export default SignInScreen;
