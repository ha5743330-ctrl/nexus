import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

/**
 * Sends an email. In development without SMTP credentials configured,
 * it just logs the message to the console so the flow can be tested
 * end-to-end without a real mail provider (useful for the OTP/2FA mockup).
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.SMTP_USER) {
    console.log(`[email:mock] to=${to} subject="${subject}"\n${text}`);
    return { mocked: true };
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
};

export const sendOtpEmail = (to, otp) =>
  sendEmail({
    to,
    subject: 'Your Nexus verification code',
    text: `Your one-time verification code is ${otp}. It expires in 10 minutes.`,
  });

export const sendPasswordResetEmail = (to, resetUrl) =>
  sendEmail({
    to,
    subject: 'Reset your Nexus password',
    text: `Reset your password using this link: ${resetUrl}\nThis link expires in 30 minutes. If you didn't request this, ignore this email.`,
  });
