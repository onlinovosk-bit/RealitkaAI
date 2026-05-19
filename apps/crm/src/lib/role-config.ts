/**
 * Centralized role configuration for REVOLIS.AI
 * 
 * This file defines all valid roles and their permissions
 * to ensure consistency across the application.
 */

// Valid database roles (stored in profiles table)
export const DB_ROLES = {
  OWNER: "owner",
  MANAGER: "manager", 
  AGENT: "agent",
  // Legacy roles (to be cleaned up)
  FOUNDER: "founder",
  ADMIN: "admin",
  SENIOR: "senior",
} as const;

export type DbRole = typeof DB_ROLES[keyof typeof DB_ROLES];

// UI role mappings (for display purposes)
export const ROLE_LABELS: Record<DbRole, string> = {
  owner: "Majiteľ kancelárie",
  manager: "Office Manager", 
  agent: "Realitný maklér",
  founder: "Founder (Legacy)",
  admin: "Admin (Legacy)",
  senior: "Senior maklér",
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<DbRole, string> = {
  owner: "Plný prístup - fakturácia, tím, nastavenia, všetky dáta",
  manager: "Manažérsky prístup - rovnaký ako owner (DB mapping)",
  agent: "Základný prístup - vlastné leady a aktivity", 
  founder: "Legacy founder role - needs cleanup",
  admin: "Legacy admin role - needs cleanup",
  senior: "Rozšírený prístup - vlastné leady + tímové štatistiky",
};

// Permission groups for different features
export const PERMISSION_GROUPS = {
  // Full administrative access
  FULL_ADMIN: [DB_ROLES.OWNER, DB_ROLES.MANAGER, DB_ROLES.FOUNDER] as DbRole[],
  
  // Standard team members
  TEAM_ACCESS: [DB_ROLES.OWNER, DB_ROLES.MANAGER, DB_ROLES.AGENT] as DbRole[],
  
  // Advanced features (integrations, billing)
  ADVANCED_FEATURES: [DB_ROLES.OWNER, DB_ROLES.MANAGER] as DbRole[],
  
  // All valid roles (including legacy)
  ALL_ROLES: [
    DB_ROLES.OWNER, 
    DB_ROLES.MANAGER, 
    DB_ROLES.AGENT, 
    DB_ROLES.FOUNDER, 
    DB_ROLES.ADMIN, 
    DB_ROLES.SENIOR
  ] as DbRole[],
  
  // Active roles (exclude legacy)
  ACTIVE_ROLES: [DB_ROLES.OWNER, DB_ROLES.MANAGER, DB_ROLES.AGENT] as DbRole[],
};

// Feature-specific permissions
export const FEATURE_PERMISSIONS = {
  INTEGRATIONS: PERMISSION_GROUPS.ADVANCED_FEATURES,
  TEAM_MANAGEMENT: PERMISSION_GROUPS.TEAM_ACCESS,
  SETTINGS: PERMISSION_GROUPS.TEAM_ACCESS,
  BILLING: PERMISSION_GROUPS.ADVANCED_FEATURES,
  FORECASTING: PERMISSION_GROUPS.ALL_ROLES, // Includes legacy roles for backward compatibility
  COMMUNICATION: PERMISSION_GROUPS.TEAM_ACCESS,
  OUTREACH: PERMISSION_GROUPS.TEAM_ACCESS,
  SCORING: PERMISSION_GROUPS.TEAM_ACCESS,
  ACTIVITIES: PERMISSION_GROUPS.TEAM_ACCESS,
} as const;

/**
 * Normalizes role for comparison (lowercase, trimmed)
 */
export function normalizeRole(role: string | null | undefined): string {
  return (role ?? DB_ROLES.AGENT).trim().toLowerCase();
}

/**
 * Checks if a role has permission for a specific feature
 */
export function hasPermission(userRole: string | null | undefined, feature: keyof typeof FEATURE_PERMISSIONS): boolean {
  const normalized = normalizeRole(userRole);
  const allowedRoles = FEATURE_PERMISSIONS[feature].map(role => role.toLowerCase());
  return allowedRoles.includes(normalized);
}

/**
 * Gets the effective role (applies fallback logic)
 */
export function getEffectiveRole(role: string | null | undefined): DbRole {
  const normalized = normalizeRole(role);
  
  // Check if it's a valid role
  const validRoles = PERMISSION_GROUPS.ALL_ROLES.map(r => r.toLowerCase());
  if (validRoles.includes(normalized)) {
    return normalized as DbRole;
  }
  
  // Fallback to agent
  return DB_ROLES.AGENT;
}

/**
 * Checks if role is legacy (needs cleanup)
 */
export function isLegacyRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return [DB_ROLES.FOUNDER, DB_ROLES.ADMIN, DB_ROLES.SENIOR].map(r => r.toLowerCase()).includes(normalized);
}

// Role migration mappings (for onboarding/updates)
export const ROLE_MIGRATIONS = {
  // UI choice -> DB role
  "owner": DB_ROLES.MANAGER, // Owner choice maps to manager in DB
  "manager": DB_ROLES.MANAGER,
  "agent": DB_ROLES.AGENT,
} as const;