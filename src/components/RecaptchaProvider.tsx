import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import { useRecaptcha } from '../hooks/useRecaptcha'; // Updated import
import { configService, PublicConfig } from '../api/configService';

interface RecaptchaContextType {
  executeRecaptcha: () => Promise<string>;
  resetRecaptcha: () => void; // Added reset function
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
}

const RecaptchaContext = createContext<RecaptchaContextType | null>(null);

interface RecaptchaProviderProps {
  children: ReactNode;
  fallbackSiteKey?: string;
  size?: 'invisible' | 'normal'; // Added size option
}

export const RecaptchaProvider: React.FC<RecaptchaProviderProps> = ({
  children,
  fallbackSiteKey = '6LelP-MrAAAAAOpk2tRqiK2wz2UAWI_yULbibn6V', // ⚠️ Update this to your v2 site key
  size = 'invisible',
}) => {
  const [config, setConfig] = useState<PublicConfig | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const publicConfig = await configService.getPublicConfig();
        setConfig(publicConfig);
      } catch (error) {
        console.error('Failed to fetch config, using fallback:', error);
        setConfig({ recaptcha: { siteKey: fallbackSiteKey } });
      }
    };

    fetchConfig();
  }, [fallbackSiteKey]);

  const siteKey = config?.recaptcha?.siteKey || fallbackSiteKey;
  const recaptcha = useRecaptcha({ siteKey, size }); // Updated to v2
  console.log('Using site key:', siteKey);

  return (
    <RecaptchaContext.Provider
      value={{
        executeRecaptcha: recaptcha.executeRecaptcha,
        resetRecaptcha: recaptcha.resetRecaptcha,
        isLoading: recaptcha.isLoading,
        error: recaptcha.error,
        isReady: recaptcha.isReady,
      }}
    >
      {children}
    </RecaptchaContext.Provider>
  );
};

export const useRecaptchaContext = (): RecaptchaContextType => {
  const context = useContext(RecaptchaContext);
  if (!context) {
    throw new Error(
      'useRecaptchaContext must be used within a RecaptchaProvider'
    );
  }
  return context;
};
