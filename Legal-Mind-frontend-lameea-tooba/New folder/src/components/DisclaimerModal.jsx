/* eslint-disable react/prop-types, no-unused-vars */
import React from 'react';
import Logo from './Logo';

export default function DisclaimerModal({ onAcknowledge }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ borderRadius: '20px' }}>
        <div className="modal-header">
          <Logo size={56} />
          <h3>Safety Advisory</h3>
        </div>
        <div className="modal-body" style={{ padding: '24px 28px' }}>
          <p className="modal-text" style={{ fontSize: '15px', color: 'var(--color-charcoal-grey-light)', lineHeight: '1.6' }}>
            Welcome to <strong>Legal Mind</strong>. Before utilizing our artificial intelligence legal helper, please read and acknowledge the following statement:
          </p>
          <div className="modal-warning-box" style={{ padding: '16px', background: 'var(--color-beige-sand-light)' }}>
            {"\"This AI can make mistakes and is not a substitute for a licensed lawyer.\""}
          </div>
          <p className="modal-text" style={{ fontSize: '13.5px', color: 'var(--color-charcoal-grey-light)', lineHeight: '1.5' }}>
            We recommend checking our <strong>Script & Guidelines</strong> section to understand how to consult legal professionals safely without exposing sensitive personal identification or financial accounts prematurely.
          </p>
        </div>
        <div className="modal-footer" style={{ padding: '16px 28px' }}>
          <button className="btn-primary" onClick={onAcknowledge}>
            I Acknowledge & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
