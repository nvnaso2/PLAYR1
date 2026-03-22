import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = "noreply@playr1.app";
const APP_NAME = "PLAYR1";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function isEnabled(): boolean {
  return !!SENDGRID_API_KEY;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:24px 0;">
      <h1 style="color:#f97316;font-size:28px;margin:0;letter-spacing:1px;">${APP_NAME}</h1>
    </div>
    <div style="background-color:#1a1a1a;border-radius:12px;padding:32px;border:1px solid #333;">
      <h2 style="color:#fff;font-size:22px;margin:0 0 16px 0;">${title}</h2>
      ${body}
    </div>
    <div style="text-align:center;padding:24px 0;color:#666;font-size:12px;">
      <p style="margin:0;">This email was sent by ${APP_NAME}. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEnabled()) {
    console.log(`[Email] SendGrid not configured, skipping email to ${to}: ${subject}`);
    return false;
  }
  try {
    await sgMail.send({ to, from: FROM_EMAIL, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Failed to send "${subject}" to ${to}:`, error?.response?.body || error.message);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, displayName: string): Promise<boolean> {
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      Hey ${displayName},
    </p>
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      Welcome to ${APP_NAME}! We're excited to have you on board.
    </p>
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      Whether you're here to sharpen your skills, find a trainer, or track your progress,
      you've come to the right place. Here's what you can do:
    </p>
    <ul style="color:#ccc;font-size:15px;line-height:1.8;padding-left:20px;margin:0 0 16px 0;">
      <li>Browse our drill library and start training</li>
      <li>Log your practice sessions and track your improvement</li>
      <li>Connect with trainers for personalized coaching</li>
      <li>Upload your own training videos</li>
    </ul>
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0;">
      Let's get to work!
    </p>`;
  return sendEmail(email, `Welcome to ${APP_NAME}!`, baseTemplate(`Welcome to ${APP_NAME}!`, body));
}

interface SessionEmailData {
  trainerName: string;
  playerName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  locationName?: string;
  sessionType?: string;
}

function sessionDetailsHtml(data: SessionEmailData): string {
  const details = [
    { label: "Date", value: formatDate(data.sessionDate) },
    { label: "Time", value: `${formatTime(data.startTime)} - ${formatTime(data.endTime)}` },
  ];
  if (data.locationName) details.push({ label: "Location", value: data.locationName });
  if (data.sessionType) details.push({ label: "Type", value: data.sessionType });

  return `<div style="background-color:#222;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f97316;">
    ${details
      .map(
        (d) => `<p style="color:#ccc;font-size:14px;margin:4px 0;">
        <strong style="color:#999;">${d.label}:</strong> ${d.value}
      </p>`
      )
      .join("")}
  </div>`;
}

export async function sendSessionRequestedEmail(
  recipientEmail: string,
  data: SessionEmailData & { requesterRole: "player" | "trainer" }
): Promise<boolean> {
  const isFromPlayer = data.requesterRole === "player";
  const requesterName = isFromPlayer ? data.playerName : data.trainerName;
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      ${isFromPlayer ? `${data.playerName} has requested a training session with you.` : `${data.trainerName} has scheduled a training session for you.`}
    </p>
    ${sessionDetailsHtml(data)}
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      <strong style="color:#fff;">Trainer:</strong> ${data.trainerName}<br>
      <strong style="color:#fff;">Player:</strong> ${data.playerName}
    </p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;">
      Log in to ${APP_NAME} to review and respond to this request.
    </p>`;
  return sendEmail(
    recipientEmail,
    `New Session Request from ${requesterName}`,
    baseTemplate("New Training Session Request", body)
  );
}

export async function sendSessionConfirmedEmail(
  recipientEmail: string,
  data: SessionEmailData & { confirmedBy: string }
): Promise<boolean> {
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      Your training session has been confirmed by ${data.confirmedBy}.
    </p>
    ${sessionDetailsHtml(data)}
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      <strong style="color:#fff;">Trainer:</strong> ${data.trainerName}<br>
      <strong style="color:#fff;">Player:</strong> ${data.playerName}
    </p>
    <p style="color:#28a745;font-size:14px;line-height:1.6;margin:0;">
      See you on the court!
    </p>`;
  return sendEmail(
    recipientEmail,
    `Session Confirmed - ${formatDate(data.sessionDate)}`,
    baseTemplate("Session Confirmed", body)
  );
}

export async function sendSessionCancelledEmail(
  recipientEmail: string,
  data: SessionEmailData & { cancelledBy: string }
): Promise<boolean> {
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      A training session has been cancelled by ${data.cancelledBy}.
    </p>
    ${sessionDetailsHtml(data)}
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      <strong style="color:#fff;">Trainer:</strong> ${data.trainerName}<br>
      <strong style="color:#fff;">Player:</strong> ${data.playerName}
    </p>`;
  return sendEmail(
    recipientEmail,
    `Session Cancelled - ${formatDate(data.sessionDate)}`,
    baseTemplate("Session Cancelled", body)
  );
}

export async function sendSessionRescheduledEmail(
  recipientEmail: string,
  data: SessionEmailData & { rescheduledBy: string; oldDate: string; oldStartTime: string; oldEndTime: string }
): Promise<boolean> {
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      A training session has been rescheduled by ${data.rescheduledBy}.
    </p>
    <div style="background-color:#222;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #666;">
      <p style="color:#999;font-size:13px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px;">Previous</p>
      <p style="color:#888;font-size:14px;margin:0;text-decoration:line-through;">
        ${formatDate(data.oldDate)} &bull; ${formatTime(data.oldStartTime)} - ${formatTime(data.oldEndTime)}
      </p>
    </div>
    <div style="background-color:#222;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f97316;">
      <p style="color:#f97316;font-size:13px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px;">New Schedule</p>
      <p style="color:#ccc;font-size:14px;margin:0;">
        ${formatDate(data.sessionDate)} &bull; ${formatTime(data.startTime)} - ${formatTime(data.endTime)}
      </p>
      ${data.locationName ? `<p style="color:#ccc;font-size:14px;margin:4px 0 0 0;">Location: ${data.locationName}</p>` : ""}
    </div>
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      <strong style="color:#fff;">Trainer:</strong> ${data.trainerName}<br>
      <strong style="color:#fff;">Player:</strong> ${data.playerName}
    </p>
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;">
      Log in to ${APP_NAME} to confirm the new schedule.
    </p>`;
  return sendEmail(
    recipientEmail,
    `Session Rescheduled - ${formatDate(data.sessionDate)}`,
    baseTemplate("Session Rescheduled", body)
  );
}

export async function sendSessionDeclinedEmail(
  recipientEmail: string,
  data: SessionEmailData & { declineReason?: string }
): Promise<boolean> {
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      Your training session request has been declined by ${data.trainerName}.
    </p>
    ${sessionDetailsHtml(data)}
    ${data.declineReason ? `<p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px 0;"><strong style="color:#fff;">Reason:</strong> ${data.declineReason}</p>` : ""}
    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0;">
      You can request a different time through ${APP_NAME}.
    </p>`;
  return sendEmail(
    recipientEmail,
    `Session Request Declined`,
    baseTemplate("Session Declined", body)
  );
}

export async function sendInviteEmail(
  toEmail: string,
  fromName: string,
  message?: string
): Promise<boolean> {
  const signUpUrl = process.env.APP_URL
    ? `${process.env.APP_URL}/auth`
    : "https://playr1.com/auth";
  const personalMessage = message
    ? `<p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;padding:16px;background-color:#222;border-radius:8px;border-left:4px solid #f97316;">
        "${message}"
      </p>`
    : "";
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      ${fromName} has invited you to join ${APP_NAME} &mdash; the platform for basketball players and trainers to connect, train, and track progress.
    </p>
    ${personalMessage}
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
      Whether you're a player looking to sharpen your skills or a trainer ready to grow your roster, ${APP_NAME} has you covered.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${signUpUrl}" style="display:inline-block;background-color:#f97316;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
        Join ${APP_NAME}
      </a>
    </div>
    <p style="color:#666;font-size:12px;line-height:1.6;margin:0;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <span style="color:#f97316;word-break:break-all;">${signUpUrl}</span>
    </p>`;
  return sendEmail(
    toEmail,
    `${fromName} invited you to join ${APP_NAME}`,
    baseTemplate(`You're Invited to ${APP_NAME}!`, body)
  );
}

export async function sendPasswordResetEmail(
  email: string,
  displayName: string,
  resetUrl: string
): Promise<boolean> {
  const body = `
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      Hey ${displayName},
    </p>
    <p style="color:#ccc;font-size:16px;line-height:1.6;margin:0 0 16px 0;">
      We received a request to reset your password. Click the button below to set a new password:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#f97316;color:#fff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
        Reset Password
      </a>
    </div>
    <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
    <p style="color:#666;font-size:12px;line-height:1.6;margin:0;">
      If the button doesn't work, copy and paste this URL into your browser:<br>
      <span style="color:#f97316;word-break:break-all;">${resetUrl}</span>
    </p>`;
  return sendEmail(email, `Reset Your ${APP_NAME} Password`, baseTemplate("Reset Your Password", body));
}
