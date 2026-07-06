import React, { useState, useEffect } from 'react';
import { Calendar, Briefcase, ChevronRight } from 'lucide-react';

const STATUS_MAP = {
  active: "Active AI Analysis",
  panic: "Comforting Guidance",
  lawyer_search: "Searching Advocates",
  in_progress: "Lawyer Selected",
  resolved: "Resolved"
};

export default function CasesTab({ cases, onOpenChat, onCreateCase }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const getStatusClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'badge-status-active';
      case 'in_progress':
      case 'lawyer_search':
        return 'badge-status-consulting';
      default:
        return 'badge-status-closed';
    }
  };

  if (!isLoading && cases.length === 0) {
    return (
      <div className="tab-panel">
        <div className="tab-header">
          <h2 className="tab-title">Your Cases</h2>
          <p className="tab-subtitle">Manage your ongoing legal matters and view past consulting records.</p>
        </div>
        <div className="empty-state-container">
          <div className="empty-state-icon">
            <Briefcase size={48} style={{ color: 'var(--color-earth-brown)' }} />
          </div>
          <h3 className="empty-state-title">No Active Cases</h3>
          <p className="empty-state-desc">
            You do not have any legal consultations logged yet. Start a new case to obtain structured procedural scripts and AI evaluations of your situation.
          </p>
          <button
            className="btn-primary"
            onClick={() => {
              if (onCreateCase) {
                onCreateCase();
              }
            }}
            style={{ padding: '10px 20px', fontSize: '13px', marginTop: '12px' }}
          >
            Create Your First Case
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h2 className="tab-title">Your Cases</h2>
        <p className="tab-subtitle">Manage your ongoing legal matters and view past consulting records.</p>
      </div>

      <div className="cases-grid">
        {isLoading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="case-card skeleton-card">
              <div className="skeleton-pulse skeleton-title" style={{ height: '22px', width: '80%', borderRadius: '4px' }}></div>
              <div className="case-badges" style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <span className="skeleton-pulse" style={{ height: '20px', width: '55px', borderRadius: '4px' }}></span>
                <span className="skeleton-pulse" style={{ height: '20px', width: '110px', borderRadius: '4px' }}></span>
              </div>
              <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '100%', marginBottom: '8px' }}></div>
              <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '92%', marginBottom: '8px' }}></div>
              <div className="skeleton-pulse skeleton-text short" style={{ height: '14px', width: '40%' }}></div>
              <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '130px', marginTop: '16px', marginBottom: '16px' }}></div>
              <div className="case-card-footer" style={{ borderTop: 'none', paddingTop: '0' }}>
                <div className="skeleton-pulse skeleton-button" style={{ height: '32px', width: '110px', borderRadius: '4px' }}></div>
              </div>
            </div>
          ))
        ) : (
          cases.map((c) => (
            <div key={c.id} className="case-card">
              <div className="case-card-header">
                <h3 className="case-card-title">{c.title}</h3>
              </div>

              <div className="case-badges">
                <span className="badge badge-type">{c.case_type || 'General'}</span>
                <span className={`badge ${getStatusClass(c.status)}`}>
                  {STATUS_MAP[c.status] || c.status}
                </span>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--color-charcoal-grey-light)', marginBottom: '20px', lineHeight: '1.4' }}>
                {c.status === 'panic' 
                  ? 'AI evaluation determined this query is focused on emotional support and crisis triage.' 
                  : 'AI evaluation of a potential legal dispute under Pakistani statutes.'}
              </p>

              <div className="case-card-date">
                <Calendar size={14} />
                <span>Created on {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              <div className="case-card-footer">
                <button
                  className="btn-primary"
                  onClick={() => onOpenChat(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px'
                  }}
                >
                  <span>Open Chat</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
