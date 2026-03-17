const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    // Check if email is configured
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    if (smtpUser && smtpPass && smtpUser !== 'your-email@gmail.com' && smtpPass !== 'your-app-password') {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
      auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      this.enabled = true;
    } else {
      console.warn('Email service is not configured. Set SMTP_USER and SMTP_PASS in .env to enable email sending.');
      this.enabled = false;
      this.transporter = null;
    }
  }

  async sendVerificationEmail(email, token, username) {
    const verificationUrl = `${process.env.BASE_URL}/accounts/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mssn-baze.com',
      to: email,
      subject: 'Verify Your Email - Baze MSSN',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>Baze MSSN</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Welcome to Baze MSSN Platform!</h2>
            <p>Hello ${username},</p>
            <p>Thank you for registering with the Baze MSSN Repository Platform. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with us, please ignore this email.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This email was sent from Baze MSSN Repository Platform.<br>
              If you have any questions, please contact the administrators.
            </p>
          </div>
        </div>
      `
    };

    try {
      if (!this.enabled || !this.transporter) {
        console.warn('Email service is disabled. Skipping email send.');
        return false;
      }
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending error:', error.message || error);
      return false;
    }
  }

  async sendPasswordResetEmail(email, token, username) {
    const resetUrl = `${process.env.BASE_URL}/accounts/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mssn-baze.com',
      to: email,
      subject: 'Password Reset - Baze MSSN',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>Baze MSSN</h1>
          </div>
          <div style="padding: 20px;">
            <h2>Password Reset Request</h2>
            <p>Hello ${username},</p>
            <p>We received a request to reset your password for your Baze MSSN account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>This reset link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This email was sent from Baze MSSN Repository Platform.<br>
              If you have any questions, please contact the administrators.
            </p>
          </div>
        </div>
      `
    };

    try {
      if (!this.enabled || !this.transporter) {
        console.warn('Email service is disabled. Skipping email send.');
        return false;
      }
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Email sending error:', error.message || error);
      return false;
    }
  }

  async sendNotificationEmail(email, title, message, username, actionUrl = null) {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@mssn-baze.com',
      to: email,
      subject: `${title} - Baze MSSN`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>Baze MSSN</h1>
          </div>
          <div style="padding: 20px;">
            <h2>${title}</h2>
            <p>Hello ${username},</p>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;">${message}</p>
            </div>
            ${actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.BASE_URL}${actionUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a>
              </div>
            ` : ''}
            <p>This notification was sent from the Baze MSSN Repository Platform.</p>
            <hr style="margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              This email was sent from Baze MSSN Repository Platform.<br>
              If you have any questions, please contact the administrators.
            </p>
          </div>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error('Notification email sending error:', error);
      return false;
    }
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = new EmailService();
