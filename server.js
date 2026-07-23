const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const db = require('./lib/database');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const IMGBB_API_KEY = process.env.Imgbb_API;
const imgbbEnabled = Boolean(IMGBB_API_KEY);

if (!imgbbEnabled) {
  console.warn('⚠️ WARNING: Imgbb_API key not found in .env. Image uploads will use local /uploads storage.');
} else {
  console.log('✓ Imgbb API enabled for image uploads');
}

let uploadsDir = path.join(__dirname, 'uploads');
let dataDir = path.join(__dirname, 'data');

try {
  // Attempt to create directories in the application root directory
  for (const dir of [uploadsDir, dataDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
} catch (err) {
  console.warn(`⚠️ Write access denied in ${__dirname}. Falling back to system temp directory.`);
  const tempDir = os.tmpdir();
  uploadsDir = path.join(tempDir, 'uploads');
  dataDir = path.join(tempDir, 'data');

  for (const dir of [uploadsDir, dataDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

const storesFile = path.join(dataDir, 'stores.json');
if (!fs.existsSync(storesFile)) {
  try {
    fs.writeFileSync(storesFile, '[]', 'utf-8');
  } catch (err) {
    console.error(`⚠️ Failed to create stores.json in ${dataDir}:`, err.message);
  }
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'menuFiles') {
      cb(null, true);
      return;
    }
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed'));
  }
});

function parseJsonField(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function readStores() {
  const raw = fs.readFileSync(storesFile, 'utf-8');
  return JSON.parse(raw);
}

function saveStores(stores) {
  fs.writeFileSync(storesFile, JSON.stringify(stores, null, 2), 'utf-8');
}

function normalizeTime12h(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim().toUpperCase().replace(/\s+/g, ' ');
  // Accept hours with or without leading zeros: 1-12 or 01-12
  const match = trimmed.match(/^(\d{1,2}):([0-5][0-9])\s?(AM|PM)$/);
  if (!match) {
    return '';
  }

  const hours = parseInt(match[1], 10);
  // Validate hour is between 1-12
  if (hours < 1 || hours > 12) {
    return '';
  }

  // Pad hour with leading zero if needed
  const paddedHour = String(hours).padStart(2, '0');
  return `${paddedHour}:${match[2]} ${match[3]}`;
}

function toMinutesFromTime12h(value) {
  // Accept hours with or without leading zeros: 1-12 or 01-12
  const match = value.match(/^(\d{1,2}):([0-5][0-9])\s(AM|PM)$/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  // Validate hour is between 1-12
  if (hours < 1 || hours > 12) {
    return null;
  }

  const minutes = Number(match[2]);
  const meridiem = match[3];

  if (hours === 12) {
    hours = 0;
  }
  if (meridiem === 'PM') {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function validateStore(payload) {
  const errors = [];

  if (!payload.storeName || payload.storeName.trim().length < 2) {
    errors.push('Store name is required (min 2 chars).');
  }

  if (!payload.address || payload.address.trim().length < 5) {
    errors.push('Address is required (min 5 chars).');
  }

  if (!Array.isArray(payload.phones) || payload.phones.length === 0) {
    errors.push('At least one phone number is required.');
  }

  if (!Array.isArray(payload.categories) || payload.categories.length === 0) {
    errors.push('At least one category is required.');
  }

  if (!Array.isArray(payload.serviceTimes) || payload.serviceTimes.length === 0) {
    errors.push('Select at least one service time (breakfast/lunch/snack/dinner).');
  }

  if (!payload.openTime) {
    errors.push('Open time is required.');
  }

  if (!payload.closingTime) {
    errors.push('Closing time is required.');
  }

  if (payload.openTime && toMinutesFromTime12h(payload.openTime) === null) {
    errors.push('Open time must be in AM/PM format (example: 09:00 AM).');
  }

  if (payload.closingTime && toMinutesFromTime12h(payload.closingTime) === null) {
    errors.push('Closing time must be in AM/PM format (example: 06:30 PM).');
  }

  const openMinutes = toMinutesFromTime12h(payload.openTime);
  const closingMinutes = toMinutesFromTime12h(payload.closingTime);

  if (openMinutes !== null && closingMinutes !== null && closingMinutes <= openMinutes) {
    errors.push('Closing time must be later than open time.');
  }

  if (Array.isArray(payload.breakTimes)) {
    payload.breakTimes.forEach((slot, index) => {
      const start = normalizeTime12h(slot.start);
      const end = normalizeTime12h(slot.end);

      if (!start || !end) {
        errors.push(`Break time ${index + 1} must include valid start and end in AM/PM format.`);
        return;
      }

      const startMinutes = toMinutesFromTime12h(start);
      const endMinutes = toMinutesFromTime12h(end);

      if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        errors.push(`Break time ${index + 1} end time must be later than start time.`);
      }
    });
  }

  return errors;
}

async function buildImageRecord(file) {
  const localRecord = {
    originalName: file.originalname,
    filename: file.filename,
    url: `/uploads/${file.filename}`,
    provider: 'local'
  };

  if (!imgbbEnabled) {
    return localRecord;
  }

  try {
    // Read file and upload to Imgbb
    const fileData = fs.readFileSync(file.path);
    const base64Data = fileData.toString('base64');

    const formData = new FormData();
    formData.append('image', base64Data);
    formData.append('key', IMGBB_API_KEY);
    formData.append('name', file.originalname);

    const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
      headers: formData.getHeaders(),
      timeout: 30000
    });

    if (response.data && response.data.success && response.data.data) {
      const imgbbData = response.data.data;
      
      // Delete local file after successful upload
      try {
        fs.unlinkSync(file.path);
      } catch {
        // Ignore cleanup errors
      }

      return {
        originalName: file.originalname,
        filename: imgbbData.id,
        url: imgbbData.url,
        provider: 'imgbb',
        imgbbId: imgbbData.id,
        deleteUrl: imgbbData.delete_url
      };
    } else {
      console.error(`[IMGBB] Upload failed for ${file.originalname}:`, response.data?.error?.message || 'Unknown error');
      return localRecord;
    }
  } catch (err) {
    console.error(`[IMGBB] ERROR uploading ${file.originalname}: ${err.message}`);
    return localRecord;
  }
}

app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    console.log('[UPLOAD] Received image upload request');
    
    if (!req.file) {
      console.log('[UPLOAD] ERROR: No file in request');
      return res.status(400).json({ error: 'Image file is required.' });
    }

    console.log(`[UPLOAD] Processing file: ${req.file.originalname} (${req.file.size} bytes)`);
    
    const image = await buildImageRecord(req.file);
    
    console.log(`[UPLOAD] SUCCESS: Image uploaded with provider: ${image.provider}`);
    return res.status(201).json({ image });
  } catch (err) {
    console.error('[UPLOAD] ERROR:', err.message);
    return res.status(500).json({ error: 'Failed to upload image.', details: err.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Store enrollment API is running.' });
});

app.get('/api/stores', async (_req, res) => {
  try {
    console.log('[STORES] GET /api/stores called');
    const result = await db.executeStoredProcedure('dbo.spGetAllStore', {
      Status: null,
      Created_By: null
    });
    
    console.log('[STORES] Recordset count:', result.recordset?.length || 0);
    console.log('[STORES] Result:', JSON.stringify(result.recordset || [], null, 2));
    
    res.json(result.recordset || []);
  } catch (err) {
    console.error('[STORES] ERROR:', err.message);
    res.status(500).json({ error: 'Failed to fetch stores.', details: err.message });
  }
});

app.get('/api/stores/:guid', async (req, res) => {
  try {
    const { guid } = req.params;
    const result = await db.executeStoredProcedure('dbo.spGetAllStoreByGuid', {
      Guid: guid
    });

    if (!result.recordsets || result.recordsets.length === 0 || result.recordsets[0].length === 0) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const [stores, breakTimes, menuItems, images, menuFiles] = result.recordsets;

    res.json({
      store: stores[0],
      breakTimes,
      menuItems,
      images,
      menuFiles
    });
  } catch (err) {
    console.error('Error fetching store:', err.message);
    res.status(500).json({ error: 'Failed to fetch store.', details: err.message });
  }
});

app.post('/api/stores', upload.fields([
  { name: 'images', maxCount: 12 },
  { name: 'menuFiles', maxCount: 12 }
]), async (req, res) => {
  try {
    const storeName = String(req.body.storeName || '').trim();
    const address = String(req.body.address || '').trim();
    const mainCategory = String(req.body.categorySingle || '').trim();
    
    // Parse phones array from JSON or individual fields
    let phones = [];
    if (req.body.phones) {
      try {
        phones = JSON.parse(req.body.phones).filter(p => String(p).trim());
      } catch {
        phones = [String(req.body.phones).trim()].filter(Boolean);
      }
    }
    if (phones.length === 0) {
      // Fallback to individual fields
      const phone1 = String(req.body.phone1 || '').trim();
      const phone2 = String(req.body.phone2 || '').trim() || null;
      const phone3 = String(req.body.phone3 || '').trim() || null;
      if (phone1) phones.push(phone1);
      if (phone2) phones.push(phone2);
      if (phone3) phones.push(phone3);
    }
    
    const [phone1, phone2 = null, phone3 = null] = phones;
    
    // Validate phone numbers (exactly 10 digits)
    const phoneNumbers = [phone1, phone2, phone3].filter(Boolean);
    for (const phoneNum of phoneNumbers) {
      if (!/^\d{10}$/.test(String(phoneNum).trim())) {
        console.error('[STORE] Invalid phone format:', phoneNum);
        return res.status(400).json({
          message: 'Validation failed.',
          errors: ['All phone numbers must be exactly 10 digits.']
        });
      }
    }
    
    const openTime = normalizeTime12h(req.body.openTime);
    const closingTime = normalizeTime12h(req.body.closingTime);
    const latitude = req.body.latitude ? Number(req.body.latitude) : null;
    const longitude = req.body.longitude ? Number(req.body.longitude) : null;
    const mapUrl = String(req.body.mapUrl || '').trim() || null;

    // JSON arrays for complex fields
    const extraCategories = parseJsonField(req.body.categories, []).filter(Boolean);
    const serviceTimes = parseJsonField(req.body.serviceTimes, []).filter(Boolean);

    // Break times
    const breakTimes = parseJsonField(req.body.breakTimes, [])
      .map((slot) => ({
        breakStart: normalizeTime12h(slot?.start || ''),
        breakEnd: normalizeTime12h(slot?.end || '')
      }))
      .filter((slot) => slot.breakStart || slot.breakEnd);

    // Menu items
    const manualItems = parseJsonField(req.body.manualItems, [])
      .map((entry) => ({
        itemName: String(entry?.item || '').trim(),
        quality: String(entry?.quality || '').trim() || null,
        serve: String(entry?.serve || '').trim() || null,
        price: entry?.price === '' || entry?.price === null || entry?.price === undefined ? null : Number(entry.price)
      }))
      .filter((entry) => entry.itemName);

    // Uploaded images (from previous uploads)
    const uploadedImages = parseJsonField(req.body.uploadedImages, []);
    const images = [];

    for (const existing of uploadedImages) {
      const existingUrl = String(existing?.url || '').trim();
      if (existingUrl) {
        images.push({
          fileName: String(existing?.originalName || 'image'),
          fileUrl: existingUrl
        });
      }
    }

    // New image files
    const imageFiles = req.files?.images || [];
    for (const file of imageFiles) {
      const image = await buildImageRecord(file);
      images.push({
        fileName: image.originalName,
        fileUrl: image.url
      });
    }

    // Menu files
    const menuFilesList = (req.files?.menuFiles || []).map((file) => ({
      fileName: file.originalname,
      fileUrl: `/uploads/${file.filename}`
    }));

    // Log the parameters
    console.log('[STORE] Calling spCreateStore with params:');
    const params = {
      StoreName: storeName,
      MainCategory: mainCategory || null,
      ExtraCategories: extraCategories.length > 0 ? JSON.stringify(extraCategories) : null,
      Phone1: phone1 || null,
      Phone2: phone2,
      Phone3: phone3,
      Address: address,
      Latitude: latitude,
      Longitude: longitude,
      MapUrl: mapUrl,
      OpenTime: openTime,
      ClosingTime: closingTime,
      ServiceTimes: serviceTimes.length > 0 ? JSON.stringify(serviceTimes) : null,
      BreakTimes: breakTimes.length > 0 ? JSON.stringify(breakTimes) : null,
      MenuItems: manualItems.length > 0 ? JSON.stringify(manualItems) : null,
      Images: images.length > 0 ? JSON.stringify(images) : null,
      MenuFiles: menuFilesList.length > 0 ? JSON.stringify(menuFilesList) : null,
      Created_By: null
    };
    console.log('[STORE] Params:', JSON.stringify(params, null, 2));
    
    const result = await db.executeStoredProcedure('dbo.spCreateStore', params);

    console.log('[STORE] Result recordsets:', result.recordsets?.length || 0);
    console.log('[STORE] Result recordset rows:', (result.recordset || []).length);
    
    const records = result.recordset || [];
    if (records.length === 0) {
      console.log('[STORE] ERROR: Stored procedure returned empty recordset');
      return res.status(500).json({ error: 'Failed to create store.', details: 'Stored procedure returned no records' });
    }

    console.log('[STORE] SUCCESS: Store created', records[0].Guid);
    return res.status(201).json({
      message: 'Store enrolled successfully.',
      store: records[0]
    });
  } catch (err) {
    console.error('[STORE] ERROR creating store:', err.message);
    console.error('[STORE] Full error:', err);
    if (err.message.includes('Store name is required')) {
      return res.status(400).json({ error: 'Store name is required.' });
    }
    if (err.message.includes('Phone 1 is required')) {
      return res.status(400).json({ error: 'Phone 1 is required.' });
    }
    if (err.message.includes('Address is required')) {
      return res.status(400).json({ error: 'Address is required.' });
    }
    if (err.message.includes('Open time is required')) {
      return res.status(400).json({ error: 'Open time is required.' });
    }
    if (err.message.includes('Closing time is required')) {
      return res.status(400).json({ error: 'Closing time is required.' });
    }
    return res.status(500).json({ error: 'Failed to create store.', details: err.message });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
