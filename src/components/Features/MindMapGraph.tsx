
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MindMapData } from './types';

interface MindMapGraphProps {
    data: MindMapData;
    onNodeClick: (node: any) => void;
}

const MindMapGraph: React.FC<MindMapGraphProps> = ({ data, onNodeClick }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!svgRef.current || !data || !containerRef.current) return;

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();
        d3.select(containerRef.current).selectAll(".mindmap-tooltip").remove();

        const g = svg.append("g");
        const linkGroup = g.append("g").attr("class", "links");
        const nodeGroup = g.append("g").attr("class", "nodes");

        // Glow Filter setup
        const defs = svg.append("defs");

        // Standard glow
        const filter = defs.append("filter")
            .attr("id", "glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        filter.append("feGaussianBlur")
            .attr("stdDeviation", "4")
            .attr("result", "blur");
        filter.append("feComposite")
            .attr("in", "SourceGraphic")
            .attr("in2", "blur")
            .attr("operator", "over");

        // Intense glow for active/root
        const intenseFilter = defs.append("filter")
            .attr("id", "intense-glow")
            .attr("x", "-50%")
            .attr("y", "-50%")
            .attr("width", "200%")
            .attr("height", "200%");
        intenseFilter.append("feGaussianBlur")
            .attr("stdDeviation", "8")
            .attr("result", "blur");
        intenseFilter.append("feComposite")
            .attr("in", "SourceGraphic")
            .attr("in2", "blur")
            .attr("operator", "over");

        // Tooltip - Refined Styling
        const tooltip = d3.select(containerRef.current)
            .append("div")
            .attr("class", "mindmap-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(5, 5, 12, 0.95)")
            .style("backdrop-filter", "blur(20px)")
            .style("color", "#e8eaed")
            .style("border", "1px solid rgba(96, 165, 250, 0.25)")
            .style("border-radius", "20px")
            .style("padding", "20px")
            .style("font-size", "14px")
            .style("max-width", "320px")
            .style("box-shadow", "0 20px 50px rgba(0, 0, 0, 0.9)")
            .style("pointer-events", "none")
            .style("z-index", "100")
            .style("opacity", "0")
            .style("transition", "opacity 0.3s cubic-bezier(0.23, 1, 0.32, 1), transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)");

        // Zoom setup
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Tree Layout Configuration
        const tree = d3.tree<any>()
            .nodeSize([110, 380])
            .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.5));

        const root = d3.hierarchy(data.root) as any;
        root.x0 = height / 2;
        root.y0 = 0;

        // Node Dimensioning
        const getNodeWidth = (d: any) => {
            const labelLength = d.data.label.length;
            return Math.max(180, labelLength * 10 + 70);
        };

        const update = (source: any) => {
            const nodes = root.descendants();
            const links = root.links();

            tree(root);

            // --- Nodes ---
            const nodeSelection = nodeGroup.selectAll<SVGGElement, any>("g.mindmap-node")
                .data(nodes, (d: any) => d.data.id);

            // Enter phase
            const nodeEnter = nodeSelection.enter().append("g")
                .attr("class", "mindmap-node")
                .attr("transform", (d: any) => `translate(${source.y0},${source.x0})`)
                .style("opacity", 0);

            const rectGroup = nodeEnter.append("g")
                .attr("class", "node-body")
                .on("click", (event: any, d: any) => {
                    event.stopPropagation();
                    setSelectedId(d.data.id);
                    onNodeClick(d.data);

                    const transform = d3.zoomTransform(svg.node()!);
                    const scale = transform.k;
                    const nextTranslateX = (width / 2) - (d.y * scale);
                    const nextTranslateY = (height / 2) - (d.x * scale);

                    svg.transition()
                        .duration(1000)
                        .ease(d3.easeCubicInOut)
                        .call(zoom.transform, d3.zoomIdentity.translate(nextTranslateX, nextTranslateY).scale(scale));

                    update(d);
                })
                .on("mouseenter", (event: any, d: any) => {
                    tooltip.style("visibility", "visible").style("opacity", "1")
                        .style("transform", "translateY(0)")
                        .html(`
              <div style="font-weight: 900; color: #60a5fa; margin-bottom: 8px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.15em; font-family: 'Exo 2'">${d.data.label}</div>
              <div style="line-height: 1.7; color: #9aa0a6; font-weight: 500;">${d.data.summary}</div>
            `);
                })
                .on("mousemove", (event: any) => {
                    const [x, y] = d3.pointer(event, containerRef.current);
                    tooltip.style("top", (y + 25) + "px").style("left", (x + 25) + "px");
                })
                .on("mouseleave", () => {
                    tooltip.style("opacity", "0").style("visibility", "hidden").style("transform", "translateY(10px)");
                });

            // Glassmorphic Node Backings
            rectGroup.append("rect")
                .attr("ry", 16)
                .attr("rx", 16)
                .attr("y", -28)
                .attr("height", 56)
                .attr("width", getNodeWidth)
                .attr("fill", (d: any) => {
                    if (d.depth === 0) return "rgba(14, 165, 233, 0.25)";
                    if (d.depth === 1) return "rgba(37, 99, 235, 0.15)";
                    return "rgba(255, 255, 255, 0.04)";
                })
                .attr("stroke", (d: any) => d.depth === 0 ? "rgba(14, 165, 233, 0.6)" : "rgba(255, 255, 255, 0.08)")
                .attr("stroke-width", 1.5);

            rectGroup.append("text")
                .attr("dy", "0.32em")
                .attr("x", 24)
                .attr("text-anchor", "start")
                .attr("fill", "white")
                .attr("font-size", "15px")
                .attr("font-weight", "700")
                .style("pointer-events", "none")
                .style("text-shadow", "0 2px 8px rgba(0,0,0,0.8)")
                .style("font-family", "'Exo 2', sans-serif")
                .text((d: any) => d.data.label);

            // Expansion Indicator (Arrow)
            const arrowGroup = nodeEnter.filter((d: any) => d.data.children || d._children)
                .append("g")
                .attr("class", "arrow-toggle")
                .attr("cursor", "pointer")
                .on("click", (event: any, d: any) => {
                    event.stopPropagation();
                    if (d.children) {
                        d._children = d.children;
                        d.children = null;
                    } else {
                        d.children = d._children;
                        d._children = null;
                    }
                    update(d);
                });

            arrowGroup.append("circle")
                .attr("cx", (d: any) => getNodeWidth(d) - 28)
                .attr("cy", 0)
                .attr("r", 12)
                .attr("fill", "rgba(255, 255, 255, 0.05)")
                .attr("stroke", "rgba(255, 255, 255, 0.1)")
                .attr("stroke-width", 1);

            arrowGroup.append("text")
                .attr("dy", "0.35em")
                .attr("x", (d: any) => getNodeWidth(d) - 28)
                .attr("fill", "#60a5fa")
                .attr("font-size", "12px")
                .attr("font-weight", "900")
                .style("pointer-events", "none")
                .attr("text-anchor", "middle")
                .text((d: any) => d._children ? "+" : "−");

            // Update positions
            const nodeUpdate = (nodeSelection.merge(nodeEnter as any) as any)
                .transition().duration(800)
                .attr("transform", (d: any) => `translate(${d.y},${d.x})`)
                .style("opacity", 1);

            const targetNode = root.descendants().find((d: any) => d.data.id === selectedId);
            const pathIds = new Set(targetNode ? targetNode.ancestors().map((d: any) => d.data.id) : []);

            nodeUpdate.select("rect")
                .attr("stroke", (d: any) => pathIds.has(d.data.id) ? "#0ea5e9" : "rgba(255, 255, 255, 0.08)")
                .attr("stroke-width", (d: any) => pathIds.has(d.data.id) ? 3 : 1.5)
                .attr("fill", (d: any) => pathIds.has(d.data.id) ? "rgba(37, 99, 235, 0.35)" : d.depth === 0 ? "rgba(14, 165, 233, 0.25)" : "rgba(255, 255, 255, 0.05)")
                .style("filter", (d: any) => pathIds.has(d.data.id) ? "url(#glow)" : "none");

            nodeUpdate.select(".arrow-toggle circle")
                .attr("fill", (d: any) => d._children ? "rgba(96, 165, 250, 0.1)" : "rgba(255, 255, 255, 0.05)");

            nodeUpdate.select(".arrow-toggle text")
                .text((d: any) => d._children ? "+" : "−");

            // Exit nodes
            nodeSelection.exit().transition().duration(800)
                .attr("transform", (d: any) => `translate(${source.y},${source.x})`)
                .style("opacity", 0)
                .remove();

            // --- Links ---
            const linkSelection = linkGroup.selectAll<SVGPathElement, any>("path.link")
                .data(links, (d: any) => d.target.data.id);

            const linkEnter = linkSelection.enter().append("path")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "rgba(96, 165, 250, 0.1)")
                .attr("stroke-width", 2)
                .attr("d", d3.linkHorizontal<any, any>()
                    .x(() => source.y0)
                    .y(() => source.x0) as any);

            linkSelection.merge(linkEnter as any).transition().duration(800)
                .attr("stroke", (d: any) => pathIds.has(d.target.data.id) && pathIds.has(d.source.data.id) ? "#0ea5e9" : "rgba(96, 165, 250, 0.15)")
                .attr("stroke-width", (d: any) => pathIds.has(d.target.data.id) && pathIds.has(d.source.data.id) ? 4 : 2)
                .style("filter", (d: any) => pathIds.has(d.target.data.id) && pathIds.has(d.source.data.id) ? "url(#glow)" : "none")
                .attr("d", d3.linkHorizontal<any, any>()
                    .x(d => d.y)
                    .y(d => d.x) as any);

            linkSelection.exit().transition().duration(800)
                .attr("d", d3.linkHorizontal<any, any>()
                    .x(() => source.y)
                    .y(() => source.x) as any)
                .remove();

            nodes.forEach((d: any) => {
                d.x0 = d.x;
                d.y0 = d.y;
            });
        };

        // Initial positioning
        const initialTrans = d3.zoomIdentity.translate(220, height / 2).scale(0.8);
        svg.call(zoom.transform, initialTrans);
        update(root);

    }, [data, selectedId]);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-transparent">
            <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
        </div>
    );
};

export default MindMapGraph;
