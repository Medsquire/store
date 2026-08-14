const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const { randomUUID } = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection setup
const MONGODB_URI = process.env.MONGODB_URI || `mongodb+srv://${process.env.MONGODB_USER || 'healthyeluru'}:${process.env.MONGODB_PASSWORD}@project.emlrxdt.mongodb.net/healthyeluru?retryWrites=true&w=majority&appName=healthyeluru`;
const MONGODB_DB = process.env.MONGODB_DB || 'healthyeluru';
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || 'orders';
const MONGODB_STORE_COLLECTION = process.env.MONGODB_STORE_COLLECTION || 'enrollment';
const MONGODB_ERROR_COLLECTION = process.env.MONGODB_ERROR_COLLECTION || 'errorlog';
const MONGODB_ACTIVE_COLLECTION = process.env.MONGODB_ACTIVE_COLLECTION || 'active';

let mongoClient;
let ordersCollection;
let pricelistCollection;
let storeEnrollmentCollection;
let errorLogCollection;
let activeStatusCollection;

// Returns the orders collection, connecting on demand (safe for Vercel cold starts)
let connectPromise = null;
async function getCollections() {
  if (ordersCollection && pricelistCollection && storeEnrollmentCollection && errorLogCollection && activeStatusCollection) {
    return { ordersCollection, pricelistCollection, storeEnrollmentCollection, errorLogCollection, activeStatusCollection };
  }
  if (!connectPromise) {
    connectPromise = (async () => {
      if (!process.env.MONGODB_URI && !process.env.MONGODB_PASSWORD) {
        throw new Error('Set MONGODB_URI or MONGODB_PASSWORD environment variable');
      }
      mongoClient = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      await mongoClient.connect();
      console.log('✓ MongoDB connected successfully');
      const db = mongoClient.db(MONGODB_DB);
      ordersCollection    = db.collection(MONGODB_COLLECTION);
      pricelistCollection = db.collection('pricelist');
      storeEnrollmentCollection = db.collection(MONGODB_STORE_COLLECTION);
      errorLogCollection = db.collection(MONGODB_ERROR_COLLECTION);
      activeStatusCollection = db.collection(MONGODB_ACTIVE_COLLECTION);
      console.log(`✓ Connected to collections: ${MONGODB_COLLECTION}, pricelist, ${MONGODB_STORE_COLLECTION}, ${MONGODB_ERROR_COLLECTION}, ${MONGODB_ACTIVE_COLLECTION}`);
    })().catch(err => {
      console.error('✗ MongoDB connection error:', err.message);
      connectPromise = null; // allow retry on next request
      throw err;
    });
  }
  await connectPromise;
  return { ordersCollection, pricelistCollection, storeEnrollmentCollection, errorLogCollection, activeStatusCollection };
}

async function getDutyStatusDocument() {
  const { activeStatusCollection: col } = await getCollections();
  return col.findOne({}, { sort: { _id: 1 } });
}

function buildRequestContext(req) {
  if (!req) {
    return null;
  }

  return {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.headers['x-forwarded-for'] || req.ip,
    userAgent: req.headers['user-agent'] || null,
  };
}

async function writeErrorLog(entry) {
  try {
    const { errorLogCollection: col } = await getCollections();
    const result = await col.insertOne({
      ...entry,
      createdAt: new Date(),
    });
    return result.insertedId ? String(result.insertedId) : null;
  } catch (logErr) {
    console.error('[ERRORLOG] Failed to write log:', logErr.message);
    return null;
  }
}

// Warm up connection on startup (non-blocking; errors are retried per-request)
getCollections().catch(() => {});

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

// Serve React build only when running locally (Vercel CDN handles static files in production)
if (process.env.NODE_ENV !== 'production') {
  const clientDist = path.join(__dirname, 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
  }
}

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

function parseStringArrayField(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      // Accept non-JSON single string values.
    }

    return [trimmed];
  }

  return [];
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
    const image = await buildImageRecord(req.file);
    
    return res.status(201).json({ image });
  } catch (err) {
    console.error('[UPLOAD] ERROR:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'upload-image',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
    });
    return res.status(500).json({ error: 'Failed to upload image.', details: err.message });
  }
});

app.post('/api/errorlog', async (req, res) => {
  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    await writeErrorLog({
      source: payload.source || 'client',
      scope: payload.scope || 'frontend',
      message: String(payload.message || 'Unknown frontend error'),
      stack: payload.stack || null,
      level: payload.level || 'error',
      request: buildRequestContext(req),
      client: {
        path: payload.path || null,
        userAgent: payload.userAgent || req.headers['user-agent'] || null,
        timestamp: payload.timestamp || null,
      },
      details: payload.details || null,
    });
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[ERRORLOG] intake error:', err.message);
    return res.status(500).json({ error: 'Failed to write error log' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Store enrollment API is running.' });
});

app.get('/api/duty-status', async (req, res) => {
  try {
    const doc = await getDutyStatusDocument();
    const active = doc?.active === 1 ? 1 : 0;
    return res.json({ active, isOnDuty: active === 1 });
  } catch (err) {
    console.error('[DUTY] GET error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-duty-status',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
    });
    return res.status(500).json({ error: 'Failed to load duty status.' });
  }
});

app.put('/api/duty-status', async (req, res) => {
  try {
    const requested = req.body?.active;
    let active;

    if (requested === 1 || requested === '1' || requested === true) {
      active = 1;
    } else if (requested === 0 || requested === '0' || requested === false) {
      active = 0;
    } else {
      return res.status(400).json({ error: 'active must be 1 or 0.' });
    }

    const { activeStatusCollection: col } = await getCollections();
    const existing = await getDutyStatusDocument();

    if (existing?._id) {
      await col.updateOne(
        { _id: existing._id },
        { $set: { active, updatedAt: new Date() } }
      );
    } else {
      await col.insertOne({ active, updatedAt: new Date() });
    }

    return res.json({ active, isOnDuty: active === 1 });
  } catch (err) {
    console.error('[DUTY] PUT error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'update-duty-status',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { requestedActive: req.body?.active },
    });
    return res.status(500).json({ error: 'Failed to update duty status.' });
  }
});

app.get('/api/stores', async (_req, res) => {
  try {
    const { storeEnrollmentCollection: col } = await getCollections();

    const statusFilter = String(_req.query?.Status || _req.query?.status || '').trim();
    const createdByFilter = String(_req.query?.Created_By || _req.query?.created_by || '').trim();

    const filter = {
      $or: [{ IsDeleted: { $exists: false } }, { IsDeleted: false }]
    };

    if (statusFilter) {
      filter.Status = statusFilter;
    }

    if (createdByFilter) {
      filter.Created_By = createdByFilter;
    }

    const stores = await col
      .find(filter)
      .sort({ Created_On: -1 })
      .toArray();

    const legacyStores = stores.map((store, index) => ({
      Id: store.Id ?? index + 1,
      Guid: store.Guid || null,
      StoreName: store.StoreName || null,
      MainCategory: store.MainCategory || null,
      ExtraCategories: store.ExtraCategories || [],
      Phone1: store.Phone1 || null,
      Phone2: store.Phone2 || null,
      Phone3: store.Phone3 || null,
      Address: store.Address || null,
      Latitude: store.Latitude ?? null,
      Longitude: store.Longitude ?? null,
      MapUrl: store.MapUrl || null,
      OpenTime: store.OpenTime || null,
      ClosingTime: store.ClosingTime || null,
      ServiceTimes: store.ServiceTimes || [],
      Status: store.Status || 'Pending',
      Created_By: store.Created_By ?? null,
      Created_On: store.Created_On || null,
      Updated_On: store.Updated_On || null,
      IsDeleted: Boolean(store.IsDeleted),
    }));

    res.json(legacyStores);
  } catch (err) {
    console.error('[STORES] ERROR:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-stores',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(_req),
    });
    res.status(500).json({ error: 'Failed to fetch stores.', details: err.message });
  }
});

app.get('/api/stores/:guid', async (req, res) => {
  try {
    const { guid } = req.params;
    const { storeEnrollmentCollection: col } = await getCollections();

    const store = await col.findOne({
      Guid: guid,
      $or: [{ IsDeleted: { $exists: false } }, { IsDeleted: false }]
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    res.json({
      store,
      breakTimes: Array.isArray(store.BreakTimes) ? store.BreakTimes : [],
      menuItems: Array.isArray(store.MenuItems) ? store.MenuItems : [],
      images: Array.isArray(store.Images) ? store.Images : [],
      menuFiles: Array.isArray(store.MenuFiles) ? store.MenuFiles : []
    });
  } catch (err) {
    console.error('Error fetching store:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-store-by-guid',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { guid: req.params?.guid || null },
    });
    res.status(500).json({ error: 'Failed to fetch store.', details: err.message });
  }
});

app.post('/api/stores', upload.fields([
  { name: 'images', maxCount: 12 },
  { name: 'menuFiles', maxCount: 12 }
]), async (req, res) => {
  try {
    const { storeEnrollmentCollection: col } = await getCollections();

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
        const issueId = await writeErrorLog({
          source: 'server',
          scope: 'create-store-validation',
          message: 'Invalid phone format',
          request: buildRequestContext(req),
          details: { phoneNum },
          level: 'warn',
        });
        return res.status(400).json({
          error: 'Validation failed: All phone numbers must be exactly 10 digits.',
          message: 'Validation failed.',
          errors: ['All phone numbers must be exactly 10 digits.'],
          issueId,
        });
      }
    }
    
    const openTime = normalizeTime12h(req.body.openTime);
    const closingTime = normalizeTime12h(req.body.closingTime);
    const latitude = req.body.latitude ? Number(req.body.latitude) : null;
    const longitude = req.body.longitude ? Number(req.body.longitude) : null;
    const mapUrl = String(req.body.mapUrl || '').trim() || null;

    // JSON arrays for complex fields
    const extraCategories = parseStringArrayField(req.body.categories);
    const serviceTimes = parseStringArrayField(req.body.serviceTimes);

    // Break times
    const breakTimes = parseJsonField(req.body.breakTimes, [])
      .map((slot) => ({
        BreakStart: normalizeTime12h(slot?.start || ''),
        BreakEnd: normalizeTime12h(slot?.end || '')
      }))
      .filter((slot) => slot.BreakStart || slot.BreakEnd);

    // Menu items
    const manualItems = parseJsonField(req.body.manualItems, [])
      .map((entry) => ({
        ItemName: String(entry?.name || entry?.item || '').trim(),
        Quality: String(entry?.quality || '').trim() || null,
        Serve: String(entry?.serve || '').trim() || null,
        Price: entry?.price === '' || entry?.price === null || entry?.price === undefined ? null : Number(entry.price)
      }))
      .filter((entry) => entry.ItemName);

    // Uploaded images (from previous uploads)
    const uploadedImages = parseJsonField(req.body.uploadedImages, []);
    const images = [];

    for (const existing of uploadedImages) {
      const existingUrl = String(existing?.url || '').trim();
      if (existingUrl) {
        images.push({
          FileName: String(existing?.originalName || 'image'),
          FileUrl: existingUrl
        });
      }
    }

    // New image files
    const imageFiles = req.files?.images || [];
    for (const file of imageFiles) {
      const image = await buildImageRecord(file);
      images.push({
        FileName: image.originalName,
        FileUrl: image.url
      });
    }

    // Menu files
    const uploadedMenuFiles = parseJsonField(req.body.uploadedMenuFiles, []);
    const menuFilesList = [];

    for (const existing of uploadedMenuFiles) {
      const existingUrl = String(existing?.fileUrl || '').trim();
      if (existingUrl) {
        menuFilesList.push({
          FileName: String(existing?.fileName || 'menu'),
          FileUrl: existingUrl
        });
      }
    }

    const menuFiles = req.files?.menuFiles || [];
    for (const file of menuFiles) {
      if (imgbbEnabled && file.mimetype.startsWith('image/')) {
        const image = await buildImageRecord(file);
        menuFilesList.push({
          FileName: image.originalName,
          FileUrl: image.url
        });
      } else {
        menuFilesList.push({
          FileName: file.originalname,
          FileUrl: `/uploads/${file.filename}`
        });
      }
    }

    const validationErrors = validateStore({
      storeName,
      address,
      phones: [phone1, phone2, phone3].filter(Boolean),
      categories: [mainCategory, ...extraCategories].filter(Boolean),
      serviceTimes,
      openTime,
      closingTime,
      breakTimes: breakTimes.map(slot => ({ start: slot.BreakStart, end: slot.BreakEnd })),
    });

    if (validationErrors.length > 0) {
      const issueId = await writeErrorLog({
        source: 'server',
        scope: 'create-store-validation',
        message: 'Store validation failed',
        request: buildRequestContext(req),
        details: { validationErrors },
        level: 'warn',
      });
      return res.status(400).json({
        error: `Validation failed: ${validationErrors.join(' ')}`,
        message: 'Validation failed.',
        errors: validationErrors,
        issueId,
      });
    }

    const storeGuid = randomUUID();
    const now = new Date();

    const storeDocument = {
      Guid: storeGuid,
      StoreName: storeName,
      MainCategory: mainCategory || null,
      ExtraCategories: extraCategories,
      Phone1: phone1 || null,
      Phone2: phone2,
      Phone3: phone3,
      Address: address,
      Latitude: latitude,
      Longitude: longitude,
      MapUrl: mapUrl,
      OpenTime: openTime,
      ClosingTime: closingTime,
      ServiceTimes: serviceTimes,
      BreakTimes: breakTimes,
      MenuItems: manualItems,
      Images: images,
      MenuFiles: menuFilesList,
      Status: 'Pending',
      Created_By: null,
      Created_On: now,
      Updated_On: now,
      IsDeleted: false,
    };

    await col.insertOne(storeDocument);

    return res.status(201).json({
      message: 'Store enrolled successfully.',
      store: storeDocument
    });
  } catch (err) {
    console.error('[STORE] ERROR creating store:', err.message);
    const issueId = await writeErrorLog({
      source: 'server',
      scope: 'create-store',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
    });
    return res.status(500).json({
      error: 'Unable to save store right now. Please try again.',
      details: err.message,
      issueId,
    });
  }
});

// ===== MONGODB ORDERS API =====

// Temp debug: show collection stats and a sample doc
app.get('/api/debug-orders', async (_req, res) => {
  try {
    const { ordersCollection: col } = await getCollections();
    const total  = await col.countDocuments({});
    const sample = await col.find({}).limit(2).toArray();
    const cols   = await col.listIndexes().toArray();
    res.json({ total, sample, indexes: cols });
  } catch (err) {
    await writeErrorLog({
      source: 'server',
      scope: 'debug-orders',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(_req),
    });
    res.json({ error: err.message });
  }
});

app.get('/api/orders', async (_req, res) => {
  try {
    const { ordersCollection: col } = await getCollections();

    // Build today's date range in IST for the live dashboard.
    const istDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const todayStart = new Date(`${istDate}T00:00:00+05:30`);
    const todayEnd = new Date(`${istDate}T23:59:59.999+05:30`);

    // Handle both Date and string createdAt values from MongoDB.
    const orders = await col.aggregate([
      {
        $addFields: {
          createdAtDate: {
            $cond: [
              { $eq: [{ $type: '$createdAt' }, 'date'] },
              '$createdAt',
              {
                $dateFromString: {
                  dateString: '$createdAt',
                  onError: null,
                  onNull: null,
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          createdAtDate: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $sort: { createdAtDate: -1 } },
      { $project: { createdAtDate: 0 } },
    ]).toArray();

    res.json({ orders });
  } catch (err) {
    console.error('[ORDERS] ERROR fetching orders:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-orders',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(_req),
    });
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      details: err.message,
      orders: []
    });
  }
});

// Paginated order history (all orders, newest first)
app.get('/api/orders-history', async (req, res) => {
  try {
    const { ordersCollection: col } = await getCollections();

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      col.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments({}),
    ]);

    res.json({ orders, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[ORDERS-HISTORY] ERROR:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'orders-history',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { page: req.query?.page, limit: req.query?.limit },
    });
    res.status(500).json({ error: 'Failed to fetch order history', details: err.message, orders: [], total: 0 });
  }
});

app.get('/api/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { ordersCollection: col } = await getCollections();

    const order = await col.findOne({ id: orderId });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('[ORDERS] ERROR fetching order:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-order-by-id',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { orderId: req.params?.orderId || null },
    });
    res.status(500).json({ 
      error: 'Failed to fetch order',
      details: err.message
    });
  }
});

app.post('/api/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const { ordersCollection: col } = await getCollections();

    if (!['new', 'accepted', 'picked', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    let filter;
    try {
      filter = { _id: new ObjectId(orderId) };
    } catch {
      filter = { id: orderId };
    }

    const result = await col.updateOne(
      filter,
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, message: 'Order status updated' });
  } catch (err) {
    console.error('[ORDERS] ERROR updating order:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'update-order-status',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { orderId: req.params?.orderId || null, status: req.body?.status || null },
    });
    res.status(500).json({ 
      error: 'Failed to update order',
      details: err.message
    });
  }
});

// ===== PRICELIST API =====

// GET all items (optionally filter by category)
app.get('/api/pricelist', async (req, res) => {
  try {
    const { pricelistCollection: col } = await getCollections();
    const { category } = req.query;
    const filter = category ? { category } : {};
    const items = await col
      .find(filter)
      .sort({ category: 1, sku: 1 })
      .toArray();
    res.json({ items });
  } catch (err) {
    console.error('[PRICELIST] GET error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-pricelist',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { category: req.query?.category || null },
    });
    res.status(500).json({ error: 'Failed to fetch pricelist', items: [] });
  }
});

// GET distinct categories
app.get('/api/pricelist/categories', async (req, res) => {
  try {
    const { pricelistCollection: col } = await getCollections();
    const categories = await col.distinct('category');
    res.json({ categories: categories.filter(Boolean).sort() });
  } catch (err) {
    console.error('[PRICELIST] CATEGORIES error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'get-pricelist-categories',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
    });
    res.status(500).json({ error: 'Failed to fetch categories', categories: [] });
  }
});

// PUT update a single item's price
app.put('/api/pricelist/:itemId', async (req, res) => {
  try {
    const { pricelistCollection: col } = await getCollections();
    const { itemId } = req.params;
    const { price } = req.body;

    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    let filter;
    try { filter = { _id: new ObjectId(itemId) }; }
    catch { filter = { id: itemId }; }

    // Fetch current price to store as oldPrice
    const existing = await col.findOne(filter);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    await col.updateOne(filter, {
      $set: {
        oldprice:  existing.newprice,
        newprice:  Number(price),
        updatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[PRICELIST] PUT error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'update-pricelist-item',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
      details: { itemId: req.params?.itemId || null, price: req.body?.price },
    });
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// POST bulk-update multiple items
app.post('/api/pricelist/bulk-update', async (req, res) => {
  try {
    const { pricelistCollection: col } = await getCollections();
    const { updates } = req.body; // [{ _id, price }]
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates array required' });
    }

    const ops = updates.map(u => {
      let filter;
      try { filter = { _id: new ObjectId(String(u._id)) }; }
      catch { filter = { id: u._id }; }
      return {
        updateOne: {
          filter,
          update: { $set: { newprice: Number(u.newprice), updatedAt: new Date() } },
        },
      };
    });

    const result = await col.bulkWrite(ops);
    res.json({ success: true, modified: result.modifiedCount });
  } catch (err) {
    console.error('[PRICELIST] BULK error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'bulk-update-pricelist',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
    });
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// POST seed / upsert items (called once to populate from app data)
app.post('/api/pricelist/seed', async (req, res) => {
  try {
    const { pricelistCollection: col } = await getCollections();
    const { items } = req.body; // [{ itemNo, name, category, price, unit, image, description }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }

    const ops = items.map(item => ({
      updateOne: {
        filter: { category: item.category, itemNo: item.itemNo },
        update: { $setOnInsert: { oldPrice: item.price }, $set: { ...item, updatedAt: new Date() } },
        upsert: true,
      },
    }));

    const result = await col.bulkWrite(ops);
    res.json({ success: true, upserted: result.upsertedCount, modified: result.modifiedCount });
  } catch (err) {
    console.error('[PRICELIST] SEED error:', err.message);
    await writeErrorLog({
      source: 'server',
      scope: 'seed-pricelist',
      message: err.message,
      stack: err.stack,
      request: buildRequestContext(req),
    });
    res.status(500).json({ error: 'Seed failed' });
  }
});

app.use((_req, res) => {
  const clientIndex = path.join(__dirname, 'client', 'dist', 'index.html');
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(clientIndex)) {
    res.sendFile(clientIndex);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Export for Vercel serverless; listen only when run directly (local dev)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
