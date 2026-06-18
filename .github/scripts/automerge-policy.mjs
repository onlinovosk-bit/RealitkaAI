#!/usr/bin/env node
/**
 * Auto-merge policy executor v1.0 — see docs/AUTOMERGE-POLICY.md
 * Exit 0 = merged or skipped cleanly; exit 1 = blocked with message on stderr
 */

const POLICY_VERSION = "1.0";
const REQUIRED_CHECK = "Lint, test, build";
const TIER2_MIN_HOURS = 6;

const DENYLIST = [
  /^\.github\//,
  /(^|\/)vercel\.json$/,
  /^apps\/crm\/supabase\/migrations\//,
  /(^|\/)seat-pricing\.ts$/,
  /(^|\/)program-tier-pricing\.ts$/,
  /^apps\/crm\/middleware\.ts$/,
  /^apps\/crm\/src\/proxy\.ts$/,
  /^apps\/crm\/src\/lib\/credits-billing\.ts$/,
  /^apps\/crm\/src\/lib\/modules\//,
  /^apps\/crm\/src\/lib\/cadastre\//,
  /^apps\/crm\/src\/lib\/enrichment\//,
  /^apps\/crm\/src\/app\/api\/realsoft\//,
  /^apps\/crm\/src\/app\/api\/uc\//,
  /^apps\/crm\/src\/lib\/realsoft\//,
  /^apps\/crm\/src\/lib\/uc\//,
  /(^|\/)stripe\//,
  /stealth[-_]?(funnel|lead|recruiter|program)/i,
  /smolko/i,
];

const TIER1_PATTERNS = [
  /^docs\//,
  /^apps\/crm\/docs\//,
  /\.md$/,
  /(^|\/)tests\//,
  /^apps\/marketing\//,
];

function matchesAny(path, patterns) {
  return patterns.some((re) => re.test(path));
}

async function gh(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

async function ghPaginated(path, token) {
  const items = [];
  let url = `https://api.github.com${path}`;
  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${url}: ${res.status}`);
    items.push(...(await res.json()));
    const link = res.headers.get("link");
    url = null;
    if (link) {
      const next = link.split(",").find((p) => p.includes('rel="next"'));
      if (next) url = next.match(/<([^>]+)>/)?.[1] ?? null;
    }
  }
  return items;
}

async function postComment(token, owner, repo, pr, body) {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${pr}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ body }),
  });
}

async function removeLabel(token, owner, repo, pr, label) {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${pr}/labels/${encodeURIComponent(label)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
}

function classifyTier(files, patchText) {
  const deny = files.filter((f) => matchesAny(f, DENYLIST));
  if (deny.length) return { tier: 3, deny, reason: "denylist" };

  const nonTier1 = files.filter((f) => !matchesAny(f, TIER1_PATTERNS));
  if (nonTier1.length === 0) return { tier: 1, deny: [], reason: "allowlist-only" };

  const priceLeak = /(\d+\s*€|EUR\s*\d+|founderKancelarieRemaining|seat-pricing)/i.test(patchText);
  if (files.some((f) => f.startsWith("apps/marketing/")) && priceLeak) {
    return { tier: 3, deny: ["marketing-price-leak"], reason: "marketing-prices" };
  }

  const flagEvidence = /_ENABLED|default\s*:\s*false|default\s+OFF|ENABLED\s*=\s*false/i.test(patchText);
  if (nonTier1.every((f) => /\.(ts|tsx|js|jsx)$/.test(f)) && flagEvidence) {
    return { tier: 1, deny: [], reason: "flag-off-code" };
  }

  return { tier: 2, deny: [], reason: "feature-code" };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPOSITORY_OWNER;
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const prNumber = Number(process.env.PR_NUMBER);

  if (!token || !owner || !repo || !prNumber) {
    console.error("Missing GITHUB_TOKEN, GITHUB_REPOSITORY, or PR_NUMBER");
    process.exit(1);
  }

  const pr = await gh(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
  const labels = (pr.labels ?? []).map((l) => l.name);

  if (!labels.includes("automerge")) {
    console.log("Skip: no automerge label");
    return;
  }
  if (labels.includes("tier-3-andy")) {
    console.log("Skip: tier-3-andy — manual merge only");
    return;
  }
  if (labels.includes("hold")) {
    console.log("Skip: hold label present");
    return;
  }

  const files = await ghPaginated(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    token,
  );
  const paths = files.map((f) => f.filename);
  const patchText = files.map((f) => f.patch ?? "").join("\n");

  const { tier, deny, reason } = classifyTier(paths, patchText);

  if (tier === 3) {
    const msg = `**Auto-merge blocked (policy v${POLICY_VERSION})**\n\nTIER 3 — vyžaduje Andyho.\n\nDôvod: \`${reason}\`\n\nDenylist / block:\n${deny.map((d) => `- \`${d}\``).join("\n") || "- (see paths above)"}`;
    await postComment(token, owner, repo, prNumber, msg);
    await removeLabel(token, owner, repo, prNumber, "automerge");
    console.error("Tier 3 blocked:", deny);
    process.exit(1);
  }

  const checks = await gh(
    `/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs?per_page=100`,
    token,
  );
  const required = (checks.check_runs ?? []).find((c) => c.name === REQUIRED_CHECK);
  if (!required || required.conclusion !== "success") {
    console.log("Skip: required CI not green yet");
    return;
  }

  if (pr.mergeable_state !== "clean" && pr.mergeable_state !== "has_hooks") {
    console.log(`Skip: mergeable_state=${pr.mergeable_state}`);
    return;
  }

  if (tier === 2) {
    const ageH = (Date.now() - new Date(pr.created_at).getTime()) / 3_600_000;
    if (ageH < TIER2_MIN_HOURS) {
      console.log(`Skip: Tier 2 age ${ageH.toFixed(1)}h < ${TIER2_MIN_HOURS}h`);
      return;
    }
  }

  const mergeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        merge_method: "squash",
        commit_title: pr.title,
      }),
    },
  );

  if (!mergeRes.ok) {
    const err = await mergeRes.text();
    throw new Error(`Merge failed: ${mergeRes.status} ${err}`);
  }

  const comment = [
    `**Auto-merge executed (policy v${POLICY_VERSION})**`,
    "",
    `- Tier: **${tier}** (${reason})`,
    `- Paths (${paths.length}): ${paths.slice(0, 15).map((p) => `\`${p}\``).join(", ")}${paths.length > 15 ? "…" : ""}`,
    `- UTC: ${new Date().toISOString()}`,
  ].join("\n");
  await postComment(token, owner, repo, prNumber, comment);
  console.log(`Merged PR #${prNumber} tier ${tier}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
