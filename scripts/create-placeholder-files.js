require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize, Resource } = require('../src/models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    // Get all resources
    const resources = await Resource.findAll();
    console.log(`Found ${resources.length} resources in database.\n`);

    let createdCount = 0;
    let existingCount = 0;
    let errorCount = 0;

    for (const resource of resources) {
      try {
        // Resolve file path
        const absolutePath = path.isAbsolute(resource.filePath) 
          ? resource.filePath 
          : path.resolve(process.cwd(), resource.filePath);

        // Check if file already exists
        if (fs.existsSync(absolutePath)) {
          console.log(`✓ File already exists: ${resource.title}`);
          existingCount++;
          continue;
        }

        // Create directory if it doesn't exist
        const dir = path.dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`  Created directory: ${dir}`);
        }

        // Create placeholder file based on file type
        const ext = path.extname(absolutePath).toLowerCase();
        let placeholderContent = '';

        if (ext === '.pdf') {
          // Create a minimal PDF placeholder (PDF header)
          placeholderContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Size 1\n>>\nstartxref\n9\n%%EOF');
        } else if (['.mp3', '.wav', '.m4a', '.ogg'].includes(ext)) {
          // Create a minimal audio placeholder (empty file or tiny audio header)
          placeholderContent = Buffer.from('PLACEHOLDER_AUDIO_FILE');
        } else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
          // Create a minimal video placeholder
          placeholderContent = Buffer.from('PLACEHOLDER_VIDEO_FILE');
        } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          // Create a minimal image placeholder (1x1 pixel)
          if (ext === '.png') {
            // Minimal PNG: 1x1 transparent pixel
            placeholderContent = Buffer.from([
              0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
              0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
              0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
              0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
              0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
              0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
              0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
              0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
              0x42, 0x60, 0x82
            ]);
          } else {
            placeholderContent = Buffer.from('PLACEHOLDER_IMAGE_FILE');
          }
        } else {
          // Generic placeholder for other file types
          placeholderContent = Buffer.from(`This is a placeholder file for: ${resource.title}\n\nFile will be uploaded soon.`);
        }

        // Write placeholder file
        fs.writeFileSync(absolutePath, placeholderContent);
        console.log(`✓ Created placeholder: ${resource.title}`);
        createdCount++;
      } catch (err) {
        console.error(`✗ Error creating file for "${resource.title}":`, err.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Complete!`);
    console.log(`   - Created: ${createdCount} placeholder files`);
    console.log(`   - Already existed: ${existingCount} files`);
    console.log(`   - Errors: ${errorCount} files`);
    console.log(`\n⚠️  Note: These are placeholder files. Replace them with actual content files.`);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();

