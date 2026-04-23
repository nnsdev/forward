import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { createRepositories, createSqliteDatabase, ensureProviderConfig, initializeDatabase, type AppRepositories } from '@forward/db';
import { createOpenAICompatibleAdapter, type ProviderAdapterFactory } from '@forward/provider-core';
import type { ProviderConfig } from '@forward/shared';

import type { AppConfig } from './config';

export interface AppDependencies extends AppRepositories {
  createProviderAdapter: ProviderAdapterFactory;
}

function ensureDatabaseDirectory(databasePath: string): void {
  if (databasePath === ':memory:') {
    return;
  }

  mkdirSync(dirname(resolve(databasePath)), { recursive: true });
}

function resolveProviderApiKey(providerConfig: ProviderConfig, env: NodeJS.ProcessEnv = process.env): string | null {
  if (!providerConfig.apiKeyEnvVar) {
    return null;
  }

  return env[providerConfig.apiKeyEnvVar] ?? null;
}

export async function createAppDependencies(config: AppConfig): Promise<AppDependencies> {
  ensureDatabaseDirectory(config.databasePath);

  const client = createSqliteDatabase(config.databasePath);

  initializeDatabase(client.sqlite);

  const repositories = createRepositories(client);

  await ensureProviderConfig(repositories.providerConfigs, {
    apiKeyEnvVar: config.defaultProviderApiKeyEnvVar,
    baseUrl: config.defaultProviderBaseUrl,
    id: config.defaultProviderId,
    model: config.defaultProviderModel,
    name: config.defaultProviderName,
    providerType: 'openai-compatible',
    reasoningEnabled: true,
  });

  await repositories.presets.upsert({
    contextLength: config.defaultPresetContextLength,
    frequencyPenalty: config.defaultPresetFrequencyPenalty,
    id: config.defaultPresetId,
    instructTemplate: null,
    maxOutputTokens: config.defaultPresetMaxOutputTokens,
    minP: config.defaultPresetMinP,
    name: config.defaultPresetName,
    presencePenalty: config.defaultPresetPresencePenalty,
    repeatPenalty: config.defaultPresetRepeatPenalty,
    seed: config.defaultPresetSeed,
    stopStrings: config.defaultPresetStopStrings,
    systemPrompt: config.defaultPresetSystemPrompt,
    temperature: config.defaultPresetTemperature,
    thinkingBudgetTokens: null,
    topK: config.defaultPresetTopK,
    topP: config.defaultPresetTopP,
  });

  return {
    ...repositories,
    createProviderAdapter(providerConfig) {
      return createOpenAICompatibleAdapter({
        apiKey: resolveProviderApiKey(providerConfig),
        config: providerConfig,
      });
    },
  };
}
