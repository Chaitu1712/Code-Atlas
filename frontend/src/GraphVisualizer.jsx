import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function GraphVisualizer({ graphData, searchResults, selectedNode, detailLevel, onNodeClick, currentProject }) {
    const svgRef = useRef();
    const gRef = useRef();
    const simulationRef = useRef();

    const nodesRef = useRef();
    const linksRef = useRef();
    const labelsRef = useRef();

    const minimapScale = 0.04; 

    useEffect(() => {
        if (!graphData || !graphData.nodes.length) return;

        let filteredNodes = graphData.nodes.filter(n => {
            if (detailLevel === 1) return n.type === 'module_internal' || n.type === 'module_external' || n.type === 'package';
            if (detailLevel === 2) return n.type !== 'function';
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const allLinks = graphData.edges || graphData.links || [];
        let filteredLinks = allLinks.filter(l => nodeIds.has(l.source.id || l.source) && nodeIds.has(l.target.id || l.target));

        const width = window.innerWidth;
        const height = window.innerHeight;

        d3.select(svgRef.current).selectAll("*").remove();
        const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);

        const defs = svg.append("defs");
        const pattern = defs.append("pattern").attr("id", "dots").attr("x", 0).attr("y", 0).attr("width", 20).attr("height", 20).attr("patternUnits", "userSpaceOnUse");
        pattern.append("circle").attr("cx", 2).attr("cy", 2).attr("r", 1).attr("fill", "rgba(0,0,0,0.06)");
        svg.append("rect").attr("width", "100%").attr("height", "100%").attr("fill", "url(#dots)");

        const filter = defs.append("filter").attr("id", "shadow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
        filter.append("feDropShadow").attr("dx", "0").attr("dy", "2").attr("stdDeviation", "2").attr("flood-opacity", "0.15");

        gRef.current = svg.append("g");

        const minimapSize = 160;
        const minimapOffset = 24;
        const minimapContainer = svg.append("g")
            .attr("transform", `translate(${width - minimapSize - minimapOffset}, ${height - minimapSize - minimapOffset})`);
        
        minimapContainer.append("rect")
            .attr("width", minimapSize).attr("height", minimapSize)
            .attr("fill", "rgba(255,255,255,0.8)")
            .attr("stroke", "rgba(0,0,0,0.1)").attr("rx", 12)
            .style("backdrop-filter", "blur(8px)");

        const minimapContent = minimapContainer.append("g");
        
        const minimapViewport = minimapContainer.append("rect")
            .attr("fill", "rgba(37, 99, 235, 0.1)")
            .attr("stroke", "#2563eb").attr("stroke-width", 1.5)
            .attr("rx", 4);

        const zoom = d3.zoom().scaleExtent([0.1, 4]).on("zoom", (event) => {
            gRef.current.attr("transform", event.transform);
            
            const t = event.transform;
            minimapViewport
                .attr("x", (minimapSize / 2) + (-t.x / t.k) * minimapScale)
                .attr("y", (minimapSize / 2) + (-t.y / t.k) * minimapScale)
                .attr("width", (width / t.k) * minimapScale)
                .attr("height", (height / t.k) * minimapScale);
        });

        const legendContainer = svg.append("g")
            .attr("transform", `translate(24, ${height - 280})`); 

        
        legendContainer.append("rect")
            .attr("width", 220)
            .attr("height", 256)
            .attr("fill", "rgba(255,255,255,0.85)")
            .attr("stroke", "rgba(0,0,0,0.1)")
            .attr("rx", 12)
            .style("backdrop-filter", "blur(8px)");

        
        legendContainer.append("text")
            .attr("x", 16).attr("y", 28)
            .text("Legend")
            .attr("font-size", "14px").attr("font-weight", "bold")
            .attr("fill", "#0f172a");

        const legendItems = [
            { type: 'node', label: 'Package / Folder', color: '#3b82f6', r: 8 },
            { type: 'node', label: 'Internal Module', color: '#10b981', r: 8 },
            { type: 'node', label: 'External Library', color: '#64748b', r: 8 },
            { type: 'node', label: 'Class', color: '#a855f7', r: 6 },
            { type: 'node', label: 'Function', color: '#f59e0b', r: 4 },
            { type: 'line', label: 'Contains (Parent/Child)', color: '#cbd5e1', dash: "3,3", width: 1.5 },
            { type: 'line', label: 'Internal Call', color: '#ec4899', dash: "none", width: 2 },
            { type: 'line', label: 'External Call', color: '#f97316', dash: "none", width: 2 },
            { type: 'line', label: 'Import Dependency', color: '#94a3b8', dash: "none", width: 2 }
        ];

        legendItems.forEach((item, index) => {
            const yPos = 56 + (index * 22);
            
            if (item.type === 'node') {
                
                legendContainer.append("circle")
                    .attr("cx", 24).attr("cy", yPos)
                    .attr("r", item.r)
                    .attr("fill", item.color)
                    .attr("stroke", "#ffffff").attr("stroke-width", 1.5)
                    .style("filter", "url(#shadow)");
            } else if (item.type === 'line') {
                
                legendContainer.append("line")
                    .attr("x1", 14).attr("y1", yPos)
                    .attr("x2", 34).attr("y2", yPos)
                    .attr("stroke", item.color)
                    .attr("stroke-width", item.width)
                    .attr("stroke-dasharray", item.dash);
            }

            
            legendContainer.append("text")
                .attr("x", 44).attr("y", yPos + 4)
                .text(item.label)
                .attr("font-size", "11px")
                .attr("font-weight", "500")
                .attr("fill", "#475569");
        });

        svg.call(zoom).on("dblclick.zoom", null);

        const edgeColors = { contains: '#cbd5e1', import: '#94a3b8', call_internal: '#ec4899', call_external: '#f97316', default: '#94a3b8', api_call: '#06b6d4'};
        Object.keys(edgeColors).forEach(type => {
            defs.append("marker").attr("id", `arrow-${type}`).attr("viewBox", "-0 -5 10 10").attr("refX", 20).attr("refY", 0).attr("orient", "auto").attr("markerWidth", 5).attr("markerHeight", 5).append("svg:path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", edgeColors[type]);
        });

        filteredNodes.forEach(n => {
            if (n.x === undefined || n.y === undefined) {
                n.x = width / 2 + (Math.random() - 0.5) * 50; // Slight random offset to help collision
                n.y = height / 2 + (Math.random() - 0.5) * 50;
            }
        });

        const simulation = d3.forceSimulation(filteredNodes)
            .alphaDecay(0.06)
            .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(d => d.type === 'contains' ? 40 : 50))
            .force("charge", d3.forceManyBody().strength(detailLevel === 3 ? -80 : -150))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(detailLevel === 1 ? 40 : 20));

        linksRef.current = gRef.current.append("g").selectAll("path").data(filteredLinks).join("path").attr("fill", "none").attr("stroke", d => edgeColors[d.type] || edgeColors.default).attr("stroke-opacity", d => (d.type === 'contains' || d.type === 'api_call') ? 0.6 : 0.8).attr("stroke-width", d => d.type === 'api_call' ? 3 : (d.type === 'contains' ? 1 : 1.5)).attr("stroke-dasharray", d => d.type === 'contains' ? "3,3" : (d.type === 'api_call' ? "8,4" : "none")).attr("marker-end", d => `url(#arrow-${d.type || 'default'})`);

        const colorScale = (type) => {
            if (type === 'module_internal') return '#10b981'; if (type === 'module_external') return '#64748b'; 
            if (type === 'package') return '#3b82f6'; if (type === 'class') return '#a855f7'; 
            if (type === 'function') return '#f59e0b'; return '#fff';
        };

        
        const drag = (simulation) => d3.drag()
            .on("start", event => { event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
            .on("drag", event => { if (simulation.alpha() < 0.1) simulation.alpha(0.1).restart(); event.subject.fx = event.x; event.subject.fy = event.y; })
            .on("end", event => {
                if (currentProject) {
                    fetch(`http://localhost:8000/api/graph/${currentProject}/layout`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([{ node_id: event.subject.id, fx: event.subject.fx, fy: event.subject.fy }])
                    });
                }
            });

        nodesRef.current = gRef.current.append("g").selectAll("circle").data(filteredNodes).join("circle")
            .attr("r", d => d.type === 'package' || d.type === 'module_internal' ? 12 : d.type === 'class' ? 8 : 5)
            .attr("fill", d => colorScale(d.type)).attr("stroke", "#ffffff").attr("stroke-width", 2).style("filter", "url(#shadow)") 
            .call(drag(simulation))
            .on('dblclick', (event, d) => {
                delete d.fx; delete d.fy; simulation.alpha(0.3).restart();
                
                if (currentProject) {
                    fetch(`http://localhost:8000/api/graph/${currentProject}/layout`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify([{ node_id: d.id, fx: null, fy: null }])
                    });
                }
            });

        labelsRef.current = gRef.current.append("g").selectAll("text").data(filteredNodes).join("text").attr("dy", d => d.type === 'function' ? -10 : -14).attr("text-anchor", "middle").text(d => d.id.split('.').pop()).attr("font-size", d => d.type === 'function' ? "9px" : "11px").attr("font-weight", d => d.type === 'package' ? "bold" : "600").attr("fill", "#0f172a").attr("paint-order", "stroke").attr("stroke", "#ffffff").attr("stroke-width", 3).attr("stroke-linecap", "round").attr("stroke-linejoin", "round").attr("pointer-events", "none");

        
        const miniNodes = minimapContent.selectAll("circle").data(filteredNodes).join("circle")
            .attr("r", 1.5).attr("fill", d => colorScale(d.type));

        const linkedByIndex = {};
        filteredLinks.forEach(d => { linkedByIndex[`${d.source.id},${d.target.id}`] = true; });

        nodesRef.current.on('mouseover', function (event, d) {
            if (selectedNode) return; 
            nodesRef.current.style('opacity', o => (linkedByIndex[`${d.id},${o.id}`] || linkedByIndex[`${o.id},${d.id}`] || o.id === d.id) ? 1 : 0.1);
            linksRef.current.style('opacity', o => (o.source.id === d.id || o.target.id === d.id) ? 1 : 0.05);
            labelsRef.current.style('opacity', o => (linkedByIndex[`${d.id},${o.id}`] || linkedByIndex[`${o.id},${d.id}`] || o.id === d.id) ? 1 : 0.1);
        }).on('mouseout', function () {
            if (selectedNode) return;
            nodesRef.current.style('opacity', 1);
            linksRef.current.style('opacity', d => d.type === 'contains' ? 0.6 : 0.8);
            labelsRef.current.style('opacity', 1);
        }).on('click', function (event, d) {
            if (event.defaultPrevented) return;
            if (onNodeClick) onNodeClick(d.id); 
        });

        simulation.on("tick", () => {
            linksRef.current.attr("d", d => {
                if (d.type === 'contains') return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
                const dx = d.target.x - d.source.x, dy = d.target.y - d.source.y, dr = Math.sqrt(dx * dx + dy * dy);
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            nodesRef.current.attr("cx", d => d.x).attr("cy", d => d.y);
            labelsRef.current.attr("x", d => d.x).attr("y", d => d.y);
            
            
            miniNodes
                .attr("cx", d => (minimapSize / 2) + d.x * minimapScale)
                .attr("cy", d => (minimapSize / 2) + d.y * minimapScale);
        });

        
        svg.call(zoom.transform, d3.zoomIdentity.translate(width/2, height/2));

        return () => simulation.stop();
    }, [graphData, detailLevel]);

    useEffect(() => {
        if (!nodesRef.current || !linksRef.current || !labelsRef.current) return;

        if (!searchResults || searchResults.length === 0) {
            nodesRef.current.style('opacity', 1).attr('stroke', '#ffffff').attr('stroke-width', 2);
            linksRef.current.style('opacity', d => d.type === 'contains' ? 0.6 : 0.8);
            labelsRef.current.style('opacity', 1);
            return;
        }

        const matchedIds = new Set(searchResults.map(r => r.id));

        if (selectedNode) {
            const targetNode = nodesRef.current.data().find(d => d.id === selectedNode.id);
            
            if (targetNode) {
                nodesRef.current.style('opacity', d => {
                    const isConnected = linksRef.current.data().some(l => 
                        (l.source.id === targetNode.id && l.target.id === d.id) || (l.target.id === targetNode.id && l.source.id === d.id)
                    );
                    return (d.id === targetNode.id || isConnected || d.id === targetNode.parent) ? 1 : 0.1;
                })
                .attr('stroke', d => d.id === targetNode.id ? '#2563eb' : '#ffffff')
                .attr('stroke-width', d => d.id === targetNode.id ? 3 : 2);

                linksRef.current.style('opacity', l => (l.source.id === targetNode.id || l.target.id === targetNode.id) ? 1 : 0.02);
                
                labelsRef.current.style('opacity', d => {
                    const isConnected = linksRef.current.data().some(l => 
                        (l.source.id === targetNode.id && l.target.id === d.id) || (l.target.id === targetNode.id && l.source.id === d.id)
                    );
                    return (d.id === targetNode.id || isConnected || d.id === targetNode.parent) ? 1 : 0.1;
                });
            }
        } 
        else {
            nodesRef.current
                .style('opacity', d => matchedIds.has(d.id) ? 1 : 0.1)
                .attr('stroke', d => matchedIds.has(d.id) ? '#2563eb' : '#ffffff')
                .attr('stroke-width', d => matchedIds.has(d.id) ? 3 : 2);

            linksRef.current.style('opacity', 0.05);
            labelsRef.current.style('opacity', d => matchedIds.has(d.id) ? 1 : 0.1);
        }

    }, [searchResults, selectedNode]);
    return <svg ref={svgRef} style={{ background: "#f8fafc", width: "100%", height: "100vh", display: "block" }} />;
}