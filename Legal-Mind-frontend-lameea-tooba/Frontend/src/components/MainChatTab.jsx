import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Sparkles, ChevronDown, ChevronUp, Shield, MessageSquare } from 'lucide-react';

const STATUS_MAP = {
  Active: "Active AI Analysis",
  Consulting: "Pending Review",
  Closed: "Draft Prepared"
};

export default function MainChatTab({
  cases,
  activeCaseId,
  onSelectCase,
  accessToken,
  onCaseCreated,
  onFindLawyer,
  onCreateCase
}) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [eventLogs, setEventLogs] = useState([]);
  const [showFindLawyerCTA, setShowFindLawyerCTA] = useState(false);
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const messagesEndRef = useRef(null);

  // Load single case details whenever activeCaseId or accessToken changes
  useEffect(() => {
    if (activeCaseId && accessToken) {
      loadCaseDetails();
    } else {
      setMessages([]);
      setEventLogs([]);
      setShowFindLawyerCTA(false);
    }
  }, [activeCaseId, accessToken]);

  const loadCaseDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${activeCaseId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Map API messages (role, content, created_at) to UI bubbles (sender, text, time)
      const mappedChats = (data.messages || []).map(m => ({
        id: m.id,
        sender: m.role,
        text: m.content,
        time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      setMessages(mappedChats);
      setEventLogs(data.event_logs || []);
      
      // Show find lawyer CTA if case status is 'active' and conversation has begun
      setShowFindLawyerCTA(data.case?.status === 'active' && mappedChats.length >= 2);
    } catch (err) {
      console.error('[MainChatTab] Load case failed:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0] || {
    id: activeCaseId,
    title: "General Legal Consultation",
    type: "Civil",
    status: "Active",
    description: "AI-guided legal inquiry."
  };
  const activeChats = messages;

  // Scroll to bottom when messages or typing status change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChats, isTyping, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !accessToken) return;

    const text = inputText;
    setInputText('');
    
    // 1. Append user message locally immediately
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          caseId: activeCaseId,
          message: text
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: data.response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setShowFindLawyerCTA(data.showFindLawyerCTA);

      if (!activeCaseId && data.caseId) {
        onCaseCreated(data.caseId);
      } else {
        // Refresh logs and case info
        loadCaseDetails();
      }
    } catch (err) {
      console.error('[MainChatTab] Send failed:', err.message);
      const errMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: 'Sorry, I encountered an error connecting to the AI backend. Please verify your connection.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Determine if we should show the "Find a Lawyer" recommendation banner
  const showFinderCta = !isLoading && showFindLawyerCTA && activeChats.length > 0 && activeChats[activeChats.length - 1].sender === 'assistant';

  const summaryItems = eventLogs.length > 0
    ? eventLogs.map(log => log.summary)
    : ["No event logs recorded yet. Start your consultation to populate this list."];

  // Global Empty State — only when no cases and user hasn't clicked "Start New Chat"
  if (cases.length === 0 && !isNewChatMode) {
    return (
      <div className="tab-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px' }}>
        <div className="empty-state-container" style={{ margin: '0' }}>
          <div className="empty-state-icon">
            <MessageSquare size={48} style={{ color: 'var(--color-earth-brown)' }} />
          </div>
          <h3 className="empty-state-title">No Consultations Yet</h3>
          <p className="empty-state-desc">
            Your case dashboard is currently empty. Start a confidential AI-guided session to analyze property, inheritance, tenancy, or corporate contracts under Pakistani law.
          </p>
          <button
            className="btn-primary"
            onClick={() => setIsNewChatMode(true)}
            style={{ padding: '10px 20px', fontSize: '14px', marginTop: '12px' }}
          >
            Start a New Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel" style={{ padding: '0', height: '100%' }}>
      <div className="chat-tab-container">
        
        {/* Chat Window */}
        <div className="chat-pane">
          {/* Header */}
          <div className="chat-pane-header">
            {isLoading ? (
              <div className="chat-active-case-info" style={{ width: '100%' }}>
                <div className="skeleton-pulse" style={{ height: '18px', width: '220px', marginBottom: '6px', borderRadius: '4px' }}></div>
                <div className="skeleton-pulse" style={{ height: '12px', width: '130px', borderRadius: '4px' }}></div>
              </div>
            ) : (
              <div className="chat-active-case-info">
                <h4>{activeCase.title}</h4>
                <p>{activeCase.type} Case • Status: {STATUS_MAP[activeCase.status] || activeCase.status}</p>
              </div>
            )}
            <div>
              {/* Mobile Case Switcher Dropdown */}
              {!isLoading && (
                <select
                  value={activeCaseId}
                  onChange={(e) => onSelectCase(Number(e.target.value))}
                  style={{
                    display: 'none',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px',
                    backgroundColor: 'var(--color-off-white)'
                  }}
                  className="mobile-case-select"
                >
                  {cases.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Active Case Event Log Dropdown */}
          {isLoading ? (
            <div className="active-case-summary-bar">
              <div className="summary-bar-header">
                <div className="summary-bar-title" style={{ width: '100%' }}>
                  <div className="skeleton-pulse" style={{ height: '16px', width: '160px', borderRadius: '4px' }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="active-case-summary-bar">
              <div className="summary-bar-header" onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                <div className="summary-bar-title">
                  <Sparkles size={16} style={{ color: 'var(--color-dark-pine)', marginRight: '4px' }} />
                  <span>AI Case Event Log</span>
                </div>
                <span className="summary-bar-toggle-text">
                  {isSummaryExpanded ? "Hide Summary" : "Show Summary"}
                  {isSummaryExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </div>
              {isSummaryExpanded && (
                <div className="summary-bar-content">
                  <ul className="summary-list">
                    {summaryItems.map((item, idx) => (
                      <li key={idx} className="summary-item" style={{ listStyleType: 'disc' }}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages-wrapper">
            <div className="chat-messages">
              {isLoading ? (
                <div className="chat-messages-container">
                  {/* Skeleton Bubble 1: Assistant */}
                  <div className="message-bubble assistant">
                    <div className="message-avatar skeleton-pulse skeleton-circle" style={{ width: '32px', height: '32px' }}></div>
                    <div className="message-text-wrapper" style={{ width: '70%', maxWidth: '500px' }}>
                      <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '100%', marginBottom: '8px' }}></div>
                      <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '90%', marginBottom: '8px' }}></div>
                      <div className="skeleton-pulse skeleton-text short" style={{ height: '14px', width: '45%' }}></div>
                    </div>
                  </div>
                  
                  {/* Skeleton Bubble 2: User */}
                  <div className="message-bubble user">
                    <div className="message-avatar skeleton-pulse skeleton-circle" style={{ width: '32px', height: '32px' }}></div>
                    <div className="message-text-wrapper" style={{ width: '50%', maxWidth: '350px' }}>
                      <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '100%', marginBottom: '8px' }}></div>
                      <div className="skeleton-pulse skeleton-text short" style={{ height: '14px', width: '60%' }}></div>
                    </div>
                  </div>

                  {/* Skeleton Bubble 3: Assistant */}
                  <div className="message-bubble assistant">
                    <div className="message-avatar skeleton-pulse skeleton-circle" style={{ width: '32px', height: '32px' }}></div>
                    <div className="message-text-wrapper" style={{ width: '65%', maxWidth: '450px' }}>
                      <div className="skeleton-pulse skeleton-text" style={{ height: '14px', width: '100%', marginBottom: '8px' }}></div>
                      <div className="skeleton-pulse skeleton-text short" style={{ height: '14px', width: '30%' }}></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="chat-messages-container">
                  <div className="chat-welcome-banner">
                    <div className="welcome-banner-icon"><Shield size={22} /></div>
                    <div className="welcome-banner-content">
                      <h5>Confidential Consultation Session</h5>
                      <p>
                        Your legal matter details are evaluated securely under Pakistani law. Please describe your situation in detail. Take your time to gather your facts.
                      </p>
                    </div>
                  </div>

                  {activeChats.length > 0 ? (
                    activeChats.map((msg, index) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div key={msg.id || `msg-${index}`} className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
                          <div className="message-avatar">
                            {isUser ? <User size={16} /> : <Sparkles size={16} />}
                          </div>
                          <div className="message-text-wrapper">
                            <div className="message-text">{msg.text}</div>
                            <span className="message-time">{msg.time}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-slate-blue-grey)' }}>
                      <p style={{ fontSize: '14.5px', fontStyle: 'italic' }}>No messages in this chat yet. Type a question below to begin your consultation.</p>
                    </div>
                  )}

                  {isTyping && (
                    <div className="message-bubble assistant">
                      <div className="message-avatar">
                        <Sparkles size={16} />
                      </div>
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  )}

                  {/* Find a Lawyer Button after assistant responses */}
                  {showFinderCta && (
                    <div className="find-lawyer-cta-box">
                      <div className="find-lawyer-cta-text">
                        <h5>Professional Consultation Recommended</h5>
                        <p>Matches found for a local {activeCase.type} advocate based on your query.</p>
                      </div>
                      <button
                        className="btn-pine"
                        onClick={() => onFindLawyer(activeCase)}
                      >
                        Find a Lawyer for This Case
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input Form */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <form onSubmit={handleSend} className="chat-input-bar">
                <input
                  type="text"
                  placeholder="Ask Legal Mind AI (e.g. What are my rights under DHA land bylaws?)..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="chat-input-field"
                  disabled={isTyping || isLoading}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={isTyping || !inputText.trim() || isLoading}
                  style={{ opacity: inputText.trim() && !isTyping && !isLoading ? 1 : 0.6 }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
