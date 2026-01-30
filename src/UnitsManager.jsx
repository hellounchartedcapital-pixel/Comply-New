import React, { useState, useEffect } from 'react';
import { X, Plus, Home, Edit2, Trash2, Save, Building2 } from 'lucide-react';
import { supabase } from './supabaseClient';

export function UnitsManager({ isOpen, onClose, properties }) {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    unit_number: '',
    floor: '',
    bedrooms: '',
    bathrooms: '',
    square_feet: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadUnits();
    }
  }, [isOpen, selectedProperty]);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('units')
        .select('*, property:properties(id, name)')
        .eq('user_id', user.id)
        .order('unit_number', { ascending: true });

      if (selectedProperty) {
        query = query.eq('property_id', selectedProperty);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUnits(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      unit_number: '',
      floor: '',
      bedrooms: '',
      bathrooms: '',
      square_feet: '',
      notes: '',
    });
  };

  const handleAdd = async () => {
    if (!formData.unit_number.trim() || !selectedProperty) {
      setError('Unit number and property are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('units')
        .insert({
          user_id: user.id,
          property_id: selectedProperty,
          unit_number: formData.unit_number.trim(),
          floor: formData.floor.trim() || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
          notes: formData.notes.trim() || null,
        })
        .select('*, property:properties(id, name)')
        .single();

      if (error) throw error;

      setUnits([...units, data]);
      setShowAddForm(false);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit.id);
    setFormData({
      unit_number: unit.unit_number || '',
      floor: unit.floor || '',
      bedrooms: unit.bedrooms?.toString() || '',
      bathrooms: unit.bathrooms?.toString() || '',
      square_feet: unit.square_feet?.toString() || '',
      notes: unit.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!formData.unit_number.trim()) {
      setError('Unit number is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('units')
        .update({
          unit_number: formData.unit_number.trim(),
          floor: formData.floor.trim() || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
          notes: formData.notes.trim() || null,
        })
        .eq('id', editingUnit);

      if (error) throw error;

      setUnits(units.map(u =>
        u.id === editingUnit ? { ...u, ...formData } : u
      ));
      setEditingUnit(null);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (unitId) => {
    if (!window.confirm('Delete this unit? Any tenants assigned to this unit will be unassigned.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', unitId);

      if (error) throw error;
      setUnits(units.filter(u => u.id !== unitId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Home className="text-emerald-600" size={24} />
              Manage Units
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add units to your properties for tenant assignment
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Property Filter */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Property
          </label>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All Properties</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">×</button>
            </div>
          )}

          {/* Add Unit Button */}
          {selectedProperty && !showAddForm && !editingUnit && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-gray-600 hover:text-emerald-600"
            >
              <Plus size={20} />
              <span className="font-medium">Add New Unit</span>
            </button>
          )}

          {!selectedProperty && (
            <div className="text-center py-8 text-gray-500">
              <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
              <p>Select a property above to manage its units</p>
            </div>
          )}

          {/* Add Form */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Add New Unit</h3>
              <UnitForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleAdd}
                onCancel={() => { setShowAddForm(false); resetForm(); }}
                saving={saving}
              />
            </div>
          )}

          {/* Units List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto" />
              <p className="text-gray-500 mt-2">Loading units...</p>
            </div>
          ) : units.length === 0 && selectedProperty ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Home size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No units yet</p>
              <p className="text-sm text-gray-400 mt-1">Add units to this property</p>
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow"
                >
                  {editingUnit === unit.id ? (
                    <UnitForm
                      formData={formData}
                      setFormData={setFormData}
                      onSave={handleSaveEdit}
                      onCancel={() => { setEditingUnit(null); resetForm(); }}
                      saving={saving}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Home className="text-emerald-600" size={24} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Unit {unit.unit_number}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            {unit.property && (
                              <span className="flex items-center gap-1">
                                <Building2 size={12} />
                                {unit.property.name}
                              </span>
                            )}
                            {unit.bedrooms && (
                              <span>{unit.bedrooms} BR</span>
                            )}
                            {unit.bathrooms && (
                              <span>{unit.bathrooms} BA</span>
                            )}
                            {unit.square_feet && (
                              <span>{unit.square_feet} sqft</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(unit)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(unit.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UnitForm({ formData, setFormData, onSave, onCancel, saving }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit Number *
          </label>
          <input
            type="text"
            value={formData.unit_number}
            onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="101, A1, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Floor
          </label>
          <input
            type="text"
            value={formData.floor}
            onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="1st, Ground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sq. Feet
          </label>
          <input
            type="number"
            value={formData.square_feet}
            onChange={(e) => setFormData({ ...formData, square_feet: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="850"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bedrooms
          </label>
          <input
            type="number"
            value={formData.bedrooms}
            onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bathrooms
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.bathrooms}
            onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="1.5"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="Corner unit, renovated, etc."
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Unit
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default UnitsManager;
