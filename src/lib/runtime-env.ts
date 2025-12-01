const SERVER_ENV_KEYS = ["SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "OPENROUTER_API_KEY"] as const;
type ServerEnvKey = (typeof SERVER_ENV_KEYS)[number];
export type RuntimeEnvBindings = Partial<Record<ServerEnvKey, string>>;
export type RuntimeEnvSource = Record<string, unknown> | RuntimeEnvBindings | undefined;

declare global {
  // eslint-disable-next-line no-var
  var __APP_RUNTIME_ENV__: RuntimeEnvBindings | undefined;
}

const hasAnyValue = (env: RuntimeEnvBindings) =>
  SERVER_ENV_KEYS.some((key) => typeof env[key] === "string" && env[key]?.length);

const extractRuntimeEnv = (source?: RuntimeEnvSource): RuntimeEnvBindings => {
  if (!source) {
    return {};
  }

  const record = source as Record<string, unknown>;
  return SERVER_ENV_KEYS.reduce<RuntimeEnvBindings>((acc, key) => {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const storeRuntimeEnv = (env: RuntimeEnvBindings): RuntimeEnvBindings => {
  if (!globalThis.__APP_RUNTIME_ENV__) {
    globalThis.__APP_RUNTIME_ENV__ = {};
  }

  const runtimeEnv = globalThis.__APP_RUNTIME_ENV__ as RuntimeEnvBindings;

  for (const key of SERVER_ENV_KEYS) {
    if (env[key]) {
      runtimeEnv[key] = env[key];
    }
  }

  return runtimeEnv;
};

export const resolveRuntimeEnv = (env?: RuntimeEnvSource): RuntimeEnvBindings => {
  const extracted = extractRuntimeEnv(env);
  if (hasAnyValue(extracted)) {
    return storeRuntimeEnv(extracted);
  }

  if (globalThis.__APP_RUNTIME_ENV__) {
    return globalThis.__APP_RUNTIME_ENV__;
  }

  let fromImportMeta: RuntimeEnvBindings = {};
  try {
    fromImportMeta = extractRuntimeEnv(import.meta.env as Record<string, unknown>);
  } catch {
    fromImportMeta = {};
  }

  if (hasAnyValue(fromImportMeta)) {
    return storeRuntimeEnv(fromImportMeta);
  }

  return {};
};

export const requireEnvVar = (key: ServerEnvKey, env: RuntimeEnvBindings, context?: string): string => {
  const value = env[key];
  if (!value || typeof value !== "string") {
    const suffix = context ? ` for ${context}` : "";
    throw new Error(`${key} is required${suffix}.`);
  }
  return value;
};
