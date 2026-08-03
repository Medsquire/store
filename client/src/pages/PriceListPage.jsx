import { useState, useEffect } from 'react';
import { usePricelist } from '../hooks/usePricelist';

const CAT_COLOR = {
  Food:'#ff5722', Snacks:'#795548', Tiffin:'#009688', Juices:'#03a9f4',
  Vegetables:'#4caf50', Fruits:'#ff9800', Medicine:'#e91e63', Lab:'#9c27b0',
};
function catColor(c) { return CAT_COLOR[c] || '#607d8b'; }

export default function PriceListPage() {
  const {
    items, categories, loading, saving, error, toast,
    edits, setEdit, saveAll, loadAll, loadCategory, dirtyCount,
  } = usePricelist();

  const [activeCategory, setActiveCategory] = useState('All');

  // Load all data + categories on first mount
  useEffect(() => { loadAll(); }, [loadAll]);

  // When tab changes (not 'All'), reload filtered
  const handleTabClick = (cat) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      loadAll();
    } else {
      loadCategory(cat);
    }
  };

  // Build tab list: 'All' + dynamic categories from DB
  const tabs = ['All', ...categories];

  // Items to display (already filtered server-side; just use items)
  const displayItems = items;

  return (
    <main className="page pl-page">

      <section className="hero">
        <p className="eyebrow">admin.healthyeluru</p>
        <h1>Price Management</h1>
        <p className="hero-subtitle">
          {items.length > 0
            ? `${items.length} items across ${categories.length} categories`
            : 'Loading items from MongoDB…'}
        </p>
      </section>

      {toast && (
        <div className={`pl-toast pl-toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* Category Tabs */}
      <div className="pl-tabs-wrapper">
        <div className="pl-tabs">
          {tabs.map(cat => (
            <button
              key={cat}
              className={`pl-tab${activeCategory === cat ? ' active' : ''}`}
              style={activeCategory === cat && cat !== 'All'
                ? { borderBottomColor: catColor(cat), color: catColor(cat) }
                : activeCategory === cat
                ? { borderBottomColor: 'var(--accent)', color: 'var(--accent)' }
                : {}}
              onClick={() => handleTabClick(cat)}
            >
              {cat !== 'All' && (
                <span className="pl-tab-dot" style={{ background: catColor(cat) }} />
              )}
              {cat}
              {cat !== 'All' && (
                <span className="pl-tab-badge">
                  {items.filter(i => i.category === cat).length || ''}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table card */}
      <section className="card pl-card">
        <div className="pl-card-head">
          <div>
            <h2 style={{ margin: 0 }}>
              {activeCategory === 'All' ? 'All Items' : activeCategory}
            </h2>
            <span className="pl-item-count">{displayItems.length} items</span>
          </div>
          <div className="pl-actions">
            <button
              className="pl-btn save"
              onClick={saveAll}
              disabled={saving || dirtyCount === 0}
            >
              {saving ? 'Saving…' : `Save Changes${dirtyCount > 0 ? ` (${dirtyCount})` : ''}`}
            </button>
          </div>
        </div>

        {error && <div className="pl-error">⚠ {error}</div>}

        {loading ? (
          <div className="pl-loading">
            <div className="pl-spinner" />
            Loading items…
          </div>
        ) : displayItems.length === 0 ? (
          <div className="pl-empty">
            <p>No items found{activeCategory !== 'All' ? ` for <strong>${activeCategory}</strong>` : ''}.</p>
          </div>
        ) : (
          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead>
                <tr>
                  <th className="pl-col-no">No.</th>
                  <th className="pl-col-sku">SKU</th>
                  <th className="pl-col-name">Item Name</th>
                  {activeCategory === 'All' && <th className="pl-col-cat">Category</th>}
                  <th className="pl-col-old">Current Price</th>
                  <th className="pl-col-new">New Price</th>
                  <th className="pl-col-change">Change</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => {
                  const id      = String(item._id);
                  const editVal = edits[id];
                  const isDirty = editVal !== undefined && editVal !== '';
                  const newNum  = isDirty ? Number(editVal) : null;
                  const diff    = isDirty && !isNaN(newNum) ? newNum - item.newprice : null;

                  return (
                    <tr key={id} className={isDirty ? 'pl-row-dirty' : ''}>

                      <td className="pl-col-no pl-item-no" data-label="No">{idx + 1}</td>

                      <td className="pl-col-sku" data-label="SKU">
                        <span className="pl-sku-tag">{item.sku}</span>
                      </td>

                      <td className="pl-col-name" data-label="Item Name">
                        <span className="pl-item-name">{item.itemname}</span>
                      </td>

                      {activeCategory === 'All' && (
                        <td className="pl-col-cat" data-label="Category">
                          <span
                            className="pl-cat-badge"
                            style={{
                              background: catColor(item.category) + '22',
                              color: catColor(item.category),
                            }}
                          >
                            {item.category || '—'}
                          </span>
                        </td>
                      )}

                      {/* Old price — disabled */}
                      <td className="pl-col-old" data-label="Current Price">
                        <div className="pl-input-wrap">
                          <span className="pl-rupee">₹</span>
                          <input
                            type="number"
                            className="pl-price-input disabled"
                            value={Number(item.oldprice).toFixed(2)}
                            disabled
                            readOnly
                          />
                        </div>
                      </td>

                      {/* New price — editable */}
                      <td className="pl-col-new" data-label="New Price">
                        <div className="pl-input-wrap">
                          <span className="pl-rupee">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className={`pl-price-input editable${isDirty ? ' dirty' : ''}`}
                            placeholder={Number(item.newprice).toFixed(2)}
                            value={editVal ?? ''}
                            onChange={e => setEdit(id, e.target.value)}
                          />
                        </div>
                      </td>

                      <td className="pl-col-change" data-label="Change">
                        {diff !== null && !isNaN(diff) ? (
                          <span className={`pl-diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'}`}>
                            {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} ₹{Math.abs(diff).toFixed(2)}
                          </span>
                        ) : (
                          <span className="pl-diff-empty">—</span>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}


