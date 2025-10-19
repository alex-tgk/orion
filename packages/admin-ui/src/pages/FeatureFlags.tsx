import { useState } from 'react';
import { Card, Button, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { Plus, Flag, BarChart3, CheckCircle, XCircle } from 'lucide-react';
import { FlagList } from '../components/features/feature-flags/FlagList';
import { FlagEditor } from '../components/features/feature-flags/FlagEditor';
import { FlagAnalytics } from '../components/features/feature-flags/FlagAnalytics';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import type { FeatureFlag } from '../types/feature-flag.types';

export function FeatureFlags() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const { total, enabled, disabled } = useFeatureFlags();

  const handleCreateFlag = () => {
    setEditingFlag(null);
    setIsEditorOpen(true);
  };

  const handleEditFlag = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingFlag(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feature Flags</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage feature rollouts and A/B testing across environments
          </p>
        </div>
        <Button onClick={handleCreateFlag}>
          <Plus className="h-4 w-4 mr-2" />
          Create Flag
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Flags</p>
              <p className="text-2xl font-bold mt-1">{total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Flag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enabled</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{enabled}</p>
              <p className="text-xs text-gray-500 mt-1">
                {total > 0 ? ((enabled / total) * 100).toFixed(0) : 0}% of total
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Disabled</p>
              <p className="text-2xl font-bold mt-1 text-gray-600">{disabled}</p>
              <p className="text-xs text-gray-500 mt-1">
                {total > 0 ? ((disabled / total) * 100).toFixed(0) : 0}% of total
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs: Flags | Analytics */}
      <Card>
        <TabGroup>
          <TabList>
            <Tab>
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                <span>Flags</span>
              </div>
            </Tab>
            <Tab>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
              </div>
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <div className="mt-6">
                <FlagList onEdit={handleEditFlag} />
              </div>
            </TabPanel>

            <TabPanel>
              <div className="mt-6">
                <FlagAnalytics />
              </div>
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </Card>

      {/* Flag Editor Modal */}
      {isEditorOpen && (
        <FlagEditor flag={editingFlag} onClose={handleCloseEditor} />
      )}
    </div>
  );
}
