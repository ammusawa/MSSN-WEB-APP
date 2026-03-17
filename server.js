require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const csrf = require('csurf');
const { sequelize } = require('./src/models');
const { attachUserToLocals } = require('./src/middleware/auth');

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  // Log request
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : res.statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${statusColor}[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms\x1b[0m`);
  });
  
  next();
});

app.use(helmet({ 
  contentSecurityPolicy: false,
  frameguard: { action: 'sameorigin' } // Allow same-origin framing (for PDF previews)
}));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));
app.use(express.json({ limit: '1gb' }));

app.set('views', path.join(__dirname, 'src/views'));
app.set('view engine', 'ejs');

app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev',
    resave: false,
    saveUninitialized: true, // Changed to true so CSRF tokens can be generated
    cookie: { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only use secure cookies in production
      sameSite: 'lax' // Helps with CSRF protection
    },
  })
);
app.use(flash());

// Configure CSRF to ignore safe methods (GET, HEAD, OPTIONS)
const csrfProtection = csrf({ ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] });

// Apply CSRF middleware with exemptions
app.use((req, res, next) => {
  const csrfExemptPaths = [
    '/donations/webhook', 
    '/repository/upload',
    '/notifications/unread-count',
    '/notifications/mark-all-read'
  ];
  
  // Exempt paths that match patterns (for routes with IDs)
  const exemptPatterns = [
    /^\/repository\/\d+\/edit$/  // /repository/:id/edit
  ];
  
  // Check if path matches any exempt pattern
  const matchesExemptPattern = exemptPatterns.some(pattern => pattern.test(req.path));
  
  // Skip CSRF entirely for exempt paths or patterns
  if (csrfExemptPaths.includes(req.path) || matchesExemptPattern) {
    return next();
  }
  
  // Apply CSRF middleware (generates tokens for all, validates only for POST/PUT/DELETE/PATCH)
  return csrfProtection(req, res, (err) => {
    // Ignore CSRF errors for safe methods (GET, HEAD, OPTIONS) - they shouldn't validate anyway
    if (err && err.code === 'EBADCSRFTOKEN') {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        // Safe method - ignore the error, token generation still happens
        return next();
      }
      // State-changing method - this is a real CSRF error
      return next(err);
    }
    // Other errors
    if (err) return next(err);
    next();
  });
});

// Middleware to generate CSRF token for all requests (for forms)
app.use((req, res, next) => {
  try {
  res.locals.csrfToken = typeof req.csrfToken === 'function' ? req.csrfToken() : '';
  } catch (err) {
    // If token generation fails (e.g., session issue), provide empty token
    res.locals.csrfToken = '';
  }
  next();
});

app.use(attachUserToLocals);

// routes
const indexRoutes = require('./src/routes/index');
const authRoutes = require('./src/routes/auth');
const repoRoutes = require('./src/routes/repository');
const annRoutes = require('./src/routes/announcements');
const donationRoutes = require('./src/routes/donations');
const adminRoutes = require('./src/routes/admin');
const adminRBACRoutes = require('./src/routes/admin_rbac');
const profileRoutes = require('./src/routes/profile');
const calendarRoutes = require('./src/routes/calendar');
const prayerTimeRoutes = require('./src/routes/prayerTimes');
const managementRoutes = require('./src/routes/management');

function assertRouter(name, r) {
  if (typeof r !== 'function') {
    console.error(`[FATAL] ${name} exported a ${typeof r}. Expected an Express router function. Ensure "module.exports = router" in that file.`);
    process.exit(1);
  }
}
assertRouter('indexRoutes', indexRoutes);
assertRouter('authRoutes', authRoutes);
assertRouter('repoRoutes', repoRoutes);
assertRouter('annRoutes', annRoutes);
assertRouter('donationRoutes', donationRoutes);
assertRouter('adminRoutes', adminRoutes);
assertRouter('adminRBACRoutes', adminRBACRoutes);
assertRouter('profileRoutes', profileRoutes);
assertRouter('calendarRoutes', calendarRoutes);
assertRouter('prayerTimeRoutes', prayerTimeRoutes);
assertRouter('managementRoutes', managementRoutes);

app.use('/', indexRoutes);
app.use('/accounts', authRoutes);
app.use('/repository', repoRoutes);
app.use('/announcements', annRoutes);
app.use('/donations', donationRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/rbac', adminRBACRoutes);
app.use('/profile', profileRoutes);
app.use('/notifications', require('./src/routes/notifications'));
app.use('/meetings', require('./src/routes/meetings'));
app.use('/calendar', calendarRoutes);
app.use('/prayer-times', prayerTimeRoutes);
app.use('/management', managementRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error handler:', err);
  
  // Handle CSRF token errors specifically
  if (err.code === 'EBADCSRFTOKEN') {
    console.error('[CSRF] Invalid CSRF token for:', req.method, req.path);
    req.flash('error', 'Your session has expired or the security token is invalid. Please refresh the page and try again.');
    
    // Extract resource ID from path if editing
    if (req.path && req.path.includes('/edit')) {
      const match = req.path.match(/\/repository\/(\d+)\/edit/);
      if (match && match[1]) {
        return res.redirect(`/repository/${match[1]}/edit`);
      }
    }
    
    // For other POST requests, try to redirect back
    if (req.method === 'POST') {
      const referer = req.get('Referer');
      if (referer) {
        return res.redirect(referer);
      }
      return res.redirect('/repository');
    }
    
    return res.redirect('/');
  }
  
  // Handle other errors
  req.flash('error', 'An unexpected error occurred: ' + (err.message || 'Unknown error'));
  
  // Try to redirect back if possible
  if (req.method === 'POST' && req.get('Referer')) {
    return res.redirect(req.get('Referer'));
  }
  
  res.redirect('/');
});

const BASE_PORT = Number(process.env.PORT) || 3000;

async function startServerWithRetry(startPort, maxRetries = 5) {
  try {
    console.log('[DB] 🔌 Connecting to database...');
  await sequelize.authenticate();
    console.log('[DB] ✅ Database connected successfully!');
    console.log('[DB] 📊 Syncing database models...');
  await sequelize.sync();
    console.log('[DB] ✅ Database models synced!');
  } catch (error) {
    console.error('[DB] ❌ Database connection error:', error.message);
    throw error;
  }

  let currentPort = startPort;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const listen = () => {
      const server = app
        .listen(currentPort, () => {
          console.log(`Server running at http://127.0.0.1:${currentPort}`);
          resolve(server);
        })
        .on('error', (err) => {
          if (err && err.code === 'EADDRINUSE' && attempts < maxRetries) {
            attempts += 1;
            currentPort += 1;
            console.warn(
              `Port in use. Retrying on ${currentPort} (attempt ${attempts}/${maxRetries})...`
            );
            setTimeout(listen, 300);
            return;
          }
          reject(err);
        });
    };
    listen();
  });
}

(async () => {
  try {
    await startServerWithRetry(BASE_PORT);
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
})();
