import { PLAIN_TEMPLATE, normalizeSillyTavernContext, normalizeSillyTavernInstruct } from '@forward/shared';
import type { CreatePresetInput, InstructTemplate, Preset } from '@forward/shared';

import type { AppConfig } from './config';

function cloneTemplate(template: InstructTemplate): InstructTemplate {
  return JSON.parse(JSON.stringify(template)) as InstructTemplate;
}

function isInstructTemplatePayload(raw: Record<string, unknown>): boolean {
  return 'input_sequence' in raw || 'output_sequence' in raw || 'system_sequence' in raw;
}

function isContextTemplatePayload(raw: Record<string, unknown>): boolean {
  return 'story_string' in raw || 'chat_start' in raw || 'example_separator' in raw;
}

export function buildPresetImportBase(config: AppConfig, preset: Preset | null): CreatePresetInput {
  if (preset) {
    return {
      contextLength: preset.contextLength,
      frequencyPenalty: preset.frequencyPenalty,
      instructTemplate: preset.instructTemplate ? cloneTemplate(preset.instructTemplate) : null,
      maxOutputTokens: preset.maxOutputTokens,
      minP: preset.minP,
      name: preset.name,
      presencePenalty: preset.presencePenalty,
      repeatPenalty: preset.repeatPenalty,
      seed: preset.seed,
      stopStrings: [...preset.stopStrings],
      systemPrompt: preset.systemPrompt,
      temperature: preset.temperature,
      topK: preset.topK,
      topP: preset.topP,
    };
  }

  return {
    contextLength: config.defaultPresetContextLength,
    frequencyPenalty: config.defaultPresetFrequencyPenalty,
    instructTemplate: null,
    maxOutputTokens: config.defaultPresetMaxOutputTokens,
    minP: config.defaultPresetMinP,
    name: config.defaultPresetName,
    presencePenalty: config.defaultPresetPresencePenalty,
    repeatPenalty: config.defaultPresetRepeatPenalty,
    seed: config.defaultPresetSeed,
    stopStrings: [...config.defaultPresetStopStrings],
    systemPrompt: config.defaultPresetSystemPrompt,
    temperature: config.defaultPresetTemperature,
    topK: config.defaultPresetTopK,
    topP: config.defaultPresetTopP,
  };
}

export async function importPresetTemplateFile(
  config: AppConfig,
  file: File,
  basePreset: Preset | null,
): Promise<CreatePresetInput> {
  const text = await file.text();
  const raw = JSON.parse(text) as Record<string, unknown>;
  const next = buildPresetImportBase(config, basePreset);
  let nextTemplate = next.instructTemplate ? cloneTemplate(next.instructTemplate) : cloneTemplate(PLAIN_TEMPLATE);
  let importedSomething = false;

  if (isInstructTemplatePayload(raw)) {
    nextTemplate = {
      ...nextTemplate,
      ...normalizeSillyTavernInstruct(raw),
    };
    if (!basePreset) {
      next.name = String(raw.name ?? next.name);
    }
    importedSomething = true;
  }

  if (isContextTemplatePayload(raw)) {
    const context = normalizeSillyTavernContext(raw);
    nextTemplate = {
      ...nextTemplate,
      chatStart: context.chatStart,
      exampleSeparator: context.exampleSeparator,
      storyStringTemplate: context.storyStringTemplate,
    };
    if (!basePreset) {
      next.name = context.name || next.name;
    }
    importedSomething = true;
  }

  if (!importedSomething) {
    throw new Error('Unsupported SillyTavern template JSON');
  }

  next.instructTemplate = nextTemplate;

  if (!basePreset) {
    next.name = next.name || file.name.replace(/\.[^.]+$/, '');
  }

  return next;
}
