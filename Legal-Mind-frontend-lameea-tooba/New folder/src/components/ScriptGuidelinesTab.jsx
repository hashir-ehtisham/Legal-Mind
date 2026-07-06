import React, { useState, useEffect } from 'react';
import { ShieldCheck, EyeOff, CheckCircle2, XCircle, FileText, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function ScriptGuidelinesTab() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="tab-panel">
        <div className="tab-header">
          <h2 className="tab-title">Safe Consultation Guidelines</h2>
          <p className="tab-subtitle">Learn how to protect your privacy and legal interests during early consultations.</p>
        </div>

        <div className="guideline-container">
          <div className="guidelines-main">
            <div className="guideline-card skeleton-card">
              <div className="skeleton-pulse skeleton-title" style={{ height: '22px', width: '50%', borderRadius: '4px' }}></div>
              <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '90%', marginBottom: '24px', borderRadius: '4px' }}></div>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div className="skeleton-pulse skeleton-circle" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '30%', marginBottom: '6px', borderRadius: '4px' }}></div>
                    <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '85%', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="guideline-card skeleton-card" style={{ marginTop: '24px' }}>
              <div className="skeleton-pulse skeleton-title" style={{ height: '22px', width: '50%', borderRadius: '4px' }}></div>
              <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '90%', marginBottom: '24px', borderRadius: '4px' }}></div>
              {[1, 2, 3].map(n => (
                <div key={n} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div className="skeleton-pulse skeleton-circle" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '30%', marginBottom: '6px', borderRadius: '4px' }}></div>
                    <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '85%', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="guidelines-sidebar skeleton-card">
            <div className="skeleton-pulse skeleton-title" style={{ height: '20px', width: '60%', borderRadius: '4px' }}></div>
            <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '90%', marginBottom: '16px', borderRadius: '4px' }}></div>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ padding: '12px', background: 'rgba(225, 219, 201, 0.05)', borderRadius: '6px', marginBottom: '12px' }}>
                <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '40%', marginBottom: '6px', borderRadius: '4px' }}></div>
                <div className="skeleton-pulse skeleton-text" style={{ height: '12px', width: '100%', borderRadius: '4px' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="tab-header">
        <h2 className="tab-title">Safe Consultation Guidelines</h2>
        <p className="tab-subtitle">Learn how to protect your privacy and legal interests during early consultations.</p>
      </div>

      <div className="guideline-container">
        {/* Main Columns */}
        <div className="guidelines-main">
          {/* Section 1: What is safe */}
          <div className="guideline-card" style={{ borderTop: '4px solid var(--color-dark-pine)', boxShadow: '0 0 25px 8px rgba(46, 204, 113, 0.25), var(--shadow-sm)' }}>
            <h3>
              <ShieldCheck size={20} style={{ color: 'var(--color-dark-pine)' }} />
              <span>What is SAFE to share early on</span>
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-charcoal-grey-light)', marginBottom: '20px' }}>
              During initial consultation calls or messages, only share enough background context to confirm if the lawyer has the right expertise and lacks a conflict of interest:
            </p>
            <ul className="guideline-list">
              <li className="guideline-item safe">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Nature of the legal matter:</strong> {"Briefly explain if it is a property dispute, tenant eviction, family settlement, or corporate review (e.g. \"I have a boundary issue in DHA Lahore\")."}
                </div>
              </li>
              <li className="guideline-item safe">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Key timelines and dates:</strong> {"Outline the general sequence of events (e.g. \"The agreement was signed last June, and the eviction notice was received yesterday\")."}
                </div>
              </li>
              <li className="guideline-item safe">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Name of the opposing party:</strong> Provide the names of the individuals or companies involved. This is essential so the lawyer can check for conflicts of interest before taking your case.
                </div>
              </li>
              <li className="guideline-item safe">
                <CheckCircle2 size={16} />
                <div>
                  <strong>Your general goals:</strong> {"Let them know your desired outcome (e.g. \"I want to resolve the boundary dispute amicably\" or \"I need to ensure my employment contract is legally compliant\")."}
                </div>
              </li>
            </ul>
          </div>

          {/* Section 2: What to hold back */}
          <div className="guideline-card" style={{ borderTop: '4px solid #B22222', boxShadow: '0 0 25px 8px rgba(178, 58, 72, 0.25), var(--shadow-sm)' }}>
            <h3>
              <EyeOff size={20} style={{ color: '#B22222' }} />
              <span>What to HOLD BACK (until formal engagement)</span>
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--color-charcoal-grey-light)', marginBottom: '20px' }}>
              {"Do NOT share highly sensitive identifying information, passwords, or full credentials until you have verified the lawyer's credentials and signed a formal engagement deed:"}
            </p>
            <ul className="guideline-list">
              <li className="guideline-item unsafe">
                <XCircle size={16} />
                <div>
                  <strong>Exact Identification Numbers:</strong> Hold back CNIC numbers, passport details, or tax registration IDs.
                </div>
              </li>
              <li className="guideline-item unsafe">
                <XCircle size={16} />
                <div>
                  <strong>Full Residential Details:</strong> {"Avoid disclosing your exact home address. Refer instead to the sector, housing scheme, or general city district (e.g. \"DHA Phase 6\" instead of \"Plot 42-B, Street 3\")."}
                </div>
              </li>
              <li className="guideline-item unsafe">
                <XCircle size={16} />
                <div>
                  <strong>Financial & Banking Accounts:</strong> Never share bank account numbers, credit card details, income tax portal logins, or transactional balances.
                </div>
              </li>
              <li className="guideline-item unsafe">
                <XCircle size={16} />
                <div>
                  <strong>Original Title Documents:</strong> Do not upload or hand over original deeds, letters of allotment, or physical files. Share only redacted copies or digital photos with sensitive numbers blanked out.
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="guidelines-sidebar" style={{ boxShadow: '0 2px 8px rgba(203, 187, 160, 0.25), 0 0 18px 6px rgba(225, 219, 201, 0.20), var(--shadow-sm)' }}>
          <h4 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: 'var(--color-earth-brown)' }} />
            <span>Consultation Tips</span>
          </h4>
          <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--color-charcoal-grey-light)', marginBottom: '16px' }}>
            Before scheduling a meeting or sending documents:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ padding: '12px', background: 'var(--color-off-white)', borderRadius: '6px', borderLeft: '3px solid var(--color-earth-brown)' }}>
              <strong>1. Ask for credentials</strong>
              <p style={{ color: 'var(--color-charcoal-grey-light)', marginTop: '4px' }}>Verify the lawyer is enrolled in the provincial Bar Council (e.g., Punjab Bar Council, Sindh Bar Council).</p>
            </div>
            <div style={{ padding: '12px', background: 'var(--color-off-white)', borderRadius: '6px', borderLeft: '3px solid var(--color-earth-brown)' }}>
              <strong>2. Agree on fees upfront</strong>
              <p style={{ color: 'var(--color-charcoal-grey-light)', marginTop: '4px' }}>Clarify if the first meeting is free or if there is a flat advisory fee before starting.</p>
            </div>
            <div style={{ padding: '12px', background: 'var(--color-off-white)', borderRadius: '6px', borderLeft: '3px solid var(--color-earth-brown)' }}>
              <strong>3. Request an engagement deed</strong>
              <p style={{ color: 'var(--color-charcoal-grey-light)', marginTop: '4px' }}>A formal Wakalatnama or engagement agreement guarantees confidentiality and lists explicit obligations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
