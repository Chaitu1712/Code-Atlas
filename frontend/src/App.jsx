import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AllProjectsPage from './pages/AllProjectsPage';
import VisualizerPage from './pages/VisualizerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/projects" element={<AllProjectsPage />} />
        <Route path="/visualize/:projectName" element={<VisualizerPage />} />
      </Routes>
    </Router>
  );
}

export default App;