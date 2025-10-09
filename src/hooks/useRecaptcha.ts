import { useState, useEffect, useCallback, useRef } from 'react';

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
  siteKey = '6Lc0X-QrAAAAALeq7oHiP6IK6C642fKGCeERAs8d',
  size = 'invisible',
}: UseRecaptchaV2Options): UseRecaptchaV2Return => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [widgetId, setWidgetId] = useState<number | null>(null);

  // ✅ Use ref to track if widget is already rendered
  const widgetRendered = useRef(false);
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Load reCAPTCHA v2 script
    const loadRecaptchaScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector(
        'script[src*="recaptcha/api.js"]'
      );

      if (existingScript && window.grecaptcha) {
        window.grecaptcha.ready(() => {
          setIsReady(true);
          console.log('✅ reCAPTCHA v2 already loaded');
        });
        return;
      }

      if (existingScript) {
        // Script exists but grecaptcha not ready yet
        existingScript.addEventListener('load', () => {
          if (window.grecaptcha) {
            window.grecaptcha.ready(() => {
              setIsReady(true);
              console.log('✅ reCAPTCHA v2 script loaded');
            });
          }
        });
        return;
      }

      // Create new script
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.grecaptcha.ready(() => {
          setIsReady(true);
          console.log('✅ reCAPTCHA v2 script loaded');
        });
      };
      script.onerror = () => {
        setError('Failed to load reCAPTCHA script');
        console.error('❌ Failed to load reCAPTCHA script');
      };
      document.head.appendChild(script);
    };

    loadRecaptchaScript();

    // ✅ Cleanup on unmount
    return () => {
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
    };
  }, []);

  // ✅ Render widget once when ready
  useEffect(() => {
    if (isReady && !widgetRendered.current && window.grecaptcha) {
      try {
        // Create container
        let container = document.getElementById('recaptcha-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'recaptcha-container';
          document.body.appendChild(container);
          containerRef.current = container;
        }

        // Render widget once
        const id = window.grecaptcha.render(container, {
          sitekey: siteKey,
          size: size,
          callback: () => {
            // Callback handled in executeRecaptcha
          },
          'error-callback': () => {
            setError('reCAPTCHA verification failed');
            console.error('❌ reCAPTCHA error');
          },
        });

        setWidgetId(id);
        widgetRendered.current = true;
        console.log('✅ reCAPTCHA widget rendered with ID:', id);
      } catch (err) {
        console.error('❌ Failed to render reCAPTCHA:', err);
        setError('Failed to render reCAPTCHA');
      }
    }
  }, [isReady, siteKey, size]);

  const executeRecaptcha = useCallback(async (): Promise<string> => {
    if (!window.grecaptcha || !isReady || widgetId === null) {
      throw new Error('reCAPTCHA not ready');
    }

    setIsLoading(true);
    setError(null);
    console.log('🔄 Starting reCAPTCHA execution...');

    try {
      return new Promise((resolve, reject) => {
        // Set up a global callback for this execution
        const callbackName = `recaptchaCallback_${Date.now()}`;
        (window as any)[callbackName] = (token: string) => {
          setIsLoading(false);
          console.log('✅ reCAPTCHA token received');
          delete (window as any)[callbackName]; // Clean up
          resolve(token);
        };

        try {
          // For invisible reCAPTCHA, execute
          if (size === 'invisible') {
            console.log('🔄 Executing invisible reCAPTCHA...');
            window.grecaptcha.execute(widgetId);
          }

          // Check for response periodically (works for both invisible and visible)
          console.log('🔄 Starting response check...');
          const checkResponse = setInterval(() => {
            const response = window.grecaptcha.getResponse(widgetId);
            if (response) {
              clearInterval(checkResponse);
              setIsLoading(false);
              console.log('✅ reCAPTCHA token received');
              delete (window as any)[callbackName]; // Clean up
              resolve(response);
            }
          }, 100);

          // Timeout after 10 seconds (reduced for faster feedback)
          setTimeout(() => {
            clearInterval(checkResponse);
            setIsLoading(false);
            delete (window as any)[callbackName]; // Clean up
            console.error('❌ reCAPTCHA timeout - no response received');
            reject(
              new Error(
                'reCAPTCHA timeout - please check your site key configuration'
              )
            );
          }, 10000);
        } catch (execError) {
          setIsLoading(false);
          delete (window as any)[callbackName]; // Clean up
          reject(new Error('Failed to execute reCAPTCHA'));
        }
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'reCAPTCHA execution failed';
      setError(errorMessage);
      setIsLoading(false);
      console.error('❌ reCAPTCHA execution failed:', err);
      throw new Error(errorMessage);
    }
  }, [widgetId, size, isReady]);

  const resetRecaptcha = useCallback(() => {
    if (widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId);
      console.log('🔄 reCAPTCHA reset');
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
