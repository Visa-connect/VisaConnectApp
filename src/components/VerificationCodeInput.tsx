/**
 * Verification Code Input Component
 * 6-digit code input with auto-focus and paste support
 */

import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  ClipboardEvent,
} from 'react';

interface VerificationCodeInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  disabled = false,
  autoFocus = true,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Update local digits when value prop changes
  useEffect(() => {
    const newDigits = value.split('').slice(0, length);
    while (newDigits.length < length) {
      newDigits.push('');
    }
    setDigits(newDigits);
  }, [value, length]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, newValue: string) => {
    // Only allow digits
    if (newValue && !/^\d$/.test(newValue)) {
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = newValue;
    setDigits(newDigits);

    const code = newDigits.join('');
    onChange(code);

    // Auto-focus next input
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete if all digits are filled
    if (code.length === length && onComplete) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];

      if (digits[index]) {
        // Clear current digit
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Move to previous digit and clear it
        newDigits[index - 1] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain');
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length);

    if (pastedDigits) {
      const newDigits = pastedDigits.split('');
      while (newDigits.length < length) {
        newDigits.push('');
      }
      setDigits(newDigits);
      onChange(pastedDigits);

      // Focus last filled digit or first empty digit
      const nextIndex = Math.min(pastedDigits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();

      // Call onComplete if all digits are filled
      if (pastedDigits.length === length && onComplete) {
        onComplete(pastedDigits);
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 justify-center">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            className={`w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed ${
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-gray-300 focus:border-blue-500'
            } ${digit ? 'border-blue-400' : ''}`}
            aria-label={`Digit ${index + 1}`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
      )}

      {/* Helper Text */}
      <p className="mt-3 text-xs text-gray-500 text-center">
        Enter the {length}-digit code sent to your phone
      </p>
    </div>
  );
};

export default VerificationCodeInput;
