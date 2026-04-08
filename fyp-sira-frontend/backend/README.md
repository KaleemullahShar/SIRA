# SIRA CDR Analysis Platform - Backend API

Production-ready Node.js/Express backend for the SIRA (Smart Investigation & Record Analyzer) platform.

## Features

- JWT-based authentication with role-based access control
- CDR file upload and processing with EDA (Exploratory Data Analysis)
- Criminal database management
- Admin dashboard with real-time statistics
- Intelligence and pattern detection
- MongoDB database with optimized indexes

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string and other configs
```

3. Start MongoDB (make sure MongoDB is running locally or update MONGODB_URI in .env)

4. Run the development server:
```bash
npm run dev
```

5. Server will start on http://localhost:5000

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get user profile (requires auth)

### CDR Management
- `POST /api/cdr/upload` - Upload CDR CSV file
- `GET /api/cdr/files` - Get all CDR files
- `GET /api/cdr/files/:id` - Get specific file details
- `GET /api/cdr/files/:id/analytics` - Get analytics for file
- `DELETE /api/cdr/files/:id` - Delete CDR file

### Criminal Records
- `POST /api/criminal/records` - Add criminal record (admin only)
- `GET /api/criminal/records` - Get all records
- `GET /api/criminal/records/:id` - Get specific record
- `PUT /api/criminal/records/:id` - Update record (admin only)
- `DELETE /api/criminal/records/:id` - Delete record (admin only)

### Admin Dashboard
- `GET /api/admin/dashboard/stats` - Overall statistics
- `GET /api/admin/dashboard/weekly-activity` - Weekly trends
- `GET /api/admin/cdr-intelligence/overview` - Intelligence data

### Police Monitoring
- `GET /api/police/units` - Get all police units (admin only)
- `GET /api/police/users` - Get all users (admin only)

## Environment Variables

See `.env.example` for required environment variables.

## Production Deployment

1. Set `NODE_ENV=production` in .env
2. Use strong JWT secret
3. Configure MongoDB Atlas or production database
4. Set up proper CORS origin for frontend
5. Enable HTTPS

## License

ISC
