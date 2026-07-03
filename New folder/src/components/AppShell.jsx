import React, { useState, useEffect } from 'react';
import { Menu, ChevronDown, ChevronRight, Plus, LogOut, MessageSquare, Scale, BookOpen, User, Sparkles, FolderOpen, Sun, Moon } from 'lucide-react';
import Logo from './Logo';

const STATUS_MAP = {
  Active: "Active AI Analysis",
  Consulting: "Pending Review",
  Closed: "Draft Prepared"
};

export default function AppShell({
  currentTab,
  setCurrentTab,
  userProfile,
  onSignOut,
  cases,
  activeCaseId,
  onSelectCase,
  chats,
  onCreateCase,
  darkMode,
  toggleDarkMode,
  children
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedCaseId, setExpandedCaseId] = useState(activeCaseId);

  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [newCaseType, setNewCaseType] = useState('Civil');

  useEffect(() => {
    setExpandedCaseId(activeCaseId);
  }, [activeCaseId]);

  const navItems = [
    { id: 'chat', label: 'AI Consultation', icon: MessageSquare },
    { id: 'finder', label: 'Lawyer Finder', icon: Scale },
    { id: 'guidelines', label: 'Guidelines', icon: BookOpen },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleNavClick = (tabId) => {
    setCurrentTab(tabId);
  };

  const handleCaseSelect = (caseId) => {
    onSelectCase(caseId);
    setCurrentTab('chat');
    setExpandedCaseId(prev => prev === caseId ? null : caseId);
  };

  const toggleCaseSummary = (caseId, e) => {
    e.stopPropagation();
    setExpandedCaseId(prev => prev === caseId ? null : caseId);
  };

  const handleCreateCaseSubmit = (e) => {
    e.preventDefault();
    if (!newCaseTitle.trim()) return;
    onCreateCase(newCaseTitle, newCaseType);
    setNewCaseTitle('');
    setShowNewCaseForm(false);
    setCurrentTab('chat');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getAiSummaryForCase = (caseObj) => {
    const caseChats = chats[caseObj.id] || [];
    if (caseChats.length === 0) {
      return ["No chats recorded yet.", "Start a consultation to generate event log."];
    }

    const userMessages = caseChats.filter(m => m.sender === 'user');
    const aiMessages = caseChats.filter(m => m.sender === 'assistant');

    const events = [];
    events.push(`Consultation started on ${caseObj.date}`);

    if (userMessages.length > 0) {
      const text = userMessages[0].text.toLowerCase();
      let topic = "General legal query";
      if (text.includes("dispute") || text.includes("boundary")) {
        topic = "Property / boundary overlap dispute";
      } else if (text.includes("contract") || text.includes("clause") || text.includes("employment")) {
        topic = "Employment contract clause review";
      } else if (text.includes("evict") || text.includes("tenant") || text.includes("rent")) {
        topic = "Tenant eviction dispute";
      } else if (text.includes("inherit") || text.includes("heir") || text.includes("family")) {
        topic = "Inheritance property settlement";
      }
      events.push(`Issue: ${topic}`);
    }

    if (aiMessages.length > 0) {
      const advice = [];
      aiMessages.forEach(msg => {
        const txt = msg.text.toLowerCase();
        if (txt.includes("document") || txt.includes("record")) {
          advice.push("Keep correspondence and receipts");
        }
        if (txt.includes("lawyer") || txt.includes("advocate") || txt.includes("consult")) {
          advice.push("Consult a legal specialist");
        }
        if (txt.includes("nadra") || txt.includes("nikahnama")) {
          advice.push("Gather family certs / documents");
        }
        if (txt.includes("secp") || txt.includes("nda")) {
          advice.push("Verify corporate bylaws");
        }
      });
      const uniqueAdvice = [...new Set(advice)];
      uniqueAdvice.forEach(item => events.push(`Advice: ${item}`));
    }

    events.push(`Status: ${STATUS_MAP[caseObj.status] || caseObj.status}`);
    return events;
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <Logo size={38} showText={true} />
      </header>

      {/* Desktop Top Header Bar */}
      <header className="app-header">
        <div className="header-left">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <Menu size={20} />
          </button>
          <div className="header-title-container">
            <Logo size={32} showText={true} />
          </div>
        </div>
        <div className="header-right-group">
          <nav className="header-nav">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentTab === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`header-nav-item ${isActive ? 'active' : ''}`}
                >
                  <IconComponent size={18} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </nav>
          <div className="header-right">
            <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Theme">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Desktop Left Sidebar: Case Management & Summaries */}
        <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-logo" style={{ display: isSidebarCollapsed ? 'none' : 'flex' }}>
            <FolderOpen size={20} style={{ color: 'var(--color-beige-sand)' }} />
            <span style={{ color: '#E1DBC9', fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px' }}>CASE EVENT LOGS</span>
          </div>

          {/* New Case Section */}
          <div className="sidebar-new-case-section">
            <button
              className="sidebar-new-case-btn"
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
                setShowNewCaseForm(!showNewCaseForm);
              }}
              title="Add New Case"
            >
              <Plus size={18} />
              <span>New Case Consultation</span>
            </button>

            {!isSidebarCollapsed && showNewCaseForm && (
              <form onSubmit={handleCreateCaseSubmit} className="sidebar-new-case-form">
                <input
                  type="text"
                  placeholder="Case Title (e.g. Land Registry)"
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="sidebar-new-case-input"
                  required
                  autoFocus
                />
                <select
                  value={newCaseType}
                  onChange={(e) => setNewCaseType(e.target.value)}
                  className="sidebar-new-case-select"
                >
                  <option value="Civil">Civil Law</option>
                  <option value="Corporate">Corporate Law</option>
                  <option value="Family">Family Law</option>
                  <option value="Criminal">Criminal/Penal Law</option>
                  <option value="Labor">Labor/Employment</option>
                  <option value="Tax">Tax/Commercial</option>
                </select>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowNewCaseForm(false)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      background: 'none',
                      border: '1px solid rgba(225, 219, 201, 0.3)',
                      color: 'rgba(225, 219, 201, 0.7)',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--color-beige-sand)',
                      color: 'var(--color-earth-brown)',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="sidebar-nav-header">
            Active Cases
          </div>

          {/* Sidebar Cases Container */}
          <div className="sidebar-cases-container">
            {cases.map((c) => {
              const isActive = c.id === activeCaseId;
              const isSummaryExpanded = expandedCaseId === c.id;
              const summaryItems = getAiSummaryForCase(c);
              const initials = c.title.substring(0, 2).toUpperCase();

              if (isSidebarCollapsed) {
                return (
                  <div
                    key={c.id}
                    onClick={() => handleCaseSelect(c.id)}
                    className={`collapsed-case-badge ${isActive ? 'active' : ''}`}
                  >
                    {initials}
                    {/* Collapsed Tooltip with AI Summary */}
                    <div className="sidebar-tooltip">
                      <div className="tooltip-case-title">{c.title}</div>
                      <div className="tooltip-case-meta">{c.type} Case • {c.date}</div>
                      <div className="summary-title">
                        <Sparkles size={10} style={{ marginRight: '4px' }} />
                        AI Event Log Summary
                      </div>
                      <ul className="summary-list">
                        {summaryItems.map((item, idx) => (
                          <li key={idx} className="summary-item">{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={c.id}
                  className={`sidebar-case-item ${isActive ? 'active' : ''}`}
                >
                  <div className="case-main-clickable" onClick={() => handleCaseSelect(c.id)}>
                    <div className="case-text-details">
                      <span className="case-title-txt">{c.title}</span>
                      <div className="case-meta-txt" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span>{c.type}</span>
                        <span>•</span>
                        <span className={`badge-status-sidebar ${c.status.toLowerCase()}`}>
                          {STATUS_MAP[c.status] || c.status}
                        </span>
                      </div>
                    </div>
                    <button
                      className="case-accordion-toggle"
                      onClick={(e) => toggleCaseSummary(c.id, e)}
                      title="Toggle AI Summary Log"
                    >
                      {isSummaryExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>

                  <div
                    className={`case-summary-accordion ${isSummaryExpanded ? 'expanded' : ''}`}
                  >
                    <div className="summary-title">
                      <Sparkles size={10} style={{ marginRight: '4px' }} />
                      AI Event Log Summary
                    </div>
                    <ul className="summary-list">
                      {summaryItems.map((item, idx) => (
                        <li key={idx} className="summary-item">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Account Profile Section */}
          <div className="sidebar-user">
            {userProfile.avatar ? (
              <img
                src={userProfile.avatar}
                alt="Avatar"
                className="user-avatar-sm"
                onClick={() => isSidebarCollapsed && setCurrentTab('profile')}
                style={{ cursor: isSidebarCollapsed ? 'pointer' : 'default' }}
              />
            ) : (
              <div
                className="user-avatar-sm"
                onClick={() => isSidebarCollapsed && setCurrentTab('profile')}
                style={{ cursor: isSidebarCollapsed ? 'pointer' : 'default' }}
              >
                MH
              </div>
            )}
            {!isSidebarCollapsed && (
              <>
                <div className="user-info-sm" style={{ flex: 1 }}>
                  <div className="user-name-sm">{userProfile.name}</div>
                  <div className="user-city-sm">{userProfile.city || 'No City'}</div>
                </div>
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#B22222',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(178,34,34,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="app-content">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <div
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`mobile-nav-link ${isActive ? 'active' : ''}`}
            >
              <IconComponent size={20} />
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </>
  );
}
