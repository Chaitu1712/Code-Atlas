import { useState, useEffect } from 'react'
import GraphVisualizer from './GraphVisualizer'
import AddProjectModal from './components/AddProjectModal'
import Sidebar from './components/Sidebar'
import CodePanel from './components/CodePanel'

function App() {
  const [projects, setProjects] = useState([])
  const [currentProject, setCurrentProject] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [detailLevel, setDetailLevel] = useState(3)
  const [viewingCode, setViewingCode] = useState(null)
  const [isCodeLoading, setIsCodeLoading] = useState(false)

  const fetchProjects = () => {
    fetch('http://localhost:8000/api/projects')
      .then(res => res.json())
      .then(data => {
          setProjects(data);
          if (data.length > 0 && !currentProject) setCurrentProject(data[data.length - 1]); 
      })
  }

  useEffect(() => { fetchProjects(); }, [])

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    setQuery(''); setSearchResults([]); setSelectedNode(null); setViewingCode(null);
    
    fetch(`http://localhost:8000/api/graph/${currentProject}`)
      .then(res => res.json())
      .then(data => { setGraphData(data); setLoading(false); })
  }, [currentProject])

  const handleDeleteProject = async () => {
      if (!currentProject) return;
      if (window.confirm(`Delete the parsed data for "${currentProject}"?`)) {
          await fetch(`http://localhost:8000/api/projects/${currentProject}`, { method: 'DELETE' });
          const newProjects = projects.filter(p => p !== currentProject);
          setProjects(newProjects);
          setCurrentProject(newProjects.length > 0 ? newProjects[0] : '');
          if (newProjects.length === 0) setGraphData(null);
      }
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || !currentProject) { setQuery(''); setSearchResults([]); setSelectedNode(null); return; }
    setIsSearching(true); setSelectedNode(null); setViewingCode(null);
    try {
      const res = await fetch(`http://localhost:8000/api/search/${currentProject}?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } finally { setIsSearching(false); }
  }

  const handleNodeClick = async (nodeId) => {
    if (!currentProject) return;
    setIsCodeLoading(true);
    try {
        const res = await fetch(`http://localhost:8000/api/node/${currentProject}/${encodeURIComponent(nodeId)}`);
        setViewingCode(await res.json());
    } finally { setIsCodeLoading(false); }
  }

   return (
    <div style={{ margin: 0, padding: 0, height: "100vh", backgroundColor: "#f8fafc", position: "relative", fontFamily: "Inter, system-ui, sans-serif", overflow: "hidden" }}>
      
      {showAddModal && (
          <AddProjectModal onClose={() => setShowAddModal(false)} onSuccess={() => { setShowAddModal(false); fetchProjects(); }} />
      )}

      <Sidebar 
          projects={projects} currentProject={currentProject} setCurrentProject={setCurrentProject}
          handleDeleteProject={handleDeleteProject} setShowAddModal={setShowAddModal}
          detailLevel={detailLevel} setDetailLevel={setDetailLevel}
          query={query} setQuery={setQuery} handleSearch={handleSearch} isSearching={isSearching}
          searchResults={searchResults} selectedNode={selectedNode} setSelectedNode={setSelectedNode}
      />

      <CodePanel viewingCode={viewingCode} setViewingCode={setViewingCode} isCodeLoading={isCodeLoading} />
      
      {projects.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100%", color: "#64748b" }}>
              <h2>Welcome to Code Atlas</h2>
              <p>Click the <b>+</b> button in the sidebar to parse your first codebase.</p>
          </div>
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "#64748b" }}>Loading architecture...</div>
      ) : (
        <GraphVisualizer graphData={graphData} searchResults={searchResults} selectedNode={selectedNode} detailLevel={detailLevel} onNodeClick={handleNodeClick} currentProject={currentProject} />
      )}
    </div>
  )
}


export default App