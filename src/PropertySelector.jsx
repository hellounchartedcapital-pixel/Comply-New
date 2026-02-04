// PropertySelector.jsx - Reusable property selector component for tabs

import React, { useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';

export function PropertySelector({
  properties,
  selectedProperty,
  onSelectProperty,
  loading = false,
  className = ''
}) {
  const [showDropdown, setShowDropdown] = useState(false);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 px-4 py-2.5 bg-gray-100 rounded-xl ${className}`}>
        <div className="animate-pulse w-4 h-4 bg-gray-300 rounded"></div>
        <div className="animate-pulse w-24 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl transition-all text-sm font-medium text-gray-700 shadow-sm"
      >
        <Building2 size={18} className="text-gray-500" />
        <span className="max-w-[200px] truncate">
          {selectedProperty ? selectedProperty.name : 'All Properties'}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="p-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  onSelectProperty(null);
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  !selectedProperty
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 size={16} className={!selectedProperty ? 'text-emerald-500' : 'text-gray-400'} />
                  <span>All Properties</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-6">View data from all properties</p>
              </button>

              <div className="my-1 border-t border-gray-100"></div>

              {properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => {
                    onSelectProperty(property);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedProperty?.id === property.id
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Building2 size={16} className={selectedProperty?.id === property.id ? 'text-emerald-500' : 'text-gray-400'} />
                    <span className="truncate">{property.name}</span>
                  </div>
                  {property.address && (
                    <p className="text-xs text-gray-500 truncate mt-0.5 ml-6">{property.address}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PropertySelector;
