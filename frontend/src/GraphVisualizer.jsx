// frontend/src/GraphVisualizer.jsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function GraphVisualizer({ graphData, searchResults, selectedNode, detailLevel, onNodeClick  }) {
    const svgRef = useRef();
    const gRef = useRef();
    const simulationRef = useRef();

    const nodesRef = useRef();
    const linksRef = useRef();
    const labelsRef = useRef();

    useEffect(() => {
        if (!graphData || !graphData.nodes.length) return;

        let filteredNodes = graphData.nodes.filter(n => {
            if (detailLevel === 1) return n.type === 'module_internal' || n.type === 'module_external' || n.type === 'package';
            if (detailLevel === 2) return n.type !== 'function';
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));
        const allLinks = graphData.edges || graphData.links || [];
        let filteredLinks = allLinks.filter(l => 
            nodeIds.has(l.source.id || l.source) && nodeIds.has(l.target.id || l.target)
        );

        const width = window.innerWidth;
        const height = window.innerHeight;

        d3.select(svgRef.current).selectAll("*").remove();
        const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);

        // --- Inverted Dot Grid Background ---
        const defs = svg.append("defs");
        const pattern = defs.append("pattern")
            .attr("id", "dots")
            .attr("x", 0).attr("y", 0)
            .attr("width", 20).attr("height", 20)
            .attr("patternUnits", "userSpaceOnUse");
        
        pattern.append("circle")
            .attr("cx", 2).attr("cy", 2)
            .attr("r", 1).attr("fill", "rgba(0,0,0,0.06)"); // Dark dots for light background

        svg.append("rect")
            .attr("width", "100%").attr("height", "100%")
            .attr("fill", "url(#dots)");

        // --- Subtle Drop Shadow ---
        const filter = defs.append("filter").attr("id", "shadow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
        filter.append("feDropShadow").attr("dx", "0").attr("dy", "2").attr("stdDeviation", "2").attr("flood-opacity", "0.15");

        gRef.current = svg.append("g");
        svg.call(d3.zoom().on("zoom", (event) => gRef.current.attr("transform", event.transform)).scaleExtent([0.1, 4]));

        // Vibrant Colors for Light Background
        const edgeColors = {
            contains: '#cbd5e1', import: '#94a3b8', call_internal: '#ec4899', 
            call_external: '#f97316', default: '#94a3b8'
        };

        // Arrowheads
        Object.keys(edgeColors).forEach(type => {
            defs.append("marker").attr("id", `arrow-${type}`)
                .attr("viewBox", "-0 -5 10 10").attr("refX", 20).attr("refY", 0) 
                .attr("orient", "auto").attr("markerWidth", 5).attr("markerHeight", 5)
                .append("svg:path").attr("d", "M 0,-5 L 10 ,0 L 0,5").attr("fill", edgeColors[type]);
        });

        // --- PHYSICS UPDATE: Half-length connections, tighter packing ---
        const simulation = d3.forceSimulation(filteredNodes)
            // Distance cut in half! (150 -> 75, 50 -> 25)
            .force("link", d3.forceLink(filteredLinks).id(d => d.id).distance(d => d.type === 'contains' ? 25 : 75))
            // Charge reduced slightly so they don't blow apart from being so close
            .force("charge", d3.forceManyBody().strength(detailLevel === 3 ? -150 : -300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            // Collision radius reduced to allow tighter packing
            .force("collide", d3.forceCollide().radius(detailLevel === 1 ? 30 : 15));

        simulationRef.current = simulation;

        // Draw Links
        linksRef.current = gRef.current.append("g").selectAll("path")
            .data(filteredLinks).join("path")
            .attr("fill", "none")
            .attr("stroke", d => edgeColors[d.type] || edgeColors.default)
            .attr("stroke-opacity", d => d.type === 'contains' ? 0.6 : 0.8)
            .attr("stroke-width", d => d.type === 'contains' ? 1 : 1.5)
            .attr("stroke-dasharray", d => d.type === 'contains' ? "3,3" : "none")
            .attr("marker-end", d => `url(#arrow-${d.type || 'default'})`);

        // Node Color Palette (Optimized for white bg)
        const colorScale = (type) => {
            if (type === 'module_internal') return '#10b981'; // Vibrant Green
            if (type === 'module_external') return '#64748b'; // Slate
            if (type === 'package') return '#3b82f6';         // Vivid Blue
            if (type === 'class') return '#a855f7';           // Vivid Purple
            if (type === 'function') return '#f59e0b';        // Amber/Orange (Yellow is too hard to see on white)
            return '#fff';
        };

        // Draw Nodes
        nodesRef.current = gRef.current.append("g").selectAll("circle")
            .data(filteredNodes).join("circle")
            .attr("r", d => d.type === 'package' || d.type === 'module_internal' ? 12 : d.type === 'class' ? 8 : 5)
            .attr("fill", d => colorScale(d.type))
            .attr("stroke", "#ffffff").attr("stroke-width", 2)
            .style("filter", "url(#shadow)") 
            .call(drag(simulation));

        // --- TEXT UPDATE: Dark Text with White Outline ---
        labelsRef.current = gRef.current.append("g").selectAll("text")
            .data(filteredNodes).join("text")
            .attr("dy", d => d.type === 'function' ? -10 : -14)
            .attr("text-anchor", "middle")
            .text(d => d.id.split('.').pop())
            .attr("font-size", d => d.type === 'function' ? "9px" : "11px")
            .attr("font-weight", d => d.type === 'package' ? "bold" : "600")
            .attr("fill", "#0f172a") // Dark text
            .attr("paint-order", "stroke")
            .attr("stroke", "#ffffff") // White outline so it perfectly overlays the lines
            .attr("stroke-width", 3)
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .attr("pointer-events", "none");

        // Hover Logic
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
        }) .on('click', function (event, d) {
            // Prevent drag from firing click
            if (event.defaultPrevented) return;
            onNodeClick(d.id); 
        });

        simulation.on("tick", () => {
            linksRef.current.attr("d", d => {
                if (d.type === 'contains') {
                    return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
                }
                const dx = d.target.x - d.source.x,
                      dy = d.target.y - d.source.y,
                      dr = Math.sqrt(dx * dx + dy * dy);
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            nodesRef.current.attr("cx", d => d.x).attr("cy", d => d.y);
            labelsRef.current.attr("x", d => d.x).attr("y", d => d.y);
        });

        return () => simulation.stop();
    }, [graphData, detailLevel]);

    // Search and Selection highlight logic
    useEffect(() => {
        if (!nodesRef.current || !linksRef.current || !labelsRef.current) return;

        if (!searchResults || searchResults.length === 0) {
            nodesRef.current.style('opacity', 1).attr('stroke', '#ffffff').attr('stroke-width', 2);
            linksRef.current.style('opacity', d => d.type === 'contains' ? 0.6 : 0.8);
            labelsRef.current.style('opacity', 1);
            return;
        }

        const matchedNames = new Set(searchResults.map(r => r.name));

        if (selectedNode) {
            const targetNode = nodesRef.current.data().find(d => d.id.split('.').pop() === selectedNode.name);
            if (targetNode) {
                nodesRef.current.style('opacity', d => {
                    const isConnected = linksRef.current.data().some(l => 
                        (l.source.id === targetNode.id && l.target.id === d.id) || (l.target.id === targetNode.id && l.source.id === d.id)
                    );
                    return (d.id === targetNode.id || isConnected || d.id === targetNode.parent) ? 1 : 0.1;
                })
                .attr('stroke', d => d.id === targetNode.id ? '#2563eb' : '#ffffff') // Highlight stroke is vivid blue
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
                .style('opacity', d => matchedNames.has(d.id.split('.').pop()) ? 1 : 0.1)
                .attr('stroke', d => matchedNames.has(d.id.split('.').pop()) ? '#2563eb' : '#ffffff')
                .attr('stroke-width', d => matchedNames.has(d.id.split('.').pop()) ? 3 : 2);

            linksRef.current.style('opacity', 0.05);
            labelsRef.current.style('opacity', d => matchedNames.has(d.id.split('.').pop()) ? 1 : 0.1);
        }

    }, [searchResults, selectedNode]);

    const drag = (simulation) => d3.drag()
        .on("start", event => { if (!event.active) simulation.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
        .on("drag", event => { event.subject.fx = event.x; event.subject.fy = event.y; })
        .on("end", event => { if (!event.active) simulation.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; });

    return <svg ref={svgRef} style={{ background: "#f8fafc", width: "100%", height: "100vh", display: "block" }} />;
}