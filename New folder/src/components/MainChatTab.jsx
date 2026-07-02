import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function MainChatTab({
  cases,
  activeCaseId,
  onSelectCase,
  chats,
  onSendMessage,
  setChats,
  onFindLawyer
}) {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0] || {
    id: 1,
    title: "General Legal Consultation",
    type: "Civil",
    status: "Active",
    description: "AI-guided legal inquiry."
  };
  const activeChats = chats[activeCaseId] || [];

  // Scroll to bottom when messages or typing status change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChats, isTyping]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const text = inputText;
    setInputText('');
    
    // 1. Send user message
    onSendMessage(activeCaseId, text);

    // 2. Trigger typing indicator
    setIsTyping(true);

    // 3. Mock AI response after delay
    setTimeout(() => {
      setIsTyping(false);
      
      let aiText = "";
      if (activeCase.type === "Civil") {
        aiText = `Based on civil regulations and the details you shared, this matter falls under standard contract or property guidelines in Pakistan. 

I recommend documenting all correspondence, bank receipts, and agreements. A formal legal notice might be required before taking court action. 

To proceed, you should consult an advocate specializing in Civil disputes. Would you like me to match you with a lawyer in your area?`;
      } else if (activeCase.type === "Corporate") {
        aiText = `Reviewing this corporate query under the Securities and Exchange Commission of Pakistan (SECP) guidelines and commercial codes. 

It is vital to verify if you have signed any non-disclosure agreements (NDAs) or partnership deeds. Keeping a log of official board resolutions and agreements will strengthen your position. 

I suggest consulting a Corporate/Tax attorney to draft or review the corporate filings. Shall we search for a matching lawyer?`;
      } else if (activeCase.type === "Family") {
        aiText = `Under family personal laws in Pakistan, matters of inheritance, custody, or settlements are handled in specialized family courts. 

It is best to gather birth certificates, inheritance certificates (Succession Certificates from NADRA), and Nikahnama documents to establish legal standing.

I highly recommend speaking to a family law attorney who understands the court dynamics. Should we check the directory for specialized family lawyers?`;
      } else {
        aiText = `I have analyzed your request regarding this legal query. In Pakistan, issues of this nature require review of local statutes. 

Make sure to preserve any written text records, witness accounts, and police reports (if applicable).

We recommend engaging a local advocate to evaluate your case options. Let's find a lawyer who handles these matters.`;
      }

      const assistantMessage = {
        id: Date.now() + 1,
        sender: "assistant",
        text: aiText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChats(prev => {
        const currentCaseChats = prev[activeCaseId] || [];
        return {
          ...prev,
          [activeCaseId]: [...currentCaseChats, assistantMessage]
        };
      });
    }, 1500);
  };

  // Determine if we should show the "Find a Lawyer" recommendation banner
  const showFinderCta = activeChats.length >= 3 && activeChats[activeChats.length - 1].sender === 'assistant';

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

    events.push(`Status: ${caseObj.status}`);
    return events;
  };

  const summaryItems = getAiSummaryForCase(activeCase);

  return (
    <div className="tab-panel" style={{ padding: '0', height: '100%' }}>
      <div className="chat-tab-container">
        
        {/* Chat Window */}
        <div className="chat-pane">
          {/* Header */}
          <div className="chat-pane-header">
            <div className="chat-active-case-info">
              <h4>{activeCase.title}</h4>
              <p>{activeCase.type} Case • Status: {activeCase.status}</p>
            </div>
            <div>
              {/* Mobile Case Switcher Dropdown */}
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
            </div>
          </div>

          {/* Active Case Event Log Dropdown */}
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

          {/* Messages */}
          <div className="chat-messages">
            <div className="chat-messages-container">
              <div className="chat-welcome-banner">
                <div className="welcome-banner-icon">🛡️</div>
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
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={isTyping || !inputText.trim()}
                  style={{ opacity: inputText.trim() && !isTyping ? 1 : 0.6 }}
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
