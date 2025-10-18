import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'react-flow-renderer';
import { ServiceDependencyGraph, DependencyNode, ServiceStatus } from '../../types/health';

interface DependencyGraphProps {
  graph: ServiceDependencyGraph;
  onNodeClick?: (node: DependencyNode) => void;
  className?: string;
}

const statusColors: Record<ServiceStatus, string> = {
  [ServiceStatus.HEALTHY]: '#10B981',
  [ServiceStatus.DEGRADED]: '#F59E0B',
  [ServiceStatus.UNHEALTHY]: '#EF4444',
  [ServiceStatus.UNKNOWN]: '#6B7280',
};

const nodeTypeColors: Record<string, string> = {
  service: '#3B82F6',
  database: '#8B5CF6',
  external: '#EC4899',
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  graph,
  onNodeClick,
  className,
}) => {
  // Convert graph data to ReactFlow format
  const initialNodes: Node[] = graph.nodes.map((node) => ({
    id: node.id,
    type: 'default',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: (
        <div className="flex flex-col items-center gap-1">
          <div className="text-sm font-semibold">{node.serviceName}</div>
          <div className="text-xs text-gray-500 capitalize">{node.type}</div>
        </div>
      ),
    },
    style: {
      background: statusColors[node.status],
      color: '#fff',
      border: `3px solid ${nodeTypeColors[node.type] || '#3B82F6'}`,
      borderRadius: '8px',
      padding: '12px 16px',
      minWidth: '120px',
      textAlign: 'center',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }));

  const edgeTypeStyles: Record<string, { strokeDasharray?: string; animated?: boolean }> = {
    sync: {},
    async: { strokeDasharray: '5, 5' },
    data: { animated: true },
  };

  const initialEdges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: edgeTypeStyles[edge.type]?.animated || false,
    style: {
      strokeWidth: 2,
      stroke: '#94A3B8',
      strokeDasharray: edgeTypeStyles[edge.type]?.strokeDasharray,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#94A3B8',
    },
    label: edge.type,
    labelStyle: { fill: '#64748B', fontWeight: 500, fontSize: '11px' },
    labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        const graphNode = graph.nodes.find((n) => n.id === node.id);
        if (graphNode) {
          onNodeClick(graphNode);
        }
      }
    },
    [graph.nodes, onNodeClick]
  );

  return (
    <div className={className} style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#E2E8F0" />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold mb-3 text-gray-900">Legend</h4>

        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-700 mb-1">Status</div>
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600 capitalize">{status}</span>
            </div>
          ))}

          <div className="text-xs font-medium text-gray-700 mt-3 mb-1">Type</div>
          {Object.entries(nodeTypeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded border-2"
                style={{ borderColor: color }}
              />
              <span className="text-xs text-gray-600 capitalize">{type}</span>
            </div>
          ))}

          <div className="text-xs font-medium text-gray-700 mt-3 mb-1">Connection</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-400" />
            <span className="text-xs text-gray-600">Sync</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-400 border-dashed border-t-2 border-gray-400" />
            <span className="text-xs text-gray-600">Async</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-400 animate-pulse" />
            <span className="text-xs text-gray-600">Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};
