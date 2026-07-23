# Store Enrollment SPA (Frontend + Backend)

A simple single-page application to enroll stores with all required details:

- Store name
- Phone 1, Phone 2, Phone 3
- Image 1, Image 2, Image 3
- Address
- Open time and closing time
  - Time picker format: hh:mm AM/PM (example: 09:00 AM)
- Break time slots with start and end time
  - Multiple break slots can be added using the + Add Break Time button
- Current map location (latitude, longitude, Google Maps link)
- Memo 1, Memo 2, Memo 3, Memo 4
  - Memo 1, Memo 2, Memo 3, Memo 4 are file upload fields
  - Allowed memo file types: PDF, DOC, DOCX, TXT
- Category (single category + extra categories): vegatable, fruits, food, medicies
  - Extra categories: veg, non-veg
- Service time options: breakfast, lunch, snack, dinner

## Tech Stack

- Backend: Node.js + Express + Multer
- Frontend: HTML + CSS + Vanilla JavaScript (single page)
- Storage:
  - JSON file for store records: data/stores.json
  - Uploaded images: Cloudinary (when configured) or local uploads/

## Project Structure

- server.js -> backend server and API
- public/index.html -> SPA form UI
- public/styles.css -> styling
- public/app.js -> frontend logic and API calls
- data/stores.json -> stored records
- uploads/ -> uploaded images

## Run the App

1. Install dependencies (already done once):

   npm install

2. Optional: configure Cloudinary for image hosting:

  Copy `.env.example` to `.env` and set your values.

  CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>

3. Start app:

   npm start

4. Open browser:

   http://localhost:3000

## API Endpoints

- GET /api/health
  - Returns API health status

- GET /api/stores
  - Returns all enrolled stores

- POST /api/stores
  - Accepts multipart form data
  - File fields: image1, image2, image3
  - File fields: memo1File, memo2File, memo3File, memo4File
  - Text fields:
    - storeName
    - address
    - openTime
    - closingTime
    - phones (JSON array)
    - memos (JSON array)
    - categories (JSON array)
    - serviceTimes (JSON array)
    - breakTimes (JSON array of { start, end })
    - latitude
    - longitude
    - mapUrl

## Validation Rules

- storeName required (min 2 chars)
- address required (min 5 chars)
- at least one phone required
- at least one category required
- at least one service time required
- only image files accepted for uploads
- max file size 5MB per image

## Notes

- Current location button uses browser geolocation permission.
- Data is stored locally in a JSON file for simplicity.
- If Cloudinary credentials are set, image uploads are stored on Cloudinary and saved with secure URLs.
- This is a simple starter app and can be upgraded to database storage later.

## Responsive UI Targets

- Mobile screens: 360px, 390px, 412px width
- Tablet screen: 768px width
- Desktop screens: 1024px and above
- The UI uses a classic professional layout with responsive spacing, typography, and form controls for all above sizes.
