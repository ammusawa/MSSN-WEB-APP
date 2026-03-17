// src/routes/repository.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { requireAuth, requireExecutiveOrAdmin } = require('../middleware/auth'); // <- legacy roles
const { Resource, ResourceCategory } = require('../models');
const analyticsService = require('../services/analyticsService');
const notificationService = require('../services/notificationService');
const layoutHook = require('../views/_layout_hook');

const router = express.Router();
router.use(layoutHook);

const UPLOAD_DIR = path.join('uploads', 'resources');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 1024 } }); // 1GB limit

/* LIST */
router.get('/', async (req, res) => {
  const q = req.query.q || '';
  const category = req.query.category || '';
  const fileType = req.query.fileType || '';
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder || 'DESC';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const offset = (page - 1) * limit;

  const where = {};
  const include = [{ model: ResourceCategory, attributes: ['id', 'name', 'slug'] }];

  // Enhanced search functionality
  if (q) {
    where[Op.or] = [
      { title: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
      { fileType: { [Op.like]: `%${q}%` } }
    ];
  }

  // Category filter
  if (category) {
    const catObj = await ResourceCategory.findOne({ where: { slug: category } });
    if (catObj) where.categoryId = catObj.id;
  }

  // File type filter
  if (fileType) {
    where.fileType = fileType;
  }

  // Get categories for filter dropdown
  const categories = await ResourceCategory.findAll({
    order: [['name', 'ASC']]
  });

  // Get file types for filter dropdown
  const fileTypes = await Resource.findAll({
    attributes: ['fileType'],
    group: ['fileType'],
    where: { fileType: { [Op.ne]: null } },
    order: [['fileType', 'ASC']]
  });

  // Get total count for pagination
  const totalCount = await Resource.count({ where, include });

  // Get resources with pagination
  const resources = await Resource.findAll({
    where,
    include,
    order: [[sortBy, sortOrder]],
    limit,
    offset
  });

  // Check file availability for each resource
  // For admins/uploaders, allow viewing even if file doesn't exist (so they can fix it)
  const currentUser = res.locals.currentUser;
  const isAdmin = currentUser && (currentUser.isSuperuser || currentUser.role === 'ADMIN' || currentUser.role === 'EXECUTIVE');
  
  const resourcesWithAvailability = resources.map(r => {
    const absolute = path.isAbsolute(r.filePath) 
      ? r.filePath 
      : path.resolve(process.cwd(), r.filePath);
    const fileExists = fs.existsSync(absolute);
    const isUploader = currentUser && r.uploaderId && r.uploaderId === currentUser.id;
    
    // Admins and uploaders can see resources even if file doesn't exist
    const canView = fileExists || isAdmin || isUploader;
    
    return {
      ...r.toJSON(),
      fileExists: fileExists,
      canView: canView // New property to control visibility in view
    };
  });

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.render('repository/list', {
    title: 'Resources',
    resources: resourcesWithAvailability,
    categories,
    fileTypes: fileTypes.map(ft => ft.fileType).filter(Boolean),
    pagination: {
      currentPage: page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
      totalCount
    },
    filters: {
      q,
      category,
      fileType,
      sortBy,
      sortOrder
    }
  });
});

/* UPLOAD (form) — legacy role gate */
router.get('/upload', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  const categories = await ResourceCategory.findAll({ order: [['name', 'ASC']] });
  res.render('repository/upload', { title: 'Upload Resource', categories });
});

/* UPLOAD (submit) — legacy role gate */
router.post(
  '/upload',
  requireAuth,
  requireExecutiveOrAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        req.flash('error', 'Upload failed. ' + (err.message || ''));
        return res.redirect('/repository/upload');
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const { title, description, categoryId } = req.body;
      let { fileType } = req.body;
      if (!req.file) { req.flash('error', 'File is required.'); return res.redirect('/repository/upload'); }

      const category = await ResourceCategory.findByPk(categoryId);
      if (!category) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, req.file.originalname)); } catch {}
        req.flash('error', 'Please choose a valid category.');
        return res.redirect('/repository/upload');
      }

      const diskPath = path.join(UPLOAD_DIR, req.file.originalname).replace(/\\/g, '/');

      // Normalize fileType to supported values
      const allowedTypes = ['PDF','AUDIO','VIDEO','OTHER'];
      if (!allowedTypes.includes(fileType)) {
        // Infer from extension if possible
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext === '.pdf') fileType = 'PDF';
        else if (['.mp3','.wav','.m4a','.ogg'].includes(ext)) fileType = 'AUDIO';
        else if (['.mp4','.webm','.ogg'].includes(ext)) fileType = 'VIDEO';
        else fileType = 'OTHER';
      }

      const resource = await Resource.create({
        title,
        description,
        categoryId: category.id,
        fileType,
        filePath: diskPath,
        uploaderId: res.locals.currentUser.id,
      });

      // Send notification about new resource upload
      await notificationService.notifyResourceUploaded(resource.id, res.locals.currentUser.id);

      req.flash('success', 'Resource uploaded.');
      res.redirect('/repository');
    } catch (e) {
      console.error('Upload handler error:', e);
      req.flash('error', 'Upload failed.');
      res.redirect('/repository/upload');
    }
  }
);

/* SERVE PDF FILE (for iframe/embedding) */
router.get('/:id/file', async (req, res) => {
  try {
    const r = await Resource.findByPk(req.params.id);
    if (!r) {
      console.error('[FILE SERVE] Resource not found:', req.params.id);
      res.status(404).send('Resource not found');
      return;
    }

    // Resolve file path properly - handle both absolute and relative paths
    let absolute;
    if (path.isAbsolute(r.filePath)) {
      absolute = r.filePath;
    } else {
      // Handle relative paths - could be "uploads/resources/file.pdf" or "./uploads/resources/file.pdf"
      absolute = path.resolve(process.cwd(), r.filePath);
    }
    
    console.log('[FILE SERVE] Resource ID:', req.params.id);
    console.log('[FILE SERVE] Stored path:', r.filePath);
    console.log('[FILE SERVE] Resolved absolute path:', absolute);
    console.log('[FILE SERVE] File exists:', fs.existsSync(absolute));
    console.log('[FILE SERVE] Working directory:', process.cwd());
      
    if (!fs.existsSync(absolute)) {
      console.error('[FILE SERVE] ❌ File not found at:', absolute);
      console.error('[FILE SERVE] Trying alternative paths...');
      
      // Try alternative path resolution
      const altPath1 = path.join(__dirname, '..', r.filePath);
      const altPath2 = path.join(process.cwd(), r.filePath);
      const altPath3 = r.filePath.replace(/\\/g, '/');
      
      console.log('[FILE SERVE] Alt path 1:', altPath1, 'Exists:', fs.existsSync(altPath1));
      console.log('[FILE SERVE] Alt path 2:', altPath2, 'Exists:', fs.existsSync(altPath2));
      
      res.status(404).send(`File not found. Expected at: ${absolute}`);
      return;
    }

    // Verify it's actually a file
    const stats = fs.statSync(absolute);
    if (!stats.isFile()) {
      console.error('[FILE SERVE] Path is not a file:', absolute);
      res.status(400).send('Invalid file path');
      return;
    }

    const fileExt = path.extname(r.filePath).toLowerCase();
    
    // Serve all file types, not just PDFs
    if (fileExt === '.pdf') {
      // Set headers for PDF viewing in browser/iframe
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(path.basename(r.filePath)) + '"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Length', stats.size);
      
      // Use sendFile which is more reliable
      res.sendFile(absolute, (err) => {
        if (err) {
          console.error('[FILE SERVE] ❌ Error sending file:', err);
          if (!res.headersSent) {
            res.status(500).send('Error serving file: ' + err.message);
          }
        } else {
          console.log('[FILE SERVE] ✅ File sent successfully');
        }
      });
    } else {
      // For non-PDF files, serve with appropriate content type
      res.status(400).send('This route is for PDF files only. Use download route for other file types.');
    }
  } catch (e) {
    console.error('[FILE SERVE] Exception:', e);
    if (!res.headersSent) {
      res.status(500).send('Error serving file: ' + e.message);
    }
  }
});

/* PREVIEW */
router.get('/:id/preview', async (req, res) => {
  try {
    const r = await Resource.findByPk(req.params.id, { include: [ResourceCategory] });
    if (!r) { req.flash('error', 'Resource not found.'); return res.redirect('/repository'); }

    // Resolve file path properly - if relative, resolve from project root
    const absolute = path.isAbsolute(r.filePath) 
      ? r.filePath 
      : path.resolve(process.cwd(), r.filePath);
      
    if (!fs.existsSync(absolute)) {
      req.flash('error', `File not available yet. This resource will be uploaded soon.`);
      return res.redirect('/repository');
    }

    const fileExt = path.extname(r.filePath).toLowerCase();
    
    // Track view analytics
    analyticsService.trackEvent('VIEW', req.session.userId, r.id, req);
    
    // Handle different file types
    if (fileExt === '.pdf') {
      console.log('[PREVIEW] PDF Resource:', r.title);
      console.log('[PREVIEW] Stored filePath:', r.filePath);
      console.log('[PREVIEW] Absolute file path:', absolute);
      console.log('[PREVIEW] File exists:', fs.existsSync(absolute));
      
      // Build static file URL - filePath is stored as "uploads/resources/filename.pdf"
      // Static route serves from /uploads, so URL is /uploads/resources/filename.pdf
      let staticUrl = r.filePath.replace(/\\/g, '/');
      if (!staticUrl.startsWith('/')) {
        staticUrl = '/' + staticUrl;
      }
      
      console.log('[PREVIEW] Static file URL:', staticUrl);
      
      // Use static file URL (served by Express static middleware) - more reliable
      res.render('repository/pdf-preview', { 
        title: 'PDF Preview', 
        resource: r,
        filePath: staticUrl
      });
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExt)) {
      res.setHeader('Content-Type', 'image/' + fileExt.slice(1));
      res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(r.filePath) + '"');
      res.sendFile(absolute);
    } else if (['.mp3', '.wav', '.m4a', '.ogg'].includes(fileExt)) {
      // Construct URL path from filePath (convert backslashes to forward slashes)
      const urlPath = r.filePath.replace(/\\/g, '/');
      res.render('repository/audio-preview', { 
        title: 'Audio Preview', 
        resource: r,
        filePath: urlPath.startsWith('/') ? urlPath : `/${urlPath}`
      });
    } else if (['.mp4', '.webm', '.ogg'].includes(fileExt)) {
      // Construct URL path from filePath (convert backslashes to forward slashes)
      const urlPath = r.filePath.replace(/\\/g, '/');
      res.render('repository/video-preview', { 
        title: 'Video Preview', 
        resource: r,
        filePath: urlPath.startsWith('/') ? urlPath : `/${urlPath}`
      });
    } else {
      // For unsupported preview types, redirect to download
      res.redirect(`/repository/${r.id}/download`);
    }
  } catch (e) {
    console.error('Preview handler error:', e);
    req.flash('error', 'Could not preview file.');
    res.redirect('/repository');
  }
});

/* DOWNLOAD */
router.get('/:id/download', async (req, res) => {
  try {
    const r = await Resource.findByPk(req.params.id);
    if (!r) { req.flash('error', 'Resource not found.'); return res.redirect('/repository'); }

    // Resolve file path properly - if relative, resolve from project root
    const absolute = path.isAbsolute(r.filePath) 
      ? r.filePath 
      : path.resolve(process.cwd(), r.filePath);
    
    console.log(`[DOWNLOAD] Attempting to download: ${absolute}`);
    console.log(`[DOWNLOAD] File exists: ${fs.existsSync(absolute)}`);
      
    if (!fs.existsSync(absolute)) {
      console.error(`[DOWNLOAD] File not found at: ${absolute}`);
      req.flash('error', `File not available yet. This resource will be uploaded soon.`);
      return res.redirect('/repository');
    }

    // Get file stats to ensure it's a valid file
    const stats = fs.statSync(absolute);
    if (!stats.isFile()) {
      console.error(`[DOWNLOAD] Path is not a file: ${absolute}`);
      req.flash('error', 'File path is invalid.');
      return res.redirect('/repository');
    }

    try { await r.update({ downloads: (typeof r.downloads === 'number' ? r.downloads : 0) + 1 }); } catch {}

    // Track download analytics
    analyticsService.trackEvent('DOWNLOAD', req.session.userId, r.id, req);

    // Determine content type based on file extension
    const fileName = path.basename(r.filePath);
    const fileExt = path.extname(r.filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExt === '.pdf') contentType = 'application/pdf';
    else if (['.jpg', '.jpeg'].includes(fileExt)) contentType = 'image/jpeg';
    else if (fileExt === '.png') contentType = 'image/png';
    else if (fileExt === '.gif') contentType = 'image/gif';
    else if (fileExt === '.webp') contentType = 'image/webp';
    else if (['.mp3'].includes(fileExt)) contentType = 'audio/mpeg';
    else if (fileExt === '.wav') contentType = 'audio/wav';
    else if (fileExt === '.m4a') contentType = 'audio/mp4';
    else if (['.mp4'].includes(fileExt)) contentType = 'video/mp4';
    else if (fileExt === '.webm') contentType = 'video/webm';
    
    // Use res.download which handles headers automatically
    res.download(absolute, fileName, (err) => {
      if (err) {
        console.error('[DOWNLOAD] Error sending file:', err);
        if (!res.headersSent) {
          req.flash('error', 'File unavailable.');
          return res.redirect('/repository');
        }
      }
    });
  } catch (e) {
    console.error('[DOWNLOAD] Handler error:', e);
    req.flash('error', 'Could not download file.');
    res.redirect('/repository');
  }
});

/* EDIT RESOURCE (form) - Admin only */
router.get('/:id/edit', requireAuth, requireExecutiveOrAdmin, async (req, res) => {
  try {
    const resource = await Resource.findByPk(req.params.id, {
      include: [{ model: ResourceCategory }]
    });
    
    if (!resource) {
      req.flash('error', 'Resource not found.');
      return res.redirect('/repository');
    }
    
    const categories = await ResourceCategory.findAll({ order: [['name', 'ASC']] });
    
    res.render('repository/edit', {
      title: 'Edit Resource',
      resource,
      categories
    });
  } catch (e) {
    console.error('Edit resource form error:', e);
    req.flash('error', 'Failed to load resource for editing.');
    res.redirect('/repository');
  }
});

/* EDIT RESOURCE (submit) - Admin only */
router.post(
  '/:id/edit',
  requireAuth,
  requireExecutiveOrAdmin,
  (req, res, next) => {
    // File upload is optional when editing - only upload if new file provided
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('[EDIT] Multer error:', err);
        req.flash('error', 'File upload failed. ' + (err.message || ''));
        return res.redirect(`/repository/${req.params.id}/edit`);
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const resource = await Resource.findByPk(req.params.id);
      
      if (!resource) {
        req.flash('error', 'Resource not found.');
        return res.redirect('/repository');
      }
      
      const { title, description, categoryId } = req.body;
      let { fileType } = req.body;
      
      // Validate category
      const category = await ResourceCategory.findByPk(categoryId);
      if (!category) {
        req.flash('error', 'Please choose a valid category.');
        return res.redirect(`/repository/${resource.id}/edit`);
      }
      
      // Get old file path for cleanup if new file is uploaded
      const oldFilePath = resource.filePath;
      let newFilePath = oldFilePath;
      
      // If new file is uploaded, handle it
      if (req.file) {
        const diskPath = path.join(UPLOAD_DIR, req.file.originalname).replace(/\\/g, '/');
        
        // Normalize fileType from new file if needed
        if (!fileType || !['PDF', 'AUDIO', 'VIDEO', 'OTHER'].includes(fileType)) {
          const ext = path.extname(req.file.originalname).toLowerCase();
          if (ext === '.pdf') fileType = 'PDF';
          else if (['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) fileType = 'AUDIO';
          else if (['.mp4', '.webm', '.ogg'].includes(ext)) fileType = 'VIDEO';
          else fileType = 'OTHER';
        }
        
        // Delete old file if it exists and is different from new one
        if (oldFilePath && oldFilePath !== diskPath) {
          try {
            const oldAbsolute = path.isAbsolute(oldFilePath) 
              ? oldFilePath 
              : path.resolve(process.cwd(), oldFilePath);
            if (fs.existsSync(oldAbsolute)) {
              fs.unlinkSync(oldAbsolute);
              console.log(`[RESOURCE] Deleted old file: ${oldFilePath}`);
            }
          } catch (err) {
            console.error('[RESOURCE] Error deleting old file:', err);
            // Continue even if old file deletion fails
          }
        }
        
        newFilePath = diskPath;
      }
      
      // Update resource
      await resource.update({
        title,
        description: description || null,
        categoryId: category.id,
        fileType: fileType || resource.fileType,
        filePath: newFilePath
      });
      
      console.log(`[RESOURCE] ✅ Resource updated: ${title} (ID: ${resource.id})`);
      req.flash('success', 'Resource updated successfully!');
      res.redirect('/repository');
    } catch (e) {
      console.error('[RESOURCE] Error updating resource:', e);
      req.flash('error', 'Failed to update resource.');
      res.redirect(`/repository/${req.params.id}/edit`);
    }
  }
);

module.exports = router;
