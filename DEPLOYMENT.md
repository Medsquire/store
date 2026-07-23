# Store Enrollment Application

A full-stack Store Enrollment management system built with Node.js, Express, SQL Server, and Leaflet.js maps.

## Features

✅ **Store Registration Form** - Multi-section enrollment form with:
- Basic Information (name, category, phone numbers)
- Store Details (address, location picker, operating hours)
- Menu Management (add items with pricing)
- Image uploads to Imgbb
- Break times and service time selection

✅ **Location Mapping** - Interactive Leaflet.js map with:
- Click-to-place markers
- Drag-to-adjust markers
- GPS current location capture
- Real-time coordinate display

✅ **Database Integration** - SQL Server backend with:
- 5 normalized tables (Stores, BreakTimes, MenuItems, Images, MenuFiles)
- 3 stored procedures (Create, GetAll, GetById)
- Automatic validation and error handling

✅ **Image Hosting** - Imgbb cloud storage with:
- Automatic base64 encoding
- Public URLs for database storage
- Fallback to local /uploads

✅ **Responsive Design** - Modern UI with:
- Mobile-friendly forms
- 12-hour time format (AM/PM)
- Real-time data validation
- Success/error notifications

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQL Server (Azure Cloud)
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Maps:** Leaflet.js v1.9.4
- **Image Storage:** Imgbb API
- **Hosting:** Vercel (Node.js)
- **Date/Time:** Flatpickr

---

## Deployment to Vercel

### Prerequisites

1. **Git & GitHub account** - Push code to GitHub
2. **Vercel account** - Sign up at [vercel.com](https://vercel.com)
3. **Environment Variables** - Prepare your .env values:
   - `DB_SERVER` - SQL Server host
   - `DB_PORT` - Usually 1433
   - `DB_DATABASE` - Database name
   - `DB_USER` - Database username
   - `DB_PASSWORD` - Database password
   - `Imgbb_API` - Your Imgbb API key

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Store Enrollment app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/store-enrollment.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select "Import Git Repository"
4. Paste your GitHub repo URL
5. Click "Import"

### Step 3: Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

```
DB_SERVER=13.204.39.91
DB_PORT=1433
DB_DATABASE=store.health
DB_USER=sa
DB_PASSWORD=dev1@dms
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_IDLE_TIMEOUT=30000
Imgbb_API=37bda322a74f0fd35f2f0e0631cbf5ea
NODE_ENV=production
PORT=3000
```

### Step 4: Deploy

1. Click "Deploy"
2. Wait for deployment to complete (usually 1-2 minutes)
3. You'll get a live URL like: `https://store-enrollment.vercel.app`

---

## Your Deployment URL Structure

Once deployed, your app will be accessible at:

```
https://<project-name>.vercel.app
```

**Examples:**
- `https://store-enrollment.vercel.app` (if you named it "store-enrollment")
- `https://healthy-eluru.vercel.app` (custom subdomain)
- `https://<custom-domain>.com` (if you connect a custom domain)

---

## Storing URLs in Database

### Application URL
The base URL is automatically available in your frontend:
```javascript
// In your frontend code:
const APP_URL = window.location.origin; // Will be your Vercel URL
```

### Image URLs from Imgbb
Images are automatically stored with their Imgbb URLs in the database:
```javascript
{
  "originalName": "store.jpg",
  "url": "https://i.ibb.co/abc123/store.jpg",  // Imgbb URL
  "provider": "imgbb",
  "imgbbId": "abc123"
}
```

### Stored in Database
The `StoreImages` table stores:
- `FileName` - Original filename
- `FileUrl` - Full Imgbb URL (e.g., `https://i.ibb.co/...`)

---

## API Endpoints

### Create Store
```
POST /api/stores
Content-Type: multipart/form-data

Body:
- storeName: string
- phone1, phone2, phone3: string[]
- address: string
- latitude, longitude: number
- openTime, closingTime: string (AM/PM format)
- images: file[]
- menuFiles: file[]
- ... other fields
```

**Response:**
```json
{
  "message": "Store enrolled successfully.",
  "store": {
    "Id": 1,
    "Guid": "c260eddf-4be7-4c11-813b-64b980820731",
    "StoreName": "Healthy Food Center",
    "Latitude": 16.72,
    "Longitude": 81.1,
    ...
  }
}
```

### Get All Stores
```
GET /api/stores

Response: Array of store objects
```

### Get Store by ID
```
GET /api/stores/:guid

Response:
{
  "store": {...},
  "breakTimes": [...],
  "menuItems": [...],
  "images": [...],
  "menuFiles": [...]
}
```

### Upload Image
```
POST /api/upload-image
Content-Type: multipart/form-data

Body:
- image: file

Response:
{
  "image": {
    "originalName": "shop.jpg",
    "filename": "abc123",
    "url": "https://i.ibb.co/abc123/shop.jpg",
    "provider": "imgbb",
    "imgbbId": "abc123"
  }
}
```

---

## Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `DB_SERVER` | `13.204.39.91` | SQL Server host |
| `DB_PORT` | `1433` | SQL Server port |
| `DB_DATABASE` | `store.health` | Database name |
| `DB_USER` | `sa` | Database username |
| `DB_PASSWORD` | `dev1@dms` | Database password |
| `DB_ENCRYPT` | `false` | SSL encryption |
| `DB_TRUST_SERVER_CERTIFICATE` | `true` | Skip cert validation |
| `Imgbb_API` | Your API key | Image hosting service |
| `NODE_ENV` | `production` | Environment type |
| `PORT` | `3000` | Server port |

---

## File Structure

```
store_enrollment/
├── server.js              # Express server & API endpoints
├── package.json           # Dependencies
├── vercel.json           # Vercel deployment config
├── .vercelignore         # Files to exclude from deployment
├── .env                  # Environment variables (keep local)
├── lib/
│   └── database.js       # SQL Server connection pool
├── public/
│   ├── index.html        # Main form HTML
│   ├── app.js           # Frontend logic
│   └── styles.css       # Styling
└── data/
    └── stores.json      # Local backup (not used in cloud)
```

---

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Create .env file with your settings
echo "DB_SERVER=..." > .env
echo "Imgbb_API=..." >> .env

# Start server
npm start
```

Visit: http://localhost:5000

---

## Troubleshooting

### Database Connection Fails
- Check `DB_SERVER`, `DB_USER`, `DB_PASSWORD` in .env
- Ensure SQL Server allows connections from Vercel IPs (if using firewall)
- Test connection locally first

### Images Not Uploading
- Verify `Imgbb_API` key is valid and active
- Check Imgbb account quota (free tier has limits)
- Images will fallback to local storage if Imgbb fails

### Deployment Issues
- Check Vercel logs: Dashboard → Project → Deployments → View Logs
- Ensure all environment variables are set in Vercel
- Verify `vercel.json` configuration
- Check for syntax errors: `node -c server.js`

---

## Next Steps

After deployment:

1. **Update DNS Records** (optional)
   - Point your custom domain to Vercel
   - Update any references to the new URL

2. **Monitor Logs**
   - Vercel provides real-time logs
   - Check for errors and performance issues

3. **Scale Database** (if needed)
   - SQL Server connection pool settings in .env
   - Monitor concurrent connections

4. **Backup Data** (recommended)
   - Regularly backup your SQL Server database
   - Store image URLs with backup metadata

---

## Support

For issues or questions:
- Check server logs in Vercel dashboard
- Review browser console for frontend errors
- Test API endpoints with Postman or curl

---

**Deployment Status:** ✅ Ready for Vercel
**Last Updated:** July 23, 2026
