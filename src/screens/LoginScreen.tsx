import React, { useState } from 'react';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { apiPostPublic } from '../api';
import { useUserStore } from '../stores/userStore';
import logo from '../assets/images/logo.png';
import { LoginResponse } from '../types/api';
import { userToUserData } from '../stores/userStore';

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

      if (loginResponse.success) {
        // Store the Firebase ID token (always present on successful login)
        setToken(loginResponse.token);

        // Convert API response to store format
        const userData = userToUserData(loginResponse.user);
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
