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
            connected: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
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
        access_token: gc.accessToken,
        refresh_token: gc.refreshToken,
        expiry_date: gc.expiryDate
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
async function createEvent(user, item) {
    const calendar = await getCalendarClient(user);
    if (!calendar) return null;

    const event = buildEventResource(item);
    const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
    });
    return res.data.id;
}

/**
 * Update an existing Google Calendar event.
 */
async function updateEvent(user, googleEventId, item) {
    const calendar = await getCalendarClient(user);
    if (!calendar || !googleEventId) return;

    const event = buildEventResource(item);
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
        id: e.id,
        title: e.summary || '(No title)',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        location: e.location || '',
        description: e.description || '',
        htmlLink: e.htmlLink,
        source: 'google'
    }));
}

/**
 * Disconnect Google Calendar — clear tokens from the user doc.
 */
async function disconnect(userId) {
    await User.findByIdAndUpdate(userId, {
        googleCalendar: {
            connected: false,
            accessToken: null,
            refreshToken: null,
            expiryDate: null,
            email: null
        }
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildEventResource(item) {
    // Determine if this is a VisitPlan (trip) or a VisitSchedule (individual meeting)
    const isPlan = !!item.plannedStartAt;
    const start = new Date(isPlan ? item.plannedStartAt : item.scheduledDate);
    const end = new Date(isPlan ? item.plannedEndAt : (item.scheduledEndDate || new Date(start.getTime() + 60 * 60 * 1000)));

    const event = {
        summary: item.title,
        description: item.notes || '',
        visibility: 'private' // Restricts visibility so only the specific user can see details, even on a shared company calendar
    };

    if (isPlan) {
        // Visit Plans become All-Day events spanning the entire trip duration.
        // This makes them appear at the top of the Google Calendar for those specific dates.
        event.start = { date: start.toISOString().split('T')[0] };

        // Google Calendar all-day event end dates are exclusive, so add 1 day
        const endDate = new Date(end);
        endDate.setDate(endDate.getDate() + 1);
        event.end = { date: endDate.toISOString().split('T')[0] };
    } else {
        // Visit Schedules remain as timed events. They will visually appear "below" the all-day Visit Plan.
        event.start = { dateTime: start.toISOString() };
        event.end = { dateTime: end.toISOString() };

        // Append the agent/company name to the event title for quick visibility
        const agentName = item.customAgentName || item.agentNameForGcal;
        if (agentName) {
            event.summary = `${item.title} - ${agentName}`;
        }
    }

    if (item.location) {
        event.location = item.location;
    }

    // Add reminder if offset is set
    if (item.reminderOffset && item.reminderOffset > 0) {
        event.reminders = {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: item.reminderOffset }]
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
