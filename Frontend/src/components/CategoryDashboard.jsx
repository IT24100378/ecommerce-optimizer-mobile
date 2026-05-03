import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
const CATEGORIES_API_URL = `${API_BASE}/api/categories`;
const CATEGORIES_ADMIN_API_URL = `${API_BASE}/api/categories/admin`;
const PRODUCTS_API_URL = `${API_BASE}/api/products`;

export default function CategoryDashboard() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        axios.get(CATEGORIES_ADMIN_API_URL),
        axios.get(PRODUCTS_API_URL),
      ]);
      setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch {
      setError('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  const productCountByCategory = products.reduce((acc, product) => {
    const key = String(product.category || '').trim();
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    setActionError('');
    try {
      await axios.post(CATEGORIES_API_URL, { name });
      setNewName('');
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to create category.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (originalName) => {
    const targetName = editingValue.trim();
    if (!targetName) {
      setActionError('Category name is required.');
      return;
    }
    if (targetName === originalName) {
      setEditingName('');
      setEditingValue('');
      return;
    }

    setSaving(true);
    setActionError('');
    try {
      const categoryId = resolveCategoryIdByName(originalName);
      await axios.put(`${CATEGORIES_API_URL}/${categoryId}`, { name: targetName });
      setEditingName('');
      setEditingValue('');
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete category "${name}"?`)) return;

    setSaving(true);
    setActionError('');
    try {
      const categoryId = resolveCategoryIdByName(name);
      await axios.delete(`${CATEGORIES_API_URL}/${categoryId}`);
      await fetchData();
    } catch (err) {
      const backendMessage = err.response?.data?.error;
      setActionError(backendMessage || 'Failed to delete category.');
    } finally {
      setSaving(false);
    }
  };

  const resolveCategoryIdByName = (name) => {
    const category = categories.find((item) => item.name === name);
    if (!category?.id) throw new Error('Category id not found');
    return category.id;
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Category Management</h1>
        </div>

        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-4 mb-6 flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Create'}
          </button>
        </form>

        {error && <div className="bg-red-100 border border-red-300 text-red-700 rounded p-3 mb-4">{error}</div>}
        {actionError && <div className="bg-amber-100 border border-amber-300 text-amber-800 rounded p-3 mb-4">{actionError}</div>}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No categories found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {categories.map((category) => {
                  const name = category.name;
                  const linkedProducts = productCountByCategory[name] || 0;
                  const isEditing = editingName === name;
                  return (
                    <tr key={name}>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-800">{name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{linkedProducts}</td>
                      <td className="px-6 py-4 space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleUpdate(name)}
                              disabled={saving}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-1.5 rounded disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingName(''); setEditingValue(''); }}
                              className="bg-gray-400 hover:bg-gray-500 text-white text-sm font-medium px-3 py-1.5 rounded"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingName(name); setEditingValue(name); setActionError(''); }}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-3 py-1.5 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(name)}
                              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
