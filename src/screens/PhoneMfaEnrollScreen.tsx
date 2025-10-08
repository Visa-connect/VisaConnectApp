/**
 * Phone MFA Enrollment Screen
 * Allows users to enroll in phone-based multi-factor authentication
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput, { CountryCode } from '../components/PhoneInput';
import VerificationCodeInput from '../components/VerificationCodeInput';
import { useUserStore } from '../stores/userStore';

interface MfaStatus {
  mfaEnabled: boolean;
  phoneNumber: string | null;
}

const PhoneMfaEnrollScreen: React.FC = () => {
  const navigate = useNavigate();
  const { getToken } = useUserStore();

  const [step, setStep] = useState<'status' | 'enroll' | 'verify'>('status');
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState<CountryCode>('US');
  const [verificationCode, setVerificationCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch MFA status on mount
  useEffect(() => {
    fetchMfaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMfaStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mfa/status', {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setMfaStatus(data.data);
      }
    } catch (err: any) {
      console.error('Error fetching MFA status:', err);
      setError('Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollStart = () => {
    setStep('enroll');
    setError('');
    setSuccess('');
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/mfa/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''), // Remove formatting
          countryCode,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.sessionId);
        setSuccess(data.data.message);
        setStep('verify');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err: any) {
      console.error('Error enrolling in MFA:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (code?: string) => {
    const codeToVerify = code || verificationCode;

    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          sessionId,
          verificationCode: codeToVerify,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('Phone MFA enabled successfully!');
        setTimeout(() => {
          fetchMfaStatus();
          setStep('status');
          setPhoneNumber('');
          setVerificationCode('');
          setSessionId('');
        }, 2000);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableMfa = async () => {
    if (
      !window.confirm(
        'Are you sure you want to disable multi-factor authentication?'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSuccess('MFA disabled successfully');
        fetchMfaStatus();
      } else {
        setError(data.error || 'Failed to disable MFA');
      }
    } catch (err: any) {
      console.error('Error disabling MFA:', err);
      setError('Failed to disable MFA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !mfaStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Phone Multi-Factor Authentication
          </h1>
          <p className="mt-2 text-gray-600">
            Add an extra layer of security to your account
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* MFA Status View */}
        {step === 'status' && mfaStatus && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  MFA Status
                </h2>
                {mfaStatus.mfaEnabled ? (
                  <div className="space-y-3">
                    <div className="flex items-center text-green-600">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">MFA is enabled</span>
                    </div>
                    <p className="text-gray-600">
                      Phone: {mfaStatus.phoneNumber || 'Not available'}
                    </p>
                    <button
                      onClick={handleDisableMfa}
                      disabled={loading}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Disable MFA
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center text-gray-500">
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="font-medium">MFA is not enabled</span>
                    </div>
                    <p className="text-gray-600">
                      Enable phone-based MFA to add an extra layer of security
                      to your account
                    </p>
                    <button
                      onClick={handleEnrollStart}
                      className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Enable MFA
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MFA Benefits */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Benefits of MFA
              </h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Enhanced account security
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Protection against unauthorized access
                </li>
                <li className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verification via SMS code
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Enrollment Step: Phone Number */}
        {step === 'enroll' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Enter Your Phone Number
            </h2>
            <form onSubmit={handlePhoneSubmit}>
              <PhoneInput
                value={phoneNumber}
                onChange={(phone, country) => {
                  setPhoneNumber(phone);
                  setCountryCode(country);
                }}
                error={error}
                placeholder="Enter phone number"
                className="mb-6"
              />

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('status');
                    setError('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !phoneNumber.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Verification Step: Enter Code */}
        {step === 'verify' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Enter Verification Code
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a 6-digit code to your phone
            </p>

            <div className="mb-6">
              <VerificationCodeInput
                value={verificationCode}
                onChange={setVerificationCode}
                onComplete={handleVerificationSubmit}
                error={error}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep('enroll');
                  setVerificationCode('');
                  setError('');
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => handleVerificationSubmit()}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>

            {/* Resend Code */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handlePhoneSubmit}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
              >
                Resend Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneMfaEnrollScreen;
