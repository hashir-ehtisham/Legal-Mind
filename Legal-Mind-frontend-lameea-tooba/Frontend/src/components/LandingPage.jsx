/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import Logo from './Logo';
import './LandingPage.css';
import { supabase } from '../lib/supabaseClient';

// Import newly copied assets
import bookBorder from '../assets/book boarder png.png';
import peoplePath from '../assets/download (2).png';
import scalesOutline from '../assets/scales_outline.png';
import postageStamps from '../assets/postage_stamps.png';
import nationalAssemblyLogo from '../assets/national_assembly_logo.png';
import pakistanCodeLogo from '../assets/pakistan_code_logo.png';
import lawScaleImg from '../assets/close-up-law-scale.jpg';

// Preset Questions for AI Sandbox
const PRESETS = [
  {
    id: 'inheritance',
    label: "Family Inheritance Division",
    prompt: "How is inheritance divided among heirs under Islamic Shariah personal law in Pakistan?",
    response: "Under Islamic Shariah law in Pakistan (governed by the Muslim Family Laws Ordinance, 1961), inheritance distribution depends on the surviving heirs:\n\n1. Children & Spouse: If there are children, the widow receives 1/8th of the estate. The remaining estate is distributed between sons and daughters, where a son receives twice the share of a daughter (2:1 ratio).\n2. Parents: If the deceased has children, parents receive 1/6th each.\n3. Debt & Wills: Any outstanding debts, funeral expenses, and valid wills (up to 1/3rd of the estate to non-heirs) must be settled before inheritance division.\n\nWould you like to generate a draft division table based on your specific family tree?"
  },
  {
    id: 'tenant',
    label: "Tenant Rent Eviction Notice",
    prompt: "My tenant hasn't paid rent for three months in Clifton, Karachi. What is the legal procedure to evict them?",
    response: "In Sindh, tenancy matters are governed by the Sindh Rented Premises Ordinance, 1979. To evict a tenant for non-payment of rent:\n\n1. Default Period: A tenant must pay rent within 15 days of the due date. If they fail for 60 days, it constitutes a default.\n2. Written Notice: Serve a formal written eviction notice giving a reasonable time (typically 30 days) to vacate or pay.\n3. Rent Controller: If they refuse, you must file an eviction application before the Rent Controller of your district. Landlords cannot forcibly eject tenants or cut utility connections without a court order.\n\nWould you like me to review your tenancy agreement and draft an eviction notice?"
  },
  {
    id: 'boundary',
    label: "DHA Plot Boundary Dispute",
    prompt: "My neighbor in DHA Phase 6 is overlapping their fence onto my plot boundary. What should I do?",
    response: "Property boundary disputes in DHA Phase 6 fall under cantonment bylaws and civil jurisdiction:\n\n1. DHA Demarcation: Apply for a formal plot demarcation request through the DHA Karachi Transfer & Record Directorate. DHA surveyors will measure both plots based on the master registry map.\n2. Boundary Report: DHA will issue an official demarcation report confirming any overlaps.\n3. Resolution: If the neighbor refuses to comply with the DHA report, DHA can issue penalties/violations, and you can file a Suit for Permanent Injunction and Demarcation in the Civil Court.\n\nDo you want me to draft a demarcation request letter for DHA Karachi?"
  }
];

// Mock Lawyers database for the showcase matcher
const MOCK_LAWYERS = {
  Civil: {
    Lahore: { name: "Barrister Salman Akram", rating: "4.9", cases: 284, exp: "15 years", office: "Gulberg III, Lahore" },
    Karachi: { name: "Advocate Ayesha Malik", rating: "4.8", cases: 195, exp: "12 years", office: "Clifton Block 5, Karachi" },
    Islamabad: { name: "Advocate Zainab Khan", rating: "4.9", cases: 210, exp: "14 years", office: "F-7 Markaz, Islamabad" }
  },
  Family: {
    Lahore: { name: "Advocate Mian Hamza", rating: "4.7", cases: 162, exp: "8 years", office: "DHA Phase 5, Lahore" },
    Karachi: { name: "Advocate Fatima Raza", rating: "4.9", cases: 245, exp: "16 years", office: "DHA Phase 2, Karachi" },
    Islamabad: { name: "Advocate Bilal Ahmed", rating: "4.8", cases: 180, exp: "11 years", office: "G-11 Markaz, Islamabad" }
  },
  Corporate: {
    Lahore: { name: "Barrister Haris Butt", rating: "4.9", cases: 312, exp: "18 years", office: "Model Town, Lahore" },
    Karachi: { name: "Advocate Asif Ali", rating: "4.8", cases: 204, exp: "13 years", office: "I.I. Chundrigar Road, Karachi" },
    Islamabad: { name: "Barrister Sarah Qureshi", rating: "4.9", cases: 220, exp: "14 years", office: "Blue Area, Islamabad" }
  },
  Criminal: {
    Lahore: { name: "Advocate Tariq Lodhi", rating: "4.8", cases: 410, exp: "22 years", office: "Mozang Road, Lahore" },
    Karachi: { name: "Advocate Kamran Shaikh", rating: "4.7", cases: 325, exp: "19 years", office: "Saddar, Karachi" },
    Islamabad: { name: "Barrister Omer Farooq", rating: "4.9", cases: 198, exp: "11 years", office: "E-11, Islamabad" }
  },
  Tax: {
    Lahore: { name: "Advocate Nabeel Dar", rating: "4.8", cases: 145, exp: "9 years", office: "Ferozepur Road, Lahore" },
    Karachi: { name: "Advocate Murtaza Shah", rating: "4.9", cases: 260, exp: "17 years", office: "Korangi Industrial Area, Karachi" },
    Islamabad: { name: "Advocate Sana Javed", rating: "4.7", cases: 130, exp: "7 years", office: "I-8 Markaz, Islamabad" }
  }
};

export default function LandingPage({ onLoginSuccess, darkMode, toggleDarkMode }) {
  const [scrolled, setScrolled] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
    } catch (err) {
      console.error('[LandingPage] OAuth error:', err.message);
      setIsSigningIn(false);
    }
  };

  // AI Chat Sandbox state
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'assistant', text: "Hello! I am your Legal Mind AI assistant. Select a legal prompt on the left, or sign up to consult me with your custom case query." }
  ]);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showSandboxCta, setShowSandboxCta] = useState(false);

  // Lawyer Finder matcher state
  const [matchDomain, setMatchDomain] = useState("Civil");
  const [matchCity, setMatchCity] = useState("Lahore");
  const [matchedLawyer, setMatchedLawyer] = useState(MOCK_LAWYERS.Civil.Lahore);
  const [isChangingLawyer, setIsChangingLawyer] = useState(false);

  const authSectionRef = useRef(null);
  const sandboxSectionRef = useRef(null);
  const featuresSectionRef = useRef(null);
  const lawyerSectionRef = useRef(null);

  // Handle scroll effect on header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update matched lawyer when domain/city changes
  useEffect(() => {
    setIsChangingLawyer(true);
    const timer = setTimeout(() => {
      const lawyer = MOCK_LAWYERS[matchDomain]?.[matchCity] || MOCK_LAWYERS.Civil.Lahore;
      setMatchedLawyer(lawyer);
      setIsChangingLawyer(false);
    }, 450); // smooth animation timing
    return () => clearTimeout(timer);
  }, [matchDomain, matchCity]);

  // Scroll helper
  const scrollTo = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Run AI sandbox typing simulation
  const handleSelectPreset = (preset) => {
    if (isTyping) return;
    setSelectedPreset(preset);
    setShowSandboxCta(false);

    // Set user question immediately
    setChatMessages([
      { sender: 'assistant', text: "Hello! I am your Legal Mind AI assistant. Select a legal prompt on the left, or sign up to consult me with your custom case query." },
      { sender: 'user', text: preset.prompt }
    ]);

    setIsTyping(true);
    setTypingText("");

    let index = 0;
    const responseText = preset.response;

    // Simulate character typing
    const interval = setInterval(() => {
      if (index < responseText.length) {
        setTypingText((prev) => prev + responseText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        // Append completed message to messages array
        setChatMessages((prev) => [
          ...prev,
          { sender: 'assistant', text: responseText }
        ]);
        setTypingText("");
        setShowSandboxCta(true); // Show overlay sign up prompt
      }
    }, 15); // Fast, snappy typing
  };

  return (
    <div className="landing-wrapper">
      {/* Background blobs for premium look */}
      <div className="landing-bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Navigation Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <Logo size={42} showText={true} />
        
        <nav className="nav-links">
          <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo(featuresSectionRef); }}>Features</a>
          <a href="#sandbox" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo(sandboxSectionRef); }}>AI Assistant Demo</a>
          <a href="#lawyers" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo(lawyerSectionRef); }}>Find Lawyers</a>
          <a href="#signin" className="nav-link" onClick={(e) => { e.preventDefault(); scrollTo(authSectionRef); }}>Get Started</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="theme-toggle-btn" onClick={toggleDarkMode} title="Toggle Dark/Light Mode">
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button className="header-cta-btn" onClick={() => scrollTo(authSectionRef)}>
            Sign In
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-section hero-section" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="hero-content" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-tag">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
              <circle cx="4" cy="4" r="4" />
            </svg>
            AI-Powered Legal Intelligence
          </div>
          <h1 className="hero-title">
            Legal Clarity. <span>AI Guidance.</span> Right Representation.
          </h1>
          <p className="hero-subtitle">
            Legal disputes can be overwhelming and costly. Legal Mind uses advanced artificial intelligence to analyze your situation, provide structured guidelines, and instantly connect you with verified local lawyers.
          </p>
          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => scrollTo(sandboxSectionRef)}>
              Try AI Sandbox
            </button>
            <button className="btn-hero-secondary" onClick={() => scrollTo(authSectionRef)}>
              Sign Up Now
            </button>
          </div>

        </div>

        {/* Hero Interactive Visual Dashboard */}
        <div className="hero-visual" style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-dashboard-mock" style={{ position: 'relative', zIndex: 1 }}>
            <div className="mock-header">
              <Logo size={28} showText={true} />
              <div className="mock-indicator">LIVE PORTAL</div>
            </div>
            <div className="mock-cases">
              <div className="mock-case-card active-mock">
                <div className="mock-case-title">DHA Phase 6 Property Overlap</div>
                <div className="mock-case-type">
                  <span>Civil Dispute</span>
                  <span className="mock-badge">Active AI Analysis</span>
                </div>
              </div>
              <div className="mock-case-card">
                <div className="mock-case-title">Family Estate Inheritance Division</div>
                <div className="mock-case-type">
                  <span>Family Settlement</span>
                  <span className="mock-badge" style={{ background: 'var(--color-slate-blue-grey-light)' }}>Pending Review</span>
                </div>
              </div>
              <div className="mock-case-card">
                <div className="mock-case-title">Tenant Eviction Notice - Clifton</div>
                <div className="mock-case-type">
                  <span>Civil Law</span>
                  <span className="mock-badge" style={{ background: 'rgba(76,175,80,0.1)', color: '#4CAF50' }}>Draft Prepared</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" ref={featuresSectionRef} className="landing-section" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="section-title-wrap">
            <span className="section-tag">Powerful Ecosystem</span>
            <h2 className="section-main-title">How Legal Mind Protects & Guides You</h2>
          </div>

        <div className="features-grid">
          {/* Card 1 */}
          <div className="feature-card" onClick={() => scrollTo(sandboxSectionRef)}>
            <div className="feature-card-glow"></div>
            <div className="feature-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 className="feature-title">AI Legal Analysis</h3>
            <p className="feature-desc">
              Understand your rights instantly. Paste contracts, describe boundary lines or family tree details, and receive immediate step-by-step guidance grounded in Pakistani laws.
            </p>
          </div>

          {/* Card 2 */}
          <div className="feature-card" onClick={() => scrollTo(lawyerSectionRef)}>
            <div className="feature-card-glow"></div>
            <div className="feature-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="feature-title">Smart Lawyer Match</h3>
            <p className="feature-desc">
              {"Don't hire blindly. Our algorithms review your case type, city, and budget, instantly connecting you with qualified, verified attorneys specializing in civil, corporate, or family issues."}
            </p>
          </div>

          {/* Card 3 */}
          <div className="feature-card" onClick={() => scrollTo(authSectionRef)}>
            <div className="feature-card-glow"></div>
            <div className="feature-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="feature-title">Secure & Confidential</h3>
            <p className="feature-desc">
              Your legal files and chat histories are protected by end-to-end data encryption. Discuss sensitive information and prepare for court with complete peace of mind.
            </p>
          </div>
        </div>
      </div>
    </section>

      {/* Interactive AI Chat Sandbox */}
      <section id="sandbox" ref={sandboxSectionRef} className="landing-section sandbox-section" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* MINDFUL BACKGROUND ASSET 2: Stack of books representing legal knowledge base in the background */}
        <img 
          src={bookBorder} 
          alt="Vintage books background decoration" 
          className="books-bg-img" 
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '180px',
            height: '100%',
            objectFit: 'cover',
            opacity: darkMode ? 0.09 : 0.16,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'opacity 0.3s ease'
          }}
        />

        <div className="sandbox-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="sandbox-info" style={{ paddingLeft: '40px' }}>
            <span className="section-tag">Interactive Sandbox</span>
            <h3>Test Drive Legal Mind AI</h3>
            <p>
              Experience how our legal assistant handles complex real-world disputes. Select one of the common Pakistani legal scenarios below to watch the AI analyze the situation in real-time.
            </p>
            <div className="sandbox-prompts">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`sandbox-prompt-btn ${selectedPreset.id === preset.id ? 'active' : ''}`}
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isTyping}
                >
                  <span>{preset.label}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Terminal window showing chatbot */}
          <div className="sandbox-terminal">
            <div className="terminal-header">
              <div className="terminal-dots">
                <div className="terminal-dot dot-red"></div>
                <div className="terminal-dot dot-yellow"></div>
                <div className="terminal-dot dot-green"></div>
              </div>
              <div className="terminal-title">LEGAL MIND ASSISTANT</div>
              <div className="terminal-status">ONLINE</div>
            </div>

            <div className="terminal-body">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`terminal-msg ${msg.sender}`}>
                  <span className="terminal-sender">
                    {msg.sender === 'assistant' ? 'LEGAL MIND AI' : 'YOU'}
                  </span>
                  <div className="terminal-text">
                    {msg.text.split('\n').map((line, lIdx) => (
                      <React.Fragment key={lIdx}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="terminal-msg assistant">
                  <span className="terminal-sender">LEGAL MIND AI</span>
                  <div className="terminal-text typing-cursor">
                    {typingText.split('\n').map((line, lIdx) => (
                      <React.Fragment key={lIdx}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic typing loading dots */}
              {isTyping && typingText.length === 0 && (
                <div className="terminal-typing">
                  <span>AI is thinking</span>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
            </div>

            {/* Sandbox CTA overlay when typing finishes */}
            {showSandboxCta && (
              <div className="sandbox-cta-overlay">
                <div className="sandbox-cta-text">
                  Save this case and get full access to document drafting tools.
                </div>
                <button className="sandbox-cta-btn" onClick={() => scrollTo(authSectionRef)}>
                  Sign Up & Continue Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Attorney Matching — Sign-In Gate */}
      <section id="lawyers" ref={lawyerSectionRef} className="landing-section lawyer-match-section" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Postage Stamps background watermark */}
        <img
          src={postageStamps}
          alt="Vintage stamps decoration"
          className="stamps-bg-img"
          style={{
            position: 'absolute',
            left: '-30px',
            top: '40px',
            width: '240px',
            height: '240px',
            objectFit: 'contain',
            opacity: darkMode ? 0.09 : 0.16,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'opacity 0.3s ease'
          }}
        />

        {/* Left panel — text (mirrors original lawyer-match-config layout) */}
        <div className="lawyer-match-config" style={{ position: 'relative', zIndex: 1 }}>
          <div className="lawyer-match-title">
            <span className="section-tag">Verified Representation</span>
            <h3>Connect with Qualified Attorneys</h3>

            <p style={{ marginBottom: '1.2rem' }}>
              Legal Mind maintains a curated directory of verified Pakistani advocates spanning civil, family, corporate, criminal, and taxation law. Every attorney listed on our platform is bar-council registered and independently reviewed.
            </p>

            <p style={{ marginBottom: '1.2rem', opacity: 0.78 }}>
              Once you create an account, you can search and filter advocates by city — Lahore, Karachi, and Islamabad — as well as by practice area, years of experience, and client rating. Scheduling a consultation is handled entirely within the platform, keeping your case details private and secure.
            </p>

            <p style={{ opacity: 0.6, fontStyle: 'italic', fontSize: '0.92rem', marginBottom: '1.8rem' }}>
              Attorney profiles and contact details are only shown to signed-in users to protect both clients and legal professionals from unsolicited exposure.
            </p>

            <button
              className="showcase-action-btn"
              onClick={() => scrollTo(authSectionRef)}
            >
              Sign Up to Browse Attorneys
            </button>
          </div>
        </div>

        {/* Right panel — image fills exact space the lawyer cards occupied */}
        <div className="lawyer-showcase" style={{ position: 'relative', zIndex: 1, padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
          <img
            src={lawScaleImg}
            alt="Scales of justice and gavel"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
              opacity: 0.52,
              filter: 'saturate(0.65)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 18%, rgba(0,0,0,1) 45%, rgba(0,0,0,1) 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 18%, rgba(0,0,0,1) 45%, rgba(0,0,0,1) 100%)',
              transition: 'opacity 0.3s ease',
              borderRadius: '16px',
            }}
          />
        </div>
      </section>

      {/* Trust Factors */}
      <section className="trust-section" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Scales of justice outline background watermark */}
        <img 
          src={scalesOutline} 
          alt="Scales of Justice decoration" 
          className="scale-bg-img"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '420px',
            height: '420px',
            objectFit: 'contain',
            opacity: darkMode ? 0.08 : 0.15,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'opacity 0.3s ease'
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 className="brand-font trust-title">Built Upon Trust and Integrity</h3>
          <div className="trust-grid" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div className="trust-item">
              <svg className="trust-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 22V12"/>
                <path d="M12 12H2"/>
                <path d="M12 12h10"/>
              </svg>
              <span className="trust-label">Legal Precision</span>
              <span className="trust-desc">AI recommendations are calibrated with Pakistani local statutory codes.</span>
            </div>

            <div className="trust-item">
              <svg className="trust-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span className="trust-label">Encrypted Database</span>
              <span className="trust-desc">All conversations and uploaded records are encrypted using industrial security protocols.</span>
            </div>

            <div className="trust-item">
              <svg className="trust-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span className="trust-label">Verified Attorneys</span>
              <span className="trust-desc">Every lawyer in our matchmaking database undergoes strict bar council credential checks.</span>
            </div>

            <div className="trust-item">
              <svg className="trust-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span className="trust-label">Structured Guidelines</span>
              <span className="trust-desc">Receive organized, download-ready procedural scripts for court hearings.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Data Sources & Authenticity */}
      <section className="landing-section data-sources-section" style={{ position: 'relative', overflow: 'hidden', padding: '80px 40px', background: 'var(--color-beige-sand-light)' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div className="section-title-wrap">
            <span className="section-tag">Authentic & Verified</span>
            <h2 className="section-main-title">Grounded in Official Pakistani Statutes</h2>
            <p className="section-subtitle" style={{ maxWidth: '750px', margin: '14px auto 0', color: 'var(--color-charcoal-grey-light)' }}>
              Legal Mind AI does not hallucinate legal principles. Our intelligence engine is calibrated directly against legislative codes, bills, and constitutional frameworks published by official government registries.
            </p>
          </div>

          <div className="sources-container" style={{ display: 'flex', gap: '40px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '48px' }}>
            <div className="source-card-landing" style={{ flex: '1', minWidth: '280px', maxWidth: '480px', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '36px', boxShadow: 'var(--shadow-sm)', textAlign: 'left', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <img src={nationalAssemblyLogo} alt="National Assembly of Pakistan" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-earth-brown)' }}>National Assembly of Pakistan</h4>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-slate-blue-grey)', display: 'block', margin: '4px 0 8px' }}>na.gov.pk</span>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal-grey-light)', margin: 0, lineHeight: '1.5' }}>
                  AI indexes legislative bills, acts, and constitutional amendments passed by the Parliament to ensure all guidance aligns with current law.
                </p>
              </div>
            </div>

            <div className="source-card-landing" style={{ flex: '1', minWidth: '280px', maxWidth: '480px', background: 'var(--color-white)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '36px', boxShadow: 'var(--shadow-sm)', textAlign: 'left', display: 'flex', gap: '20px', alignItems: 'center' }}>
              <img src={pakistanCodeLogo} alt="Pakistan Code Portal" style={{ height: '72px', width: 'auto', objectFit: 'contain' }} />
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-earth-brown)' }}>Pakistan Code</h4>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-slate-blue-grey)', display: 'block', margin: '4px 0 8px' }}>pakistancode.gov.pk</span>
                <p style={{ fontSize: '13px', color: 'var(--color-charcoal-grey-light)', margin: 0, lineHeight: '1.5' }}>
                  Our database is calibrated against compiled federal laws published by the Ministry of Law & Justice, referencing precise Section numbers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication Call To Action Section */}
      <section id="signin" ref={authSectionRef} className="auth-cta-section" style={{ position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        {/* MINDFUL BACKGROUND ASSET 4: People path winding into the background of auth */}
        <img 
          src={peoplePath} 
          alt="People path background watermark" 
          className="path-bg-img" 
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: darkMode ? 0.10 : 0.17,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'opacity 0.3s ease'
          }}
        />

        <div className="auth-cta-card" style={{ position: 'relative', zIndex: 1, margin: '0 auto' }}>
          <div className="auth-cta-logo-wrap">
            <Logo size={84} />
          </div>
          
          <h2 className="auth-cta-title">Begin Your Legal Journey</h2>
          
          <p className="auth-cta-subtitle">
            {"\"Legal matters can be overwhelming, but you don't have to navigate them alone. Take a breath—we're here to guide you step-by-step with clarity, security, and peace of mind.\""}
          </p>

          <button className="btn-google-landing" onClick={handleGoogleSignIn} disabled={isSigningIn}>
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>{isSigningIn ? 'Redirecting to Google...' : 'Sign in with Google'}</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <h4 className="brand-font">LEGAL MIND</h4>
            <p>
              An intelligent assistant designed to structure, simplify, and solve complex legal scenarios with ease and privacy.
            </p>
          </div>

          <div className="footer-links">
            <h5>Navigation</h5>
            <ul className="footer-links-list">
              <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo(featuresSectionRef); }}>Core Platform Features</a></li>
              <li><a href="#sandbox" onClick={(e) => { e.preventDefault(); scrollTo(sandboxSectionRef); }}>AI Chat Sandbox</a></li>
              <li><a href="#lawyers" onClick={(e) => { e.preventDefault(); scrollTo(lawyerSectionRef); }}>Lawyer Matching System</a></li>
              <li><a href="#signin" onClick={(e) => { e.preventDefault(); scrollTo(authSectionRef); }}>Google Auth Portal</a></li>
            </ul>
          </div>

          <div className="footer-kaggle-corner">
            <span className="kaggle-label">A PROJECT OF</span>
            <span className="kaggle-brand">Kaggle</span>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-disclaimer">
            <strong>Disclaimer:</strong> Legal Mind is an AI-powered educational and document facilitation platform. Recommendations do not constitute formal legal representation. Always verify legal findings with a licensed advocate before filing records in court.
          </div>
          <div>
            &copy; {new Date().getFullYear()} Legal Mind Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
