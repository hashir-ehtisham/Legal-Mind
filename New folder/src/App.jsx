import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import DisclaimerModal from './components/DisclaimerModal';
import CitySelector from './components/CitySelector';
import AppShell from './components/AppShell';
import MainChatTab from './components/MainChatTab';
import CasesTab from './components/CasesTab';
import LawyerFinderTab from './components/LawyerFinderTab';
import ScriptGuidelinesTab from './components/ScriptGuidelinesTab';
import ProfileTab from './components/ProfileTab';

const INITIAL_CASES = [
  {
    id: 1,
    title: "DHA Phase 6 Property Boundary Dispute",
    type: "Civil",
    status: "Active",
    date: "Jun 28, 2026",
    description: "Property overlapping and boundary fence dispute with neighboring plot in DHA Phase 6."
  },
  {
    id: 2,
    title: "Employment Contract Review - IT Consultant",
    type: "Corporate",
    status: "Consulting",
    date: "Jun 25, 2026",
    description: "Review of non-compete clause, intellectual property assignment, and termination clauses."
  },
  {
    id: 3,
    title: "Tenant Eviction Notice - Clifton Block 5",
    type: "Civil",
    status: "Closed",
    date: "May 14, 2026",
    description: "Eviction notice served to tenant for non-payment of rent for three consecutive months."
  },
  {
    id: 4,
    title: "Family Inheritance Division Settlement",
    type: "Family",
    status: "Active",
    date: "Jun 19, 2026",
    description: "Settlement of ancestral property in Lahore among four legal heirs under Islamic personal law."
  }
];

const INITIAL_CHATS = {
  1: [
    {
      id: 101,
      sender: "assistant",
      text: "Hello! I am your Legal Mind AI assistant. I have reviewed the details of your DHA Phase 6 boundary dispute. To help you better, could you please specify if you have checked the official land registry map from the Clifton Cantonment Board (CBC) or DHA?",
      time: "4:30 PM"
    }
  ],
  2: [
    {
      id: 201,
      sender: "assistant",
      text: "Welcome! Regarding your IT company employment contract, I can check the non-compete clause duration and termination notice period. Please paste the relevant clauses here.",
      time: "11:15 AM"
    }
  ],
  3: [
    {
      id: 301,
      sender: "assistant",
      text: "Hello. The Clifton Block 5 tenant eviction case is currently closed. If you have further tenancy disputes, feel free to start a new chat.",
      time: "2:00 PM"
    }
  ],
  4: [
    {
      id: 401,
      sender: "assistant",
      text: "Hello. Regarding the family inheritance division settlement, the distribution of shares depends on the legal heirs present. Could you share the list of surviving heirs?",
      time: "10:30 AM"
    }
  ]
};

export default function App() {
  // Authentication & First-Login States
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('lm_isLoggedIn') === 'true';
  });

  const [hasAcknowledged, setHasAcknowledged] = useState(() => {
    return localStorage.getItem('lm_acknowledged') === 'true';
  });

  const [userCity, setUserCity] = useState(() => {
    return localStorage.getItem('lm_city') || '';
  });

  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('lm_profile');
    return saved ? JSON.parse(saved) : { name: "Mian Hamza", avatar: null, city: "" };
  });

  // Tab & Case States
  const [currentTab, setCurrentTab] = useState('chat');

  const [cases, setCases] = useState(() => {
    const saved = localStorage.getItem('lm_cases');
    return saved ? JSON.parse(saved) : INITIAL_CASES;
  });

  const [activeCaseId, setActiveCaseId] = useState(() => {
    const saved = localStorage.getItem('lm_activeCaseId');
    return saved ? Number(saved) : 1;
  });

  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem('lm_chats');
    return saved ? JSON.parse(saved) : INITIAL_CHATS;
  });

  // Toast system state
  const [toast, setToast] = useState({ show: false, message: "" });

  // Prefilled filters state for Lawyer Finder (redirected from chat)
  const [prefilledFilters, setPrefilledFilters] = useState(null);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('lm_isLoggedIn', isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('lm_acknowledged', hasAcknowledged);
  }, [hasAcknowledged]);

  useEffect(() => {
    localStorage.setItem('lm_city', userCity);
    if (userCity) {
      setUserProfile(prev => {
        const updated = { ...prev, city: userCity };
        localStorage.setItem('lm_profile', JSON.stringify(updated));
        return updated;
      });
    }
  }, [userCity]);

  useEffect(() => {
    localStorage.setItem('lm_cases', JSON.stringify(cases));
  }, [cases]);

  useEffect(() => {
    localStorage.setItem('lm_activeCaseId', activeCaseId);
  }, [activeCaseId]);

  useEffect(() => {
    localStorage.setItem('lm_chats', JSON.stringify(chats));
  }, [chats]);

  // Toast helper
  const triggerToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  // Sign out handler
  const handleSignOut = () => {
    setIsLoggedIn(false);
    setHasAcknowledged(false);
    setUserCity('');
    setUserProfile({ name: "Mian Hamza", avatar: null, city: "" });
    setCurrentTab('chat');
    // Clear specific items from storage, keep cases/chats if wanted, or clear them
    localStorage.removeItem('lm_isLoggedIn');
    localStorage.removeItem('lm_acknowledged');
    localStorage.removeItem('lm_city');
    localStorage.removeItem('lm_profile');
    triggerToast("Signed out successfully.");
  };

  // Create new case helper
  const handleCreateCase = (title, type) => {
    const newId = cases.length > 0 ? Math.max(...cases.map(c => c.id)) + 1 : 1;
    const newCase = {
      id: newId,
      title: title || `New Case #${newId}`,
      type: type || "Civil",
      status: "Active",
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      description: "Custom user-generated case query."
    };
    setCases(prev => [newCase, ...prev]);
    setActiveCaseId(newId);
    setChats(prev => ({
      ...prev,
      [newId]: [
        {
          id: Date.now(),
          sender: "assistant",
          text: `Hello! I have created a new case for you: "${newCase.title}". Let me know what legal questions or details you have, and I will help analyze the situation.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    }));
    triggerToast("New case created.");
  };

  // Add message helper
  const handleSendMessage = (caseId, text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Update chats with user message
    setChats(prev => {
      const currentCaseChats = prev[caseId] || [];
      return {
        ...prev,
        [caseId]: [...currentCaseChats, userMessage]
      };
    });
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
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
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
        <CitySelector onCitySaved={(city) => setUserCity(city)} />
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
            chats={chats}
            onSendMessage={handleSendMessage}
            setChats={setChats}
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
              localStorage.setItem('lm_profile', JSON.stringify(updated));
              if (updated.city !== userCity) {
                setUserCity(updated.city);
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
