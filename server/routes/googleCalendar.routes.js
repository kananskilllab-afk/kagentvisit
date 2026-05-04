const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const gcal = require('../services/googleCalendar.service');

// Derive the public base URL dynamically — works on Vercel and localhost
function getBaseUrl(req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host  = req.get('host');
    return `${proto}://${host}`;
}

// ─── Public route (no auth cookie — Google redirects here directly) ───────────
router.get('/callback', async (req, res) => {
    const baseUrl = getBaseUrl(req);
    // Determine the client URL for the final redirect
    const clientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : baseUrl);
    
    try {
        const { code, state } = req.query;
        if (!code || !state) return res.status(400).json({ success: false, message: 'Missing code or state' });

        const redirectUri = `${baseUrl}/api/google-calendar/callback`;
        await gcal.handleCallback(code, state, redirectUri);

        res.redirect(`${clientUrl}/calendar?gcal=connected`);
    } catch (err) {
        console.error('Google Calendar callback error:', err.message);
        res.redirect(`${clientUrl}/calendar?gcal=error`);
    }
});

// ─── All routes below require authentication ─────────────────────────────────
router.use(protect);

// GET /api/google-calendar/status
router.get('/status', (req, res) => {
    const gc = req.user.googleCalendar;
    res.json({
        success:   true,
        connected: !!(gc && gc.connected),
        email:     gc?.email || null
    });
});

// GET /api/google-calendar/auth-url
router.get('/auth-url', (req, res) => {
    try {
        const baseUrl     = getBaseUrl(req);
        const redirectUri = `${baseUrl}/api/google-calendar/callback`;
        const url = gcal.getAuthUrl(req.user._id, redirectUri);
        res.json({ success: true, url });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/google-calendar/disconnect
router.post('/disconnect', async (req, res) => {
    try {
        await gcal.disconnect(req.user._id);
        res.json({ success: true, message: 'Google Calendar disconnected' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/google-calendar/events?start=<ISO>&end=<ISO>
router.get('/events', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) return res.status(400).json({ success: false, message: 'start and end are required' });

        const events = await gcal.listEvents(req.user, start, end);
        res.json({ success: true, data: events });
    } catch (err) {
        console.error('Google Calendar list error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch Google Calendar events' });
    }
});

module.exports = router;
