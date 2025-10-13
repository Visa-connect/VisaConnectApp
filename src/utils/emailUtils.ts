/**
 * Utility functions for email handling
 */

export interface EmailConfig {
  email: string;
  subject: string;
  body: string;
}

/**
 * Opens the native email client with pre-filled details
 * @param config - Email configuration (email, subject, body)
 * @returns Promise that resolves when email client is opened
 */
export const openEmailClient = (config: EmailConfig): Promise<void> => {
  return new Promise((resolve, reject) => {
    const { email, subject, body } = config;
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    const mailtoUrl = `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;

    // Create and click a temporary link immediately (within user gesture)
    try {
      const tempLink = document.createElement('a');
      tempLink.href = mailtoUrl;
      tempLink.style.display = 'none';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      resolve();
    } catch (error) {
      console.error('Failed to open email client:', error);
      reject(error);
    }
  });
};

/**
 * Opens the native email client for VisaConnect support
 * This is a convenience function with pre-configured VisaConnect details
 */
export const openVisaConnectEmail = (): void => {
  const config: EmailConfig = {
    email: 'contact@visaconnectus.com',
    subject: 'VisaConnect Support',
    body: 'Hi VisaConnect team,\n\n',
  };

  openEmailClient(config).catch((error) => {
    // Fallback: show instructions
    alert(
      'Unable to open email client automatically.\n\n' +
        'Please manually send an email to: ' +
        config.email +
        '\n' +
        'Subject: ' +
        config.subject
    );
  });
};
