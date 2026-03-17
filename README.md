# Baze MSSN Repository Platform

A full-stack web application built for the **Muslim Students Society of Nigeria (MSSN)** at Baze.  
The platform provides a central hub for managing **resources, announcements, donations, calendar events, live meetings, and user access control**.

---

## ✨ Recent Updates

### Version 1.1.0
- ✅ **Enhanced Donations**: Added direct bank transfer option alongside Paystack
  - Users can now choose between Paystack online payment or direct bank transfer
  - Bank details displayed for First Bank transfers
  - Direct transfers marked as PENDING for admin verification
- ✅ **Improved Resource Management**: 
  - Admins can now view and edit all resources they uploaded, even if files are temporarily unavailable
  - Better error handling for missing files
  - Admins see helpful warnings when files are missing, allowing them to fix paths or re-upload

---

## 🚀 Features

### Public Features
- 📚 **Resources Repository** – Browse, preview, and download PDFs, audio lectures, and videos (up to 1GB per file)
- 📢 **Announcements** – Stay informed with the latest news and updates
- 📅 **Calendar Events** – View upcoming lectures, meetings, and community events
- 📹 **Live Meetings** – Join video and voice meetings with Jitsi Meet (completely free, no setup required)
- ❤️ **Secure Donations** – Multiple payment options: Paystack online payments and direct bank transfer

### Authenticated Users
- 👤 **Profile Management** – View profile, update password, and see assigned RBAC roles
- 🔔 **Notifications** – Receive real-time notifications for announcements and important updates
- 🔒 **Change Password** – Users can securely update their login credentials
- 📥 **Resource Downloads** – Download and preview all available resources

### Admin & Executive Features
- 📊 **Dashboard** – Comprehensive overview of users, resources, donations, announcements, and meetings
- 👥 **User Management**
  - Onboard new users
  - Reset passwords
  - Update roles and permissions
  - Delete accounts
- 🔑 **RBAC (Role-Based Access Control)**
  - Create, update, and delete roles
  - Assign/remove permissions for each role
  - Assign/remove roles for users
  - Granular permission system
- 📂 **Resource Management**
  - Upload resources (PDFs, audio, video up to 1GB)
  - Edit resource details and replace files
  - Organize by categories
  - Preview and download tracking
  - Delete resources
  - Admin visibility: Admins can view and edit all resources, even if files are temporarily unavailable
- 📢 **Announcements**
  - Create, edit, and publish announcements
  - Public/private visibility control
  - Automatic notifications to all users when published
- 📅 **Calendar Events**
  - Create and manage calendar events
  - Event types: Lecture, Meeting, Event, Holiday, Other
  - Public/private visibility
  - Date and time scheduling
- 📹 **Live Meetings**
  - Create video and voice meetings
  - Role-based access control (Executive only, Member only, or both)
  - Jitsi Meet integration (free, unlimited participants)
  - Meeting scheduling and management
- 💰 **Donations**
  - Track all donations
  - Export to CSV
  - **Payment Methods**:
    - Paystack online payments (automatic verification)
    - Direct bank transfer (First Bank - manual verification by admins)
  - Automatic notifications for new donations

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js  
- **Templating**: EJS  
- **Database**: Sequelize ORM (MySQL/Postgres/SQLite supported)  
- **File Storage**: Local file system with Multer for uploads (1GB limit)
- **Auth & Security**:
  - Session-based authentication
  - CSRF protection
  - Helmet for security headers
  - Password hashing with bcrypt
- **UI**: Bootstrap 5 + Bootstrap Icons  
- **RBAC**: Roles & Permissions model with UserRole and RolePermission tables  
- **Payments**: 
  - Paystack API integration for online payments
  - Direct bank transfer support (First Bank)  
- **Video Meetings**: Jitsi Meet (via meet.jit.si - free public instance)

---

## 📂 Project Structure

```
├── server.js              # App entry point
├── src/
│   ├── models/           # Sequelize models (User, Role, Permission, Resource, Announcement, CalendarEvent, Meeting, etc.)
│   ├── routes/           # Express routes (auth, admin, rbac, repository, announcements, calendar, meetings, etc.)
│   ├── middleware/       # Auth & RBAC middleware
│   ├── services/         # Business logic services (notification, email, analytics)
│   └── views/            # EJS templates
│       ├── layout.ejs    # Main layout
│       ├── partials/     # Flash messages, reusable UI components
│       ├── admin/        # Admin dashboard, users, rbac, resources, etc.
│       ├── repository/   # Resource list, upload, edit, preview
│       ├── announcements/# Announcements pages
│       ├── calendar/     # Calendar events pages
│       ├── meetings/     # Live meetings pages
│       ├── donations/    # Donations page (Paystack & direct transfer)
│       └── notifications/# Notifications pages
├── public/               # Static assets (css, images, logos)
├── uploads/              # Uploaded files (resources)
└── scripts/              # DB seeding scripts
    ├── db-setup.js       # Consolidated database setup
    └── seed-all.js       # Consolidated seed runner
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/ammusawa/MSSN-WEB-APP.git
cd MSSN-WEB-APP
npm install
```

### 2. Configure environment variables

Create a `.env` file in the root directory:

```env
# Server
PORT=3000
BASE_URL=http://127.0.0.1:3000
SESSION_SECRET=your_secret_key_here

# Database (choose one)
# For MySQL:
DB_DIALECT=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=mssn_repo

# For SQLite (development):
# DB_DIALECT=sqlite
# DB_STORAGE=./dev.sqlite3

# Paystack (for donations)
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx

# Email (optional, for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@mssn-baze.com
```

### 3. Setup database and seed data

**Quick setup (recommended):**
```bash
npm run db    # Creates database (MySQL) and syncs schema
npm run seed  # Seeds all initial data (admin, categories, RBAC, sample data)
```

**Manual setup (step by step):**
```bash
npm run create-db        # Create MySQL database (if using MySQL)
npm run sync             # Sync database schema
npm run seed:admin       # Create default superuser
npm run seed:categories  # Seed resource categories
npm run seed:rbac        # Seed roles and permissions
npm run seed:ann         # Seed sample announcement
npm run seed:calendar    # Seed sample calendar events
```

### 4. Start the development server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## 📝 Available Scripts

### Main Commands
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run db` - **Consolidated database setup** (create DB + sync schema)
- `npm run seed` - **Seed all initial data** (admin, categories, RBAC, sample data)

### Individual Database Scripts
- `npm run create-db` - Create MySQL database
- `npm run sync` - Sync database schema

### Individual Seed Scripts
- `npm run seed:admin` - Create default admin user
- `npm run reset:admin` - Reset admin password to default
- `npm run seed:categories` - Seed resource categories
- `npm run seed:rbac` - Seed roles and permissions
- `npm run seed:ann` - Seed sample announcement
- `npm run seed:calendar` - Seed sample calendar events
- `npm run seed:sample` - Seed sample resource
- `npm run seed:islamic` - Seed Islamic resources

---

## 👤 Default Superuser

After running the seed scripts, you can login with:

- **Email**: `admin@example.com`
- **Username**: `admin`
- **Password**: `admin1234`
- **Role**: Superuser (bypasses all permission checks)

> ⚠️ **Important**: Change the default password after first login in production!

---

## 🔑 Key Features Explained

### File Upload & Resource Management
- **Maximum file size**: 1GB per file
- **Supported formats**: PDF, MP3, WAV, M4A, MP4, MKV, MOV, AVI, ZIP, RAR, 7Z
- **Storage**: Local file system in `uploads/resources/`
- **Preview**: PDFs can be previewed in-browser, videos and audio can be streamed
- **Admin Features**: 
  - Admins can view and edit all resources they uploaded, even if files are temporarily missing
  - This allows admins to fix file paths or re-upload files when needed
  - Regular users see "File will be available soon" for missing files

### Donations
- **Paystack Integration**: 
  - Secure online payments with automatic verification
  - Supports all major payment methods (cards, bank transfer, USSD, etc.)
- **Direct Bank Transfer**:
  - Bank: First Bank of Nigeria
  - Account Name: Baze MSSN
  - Donations are recorded as PENDING until manually verified by admins
  - Users receive confirmation after submitting transfer details
- **Admin Features**:
  - View all donations (successful, pending, failed)
  - Export donations to CSV
  - Manual verification of direct transfers
  - Automatic notifications for new donations

### Notifications
- Real-time notifications for:
  - New announcements (when published)
  - New resource uploads
  - Donation receipts (both Paystack and direct transfers)
- Email notifications (optional, requires SMTP configuration)

### Calendar Events
- Create events with:
  - Title, description, location
  - Start and end date/time
  - Event type (Lecture, Meeting, Event, Holiday, Other)
  - Public/private visibility
- View upcoming events with date filtering

### Live Meetings
- **Free video/voice calls** using Jitsi Meet
- No setup or configuration required
- Unlimited participants
- Role-based access control
- Meeting scheduling with start/end times

### RBAC System
- **Roles**: Admin, Executive, Member
- **Permissions**:
  - `admin.access` - Access admin area
  - `repo.upload` - Upload resources
  - `ann.create` - Create announcements
  - `don.view` - View donations
- Custom roles and permissions can be created via admin panel
- Superuser role bypasses all permission checks

---

## 📱 Usage

### For Admins

1. **Manage Users**: Navigate to Admin → Users to add, edit, or remove users
2. **Upload Resources**: Go to Resources → Upload to add new files
3. **Create Announcements**: Go to Announcements → Create to publish news
4. **Manage Events**: Go to Calendar → Create Event to schedule activities
5. **Create Meetings**: Go to Live Meetings → Create Meeting for video calls
6. **Configure RBAC**: Go to Admin → RBAC to manage roles and permissions

### For Executives

- Upload and edit resources
- Create announcements
- Create calendar events
- Create live meetings

### For Members

- Browse and download resources
- View announcements
- View calendar events
- Join live meetings (based on access permissions)
- Make donations via Paystack or direct bank transfer

---

## 🔒 Security Features

- ✅ CSRF protection on all state-changing requests
- ✅ Password hashing with bcrypt
- ✅ Session-based authentication
- ✅ Helmet.js security headers
- ✅ Input validation and sanitization
- ✅ Role-based access control (RBAC)
- ✅ Secure file upload handling

---

## 🌐 Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `3000` |
| `BASE_URL` | Base URL for the application | No | `http://127.0.0.1:3000` |
| `SESSION_SECRET` | Secret for session encryption | **Yes** | - |
| `DB_DIALECT` | Database type (mysql/sqlite/postgres) | **Yes** | `sqlite` |
| `DB_HOST` | Database host | MySQL only | `localhost` |
| `DB_PORT` | Database port | MySQL only | `3306` |
| `DB_USER` | Database username | MySQL only | `root` |
| `DB_PASSWORD` | Database password | MySQL only | - |
| `DB_NAME` | Database name | **Yes** | `mssn_repo` |
| `DB_STORAGE` | SQLite file path | SQLite only | `./dev.sqlite3` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | Donations | - |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | Donations | - |
| `SMTP_HOST` | SMTP server | Email | - |
| `SMTP_PORT` | SMTP port | Email | `587` |
| `SMTP_USER` | SMTP username | Email | - |
| `SMTP_PASS` | SMTP password | Email | - |
| `SMTP_FROM` | From email address | Email | - |

---

## 🐛 Troubleshooting

### Database Connection Issues

**MySQL:**
- Ensure MySQL server is running
- Verify `DB_USER` and `DB_PASSWORD` in `.env`
- Check that user has permission to create databases
- Verify `DB_HOST` and `DB_PORT` are correct

**SQLite:**
- Ensure write permissions in the project directory
- Check that `DB_STORAGE` path is correct

### File Upload Issues

- Ensure `uploads/resources/` directory exists and is writable
- Check file size is under 1GB
- Verify file extension is allowed
- **Admin Note**: If you see "File will be available soon" for resources you uploaded, you can still edit them to fix the file path or re-upload the file

### Session/CSRF Issues

- Ensure `SESSION_SECRET` is set in `.env`
- Clear browser cookies if experiencing authentication issues
- Check that session store is working properly

### Payment/Donation Issues

**Paystack:**
- Verify `PAYSTACK_SECRET_KEY` is set correctly in `.env`
- Check that `BASE_URL` matches your actual domain (for webhook callbacks)
- Ensure you're using the correct keys (test vs. live)

**Direct Transfer:**
- Direct transfer donations are marked as PENDING
- Admins need to manually verify these donations after confirming the bank transfer
- Users will see a confirmation message after submitting their donation details

---

## 📄 License

This project is proprietary software for Baze MSSN.

---

## 👨‍💻 Author

For any issues or questions, contact: **abbaphy@gmail.com**

---

## 🙏 Acknowledgments

- Built with Node.js and Express.js
- UI powered by Bootstrap 5
- Video meetings powered by Jitsi Meet
- Payments processed by Paystack

---

**Made with ❤️ for Baze MSSN**
