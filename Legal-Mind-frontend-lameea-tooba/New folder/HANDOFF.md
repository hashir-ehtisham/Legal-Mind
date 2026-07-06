# Developer Handoff Documentation

This is a **UI-only prototype build** of the LegalMind platform. All screens utilize local React state, mock database arrays, and synchronize state transitions directly to the browser's `localStorage` for visual persistence. 

Once the backend team delivers the official `API.md` file, the transition to live database endpoints can be completed directly in the state controller functions without requiring any UI redesign.

---

## 1. Directory of Screens & Mock-Data Systems

The application state is centralized in [App.jsx](file:///d:/Legal-Mind/New%20folder/src/App.jsx). Below is the mapping of each view tab, its visual state, and where mock data is generated.

### A. Landing Page & Sandbox Demo
* **Component File**: [LandingPage.jsx](file:///d:/Legal-Mind/New%20folder/src/components/LandingPage.jsx)
* **Mock Data Sources**: 
  - `PRESETS`: Hardcoded prompt-response pairs for the hero sandbox demo.
  - `MOCK_LAWYERS`: Simulated database of advocates displayed in the landing page's matchmaking widget.
* **Handlers**: 
  - `handleSelectPreset`: Simulates typing speeds using `setInterval` to output answers letter-by-letter.
  - `matchedLawyer`: Utilizes a `setTimeout` hook to simulate database search latency when domain/city inputs are adjusted.

### B. AI Consultation Screen
* **Component File**: [MainChatTab.jsx](file:///d:/Legal-Mind/New%20folder/src/components/MainChatTab.jsx)
* **Mock Data Sources**: 
  - Initial messages database is structured in `INITIAL_CHATS` inside [App.jsx](file:///d:/Legal-Mind/New%20folder/src/App.jsx).
  - Syncs to `localStorage` key: `lm_chats`.
* **Handlers**: 
  - `handleSend`: Standard text submit handler that posts a user message, displays a typing dot skeleton (`isTyping = true`), and triggers a simulated AI advisor response after `1500ms` using local type-conditional templates (Civil, Corporate, Family, etc.).
  - `getAiSummaryForCase`: Dynamically scans the chat message array string values and returns derived event checklist bullets (e.g. `"Advice: Keep correspondence and receipts"`).

### C. Cases List Screen
* **Component File**: [CasesTab.jsx](file:///d:/Legal-Mind/New%20folder/src/components/CasesTab.jsx)
* **Mock Data Sources**: 
  - Initial active/closed disputes are structured in `INITIAL_CASES` inside [App.jsx](file:///d:/Legal-Mind/New%20folder/src/App.jsx).
  - Syncs to `localStorage` key: `lm_cases`.
* **Handlers**: 
  - `handleCreateCase` (in [App.jsx](file:///d:/Legal-Mind/New%20folder/src/App.jsx)): Instantiates a new case object with a unique incremented ID, default status `"Active"`, and prepends the new item to the dashboard grid list.

### D. Lawyer Finder Screen
* **Component File**: [LawyerFinderTab.jsx](file:///d:/Legal-Mind/New%20folder/src/components/LawyerFinderTab.jsx)
* **Mock Data Sources**: 
  - `LAWYERS_DATABASE`: A database array containing 6 advocate profiles with initials, ratings, contacts, and recommendations.
* **Handlers**: 
  - `filteredLawyers`: Client-side JavaScript filtering on experience, rating, type, gender, and city.
  - `startDraftFlow`: Formulates custom introductory Wakalatnama drafts based on the active case title and category.

### E. Profile & Settings Screen
* **Component File**: [ProfileTab.jsx](file:///d:/Legal-Mind/New%20folder/src/components/ProfileTab.jsx)
* **Mock Data Sources**: 
  - Profile state is managed inside `userProfile` in [App.jsx](file:///d:/Legal-Mind/New%20folder/src/App.jsx).
  - Syncs to `localStorage` key: `lm_profile`.
* **Handlers**: 
  - `handleSave` (in [ProfileTab.jsx](file:///d:/Legal-Mind/New%20folder/src/components/ProfileTab.jsx)): Commits name, profile photo, and default city selection back to global state.

---

## 2. API Swap-Out Guide

To replace the mock handlers with real backend fetches:

1. **Wiring Loading States**:
   - Every tab now has a local `isLoading` hook. Currently, it runs a one-shot `setTimeout` on mounting (or parameter changes) to show the skeleton loaders.
   - Replace the `setTimeout` timer in each component with your API request states:
     ```javascript
     // Swap this:
     useEffect(() => {
       setIsLoading(true);
       setTimeout(() => setIsLoading(false), 700);
     }, []);

     // With real backend fetches:
     useEffect(() => {
       setIsLoading(true);
       fetch('/api/cases')
         .then(res => res.json())
         .then(data => {
           setCases(data);
           setIsLoading(false);
         });
     }, []);
     ```

2. **Connecting Case Creation**:
   - In `App.jsx`, replace `handleCreateCase` to perform a `POST` request to your backend:
     ```javascript
     const handleCreateCase = async (title, type) => {
       const res = await fetch('/api/cases', {
         method: 'POST',
         body: JSON.stringify({ title, type })
       });
       const newCase = await res.json();
       setCases(prev => [newCase, ...prev]);
     };
     ```

3. **Connecting AI Chat Engine**:
   - In `MainChatTab.jsx`, inside `handleSend`, replace the mock `setTimeout` response generation with a call to your AI streaming or chat endpoint:
     ```javascript
     // Send user query to your socket or REST API:
     await fetch(`/api/chat/${activeCaseId}/messages`, {
       method: 'POST',
       body: JSON.stringify({ text })
     });
     ```

4. **Empty State Validation**:
   - The UI screens naturally switch to clean, actionable empty states whenever `cases` or `filteredLawyers` lists return `length === 0`. No layout shifts or UI additions are required when the API returns empty database records.
