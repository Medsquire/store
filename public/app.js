const form = document.getElementById('storeForm');
const messageEl = document.getElementById('message');
const storesListEl = document.getElementById('storesList');
const locBtn = document.getElementById('locBtn');
const latInput = document.getElementById('latitude');
const lngInput = document.getElementById('longitude');
const mapUrlInput = document.getElementById('mapUrl');
const locationMapEl = document.getElementById('locationMap');
const locationsGrid = document.getElementById('locationsGrid');
const addBreakBtn = document.getElementById('addBreakBtn');
const breakTimesContainer = document.getElementById('breakTimesContainer');
const addItemRowBtn = document.getElementById('addItemRowBtn');
const manualItemsBody = document.getElementById('manualItemsBody');
const imagesInput = document.getElementById('imagesInput');
const imagesPreviewGrid = document.getElementById('imagesPreviewGrid');
const imagesUrlText = document.getElementById('imagesUrlText');
const menuFilesInput = document.getElementById('menuFilesInput');
const menuFilesPreviewGrid = document.getElementById('menuFilesPreviewGrid');
const previewModal = document.getElementById('previewModal');
const previewModalTitle = document.getElementById('previewModalTitle');
const previewModalBody = document.getElementById('previewModalBody');
const previewModalClose = document.getElementById('previewModalClose');
const MAX_BREAK_ROWS = 3;

const DEFAULT_MAP_CENTER = [16.7107, 81.0952];

// Single location storage
let singleLocation = null;

let locationMap;
let locationMarker;

const uploadedImageRecords = [];
const uploadedMenuFileRecords = [];
let currentImageFiles = [];
let currentMenuFiles = [];
let currentPreviewObjectUrl = '';

function setFilePreview(previewId, file) {
  const previewEl = document.getElementById(previewId);
  if (!previewEl) {
    return;
  }

  if (!file) {
    previewEl.innerHTML = 'No image selected';
    return;
  }

  if (!file.type.startsWith('image/')) {
    previewEl.innerHTML = `<span class="file-preview-name">${file.name}</span>`;
    return;
  }

  const previewUrl = URL.createObjectURL(file);
  previewEl.innerHTML = `<img src="${previewUrl}" alt="${previewId} preview" />`;
}

function setImagePreview(fieldName, file) {
  setFilePreview(`${fieldName}Preview`, file);
}

function revokePreviewObjectUrl() {
  if (currentPreviewObjectUrl) {
    URL.revokeObjectURL(currentPreviewObjectUrl);
    currentPreviewObjectUrl = '';
  }
}

function closePreviewModal() {
  if (!previewModal) {
    return;
  }

  revokePreviewObjectUrl();
  previewModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function openPreviewModal(file, title) {
  if (!previewModal || !previewModalTitle || !previewModalBody) {
    return;
  }

  revokePreviewObjectUrl();
  previewModalTitle.textContent = title || file.name || 'Preview';
  previewModalBody.innerHTML = '';

  if (file.type && file.type.startsWith('image/')) {
    currentPreviewObjectUrl = URL.createObjectURL(file);
    previewModalBody.innerHTML = `
      <img class="preview-modal-image" src="${currentPreviewObjectUrl}" alt="${file.name} preview" />
      <p class="preview-modal-file-name">${file.name}</p>
    `;
  } else {
    previewModalBody.innerHTML = `
      <div class="preview-modal-file-card">
        <div class="preview-modal-file-icon">FILE</div>
        <p class="preview-modal-file-name">${file.name}</p>
      </div>
    `;
  }

  previewModal.hidden = false;
  document.body.classList.add('modal-open');
}

function createPreviewCard(file, label, index, onRemove) {
  const card = document.createElement('div');
  card.className = 'preview-card';

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = 'preview-card-open';
  openBtn.setAttribute('aria-label', `Open ${label} ${index + 1} preview`);
  openBtn.innerHTML = `
    <div class="preview-card-fallback">${file.type && file.type.startsWith('image/') ? 'IMG' : 'FILE'}</div>
    <span class="preview-card-label">${file.name}</span>
    <span class="preview-card-hint">Tap to preview</span>
  `;
  openBtn.addEventListener('click', () => openPreviewModal(file, file.name));

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'preview-card-close';
  closeBtn.setAttribute('aria-label', `Remove ${label} ${index + 1}`);
  closeBtn.setAttribute('title', `Remove ${file.name}`);
  closeBtn.innerHTML = '&#x2715;';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(index);
  });

  card.appendChild(openBtn);
  card.appendChild(closeBtn);
  return card;
}

function renderImagePreviewGrid(files) {
  if (!imagesPreviewGrid) {
    return;
  }

  currentImageFiles = files.slice();

  if (!files.length) {
    imagesPreviewGrid.innerHTML = '<div class="image-preview">No image selected</div>';
    return;
  }

  imagesPreviewGrid.innerHTML = '';
  files.forEach((file, index) => {
    imagesPreviewGrid.appendChild(createPreviewCard(file, 'image', index, (i) => {
      currentImageFiles.splice(i, 1);
      uploadedImageRecords.splice(i, 1);
      renderImagePreviewGrid(currentImageFiles);
    }));
  });
}

function renderMenuPreviewGrid(files) {
  if (!menuFilesPreviewGrid) {
    return;
  }

  currentMenuFiles = files.slice();

  if (!files.length) {
    menuFilesPreviewGrid.innerHTML = '<div class="image-preview">No file selected</div>';
    return;
  }

  menuFilesPreviewGrid.innerHTML = '';
  files.forEach((file, index) => {
    menuFilesPreviewGrid.appendChild(createPreviewCard(file, 'menu file', index, (i) => {
      currentMenuFiles.splice(i, 1);
      uploadedMenuFileRecords.splice(i, 1);
      renderMenuPreviewGrid(currentMenuFiles);
    }));
  });
}

async function uploadImageFiles(files) {
  uploadedImageRecords.length = 0;

  if (!files.length) {
    console.log('No files to upload');
    if (imagesUrlText) {
      imagesUrlText.value = '';
    }
    return;
  }

  showMessage('Uploading images...');

  for (const file of files) {
    console.log(`Uploading: ${file.name}`);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadData
      });
      
      console.log(`Upload response status: ${response.status}`);
      const result = await response.json();
      console.log('Upload result:', result);

      if (!response.ok) {
        throw new Error(result.error || `Image upload failed (${response.status})`);
      }

      uploadedImageRecords.push(result.image);
      console.log(`Successfully uploaded: ${file.name}`);
    } catch (err) {
      console.error(`Failed to upload ${file.name}:`, err);
      throw err;
    }
  }

  if (imagesUrlText) {
    imagesUrlText.value = uploadedImageRecords.map((image) => image.url).join('\n');
  }

  showMessage(`${uploadedImageRecords.length} image(s) uploaded successfully.`);
}

async function uploadMenuFiles(files) {
  if (!files.length) {
    console.log('No menu files to upload');
    return;
  }

  showMessage('Uploading menu files...');

  for (const file of files) {
    if (file.type && file.type.startsWith('image/')) {
      console.log(`Uploading menu image: ${file.name}`);
      const uploadData = new FormData();
      uploadData.append('image', file);

      try {
        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: uploadData
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || `Menu image upload failed (${response.status})`);
        }

        uploadedMenuFileRecords.push({
          fileName: result.image.originalName,
          fileUrl: result.image.url,
          isUploaded: true
        });
        console.log(`Successfully uploaded menu image: ${file.name}`);
      } catch (err) {
        console.error(`Failed to upload menu image ${file.name}:`, err);
        throw err;
      }
    } else {
      // Non-image files will be uploaded on form submit
      uploadedMenuFileRecords.push({
        fileName: file.name,
        file: file,
        isUploaded: false
      });
    }
  }

  const uploadedImagesCount = uploadedMenuFileRecords.filter(r => r.isUploaded).length;
  showMessage(`Processed ${files.length} menu file(s) (${uploadedImagesCount} image(s) uploaded).`);
}

function addLocationToList(lat, lng) {
  const latitude = Number(lat).toFixed(6);
  const longitude = Number(lng).toFixed(6);
  
  // Store single location (replaces previous)
  singleLocation = {
    lat: latitude,
    lng: longitude
  };
  
  renderLocationDisplay();
  console.log('[MAP] Location set:', latitude, longitude);
}

function removeLocation() {
  singleLocation = null;
  renderLocationDisplay();
}

function renderLocationDisplay() {
  const locationText = document.getElementById('locationText');
  if (!locationText) return;
  
  if (singleLocation) {
    locationText.textContent = `📍 ${singleLocation.lat}, ${singleLocation.lng}`;
    locationText.style.color = '#27ae60';
    locationText.style.fontWeight = 'bold';
  } else {
    locationText.textContent = 'No location selected.';
    locationText.style.color = '#666';
    locationText.style.fontWeight = 'normal';
  }
}

function updateLocationFields(lat, lng) {
  const latitude = Number(lat).toFixed(6);
  const longitude = Number(lng).toFixed(6);
  
  latInput.value = latitude;
  lngInput.value = longitude;
  mapUrlInput.value = `https://www.google.com/maps?q=${latitude},${longitude}`;
}

function setMapMarker(lat, lng, shouldCenter = true) {
  console.log('[MAP] Setting marker at:', lat, lng);
  
  if (!locationMap || typeof L === 'undefined') {
    console.log('[MAP] Map not ready yet');
    addLocationToList(lat, lng);
    return;
  }

  try {
    if (!locationMarker) {
      console.log('[MAP] Creating draggable marker...');
      
      // Simple pointer symbol marker
      const markerIcon = L.icon({
        iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDMyIDQwIj48cGF0aCBkPSJNMTYgMEM3LjIgMCAwIDcuMiAwIDE2YzAgOC44IDExLjIgMjQgMTYgMjRzMTYtMTUuMiAxNi0yNGMwLTguOC03LjItMTYtMTYtMTZ6IiBmaWxsPSIjZTc0YzNjIi8+PHBhdGggZD0iTTE2IDI0YzMuMyAwIDYtMi43IDYtNnMtMi43LTYtNi02LTYgMi43LTYgNiAyLjcgNiA2IDZ6IiBmaWxsPSIjZmZmIi8+PC9zdmc+',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
      });
      
      locationMarker = L.marker([lat, lng], { 
        draggable: true, 
        riseOnHover: true,
        icon: markerIcon
      });
      locationMarker.addTo(locationMap);
      
      locationMarker.on('dragend', () => {
        const pos = locationMarker.getLatLng();
        console.log('[MAP] Marker dragged to:', pos.lat, pos.lng);
        updateLocationFields(pos.lat, pos.lng);
        addLocationToList(pos.lat, pos.lng);
      });
    } else {
      console.log('[MAP] Moving existing marker...');
      locationMarker.setLatLng([lat, lng]);
    }

    if (shouldCenter) {
      locationMap.setView([lat, lng], 15);
    }

    // Update location for single location mode
    addLocationToList(lat, lng);
    updateLocationFields(lat, lng);
    
    console.log('[MAP] Location set:', Number(lat).toFixed(6), Number(lng).toFixed(6));
  } catch (err) {
    console.error('[MAP] Marker error:', err);
    addLocationToList(lat, lng);
  }
}

function resetLocationMap() {
  singleLocation = null;
  renderLocationDisplay();
  latInput.value = '';
  lngInput.value = '';
  mapUrlInput.value = '';

  if (locationMap) {
    locationMap.setView(DEFAULT_MAP_CENTER, 13);
  }

  if (locationMarker) {
    locationMarker.remove();
    locationMarker = null;
  }
}

function initLocationMap() {
  console.log('[MAP] Initializing...');
  
  if (!locationMapEl) {
    console.error('[MAP] Element not found');
    return;
  }
  
  if (typeof L === 'undefined') {
    console.error('[MAP] Leaflet not loaded');
    return;
  }

  if (locationMap) {
    console.log('[MAP] Already initialized');
    return;
  }

  try {
    locationMap = L.map(locationMapEl);
    locationMap.setView(DEFAULT_MAP_CENTER, 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(locationMap);

    locationMap.invalidateSize();
    
    locationMap.on('click', (e) => {
      setMapMarker(e.latlng.lat, e.latlng.lng);
    });
    
    console.log('[MAP] Ready - Click to place marker or drag pin');
  } catch (err) {
    console.error('[MAP] Init error:', err);
    locationMap = null;
  }
}

function initDateTimePickers(scope = document) {
  if (typeof flatpickr !== 'function') {
    return;
  }

  scope.querySelectorAll('.datetime-picker').forEach((input) => {
    if (input.dataset.pickerInitialized === 'true') {
      return;
    }

    flatpickr(input, {
      enableTime: true,
      noCalendar: true,
      dateFormat: 'h:i K',
      time_24hr: false,
      minuteIncrement: 5,
      allowInput: false,
      clickOpens: true
    });

    input.dataset.pickerInitialized = 'true';
  });
}

function createBreakRow(start = '', end = '') {
  const row = document.createElement('div');
  row.className = 'breaktime-row';
  row.innerHTML = `
    <input type="text" class="break-start datetime-picker" placeholder="Break start" title="Select break start time" value="${start}" readonly />
    <input type="text" class="break-end datetime-picker" placeholder="Break end" title="Select break end time" value="${end}" readonly />
    <button type="button" class="remove-break-btn icon-btn" aria-label="Remove break time" title="Remove break time">-</button>
  `;
  return row;
}

function collectBreakTimes() {
  const rows = Array.from(document.querySelectorAll('.breaktime-row'));
  return rows
    .map((row) => {
      const start = row.querySelector('.break-start')?.value?.trim() || '';
      const end = row.querySelector('.break-end')?.value?.trim() || '';
      if (!start && !end) {
        return null;
      }
      return { start, end };
    })
    .filter(Boolean);
}

function updateBreakAddButtonState() {
  if (!addBreakBtn || !breakTimesContainer) {
    return;
  }

  const rowCount = breakTimesContainer.querySelectorAll('.breaktime-row').length;
  const limitReached = rowCount >= MAX_BREAK_ROWS;

  addBreakBtn.disabled = limitReached;
  addBreakBtn.hidden = limitReached;
  addBreakBtn.title = limitReached ? 'Maximum 3 break times allowed' : 'Add break time';
}

function createManualItemRow(item = '', quality = '', serve = '', price = '') {
  const row = document.createElement('tr');
  row.className = 'manual-item-row';
  row.innerHTML = `
    <td data-label="Item"><input type="text" class="item-name" placeholder="Item name" value="${item}" /></td>
    <td data-label="Quality"><input type="text" class="item-quality" placeholder="Quality" value="${quality}" /></td>
    <td data-label="Serve"><input type="text" class="item-serve" placeholder="Serve" value="${serve}" /></td>
    <td data-label="Price"><input type="number" class="item-price" min="0" step="0.01" placeholder="Price" value="${price}" /></td>
    <td data-label="Action"><button type="button" class="remove-item-btn icon-btn" aria-label="Remove item row" title="Remove item row">-</button></td>
  `;
  return row;
}

function collectManualItems() {
  if (!manualItemsBody) {
    return [];
  }

  const rows = Array.from(manualItemsBody.querySelectorAll('.manual-item-row'));
  return rows
    .map((row) => {
      const item = row.querySelector('.item-name')?.value?.trim() || '';
      const quality = row.querySelector('.item-quality')?.value?.trim() || '';
      const serve = row.querySelector('.item-serve')?.value?.trim() || '';
      const priceRaw = row.querySelector('.item-price')?.value?.trim() || '';
      if (!item && !quality && !serve && !priceRaw) {
        return null;
      }

      return {
        item,
        quality,
        serve,
        price: priceRaw === '' ? '' : Number(priceRaw)
      };
    })
    .filter(Boolean);
}

if (addBreakBtn && breakTimesContainer) {
  addBreakBtn.addEventListener('click', () => {
    const rowCount = breakTimesContainer.querySelectorAll('.breaktime-row').length;
    if (rowCount >= MAX_BREAK_ROWS) {
      updateBreakAddButtonState();
      showMessage('You can add up to 3 break times only.', true);
      return;
    }

    const row = createBreakRow();
    breakTimesContainer.appendChild(row);
    initDateTimePickers(row);
    updateBreakAddButtonState();
  });

  breakTimesContainer.addEventListener('click', (event) => {
    if (!event.target.classList.contains('remove-break-btn')) {
      return;
    }

    const rows = breakTimesContainer.querySelectorAll('.breaktime-row');
    if (rows.length <= 1) {
      const startInput = rows[0].querySelector('.break-start');
      const endInput = rows[0].querySelector('.break-end');
      startInput.value = '';
      endInput.value = '';
      return;
    }

    event.target.closest('.breaktime-row')?.remove();
    updateBreakAddButtonState();
  });

  updateBreakAddButtonState();
}

if (addItemRowBtn && manualItemsBody) {
  addItemRowBtn.addEventListener('click', () => {
    manualItemsBody.appendChild(createManualItemRow());
  });

  manualItemsBody.addEventListener('click', (event) => {
    if (!event.target.classList.contains('remove-item-btn')) {
      return;
    }

    const rows = manualItemsBody.querySelectorAll('.manual-item-row');
    if (rows.length <= 1) {
      rows[0].querySelector('.item-name').value = '';
      rows[0].querySelector('.item-quality').value = '';
      rows[0].querySelector('.item-serve').value = '';
      rows[0].querySelector('.item-price').value = '';
      return;
    }

    event.target.closest('.manual-item-row')?.remove();
  });
}

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = `message ${isError ? 'err' : 'ok'}`;
}

function selectedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
}

if (imagesInput) {
  imagesInput.addEventListener('change', async (event) => {
    const newFiles = Array.from(event.currentTarget.files || []);
    
    if (newFiles.length === 0) {
      console.log('No files selected');
      return;
    }
    
    console.log(`Selected ${newFiles.length} images`);
    
    // Update preview grid with new files
    const merged = currentImageFiles.concat(newFiles);
    renderImagePreviewGrid(merged);
    imagesInput.value = '';

    try {
      console.log('Starting image upload...');
      await uploadImageFiles(newFiles);
      console.log('Image upload completed');
    } catch (err) {
      console.error('Image upload error:', err);
      uploadedImageRecords.length = 0;
      if (imagesUrlText) {
        imagesUrlText.value = '';
      }
      showMessage(err.message || 'Image upload failed.', true);
    }
  });
}

if (menuFilesInput) {
  menuFilesInput.addEventListener('change', async (event) => {
    const newFiles = Array.from(event.currentTarget.files || []);
    if (newFiles.length === 0) {
      return;
    }

    const merged = currentMenuFiles.concat(newFiles);
    renderMenuPreviewGrid(merged);
    menuFilesInput.value = '';

    try {
      await uploadMenuFiles(newFiles);
    } catch (err) {
      uploadedMenuFileRecords.length = 0;
      showMessage(err.message || 'Menu upload failed.', true);
    }
  });
}

if (previewModal) {
  previewModal.addEventListener('click', (event) => {
    if (event.target?.matches('[data-preview-close]')) {
      closePreviewModal();
    }
  });
}

if (previewModalClose) {
  previewModalClose.addEventListener('click', closePreviewModal);
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && previewModal && !previewModal.hidden) {
    closePreviewModal();
  }
});

function collectFormData() {
  const data = new FormData(form);

  const phones = [data.get('phone1'), data.get('phone2'), data.get('phone3')]
    .map((p) => String(p || '').trim())
    .filter(Boolean);

  const memos = [];

  const categories = selectedValues('categories');
  const singleCategory = String(data.get('categorySingle') || '').trim();
  if (singleCategory) {
    categories.unshift(singleCategory);
  }

  const serviceTimes = selectedValues('serviceTimes');
  const breakTimes = collectBreakTimes();
  const manualItems = collectManualItems();
  const uploadedImages = uploadedImageRecords;
  const uploadedMenuFiles = uploadedMenuFileRecords.filter(r => r.isUploaded);

  data.set('phones', JSON.stringify(phones));
  data.set('memos', JSON.stringify(memos));
  data.set('categories', JSON.stringify(categories));
  data.set('serviceTimes', JSON.stringify(serviceTimes));
  data.set('breakTimes', JSON.stringify(breakTimes));
  data.set('manualItems', JSON.stringify(manualItems));
  data.set('uploadedImages', JSON.stringify(uploadedImages));
  data.set('uploadedMenuFiles', JSON.stringify(uploadedMenuFiles));
  data.set('locations', singleLocation ? JSON.stringify([singleLocation]) : JSON.stringify([]));

  if (uploadedImages.length > 0) {
    data.delete('images');
  }

  data.delete('menuFiles');
  uploadedMenuFileRecords
    .filter(r => !r.isUploaded)
    .forEach((r) => {
      data.append('menuFiles', r.file);
    });

  ['phone1', 'phone2', 'phone3', 'categorySingle']
    .forEach((field) => data.delete(field));

  return data;
}

async function loadStores() {
  const storesTableBody = document.getElementById('storesTableBody');
  if (!storesTableBody) {
    return;
  }

  storesTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">Loading stores...</td></tr>';
  try {
    const response = await fetch('/api/stores');
    const stores = await response.json();

    if (!Array.isArray(stores) || stores.length === 0) {
      storesTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 20px;">No stores enrolled yet.</td></tr>';
      return;
    }

    storesTableBody.innerHTML = stores
      .slice()
      .reverse()
      .map((store) => {
        return `
          <tr>
            <td><strong>${store.StoreName}</strong></td>
            <td>
              <button type="button" class="view-icon-btn" onclick="viewStoreDetails('${store.Guid}')" title="View Full Details">👁️</button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Error loading stores:', err);
    storesTableBody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: #ac2f2f; padding: 20px;">Failed to load stores.</td></tr>';
  }
}

async function viewStoreDetails(guid) {
  try {
    const response = await fetch(`/api/stores/${guid}`);
    if (!response.ok) {
      alert('Store not found');
      return;
    }
    const data = await response.json();
    const { store, breakTimes, menuItems, images, menuFiles } = data;

    const details = `
      <h2>📋 Complete Store Details</h2>
      <h3>${store.StoreName}</h3>
      
      <h4>Basic Info</h4>
      <p><strong>Status:</strong> ${store.Status}</p>
      <p><strong>Address:</strong> ${store.Address}</p>
      <p><strong>Phones:</strong> ${[store.Phone1, store.Phone2, store.Phone3].filter(Boolean).join(', ')}</p>
      <p><strong>Category:</strong> ${store.MainCategory || 'N/A'}</p>
      <p><strong>Created:</strong> ${new Date(store.Created_On).toLocaleString()}</p>
      
      <h4>Operating Hours</h4>
      <p><strong>Open:</strong> ${store.OpenTime} | <strong>Close:</strong> ${store.ClosingTime}</p>
      <p><strong>Services:</strong> ${store.ServiceTimes ? JSON.parse(store.ServiceTimes).join(', ') : 'N/A'}</p>
      
      ${breakTimes && breakTimes.length > 0 ? `
        <h4>Break Times (${breakTimes.length})</h4>
        <ul>
          ${breakTimes.map(bt => `<li>${bt.BreakStart} - ${bt.BreakEnd}</li>`).join('')}
        </ul>
      ` : '<h4>No break times</h4>'}
      
      ${menuItems && menuItems.length > 0 ? `
        <h4>Menu Items (${menuItems.length})</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Item</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Quality</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Serve</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${menuItems.map(mi => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${mi.ItemName}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${mi.Quality || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${mi.Serve || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">₹${mi.Price || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<h4>No menu items</h4>'}
      
      ${images && images.length > 0 ? `
        <h4>Store Images (${images.length})</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
          ${images.map(img => `<img src="${img.FileUrl}" alt="Store" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;" />`).join('')}
        </div>
      ` : '<h4>No images</h4>'}
      
      ${menuFiles && menuFiles.length > 0 ? `
        <h4>Menu Files (${menuFiles.length})</h4>
        <ul>
          ${menuFiles.map(mf => `<li><a href="${mf.FileUrl}" target="_blank">${mf.FileName}</a></li>`).join('')}
        </ul>
      ` : '<h4>No menu files</h4>'}
    `;

    previewModalTitle.innerHTML = 'Store Details';
    previewModalBody.innerHTML = details;
    previewModal.hidden = false;
    document.body.classList.add('modal-open');
  } catch (err) {
    console.error('Error fetching store details:', err);
    alert('Failed to load store details');
  }
}

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showMessage('Geolocation is not supported in this browser.', true);
    return;
  }

  locBtn.disabled = true;
  locBtn.textContent = 'Fetching location...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      setMapMarker(lat, lng);

      locBtn.disabled = false;
      locBtn.textContent = 'Use Current Location';
    },
    () => {
      showMessage('Unable to fetch location. Please allow location permission.', true);
      locBtn.disabled = false;
      locBtn.textContent = 'Use Current Location';
    }
  );
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Validate required time fields
  const openTime = String(form.elements['openTime']?.value || '').trim();
  const closingTime = String(form.elements['closingTime']?.value || '').trim();
  
  if (!openTime) {
    showMessage('⏰ Please select an Open Time', true);
    return;
  }
  
  if (!closingTime) {
    showMessage('⏰ Please select a Closing Time', true);
    return;
  }
  
  showMessage('Saving store...');

  try {
    const formData = collectFormData();
    const response = await fetch('/api/stores', {
      method: 'POST',
      body: formData
    });
    const result = await response.json();

    if (!response.ok) {
      const msg = result.errors?.join(' ') || result.error || 'Could not save store.';
      showMessage(msg, true);
      return;
    }

    showMessage('Store enrolled successfully.');
    form.reset();
    resetLocationMap();
    if (breakTimesContainer) {
      breakTimesContainer.innerHTML = '';
      breakTimesContainer.appendChild(createBreakRow());
      initDateTimePickers(breakTimesContainer);
      updateBreakAddButtonState();
    }
    if (manualItemsBody) {
      manualItemsBody.innerHTML = '';
      manualItemsBody.appendChild(createManualItemRow());
    }
    uploadedImageRecords.length = 0;
    uploadedMenuFileRecords.length = 0;
    currentImageFiles = [];
    currentMenuFiles = [];
    if (imagesInput) {
      imagesInput.value = '';
    }
    if (menuFilesInput) {
      menuFilesInput.value = '';
    }
    renderImagePreviewGrid([]);
    renderMenuPreviewGrid([]);
    await loadStores();
  } catch {
    showMessage('Request failed. Please try again.', true);
  }
});

// Initialize phone input validation (10 digits only)
function initPhoneInputs() {
  const phoneInputs = form.querySelectorAll('input[name="phone1"], input[name="phone2"], input[name="phone3"]');
  
  phoneInputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      // Remove all non-digit characters
      e.target.value = e.target.value.replace(/\D/g, '');
      
      // Limit to 10 digits
      if (e.target.value.length > 10) {
        e.target.value = e.target.value.slice(0, 10);
      }
    });
    
    input.addEventListener('blur', (e) => {
      if (e.target.value && e.target.value.length !== 10) {
        e.target.classList.add('error-input');
        e.target.title = 'Phone number must be exactly 10 digits';
      } else {
        e.target.classList.remove('error-input');
        e.target.title = 'Enter exactly 10 digits';
      }
    });
    
    input.addEventListener('focus', (e) => {
      e.target.classList.remove('error-input');
    });
  });
}

initPhoneInputs();
initDateTimePickers();

// Initialize map with retry logic to ensure Leaflet is ready
const initMapWithRetry = () => {
  if (typeof L !== 'undefined' && document.getElementById('locationMap')) {
    initLocationMap();
    console.log('Map initialization triggered');
  } else {
    console.log('Leaflet not ready yet, retrying in 500ms...');
    setTimeout(initMapWithRetry, 500);
  }
};

// Small delay to ensure all libraries are loaded
setTimeout(initMapWithRetry, 100);
loadStores();

// Aggressive map initialization - ensure it works
setTimeout(() => {
  if (!window.locationMap && typeof L !== 'undefined') {
    console.log('[LATE-INIT] Map not initialized, attempting now...');
    try {
      const mapEl = document.getElementById('locationMap');
      if (mapEl) {
        window.locationMap = L.map(mapEl).setView([13.8, 79.7], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(window.locationMap);
        
        window.locationMap.invalidateSize();
        
        window.locationMap.on('click', (e) => {
          setMapMarker(e.latlng.lat, e.latlng.lng);
        });
        
        console.log('[LATE-INIT] Map initialized successfully');
      }
    } catch (err) {
      console.error('[LATE-INIT] Error:', err);
    }
  }
}, 1000);

// Final window exposures - ENSURE functions are available globally
window.addLocationToList = window.addLocationToList || addLocationToList;
window.removeLocation = window.removeLocation || removeLocation;
window.renderLocationDisplay = window.renderLocationDisplay || renderLocationDisplay;
