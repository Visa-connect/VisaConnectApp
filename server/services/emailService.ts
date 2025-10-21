import { config } from '../config/env';

// Email configuration
const SENDGRID_API_KEY = config.email.sendGridApiKey;
const ADMIN_EMAIL = config.email.adminEmail || 'admin@visaconnect.com';
const FROM_EMAIL = config.email.fromEmail || 'noreply@visaconnect.com';

export interface BusinessSubmissionEmailData {
  businessName: string;
  ownerName: string;
  yearFormed: number;
  businessAddress?: string;
  missionStatement: string;
  submittedAt: Date;
  userEmail: string;
  userName: string;
}

export interface JobApplicationEmailData {
  jobTitle: string;
  businessName: string;
  businessOwnerEmail: string;
  businessOwnerName: string;
  applicantName: string;
  applicantEmail: string;
  qualifications: string;
  location: string;
  visaType?: string;
  startDate: string;
  resumeUrl?: string;
  resumeFilename?: string;
  appliedAt: Date;
  jobId: number;
}

export interface NewReportEmailData {
  reportId: string;
  reporterId: string;
  targetType: 'job' | 'meetup';
  targetId: string;
  reason: string;
  reportedAt: Date;
  adminDashboardUrl?: string;
}

export class EmailService {
  private sendGrid: any;

  /**
   * Format date for display in emails with local timezone
   */
  private formatDateForEmail(date: Date): string {
    // Ensure the date is treated as UTC and convert to local timezone
    const localDate = new Date(
      date.getTime() + date.getTimezoneOffset() * 60000
    );
    return localDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  constructor() {
    if (!SENDGRID_API_KEY) {
      console.warn(
        '⚠️  SENDGRID_API_KEY not found. Email notifications will be disabled.'
      );
      return;
    }

    try {
      // Dynamic import for SendGrid
      this.sendGrid = require('@sendgrid/mail');
      this.sendGrid.setApiKey(SENDGRID_API_KEY);
      console.log('✅ Email service initialized with SendGrid');
    } catch (error) {
      console.error('❌ Failed to initialize SendGrid:', error);
      this.sendGrid = null;
    }
  }

  /**
   * Send business submission notification to admin
   */
  async sendBusinessSubmissionNotification(
    data: BusinessSubmissionEmailData
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `New Business Submission: ${data.businessName}`;

      const htmlContent = this.generateBusinessSubmissionEmailHTML(data);
      const textContent = this.generateBusinessSubmissionEmailText(data);

      // Support multiple recipients via comma-separated list in ADMIN_EMAIL
      const adminRecipients = String(ADMIN_EMAIL)
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const msg = {
        to: adminRecipients,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };
      await this.sendGrid.send(msg);
      console.log(
        `✅ Business submission notification sent to ${adminRecipients.join(
          ', '
        )}`
      );
      return true;
    } catch (error: any) {
      console.error(
        '❌ Failed to send business submission notification:',
        error.response
      );

      return false;
    }
  }

  /**
   * Send business status update to user
   */
  async sendBusinessStatusUpdate(
    userEmail: string,
    businessName: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `Business ${status}: ${businessName}`;

      const htmlContent = this.generateBusinessStatusEmailHTML(
        businessName,
        status,
        adminNotes
      );
      const textContent = this.generateBusinessStatusEmailText(
        businessName,
        status,
        adminNotes
      );

      const msg = {
        to: userEmail,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(`✅ Business status update sent to ${userEmail}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send business status update:', error);
      return false;
    }
  }

  /**
   * Send job application notification to business owner
   */
  async sendJobApplicationNotificationToBusiness(
    data: JobApplicationEmailData
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `New Job Application: ${data.jobTitle} - ${data.businessName}`;

      const htmlContent = this.generateJobApplicationBusinessEmailHTML(data);
      const textContent = this.generateJobApplicationBusinessEmailText(data);

      const msg = {
        to: data.businessOwnerEmail,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(
        `✅ Job application notification sent to business owner: ${data.businessOwnerEmail}`
      );
      return true;
    } catch (error) {
      console.error(
        '❌ Failed to send job application notification to business:',
        error
      );
      return false;
    }
  }

  /**
   * Send job application confirmation to applicant
   */
  async sendJobApplicationConfirmationToApplicant(
    data: JobApplicationEmailData
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `Application Confirmation: ${data.jobTitle} at ${data.businessName}`;

      const htmlContent =
        this.generateJobApplicationConfirmationEmailHTML(data);
      const textContent =
        this.generateJobApplicationConfirmationEmailText(data);

      const msg = {
        to: data.applicantEmail,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(
        `✅ Job application confirmation sent to applicant: ${data.applicantEmail}`
      );
      return true;
    } catch (error) {
      console.error(
        '❌ Failed to send job application confirmation to applicant:',
        error
      );
      return false;
    }
  }

  /**
   * Generate HTML content for business submission email
   */
  private generateBusinessSubmissionEmailHTML(
    data: BusinessSubmissionEmailData
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Business Submission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .business-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #374151; }
          .field-value { color: #6B7280; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Business Submission</h1>
            <p>A new business has been submitted for verification</p>
          </div>
          <div class="content">
            <div class="business-info">
              <h2>Business Details</h2>
              <div class="field">
                <div class="field-label">Business Name:</div>
                <div class="field-value">${data.businessName}</div>
              </div>
              <div class="field">
                <div class="field-label">Owner Name:</div>
                <div class="field-value">${data.ownerName}</div>
              </div>
              <div class="field">
                <div class="field-label">Year Formed:</div>
                <div class="field-value">${data.yearFormed}</div>
              </div>
              ${
                data.businessAddress
                  ? `
              <div class="field">
                <div class="field-label">Business Address:</div>
                <div class="field-value">${data.businessAddress}</div>
              </div>
              `
                  : ''
              }
              <div class="field">
                <div class="field-label">Mission Statement:</div>
                <div class="field-value">${data.missionStatement}</div>
              </div>
              <div class="field">
                <div class="field-label">Submitted By:</div>
                <div class="field-value">${data.userName} (${
      data.userEmail
    })</div>
              </div>
              <div class="field">
                <div class="field-label">Submitted At:</div>
                <div class="field-value">${this.formatDateForEmail(
                  data.submittedAt
                )}</div>
              </div>
            </div>
            <p>Please review this business submission and take appropriate action within 24-48 hours.</p>
            <a href="${
              config.email.adminDashboardUrl || 'https://visaconnect.com/admin'
            }" class="button">Review in Admin Dashboard</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from VisaConnect</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for business submission email
   */
  private generateBusinessSubmissionEmailText(
    data: BusinessSubmissionEmailData
  ): string {
    return `
New Business Submission

A new business has been submitted for verification:

Business Name: ${data.businessName}
Owner Name: ${data.ownerName}
Year Formed: ${data.yearFormed}
${data.businessAddress ? `Business Address: ${data.businessAddress}` : ''}
Mission Statement: ${data.missionStatement}
Submitted By: ${data.userName} (${data.userEmail})
Submitted At: ${this.formatDateForEmail(data.submittedAt)}

Please review this business submission and take appropriate action within 24-48 hours.

Admin Dashboard: ${
      config.email.adminDashboardUrl || 'https://visaconnect.com/admin'
    }

This is an automated notification from VisaConnect.
    `;
  }

  /**
   * Generate HTML content for business status email
   */
  private generateBusinessStatusEmailHTML(
    businessName: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): string {
    const isApproved = status === 'approved';
    const statusColor = isApproved ? '#10B981' : '#EF4444';
    const statusText = isApproved ? 'Approved' : 'Rejected';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Business ${statusText}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-message { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Business ${statusText}</h1>
            <p>Your business submission has been ${statusText.toLowerCase()}</p>
          </div>
          <div class="content">
            <div class="status-message">
              <h2>${businessName}</h2>
              <p style="font-size: 18px; color: ${statusColor}; font-weight: bold;">
                Status: ${statusText}
              </p>
              ${
                adminNotes
                  ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
                <strong>Admin Notes:</strong><br>
                ${adminNotes}
              </div>
              `
                  : ''
              }
            </div>
            ${
              isApproved
                ? `
            <p>Congratulations! Your business has been approved and is now live on VisaConnect. Users can now discover and connect with your business.</p>
            <a href="${
              config.email.appUrl || 'https://visaconnect.com'
            }" class="button">View Your Business</a>
            `
                : `
            <p>Unfortunately, your business submission was not approved at this time. Please review the admin notes above and feel free to resubmit with any necessary changes.</p>
            <a href="${
              config.email.appUrl || 'https://visaconnect.com'
            }/edit-profile" class="button">Update Your Business</a>
            `
            }
          </div>
          <div class="footer">
            <p>This is an automated notification from VisaConnect</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for business status email
   */
  private generateBusinessStatusEmailText(
    businessName: string,
    status: 'approved' | 'rejected',
    adminNotes?: string
  ): string {
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';

    return `
Business ${statusText}

Your business submission has been ${statusText.toLowerCase()}:

Business Name: ${businessName}
Status: ${statusText}
${adminNotes ? `Admin Notes: ${adminNotes}` : ''}

${
  status === 'approved'
    ? 'Congratulations! Your business has been approved and is now live on VisaConnect. Users can now discover and connect with your business.'
    : 'Unfortunately, your business submission was not approved at this time. Please review the admin notes above and feel free to resubmit with any necessary changes.'
}

${
  status === 'approved'
    ? `View Your Business: ${config.email.appUrl || 'https://visaconnect.com'}`
    : `Update Your Business: ${
        config.email.appUrl || 'https://visaconnect.com'
      }/edit-profile`
}

This is an automated notification from VisaConnect.
    `;
  }

  /**
   * Generate HTML content for job application business notification email
   */
  private generateJobApplicationBusinessEmailHTML(
    data: JobApplicationEmailData
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Job Application</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .application-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #374151; }
          .field-value { color: #6B7280; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .resume-link { color: #3B82F6; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Job Application</h1>
            <p>Someone has applied for your job posting</p>
          </div>
          <div class="content">
            <div class="application-info">
              <h2>Job Details</h2>
              <div class="field">
                <div class="field-label">Job Title:</div>
                <div class="field-value">${data.jobTitle}</div>
              </div>
              <div class="field">
                <div class="field-label">Business:</div>
                <div class="field-value">${data.businessName}</div>
              </div>
              
              <h3 style="margin-top: 30px;">Applicant Information</h3>
              <div class="field">
                <div class="field-label">Name:</div>
                <div class="field-value">${data.applicantName}</div>
              </div>
              <div class="field">
                <div class="field-label">Email:</div>
                <div class="field-value">${data.applicantEmail}</div>
              </div>
              <div class="field">
                <div class="field-label">Location:</div>
                <div class="field-value">${data.location}</div>
              </div>
              <div class="field">
                <div class="field-label">Visa Status:</div>
                <div class="field-value">${
                  data.visaType || 'Not specified'
                }</div>
              </div>
              <div class="field">
                <div class="field-label">Available Start Date:</div>
                <div class="field-value">${data.startDate}</div>
              </div>
              <div class="field">
                <div class="field-label">Qualifications:</div>
                <div class="field-value">${data.qualifications}</div>
              </div>
              ${
                data.resumeUrl
                  ? `
              <div class="field">
                <div class="field-label">Resume:</div>
                <div class="field-value">
                  <a href="${
                    data.resumeUrl
                  }" class="resume-link" target="_blank">
                    ${data.resumeFilename || 'Download Resume'}
                  </a>
                </div>
              </div>
              `
                  : ''
              }
              <div class="field">
                <div class="field-label">Applied At:</div>
                <div class="field-value">${this.formatDateForEmail(
                  data.appliedAt
                )}</div>
              </div>
            </div>
            <p>Please review this application and contact the applicant if you're interested in moving forward.</p>
            <a href="${
              config.email.appUrl || 'https://visaconnectus.com'
            }/job/${data.jobId}" class="button">View Job Posting</a>
          </div>
          <div class="footer">
            <p>This is an automated notification from VisaConnect</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for job application business notification email
   */
  private generateJobApplicationBusinessEmailText(
    data: JobApplicationEmailData
  ): string {
    return `
New Job Application

Someone has applied for your job posting:

Job Title: ${data.jobTitle}
Business: ${data.businessName}

Applicant Information:
Name: ${data.applicantName}
Email: ${data.applicantEmail}
Location: ${data.location}
Visa Status: ${data.visaType || 'Not specified'}
Available Start Date: ${data.startDate}
Qualifications: ${data.qualifications}
${data.resumeUrl ? `Resume: ${data.resumeUrl}` : ''}
Applied At: ${this.formatDateForEmail(data.appliedAt)}

Please review this application and contact the applicant if you're interested in moving forward.

View Job Posting: ${config.email.appUrl || 'https://visaconnect.com'}/job/${
      data.jobId
    }

This is an automated notification from VisaConnect.
    `;
  }

  /**
   * Generate HTML content for job application confirmation email
   */
  private generateJobApplicationConfirmationEmailHTML(
    data: JobApplicationEmailData
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .application-summary { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .field { margin-bottom: 15px; }
          .field-label { font-weight: bold; color: #374151; }
          .field-value { color: #6B7280; margin-top: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Submitted Successfully!</h1>
            <p>Thank you for applying to this position</p>
          </div>
          <div class="content">
            <div class="application-summary">
              <h2>Application Summary</h2>
              <div class="field">
                <div class="field-label">Job Title:</div>
                <div class="field-value">${data.jobTitle}</div>
              </div>
              <div class="field">
                <div class="field-label">Company:</div>
                <div class="field-value">${data.businessName}</div>
              </div>
              <div class="field">
                <div class="field-label">Applied At:</div>
                <div class="field-value">${this.formatDateForEmail(
                  data.appliedAt
                )}</div>
              </div>
            </div>
            <p>Your application has been successfully submitted and sent to the employer. If they are interested, they will contact you directly via email.</p>
            <p>You can also view your application status and other job opportunities on VisaConnect.</p>
            <a href="${
              config.email.appUrl || 'https://visaconnectus.com'
            }/jobs-applied" class="button">View My Applications</a>
            <a href="${
              config.email.appUrl || 'https://visaconnectus.com'
            }/search-jobs" class="button">Browse More Jobs</a>
          </div>
          <div class="footer">
            <p>This is an automated confirmation from VisaConnect</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for job application confirmation email
   */
  private generateJobApplicationConfirmationEmailText(
    data: JobApplicationEmailData
  ): string {
    return `
Application Submitted Successfully!

Thank you for applying to this position.

Application Summary:
Job Title: ${data.jobTitle}
Company: ${data.businessName}
Applied At: ${this.formatDateForEmail(data.appliedAt)}

Your application has been successfully submitted and sent to the employer. If they are interested, they will contact you directly via email.

You can also view your application status and other job opportunities on VisaConnect.

View My Applications: ${
      config.email.appUrl || 'https://visaconnect.com'
    }/my-applications
Browse More Jobs: ${
      config.email.appUrl || 'https://visaconnect.com'
    }/search-jobs

This is an automated confirmation from VisaConnect.`;
  }

  /**
   * Send password reset email to user
   */
  async sendPasswordResetEmail(
    email: string,
    resetLink: string
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log(
        '📧 Email service not available, skipping password reset email'
      );
      return false;
    }

    try {
      const subject = 'Password Reset - VisaConnect';

      const htmlContent = this.generatePasswordResetEmailHTML(resetLink);
      const textContent = this.generatePasswordResetEmailText(resetLink);

      const msg = {
        to: email,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send password reset email:', error.response);
      return false;
    }
  }

  /**
   * Generate HTML content for password reset email
   */
  private generatePasswordResetEmailHTML(resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - VisaConnect</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .reset-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background-color: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>Reset your VisaConnect account password</p>
          </div>
          <div class="content">
            <div class="reset-info">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password for your VisaConnect account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6B7280; font-size: 14px;">${resetLink}</p>
          </div>
          <div class="footer">
            <p>This is an automated email from VisaConnect</p>
            <p>If you need help, contact us at ${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for password reset email
   */
  private generatePasswordResetEmailText(resetLink: string): string {
    return `
Password Reset Request - VisaConnect

We received a request to reset your password for your VisaConnect account.

To reset your password, click the following link:
${resetLink}

⚠️ Important Security Information:
- This link will expire in 1 hour for security reasons
- If you didn't request this password reset, please ignore this email
- Never share this link with anyone

If you need help, contact us at ${FROM_EMAIL}

This is an automated email from VisaConnect.
    `;
  }

  /**
   * Send email change verification email to new email address
   */
  async sendEmailChangeVerificationEmail(
    newEmail: string,
    verificationToken: string
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log(
        '📧 Email service not available, skipping email change verification email'
      );
      return false;
    }

    try {
      const subject = 'Verify Your New Email Address - VisaConnect';

      const htmlContent = this.generateEmailChangeVerificationEmailHTML(
        newEmail,
        verificationToken
      );
      const textContent = this.generateEmailChangeVerificationEmailText(
        newEmail,
        verificationToken
      );

      const msg = {
        to: newEmail,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(`✅ Email change verification email sent to ${newEmail}`);
      return true;
    } catch (error: any) {
      console.error(
        '❌ Failed to send email change verification email:',
        error.response
      );
      return false;
    }
  }

  /**
   * Send email change confirmation email to new email address
   */
  async sendEmailChangeConfirmationEmail(
    newEmail: string,
    oldEmail: string
  ): Promise<boolean> {
    if (!this.sendGrid) {
      console.log(
        '📧 Email service not available, skipping email change confirmation email'
      );
      return false;
    }

    try {
      const subject = 'Email Address Successfully Changed - VisaConnect';

      const htmlContent = this.generateEmailChangeConfirmationEmailHTML(
        newEmail,
        oldEmail
      );
      const textContent = this.generateEmailChangeConfirmationEmailText(
        newEmail,
        oldEmail
      );

      const msg = {
        to: newEmail,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(`✅ Email change confirmation email sent to ${newEmail}`);
      return true;
    } catch (error: any) {
      console.error(
        '❌ Failed to send email change confirmation email:',
        error.response
      );
      return false;
    }
  }

  /**
   * Generate HTML content for email change verification email
   */
  private generateEmailChangeVerificationEmailHTML(
    newEmail: string,
    verificationToken: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your New Email Address</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .verification-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background-color: #FEF3C7; border: 1px solid #F59E0B; color: #92400E; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your New Email Address</h1>
            <p>Complete your email address change for VisaConnect</p>
          </div>
          <div class="content">
            <div class="verification-info">
              <h2>Email Address Change Request</h2>
              <p>You requested to change your VisaConnect account email address to:</p>
              <p style="font-size: 18px; font-weight: bold; color: #3B82F6;">${newEmail}</p>
              <p>Enter this verification code in the VisaConnect app to complete your email change:</p>
              <div style="background-color: #f3f4f6; border: 2px solid #3B82F6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <p style="font-size: 32px; font-weight: bold; color: #3B82F6; margin: 0; letter-spacing: 4px;">${verificationToken}</p>
              </div>
              <p style="color: #6B7280; font-size: 14px;">This code will expire in 24 hours.</p>
            </div>
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This verification code will expire in 24 hours</li>
                <li>If you didn't request this email change, please ignore this email</li>
                <li>Your current email address will remain active until verification is complete</li>
                <li>Never share this verification code with anyone</li>
              </ul>
            </div>
            <p>To complete the email change:</p>
            <ol style="margin: 10px 0; padding-left: 20px; color: #6B7280;">
              <li>Open the VisaConnect app</li>
              <li>Go to Settings → Change Email</li>
              <li>Enter the verification code: <strong>${verificationToken}</strong></li>
            </ol>
          </div>
          <div class="footer">
            <p>This is an automated email from VisaConnect</p>
            <p>If you need help, contact us at ${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for email change verification email
   */
  private generateEmailChangeVerificationEmailText(
    newEmail: string,
    verificationToken: string
  ): string {
    return `
Verify Your New Email Address - VisaConnect

Complete your email address change for VisaConnect

Email Address Change Request

You requested to change your VisaConnect account email address to:
${newEmail}

To verify this new email address, enter this verification code in the VisaConnect app:
${verificationToken}

⚠️ Important Security Information:
- This verification code will expire in 24 hours
- If you didn't request this email change, please ignore this email
- Your current email address will remain active until verification is complete
- Never share this verification code with anyone

To complete the email change:
1. Open the VisaConnect app
2. Go to Settings → Change Email
3. Enter the verification code: ${verificationToken}

If you need help, contact us at ${FROM_EMAIL}

This is an automated email from VisaConnect.
    `;
  }

  /**
   * Generate HTML content for email change confirmation email
   */
  private generateEmailChangeConfirmationEmailHTML(
    newEmail: string,
    oldEmail: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Address Successfully Changed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .confirmation-info { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; margin-top: 30px; color: #6B7280; font-size: 14px; }
          .button { display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .info { background-color: #EBF8FF; border: 1px solid #3B82F6; color: #1E40AF; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Email Address Changed Successfully!</h1>
            <p>Your VisaConnect account has been updated</p>
          </div>
          <div class="content">
            <div class="confirmation-info">
              <h2>Email Change Confirmed</h2>
              <p>Your VisaConnect account email address has been successfully changed:</p>
              <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-radius: 6px;">
                <p style="margin: 5px 0;"><strong>Previous Email:</strong> ${oldEmail}</p>
                <p style="margin: 5px 0;"><strong>New Email:</strong> ${newEmail}</p>
              </div>
              <p>You can now use your new email address to sign in to VisaConnect.</p>
              <a href="${
                config.email.appUrl || 'https://visaconnect.com'
              }" class="button">Sign In to VisaConnect</a>
            </div>
            <div class="info">
              <strong>ℹ️ What's Next:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Use your new email address (${newEmail}) to sign in</li>
                <li>All future notifications will be sent to this new address</li>
                <li>Your account settings and data remain unchanged</li>
                <li>If you need to change your email again, you can do so in Settings</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated confirmation from VisaConnect</p>
            <p>If you need help, contact us at ${FROM_EMAIL}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for email change confirmation email
   */
  private generateEmailChangeConfirmationEmailText(
    newEmail: string,
    oldEmail: string
  ): string {
    return `
✅ Email Address Changed Successfully!

Your VisaConnect account has been updated

Email Change Confirmed

Your VisaConnect account email address has been successfully changed:

Previous Email: ${oldEmail}
New Email: ${newEmail}

You can now use your new email address to sign in to VisaConnect.

Sign In to VisaConnect: ${config.email.appUrl || 'https://visaconnect.com'}

ℹ️ What's Next:
- Use your new email address (${newEmail}) to sign in
- All future notifications will be sent to this new address
- Your account settings and data remain unchanged
- If you need to change your email again, you can do so in Settings

If you need help, contact us at ${FROM_EMAIL}

This is an automated confirmation from VisaConnect.
    `;
  }

  /**
   * Send new report notification to admin
   */
  async sendNewReportNotification(data: NewReportEmailData): Promise<boolean> {
    if (!this.sendGrid) {
      console.log('📧 Email service not available, skipping notification');
      return false;
    }

    try {
      const subject = `New ${data.targetType} Report: ${data.reportId.slice(
        -8
      )}`;

      const htmlContent = this.generateNewReportEmailHTML(data);
      const textContent = this.generateNewReportEmailText(data);

      // Support multiple recipients via comma-separated list in ADMIN_EMAIL
      const adminRecipients = String(ADMIN_EMAIL)
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      const msg = {
        to: adminRecipients,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };
      await this.sendGrid.send(msg);
      console.log(
        `✅ New report notification sent to ${adminRecipients.join(', ')}`
      );
      return true;
    } catch (error: any) {
      console.error(
        '❌ Failed to send new report notification:',
        error.response || error.message
      );
      return false;
    }
  }

  /**
   * Generate HTML content for new report notification email
   */
  private generateNewReportEmailHTML(data: NewReportEmailData): string {
    const dashboardUrl =
      data.adminDashboardUrl ||
      config.email.adminDashboardUrl ||
      'https://admin.visaconnect.com';
    const reportUrl = `${dashboardUrl}/reports/${data.reportId}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Report - VisaConnect Admin</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🚨 New Report</h1>
          <p style="color: #e2e8f0; margin: 8px 0 0 0; font-size: 16px;">VisaConnect Admin Notification</p>
        </div>

        <!-- Content -->
        <div style="padding: 32px;">
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h2 style="color: #92400e; margin: 0 0 8px 0; font-size: 18px;">⚠️ Action Required</h2>
            <p style="color: #92400e; margin: 0; font-size: 14px;">A new ${
              data.targetType
            } has been reported and requires your review.</p>
          </div>

          <!-- Report Details -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Report Details</h3>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #374151; font-size: 14px;">Report ID:</strong>
              <span style="color: #6b7280; font-family: monospace; font-size: 14px; margin-left: 8px;">${
                data.reportId
              }</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #374151; font-size: 14px;">Target Type:</strong>
              <span style="color: #6b7280; font-size: 14px; margin-left: 8px; text-transform: capitalize;">${
                data.targetType
              }</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #374151; font-size: 14px;">Target ID:</strong>
              <span style="color: #6b7280; font-family: monospace; font-size: 14px; margin-left: 8px;">${
                data.targetId
              }</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #374151; font-size: 14px;">Reporter ID:</strong>
              <span style="color: #6b7280; font-family: monospace; font-size: 14px; margin-left: 8px;">${
                data.reporterId
              }</span>
            </div>
            
            <div style="margin-bottom: 12px;">
              <strong style="color: #374151; font-size: 14px;">Reported At:</strong>
              <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">${this.formatDateForEmail(
                data.reportedAt
              )}</span>
            </div>
          </div>

          <!-- Report Reason -->
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h3 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Report Reason</h3>
            <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px;">
              <p style="color: #374151; margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${
                data.reason
              }</p>
            </div>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              🔍 Review Report
            </a>
          </div>

          <!-- Admin Info -->
          <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 16px;">
            <h4 style="color: #0c4a6e; margin: 0 0 8px 0; font-size: 16px;">ℹ️ Admin Information</h4>
            <p style="color: #0369a1; margin: 0; font-size: 14px;">
              You can review this report in the admin dashboard. Please take appropriate action based on the report reason and content.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            This is an automated notification from VisaConnect Admin Dashboard.
          </p>
          <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
            If you need assistance, contact the development team.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate text content for new report notification email
   */
  private generateNewReportEmailText(data: NewReportEmailData): string {
    const dashboardUrl =
      data.adminDashboardUrl ||
      config.email.adminDashboardUrl ||
      'https://admin.visaconnect.com';
    const reportUrl = `${dashboardUrl}/reports/${data.reportId}`;

    return `
New Report - VisaConnect Admin

⚠️ ACTION REQUIRED: A new ${
      data.targetType
    } has been reported and requires your review.

Report Details:
- Report ID: ${data.reportId}
- Target Type: ${data.targetType}
- Target ID: ${data.targetId}
- Reporter ID: ${data.reporterId}
- Reported At: ${this.formatDateForEmail(data.reportedAt)}

Report Reason:
${data.reason}

🔍 Review Report: ${reportUrl}

Admin Information:
You can review this report in the admin dashboard. Please take appropriate action based on the report reason and content.

---
This is an automated notification from VisaConnect Admin Dashboard.
If you need assistance, contact the development team.
    `;
  }
}

export const emailService = new EmailService();
