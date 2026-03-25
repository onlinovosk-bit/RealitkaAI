export function isDbMode() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
}
