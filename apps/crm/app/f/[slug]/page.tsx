"use server";
import React from "react";

export default function LeadFormPage({ params }: { params: { slug: string } }) {
  const slug = params.slug || "";
  const tokenEnv = `LEAD_FORM_TOKEN_${slug.toUpperCase()}`;
  const token = process.env[tokenEnv] || "";

  if (!token) {
    return (
      <div>
        <h1>Form unavailable</h1>
        <p>This lead form is not configured.</p>
      </div>
    );
  }

  return (
    <html>
      <body>
        <h1>Contact</h1>
        <form method="post" action="/api/leads/inbound">
          <input type="hidden" name="token" value={token} />
          <label>Name: <input name="name" required /></label>
          <label>Email: <input name="email" type="email" required /></label>
          <label style={{ display: 'none' }}>HP<input name="hp" /></label>
          <label>Consent: <input name="consent" type="checkbox" value="true" required /></label>
          <input type="hidden" name="source" value="web_form" />
          <button type="submit">Submit</button>
        </form>
      </body>
    </html>
  );
}
