import React, { useState } from 'react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { apiPostPublic } from '../api';
import { useUserStore } from '../stores/userStore';
import VerificationCodeInput from '../components/VerificationCodeInput';
import PhoneInput, { CountryCode } from '../components/PhoneInput';
import { useRecaptchaContext } from '../components/RecaptchaProvider';
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
  token: string; // Firebase ID token for authenticated API calls
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
  // Login method toggle
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');

  // reCAPTCHA context
  const {
    executeRecaptcha,
    // isLoading: recaptchaLoading,
    // error: recaptchaError,
  } = useRecaptchaContext();

  // Phone login state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('US');

  // Email/password login state
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  // MFA/Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Zustand store
  const { setUser, setToken } = useUserStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
    setApiError('');
  };

  // Handle phone login - send verification code
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setApiError('Please enter your phone number');
      return;
    }

    try {
      setSubmitting(true);
      setApiError('');

      // Execute reCAPTCHA verification
      let recaptchaToken: string;
      try {
        recaptchaToken = await executeRecaptcha();
        console.log(
          'reCAPTCHA token obtained:',
          recaptchaToken ? 'success' : 'failed'
        );
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification failed:', recaptchaError);
        setApiError('reCAPTCHA verification failed. Please try again.');
        return;
      }
      console.log('recaptchaToken', recaptchaToken);
      // Send verification code to phone number
      const response = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          countryCode,
          recaptchaToken,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setMaskedPhone(data.data.maskedPhone);
        setShowVerification(true);
      } else {
        setApiError(data.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      setApiError(error.message || 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle resending verification code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    try {
      setSubmitting(true);
      setApiError('');

      // Execute reCAPTCHA verification for resend
      let recaptchaToken: string;
      try {
        recaptchaToken = await executeRecaptcha();
        console.log(
          'reCAPTCHA token for resend:',
          recaptchaToken ? 'success' : 'failed'
        );
      } catch (recaptchaError) {
        console.error(
          'reCAPTCHA verification failed for resend:',
          recaptchaError
        );
        setApiError('reCAPTCHA verification failed. Please try again.');
        return;
      }

      const endpoint =
        loginMethod === 'phone'
          ? '/api/auth/resend-phone-login-code'
          : '/api/mfa/resend-login-code';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          recaptchaToken,
          ...(loginMethod === 'phone' && { phoneNumber, countryCode }),
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Start 60-second cooldown
        setResendCooldown(60);
        const countdown = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        // Update masked phone if provided
        if (data.data.maskedPhone) {
          setMaskedPhone(data.data.maskedPhone);
        }
      } else {
        setApiError(data.error || 'Failed to resend verification code');
      }
    } catch (error: any) {
      setApiError(error.message || 'Failed to resend verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerification = async (code?: string) => {
    const codeToVerify = code || verificationCode;

    if (codeToVerify.length !== 6) {
      setApiError('Please enter the complete 6-digit code');
      return;
    }

    try {
      setSubmitting(true);
      setApiError('');

      // Verify code (works for both phone login and email+MFA)
      const verifyResponse = await fetch(
        loginMethod === 'phone'
          ? '/api/auth/verify-phone-login'
          : '/api/mfa/verify-login-code',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            verificationCode: codeToVerify,
          }),
        }
      );

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Invalid verification code');
      }

      // For phone login, complete login
      // For email+MFA, complete the login by calling backend again
      const { user, token }: LoginResponse =
        loginMethod === 'phone'
          ? verifyData // Phone login returns user data directly
          : await apiPostPublic<LoginResponse>('/api/auth/login', {
              email: form.email,
              password: form.password,
              mfaVerified: true,
            });

      if (user) {
        console.log('User data found, processing login...');
        if (token) {
          setToken(token);
        }

        const userData = {
          uid: user.id,
          email: user.email,
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          visa_type: user.visa_type || '',
          current_location: user.current_location || {},
          occupation: user.occupation || '',
          employer: user.employer || '',
          nationality: user.nationality,
          languages: user.languages || [],
          other_us_jobs: user.other_us_jobs || [],
          relationship_status: user.relationship_status,
          hobbies: user.hobbies || [],
          favorite_state: user.favorite_state,
          preferred_outings: user.preferred_outings || [],
          has_car: user.has_car,
          offers_rides: user.offers_rides,
          road_trips: user.road_trips,
          favorite_place: user.favorite_place,
          travel_tips: user.travel_tips,
          willing_to_guide: user.willing_to_guide,
          mentorship_interest: user.mentorship_interest,
          job_boards: user.job_boards || [],
          visa_advice: user.visa_advice,
          profile_photo_url: user.profile_photo_url,
          profile_photo_public_id: user.profile_photo_public_id,
          bio: user.bio,
        };

        setUser(userData);
        navigate('/dashboard');
      } else {
        console.log('No user data in response:', user);
      }
    } catch (error: any) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
      });
      setApiError(error.message || 'MFA verification failed');
    } finally {
      setSubmitting(false);
    }
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
      // Login with backend API
      const loginResponse = await apiPostPublic<any>('/api/auth/login', {
        email: form.email,
        password: form.password,
      });

      // Check if MFA is required
      if (loginResponse.requiresMfa) {
        // Send MFA code
        const mfaResponse = await fetch('/api/mfa/send-login-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: loginResponse.userId,
          }),
        });

        const mfaData = await mfaResponse.json();
        if (mfaData.success) {
          setSessionId(mfaData.data.sessionId);
          setMaskedPhone(mfaData.data.maskedPhone);
          setShowVerification(true);
          setSubmitting(false);
          return;
        } else {
          throw new Error(mfaData.error || 'Failed to send MFA code');
        }
      }

      if (loginResponse.user) {
        // Store the Firebase ID token if provided by backend
        if (loginResponse.token) {
          setToken(loginResponse.token);
        }

        // Create user data object
        const userData = {
          uid: loginResponse.user.id,
          email: loginResponse.user.email,
          first_name: loginResponse.user.first_name || '',
          last_name: loginResponse.user.last_name || '',
          visa_type: loginResponse.user.visa_type || '',
          current_location: loginResponse.user.current_location || {},
          occupation: loginResponse.user.occupation || '',
          employer: loginResponse.user.employer || '',
          // Include all profile fields for completion calculation
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

        // Store in Zustand store (this also updates localStorage for backward compatibility)
        setUser(userData);

        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      // Handle backend API errors
      let userFriendlyError = 'Sign in failed';

      if (error.message) {
        if (error.message.includes('Invalid email or password')) {
          userFriendlyError = 'Username and/or password is invalid';
        } else if (error.message.includes('Authentication failed')) {
          userFriendlyError = 'Authentication failed. Please try again.';
        } else if (error.message.includes('Invalid response from server')) {
          userFriendlyError = 'Server error. Please try again.';
        } else {
          userFriendlyError =
            error.message || 'Sign in failed. Please try again.';
        }
      }

      setApiError(userFriendlyError);
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
          <p className="text-gray-600 text-center">
            {showVerification
              ? 'Verify your identity'
              : 'Sign in to your account'}
          </p>
        </div>

        {/* Verification Code Form */}
        {showVerification ? (
          <div className="w-full">
            {apiError && (
              <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 text-sm">{apiError}</p>
              </div>
            )}

            <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Enter Verification Code
              </h2>
              <p className="text-gray-600 mb-6">
                We've sent a 6-digit code to {maskedPhone}
              </p>

              <VerificationCodeInput
                value={verificationCode}
                onChange={setVerificationCode}
                onComplete={handleMfaVerification}
                error={apiError}
                disabled={submitting}
              />

              {/* Resend Code Button */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={submitting || resendCooldown > 0}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend verification code'}
                </button>
              </div>

              <div className="mt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowVerification(false);
                    setVerificationCode('');
                    setApiError('');
                    setResendCooldown(0);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => handleMfaVerification()}
                  disabled={submitting || verificationCode.length !== 6}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Login Form - Phone or Email */
          <div className="w-full">
            {loginMethod === 'phone' ? (
              /* Phone Login Form */
              <form className="w-full" onSubmit={handlePhoneLogin}>
                {apiError && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-red-600 text-sm">{apiError}</p>
                  </div>
                )}

                <div className="mb-6">
                  <PhoneInput
                    value={phoneNumber}
                    onChange={(phone, country) => {
                      setPhoneNumber(phone);
                      setCountryCode(country);
                    }}
                    error={apiError}
                    placeholder="Enter phone number"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mb-4"
                  disabled={submitting}
                >
                  {submitting ? 'Sending Code...' : 'Continue with Phone'}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('email')}
                    className="text-sky-500 underline text-sm"
                  >
                    Sign in with email/password instead
                  </button>
                </div>
              </form>
            ) : (
              /* Email/Password Login Form */
              <form className="w-full" onSubmit={handleSubmit}>
                {apiError && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-red-600 text-sm">{apiError}</p>
                  </div>
                )}

                <div className="mb-4">
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                  {errors.email && (
                    <span className="text-red-500 text-sm">{errors.email}</span>
                  )}
                </div>

                <div className="mb-6">
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  {errors.password && (
                    <span className="text-red-500 text-sm">
                      {errors.password}
                    </span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full mb-4"
                  disabled={submitting}
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                </Button>

                <div className="text-center mb-4">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className="text-sky-500 underline text-sm"
                  >
                    ← Back to phone login
                  </button>
                </div>

                <div className="text-center">
                  <button className="text-sky-500 underline text-sm">
                    Forgot Password?
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

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
