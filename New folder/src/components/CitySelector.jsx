import React, { useState } from 'react';
import Logo from './Logo';

const PAKISTANI_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad"
];

export default function CitySelector({ onCitySaved }) {
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const filteredCities = PAKISTANI_CITIES.filter(city =>
    city.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (selectedCity) {
      onCitySaved(selectedCity);
    }
  };

  return (
    <div className="login-container">
      <div className="city-selector-card" style={{ borderRadius: '20px' }}>
        <div className="modal-header">
          <Logo size={56} />
          <h3>Select Your City</h3>
        </div>
        <div className="modal-body" style={{ padding: '24px 28px' }}>
          <p className="modal-text" style={{ fontSize: '14.5px', color: '#5A5A5A', marginBottom: '12px', lineHeight: '1.5' }}>
            To connect you with localized lawyers and apply regional Pakistani regulations, please select your primary city:
          </p>

          <div className="city-search-container">
            <span className="city-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search city (e.g. Lahore, Karachi...)"
              className="city-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="city-list">
            {filteredCities.length > 0 ? (
              filteredCities.map((city) => (
                <div
                  key={city}
                  className={`city-item ${selectedCity === city ? 'selected' : ''}`}
                  onClick={() => setSelectedCity(city)}
                >
                  <span>{city}</span>
                  {selectedCity === city && <span style={{ color: '#2D4530', fontWeight: 'bold' }}>✓</span>}
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', textAlign: 'center', color: '#6B7B84', fontSize: '14px' }}>
                No cities found matching your search.
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 28px' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={!selectedCity}
            style={{
              opacity: selectedCity ? 1 : 0.6,
              cursor: selectedCity ? 'pointer' : 'not-allowed'
            }}
          >
            Save & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
