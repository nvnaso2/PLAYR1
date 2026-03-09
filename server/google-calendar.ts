import { google } from "googleapis";
import { db } from "./db";
import { googleCalendarTokens } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const STATE_SECRET = process.env.GOOGLE_CLIENT_SECRET || crypto.randomBytes(32).toString("hex");

function getRedirectUri() {
  const replitUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : "http://localhost:5000";
  return `${replitUrl}/api/auth/google/callback`;
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

function signState(userId: string): string {
  const hmac = crypto.createHmac("sha256", STATE_SECRET).update(userId).digest("hex").slice(0, 16);
  return `${userId}:${hmac}`;
}

export function verifyState(state: string): string | null {
  const parts = state.split(":");
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  const expected = crypto.createHmac("sha256", STATE_SECRET).update(userId).digest("hex").slice(0, 16);
  if (sig !== expected) return null;
  return userId;
}

export function getAuthUrl(userId: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: signState(userId),
  });
}

export async function handleCallback(code: string, userId: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. Please revoke access and try again.");
  }

  const expiresAt = new Date(tokens.expiry_date || Date.now() + 3600 * 1000);

  const existing = await db.select().from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    await db.update(googleCalendarTokens)
      .set({
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarTokens.userId, userId));
  } else {
    await db.insert(googleCalendarTokens).values({
      userId,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresAt,
    });
  }

  return { success: true };
}

async function getAuthedClient(userId: string) {
  const [tokenRow] = await db.select().from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId))
    .limit(1);

  if (!tokenRow) return null;

  const client = createOAuth2Client();
  client.setCredentials({
    access_token: tokenRow.accessToken,
    refresh_token: tokenRow.refreshToken,
    expiry_date: tokenRow.expiresAt.getTime(),
  });

  client.on("tokens", async (newTokens) => {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (newTokens.access_token) updates.accessToken = newTokens.access_token;
    if (newTokens.refresh_token) updates.refreshToken = newTokens.refresh_token;
    if (newTokens.expiry_date) updates.expiresAt = new Date(newTokens.expiry_date);
    await db.update(googleCalendarTokens)
      .set(updates)
      .where(eq(googleCalendarTokens.userId, userId));
  });

  return client;
}

export async function isConnected(userId: string): Promise<boolean> {
  const [row] = await db.select({ id: googleCalendarTokens.id })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId))
    .limit(1);
  return !!row;
}

export async function disconnect(userId: string): Promise<boolean> {
  const client = await getAuthedClient(userId);
  if (client) {
    try {
      await client.revokeCredentials();
    } catch {}
  }
  await db.delete(googleCalendarTokens)
    .where(eq(googleCalendarTokens.userId, userId));
  return true;
}

export async function createCalendarEvent(
  userId: string,
  session: {
    id: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    playerName?: string;
    trainerName?: string;
    locationName?: string;
    sessionType?: string;
    notes?: string;
  },
  timezone?: string
): Promise<{ eventId: string; eventLink: string } | null> {
  const client = await getAuthedClient(userId);
  if (!client) return null;

  const calendar = google.calendar({ version: "v3", auth: client });

  const startDateTime = `${session.sessionDate}T${session.startTime}:00`;
  const endDateTime = `${session.sessionDate}T${session.endTime}:00`;
  const tz = timezone || "America/New_York";

  const titleParts = ["PLAYR1 Training Session"];
  if (session.playerName) titleParts.push(`with ${session.playerName}`);
  if (session.trainerName) titleParts.push(`with ${session.trainerName}`);

  const descParts: string[] = [];
  if (session.sessionType) descParts.push(`Type: ${session.sessionType}`);
  if (session.notes) descParts.push(`Notes: ${session.notes}`);
  descParts.push(`Session ID: ${session.id}`);

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: titleParts.join(" "),
      description: descParts.join("\n"),
      location: session.locationName || undefined,
      start: {
        dateTime: startDateTime,
        timeZone: tz,
      },
      end: {
        dateTime: endDateTime,
        timeZone: tz,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "popup", minutes: 15 },
        ],
      },
    },
  });

  return {
    eventId: event.data.id!,
    eventLink: event.data.htmlLink!,
  };
}
