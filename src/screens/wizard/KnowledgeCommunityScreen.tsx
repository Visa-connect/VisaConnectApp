import React, { useState, useEffect, Fragment } from 'react';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { JOB_BOARDS } from '../../data/commonOptions';
import { apiPatch } from '../../api';
import { useUserStore } from '../../stores/userStore';

const KnowledgeCommunityScreen: React.FC = () => {
  const [form, setForm] = useState({
    mentorshipInterest: 'yes' as 'yes' | 'no',
    jobBoards: [] as string[],
    visaAdvice: '',
  });
  const [jobBoardsQuery, setJobBoardsQuery] = useState('');
  const [jobBoardsOpen, setJobBoardsOpen] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Zustand store
  const { user, updateUser } = useUserStore();

  // Pre-populate form with existing user data
  useEffect(() => {
    if (user) {
      setForm({
        mentorshipInterest:
          user.mentorship_interest !== undefined
            ? user.mentorship_interest
              ? 'yes'
              : 'no'
            : 'yes',
        jobBoards: user.job_boards || [],
        visaAdvice: user.visa_advice || '',
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user?.uid) {
      navigate('/sign-in');
    }
  }, [user, navigate]);

  const handleContinue = async () => {
    setLoading(true);
    setApiError('');
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      // Update user profile with knowledge & community information
      const updateData = {
        mentorship_interest: form.mentorshipInterest === 'yes' ? true : false,
        job_boards: form.jobBoards,
        visa_advice: form.visaAdvice,
      };

      await apiPatch('/api/user/profile', updateData);

      // Update local store with new data
      updateUser(updateData);

      setLoading(false);
      navigate('/dashboard');
    } catch (err: any) {
      setApiError(err.message || 'Failed to save knowledge & community info');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pb-4">
      {/* Loading state for form submission */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <svg
            className="animate-spin h-10 w-10 text-sky-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            ></path>
          </svg>
        </div>
      )}

      {/* Loading state for user data */}
      {!user && (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </div>
      )}

      {user && (
        <div className="w-full max-w-md flex flex-col items-center">
          {/* Header */}
          <div className="w-full bg-purple-100 rounded-b-3xl flex flex-col items-center py-6 mb-6 relative">
            <AcademicCapIcon className="h-12 w-12 text-sky-500 mb-2" />
            {/* Progress dots */}
            <div className="flex gap-1 mb-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-800 rounded-full inline-block" />
              {/* Current step */}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2 text-center px-4">
              Knowledge & Community
            </h1>
          </div>
          {/* Form Fields */}
          <div className="w-full flex flex-col px-4">
            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                Would you be open to mentoring someone with your visa type?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.mentorshipInterest === 'yes'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() =>
                    setForm({ ...form, mentorshipInterest: 'yes' })
                  }
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.mentorshipInterest === 'no'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => setForm({ ...form, mentorshipInterest: 'no' })}
                >
                  No
                </button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                Do you know any good online job boards or agencies?
              </label>
              <Combobox
                value={form.jobBoards}
                onChange={(vals: string[]) => {
                  // Handle custom values that start with "ADD_CUSTOM:"
                  const processedVals = vals.map((val) => {
                    if (val.startsWith('ADD_CUSTOM:')) {
                      return val.replace('ADD_CUSTOM:', '');
                    }
                    return val;
                  });

                  setForm({ ...form, jobBoards: processedVals });
                  setJobBoardsQuery('');
                  setJobBoardsOpen(false);
                }}
                onClose={() => {
                  // Ensure dropdown closes when losing focus
                  setJobBoardsOpen(false);
                }}
                onBlur={() => {
                  // Additional safety to close dropdown
                  setTimeout(() => setJobBoardsOpen(false), 100);
                }}
                multiple
                as={React.Fragment}
                open={jobBoardsOpen}
                onOpenChange={setJobBoardsOpen}
              >
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.jobBoards.map((jobBoard) => (
                      <span
                        key={jobBoard}
                        className="inline-flex items-center bg-sky-100 text-sky-800 rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {jobBoard}
                        <button
                          type="button"
                          className="ml-2 text-sky-400 hover:text-sky-700 focus:outline-none"
                          onClick={() =>
                            setForm({
                              ...form,
                              jobBoards: form.jobBoards.filter(
                                (jb) => jb !== jobBoard
                              ),
                            })
                          }
                          aria-label={`Remove ${jobBoard}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4"
                      displayValue={() => jobBoardsQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setJobBoardsQuery(e.target.value);
                        setJobBoardsOpen(true);
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (
                          e.key === 'Enter' &&
                          jobBoardsQuery.trim() &&
                          !form.jobBoards.includes(jobBoardsQuery.trim())
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          const customValue = jobBoardsQuery.trim();

                          // Add the custom value to the form
                          setForm({
                            ...form,
                            jobBoards: [...form.jobBoards, customValue],
                          });

                          // Clear the input and close dropdown immediately
                          setJobBoardsQuery('');
                          setJobBoardsOpen(false);

                          // Force the input to clear by updating the display value
                          e.currentTarget.value = '';
                        }
                      }}
                      placeholder="Enter job boards or agencies"
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </Combobox.Button>
                  </div>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Combobox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                      {/* Always show custom add option if user typed something not already selected */}
                      {jobBoardsQuery.trim() &&
                        !form.jobBoards.includes(jobBoardsQuery.trim()) && (
                          <Combobox.Option
                            value={`ADD_CUSTOM:${jobBoardsQuery.trim()}`}
                            className={({ active }: { active: boolean }) =>
                              `cursor-pointer select-none relative py-3 px-4 ${
                                active
                                  ? 'bg-green-100 text-green-900'
                                  : 'text-green-700'
                              }`
                            }
                          >
                            <span className="block truncate font-medium">
                              + Add "{jobBoardsQuery.trim()}"
                            </span>
                          </Combobox.Option>
                        )}

                      {/* Show filtered predefined options */}
                      {JOB_BOARDS.filter(
                        (jobBoard) =>
                          jobBoard
                            .toLowerCase()
                            .includes(jobBoardsQuery.toLowerCase()) &&
                          !form.jobBoards.includes(jobBoard)
                      ).map((jobBoard) => (
                        <Combobox.Option
                          key={jobBoard}
                          value={jobBoard}
                          className={({ active }: { active: boolean }) =>
                            `cursor-pointer select-none relative py-3 px-4 ${
                              active
                                ? 'bg-sky-100 text-sky-900'
                                : 'text-gray-900'
                            }`
                          }
                        >
                          {({ selected }: { selected: boolean }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? 'font-semibold' : 'font-normal'
                                }`}
                              >
                                {jobBoard}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 right-4 flex items-center text-sky-600">
                                  <CheckIcon
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Combobox.Option>
                      ))}

                      {/* Show "No results found" only if no custom add option and no predefined options */}
                      {!jobBoardsQuery.trim() &&
                        JOB_BOARDS.filter(
                          (jobBoard) =>
                            jobBoard
                              .toLowerCase()
                              .includes(jobBoardsQuery.toLowerCase()) &&
                            !form.jobBoards.includes(jobBoard)
                        ).length === 0 && (
                          <div className="cursor-default select-none py-3 px-4 text-gray-700">
                            No results found.
                          </div>
                        )}
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            </div>
            <div className="mb-6">
              <label className="block text-gray-800 font-medium mb-2">
                What advice would you give someone starting their visa journey?
              </label>
              <textarea
                name="visaAdvice"
                placeholder="Share your advice"
                value={form.visaAdvice}
                onChange={(e) =>
                  setForm({ ...form, visaAdvice: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4 min-h-[80px]"
              />
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full max-w-md mb-2 mx-4"
            onClick={handleContinue}
            disabled={loading}
          >
            Save & Continue
          </Button>
          {apiError && (
            <div className="text-red-500 text-center mt-2">{apiError}</div>
          )}
          <button
            className="text-gray-500 underline text-base mt-2"
            onClick={() => navigate('/dashboard')}
          >
            Skip and finish later
          </button>
        </div>
      )}
    </div>
  );
};

export default KnowledgeCommunityScreen;
