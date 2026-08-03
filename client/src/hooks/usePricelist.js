import { useState, useCallback } from 'react';
import { fetchPricelist, fetchCategories, bulkUpdatePrices } from '../api/pricelist';

export function usePricelist() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const [edits,      setEdits]      = useState({});   // { [_id]: newpriceString }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load all items + categories on mount
  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEdits({});
    try {
      const [cats, data] = await Promise.all([fetchCategories(), fetchPricelist()]);
      setCategories(cats);
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load items for one category
  const loadCategory = useCallback(async (category) => {
    setLoading(true);
    setError(null);
    setEdits({});
    try {
      const data = await fetchPricelist(category);
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setEdit = useCallback((id, value) => {
    setEdits(prev => ({ ...prev, [id]: value }));
  }, []);

  const saveAll = useCallback(async () => {
    const updates = Object.entries(edits)
      .filter(([, v]) => v !== '' && !isNaN(Number(v)))
      .map(([id, v]) => ({ _id: id, newprice: Number(v) }));

    if (updates.length === 0) {
      showToast('No changes to save.', 'info');
      return;
    }

    setSaving(true);
    try {
      const result = await bulkUpdatePrices(updates);
      // Apply locally: move newprice → oldprice, set edits value as newprice
      setItems(prev =>
        prev.map(item => {
          const id = String(item._id);
          if (edits[id] !== undefined && edits[id] !== '') {
            return { ...item, oldprice: item.newprice, newprice: Number(edits[id]) };
          }
          return item;
        })
      );
      setEdits({});
      showToast(`✓ ${result.modified} price(s) updated successfully`, 'success');
    } catch (err) {
      showToast(`✗ ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }, [edits]);

  const dirtyCount = Object.values(edits).filter(v => v !== '').length;

  return {
    items, categories, loading, saving, error, toast,
    edits, setEdit, saveAll, loadAll, loadCategory, dirtyCount,
  };
}
