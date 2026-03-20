import React,  { useState, useEffect }  from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate} from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AllProjectsPage from './pages/AllProjectsPage';
import VisualizerPage from './pages/VisualizerPage';
import SetupPage from './pages/SetupPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [isSetup, setIsSetup] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/config')
        .then(res => res.json())
        .then(data => setIsSetup(data.is_setup_complete));
  }, []);

  if (isSetup === null) return <div style={{ background: "#f8fafc", height: "100vh" }} />;
  return (
    <Router>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={isSetup ? <LandingPage /> : <Navigate to="/setup" />} />
        <Route path="/projects" element={isSetup ? <AllProjectsPage /> : <Navigate to="/setup" />} />
        <Route path="/visualize/:projectName" element={isSetup ? <VisualizerPage /> : <Navigate to="/setup" />} />
        <Route path="/settings" element={isSetup ? <SettingsPage /> : <Navigate to="/setup" />} />
      </Routes>
    </Router>
  );
}

export default App;