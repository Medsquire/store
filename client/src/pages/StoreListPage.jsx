import { useEffect, useMemo, useState } from 'react';
import { fetchStoreByGuid, fetchStores } from '../api/stores';

function safeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleString();
}

function formatTimeRange(start, end) {
  const safeStart = String(start || '').trim();
  const safeEnd = String(end || '').trim();

  if (!safeStart && !safeEnd) {
    return '-';
  }

  return `${safeStart || '-'} - ${safeEnd || '-'}`;
}

function StoreDetailModal({ detail, loading, error, onClose }) {
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.classList.add('modal-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const store = detail?.store || {};
  const breakTimes = safeArray(detail?.breakTimes);
  const menuItems = safeArray(detail?.menuItems);
  const images = safeArray(detail?.images);
  const menuFiles = safeArray(detail?.menuFiles);
  const extraCategories = safeArray(store.ExtraCategories);
  const serviceTimes = safeArray(store.ServiceTimes);
  const phones = [store.Phone1, store.Phone2, store.Phone3].filter(Boolean);
  const hasMap = Boolean(store.MapUrl || (store.Latitude && store.Longitude));
  const hasCoordinates = store.Latitude !== null && store.Latitude !== undefined && store.Longitude !== null && store.Longitude !== undefined;

  return (
    <div className="modal-backdrop" onClick={event => event.target === event.currentTarget && onClose()}>
      <div className="modal-dialog store-detail-modal">
        <div className="modal-header">
          <div>
            <span className="modal-order-id">Store Details</span>
            <span className="modal-status-badge status-badge pending">{store.Status || 'Pending'}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading && <div className="store-detail-state">Loading store details...</div>}
          {error && <div className="store-detail-state error">{error}</div>}

          {!loading && !error && (
            <>
              <section className="modal-section">
                <h4 className="modal-section-title">Overview</h4>
                <div className="store-detail-summary">
                  <div className="store-detail-card">
                    <span className="store-detail-label">Store Name</span>
                    <strong>{store.StoreName || '-'}</strong>
                  </div>
                  <div className="store-detail-card">
                    <span className="store-detail-label">GUID</span>
                    <strong className="store-detail-mono">{store.Guid || '-'}</strong>
                  </div>
                  <div className="store-detail-card">
                    <span className="store-detail-label">Main Category</span>
                    <strong>{store.MainCategory || '-'}</strong>
                  </div>
                  <div className="store-detail-card">
                    <span className="store-detail-label">Status</span>
                    <strong>{store.Status || '-'}</strong>
                  </div>
                  <div className="store-detail-card">
                    <span className="store-detail-label">Created On</span>
                    <strong>{formatDate(store.Created_On)}</strong>
                  </div>
                  <div className="store-detail-card">
                    <span className="store-detail-label">Created By</span>
                    <strong>{store.Created_By ?? '-'}</strong>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-section-title">Contact & Location</h4>
                <div className="modal-info-grid">
                  <div className="modal-info-row">
                    <span className="modal-info-label">Phones</span>
                    <span className="modal-info-value">{phones.length > 0 ? phones.join(', ') : '-'}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Address</span>
                    <span className="modal-info-value">{store.Address || '-'}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Coordinates</span>
                    <span className="modal-info-value">
                      {hasCoordinates ? `${store.Latitude}, ${store.Longitude}` : '-'}
                    </span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Map Link</span>
                    <span className="modal-info-value">
                      {hasMap ? (
                        <a className="store-detail-link" href={store.MapUrl || `https://maps.google.com/?q=${store.Latitude},${store.Longitude}`} target="_blank" rel="noreferrer">
                          Open map ↗
                        </a>
                      ) : '-'}
                    </span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Working Hours</span>
                    <span className="modal-info-value">{formatTimeRange(store.OpenTime, store.ClosingTime)}</span>
                  </div>
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-section-title">Categories & Service Times</h4>
                <div className="store-detail-chip-list">
                  <div className="store-detail-chip primary">{store.MainCategory || 'No category'}</div>
                  {extraCategories.map((item, index) => (
                    <div key={`${item}-${index}`} className="store-detail-chip">{item}</div>
                  ))}
                  {serviceTimes.map((item, index) => (
                    <div key={`${item}-${index}`} className="store-detail-chip accent">{item}</div>
                  ))}
                </div>
              </section>

              <section className="modal-section">
                <h4 className="modal-section-title">Break Times</h4>
                {breakTimes.length > 0 ? (
                  <div className="store-detail-list">
                    {breakTimes.map((item, index) => (
                      <div key={item.Id || index} className="store-detail-list-row">
                        <span>Break {index + 1}</span>
                        <strong>{formatTimeRange(item.BreakStart || item.start, item.BreakEnd || item.end)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="store-detail-empty">No break times saved.</p>
                )}
              </section>

              <section className="modal-section">
                <h4 className="modal-section-title">Menu Items</h4>
                {menuItems.length > 0 ? (
                  <div className="store-detail-table">
                    <div className="store-detail-table-head">
                      <span>Item</span>
                      <span>Quality</span>
                      <span>Serve</span>
                      <span className="text-right">Price</span>
                    </div>
                    {menuItems.map((item, index) => (
                      <div key={item.Id || index} className="store-detail-table-row">
                        <span>{item.ItemName || item.name || '-'}</span>
                        <span>{item.Quality || item.quality || '-'}</span>
                        <span>{item.Serve || item.serve || '-'}</span>
                        <span className="text-right">{item.Price !== undefined && item.Price !== null ? `₹${Number(item.Price).toFixed(2)}` : '-'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="store-detail-empty">No menu items saved.</p>
                )}
              </section>

              <section className="modal-section">
                <h4 className="modal-section-title">Store Images</h4>
                {images.length > 0 ? (
                  <div className="store-detail-media-grid">
                    {images.map((item, index) => (
                      <a key={item.Id || index} className="store-detail-media-card" href={item.FileUrl} target="_blank" rel="noreferrer">
                        <img src={item.FileUrl} alt={item.FileName || `Store image ${index + 1}`} />
                        <span>{item.FileName || `Image ${index + 1}`}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="store-detail-empty">No store images uploaded.</p>
                )}
              </section>

              <section className="modal-section">
                <h4 className="modal-section-title">Menu Files</h4>
                {menuFiles.length > 0 ? (
                  <div className="store-detail-file-list">
                    {menuFiles.map((item, index) => (
                      <a key={item.Id || index} className="store-detail-file-card" href={item.FileUrl} target="_blank" rel="noreferrer">
                        <strong>{item.FileName || `File ${index + 1}`}</strong>
                        <span>Open file ↗</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="store-detail-empty">No menu files uploaded.</p>
                )}
              </section>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-btn secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function StoreListPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await fetchStores();
        if (mounted) {
          setStores(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load stores.');
          setStores([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const statuses = useMemo(() => {
    const values = new Set(
      stores
        .map(s => String(s.Status || '').trim())
        .filter(Boolean)
    );
    return ['All', ...Array.from(values)];
  }, [stores]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return stores.filter(store => {
      const inStatus =
        status === 'All' ||
        String(store.Status || '').toLowerCase() === status.toLowerCase();

      if (!inStatus) {
        return false;
      }

      if (!q) {
        return true;
      }

      const phones = [store.Phone1, store.Phone2, store.Phone3].filter(Boolean).join(' ');
      const haystack = [
        store.StoreName,
        store.MainCategory,
        store.Address,
        phones,
        store.Guid
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [stores, query, status]);

  const openStoreDetails = async (guid) => {
    if (!guid) {
      return;
    }

    setSelectedStore(null);
    setDetailError('');
    setDetailLoading(true);

    try {
      const data = await fetchStoreByGuid(guid);
      setSelectedStore(data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load store details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeStoreDetails = () => {
    setSelectedStore(null);
    setDetailError('');
    setDetailLoading(false);
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">admin.healthyeluru</p>
        <h1>Store List</h1>
        <p className="hero-subtitle">{filtered.length} stores shown from {stores.length} total records.</p>
      </section>

      <section className="card">
        <div className="section-head">
          <h2>All Stores</h2>
        </div>

        <div className="section-actions store-section-actions">
          <input
            className="search-box"
            placeholder="Search by store, phone, address, or guid"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <select
            className="filter-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {loading && <p>Loading stores...</p>}
        {error && <p className="pl-error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="orders-table-wrapper store-list-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Store Name</th>
                    <th>Category</th>
                    <th>Phones</th>
                    <th>Service Times</th>
                    <th>Status</th>
                    <th>Working Hours</th>
                    <th>Address</th>
                    <th>Created On</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10}>No stores found.</td>
                    </tr>
                  ) : filtered.map((store, index) => {
                    const extraCategories = safeArray(store.ExtraCategories);
                    const serviceTimes = safeArray(store.ServiceTimes);
                    const phones = [store.Phone1, store.Phone2, store.Phone3].filter(Boolean);
                    const statusClass = String(store.Status || 'pending').toLowerCase();

                    return (
                      <tr key={store.Guid || store.Id || index}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{store.StoreName || '-'}</strong>
                          <div className="store-guid">{store.Guid || '-'}</div>
                        </td>
                        <td>
                          <div>{store.MainCategory || '-'}</div>
                          {extraCategories.length > 0 && (
                            <small>{extraCategories.join(', ')}</small>
                          )}
                        </td>
                        <td>{phones.length > 0 ? phones.join(', ') : '-'}</td>
                        <td>{serviceTimes.length > 0 ? serviceTimes.join(', ') : '-'}</td>
                        <td>
                          <span className={`status-badge ${statusClass}`}>
                            {store.Status || 'Pending'}
                          </span>
                        </td>
                        <td>{store.OpenTime || '-'} - {store.ClosingTime || '-'}</td>
                        <td>{store.Address || '-'}</td>
                        <td>{formatDate(store.Created_On)}</td>
                        <td className="store-actions-cell">
                          <button
                            type="button"
                            className="view-details-btn store-action-btn"
                            onClick={() => openStoreDetails(store.Guid)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="store-list-mobile">
              {filtered.length === 0 ? (
                <p className="store-mobile-empty">No stores found.</p>
              ) : filtered.map((store, index) => {
                const extraCategories = safeArray(store.ExtraCategories);
                const serviceTimes = safeArray(store.ServiceTimes);
                const phones = [store.Phone1, store.Phone2, store.Phone3].filter(Boolean);
                const statusClass = String(store.Status || 'pending').toLowerCase();

                return (
                  <article key={`${store.Guid || store.Id || index}-mobile`} className="store-mobile-card">
                    <div className="store-mobile-top">
                      <div>
                        <p className="store-mobile-index">#{index + 1}</p>
                        <h3>{store.StoreName || '-'}</h3>
                      </div>
                      <span className={`status-badge ${statusClass}`}>
                        {store.Status || 'Pending'}
                      </span>
                    </div>

                    <p className="store-mobile-guid">{store.Guid || '-'}</p>

                    <div className="store-mobile-grid">
                      <div>
                        <span>Category</span>
                        <strong>{store.MainCategory || '-'}</strong>
                        {extraCategories.length > 0 && <small>{extraCategories.join(', ')}</small>}
                      </div>
                      <div>
                        <span>Working Hours</span>
                        <strong>{store.OpenTime || '-'} - {store.ClosingTime || '-'}</strong>
                      </div>
                      <div>
                        <span>Phones</span>
                        <strong>{phones.length > 0 ? phones.join(', ') : '-'}</strong>
                      </div>
                      <div>
                        <span>Service Times</span>
                        <strong>{serviceTimes.length > 0 ? serviceTimes.join(', ') : '-'}</strong>
                      </div>
                    </div>

                    <div className="store-mobile-address">
                      <span>Address</span>
                      <strong>{store.Address || '-'}</strong>
                    </div>

                    <div className="store-mobile-footer">
                      <small>{formatDate(store.Created_On)}</small>
                      <button
                        type="button"
                        className="view-details-btn"
                        onClick={() => openStoreDetails(store.Guid)}
                      >
                        View Details
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {(detailLoading || detailError || selectedStore) && (
        <StoreDetailModal
          detail={selectedStore}
          loading={detailLoading}
          error={detailError}
          onClose={closeStoreDetails}
        />
      )}
    </main>
  );
}
