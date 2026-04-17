#!/usr/bin/env node
/**
 * Overí, že TEST_USER_EMAIL / TEST_USER_PASSWORD fungujú proti projektu v NEXT_PUBLIC_SUPABASE_URL
 * (rovnaký flow ako login v aplikácii — anon kľúč + signInWithPassword).
 *
 * Spustenie z apps/crm: npm run verify:e2e-user
 * Exit 0 = OK, 1 = chyba alebo chýbajúce ENV.
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

function exitCode(code) {
  setImmediate(() => process.exit(code));
}

if (!url || !key) {
  console.error("Chýba NEXT_PUBLIC_SUPABASE_URL alebo NEXT_PUBLIC_SUPABASE_ANON_KEY (v apps/crm/.env.local).");
  exitCode(1);
} else if (!email || !password) {
  console.error("Chýba TEST_USER_EMAIL alebo TEST_USER_PASSWORD (v apps/crm/.env.local).");
  exitCode(1);
} else {
  const supabase = createClient(url, key);

  supabase.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
    if (error) {
      console.error("Prihlásenie zlyhalo:", error.message);
      console.error(
        "\nSkontroluj v Supabase Dashboard → Authentication → Users, či používateľ existuje a heslo sedí.\n" +
          "Ak je zapnuté „Confirm email“, používateľ musí mať email confirmed alebo v dev vypni potvrdenie.",
      );
      exitCode(1);
      return;
    }
    console.log("OK: prihlásenie prebehlo pre", data.user?.email ?? email);
    exitCode(0);
  });
}
