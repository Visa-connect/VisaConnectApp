import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
      render: (element: string | HTMLElement, options: any) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
    };
  }
}

interface UseRecaptchaOptions {
  siteKey?: string;
  action?: string;
}

interface UseRecaptchaReturn {
  executeRecaptcha: () => Promise<string>;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

export const useRecaptcha = ({
  siteKey = '6LelP-MrAAAAAOpk2tRqiK2wz2UAWI_yULbibn6V', // Default test key
  action = 'submit',
}: UseRecaptchaOptions): UseRecaptchaReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load reCAPTCHA script if not already loaded
    const loadRecaptchaScript = () => {
      if (window.grecaptcha) {
        setIsReady(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.grecaptcha.ready(() => {
          setIsReady(true);
          console.log('reCAPTCHA script loaded and ready');
        });
      };
      script.onerror = () => {
        setError('Failed to load reCAPTCHA script');
      };
      document.head.appendChild(script);
    };

    loadRecaptchaScript();
  }, [siteKey]);

  const executeRecaptcha = useCallback(async (): Promise<string> => {
    if (!window.grecaptcha || !isReady) {
      throw new Error('reCAPTCHA not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Execute reCAPTCHA v3 (invisible)
      const token = await window.grecaptcha.execute(siteKey, { action });
      return token;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'reCAPTCHA execution failed';
      setError(errorMessage);
      console.error('reCAPTCHA execution failed:', err);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [siteKey, action, isReady]);

  return {
    executeRecaptcha,
    isLoading,
    error,
    isReady,
  };
};
