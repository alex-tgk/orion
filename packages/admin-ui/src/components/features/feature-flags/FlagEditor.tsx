import { useState, useEffect } from 'react';
import { Card, Button, TextInput, Textarea, NumberInput } from '@tremor/react';
import { X, Save, Loader2 } from 'lucide-react';
import { useCreateFeatureFlag, useUpdateFeatureFlag } from '../../../hooks/useFeatureFlags';
import type { FeatureFlag } from '../../../types/feature-flag.types';

interface FlagEditorProps {
  flag?: FeatureFlag | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const ENVIRONMENTS = ['dev', 'staging', 'prod'];

export function FlagEditor({ flag, onClose, onSuccess }: FlagEditorProps) {
  const isEditing = !!flag;
  const { mutate: createFlag, isPending: isCreating } = useCreateFeatureFlag();
  const { mutate: updateFlag, isPending: isUpdating } = useUpdateFeatureFlag();

  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    enabled: false,
    rolloutPercentage: 100,
    environments: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (flag) {
      setFormData({
        name: flag.name,
        key: flag.key,
        description: flag.description,
        enabled: flag.enabled,
        rolloutPercentage: flag.rollout?.percentage || 100,
        environments: flag.rollout?.environments || [],
      });
    }
  }, [flag]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.key.trim()) {
      newErrors.key = 'Key is required';
    } else if (!/^[a-z0-9-_]+$/.test(formData.key)) {
      newErrors.key = 'Key must contain only lowercase letters, numbers, hyphens, and underscores';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.rolloutPercentage < 0 || formData.rolloutPercentage > 100) {
      newErrors.rolloutPercentage = 'Rollout percentage must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const data = {
      name: formData.name,
      key: formData.key,
      description: formData.description,
      enabled: formData.enabled,
      rollout: {
        percentage: formData.rolloutPercentage,
        environments: formData.environments.length > 0 ? formData.environments : undefined,
      },
    };

    if (isEditing) {
      updateFlag(
        { id: flag.id, input: data },
        {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
          onError: (error) => {
            alert(`Failed to update feature flag: ${error.message}`);
          },
        }
      );
    } else {
      createFlag(data, {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (error) => {
          alert(`Failed to create feature flag: ${error.message}`);
        },
      });
    }
  };

  const toggleEnvironment = (env: string) => {
    setFormData((prev) => ({
      ...prev,
      environments: prev.environments.includes(env)
        ? prev.environments.filter((e) => e !== env)
        : [...prev.environments, env],
    }));
  };

  const isPending = isCreating || isUpdating;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Edit Feature Flag' : 'Create Feature Flag'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New Dashboard Feature"
                error={!!errors.name}
                errorMessage={errors.name}
              />
            </div>

            {/* Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., new-dashboard-feature"
                disabled={isEditing}
                error={!!errors.key}
                errorMessage={errors.key}
              />
              <p className="text-xs text-gray-500 mt-1">
                Unique identifier (lowercase, numbers, hyphens, underscores only)
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this feature flag controls..."
                rows={3}
                error={!!errors.description}
                errorMessage={errors.description}
              />
            </div>

            {/* Enabled Toggle */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.enabled ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {formData.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>

            {/* Rollout Percentage */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rollout Percentage
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.rolloutPercentage}
                  onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <div className="w-20">
                  <NumberInput
                    value={formData.rolloutPercentage}
                    onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) || 0 })}
                    min={0}
                    max={100}
                  />
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${formData.rolloutPercentage}%` }}
                />
              </div>
              {errors.rolloutPercentage && (
                <p className="text-xs text-red-500 mt-1">{errors.rolloutPercentage}</p>
              )}
            </div>

            {/* Environments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Environments
              </label>
              <div className="flex gap-3">
                {ENVIRONMENTS.map((env) => (
                  <label key={env} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.environments.includes(env)}
                      onChange={() => toggleEnvironment(env)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm capitalize">{env}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave unchecked to enable in all environments
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Flag' : 'Create Flag'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
