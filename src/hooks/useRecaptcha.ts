import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (element: string | HTMLElement, options: any) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
      execute: (widgetId?: number) => void;
    };
  }
}

interface UseRecaptchaV2Options {
  siteKey?: string;
  size?: 'invisible' | 'normal';
}

interface UseRecaptchaV2Return {
  executeRecaptcha: () => Promise<string>;
  resetRecaptcha: () => void;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  widgetId: number | null;
}

export const useRecaptcha = ({
  siteKey = '6LelP-MrAAAAAOpk2tRqiK2wz2UAWI_yULbibn6V',
  size = 'invisible',
}: UseRecaptchaV2Options): UseRecaptchaV2Return => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  useEffect(() => {
    // Load reCAPTCHA v2 script
    const loadRecaptchaScript = () => {
      if (window.grecaptcha) {
        setIsReady(true);
        return;
      }

      const script = document.createElement('script');
      // Note: No render parameter for v2
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.grecaptcha.ready(() => {
          setIsReady(true);
          console.log('reCAPTCHA v2 script loaded and ready');
        });
      };
      script.onerror = () => {
        setError('Failed to load reCAPTCHA script');
      };
      document.head.appendChild(script);
    };

    loadRecaptchaScript();
  }, []);

  const executeRecaptcha = useCallback(async (): Promise<string> => {
    if (!window.grecaptcha || !isReady) {
      throw new Error('reCAPTCHA not ready');
    }

    setIsLoading(true);
    setError(null);

    try {
      return new Promise((resolve, reject) => {
        // Create a container if it doesn't exist
        let container = document.getElementById('recaptcha-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'recaptcha-container';
          document.body.appendChild(container);
        }

        // Render the reCAPTCHA widget
        const id = window.grecaptcha.render(container, {
          sitekey: siteKey,
          size: size,
          callback: (token: string) => {
            setIsLoading(false);
            resolve(token);
          },
          'error-callback': () => {
            setIsLoading(false);
            reject(new Error('reCAPTCHA verification failed'));
          },
        });

        setWidgetId(id);

        // For invisible reCAPTCHA, execute immediately
        if (size === 'invisible') {
          window.grecaptcha.execute(id);
        }
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'reCAPTCHA execution failed';
      setError(errorMessage);
      setIsLoading(false);
      console.error('reCAPTCHA execution failed:', err);
      throw new Error(errorMessage);
    }
  }, [siteKey, size, isReady]);

  const resetRecaptcha = useCallback(() => {
    if (widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId);
    }
  }, [widgetId]);

  return {
    executeRecaptcha,
    resetRecaptcha,
    isLoading,
    error,
    isReady,
    widgetId,
  };
};
