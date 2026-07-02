import React, { useState } from 'react';
import { Camera, LogOut, Save, MapPin } from 'lucide-react';

const PAKISTANI_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
];

export default function ProfileTab({ userProfile, setUserProfile, onSignOut, triggerToast }) {
  const [name, setName] = useState(userProfile.name);
  const [city, setCity] = useState(userProfile.city || '');
  const [avatar, setAvatar] = useState(userProfile.avatar || null);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
        triggerToast("Avatar updated successfully (preview).");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUserProfile({
      ...userProfile,
      name,
      city,
      avatar
    });
    triggerToast("Profile changes saved successfully.");
  };

  const getInitials = (nameStr) => {
    if (!nameStr) return 'U';
    return nameStr.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h2 className="tab-title">Your Profile</h2>
        <p className="tab-subtitle">Manage your personal information and locale settings.</p>
      </div>

      <div className="profile-card">
        <form onSubmit={handleSave}>
          {/* Avatar Upload */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-container">
              {avatar ? (
                <img src={avatar} alt="Profile" className="profile-avatar-img" />
              ) : (
                <div className="profile-avatar-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: 'bold', color: 'var(--color-earth-brown)' }}>
                  {getInitials(name)}
                </div>
              )}
              
              <label htmlFor="avatar-input" className="avatar-upload-overlay">
                <Camera size={20} />
                <span className="avatar-upload-text">Upload Photo</span>
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7B84' }}>Click photo to upload custom avatar image</p>
          </div>

          {/* Form Fields */}
          <div className="profile-fields">
            <div className="profile-field-group">
              <label className="profile-label">Display Name</label>
              <input
                type="text"
                className="profile-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div className="profile-field-group">
              <label className="profile-label">Primary City</label>
              <div style={{ position: 'relative' }}>
                <select
                  className="profile-input"
                  style={{ width: '100%', paddingRight: '36px', appearance: 'none', cursor: 'pointer' }}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                >
                  <option value="">No City Selected</option>
                  {PAKISTANI_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <MapPin size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-blue-grey)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <button
              type="button"
              className="btn-signout"
              onClick={onSignOut}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>

            <button
              type="submit"
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
