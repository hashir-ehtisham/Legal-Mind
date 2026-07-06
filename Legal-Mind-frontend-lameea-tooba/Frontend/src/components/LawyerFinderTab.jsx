import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Phone, Send, FileText, Filter, AlertCircle } from 'lucide-react';

const PAKISTANI_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
];

export default function LawyerFinderTab({
  userCity,
  prefilledFilters,
  clearPrefilledFilters,
  activeCase,
  triggerToast,
  accessToken
}) {
  // Filter States
  const [filterType, setFilterType] = useState('Any');
  const [filterExp, setFilterExp] = useState('Any');
  const [filterRep, setFilterRep] = useState('Any');
  const [filterCity, setFilterCity] = useState(userCity || 'Any');
  const [filterGender, setFilterGender] = useState('Any');

  // Lawyer data from API
  const [lawyers, setLawyers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Draft Message Flow States
  const [activeDraftLawyerId, setActiveDraftLawyerId] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [draftLawyerData, setDraftLawyerData] = useState(null);
  const [searchStatus, setSearchStatus] = useState('');

  // Handle prefilled filters passed from Main Chat Tab (redirected from case)
  useEffect(() => {
    if (prefilledFilters) {
      if (prefilledFilters.type) setFilterType(prefilledFilters.type);
      if (prefilledFilters.city) setFilterCity(prefilledFilters.city);
      if (prefilledFilters.experience) setFilterExp(prefilledFilters.experience);
      
      // Auto-trigger search immediately for the prefilled filters
      setIsLoading(true);
      setHasSearched(true);
      
      const triggerPrefilledSearch = async () => {
        try {
          const body = {
            city: prefilledFilters.city || filterCity,
            caseType: prefilledFilters.type || filterType,
            gender: filterGender !== 'Any' ? filterGender.toLowerCase() : 'any',
            minExperience: prefilledFilters.experience === '10+' ? 10 : prefilledFilters.experience === '5-10' ? 5 : prefilledFilters.experience === '1-5' ? 1 : 0,
            minReputation: filterRep !== 'Any' ? parseFloat(filterRep) : 0,
            caseId: activeCase?.id || undefined,
          };
          const res = await fetch('/api/lawyers/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(body)
          });
          if (res.ok) {
            const data = await res.json();
            setLawyers(data.lawyers || []);
          }
        } catch (err) {
          console.error('[LawyerFinder] Prefilled search failed:', err.message);
        } finally {
          setIsLoading(false);
        }
      };

      triggerPrefilledSearch();
      clearPrefilledFilters();
    }
  }, [prefilledFilters, clearPrefilledFilters]);

  // Handle user city updates (e.g. from Profile tab)
  useEffect(() => {
    if (userCity && filterCity === 'Any') {
      setFilterCity(userCity);
    }
  }, [userCity]);

  const handleSearch = async () => {
    if (!accessToken) {
      triggerToast('You must be logged in to search lawyers.');
      return;
    }
    if (filterCity === 'Any') {
      triggerToast('Please select a city to search lawyers.');
      return;
    }
    if (filterType === 'Any') {
      triggerToast('Please select a case type to search lawyers.');
      return;
    }
    setIsLoading(true);
    setHasSearched(true);
    setSearchStatus('🔍 Searching the web for lawyers in ' + filterCity + '...');
    try {
      const body = {
        city: filterCity,
        caseType: filterType,
        gender: filterGender !== 'Any' ? filterGender.toLowerCase() : 'any',
        minExperience: filterExp === '10+' ? 10 : filterExp === '5-10' ? 5 : filterExp === '1-5' ? 1 : 0,
        minReputation: filterRep !== 'Any' ? parseFloat(filterRep) : 0,
        caseId: activeCase?.id || undefined,
      };

      const res = await fetch('/api/lawyers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSearchStatus('');
      setLawyers(data.lawyers || []);
    } catch (err) {
      setSearchStatus('');
      console.error('[LawyerFinder] Search failed:', err.message);
      triggerToast('Failed to search lawyers. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateDraft = async (lawyer) => {
    if (!activeCase?.id) {
      triggerToast('Please open a case first to generate a personalized draft message.');
      return;
    }
    setActiveDraftLawyerId(lawyer.id);
    setDraftLawyerData(lawyer);
    setIsDraftLoading(true);
    setDraftText('');
    try {
      const res = await fetch('/api/lawyers/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ caseId: activeCase.id, lawyerName: lawyer.name })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDraftText(data.draft || '');
    } catch (err) {
      console.error('[LawyerFinder] Draft generation failed:', err.message);
      const fallback = `Dear ${lawyer.name},\n\nI would like to seek your professional legal consultation regarding my case.\n\nPlease let me know your availability for an initial consultation.\n\nBest regards,\nThe Client`;
      setDraftText(fallback);
      triggerToast('AI draft unavailable — a basic template has been prepared for you.');
    } finally {
      setIsDraftLoading(false);
    }
  };

  const handleContact = async (lawyer, channel) => {
    if (!accessToken || !activeCase?.id) {
      triggerToast('Please open a case first to contact a lawyer.');
      return;
    }

    const messageToSend = activeDraftLawyerId === lawyer.id && draftText ? draftText : '';
    const emailToUse = lawyer.email || `${lawyer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@pakistanbarcouncil.org`;
    const phoneToUse = lawyer.whatsapp_number || '+923001234567';

    try {
      const res = await fetch('/api/lawyers/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          caseId: activeCase.id,
          lawyerId: lawyer.id,
          finalMessage: messageToSend,
          channel
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (channel === 'email') {
        if (data.emailSent) {
          triggerToast(`Email sent to ${lawyer.name}!`);
        } else {
          const subject = `Legal Assistance Inquiry — ${activeCase.title || 'General'}`;
          window.location.href = `mailto:${emailToUse}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageToSend)}`;
          triggerToast(`Opening email client with pre-filled message...`);
        }
      } else if (channel === 'whatsapp' && data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
        triggerToast(`Opening WhatsApp for ${lawyer.name}`);
      } else if (channel === 'call' && data.phoneNumber) {
        window.location.href = `tel:${data.phoneNumber}`;
        triggerToast(`Dialing ${lawyer.name}`);
      }
    } catch (err) {
      console.error('[LawyerFinder] Contact failed:', err.message);
      // Fallback to direct links
      if (channel === 'whatsapp') {
        const cleanNumber = phoneToUse.replace(/\D/g, '');
        const msg = activeDraftLawyerId === lawyer.id && draftText ? draftText : '';
        const url = msg
          ? `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`
          : `https://wa.me/${cleanNumber}`;
        window.open(url, '_blank');
      } else if (channel === 'call') {
        window.location.href = `tel:${phoneToUse}`;
      } else if (channel === 'email') {
        const subject = `Legal Assistance Inquiry — ${activeCase.title || 'General'}`;
        window.location.href = `mailto:${emailToUse}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageToSend)}`;
        triggerToast(`Opening email client...`);
      }
    }
  };

  const handleSelectLawyer = async (lawyer) => {
    if (!accessToken || !activeCase?.id) {
      triggerToast('Please open a case first to select a lawyer.');
      return;
    }
    try {
      const res = await fetch('/api/lawyers/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ caseId: activeCase.id, lawyerId: lawyer.id })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      triggerToast(`✅ ${lawyer.name} selected as your lawyer. Case is now in progress.`);
    } catch (err) {
      console.error('[LawyerFinder] Select lawyer failed:', err.message);
      triggerToast('Failed to select lawyer. Please try again.');
    }
  };

  // Render Stars
  const renderStars = (rating) => {
    if (!rating) return null;
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star key={i} size={14} fill={i < floor ? "currentColor" : "none"} stroke="currentColor" />
      );
    }
    return <span className="reputation-stars">{stars} <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: 'bold' }}>{Number(rating).toFixed(1)}</span></span>;
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  };

  const suggestedLawyers = lawyers.filter(l => l.status === 'suggested');
  const regularLawyers = lawyers;

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h2 className="tab-title">Lawyer Finder</h2>
        <p className="tab-subtitle">Search, filter, and consult verified advocates across Pakistan.</p>
      </div>

      <div className="lawyer-tab-content">
        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-grid">
            <div className="filter-group">
              <label className="filter-label">Case Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
                <option value="Any">Any Case Type</option>
                <option value="Civil">Civil Law</option>
                <option value="Corporate">Corporate Law</option>
                <option value="Family">Family Law</option>
                <option value="Criminal">Criminal Law</option>
                <option value="Labor">Labor Law</option>
                <option value="Tax">Tax Law</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Experience</label>
              <select value={filterExp} onChange={(e) => setFilterExp(e.target.value)} className="filter-select">
                <option value="Any">Any Experience</option>
                <option value="1-5">1 - 5 Years</option>
                <option value="5-10">5 - 10 Years</option>
                <option value="10+">10+ Years</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Reputation</label>
              <select value={filterRep} onChange={(e) => setFilterRep(e.target.value)} className="filter-select">
                <option value="Any">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.8">4.8+ Stars</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">City</label>
              <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="filter-select">
                <option value="Any">Any City</option>
                {PAKISTANI_CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Gender</label>
              <div className="gender-filter-buttons">
                {['Any', 'Male', 'Female'].map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`gender-btn ${filterGender === g ? 'active' : ''}`}
                    onClick={() => setFilterGender(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" onClick={handleSearch} style={{ padding: '10px 28px', fontSize: '14px' }}>
              Search Lawyers
            </button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="lawyers-grid">
            {searchStatus && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '12px 16px', background: 'var(--color-off-white)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '8px', fontSize: '13px', color: 'var(--color-dark-pine)', fontWeight: 500 }}>
                {searchStatus}
              </div>
            )}
            {[1, 2, 3].map((n) => (
              <div key={`skeleton-${n}`} className="lawyer-card skeleton-card">
                <div className="lawyer-card-profile" style={{ display: 'flex', gap: '16px' }}>
                  <div className="skeleton-pulse skeleton-circle" style={{ width: '48px', height: '48px', borderRadius: '50%' }}></div>
                  <div className="lawyer-details" style={{ flex: 1 }}>
                    <div className="skeleton-pulse skeleton-title" style={{ height: '18px', width: '150px', marginBottom: '8px' }}></div>
                    <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '100px', marginBottom: '8px' }}></div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div className="skeleton-pulse" style={{ height: '18px', width: '60px', borderRadius: '4px' }}></div>
                      <div className="skeleton-pulse" style={{ height: '18px', width: '70px', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                </div>
                <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '90%', marginTop: '16px', marginBottom: '12px' }}></div>
                <div className="lawyer-actions" style={{ display: 'flex', gap: '8px' }}>
                  <div className="skeleton-pulse skeleton-button" style={{ height: '32px', flex: 1, borderRadius: '4px' }}></div>
                  <div className="skeleton-pulse skeleton-button" style={{ height: '32px', flex: 1, borderRadius: '4px' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Suggested (top-ranked) lawyers */}
        {!isLoading && suggestedLawyers.length > 0 && (
          <div className="suggested-section">
            <div className="suggested-header">
              <span className="suggested-badge">RECOMMENDED FOR YOU</span>
              {activeCase && (
                <p style={{ fontSize: '13px', color: '#2D4530', fontWeight: '500' }}>
                  Based on case: <strong>{activeCase.title}</strong> in {userCity || 'Lahore'}
                </p>
              )}
            </div>
            <div className="suggested-grid">
              {suggestedLawyers.map((lawyer) => (
                <LawyerCard
                  key={`suggest-${lawyer.id}`}
                  lawyer={lawyer}
                  isSuggested={true}
                  activeDraftLawyerId={activeDraftLawyerId}
                  draftText={draftText}
                  setDraftText={setDraftText}
                  isDraftLoading={isDraftLoading}
                  onDraft={handleGenerateDraft}
                  onContact={handleContact}
                  onSelect={handleSelectLawyer}
                  getInitials={getInitials}
                  renderStars={renderStars}
                  triggerToast={triggerToast}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Directory */}
        {!isLoading && hasSearched && (
          <div>
            <h3 className="brand-font" style={{ fontSize: '20px', marginBottom: '16px', color: '#5E4B3B' }}>
              {`Lawyer Directory (${regularLawyers.length} found)`}
            </h3>

            {regularLawyers.length > 0 ? (
              <div className="lawyers-grid">
                {regularLawyers.map((lawyer) => (
                  <LawyerCard
                    key={lawyer.id}
                    lawyer={lawyer}
                    isSuggested={false}
                    activeDraftLawyerId={activeDraftLawyerId}
                    draftText={draftText}
                    setDraftText={setDraftText}
                    isDraftLoading={isDraftLoading}
                    onDraft={handleGenerateDraft}
                    onContact={handleContact}
                    onSelect={handleSelectLawyer}
                    getInitials={getInitials}
                    renderStars={renderStars}
                    triggerToast={triggerToast}
                  />
                ))}
              </div>
            ) : (
              <div style={{ background: 'var(--color-white)', border: '1px dashed var(--color-border)', borderRadius: '12px', padding: '40px', textAlign: 'center', color: 'var(--color-slate-blue-grey)' }}>
                <Filter size={36} style={{ marginBottom: '12px' }} />
                <p>No lawyers found matching the selected filters. Try broadening your criteria.</p>
              </div>
            )}
          </div>
        )}

        {/* Initial empty state before first search */}
        {!isLoading && !hasSearched && (
          <div style={{ background: 'var(--color-white)', border: '1px dashed var(--color-border)', borderRadius: '12px', padding: '60px', textAlign: 'center', color: 'var(--color-slate-blue-grey)' }}>
            <Filter size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h4 style={{ marginBottom: '8px', fontSize: '18px' }}>Find Your Advocate</h4>
            <p style={{ fontSize: '14px' }}>Set your filters above and click <strong>Search Lawyers</strong> to browse verified advocates across Pakistan.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Lawyer Card Sub-Component ────────────────────────────────────────────────
function LawyerCard({ lawyer, isSuggested, activeDraftLawyerId, draftText, setDraftText, isDraftLoading, onDraft, onContact, onSelect, getInitials, renderStars, triggerToast }) {
  const isActive = activeDraftLawyerId === lawyer.id;

  return (
    <div
      className="lawyer-card"
      style={isSuggested ? { borderLeft: '4px solid var(--color-dark-pine)', background: 'var(--color-white)' } : {}}
    >
      {/* Unverified Warning */}
      {lawyer.unverified_warning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFF8E6', border: '1px solid #F0D090', borderRadius: '6px', padding: '8px 10px', marginBottom: '12px', fontSize: '12px', color: '#7A5C00' }}>
          <AlertCircle size={14} />
          <span>{lawyer.unverified_warning}</span>
        </div>
      )}

      <div className="lawyer-card-profile">
        <div className="lawyer-photo-placeholder" style={isSuggested ? { background: 'var(--color-dark-pine-light)', color: 'var(--color-dark-pine)' } : {}}>
          {getInitials(lawyer.name)}
        </div>
        <div className="lawyer-details">
          <h4 className="lawyer-name">{lawyer.name}</h4>
          <div className="lawyer-exp-reputation">
            <span>{lawyer.experience_years ? `${lawyer.experience_years} yrs exp` : 'Experience unknown'}</span>
            {lawyer.reputation_score && renderStars(lawyer.reputation_score)}
          </div>
          <div className="lawyer-specializations">
            {(lawyer.specialization || []).map((spec) => (
              <span key={spec} className="spec-tag">{spec}</span>
            ))}
          </div>
        </div>
      </div>

      {isSuggested && lawyer.suggested_reasoning && (
        <div className="suggested-reason-bubble">
          💡 {lawyer.suggested_reasoning}
        </div>
      )}

      {lawyer.bio && (
        <p style={{ fontSize: '13px', color: 'var(--color-charcoal-grey-light)', margin: '10px 0', lineHeight: '1.5' }}>
          {lawyer.bio.length > 140 ? lawyer.bio.slice(0, 140) + '...' : lawyer.bio}
        </p>
      )}

      <div className="lawyer-city-info">
        <span>📍 {lawyer.city}</span>
        {!lawyer.verified && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#888' }}>Unverified listing</span>}
      </div>

      {/* Draft Message Flow */}
      {isActive ? (
        <div className="message-flow-container">
          <div className="message-flow-header">
            <FileText size={16} />
            <span>Consultation Draft Message</span>
          </div>
          {isDraftLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-slate-blue-grey)', fontSize: '13px' }}>
              Generating AI draft message...
            </div>
          ) : (
            <textarea
              className="message-textarea"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Your personalized message will appear here..."
            />
          )}
          <div className="message-flow-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn-primary" onClick={() => onContact(lawyer, 'email')} style={{ width: '100%', fontSize: '12px', padding: '10px' }}>
              ✉️ Send via Email
            </button>
            <button className="btn-action-icon whatsapp" onClick={() => onContact(lawyer, 'whatsapp')} style={{ width: '100%', fontSize: '12px', padding: '10px' }}>
              💬 Send via WhatsApp
            </button>
          </div>
        </div>
      ) : (
        <div className="draft-btn-container">
          <button className="btn-draft" onClick={() => onDraft(lawyer)}>
            <MessageSquare size={14} />
            <span>Generate Draft Message</span>
          </button>
        </div>
      )}

      <div className="lawyer-actions">
        <button
          className="btn-action-icon email"
          style={{ textDecoration: 'none', cursor: 'pointer', border: 'none' }}
          onClick={() => onContact(lawyer, 'email')}
        >
          ✉️ Email
        </button>
        <button
          className="btn-action-icon whatsapp"
          style={{ textDecoration: 'none', cursor: 'pointer', border: 'none' }}
          onClick={() => onContact(lawyer, 'whatsapp')}
        >
          💬 WhatsApp
        </button>
        <button
          className="btn-action-icon call"
          style={{ textDecoration: 'none', cursor: 'pointer', border: 'none' }}
          onClick={() => onContact(lawyer, 'call')}
        >
          📞 Call
        </button>
        <button onClick={() => onSelect(lawyer)} className="btn-action-icon" style={{ background: 'var(--color-dark-pine)', color: '#fff', cursor: 'pointer', border: 'none' }}>
          ✅ Select
        </button>
      </div>
    </div>
  );
}
