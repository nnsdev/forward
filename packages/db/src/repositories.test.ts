import { describe, expect, it } from 'vitest';

import { initializeDatabase } from './bootstrap';
import { createSqliteDatabase } from './client';
import { createRepositories } from './repositories';

describe('repositories', () => {
  it('persists provider configs, chats, and messages', async () => {
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

    const chat = await repositories.chats.create({
      providerConfigId: 'provider_local',
      title: 'Foundation chat',
    });

    await repositories.messages.create({
      chatId: chat.id,
      content: 'Hello world',
      role: 'user',
    });

    const providers = await repositories.providerConfigs.list();
    const chats = await repositories.chats.list();
    const messages = await repositories.messages.listByChatId(chat.id);

    expect(providers).toHaveLength(1);
    expect(chats).toHaveLength(1);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.content).toBe('Hello world');
  });
});
