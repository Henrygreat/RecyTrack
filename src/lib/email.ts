import { Resend } from "resend";

// Initialize Resend client
// RESEND_API_KEY must be set in environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

// Email configuration
const EMAIL_FROM = process.env.EMAIL_FROM || "RecyTrack <noreply@recytrack.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "http://localhost:3000";

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send customer portal invitation email
 */
export async function sendInvitationEmail(params: {
  to: string;
  customerName: string;
  invitedByName: string;
  role: "CUSTOMER_ADMIN" | "CUSTOMER_USER";
  token: string;
  expiresAt: Date;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured. Set RESEND_API_KEY environment variable.",
    };
  }

  const { to, customerName, invitedByName, role, token, expiresAt } = params;
  const inviteUrl = `${APP_URL}/invite/accept?token=${token}`;
  const roleLabel = role === "CUSTOMER_ADMIN" ? "Administrator" : "User";
  const expiryDate = expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `You've been invited to ${customerName} on RecyTrack`,
      html: generateInvitationEmailHtml({
        customerName,
        invitedByName,
        roleLabel,
        inviteUrl,
        expiryDate,
      }),
      text: generateInvitationEmailText({
        customerName,
        invitedByName,
        roleLabel,
        inviteUrl,
        expiryDate,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send collection notification emails
 */
export async function sendCollectionEmail(params: {
  to: string;
  type: "booking_confirmed" | "booking_approved" | "collection_scheduled" | "collection_rescheduled" | "collection_completed";
  collectionRef: string;
  customerName: string;
  siteName?: string;
  collectionDate?: Date;
  additionalInfo?: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  const { to, type, collectionRef, customerName, siteName, collectionDate, additionalInfo } = params;

  const subjects: Record<typeof type, string> = {
    booking_confirmed: `Collection Booking Confirmed - ${collectionRef}`,
    booking_approved: `Collection Booking Approved - ${collectionRef}`,
    collection_scheduled: `Collection Scheduled - ${collectionRef}`,
    collection_rescheduled: `Collection Rescheduled - ${collectionRef}`,
    collection_completed: `Collection Completed - ${collectionRef}`,
  };

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: subjects[type],
      html: generateCollectionEmailHtml({
        type,
        collectionRef,
        customerName,
        siteName,
        collectionDate,
        additionalInfo,
      }),
      text: generateCollectionEmailText({
        type,
        collectionRef,
        customerName,
        siteName,
        collectionDate,
        additionalInfo,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send collection email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(params: {
  to: string;
  inviteeName?: string;
  invitedByName: string;
  organizationName: string;
  role: string;
  token: string;
  expiresAt: Date;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured. Set RESEND_API_KEY environment variable.",
    };
  }

  const { to, inviteeName, invitedByName, organizationName, role, token, expiresAt } = params;
  const inviteUrl = `${APP_URL}/invite/staff?token=${token}`;

  const roleLabels: Record<string, string> = {
    ADMIN: "Administrator",
    OPERATIONS: "Operations Manager",
    WAREHOUSE: "Warehouse Staff",
    DRIVER: "Driver",
  };
  const roleLabel = roleLabels[role] || role;

  const expiryDate = expiresAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: `You've been invited to join ${organizationName} on RecyTrack`,
      html: generateStaffInvitationEmailHtml({
        inviteeName,
        invitedByName,
        organizationName,
        roleLabel,
        inviteUrl,
        expiryDate,
      }),
      text: generateStaffInvitationEmailText({
        inviteeName,
        invitedByName,
        organizationName,
        roleLabel,
        inviteUrl,
        expiryDate,
      }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send staff invitation email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send email verification email for customer registration
 */
export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verificationToken: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured. Set RESEND_API_KEY environment variable.",
    };
  }

  const { to, name, verificationToken } = params;
  const verifyUrl = `${APP_URL}/verify-email?token=${verificationToken}`;

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: "Verify your RecyTrack account",
      html: generateVerificationEmailHtml({ name, verifyUrl }),
      text: generateVerificationEmailText({ name, verifyUrl }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send registration approved notification email
 */
export async function sendRegistrationApprovedEmail(params: {
  to: string;
  name: string;
  companyName: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured.",
    };
  }

  const { to, name, companyName } = params;
  const loginUrl = `${APP_URL}/login`;

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: "Your RecyTrack account has been approved",
      html: generateApprovalEmailHtml({ name, companyName, loginUrl }),
      text: generateApprovalEmailText({ name, companyName, loginUrl }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send approval email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send registration rejected notification email
 */
export async function sendRegistrationRejectedEmail(params: {
  to: string;
  name: string;
  reason?: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured.",
    };
  }

  const { to, name, reason } = params;

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: "Update on your RecyTrack registration",
      html: generateRejectionEmailHtml({ name, reason }),
      text: generateRejectionEmailText({ name, reason }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send rejection email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetToken: string;
}): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    return {
      success: false,
      error: "Email service not configured. Set RESEND_API_KEY environment variable.",
    };
  }

  const { to, name, resetToken } = params;
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject: "Reset your RecyTrack password",
      html: generatePasswordResetEmailHtml({ name, resetUrl }),
      text: generatePasswordResetEmailText({ name, resetUrl }),
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending email",
    };
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generatePasswordResetEmailHtml(params: {
  name: string;
  resetUrl: string;
}): string {
  const { name, resetUrl } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your RecyTrack password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                Reset your password
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Hello ${name},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                We received a request to reset your password for your RecyTrack account. Click the button below to create a new password.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0f766e;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none; border-radius: 8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #0f766e; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${resetUrl}
              </p>

              <!-- Security notices -->
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>This link will expire in 30 minutes.</strong> After that, you'll need to request a new password reset.
                </p>
              </div>

              <div style="padding: 16px; background-color: #f0fdfa; border-radius: 8px; border-left: 4px solid #0f766e;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f766e; font-weight: 600;">
                  Didn't request this?
                </p>
                <p style="margin: 0; font-size: 14px; color: #475569;">
                  If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                This email was sent by RecyTrack.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                For security reasons, we never ask for your password via email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generatePasswordResetEmailText(params: {
  name: string;
  resetUrl: string;
}): string {
  const { name, resetUrl } = params;

  return `
RecyTrack - Reset Your Password

Hello ${name},

We received a request to reset your password for your RecyTrack account.

Click here to reset your password:
${resetUrl}

This link will expire in 30 minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

---
This email was sent by RecyTrack.
For security reasons, we never ask for your password via email.
`.trim();
}

function generateInvitationEmailHtml(params: {
  customerName: string;
  invitedByName: string;
  roleLabel: string;
  inviteUrl: string;
  expiryDate: string;
}): string {
  const { customerName, invitedByName, roleLabel, inviteUrl, expiryDate } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RecyTrack Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                You've been invited to the Customer Portal
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                <strong>${invitedByName}</strong> has invited you to access the <strong>${customerName}</strong> portal on RecyTrack as a <strong>${roleLabel}</strong>.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Click the button below to create your account and access the portal. You'll be able to view collections, track assets, and manage your recycling operations.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0f766e;">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #0f766e; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${inviteUrl}
              </p>

              <!-- Expiry notice -->
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>This invitation expires on ${expiryDate}.</strong> Please accept it before then to ensure your access is set up correctly.
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                This email was sent by RecyTrack on behalf of ${customerName}.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateInvitationEmailText(params: {
  customerName: string;
  invitedByName: string;
  roleLabel: string;
  inviteUrl: string;
  expiryDate: string;
}): string {
  const { customerName, invitedByName, roleLabel, inviteUrl, expiryDate } = params;

  return `
RecyTrack Customer Portal Invitation

${invitedByName} has invited you to access the ${customerName} portal on RecyTrack as a ${roleLabel}.

Accept your invitation by visiting:
${inviteUrl}

You'll be able to view collections, track assets, and manage your recycling operations.

This invitation expires on ${expiryDate}. Please accept it before then.

---
This email was sent by RecyTrack on behalf of ${customerName}.
If you didn't expect this invitation, you can safely ignore this email.
`.trim();
}

function generateCollectionEmailHtml(params: {
  type: string;
  collectionRef: string;
  customerName: string;
  siteName?: string;
  collectionDate?: Date;
  additionalInfo?: string;
}): string {
  const { type, collectionRef, customerName, siteName, collectionDate, additionalInfo } = params;

  const titles: Record<string, string> = {
    booking_confirmed: "Collection Booking Confirmed",
    booking_approved: "Collection Booking Approved",
    collection_scheduled: "Collection Scheduled",
    collection_rescheduled: "Collection Rescheduled",
    collection_completed: "Collection Completed",
  };

  const messages: Record<string, string> = {
    booking_confirmed: "Your collection request has been received and is being processed.",
    booking_approved: "Your collection request has been approved and will be scheduled shortly.",
    collection_scheduled: `Your collection has been scheduled${collectionDate ? ` for ${collectionDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : ""}.`,
    collection_rescheduled: `Your collection has been rescheduled${collectionDate ? ` to ${collectionDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : ""}.`,
    collection_completed: "Your collection has been completed successfully.",
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RecyTrack - ${titles[type]}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                ${titles[type]}
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                ${messages[type]}
              </p>

              <!-- Collection Details -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Collection Reference</p>
                    <p style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #0f172a; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;">${collectionRef}</p>

                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Customer</p>
                    <p style="margin: 0${siteName ? " 0 16px 0" : ""}; font-size: 16px; color: #0f172a;">${customerName}</p>

                    ${siteName ? `
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Site</p>
                    <p style="margin: 0; font-size: 16px; color: #0f172a;">${siteName}</p>
                    ` : ""}
                  </td>
                </tr>
              </table>

              ${additionalInfo ? `
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                ${additionalInfo}
              </p>
              ` : ""}

              <p style="margin: 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Log in to your RecyTrack portal to view full details and track progress.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                This is an automated notification from RecyTrack.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateCollectionEmailText(params: {
  type: string;
  collectionRef: string;
  customerName: string;
  siteName?: string;
  collectionDate?: Date;
  additionalInfo?: string;
}): string {
  const { type, collectionRef, customerName, siteName, collectionDate, additionalInfo } = params;

  const titles: Record<string, string> = {
    booking_confirmed: "Collection Booking Confirmed",
    booking_approved: "Collection Booking Approved",
    collection_scheduled: "Collection Scheduled",
    collection_rescheduled: "Collection Rescheduled",
    collection_completed: "Collection Completed",
  };

  const messages: Record<string, string> = {
    booking_confirmed: "Your collection request has been received and is being processed.",
    booking_approved: "Your collection request has been approved and will be scheduled shortly.",
    collection_scheduled: `Your collection has been scheduled${collectionDate ? ` for ${collectionDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : ""}.`,
    collection_rescheduled: `Your collection has been rescheduled${collectionDate ? ` to ${collectionDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : ""}.`,
    collection_completed: "Your collection has been completed successfully.",
  };

  return `
RecyTrack - ${titles[type]}

${messages[type]}

Collection Reference: ${collectionRef}
Customer: ${customerName}
${siteName ? `Site: ${siteName}` : ""}

${additionalInfo || ""}

Log in to your RecyTrack portal to view full details and track progress.

---
This is an automated notification from RecyTrack.
`.trim();
}

// ============================================
// STAFF INVITATION TEMPLATES
// ============================================

function generateStaffInvitationEmailHtml(params: {
  inviteeName?: string;
  invitedByName: string;
  organizationName: string;
  roleLabel: string;
  inviteUrl: string;
  expiryDate: string;
}): string {
  const { inviteeName, invitedByName, organizationName, roleLabel, inviteUrl, expiryDate } = params;

  const greeting = inviteeName ? `Hello ${inviteeName},` : "Hello,";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RecyTrack Staff Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                Join Your Team on RecyTrack
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                ${greeting}
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                <strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong> on RecyTrack as a <strong>${roleLabel}</strong>.
              </p>

              <p style="margin: 0 0 32px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Click the button below to create your account and start managing collections, assets, and warehouse operations.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0f766e;">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none; border-radius: 8px;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #0f766e; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${inviteUrl}
              </p>

              <!-- Expiry notice -->
              <div style="padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>This invitation expires on ${expiryDate}.</strong> Please accept it before then.
                </p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                This email was sent by RecyTrack on behalf of ${organizationName}.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateStaffInvitationEmailText(params: {
  inviteeName?: string;
  invitedByName: string;
  organizationName: string;
  roleLabel: string;
  inviteUrl: string;
  expiryDate: string;
}): string {
  const { inviteeName, invitedByName, organizationName, roleLabel, inviteUrl, expiryDate } = params;

  const greeting = inviteeName ? `Hello ${inviteeName},` : "Hello,";

  return `
RecyTrack Staff Invitation

${greeting}

${invitedByName} has invited you to join ${organizationName} on RecyTrack as a ${roleLabel}.

Accept your invitation by visiting:
${inviteUrl}

You'll be able to manage collections, assets, and warehouse operations.

This invitation expires on ${expiryDate}. Please accept it before then.

---
This email was sent by RecyTrack on behalf of ${organizationName}.
If you didn't expect this invitation, you can safely ignore this email.
`.trim();
}

// ============================================
// VERIFICATION EMAIL TEMPLATES
// ============================================

function generateVerificationEmailHtml(params: {
  name: string;
  verifyUrl: string;
}): string {
  const { name, verifyUrl } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your RecyTrack account</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                Verify your email address
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Hello ${name},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Thank you for registering with RecyTrack. Please verify your email address to complete your registration.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0f766e;">
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none; border-radius: 8px;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 32px 0; font-size: 14px; color: #0f766e; word-break: break-all; background-color: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                ${verifyUrl}
              </p>

              <!-- Info -->
              <div style="padding: 16px; background-color: #f0fdfa; border-radius: 8px; border-left: 4px solid #0f766e;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f766e; font-weight: 600;">
                  What happens next?
                </p>
                <p style="margin: 0; font-size: 14px; color: #475569;">
                  After verifying your email, your registration will be reviewed by our team. You'll receive an email once your account is approved.
                </p>
              </div>

              <!-- Expiry notice -->
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
                This verification link will expire in 24 hours.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                This email was sent by RecyTrack.
              </p>
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                If you didn't create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateVerificationEmailText(params: {
  name: string;
  verifyUrl: string;
}): string {
  const { name, verifyUrl } = params;

  return `
RecyTrack - Verify Your Email

Hello ${name},

Thank you for registering with RecyTrack. Please verify your email address to complete your registration.

Click here to verify your email:
${verifyUrl}

What happens next?
After verifying your email, your registration will be reviewed by our team. You'll receive an email once your account is approved.

This verification link will expire in 24 hours.

---
This email was sent by RecyTrack.
If you didn't create this account, you can safely ignore this email.
`.trim();
}

// ============================================
// APPROVAL/REJECTION EMAIL TEMPLATES
// ============================================

function generateApprovalEmailHtml(params: {
  name: string;
  companyName: string;
  loginUrl: string;
}): string {
  const { name, companyName, loginUrl } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your RecyTrack account has been approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <!-- Success Icon -->
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="display: inline-block; width: 64px; height: 64px; background-color: #d1fae5; border-radius: 50%; line-height: 64px; font-size: 32px;">
                  &#10003;
                </div>
              </div>

              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3; text-align: center;">
                Your account has been approved!
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Hello ${name},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Great news! Your registration for <strong>${companyName}</strong> on RecyTrack has been approved. You can now sign in to access the customer portal.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 32px auto;">
                <tr>
                  <td style="border-radius: 8px; background-color: #0f766e;">
                    <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: white; text-decoration: none; border-radius: 8px;">
                      Sign In to Your Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Features -->
              <div style="padding: 20px; background-color: #f8fafc; border-radius: 8px;">
                <p style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a; font-weight: 600;">
                  What you can do:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
                  <li>Book and manage IT asset collections</li>
                  <li>Track your assets in real-time</li>
                  <li>Download destruction certificates</li>
                  <li>Access compliance reports</li>
                </ul>
              </div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                This email was sent by RecyTrack.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateApprovalEmailText(params: {
  name: string;
  companyName: string;
  loginUrl: string;
}): string {
  const { name, companyName, loginUrl } = params;

  return `
RecyTrack - Your Account Has Been Approved

Hello ${name},

Great news! Your registration for ${companyName} on RecyTrack has been approved. You can now sign in to access the customer portal.

Sign in here: ${loginUrl}

What you can do:
- Book and manage IT asset collections
- Track your assets in real-time
- Download destruction certificates
- Access compliance reports

---
This email was sent by RecyTrack.
`.trim();
}

function generateRejectionEmailHtml(params: {
  name: string;
  reason?: string;
}): string {
  const { name, reason } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update on your RecyTrack registration</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background-color: #0f766e; color: white; font-weight: 700; font-size: 24px; padding: 12px 24px; border-radius: 8px; letter-spacing: -0.5px;">
                RecyTrack
              </div>
            </td>
          </tr>
        </table>

        <!-- Main Content -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.3;">
                Update on your registration
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Hello ${name},
              </p>

              <p style="margin: 0 0 24px 0; font-size: 16px; color: #475569; line-height: 1.6;">
                Thank you for your interest in RecyTrack. After reviewing your registration, we are unable to approve your account at this time.
              </p>

              ${reason ? `
              <div style="padding: 16px; background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b; font-weight: 600;">
                  Reason:
                </p>
                <p style="margin: 0; font-size: 14px; color: #0f172a;">
                  ${reason}
                </p>
              </div>
              ` : ""}

              <p style="margin: 0; font-size: 16px; color: #475569; line-height: 1.6;">
                If you believe this is an error or have questions, please contact our support team for assistance.
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td style="text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                This email was sent by RecyTrack.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function generateRejectionEmailText(params: {
  name: string;
  reason?: string;
}): string {
  const { name, reason } = params;

  return `
RecyTrack - Update on Your Registration

Hello ${name},

Thank you for your interest in RecyTrack. After reviewing your registration, we are unable to approve your account at this time.

${reason ? `Reason: ${reason}` : ""}

If you believe this is an error or have questions, please contact our support team for assistance.

---
This email was sent by RecyTrack.
`.trim();
}
