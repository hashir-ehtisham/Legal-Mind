import React, { useState, useEffect } from 'react';
import { LogOut, Save, MapPin, Camera } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import nationalAssemblyLogo from '../assets/national_assembly_logo.png';
import pakistanCodeLogo from '../assets/pakistan_code_logo.png';

const PAKISTANI_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
];

export default function ProfileTab({ userProfile, setUserProfile, onSignOut, triggerToast }) {
  const [name, setName] = useState(userProfile.name);
  const [city, setCity] = useState(userProfile.city || '');
  const [avatar, setAvatar] = useState(userProfile.avatar || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim(), city })
        .eq('id', user.id);

      if (error) throw error;

      setUserProfile({ ...userProfile, name: name.trim(), city, avatar });
      triggerToast('Profile saved successfully.');
    } catch (err) {
      console.error('[ProfileTab] Save failed:', err.message);
      triggerToast('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (nameStr) => {
    if (!nameStr) return 'U';
    return nameStr.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (isLoading) {
    return (
      <div className="tab-panel">
        <div className="tab-header">
          <h2 className="tab-title">Your Profile</h2>
          <p className="tab-subtitle">Manage your personal information and locale settings.</p>
        </div>

        <div className="profile-card">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div className="skeleton-pulse skeleton-circle" style={{ width: '100px', height: '100px', marginBottom: '12px', borderRadius: '50%' }}></div>
            <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '150px', borderRadius: '4px' }}></div>
          </div>
          <div className="profile-fields" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="profile-field-group">
              <div className="skeleton-pulse" style={{ height: '14px', width: '80px', marginBottom: '8px', borderRadius: '4px' }}></div>
              <div className="skeleton-pulse" style={{ height: '40px', width: '100%', borderRadius: '8px' }}></div>
            </div>
            <div className="profile-field-group">
              <div className="skeleton-pulse" style={{ height: '14px', width: '80px', marginBottom: '8px', borderRadius: '4px' }}></div>
              <div className="skeleton-pulse" style={{ height: '40px', width: '100%', borderRadius: '8px' }}></div>
            </div>
          </div>
          <div className="profile-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
            <div className="skeleton-pulse skeleton-button" style={{ height: '38px', width: '100px', borderRadius: '4px' }}></div>
            <div className="skeleton-pulse skeleton-button" style={{ height: '38px', width: '130px', borderRadius: '4px' }}></div>
          </div>
        </div>
      </div>
    );
  }

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
              disabled={isSaving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isSaving ? 0.7 : 1 }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* AI Authenticity and Data Sources Section */}
      <div className="profile-card" style={{ marginTop: '24px', padding: '24px 28px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-earth-brown)', marginBottom: '12px', fontFamily: 'var(--font-serif)', letterSpacing: '0.5px' }}>
          AI Authenticity & Legal Grounding
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--color-charcoal-grey-light)', lineHeight: '1.6', marginBottom: '20px' }}>
          Legal Mind AI is calibrated directly against official government database systems and legislative records. Every case recommendation and analysis quotes specific legal citations to ensure maximum accuracy:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--color-beige-sand-light)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)' }} className="authenticity-source-box">
            <img src={nationalAssemblyLogo} alt="National Assembly of Pakistan" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>National Assembly of Pakistan (na.gov.pk)</h4>
              <p style={{ fontSize: '12px', color: 'var(--color-charcoal-grey-light)', margin: '4px 0 0' }}>
                Indexes parliamentary acts, statutory bills, and constitutional amendments directly passed by the Parliament.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--color-beige-sand-light)', padding: '16px', borderRadius: '10px', border: '1px solid var(--color-border)' }} className="authenticity-source-box">
            <img src={pakistanCodeLogo} alt="Pakistan Code" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Pakistan Code Portal (pakistancode.gov.pk)</h4>
              <p style={{ fontSize: '12px', color: 'var(--color-charcoal-grey-light)', margin: '4px 0 0' }}>
                Grounds AI logic in official compiled federal laws published by the Ministry of Law and Justice.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
