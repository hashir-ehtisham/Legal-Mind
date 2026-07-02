import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Phone, Send, FileText, Filter, CheckCircle } from 'lucide-react';

const LAWYERS_DATABASE = [
  {
    id: 1,
    name: "Barrister Aisha Khan",
    gender: "Female",
    city: "Islamabad",
    types: ["Civil", "Corporate"],
    specializations: ["Civil Litigation", "Contract Disputes"],
    experience: "12 years",
    experienceVal: 12,
    reputation: 4.9,
    email: "aisha.khan@legalmind.pk",
    whatsapp: "+923001234567",
    phone: "+9251123456",
    initials: "AK",
    whySuggested: "Top-rated civil litigation specialist in Islamabad with extensive experience handling land and high-value commercial disputes."
  },
  {
    id: 2,
    name: "Advocate Mian Tariq",
    gender: "Male",
    city: "Lahore",
    types: ["Civil"],
    specializations: ["Property Law", "DHA Land Bylaws"],
    experience: "15 years",
    experienceVal: 15,
    reputation: 4.8,
    email: "tariq.law@outlook.pk",
    whatsapp: "+923217654321",
    phone: "+9242765432",
    initials: "MT",
    whySuggested: "DHA property dispute expert with 15+ years experience resolving Cantonment Board boundaries and allotment disputes in Lahore."
  },
  {
    id: 3,
    name: "Barrister Zainab Malik",
    gender: "Female",
    city: "Karachi",
    types: ["Family", "Civil"],
    specializations: ["Family Disputes", "Inheritance Settlement"],
    experience: "8 years",
    experienceVal: 8,
    reputation: 4.7,
    email: "zainab.malik@chambers.pk",
    whatsapp: "+923339876543",
    phone: "+9221987654",
    initials: "ZM",
    whySuggested: "Specializes in complex estate inheritance divisions and family mediation under Islamic personal codes in Karachi."
  },
  {
    id: 4,
    name: "Advocate Farhan Ali",
    gender: "Male",
    city: "Faisalabad",
    types: ["Corporate", "Tax"],
    specializations: ["Corporate Tax", "FBR Audit Defense"],
    experience: "10 years",
    experienceVal: 10,
    reputation: 4.6,
    email: "farhan.tax@faisalabadlaw.com",
    whatsapp: "+923455556667",
    phone: "+9241555666",
    initials: "FA",
    whySuggested: "FBR tax specialist with proven track record representing industrial corporations in Faisalabad."
  },
  {
    id: 5,
    name: "Advocate Sarah Ahmed",
    gender: "Female",
    city: "Lahore",
    types: ["Corporate", "Labor"],
    specializations: ["Employment Law", "Contract Drafting"],
    experience: "6 years",
    experienceVal: 6,
    reputation: 4.8,
    email: "sarah.ahmed@advocates.pk",
    whatsapp: "+923011122334",
    phone: "+9242112233",
    initials: "SA",
    whySuggested: "Employment and labor dispute expert specializing in workplace contract compliance and negotiations in Lahore."
  },
  {
    id: 6,
    name: "Advocate Bilal Shah",
    gender: "Male",
    city: "Peshawar",
    types: ["Criminal", "Civil"],
    specializations: ["Criminal Defense", "Land Registry Deeds"],
    experience: "18 years",
    experienceVal: 18,
    reputation: 4.9,
    email: "bilal.shah@peshawarchambers.pk",
    whatsapp: "+923029988776",
    phone: "+9291998877",
    initials: "BS",
    whySuggested: "Highly respected veteran trial lawyer in Khyber Pakhtunkhwa with 18+ years in land registry litigation and defense."
  }
];

const PAKISTANI_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad"
];

export default function LawyerFinderTab({
  userCity,
  prefilledFilters,
  clearPrefilledFilters,
  activeCase,
  triggerToast
}) {
  // Filter States
  const [filterType, setFilterType] = useState('Any');
  const [filterExp, setFilterExp] = useState('Any');
  const [filterRep, setFilterRep] = useState('Any');
  const [filterCity, setFilterCity] = useState(userCity || 'Any');
  const [filterGender, setFilterGender] = useState('Any');

  // Draft Message Flow States
  const [activeDraftLawyerId, setActiveDraftLawyerId] = useState(null);
  const [draftText, setDraftText] = useState('');

  // Handle prefilled filters passed from Main Chat Tab
  useEffect(() => {
    if (prefilledFilters) {
      if (prefilledFilters.type) setFilterType(prefilledFilters.type);
      if (prefilledFilters.city) setFilterCity(prefilledFilters.city);
      // Clear them once applied
      clearPrefilledFilters();
    }
  }, [prefilledFilters, clearPrefilledFilters]);

  // Handle user city updates (e.g. from Profile tab)
  useEffect(() => {
    if (userCity && filterCity === 'Any') {
      setFilterCity(userCity);
    }
  }, [userCity]);

  // Render Stars
  const renderStars = (rating) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          fill={i < floor ? "currentColor" : "none"}
          stroke="currentColor"
        />
      );
    }
    return <span className="reputation-stars">{stars} <span style={{ marginLeft: '4px', fontSize: '12px', fontWeight: 'bold' }}>{rating}</span></span>;
  };

  // Filter Logic
  const filteredLawyers = LAWYERS_DATABASE.filter(lawyer => {
    // Type Filter
    if (filterType !== 'Any' && !lawyer.types.includes(filterType)) return false;

    // Experience Filter
    if (filterExp !== 'Any') {
      if (filterExp === '1-5' && (lawyer.experienceVal < 1 || lawyer.experienceVal > 5)) return false;
      if (filterExp === '5-10' && (lawyer.experienceVal < 5 || lawyer.experienceVal > 10)) return false;
      if (filterExp === '10+' && lawyer.experienceVal < 10) return false;
    }

    // Reputation Filter
    if (filterRep !== 'Any' && lawyer.reputation < parseFloat(filterRep)) return false;

    // City Filter
    if (filterCity !== 'Any' && lawyer.city.toLowerCase() !== filterCity.toLowerCase()) return false;

    // Gender Filter
    if (filterGender !== 'Any' && lawyer.gender !== filterGender) return false;

    return true;
  });

  // Suggested Lawyers logic:
  // Pick up to 2 lawyers who best match the ACTIVE case's type and city
  const suggestedLawyers = LAWYERS_DATABASE.filter(lawyer => {
    if (!activeCase) return false;
    const matchesType = lawyer.types.includes(activeCase.type);
    const matchesCity = lawyer.city.toLowerCase() === (userCity || 'Lahore').toLowerCase();
    return matchesType && matchesCity;
  }).slice(0, 2);

  // If no direct matches, fallback to highest rated lawyers
  const finalSuggestions = suggestedLawyers.length > 0
    ? suggestedLawyers
    : LAWYERS_DATABASE.filter(l => l.reputation >= 4.8).slice(0, 2);

  const startDraftFlow = (lawyer) => {
    setActiveDraftLawyerId(lawyer.id);
    const caseTitleText = activeCase ? `"${activeCase.title}"` : "my legal concern";
    const caseTypeText = activeCase ? activeCase.type : "General";
    
    const draft = `Dear ${lawyer.name},

I found your profile on Legal Mind. I would like to seek your professional legal consultation regarding a ${caseTypeText} law matter: ${caseTitleText}. 

Please let me know your availability for an initial consultation, your standard consultation terms, and the best way to share the initial facts. 

Best regards,
Mian Hamza
Client at Legal Mind (${userCity || 'Lahore'})`;

    setDraftText(draft);
  };

  const saveAndUseMessage = (email, whatsapp) => {
    navigator.clipboard.writeText(draftText);
    triggerToast("Draft message copied to clipboard!");
    setActiveDraftLawyerId(null);
  };

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
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
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
              <select
                value={filterExp}
                onChange={(e) => setFilterExp(e.target.value)}
                className="filter-select"
              >
                <option value="Any">Any Experience</option>
                <option value="1-5">1 - 5 Years</option>
                <option value="5-10">5 - 10 Years</option>
                <option value="10+">10+ Years</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Reputation</label>
              <select
                value={filterRep}
                onChange={(e) => setFilterRep(e.target.value)}
                className="filter-select"
              >
                <option value="Any">Any Rating</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.8">4.8+ Stars</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">City</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="filter-select"
              >
                <option value="Any">Any City</option>
                {PAKISTANI_CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Gender</label>
              <div className="gender-filter-buttons">
                <button
                  type="button"
                  className={`gender-btn ${filterGender === 'Any' ? 'active' : ''}`}
                  onClick={() => setFilterGender('Any')}
                >
                  Any
                </button>
                <button
                  type="button"
                  className={`gender-btn ${filterGender === 'Male' ? 'active' : ''}`}
                  onClick={() => setFilterGender('Male')}
                >
                  Male
                </button>
                <button
                  type="button"
                  className={`gender-btn ${filterGender === 'Female' ? 'active' : ''}`}
                  onClick={() => setFilterGender('Female')}
                >
                  Female
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Lawyers section */}
        {finalSuggestions.length > 0 && (
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
              {finalSuggestions.map((lawyer) => (
                <div
                  key={`suggest-${lawyer.id}`}
                  className="lawyer-card"
                  style={{ borderLeft: '4px solid var(--color-dark-pine)', background: 'var(--color-white)' }}
                >
                  <div className="lawyer-card-profile">
                    <div className="lawyer-photo-placeholder" style={{ background: 'var(--color-dark-pine-light)', color: 'var(--color-dark-pine)' }}>
                      {lawyer.initials}
                    </div>
                    <div className="lawyer-details">
                      <h4 className="lawyer-name">{lawyer.name}</h4>
                      <div className="lawyer-exp-reputation">
                        <span>{lawyer.experience}</span>
                        {renderStars(lawyer.reputation)}
                      </div>
                      <div className="lawyer-specializations">
                        {lawyer.specializations.map((spec) => (
                          <span key={spec} className="spec-tag">{spec}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="suggested-reason-bubble">
                    💡 {lawyer.whySuggested}
                  </div>

                  <div className="lawyer-city-info">
                    <span>📍 {lawyer.city}</span>
                  </div>

                  {activeDraftLawyerId === lawyer.id ? (
                    <div className="message-flow-container">
                      <div className="message-flow-header">
                        <FileText size={16} />
                        <span>Consultation Draft Message</span>
                      </div>
                      <textarea
                        className="message-textarea"
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                      />
                      <div className="message-flow-footer">
                        <button
                          className="btn-primary"
                          onClick={() => saveAndUseMessage(lawyer.email, lawyer.whatsapp)}
                          style={{ width: '100%', fontSize: '12px', padding: '10px' }}
                        >
                          Save & Use This Message
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="draft-btn-container">
                      <button
                        className="btn-draft"
                        onClick={() => startDraftFlow(lawyer)}
                      >
                        <MessageSquare size={14} />
                        <span>Draft Message for {lawyer.name.split(' ')[1]}</span>
                      </button>
                    </div>
                  )}

                  <div className="lawyer-actions">
                    <a
                      href={`mailto:${lawyer.email}`}
                      className="btn-action-icon email"
                      onClick={() => triggerToast(`Opening mail client to ${lawyer.email}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      ✉️ Email
                    </a>
                    <a
                      href={`https://wa.me/${lawyer.whatsapp.replace('+', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-action-icon whatsapp"
                      onClick={() => triggerToast(`Redirecting to WhatsApp: ${lawyer.whatsapp}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      💬 WhatsApp
                    </a>
                    <a
                      href={`tel:${lawyer.phone}`}
                      className="btn-action-icon call"
                      onClick={() => triggerToast(`Dialing: ${lawyer.phone}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      📞 Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Directory List */}
        <div>
          <h3 className="brand-font" style={{ fontSize: '20px', marginBottom: '16px', color: '#5E4B3B' }}>
            Lawyer Directory ({filteredLawyers.length})
          </h3>

          {filteredLawyers.length > 0 ? (
            <div className="lawyers-grid">
              {filteredLawyers.map((lawyer) => (
                <div key={lawyer.id} className="lawyer-card">
                  <div className="lawyer-card-profile">
                    <div className="lawyer-photo-placeholder">
                      {lawyer.initials}
                    </div>
                    <div className="lawyer-details">
                      <h4 className="lawyer-name">{lawyer.name}</h4>
                      <div className="lawyer-exp-reputation">
                        <span>{lawyer.experience}</span>
                        {renderStars(lawyer.reputation)}
                      </div>
                      <div className="lawyer-specializations">
                        {lawyer.specializations.map((spec) => (
                          <span key={spec} className="spec-tag">{spec}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lawyer-city-info">
                    <span>📍 {lawyer.city}</span>
                  </div>

                  {activeDraftLawyerId === lawyer.id ? (
                    <div className="message-flow-container">
                      <div className="message-flow-header">
                        <FileText size={16} />
                        <span>Consultation Draft Message</span>
                      </div>
                      <textarea
                        className="message-textarea"
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                      />
                      <div className="message-flow-footer">
                        <button
                          className="btn-primary"
                          onClick={() => saveAndUseMessage(lawyer.email, lawyer.whatsapp)}
                          style={{ width: '100%', fontSize: '12px', padding: '10px' }}
                        >
                          Save & Use This Message
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="draft-btn-container">
                      <button
                        className="btn-draft"
                        onClick={() => startDraftFlow(lawyer)}
                      >
                        <MessageSquare size={14} />
                        <span>Draft Message for {lawyer.name.split(' ').slice(1).join(' ')}</span>
                      </button>
                    </div>
                  )}

                  <div className="lawyer-actions">
                    <a
                      href={`mailto:${lawyer.email}`}
                      className="btn-action-icon email"
                      onClick={() => triggerToast(`Opening mail client to ${lawyer.email}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      ✉️ Email
                    </a>
                    <a
                      href={`https://wa.me/${lawyer.whatsapp.replace('+', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-action-icon whatsapp"
                      onClick={() => triggerToast(`Redirecting to WhatsApp: ${lawyer.whatsapp}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      💬 WhatsApp
                    </a>
                    <a
                      href={`tel:${lawyer.phone}`}
                      className="btn-action-icon call"
                      onClick={() => triggerToast(`Dialing: ${lawyer.phone}`)}
                      style={{ textDecoration: 'none' }}
                    >
                      📞 Call
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--color-white)',
                border: '1px dashed var(--color-border)',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                color: 'var(--color-slate-blue-grey)'
              }}
            >
              <Filter size={36} style={{ marginBottom: '12px' }} />
              <p>No lawyers found matching the selected filters. Try broadening your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
