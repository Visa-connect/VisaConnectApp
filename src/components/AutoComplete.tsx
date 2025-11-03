import React, { useState } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

interface AutoCompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
  error?: string;
}

const AutoComplete: React.FC<AutoCompleteProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  required = false,
  label,
  error,
}) => {
  const [query, setQuery] = useState('');

  const filteredOptions =
    query === ''
      ? options || []
      : (options || []).filter(
          (option) =>
            option &&
            typeof option === 'string' &&
            option.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="block text-gray-800 font-medium mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Combobox value={value} onChange={onChange}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-300">
            <Combobox.Input
              className="w-full border-none py-3 pl-4 pr-10 text-base leading-5 text-gray-900 focus:ring-0"
              placeholder={placeholder}
              displayValue={(option: string) => option || ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value || '')
              }
              required={required}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>

          <Transition
            as={React.Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {filteredOptions.length === 0 && query !== '' ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={option}
                    className={({ active }: { active: boolean }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-sky-600 text-white' : 'text-gray-900'
                      }`
                    }
                    value={option}
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
                          {option}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-sky-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
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

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default AutoComplete;
