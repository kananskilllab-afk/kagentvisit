const { google } = require('googleapis');
const User = require('../models/User');

const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function getOAuth2Client(redirectUri) {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri || process.env.GOOGLE_REDIRECT_URI
    );
}

/**
 * Generate the Google OAuth consent URL.
 * redirectUri must match what is registered in Google Cloud Console.
 */
function getAuthUrl(userId, redirectUri) {
    const client = getOAuth2Client(redirectUri);
    return client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        state: String(userId)
    });
}

/**
 * Exchange the authorization code for tokens and persist them on the User document.
 * redirectUri must exactly match the one used in getAuthUrl.
 */
async function handleCallback(code, userId, redirectUri) {
    const client = getOAuth2Client(redirectUri);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch the Google account email for display purposes
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    let email = '';
    try {
        const info = await oauth2.userinfo.get();
        email = info.data.email || '';
    } catch { /* non-critical */ }

    await User.findByIdAndUpdate(userId, {
        googleCalendar: {
            connected:    true,
            accessToken:  tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate:   tokens.expiry_date,
            email
        }
    });

    return { email };
}

/**
 * Build an authenticated Calendar client for a given user.
 * Automatically refreshes the access token if expired and persists the new token.
 */
async function getCalendarClient(user) {
    const gc = user.googleCalendar;
    if (!gc || !gc.connected || !gc.refreshToken) return null;

    const client = getOAuth2Client();
    client.setCredentials({
        access_token:  gc.accessToken,
        refresh_token: gc.refreshToken,
        expiry_date:   gc.expiryDate
    });

    // Listen for automatic token refresh
    client.on('tokens', async (tokens) => {
        const update = { 'googleCalendar.accessToken': tokens.access_token };
        if (tokens.expiry_date) update['googleCalendar.expiryDate'] = tokens.expiry_date;
        if (tokens.refresh_token) update['googleCalendar.refreshToken'] = tokens.refresh_token;
        await User.findByIdAndUpdate(user._id, update);
    });

    return google.calendar({ version: 'v3', auth: client });
}

/**
 * Create a Google Calendar event and return the event ID.
 */
async function createEvent(user, schedule) {
    const calendar = await getCalendarClient(user);
    if (!calendar) return null;

    const event = buildEventResource(schedule);
    const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
    });
    return res.data.id;
}

/**
 * Update an existing Google Calendar event.
 */
async function updateEvent(user, googleEventId, schedule) {
    const calendar = await getCalendarClient(user);
    if (!calendar || !googleEventId) return;

    const event = buildEventResource(schedule);
    await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: event
    });
}

/**
 * Delete a Google Calendar event.
 */
async function deleteEvent(user, googleEventId) {
    const calendar = await getCalendarClient(user);
    if (!calendar || !googleEventId) return;

    try {
        await calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId
        });
    } catch (err) {
        // 410 Gone = already deleted — that's fine
        if (err.code !== 410) throw err;
    }
}

/**
 * Fetch Google Calendar events for a given time range.
 */
async function listEvents(user, timeMin, timeMax) {
    const calendar = await getCalendarClient(user);
    if (!calendar) return [];

    const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100
    });
    return (res.data.items || []).map(e => ({
        id:          e.id,
        title:       e.summary || '(No title)',
        start:       e.start?.dateTime || e.start?.date,
        end:         e.end?.dateTime || e.end?.date,
        location:    e.location || '',
        description: e.description || '',
        htmlLink:    e.htmlLink,
        source:      'google'
    }));
}

/**
 * Disconnect Google Calendar — clear tokens from the user doc.
 */
async function disconnect(userId) {
    await User.findByIdAndUpdate(userId, {
        googleCalendar: {
            connected:    false,
            accessToken:  null,
            refreshToken: null,
            expiryDate:   null,
            email:        null
        }
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEventResource(schedule) {
    const start = new Date(schedule.scheduledDate);
    const end   = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour duration

    const event = {
        summary:     schedule.title,
        description: schedule.notes || '',
        start:       { dateTime: start.toISOString() },
        end:         { dateTime: end.toISOString() }
    };

    if (schedule.location) {
        event.location = schedule.location;
    }

    // Add reminder if offset is set
    if (schedule.reminderOffset && schedule.reminderOffset > 0) {
        event.reminders = {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: schedule.reminderOffset }]
        };
    }

    return event;
}

module.exports = {
    getAuthUrl,
    handleCallback,
    getCalendarClient,
    createEvent,
    updateEvent,
    deleteEvent,
    listEvents,
    disconnect
};
