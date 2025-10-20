import React, { useState, Fragment, useEffect } from 'react';
import Button from '../../components/Button';
import AutoComplete from '../../components/AutoComplete';
import { useNavigate } from 'react-router-dom';
import { Listbox, Transition, Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import countries from 'world-countries';
import { US_CITIES } from '../../data/usCities';
import { apiPatch } from '../../api';
import { useUserStore } from '../../stores/userStore';

// Create a comprehensive list that includes both country names and nationalities
const countryNames = countries
  .map((c) => {
    const names = [c.name.common];
    // Add nationality/demonym if available
    if (c.demonyms?.eng?.m) {
      names.push(c.demonyms.eng.m);
    }
    if (c.demonyms?.eng?.f && c.demonyms.eng.f !== c.demonyms.eng.m) {
      names.push(c.demonyms.eng.f);
    }
    return names;
  })
  .flat()
  .filter((name, index, array) => array.indexOf(name) === index) // Remove duplicates
  .sort();
// Extract and deduplicate all languages from world-countries
const languageSet = new Set<string>();
countries.forEach((c) => {
  if (c.languages)
    Object.values(c.languages).forEach((l) => languageSet.add(l));
});
const languageList = Array.from(languageSet).sort();

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

const relationshipOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

const BackgroundScreen: React.FC = () => {
  const [form, setForm] = useState({
    nationality: '',
    languages: [] as string[],
    workHistory: '',
    relationshipStatus: '',
    stayInUS: 'yes' as 'yes' | 'no',
  });
  const [query, setQuery] = useState('');
  const [langQuery, setLangQuery] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Zustand store
  const { user, updateUser } = useUserStore();

  const filteredCountries =
    query === ''
      ? countryNames
      : countryNames.filter((name) =>
          name.toLowerCase().includes(query.toLowerCase())
        );

  const filteredLanguages =
    langQuery === ''
      ? languageList
      : languageList.filter(
          (l) =>
            l.toLowerCase().includes(langQuery.toLowerCase()) &&
            !form.languages.includes(l)
        );

  // Function to get nationality from country name
  const getNationalityFromCountryName = (countryName: string): string => {
    const country = countries.find((c) => c.name.common === countryName);
    if (country?.demonyms?.eng?.m) {
      return country.demonyms.eng.m;
    }
    return countryName; // Fallback to country name if no nationality found
  };

  // Pre-populate form with existing user data
  useEffect(() => {
    if (user) {
      setForm({
        nationality: user.nationality
          ? getNationalityFromCountryName(user.nationality)
          : '',
        languages: user.languages || [],
        workHistory: user.other_us_jobs?.join(', ') || '',
        relationshipStatus: user.relationship_status || '',
        stayInUS: 'yes', // Default value, could be stored in profile_answers
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user?.uid) {
      navigate('/sign-in');
    }
  }, [user, navigate]);

  // Function to map nationality back to country name
  const getCountryNameFromNationality = (nationality: string): string => {
    const country = countries.find((c) => {
      // Check if it matches the country name
      if (c.name.common === nationality) return true;
      // Check if it matches the nationality/demonym
      if (c.demonyms?.eng?.m === nationality) return true;
      if (c.demonyms?.eng?.f === nationality) return true;
      return false;
    });
    return country ? country.name.common : nationality;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError('');
    try {
      if (!user?.uid) throw new Error('User not authenticated');

      // Map nationality back to country name for storage
      const countryName = getCountryNameFromNationality(form.nationality);

      // Update user profile with background information
      const updateData = {
        nationality: countryName,
        languages: form.languages,
        other_us_jobs: form.workHistory ? [form.workHistory] : [],
        relationship_status: form.relationshipStatus,
        // Map stayInUS to a more appropriate field or store in profile_answers
        profile_answers: {
          background_identity: {
            nationality: form.nationality, // Keep original input for display
            languages: form.languages,
            workHistory: form.workHistory,
            relationshipStatus: form.relationshipStatus,
            stayInUS: form.stayInUS,
          },
        },
      };

      await apiPatch('/api/user/profile', updateData);

      // Update local store with new data
      updateUser(updateData);

      setLoading(false);
      navigate('/lifestyle');
    } catch (err: any) {
      setApiError(err.message || 'Failed to save background info');
      setLoading(false);
    }
  };

  const handleStayInUSChange = (value: 'yes' | 'no') => {
    setForm({ ...form, stayInUS: value });
  };

  return (
    <div className=" bg-gray-50 flex flex-col items-center pb-4">
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
          <div className="w-full bg-yellow-100 rounded-b-3xl flex flex-col items-center py-6 mb-6 relative">
            <h1 className="text-xl font-bold text-gray-900 mb-2 text-center px-4">
              Let's learn about you so we can get you connected
            </h1>
            {/* Handshake icon */}
            <div className="text-4xl mb-2">🤝</div>
            {/* Progress dots */}
            <div className="flex gap-1 mb-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full inline-block" />
              <span className="w-2 h-2 bg-gray-800 rounded-full inline-block" />{' '}
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
                What is your nationality?
              </label>
              <Combobox
                value={form.nationality}
                onChange={(val: string) =>
                  setForm({ ...form, nationality: val })
                }
              >
                <div className="relative">
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4"
                      displayValue={(val: string) => val}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setQuery(e.target.value)
                      }
                      placeholder="Enter your nationality (e.g., Italian, American, etc.)"
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
                      {filteredCountries.length === 0 && query !== '' ? (
                        <div className="cursor-default select-none py-3 px-4 text-gray-700">
                          No results found.
                        </div>
                      ) : (
                        filteredCountries.map((name) => (
                          <Combobox.Option
                            key={name}
                            value={name}
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
                                  {name}
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
                        ))
                      )}
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            </div>

            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                What languages do you speak?
              </label>
              <Combobox
                value={form.languages}
                onChange={(vals: string[]) => {
                  setForm({ ...form, languages: vals });
                  setLangQuery('');
                  // Also clear the Combobox input value
                  const input = document.querySelector<HTMLInputElement>(
                    'input[placeholder="Enter languages you speak"]'
                  );
                  if (input) input.value = '';
                  setLangOpen(false);
                }}
                multiple
                as={React.Fragment}
                open={langOpen}
                onOpenChange={setLangOpen}
              >
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.languages.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center bg-sky-100 text-sky-800 rounded-full px-3 py-1 text-sm font-medium"
                      >
                        {lang}
                        <button
                          type="button"
                          className="ml-2 text-sky-400 hover:text-sky-700 focus:outline-none"
                          onClick={() =>
                            setForm({
                              ...form,
                              languages: form.languages.filter(
                                (l) => l !== lang
                              ),
                            })
                          }
                          aria-label={`Remove ${lang}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-gray-200 shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4"
                      displayValue={() => ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setLangQuery(e.target.value);
                        setLangOpen(true);
                      }}
                      placeholder="Enter languages you speak"
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
                      {filteredLanguages.length === 0 && langQuery !== '' ? (
                        <div className="cursor-default select-none py-3 px-4 text-gray-700">
                          No results found.
                        </div>
                      ) : (
                        filteredLanguages.map((l) => (
                          <Combobox.Option
                            key={l}
                            value={l}
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
                                  {l}
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
                        ))
                      )}
                    </Combobox.Options>
                  </Transition>
                </div>
              </Combobox>
            </div>

            <AutoComplete
              label="Where else have you worked in the USA?"
              value={form.workHistory}
              onChange={(value: string) =>
                setForm({ ...form, workHistory: value })
              }
              options={US_CITIES.map((city) => city.fullName)}
              placeholder="Enter city and state where you worked"
            />

            <div className="mb-4">
              <label className="block text-gray-800 font-medium mb-2">
                What is your relationship status?
              </label>
              <Listbox
                value={form.relationshipStatus}
                onChange={(val: string) =>
                  setForm({ ...form, relationshipStatus: val })
                }
              >
                <div className="relative">
                  <div className="relative">
                    <Listbox.Button className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-gray-200 shadow-sm text-base text-left focus:outline-none focus:ring-2 focus:ring-sky-300 mb-4 flex items-center">
                      <span>
                        {relationshipOptions.find(
                          (o) => o.value === form.relationshipStatus
                        )?.label || 'Select status'}
                      </span>
                    </Listbox.Button>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <ChevronUpDownIcon
                        className="h-5 w-5 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                      {relationshipOptions.map((option) => (
                        <Listbox.Option
                          key={option.value}
                          value={option.value}
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
                                {option.label}
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
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>

            <div className="mb-6">
              <label className="block text-gray-800 font-medium mb-2">
                Do you plan to stay in the U.S. long-term or return to your
                country?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.stayInUS === 'yes'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => handleStayInUSChange('yes')}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={`px-6 py-3 rounded-full font-semibold border-2 ${
                    form.stayInUS === 'no'
                      ? 'border-sky-400 text-white bg-sky-400'
                      : 'border-gray-300 text-gray-800 bg-white'
                  } focus:outline-none`}
                  onClick={() => handleStayInUSChange('no')}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          {/* Continue button */}
          <Button
            variant="primary"
            className="w-full max-w-md mb-2 mx-4"
            onClick={handleSubmit}
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

export default BackgroundScreen;
