import { createRepositories, createSqliteDatabase, initializeDatabase } from '@forward/db';
import type { ProviderAdapter } from '@forward/provider-core';
import { describe, expect, it } from 'vitest';

import { createApp } from './app';

async function createTestApp() {
  const client = createSqliteDatabase();

  initializeDatabase(client.sqlite);

  const repositories = createRepositories(client);

  await repositories.providerConfigs.upsert({
    apiKeyEnvVar: null,
    baseUrl: 'http://127.0.0.1:8080',
    id: 'provider_local',
    model: 'qwen',
    name: 'Local qwen',
    providerType: 'openai-compatible',
    reasoningEnabled: true,
  });

  await repositories.presets.upsert({
    id: 'preset_balanced',
    maxOutputTokens: 256,
    name: 'Balanced',
    stopStrings: [],
    temperature: 0.7,
    topK: 40,
    topP: 0.9,
  });

  const createProviderAdapter = (): ProviderAdapter => ({
    async listModels() {
      return [{ id: 'qwen' }, { id: 'roci' }];
    },
    async *streamGenerate() {
      yield { kind: 'reasoning', text: 'Thinking...' };
      yield { kind: 'content', text: 'Pong' };
      yield { kind: 'done' };
    },
    async validateConfig() {
      return;
    },
  });

  return {
    app: createApp(
      {
        appPassword: 'secret',
        databasePath: ':memory:',
        defaultAssistantSystemPrompt: 'You are a helpful, concise assistant. Be direct, honest, and useful.',
        defaultProviderApiKeyEnvVar: null,
        defaultProviderBaseUrl: 'http://127.0.0.1:8080',
        defaultProviderId: 'provider_local',
        defaultProviderModel: 'qwen',
        defaultProviderName: 'Local qwen',
        defaultPresetId: 'preset_balanced',
        defaultPresetMaxOutputTokens: 256,
        defaultPresetName: 'Balanced',
        defaultPresetStopStrings: [],
        defaultPresetTemperature: 0.7,
        defaultPresetTopK: 40,
        defaultPresetTopP: 0.9,
        mediaRoot: '/tmp/forward-test-media',
        port: 3000,
        sessionSecret: 'test-session-secret',
        webOrigin: 'http://127.0.0.1:4173',
      },
      {
        ...repositories,
        createProviderAdapter,
      },
    ),
    repositories,
  };
}

describe('api app', () => {
  it('returns health status', async () => {
    const { app } = await createTestApp();
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('reports unauthenticated sessions before login', async () => {
    const { app } = await createTestApp();
    const response = await app.request('/auth/session');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });

  it('creates chats and persists generated assistant state', async () => {
    const { app } = await createTestApp();
    const loginResponse = await app.request('/auth/login', {
      body: JSON.stringify({ password: 'secret' }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(loginResponse.status).toBe(204);

    const cookieHeader = loginResponse.headers.get('set-cookie');
    expect(cookieHeader).toBeTruthy();

    const authHeaders = {
      cookie: cookieHeader?.split(';')[0] ?? '',
    };

    const createChatResponse = await app.request('/chats', {
      body: JSON.stringify({
        providerConfigId: 'provider_local',
        title: 'Generated chat',
      }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'POST',
    });

    expect(createChatResponse.status).toBe(201);

    const createdChat = (await createChatResponse.json()) as { id: string };

    const providersResponse = await app.request('/providers', {
      headers: authHeaders,
    });

    expect(providersResponse.status).toBe(200);
    await expect(providersResponse.json()).resolves.toEqual({
      providers: [
        {
          apiKeyEnvVar: null,
          baseUrl: 'http://127.0.0.1:8080',
          id: 'provider_local',
          model: 'qwen',
          name: 'Local qwen',
          providerType: 'openai-compatible',
          reasoningEnabled: true,
        },
      ],
    });

    const modelsResponse = await app.request('/providers/provider_local/models', {
      headers: authHeaders,
    });

    expect(modelsResponse.status).toBe(200);
    await expect(modelsResponse.json()).resolves.toEqual({
      models: [{ id: 'qwen' }, { id: 'roci' }],
    });

    const response = await app.request(`/chats/${createdChat.id}/generate`, {
      body: JSON.stringify({ content: 'Reply with pong.' }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const payload = await response.text();

    expect(payload).toContain('event: reasoning.delta');
    expect(payload).toContain('event: content.delta');
    expect(payload).toContain('Pong');

    const messagesResponse = await app.request(`/chats/${createdChat.id}/messages`, {
      headers: authHeaders,
    });

    expect(messagesResponse.status).toBe(200);

    await expect(messagesResponse.json()).resolves.toMatchObject([
      {
        chatId: createdChat.id,
        content: 'Reply with pong.',
        role: 'user',
        state: 'completed',
      },
      {
        chatId: createdChat.id,
        content: 'Pong',
        reasoningContent: 'Thinking...',
        role: 'assistant',
        state: 'completed',
      },
    ]);
  });

  it('builds a real prompt preview for non-character chats', async () => {
    const { app } = await createTestApp();
    const loginResponse = await app.request('/auth/login', {
      body: JSON.stringify({ password: 'secret' }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    const cookieHeader = loginResponse.headers.get('set-cookie');

    const createChatResponse = await app.request('/chats', {
      body: JSON.stringify({
        providerConfigId: 'provider_local',
        title: 'Preview chat',
      }),
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader?.split(';')[0] ?? '',
      },
      method: 'POST',
    });
    const createdChat = (await createChatResponse.json()) as { id: string };

    await app.request(`/chats/${createdChat.id}/messages`, {
      body: JSON.stringify({ content: 'Hello there', role: 'user' }),
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader?.split(';')[0] ?? '',
      },
      method: 'POST',
    });

    const previewResponse = await app.request(`/chats/${createdChat.id}/prompt-preview`, {
      headers: {
        cookie: cookieHeader?.split(';')[0] ?? '',
      },
    });

    expect(previewResponse.status).toBe(200);
    const preview = (await previewResponse.json()) as {
      chatId: string;
      messages: Array<{ content: string; role: string }>;
      preset: { name: string };
    };

    expect(preview.chatId).toBe(createdChat.id);
    expect(preview.preset.name).toBe('Balanced');
    expect(preview.messages[0]).toMatchObject({
      role: 'system',
      content: expect.stringContaining('helpful, concise assistant'),
    });
    expect(preview.messages.at(-1)).toMatchObject({
      role: 'user',
      content: 'Hello there',
    });
  });

  it('lists presets and allows chats to attach them', async () => {
    const { app } = await createTestApp();
    const loginResponse = await app.request('/auth/login', {
      body: JSON.stringify({ password: 'secret' }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    const cookieHeader = loginResponse.headers.get('set-cookie');
    const authHeaders = {
      cookie: cookieHeader?.split(';')[0] ?? '',
    };

    const presetsResponse = await app.request('/presets', {
      headers: authHeaders,
    });

    expect(presetsResponse.status).toBe(200);
    await expect(presetsResponse.json()).resolves.toMatchObject([
      {
        name: 'Balanced',
        temperature: 0.7,
      },
    ]);

    const createdPresetResponse = await app.request('/presets', {
      body: JSON.stringify({
        maxOutputTokens: 128,
        name: 'Precise',
        stopStrings: ['END'],
        temperature: 0.2,
        topK: 20,
        topP: 0.8,
      }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'POST',
    });

    expect(createdPresetResponse.status).toBe(201);
    const createdPreset = (await createdPresetResponse.json()) as { id: string };

    const createChatResponse = await app.request('/chats', {
      body: JSON.stringify({
        providerConfigId: 'provider_local',
        title: 'Preset chat',
      }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'POST',
    });
    const createdChat = (await createChatResponse.json()) as { id: string };

    const updateChatResponse = await app.request(`/chats/${createdChat.id}`, {
      body: JSON.stringify({ presetId: createdPreset.id }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'PATCH',
    });

    expect(updateChatResponse.status).toBe(200);
    await expect(updateChatResponse.json()).resolves.toMatchObject({
      presetId: createdPreset.id,
    });
  });

  it('imports a character and lets a chat preview use it', async () => {
    const { app } = await createTestApp();
    const loginResponse = await app.request('/auth/login', {
      body: JSON.stringify({ password: 'secret' }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    const cookieHeader = loginResponse.headers.get('set-cookie');
    const authHeaders = {
      cookie: cookieHeader?.split(';')[0] ?? '',
    };
    const formData = new FormData();

    formData.append(
      'file',
      new File(
        [
          JSON.stringify({
            description: 'An observant astronomer.',
            exampleDialogue: 'Artemis peers into the dark.',
            firstMessage: 'The observatory is quiet tonight.',
            name: 'Artemis',
            personality: 'Calm and curious.',
            scenario: 'Watching a meteor shower from the mountains.',
          }),
        ],
        'artemis.json',
        { type: 'application/json' },
      ),
    );

    const importResponse = await app.request('/characters/import', {
      body: formData,
      headers: authHeaders,
      method: 'POST',
    });

    expect(importResponse.status).toBe(201);
    const importedCharacter = (await importResponse.json()) as { id: string; name: string };
    expect(importedCharacter.name).toBe('Artemis');

    const createChatResponse = await app.request('/chats', {
      body: JSON.stringify({
        providerConfigId: 'provider_local',
        title: 'Character chat',
      }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'POST',
    });
    const createdChat = (await createChatResponse.json()) as { id: string };

    const updateChatResponse = await app.request(`/chats/${createdChat.id}`, {
      body: JSON.stringify({ characterId: importedCharacter.id }),
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      method: 'PATCH',
    });

    expect(updateChatResponse.status).toBe(200);

    const previewResponse = await app.request(`/chats/${createdChat.id}/prompt-preview`, {
      headers: authHeaders,
    });

    expect(previewResponse.status).toBe(200);
    await expect(previewResponse.json()).resolves.toMatchObject({
      messages: [
        {
          role: 'system',
          content: expect.stringContaining('You are roleplaying as Artemis'),
        },
      ],
    });
  });
});
