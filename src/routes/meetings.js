const express = require('express');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Meeting, User } = require('../models');
const { requireAuth, requireExecutiveOrAdmin } = require('../middleware/auth');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);

// Generate unique meeting ID (used as Jitsi room name)
// Use simple, URL-friendly names for anonymous Jitsi rooms
function generateMeetingId() {
  // Generate a simple room name without special characters
  // Jitsi works best with simple alphanumeric room names for anonymous access
  return `BazeMSSN${crypto.randomBytes(6).toString('hex')}`;
}

/* LIST MEETINGS */
router.get('/', async (req, res) => {
  try {
    const user = res.locals.currentUser;
    const where = {};
    
    // If not logged in or not admin, only show public and active meetings
    if (!user || !(user.isSuperuser || user.role === 'ADMIN')) {
      where.isPublic = true;
      where.isActive = true;
      where.startTime = { [Op.lte]: new Date() };
    }
    
    const allMeetings = await Meeting.findAll({
      where,
      include: [{
        model: User,
        as: 'Organizer',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }],
      order: [['startTime', 'DESC']]
    });
    
    // Filter meetings based on allowed roles
    let meetings = allMeetings;
    if (!user || !(user.isSuperuser || user.role === 'ADMIN')) {
      meetings = allMeetings.filter(meeting => {
        // Admins can always see all meetings
        if (user && (user.isSuperuser || user.role === 'ADMIN')) {
          return true;
        }
        // If no allowedRoles specified (null or empty), all logged-in users can join
        if (!meeting.allowedRoles || meeting.allowedRoles.length === 0) {
          return true;
        }
        // For guests (not logged in), they can see but need to login to join
        if (!user) {
          return true; // Show meeting, but they'll need to login
        }
        // Check if user's role is in allowed roles
        return meeting.allowedRoles.includes(user.role);
      });
    }
    
    res.render('meetings/list', {
      title: 'Live Meetings',
      meetings: meetings || []
    });
  } catch (e) {
    console.error('[MEETINGS] Error listing meetings:', e);
    req.flash('error', 'Failed to load meetings.');
    res.redirect('/');
  }
});

/* CREATE MEETING (form) */
router.get('/create', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  res.render('meetings/create', { title: 'Create Meeting' });
});

/* CREATE MEETING (submit) */
router.post('/create', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  try {
    const { title, description, meetingType, startTime, endTime, isPublic, maxParticipants, password, allowedRoles } = req.body;
    
    if (!title || !startTime) {
      req.flash('error', 'Title and start time are required.');
      return res.redirect('/meetings/create');
    }
    
    // Process allowed roles - can be array or single value
    let allowedRolesArray = null;
    if (allowedRoles) {
      allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      // Filter out empty values
      allowedRolesArray = allowedRolesArray.filter(role => role && ['EXECUTIVE', 'MEMBER'].includes(role));
    }
    
    if (!allowedRolesArray || allowedRolesArray.length === 0) {
      req.flash('error', 'Please select at least one allowed role (Executive or Member).');
      return res.redirect('/meetings/create');
    }
    
    const meetingId = generateMeetingId();
    
    // No room creation needed - Jitsi Meet creates rooms on-the-fly
    const meeting = await Meeting.create({
      title,
      description: description || null,
      meetingType: meetingType || 'VIDEO',
      meetingId,
      organizerId: res.locals.currentUser.id,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      isPublic: isPublic === 'on' || isPublic === true,
      allowedRoles: allowedRolesArray,
      maxParticipants: parseInt(maxParticipants) || 50,
      password: password || null,
      isActive: true
    });
    
    console.log(`[MEETINGS] ✅ Meeting created: ${title} (ID: ${meetingId})`);
    req.flash('success', 'Meeting created successfully!');
    res.redirect(`/meetings/${meeting.id}/join`);
  } catch (e) {
    console.error('[MEETINGS] Error creating meeting:', e);
    req.flash('error', 'Failed to create meeting.');
    res.redirect('/meetings/create');
  }
});

/* JOIN MEETING */
router.get('/:id/join', async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'Organizer',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });
    
    if (!meeting) {
      req.flash('error', 'Meeting not found.');
      return res.redirect('/meetings');
    }
    
    // Check if meeting is active and accessible
    const user = res.locals.currentUser;
    if (!meeting.isActive) {
      req.flash('error', 'This meeting is not active.');
      return res.redirect('/meetings');
    }
    
    // Check if meeting is public
    if (!meeting.isPublic && (!user || (user.id !== meeting.organizerId && !user.isSuperuser && user.role !== 'ADMIN'))) {
      req.flash('error', 'You do not have permission to join this meeting.');
      return res.redirect('/meetings');
    }
    
    // Check role-based access (admins can always join)
    if (!user) {
      req.flash('error', 'Please login to join this meeting.');
      return res.redirect('/accounts/login?redirect=' + encodeURIComponent(req.originalUrl));
    }
    
    if (!(user.isSuperuser || user.role === 'ADMIN')) {
      if (meeting.allowedRoles && meeting.allowedRoles.length > 0) {
        if (!meeting.allowedRoles.includes(user.role)) {
          const rolesText = meeting.allowedRoles.map(r => r === 'EXECUTIVE' ? 'Executive' : r === 'MEMBER' ? 'Member' : r).join(' and ');
          req.flash('error', `This meeting is restricted to ${rolesText} roles only.`);
          return res.redirect('/meetings');
        }
      }
    }
    
    // Check if meeting has started
    const now = new Date();
    if (meeting.startTime > now) {
      req.flash('error', `Meeting starts at ${meeting.startTime.toLocaleString()}.`);
      return res.redirect('/meetings');
    }
    
    // Jitsi Meet - generate simple URL for direct redirect (avoiding authentication issues)
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Guest';
    
    // Create simple room name (remove special characters to avoid member-only mode)
    const cleanRoomName = meeting.meetingId.replace(/[^a-zA-Z0-9]/g, '');
    
    // Generate Jitsi Meet URL - direct link opens in new tab (no authentication required)
    const jitsiUrl = `https://meet.jit.si/${cleanRoomName}#userInfo.displayName="${encodeURIComponent(userName)}"`;
    
    // Use simple redirect page to avoid authentication issues with embedded iframe
    res.render('meetings/join-simple', {
      title: `Join: ${meeting.title}`,
      meeting,
      userName,
      jitsiUrl
    });
  } catch (e) {
    console.error('[MEETINGS] Error joining meeting:', e);
    req.flash('error', 'Failed to join meeting.');
    res.redirect('/meetings');
  }
});

/* END MEETING */
router.post('/:id/end', requireAuth, async (req, res) => {
  try {
    const meeting = await Meeting.findByPk(req.params.id);
    
    if (!meeting) {
      req.flash('error', 'Meeting not found.');
      return res.redirect('/meetings');
    }
    
    // Only organizer or admin can end meeting
    const user = res.locals.currentUser;
    if (meeting.organizerId !== user.id && !user.isSuperuser && user.role !== 'ADMIN') {
      req.flash('error', 'You do not have permission to end this meeting.');
      return res.redirect('/meetings');
    }
    
    await meeting.update({ isActive: false, endTime: new Date() });
    
    console.log(`[MEETINGS] Meeting ended: ${meeting.title}`);
    req.flash('success', 'Meeting ended successfully.');
    res.redirect('/meetings');
  } catch (e) {
    console.error('[MEETINGS] Error ending meeting:', e);
    req.flash('error', 'Failed to end meeting.');
    res.redirect('/meetings');
  }
});

module.exports = router;

