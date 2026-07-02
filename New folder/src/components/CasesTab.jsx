import React from 'react';
import { Calendar, Briefcase, ChevronRight, Clock } from 'lucide-react';

export default function CasesTab({ cases, onOpenChat }) {
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'badge-status-active';
      case 'consulting':
        return 'badge-status-consulting';
      default:
        return 'badge-status-closed';
    }
  };

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h2 className="tab-title">Your Cases</h2>
        <p className="tab-subtitle">Manage your ongoing legal matters and view past consulting records.</p>
      </div>

      <div className="cases-grid">
        {cases.map((c) => (
          <div key={c.id} className="case-card">
            <div className="case-card-header">
              <h3 className="case-card-title">{c.title}</h3>
            </div>

            <div className="case-badges">
              <span className="badge badge-type">{c.type}</span>
              <span className={`badge ${getStatusClass(c.status)}`}>
                {c.status}
              </span>
            </div>

            <p style={{ fontSize: '14px', color: '#5A5A5A', marginBottom: '20px', lineHeight: '1.4' }}>
              {c.description}
            </p>

            <div className="case-card-date">
              <Calendar size={14} />
              <span>Created on {c.date}</span>
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
        ))}
      </div>
    </div>
  );
}
