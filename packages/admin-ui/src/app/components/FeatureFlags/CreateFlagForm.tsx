import React, { useState } from 'react';

interface CreateFlagFormProps {
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export const CreateFlagForm: React.FC<CreateFlagFormProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    type: 'BOOLEAN',
    rolloutPercentage: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? Number(value)
          : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-4">
      <h3 className="text-xl font-bold text-gray-900">Create Feature Flag</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Key (kebab-case)
        </label>
        <input
          type="text"
          name="key"
          value={formData.key}
          onChange={handleChange}
          pattern="^[a-z0-9-]+$"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="new-feature"
        />
        <p className="text-xs text-gray-500 mt-1">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="New Feature"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Detailed description of the feature..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type
        </label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="BOOLEAN">Boolean</option>
          <option value="STRING">String</option>
          <option value="NUMBER">Number</option>
          <option value="JSON">JSON</option>
          <option value="MULTIVARIATE">Multivariate (A/B Testing)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rollout Percentage
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="range"
            name="rolloutPercentage"
            min="0"
            max="100"
            value={formData.rolloutPercentage}
            onChange={handleChange}
            className="flex-1"
          />
          <span className="text-sm text-gray-700 font-medium w-12">
            {formData.rolloutPercentage}%
          </span>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="enabled"
          checked={formData.enabled}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Enable immediately
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Flag'}
        </button>
      </div>
    </form>
  );
};
