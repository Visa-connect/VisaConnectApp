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

export class EmailService {
  private sendGrid: any;

  constructor() {
    console.log('  - SENDGRID_API_KEY:', SENDGRID_API_KEY ? 'Set' : 'Not set');

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

      const msg = {
        to: ADMIN_EMAIL,
        from: FROM_EMAIL,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      await this.sendGrid.send(msg);
      console.log(`✅ Business submission notification sent to ${ADMIN_EMAIL}`);
      return true;
    } catch (error: any) {
      console.error(
        '❌ Failed to send business submission notification:',
        error
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
                <div class="field-value">${data.submittedAt.toLocaleString()}</div>
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
Submitted At: ${data.submittedAt.toLocaleString()}

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
    ? `View Your Business: ${process.env.APP_URL || 'https://visaconnect.com'}`
    : `Update Your Business: ${
        process.env.APP_URL || 'https://visaconnect.com'
      }/edit-profile`
}

This is an automated notification from VisaConnect.
    `;
  }
}

export const emailService = new EmailService();
