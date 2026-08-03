import { useState, useRef, useEffect, useCallback } from 'react';
import { submitStore } from '../api/stores';

const DEFAULT_CENTER  = [16.7107, 81.0952];
const CATEGORIES      = ['Vegatable', 'Fruits', 'Food', 'Medicies'];
const SERVICE_TIMES   = ['breakfast', 'lunch', 'snack', 'dinner'];
const MAX_BREAKS      = 3;

function emptyRow() {
  return { name: '', quality: '', serve: '', price: '' };
}

export default function StorePage() {
  /* ── form state ── */
  const [storeName,      setStoreName]      = useState('');
  const [category,       setCategory]       = useState('');
  const [extraCats,      setExtraCats]      = useState([]);
  const [phone1,         setPhone1]         = useState('');
  const [phone2,         setPhone2]         = useState('');
  const [phone3,         setPhone3]         = useState('');
  const [address,        setAddress]        = useState('');
  const [serviceTimes,   setServiceTimes]   = useState([]);
  const [menuItems,      setMenuItems]      = useState([emptyRow()]);
  const [breakTimes,     setBreakTimes]     = useState([{ start: '', end: '' }]);
  const [imageFiles,     setImageFiles]     = useState([]);
  const [menuFiles,      setMenuFiles]      = useState([]);
  const [openTime,       setOpenTime]       = useState('');
  const [closingTime,    setClosingTime]    = useState('');
  const [locationText,   setLocationText]   = useState('');
  const [lat,            setLat]            = useState('');
  const [lng,            setLng]            = useState('');
  const [message,        setMessage]        = useState({ text: '', type: '' });
  const [submitting,     setSubmitting]     = useState(false);

  /* ── refs for Leaflet + flatpickr ── */
  const mapRef        = useRef(null);
  const mapInstanceRef= useRef(null);
  const markerRef     = useRef(null);
  const openPickrRef  = useRef(null);
  const closePickrRef = useRef(null);

  /* ── Init Leaflet map ── */
  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    const updateLocation = (latlng) => {
      setLat(latlng.lat.toFixed(6));
      setLng(latlng.lng.toFixed(6));
      setLocationText(`Lat: ${latlng.lat.toFixed(4)}, Lon: ${latlng.lng.toFixed(4)}`);
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.marker(latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', e => updateLocation(e.target.getLatLng()));
      }
    };

    map.on('click', e => updateLocation(e.latlng));
    mapInstanceRef.current = map;

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  /* ── Init flatpickr ── */
  useEffect(() => {
    const fp = window.flatpickr;
    if (!fp) return;

    const opts = { enableTime: true, noCalendar: true, dateFormat: 'h:i K', time_24hr: false };

    const openEl  = document.getElementById('openTimePicker');
    const closeEl = document.getElementById('closeTimePicker');
    if (openEl)  openPickrRef.current  = fp(openEl,  { ...opts, onChange: ([d], str) => setOpenTime(str) });
    if (closeEl) closePickrRef.current = fp(closeEl, { ...opts, onChange: ([d], str) => setClosingTime(str) });

    return () => {
      openPickrRef.current?.destroy();
      closePickrRef.current?.destroy();
    };
  }, []);

  /* ── handlers ── */
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      const L   = window.L;
      const map = mapInstanceRef.current;
      if (!map || !L) return;
      const latlng = L.latLng(latitude, longitude);
      map.setView(latlng, 16);
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng);
      } else {
        markerRef.current = L.marker(latlng, { draggable: true }).addTo(map);
        markerRef.current.on('dragend', e => {
          const { lat: la, lng: lo } = e.target.getLatLng();
          setLat(la.toFixed(6)); setLng(lo.toFixed(6));
          setLocationText(`Lat: ${la.toFixed(4)}, Lon: ${lo.toFixed(4)}`);
        });
      }
      setLat(latitude.toFixed(6));
      setLng(longitude.toFixed(6));
      setLocationText(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
    });
  };

  const toggleCheck = (list, setList, value) =>
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const updateItem = (idx, field, value) =>
    setMenuItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const addItem = () => setMenuItems(prev => [...prev, emptyRow()]);
  const removeItem = idx => setMenuItems(prev => prev.filter((_, i) => i !== idx));

  const updateBreak = (idx, field, value) =>
    setBreakTimes(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  const addBreak = () => {
    if (breakTimes.length < MAX_BREAKS) setBreakTimes(prev => [...prev, { start: '', end: '' }]);
  };
  const removeBreak = idx => setBreakTimes(prev => prev.filter((_, i) => i !== idx));

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });

    const fd = new FormData();
    fd.append('storeName',      storeName);
    fd.append('categorySingle', category);
    fd.append('phone1',         phone1);
    if (phone2) fd.append('phone2', phone2);
    if (phone3) fd.append('phone3', phone3);
    fd.append('address',        address);
    fd.append('latitude',       lat);
    fd.append('longitude',      lng);
    fd.append('mapUrl',         `https://maps.google.com/?q=${lat},${lng}`);
    fd.append('openTime',       openTime);
    fd.append('closingTime',    closingTime);
    extraCats.forEach(c  => fd.append('categories',   c));
    serviceTimes.forEach(s => fd.append('serviceTimes', s));
    fd.append('breakTimes',  JSON.stringify(breakTimes));
    fd.append('manualItems', JSON.stringify(menuItems));
    imageFiles.forEach(f  => fd.append('images',    f));
    menuFiles.forEach(f   => fd.append('menuFiles', f));

    try {
      await submitStore(fd);
      setMessage({ text: '✓ Store enrolled successfully!', type: 'success' });
      e.target.reset();
      setMenuItems([emptyRow()]);
      setBreakTimes([{ start: '', end: '' }]);
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">admin.healthyeluru</p>
        <h1>Store Enrollment</h1>
      </section>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <section className="card">
        <div className="section-head"><h2>Store Details</h2></div>

        <form onSubmit={handleSubmit} encType="multipart/form-data">

          {/* ── 1. Basic Info ── */}
          <section className="form-group">
            <div className="group-head"><h3>1. Basic Information</h3></div>
            <div className="grid">
              <label>
                Store Name
                <input
                  type="text" required minLength={2} placeholder="ABC Store"
                  value={storeName} onChange={e => setStoreName(e.target.value)}
                />
              </label>
              <label>
                Main Category
                <select value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Select one</option>
                  {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                </select>
              </label>
            </div>

            <div className="grid phones">
              <label>Phone 1<input type="tel" required maxLength={10} pattern="\d{10}" placeholder="10-digit number" value={phone1} onChange={e => setPhone1(e.target.value)} /></label>
              <label>Phone 2<input type="tel" maxLength={10} pattern="\d{10}" placeholder="optional" value={phone2} onChange={e => setPhone2(e.target.value)} /></label>
              <label>Phone 3<input type="tel" maxLength={10} pattern="\d{10}" placeholder="optional" value={phone3} onChange={e => setPhone3(e.target.value)} /></label>
            </div>

            <fieldset>
              <legend>Extra Categories</legend>
              <div className="check-row">
                {['veg', 'non-veg'].map(c => (
                  <label key={c}>
                    <input type="checkbox" checked={extraCats.includes(c)} onChange={() => toggleCheck(extraCats, setExtraCats, c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          {/* ── 2. Store Details ── */}
          <section className="form-group">
            <div className="group-head"><h3>2. Store Details</h3></div>

            <label>
              Address
              <textarea required minLength={5} rows={2} placeholder="Full street address" value={address} onChange={e => setAddress(e.target.value)} />
            </label>

            <div className="location-box">
              <button type="button" className="loc-btn" onClick={useCurrentLocation}>
                Use Current Location
              </button>
              <p className="location-help">Tap the map to drop a pin or drag the pin to adjust.</p>
              <div ref={mapRef} className="location-map" />
              <p className="location-text">{locationText || 'No location selected.'}</p>
              <input type="hidden" value={lat} readOnly />
              <input type="hidden" value={lng} readOnly />
            </div>

            <div className="grid time-grid">
              <label>Open Time<input id="openTimePicker" type="text" placeholder="Select time" readOnly /></label>
              <label>Closing Time<input id="closeTimePicker" type="text" placeholder="Select time" readOnly /></label>
            </div>

            <fieldset>
              <legend>Break Time</legend>
              <div id="breakTimesContainer" className="breaktimes-container">
                {breakTimes.map((b, i) => (
                  <div key={i} className="breaktime-row">
                    <input type="text" placeholder="Break start" value={b.start} onChange={e => updateBreak(i, 'start', e.target.value)} />
                    <input type="text" placeholder="Break end"   value={b.end}   onChange={e => updateBreak(i, 'end',   e.target.value)} />
                    <button type="button" className="icon-btn" onClick={() => removeBreak(i)}>-</button>
                  </div>
                ))}
              </div>
              {breakTimes.length < MAX_BREAKS && (
                <button type="button" className="icon-btn" onClick={addBreak}>+</button>
              )}
            </fieldset>

            <fieldset>
              <legend>Service Time</legend>
              <div className="check-row">
                {SERVICE_TIMES.map(s => (
                  <label key={s}>
                    <input type="checkbox" checked={serviceTimes.includes(s)} onChange={() => toggleCheck(serviceTimes, setServiceTimes, s)} />
                    <span>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid images">
              <label>
                Store Images
                <div className="image-input-stack">
                  <span className="input-hint">Choose one or more store images</span>
                  <input type="file" accept="image/*" multiple onChange={e => setImageFiles([...e.target.files])} />
                </div>
                <div className="preview-grid">
                  {imageFiles.length === 0
                    ? <div className="image-preview">No image selected</div>
                    : imageFiles.map((f, i) => (
                        <img key={i} src={URL.createObjectURL(f)} alt={f.name} className="image-preview-thumb" />
                      ))
                  }
                </div>
              </label>
            </div>
          </section>

          {/* ── 3. Menu Details ── */}
          <section className="form-group">
            <div className="group-head"><h3>3. Menu Details</h3></div>

            <div className="grid Menus">
              <label>
                Menu Files
                <input type="file" multiple onChange={e => setMenuFiles([...e.target.files])} />
                <div className="preview-grid">
                  {menuFiles.length === 0
                    ? <div className="image-preview">No file selected</div>
                    : menuFiles.map((f, i) => <div key={i} className="image-preview">{f.name}</div>)
                  }
                </div>
              </label>
            </div>

            <fieldset>
              <legend>Menu Items Table</legend>
              <div className="Menu-table-wrap">
                <table className="Menu-table">
                  <thead>
                    <tr>
                      <th>Item</th><th>Quality</th><th>Serve</th><th>Price</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map((row, i) => (
                      <tr key={i} className="manual-item-row">
                        <td data-label="Item">
                          <input type="text" placeholder="Item name" value={row.name}    onChange={e => updateItem(i, 'name',    e.target.value)} />
                        </td>
                        <td data-label="Quality">
                          <input type="text" placeholder="Quality"   value={row.quality} onChange={e => updateItem(i, 'quality', e.target.value)} />
                        </td>
                        <td data-label="Serve">
                          <input type="text" placeholder="Serve"     value={row.serve}   onChange={e => updateItem(i, 'serve',   e.target.value)} />
                        </td>
                        <td data-label="Price">
                          <input type="number" min={0} placeholder="Price" value={row.price} onChange={e => updateItem(i, 'price', e.target.value)} />
                        </td>
                        <td data-label="Action">
                          <button type="button" className="icon-btn" onClick={() => removeItem(i)}>-</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="icon-btn" onClick={addItem}>+</button>
            </fieldset>
          </section>

          <div className="actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Enrolling…' : 'Enroll Store'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
