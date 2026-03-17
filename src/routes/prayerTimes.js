const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const layoutHook = require('../views/_layout_hook');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(layoutHook);

const DEFAULT_CITY = 'Abuja';
const DEFAULT_COUNTRY = 'Nigeria';
const DEFAULT_METHOD = '2'; // Islamic Society of North America (ISNA) – common in Nigeria
const cache = {};
const customStorePath = path.join(__dirname, '..', '..', 'data', 'prayer_times.json');

function loadCustomTimes(dateKey) {
  try {
    if (!fs.existsSync(customStorePath)) return null;
    const raw = fs.readFileSync(customStorePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return parsed[dateKey] || null;
  } catch (err) {
    console.error('Error loading custom prayer times:', err.message);
    return null;
  }
}

function saveCustomTimes(dateKey, payload) {
  try {
    const dir = path.dirname(customStorePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    let current = {};
    if (fs.existsSync(customStorePath)) {
      const raw = fs.readFileSync(customStorePath, 'utf8');
      current = JSON.parse(raw || '{}');
    }
    current[dateKey] = payload;
    fs.writeFileSync(customStorePath, JSON.stringify(current, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving custom prayer times:', err.message);
    return false;
  }
}

async function fetchTimingsByCity(city, country, method) {
  const cacheKey = `${city}:${country}:${method}`;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cached = cache[cacheKey];
  if (cached && cached.date === today && cached.data) return cached.data;

  const resp = await axios.get('https://api.aladhan.com/v1/timingsByCity', {
    params: { city, country, method },
    timeout: 8000,
  });
  if (resp.data && resp.data.code === 200 && resp.data.data) {
    cache[cacheKey] = { date: today, data: resp.data.data };
    return resp.data.data;
  }
  throw new Error('Invalid response from prayer times API');
}

function computeNextPrayer(timings, timezone) {
  if (!timings) return null;
  const order = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const now = new Date().toLocaleString('en-US', { timeZone: timezone || 'Africa/Lagos' });
  const nowDate = new Date(now);
  for (const name of order) {
    const timeStr = timings[name];
    if (!timeStr) continue;
    const [h, m] = timeStr.split(':').map(Number);
    const candidate = new Date(nowDate);
    candidate.setHours(h, m, 0, 0);
    if (candidate > nowDate) {
      return { name, time: timeStr };
    }
  }
  // If all passed, next prayer is tomorrow Fajr
  return { name: 'Fajr (tomorrow)', time: timings.Fajr };
}

router.get('/', async (req, res) => {
  const city = (req.query.city || DEFAULT_CITY).trim() || DEFAULT_CITY;
  const country = (req.query.country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY;
  const method = (req.query.method || DEFAULT_METHOD).trim() || DEFAULT_METHOD;

  let timings = null; // Adhan (API)
  let iqamaTimings = null; // Optional (manual)
  let dateInfo = null;
  let meta = null;
  let error = null;
  let source = 'api';

  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    const custom = loadCustomTimes(todayKey);
    if (custom && custom.timings) {
      timings = custom.timingsAdhan || custom.timings;
      iqamaTimings = custom.timingsIqama || null;
      dateInfo = custom.dateInfo || null;
      meta = custom.meta || null;
      source = 'custom';
    } else {
      const data = await fetchTimingsByCity(city, country, method);
      timings = data.timings;
      dateInfo = data.date;
      meta = data.meta;
      source = 'api';
    }
  } catch (e) {
    console.error('Prayer times fetch error:', e.message);
    error = 'Could not retrieve prayer times. Check your connection and try again.';
  }

  return res.render('prayer_times', {
    title: 'Prayer Times',
    timings,
    iqamaTimings,
    dateInfo,
    meta,
    city,
    country,
    method,
    error,
    source,
  });
});

// Lightweight API for navbar: returns next prayer and current dates
router.get('/api/next', async (req, res) => {
  const city = (req.query.city || DEFAULT_CITY).trim() || DEFAULT_CITY;
  const country = (req.query.country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY;
  const method = (req.query.method || DEFAULT_METHOD).trim() || DEFAULT_METHOD;
  try {
    const todayKey = new Date().toISOString().slice(0, 10);
    let data = loadCustomTimes(todayKey);
    if (!data) {
      data = await fetchTimingsByCity(city, country, method);
    }
    const baseTimings = data.timingsAdhan || data.timings;
    const nextPrayer = computeNextPrayer(baseTimings, data.meta && data.meta.timezone);
    return res.json({
      nextPrayer,
      gregorian: data.date && data.date.readable,
      hijri: data.date && data.date.hijri ? data.date.hijri.date : null,
      timezone: data.meta && data.meta.timezone,
      city,
      country,
    });
  } catch (err) {
    console.error('Prayer next API error:', err.message);
    return res.status(500).json({ error: 'Unable to fetch next prayer time' });
  }
});

// Admin: manual prayer times override
router.get('/admin', requireAuth, (req, res) => {
  const u = res.locals.currentUser;
  if (!u || !(u.isSuperuser || u.role === 'ADMIN')) {
    req.flash('error', 'Unauthorized');
    return res.redirect('/');
  }
  const todayKey = new Date().toISOString().slice(0, 10);
  const existing = loadCustomTimes(todayKey);
  res.render('prayer_times_admin', {
    title: 'Set Prayer Times',
    todayKey,
    existing: existing || {},
    csrfToken: res.locals.csrfToken,
  });
});

router.post('/admin', requireAuth, async (req, res) => {
  const u = res.locals.currentUser;
  if (!u || !(u.isSuperuser || u.role === 'ADMIN')) {
    req.flash('error', 'Unauthorized');
    return res.redirect('/');
  }
  const todayKey = new Date().toISOString().slice(0, 10);
  const {
    fajr, sunrise, dhuhr, asr, maghrib, isha,
    fajrIqama, dhuhrIqama, asrIqama, maghribIqama, ishaIqama,
    timezone, gregorian, hijri
  } = req.body;
  const payload = {
    timings: {
      Fajr: fajr,
      Sunrise: sunrise,
      Dhuhr: dhuhr,
      Asr: asr,
      Maghrib: maghrib,
      Isha: isha,
    },
    timingsAdhan: {
      Fajr: fajr,
      Sunrise: sunrise,
      Dhuhr: dhuhr,
      Asr: asr,
      Maghrib: maghrib,
      Isha: isha,
    },
    timingsIqama: {
      Fajr: fajrIqama,
      Dhuhr: dhuhrIqama,
      Asr: asrIqama,
      Maghrib: maghribIqama,
      Isha: ishaIqama,
    },
    date: {
      readable: gregorian || todayKey,
      hijri: hijri ? { date: hijri } : undefined,
    },
    dateInfo: {
      readable: gregorian || todayKey,
      hijri: hijri ? { date: hijri } : undefined,
    },
    meta: {
      timezone: timezone || 'Africa/Lagos',
    },
  };
  const ok = saveCustomTimes(todayKey, payload);
  if (ok) {
    req.flash('success', 'Prayer times updated for today.');
  } else {
    req.flash('error', 'Failed to save prayer times.');
  }
  res.redirect('/prayer-times');
});

module.exports = router;

