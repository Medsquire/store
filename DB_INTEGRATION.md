# Store Enrollment - Database Integration Summary

## Files Modified/Created

### 1. **lib/database.js** (NEW)
Database connection manager for MSSQL Server using the `mssql` package.
- Reads connection config from `.env`
- Maintains connection pool
- Provides `executeStoredProcedure()` method to call T-SQL SPs
- Provides `executeQuery()` method for raw queries

### 2. **.env** (EXISTING)
Database configuration:
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
```

### 3. **server.js** (MODIFIED)
Backend updates:
- Added `const db = require('./lib/database');`
- **GET /api/stores** → Calls `spGetAllStore` SP
- **GET /api/stores/:guid** → Calls `spGetAllStoreByGuid` SP (returns 5 result sets)
- **POST /api/stores** → Calls `spCreateStore` SP with JSON-formatted parameters

### 4. **public/app.js** (MODIFIED)
Frontend updates:
- **loadStores()** → Fetches from `/api/stores` and displays store list with DB fields
- **Form submission** → Sends data to `/api/stores` which inserts via `spCreateStore`
- Displays store Guid, Status, Created_On from database

### 5. **data/db_setup.sql** (EXISTING)
SQL script with 3 stored procedures:
- **spCreateStore** – Inserts main + child records in one transaction
- **spGetAllStore** – Returns all non-deleted stores, optional Status/Created_By filters
- **spGetAllStoreByGuid** – Returns 5 result sets (store, breaks, items, images, menu files)

## Database Tables
```
StoreEnrollments        (main record)
├─ StoreBreakTimes      (child, 1-to-many)
├─ StoreMenuItems       (child, 1-to-many)
├─ StoreImages          (child, 1-to-many)
└─ StoreMenuFiles       (child, 1-to-many)
```

## Data Flow

### Creating a Store
1. Frontend form → collectFormData() → JSON arrays for complex fields
2. POST /api/stores (multipart/form-data with images)
3. Backend parses form + uploads images to Cloudinary
4. Calls `spCreateStore` with params (JSON arrays for break times, menu items, etc.)
5. SP validates + inserts all records in one transaction
6. Returns Guid, Id, Success message
7. Frontend resets form and reloads store list

### Fetching Stores
1. Frontend → GET /api/stores
2. Backend → spGetAllStore (with optional filters)
3. Returns array of stores with Guid, Status, timestamps
4. Frontend displays store list

### Fetching Store Detail
1. Frontend → GET /api/stores/{guid}
2. Backend → spGetAllStoreByGuid
3. Returns 5 result sets:
   - Store main record
   - Break times
   - Menu items
   - Images
   - Menu files
4. Frontend can display detailed view

## Deployment Steps

1. **SQL Server**: Execute `data/db_setup.sql` to create tables and SPs
   ```sql
   sqlcmd -S 13.204.39.91 -U sa -P dev1@dms -i data/db_setup.sql
   ```

2. **Node**: Already installed via `npm install mssql`

3. **Environment**: Verify `.env` has correct DB credentials

4. **Start**: `npm start` → Server connects on first API call

## Testing

- **Health check**: GET http://localhost:5000/api/health
- **Fetch all stores**: GET http://localhost:5000/api/stores
- **Create store**: POST http://localhost:5000/api/stores (multipart form)
- **Get store detail**: GET http://localhost:5000/api/stores/{guid}

## Error Handling

- Validation errors → 400 Bad Request
- Store not found → 404 Not Found
- Database errors → 500 Internal Server Error with details
- Transaction rollback on SP error → All-or-nothing insert
