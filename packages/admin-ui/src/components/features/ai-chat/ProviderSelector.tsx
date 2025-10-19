/**
 * ProviderSelector Component
 * Dropdown to select AI provider with online/offline indicators
 */

import React from 'react';
import { Select, SelectItem, Badge } from '@tremor/react';
import { CircleDot, Circle } from 'lucide-react';
import type { AIProvider, AIProviderInfo } from '../../../types/ai';

interface ProviderSelectorProps {
  providers: AIProviderInfo[];
  selectedProvider: AIProvider;
  onSelectProvider: (provider: AIProvider) => void;
  disabled?: boolean;
}

const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
  claude: 'Claude (Anthropic)',
  copilot: 'GitHub Copilot',
  q: 'Amazon Q',
  gemini: 'Google Gemini',
  codex: 'OpenAI Codex',
};

const PROVIDER_COLORS: Record<AIProvider, string> = {
  claude: 'purple',
  copilot: 'blue',
  q: 'orange',
  gemini: 'green',
  codex: 'indigo',
};

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  selectedProvider,
  onSelectProvider,
  disabled = false,
}) => {
  const handleChange = (value: string) => {
    onSelectProvider(value as AIProvider);
  };

  const getStatusColor = (available: boolean) => {
    return available ? 'text-green-500' : 'text-gray-400';
  };

  const getStatusLabel = (available: boolean) => {
    return available ? 'Online' : 'Offline';
  };

  // Ensure all providers are represented
  const allProviders: AIProvider[] = ['claude', 'copilot', 'q', 'gemini', 'codex'];
  const providerMap = new Map(providers.map((p) => [p.id, p]));

  // Fill in missing providers with offline status
  const completeProviders: AIProviderInfo[] = allProviders.map((id) => {
    const existing = providerMap.get(id);
    return (
      existing || {
        id,
        name: PROVIDER_DISPLAY_NAMES[id],
        available: false,
        status: 'offline' as const,
      }
    );
  });

  const selectedProviderInfo = completeProviders.find(
    (p) => p.id === selectedProvider
  );

  return (
    <div className="space-y-2">
      {/* Provider Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          AI Provider
        </label>
        <Select
          value={selectedProvider}
          onValueChange={handleChange}
          disabled={disabled}
          className="w-full"
        >
          {completeProviders.map((provider) => (
            <SelectItem
              key={provider.id}
              value={provider.id}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {provider.available ? (
                  <CircleDot className="w-3 h-3 text-green-500" />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400" />
                )}
                <span>{PROVIDER_DISPLAY_NAMES[provider.id]}</span>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Provider Status */}
      {selectedProviderInfo && (
        <div className="flex items-center gap-2 text-sm">
          <Badge
            color={
              selectedProviderInfo.available
                ? 'green'
                : 'gray'
            }
          >
            {getStatusLabel(selectedProviderInfo.available)}
          </Badge>
          {selectedProviderInfo.models && selectedProviderInfo.models.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selectedProviderInfo.models.length} model
              {selectedProviderInfo.models.length > 1 ? 's' : ''} available
            </span>
          )}
        </div>
      )}

      {/* Provider Info Grid */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {completeProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => onSelectProvider(provider.id)}
            disabled={disabled || !provider.available}
            className={`p-3 rounded-lg border transition-all ${
              selectedProvider === provider.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${
              !provider.available
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-2">
              {provider.available ? (
                <CircleDot className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {provider.id.toUpperCase()}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {provider.available ? 'Ready' : 'Unavailable'}
            </div>
          </button>
        ))}
      </div>

      {/* Warning for offline providers */}
      {selectedProviderInfo && !selectedProviderInfo.available && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            This provider is currently offline. Please select another provider or check your
            connection.
          </p>
        </div>
      )}
    </div>
  );
};
