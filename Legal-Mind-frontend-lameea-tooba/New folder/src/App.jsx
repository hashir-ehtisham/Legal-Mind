import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import DisclaimerModal from './components/DisclaimerModal';
import CitySelector from './components/CitySelector';
import AppShell from './components/AppShell';
import MainChatTab from './components/MainChatTab';
import CasesTab from './components/CasesTab';
import LawyerFinderTab from './components/LawyerFinderTab';
import ScriptGuidelinesTab from './components/ScriptGuidelinesTab';
import ProfileTab from './components/ProfileTab';
import { supabase } from './lib/supabaseClient';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('lm_darkMode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('lm_darkMode', darkMode);
  }, [darkMode]);

  // Authentication & Session States
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [session, setSession] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  
  // First-Login States
  const [hasAcknowledged, setHasAcknowledged] = useState(() => {
    return localStorage.getItem('lm_acknowledged') === 'true';
  });

  const [userCity, setUserCity] = useState('');

  const [userProfile, setUserProfile] = useState({ name: '', avatar: null, city: '' });

  // Tab & Case States
  const [currentTab, setCurrentTab] = useState('chat');
  const [cases, setCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [chats, setChats] = useState({}); // Legacy for UI compat if needed, but MainChatTab will fetch its own messages

  // Toast system state
  const [toast, setToast] = useState({ show: false, message: "" });

  // Prefilled filters state for Lawyer Finder (redirected from chat)
  const [prefilledFilters, setPrefilledFilters] = useState(null);

  // ─── Supabase Auth Listener ────────────────────────────────────────────────
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setAccessToken(session.access_token);
        setIsLoggedIn(true);
        loadUserProfile(session.user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session) {
          setAccessToken(session.access_token);
          setIsLoggedIn(true);
          loadUserProfile(session.user);
        } else {
          setAccessToken('');
          setIsLoggedIn(false);
          setUserCity('');
          setUserProfile({ name: '', avatar: null, city: '' });
          setCases([]);
          setActiveCaseId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch or create user profile on login
  const loadUserProfile = async (user) => {
    try {
      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile does not exist, insert initial profile row
        const fallbackName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const initialProfile = {
          id: user.id,
          full_name: fallbackName,
          avatar_url: user.user_metadata?.avatar_url || null,
          city: ''
        };
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert(initialProfile)
          .select()
          .single();

        if (insertErr) throw insertErr;
        profile = newProfile;
      } else if (error) {
        throw error;
      }

      if (profile) {
        setUserProfile({
          name: profile.full_name || 'User',
          avatar: profile.avatar_url || null,
          city: profile.city || ''
        });
        setUserCity(profile.city || '');
      }
    } catch (err) {
      console.error('[App] Failed to load profile:', err.message);
    }
  };

  // ─── Fetch Cases from Backend ──────────────────────────────────────────────
  const fetchCases = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/cases', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.cases) {
        setCases(data.cases);
        // Default select active case if none is set
        if (data.cases.length > 0 && activeCaseId === null) {
          setActiveCaseId(data.cases[0].id);
        }
      }
    } catch (err) {
      console.error('[App] Failed to fetch cases:', err.message);
    }
  };

  useEffect(() => {
    if (isLoggedIn && accessToken) {
      fetchCases();
    }
  }, [isLoggedIn, accessToken]);

  // Sync state to local storage for disclaimer acknowledge only
  useEffect(() => {
    localStorage.setItem('lm_acknowledged', hasAcknowledged);
  }, [hasAcknowledged]);

  // Toast helper
  const triggerToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // Save selected city
  const handleSaveCity = async (city) => {
    if (!session?.user) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ city })
        .eq('id', session.user.id);
      
      if (error) throw error;
      
      setUserCity(city);
      setUserProfile(prev => ({ ...prev, city }));
      triggerToast(`City saved: ${city}`);
    } catch (err) {
      console.error('[App] Failed to save city:', err.message);
      triggerToast('Error saving city. Please try again.');
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      triggerToast("Signed out successfully.");
    } catch (err) {
      console.error('[App] Signout failed:', err.message);
    }
  };

  // Create new case handler (triggered on "Start a New Chat" or "New Case")
  // Driven entirely by setting activeCaseId to null, which opens a fresh chat template.
  const handleCreateCase = (title, type) => {
    setActiveCaseId(null);
    setCurrentTab('chat');
    triggerToast("Starting a new legal consultation.");
  };

  // Quick action to search for a lawyer matching the active case
  const handleFindLawyerForCase = (caseObj) => {
    setPrefilledFilters({
      type: caseObj.type,
      city: userCity || "Lahore"
    });
    setCurrentTab('finder');
    triggerToast(`Applying filters for ${caseObj.type} cases in ${userCity || "Lahore"}`);
  };

  // Render proper screen
  if (!isLoggedIn) {
    return (
      <>
        <LandingPage
          onLoginSuccess={() => setIsLoggedIn(true)}
          darkMode={darkMode}
          toggleDarkMode={() => setDarkMode(!darkMode)}
        />
        {toast.show && <div className="toast-notification">{toast.message}</div>}
      </>
    );
  }

  if (!hasAcknowledged) {
    return (
      <>
        <DisclaimerModal onAcknowledge={() => setHasAcknowledged(true)} />
        {toast.show && <div className="toast-notification">{toast.message}</div>}
      </>
    );
  }

  if (!userCity) {
    return (
      <>
        <CitySelector onCitySaved={handleSaveCity} />
        {toast.show && <div className="toast-notification">{toast.message}</div>}
      </>
    );
  }

  // App Shell navigation rendering
  const activeCase = cases.find(c => c.id === activeCaseId) || cases[0];

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'chat':
        return (
          <MainChatTab
            cases={cases}
            activeCaseId={activeCaseId}
            onSelectCase={(id) => setActiveCaseId(id)}
            accessToken={accessToken}
            onCaseCreated={(newId) => {
              fetchCases();
              setActiveCaseId(newId);
            }}
            onCreateCase={handleCreateCase}
            onFindLawyer={handleFindLawyerForCase}
          />
        );
      case 'cases':
        return (
          <CasesTab
            cases={cases}
            onOpenChat={(id) => {
              setActiveCaseId(id);
              setCurrentTab('chat');
            }}
            onCreateCase={handleCreateCase}
          />
        );
      case 'finder':
        return (
          <LawyerFinderTab
            userCity={userCity}
            prefilledFilters={prefilledFilters}
            clearPrefilledFilters={() => setPrefilledFilters(null)}
            activeCase={activeCase}
            triggerToast={triggerToast}
            accessToken={accessToken}
          />
        );
      case 'guidelines':
        return <ScriptGuidelinesTab />;
      case 'profile':
        return (
          <ProfileTab
            userProfile={userProfile}
            setUserProfile={(updated) => {
              setUserProfile(updated);
              if (updated.city !== userCity) {
                handleSaveCity(updated.city);
              }
            }}
            onSignOut={handleSignOut}
            triggerToast={triggerToast}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="app-container">
      <AppShell
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userProfile={userProfile}
        onSignOut={handleSignOut}
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={setActiveCaseId}
        chats={chats}
        onCreateCase={handleCreateCase}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
      >
        {renderActiveTab()}
      </AppShell>

      {/* Global Toast Alert */}
      {toast.show && (
        <div className="toast-notification">
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
