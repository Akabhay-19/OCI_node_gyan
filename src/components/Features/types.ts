
// Fix: Import d3 to resolve 'd3' namespace errors for interface extensions
import * as d3 from 'd3';

export interface MindMapNode {
    id: string;
    label: string;
    summary: string;
    type: 'root' | 'main' | 'sub' | 'leaf';
    children?: MindMapNode[];
}

export interface MindMapData {
    title: string;
    root: MindMapNode;
}

export interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    summary: string;
    type: 'root' | 'main' | 'sub';
    x?: number;
    y?: number;
    data: MindMapNode; // Added data field which is used in graph
    depth: number;
    parent?: GraphNode;
    children?: GraphNode[];
    _children?: GraphNode[]; // For collapse/expand state
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: GraphNode;
    target: GraphNode;
}
