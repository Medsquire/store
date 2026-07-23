// New simplified map initialization - to be merged
function initLocationMap_New() {
  console.log('[MAP] Initializing location map...');
  
  if (!locationMapEl) {
    console.error('[MAP] Location map element not found');
    return;
  }
  
  if (typeof L === 'undefined') {
    console.error('[MAP] Leaflet library not loaded');
    return;
  }

  if (locationMap) {
    console.log('[MAP] Map already initialized');
    return;
  }

  try {
    // Create map
    locationMap = L.map(locationMapEl);
    locationMap.setView(DEFAULT_MAP_CENTER, 13);
    
    // Add tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      minZoom: 1,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(locationMap);

    // Ensure proper rendering
    setTimeout(() => {
      if (locationMap) {
        locationMap.invalidateSize();
        console.log('[MAP] Map rendered');
      }
    }, 100);
    
    // Add click handler
    locationMap.on('click', (e) => {
      console.log('[MAP] Map clicked at:', e.latlng.lat, e.latlng.lng);
      setMapMarker(e.latlng.lat, e.latlng.lng);
    });
    
    console.log('[MAP] Map initialized successfully');
  } catch (err) {
    console.error('[MAP] Initialization error:', err);
    locationMap = null;
  }
}
