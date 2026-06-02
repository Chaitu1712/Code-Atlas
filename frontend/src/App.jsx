import React,  { useState, useEffect }  from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AllProjectsPage from './pages/AllProjectsPage';
import VisualizerPage from './pages/VisualizerPage';
import SetupPage from './pages/SetupPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('codeAtlasToken'));
  const [isSetup, setIsSetup] = useState(null);

  // Logout function
  const handleLogout = () => {
      localStorage.removeItem('codeAtlasToken');
      setToken(null);
  };

  // Helper function to make authenticated requests
  const authFetch = async (url, options = {}) => {
      const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) handleLogout(); // Auto logout if token expires
      return res;
  };

  useEffect(() => {
    if (!token) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    authFetch(`${apiUrl}/api/config`)
        .then(res => res.json())
        .then(data => setIsSetup(data.is_setup_complete))
        .catch(() => handleLogout()); // If it fails, token is likely invalid
  }, [token]);

  // Trap unauthenticated users
  if (!token) return <AuthPage setToken={setToken} />;
  
  if (isSetup === null) return <div style={{ background: "#f8fafc", height: "100vh" }} />;
  return (
    <Router>
      <Routes>
        <Route path="/setup" element={<SetupPage authFetch={authFetch} />} />
        <Route path="/" element={isSetup ? <LandingPage authFetch={authFetch} handleLogout={handleLogout} /> : <Navigate to="/setup" />} />
        <Route path="/projects" element={isSetup ? <AllProjectsPage authFetch={authFetch} /> : <Navigate to="/setup" />} />
        <Route path="/visualize/:projectName" element={isSetup ? <VisualizerPage authFetch={authFetch} /> : <Navigate to="/setup" />} />
        <Route path="/settings" element={isSetup ? <SettingsPage authFetch={authFetch} /> : <Navigate to="/setup" />} />
      </Routes>
    </Router>
  );
}

export default App;