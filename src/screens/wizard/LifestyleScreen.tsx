import React, { useState, useEffect, Fragment } from 'react';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { HandThumbUpIcon } from '@heroicons/react/24/outline';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { COMMON_HOBBIES, COMMON_OUTINGS } from '../../data/commonOptions';
import { US_STATES } from '../../data/usStates';
import { apiPatch } from '../../api';
import { useUserStore } from '../../stores/userStore';

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

const LifestyleScreen: React.FC = () => {
  const [form, setForm] = useState({
    hobbies: [] as string[],
    favoriteState: '',
    outings: [] as string[],
    hasCar: 'yes' as 'yes' | 'no',
    willingToDrive: 'yes' as 'yes' | 'no',
  });
  const [hobbiesQuery, setHobbiesQuery] = useState('');
  const [hobbiesOpen, setHobbiesOpen] = useState(false);
  const [stateQuery, setStateQuery] = useState('');
  const [outingsQuery, setOutingsQuery] = useState('');
  const [outingsOpen, setOutingsOpen] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Zustand store
  const { user, updateUser } = useUserStore();

  // Pre-populate form with existing user data
  useEffect(() => {
    if (user) {
      setForm({
        hobbies: user.hobbies || [],
        favoriteState: user.favorite_state || '',
        outings: user.preferred_outings || [],
        hasCar:
          user.has_car !== undefined ? (user.has_car ? 'yes' : 'no') : 'yes',
        willingToDrive:
          user.offers_rides !== undefined
            ? user.offers_rides
              ? 'yes'
              : 'no'
            : 'yes',
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user?.uid) {
      navigate('/sign-in');
    }
  }, [user, navigate]);

  // Sync stateQuery with form.favoriteState
  useEffect(() => {
    setStateQuery(form.favoriteState);
  }, [form.favoriteState]);

  // Sync outingsQuery with form.outings (for display purposes)
  useEffect(() => {
    setOutingsQuery('');
  }, [form.outings]);

  const handleToggle = (
    field: 'hasCar' | 'willingToDrive',
    value: 'yes' | 'no'
  ) => {
    setForm({ ...form, [field]: value });
  };

  const handleContinue = async () => {
    setLoading(true);
    setApiError('');
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      // Update user profile with lifestyle information
      const updateData = {
        hobbies: form.hobbies,
        favorite_state: form.favoriteState,
        preferred_outings: form.outings,
        has_car: form.hasCar === 'yes',
        offers_rides: form.willingToDrive === 'yes',
        outings: form.outings,
        willing_to_drive: form.willingToDrive,
      };

      await apiPatch('/api/user/profile', updateData);

      // Update local store with new data
      updateUser(updateData);

      setLoading(false);
      navigate('/travel-exploration');
    } catch (err: any) {
      setApiError(err.message || 'Failed to save lifestyle info');
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
          <div className="w-full bg-green-100 rounded-b-3xl flex flex-col items-center py-6 mb-6 relative">
            <h1 className="text-xl font-bold text-gray-900 mb-2 text-center px-4">
              Tell us about your lifestyle and personality
            </h1>
            <HandThumbUpIcon className="h-12 w-12 text-sky-500 mb-2" />
            {/* Progress dots */}
            <div className="flex gap-1 mb-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-800 rounded-full inline-block" />
              {/* Current step */}
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
            </div>
          </div>
          {/* Form Fields */}
          <div className="w-full flex flex-col px-4">
            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                What are your hobbies and interests?
              </label>
              <Combobox
                value={form.hobbies}
                onChange={(vals: string[]) => {
                  // Handle custom values that start with "ADD_CUSTOM:"
                  const processedVals = vals.map((val) => {
                    if (val.startsWith('ADD_CUSTOM:')) {
                      return val.replace('ADD_CUSTOM:', '');
                    }
                    return val;
                  });

                  setForm({ ...form, hobbies: processedVals });
                  setHobbiesQuery('');
                  setHobbiesOpen(false);
                }}
                onClose={() => {
                  // Ensure dropdown closes when losing focus
                  setHobbiesOpen(false);
                }}
                multiple
                as={React.Fragment}
                open={hobbiesOpen}
                onOpenChange={setHobbiesOpen}
              >
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.hobbies.map((hobby) => (
                      <span
                        key={hobby}
                        className="inline-flex items-center bg-sky-100 text-sky-800 rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {hobby}
                        <button
                          type="button"
                          className="ml-2 text-sky-400 hover:text-sky-700 focus:outline-none"
                          onClick={() =>
                            setForm({
                              ...form,
                              hobbies: form.hobbies.filter((h) => h !== hobby),
                            })
                          }
                          aria-label={`Remove ${hobby}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4"
                      displayValue={() => hobbiesQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setHobbiesQuery(e.target.value);
                        setHobbiesOpen(true);
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (
                          e.key === 'Enter' &&
                          hobbiesQuery.trim() &&
                          !form.hobbies.includes(hobbiesQuery.trim())
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          const customValue = hobbiesQuery.trim();

                          // Add the custom value to the form
                          setForm({
                            ...form,
                            hobbies: [...form.hobbies, customValue],
                          });

                          // Clear the input and close dropdown immediately
                          setHobbiesQuery('');
                          setHobbiesOpen(false);

                          // Force the input to clear by updating the display value
                          e.currentTarget.value = '';
                        }
                      }}
                      placeholder="Enter hobbies and interests"
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
                      {hobbiesQuery.trim() &&
                        !form.hobbies.includes(hobbiesQuery.trim()) && (
                          <Combobox.Option
                            value={`ADD_CUSTOM:${hobbiesQuery.trim()}`}
                            className={({ active }: { active: boolean }) =>
                              `cursor-pointer select-none relative py-3 px-4 ${
                                active
                                  ? 'bg-green-100 text-green-900'
                                  : 'text-green-700'
                              }`
                            }
                          >
                            <span className="block truncate font-medium">
                              + Add "{hobbiesQuery.trim()}"
                            </span>
                          </Combobox.Option>
                        )}

                      {/* Show filtered predefined options */}
                      {COMMON_HOBBIES.filter(
                        (hobby) =>
                          hobby
                            .toLowerCase()
                            .includes(hobbiesQuery.toLowerCase()) &&
                          !form.hobbies.includes(hobby)
                      ).map((hobby) => (
                        <Combobox.Option
                          key={hobby}
                          value={hobby}
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
                                {hobby}
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
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            </div>

            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                What's your favorite state in the U.S.?
              </label>
              <Combobox
                value={form.favoriteState}
                onChange={(value: string) =>
                  setForm({ ...form, favoriteState: value })
                }
              >
                <div className="relative">
                  <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-300 sm:text-sm">
                    <Combobox.Input
                      className="w-full border-none py-3 pl-4 pr-10 text-base leading-5 text-gray-900 focus:ring-0 focus:outline-none"
                      displayValue={(state: string) => state}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setStateQuery(event.target.value)
                      }
                      placeholder="Enter your favorite state"
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
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
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                      {US_STATES.filter((state) =>
                        state.toLowerCase().includes(stateQuery.toLowerCase())
                      ).map((state) => (
                        <Combobox.Option
                          key={state}
                          className={({ active }: { active: boolean }) =>
                            `relative cursor-default select-none py-2 pl-10 pr-4 ${
                              active ? 'bg-sky-400 text-white' : 'text-gray-900'
                            }`
                          }
                          value={state}
                        >
                          {({
                            selected,
                            active,
                          }: {
                            selected: boolean;
                            active: boolean;
                          }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? 'font-medium' : 'font-normal'
                                }`}
                              >
                                {state}
                              </span>
                              {selected ? (
                                <span
                                  className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                    active ? 'text-white' : 'text-sky-400'
                                  }`}
                                >
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
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            </div>

            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                What kind of outings do you enjoy most? (Beach, party, museum,
                hike)
              </label>
              <Combobox
                value={form.outings}
                onChange={(vals: string[]) => {
                  // Handle custom values that start with "ADD_CUSTOM:"
                  const processedVals = vals.map((val) => {
                    if (val.startsWith('ADD_CUSTOM:')) {
                      return val.replace('ADD_CUSTOM:', '');
                    }
                    return val;
                  });

                  setForm({ ...form, outings: processedVals });
                  setOutingsQuery('');
                  setOutingsOpen(false);
                }}
                onClose={() => {
                  // Ensure dropdown closes when losing focus
                  setOutingsOpen(false);
                }}
                multiple
                as={React.Fragment}
                open={outingsOpen}
                onOpenChange={setOutingsOpen}
              >
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.outings.map((outing) => (
                      <span
                        key={outing}
                        className="inline-flex items-center bg-sky-100 text-sky-800 rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {outing}
                        <button
                          type="button"
                          className="ml-2 text-sky-400 hover:text-sky-700 focus:outline-none"
                          onClick={() =>
                            setForm({
                              ...form,
                              outings: form.outings.filter((o) => o !== outing),
                            })
                          }
                          aria-label={`Remove ${outing}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4"
                      displayValue={() => outingsQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setOutingsQuery(e.target.value);
                        setOutingsOpen(true);
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (
                          e.key === 'Enter' &&
                          outingsQuery.trim() &&
                          !form.outings.includes(outingsQuery.trim())
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                          const customValue = outingsQuery.trim();

                          // Add the custom value to the form
                          setForm({
                            ...form,
                            outings: [...form.outings, customValue],
                          });

                          // Clear the input and close dropdown immediately
                          setOutingsQuery('');
                          setOutingsOpen(false);

                          // Force the input to clear by updating the display value
                          e.currentTarget.value = '';
                        }
                      }}
                      placeholder="Enter your preferred outings"
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
                      {outingsQuery.trim() &&
                        !form.outings.includes(outingsQuery.trim()) && (
                          <Combobox.Option
                            value={`ADD_CUSTOM:${outingsQuery.trim()}`}
                            className={({ active }: { active: boolean }) =>
                              `cursor-pointer select-none relative py-3 px-4 ${
                                active
                                  ? 'bg-green-100 text-green-900'
                                  : 'text-green-700'
                              }`
                            }
                          >
                            <span className="block truncate font-medium">
                              + Add "{outingsQuery.trim()}"
                            </span>
                          </Combobox.Option>
                        )}

                      {/* Show filtered predefined options */}
                      {COMMON_OUTINGS.filter(
                        (outing) =>
                          outing
                            .toLowerCase()
                            .includes(outingsQuery.toLowerCase()) &&
                          !form.outings.includes(outing)
                      ).map((outing) => (
                        <Combobox.Option
                          key={outing}
                          value={outing}
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
                                {outing}
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
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            </div>

            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                Do you have a car?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.hasCar === 'yes'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => handleToggle('hasCar', 'yes')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.hasCar === 'no'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => handleToggle('hasCar', 'no')}
                >
                  No
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-800 font-medium mb-2">
                Are you willing to drive or help others with rides?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.willingToDrive === 'yes'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => handleToggle('willingToDrive', 'yes')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.willingToDrive === 'no'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => handleToggle('willingToDrive', 'no')}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Continue button */}
          <Button
            variant="primary"
            className="w-full max-w-md mb-2 px-4"
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

export default LifestyleScreen;
