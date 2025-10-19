import { useState } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Button,
  TextInput,
} from '@tremor/react';
import { Edit, Trash2, Search, Loader2, AlertCircle } from 'lucide-react';
import { useFeatureFlags, useToggleFeatureFlag, useDeleteFeatureFlag } from '../../../hooks/useFeatureFlags';
import type { FeatureFlag } from '../../../types/feature-flag.types';

interface FlagListProps {
  onEdit: (flag: FeatureFlag) => void;
}

export function FlagList({ onEdit }: FlagListProps) {
  const { flags, isLoading, error } = useFeatureFlags();
  const { toggleFlag } = useToggleFeatureFlag();
  const { mutate: deleteFlag, isPending: isDeleting } = useDeleteFeatureFlag();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the feature flag "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    deleteFlag(id, {
      onSuccess: () => {
        setDeletingId(null);
      },
      onError: (error) => {
        alert(`Failed to delete feature flag: ${error.message}`);
        setDeletingId(null);
      },
    });
  };

  const filteredFlags = flags.filter((flag) =>
    flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    flag.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load feature flags</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-4">
        <TextInput
          icon={Search}
          placeholder="Search feature flags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="text-sm text-gray-600">
          {filteredFlags.length} of {flags.length} flag{flags.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {filteredFlags.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">
              {searchQuery ? 'No matching feature flags found' : 'No feature flags found'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-500 mt-2">Create a feature flag to get started</p>
            )}
          </div>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Key</TableHeaderCell>
              <TableHeaderCell>Description</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Rollout</TableHeaderCell>
              <TableHeaderCell>Environment</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFlags.map((flag: FeatureFlag) => (
              <TableRow key={flag.id}>
                <TableCell>
                  <div className="font-medium">{flag.name}</div>
                  <div className="text-xs text-gray-500">
                    Updated {new Date(flag.updatedAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {flag.key}
                  </code>
                </TableCell>
                <TableCell>
                  <div className="max-w-xs truncate text-sm">
                    {flag.description}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFlag(flag.id, flag.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          flag.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <Badge color={flag.enabled ? 'green' : 'gray'}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {flag.rollout ? (
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${flag.rollout.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {flag.rollout.percentage}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">100%</span>
                  )}
                </TableCell>
                <TableCell>
                  {flag.rollout?.environments && flag.rollout.environments.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {flag.rollout.environments.map((env) => (
                        <Badge key={env} size="xs" color="blue">
                          {env}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">All</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => onEdit(flag)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      color="red"
                      onClick={() => handleDelete(flag.id, flag.name)}
                      disabled={deletingId === flag.id}
                    >
                      {deletingId === flag.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
