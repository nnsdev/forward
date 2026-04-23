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
      authorNote: '',
      authorNoteDepth: 0,
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

  it('deletes a chat and its messages', async () => {
    const client = createSqliteDatabase();
    initializeDatabase(client.sqlite);
    const repositories = createRepositories(client);

    const chat = await repositories.chats.create({ authorNote: '', authorNoteDepth: 0, title: 'Deletable chat' });
    await repositories.messages.create({ chatId: chat.id, content: 'msg1', role: 'user' });
    await repositories.messages.create({ chatId: chat.id, content: 'msg2', role: 'user' });

    expect(await repositories.messages.listByChatId(chat.id)).toHaveLength(2);

    await repositories.chats.delete(chat.id);

    expect(await repositories.chats.getById(chat.id)).toBeNull();
    expect(await repositories.messages.listByChatId(chat.id)).toHaveLength(0);
  });

  it('deletes a message', async () => {
    const client = createSqliteDatabase();
    initializeDatabase(client.sqlite);
    const repositories = createRepositories(client);

    const chat = await repositories.chats.create({ authorNote: '', authorNoteDepth: 0, title: 'Chat' });
    const message = await repositories.messages.create({ chatId: chat.id, content: 'bye', role: 'user' });

    await repositories.messages.delete(message.id);

    expect(await repositories.messages.getById(message.id)).toBeNull();
    expect(await repositories.messages.listByChatId(chat.id)).toHaveLength(0);
  });

  it('updates message content', async () => {
    const client = createSqliteDatabase();
    initializeDatabase(client.sqlite);
    const repositories = createRepositories(client);

    const chat = await repositories.chats.create({ authorNote: '', authorNoteDepth: 0, title: 'Chat' });
    const message = await repositories.messages.create({ chatId: chat.id, content: 'original', role: 'user' });

    const updated = await repositories.messages.updateContent(message.id, 'updated content');

    expect(updated.content).toBe('updated content');
  });

  it('creates, updates, and deletes provider configs', async () => {
    const client = createSqliteDatabase();
    initializeDatabase(client.sqlite);
    const repositories = createRepositories(client);

    const created = await repositories.providerConfigs.create({
      baseUrl: 'http://localhost:1234',
      model: 'llama3',
      name: 'Test Provider',
      providerType: 'openai-compatible',
      reasoningEnabled: false,
    });

    expect(created.name).toBe('Test Provider');
    expect(created.model).toBe('llama3');

    const updated = await repositories.providerConfigs.update(created.id, {
      name: 'Updated Provider',
      model: 'llama3.1',
    });

    expect(updated.name).toBe('Updated Provider');
    expect(updated.model).toBe('llama3.1');

    await repositories.providerConfigs.delete(created.id);

    expect(await repositories.providerConfigs.getById(created.id)).toBeNull();
  });
});
