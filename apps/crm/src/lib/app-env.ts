export function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Chýba env premenná: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string) {
  return process.env[name] ?? null;
}

export function getEnvironmentHealth() {
  const checks = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase URL",
      required: true,
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      label: "Supabase publishable key",
      required: false,
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      label: "Supabase anon key",
      required: false,
      present: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
    {
      key: "OPENAI_API_KEY",
      label: "OpenAI API key",
      required: false,
      present: Boolean(process.env.OPENAI_API_KEY),
    },
  ];

  const requiredOk = checks
    .filter((item) => item.required)
    .every((item) => item.present);

  return {
    checks,
    requiredOk,
    mode: requiredOk ? "connected" : "fallback",
  };
}
