const DEFAULT_APP_PASSWORD = 'change-me';
const DEFAULT_DATABASE_PATH = 'data/forward.sqlite';
const DEFAULT_PROVIDER_BASE_URL = 'http://192.168.178.68:8082';
const DEFAULT_PROVIDER_ID = 'provider_local_llama';
const DEFAULT_PROVIDER_MODEL = 'qwen';
const DEFAULT_PROVIDER_NAME = 'Local llama.cpp';
const DEFAULT_PRESET_ID = 'preset_balanced';
const DEFAULT_PRESET_NAME = 'Balanced';
const DEFAULT_SESSION_SECRET = 'forward-dev-session-secret';
const DEFAULT_WEB_ORIGIN = 'http://127.0.0.1:5173';
const DEFAULT_ASSISTANT_SYSTEM_PROMPT = 'You are a helpful, concise assistant. Be direct, honest, and useful.';
const DEFAULT_MEDIA_ROOT = 'data/media';

export interface AppConfig {
  appPassword: string;
  databasePath: string;
  defaultAssistantSystemPrompt: string;
  defaultProviderApiKeyEnvVar: string | null;
  defaultProviderBaseUrl: string;
  defaultProviderId: string;
  defaultProviderModel: string;
  defaultProviderName: string;
  defaultPresetContextLength: number;
  defaultPresetFrequencyPenalty: number;
  defaultPresetId: string;
  defaultPresetMaxOutputTokens: number;
  defaultPresetMinP: number;
  defaultPresetName: string;
  defaultPresetPresencePenalty: number;
  defaultPresetRepeatPenalty: number;
  defaultPresetSeed: number | null;
  defaultPresetStopStrings: string[];
  defaultPresetTemperature: number;
  defaultPresetTopK: number;
  defaultPresetTopP: number;
  mediaRoot: string;
  port: number;
  sessionSecret: string;
  webOrigin: string;
}

export function getAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const portValue = Number(source.PORT ?? '3000');

  return {
    appPassword: source.APP_PASSWORD ?? DEFAULT_APP_PASSWORD,
    databasePath: source.DATABASE_PATH ?? DEFAULT_DATABASE_PATH,
    defaultAssistantSystemPrompt: source.DEFAULT_ASSISTANT_SYSTEM_PROMPT ?? DEFAULT_ASSISTANT_SYSTEM_PROMPT,
    defaultProviderApiKeyEnvVar: source.DEFAULT_PROVIDER_API_KEY_ENV_VAR ?? null,
    defaultProviderBaseUrl: source.DEFAULT_PROVIDER_BASE_URL ?? DEFAULT_PROVIDER_BASE_URL,
    defaultProviderId: source.DEFAULT_PROVIDER_ID ?? DEFAULT_PROVIDER_ID,
    defaultProviderModel: source.DEFAULT_PROVIDER_MODEL ?? DEFAULT_PROVIDER_MODEL,
    defaultProviderName: source.DEFAULT_PROVIDER_NAME ?? DEFAULT_PROVIDER_NAME,
    defaultPresetContextLength: Number(source.DEFAULT_PRESET_CONTEXT_LENGTH ?? '131072'),
    defaultPresetFrequencyPenalty: Number(source.DEFAULT_PRESET_FREQUENCY_PENALTY ?? '0'),
    defaultPresetId: source.DEFAULT_PRESET_ID ?? DEFAULT_PRESET_ID,
    defaultPresetMaxOutputTokens: Number(source.DEFAULT_PRESET_MAX_OUTPUT_TOKENS ?? '256'),
    defaultPresetMinP: Number(source.DEFAULT_PRESET_MIN_P ?? '0.05'),
    defaultPresetName: source.DEFAULT_PRESET_NAME ?? DEFAULT_PRESET_NAME,
    defaultPresetPresencePenalty: Number(source.DEFAULT_PRESET_PRESENCE_PENALTY ?? '0'),
    defaultPresetRepeatPenalty: Number(source.DEFAULT_PRESET_REPEAT_PENALTY ?? '1'),
    defaultPresetSeed: source.DEFAULT_PRESET_SEED ? Number(source.DEFAULT_PRESET_SEED) : null,
    defaultPresetStopStrings: source.DEFAULT_PRESET_STOP_STRINGS ? source.DEFAULT_PRESET_STOP_STRINGS.split(',').map((value) => value.trim()).filter(Boolean) : [],
    defaultPresetTemperature: Number(source.DEFAULT_PRESET_TEMPERATURE ?? '0.7'),
    defaultPresetTopK: Number(source.DEFAULT_PRESET_TOP_K ?? '40'),
    defaultPresetTopP: Number(source.DEFAULT_PRESET_TOP_P ?? '0.9'),
    mediaRoot: source.MEDIA_ROOT ?? DEFAULT_MEDIA_ROOT,
    port: Number.isFinite(portValue) ? portValue : 3000,
    sessionSecret: source.SESSION_SECRET ?? DEFAULT_SESSION_SECRET,
    webOrigin: source.WEB_ORIGIN ?? DEFAULT_WEB_ORIGIN,
  };
}
