import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { DB_ROLES, PERMISSION_GROUPS, isLegacyRole, getEffectiveRole } from "@/lib/role-config";

/**
 * POST /api/debug/fix-profiles
 * 
 * Admin utility to fix profile role issues:
 * 1. Convert legacy roles to active roles
 * 2. Fix missing profiles for authenticated users
 * 3. Ensure consistent role assignments
 * 
 * Body: { "action": "fix-legacy" | "fix-missing" | "list-issues" }
 */
export async function POST(request: Request) {
  try {
    // Only allow authenticated users (you can add admin check here)
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action || "list-issues";

    const supabase = createServiceRoleClient();

    if (action === "list-issues") {
      return await listProfileIssues(supabase);
    } else if (action === "fix-legacy") {
      return await fixLegacyRoles(supabase);
    } else if (action === "fix-missing") {
      return await fixMissingProfiles(supabase);
    } else {
      return NextResponse.json({
        error: "Invalid action. Use: list-issues, fix-legacy, or fix-missing"
      }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

async function listProfileIssues(supabase: any) {
  // Get all profiles
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  // Analyze issues
  const issues = {
    legacyRoles: [] as any[],
    missingAuthUserId: [] as any[],
    invalidRoles: [] as any[],
    inactiveProfiles: [] as any[],
    totalProfiles: profiles?.length || 0,
  };

  type ProfileIssueRow = {
    id: string;
    email: string | null;
    role: string;
    auth_user_id: string | null;
    is_active: boolean;
  };

  profiles?.forEach((profile: ProfileIssueRow) => {
    // Check for legacy roles
    if (isLegacyRole(profile.role)) {
      issues.legacyRoles.push({
        id: profile.id,
        email: profile.email,
        currentRole: profile.role,
        suggestedRole: getEffectiveRole(profile.role),
      });
    }

    // Check for missing auth_user_id
    if (!profile.auth_user_id) {
      issues.missingAuthUserId.push({
        id: profile.id,
        email: profile.email,
        role: profile.role,
      });
    }

    // Check for invalid roles
    const validRoles = PERMISSION_GROUPS.ALL_ROLES.map(r => r.toLowerCase());
    if (profile.role && !validRoles.includes(profile.role.toLowerCase())) {
      issues.invalidRoles.push({
        id: profile.id,
        email: profile.email,
        invalidRole: profile.role,
      });
    }

    // Check for inactive profiles
    if (!profile.is_active) {
      issues.inactiveProfiles.push({
        id: profile.id,
        email: profile.email,
        role: profile.role,
      });
    }
  });

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    issues,
    recommendations: {
      shouldFixLegacy: issues.legacyRoles.length > 0,
      shouldFixMissing: issues.missingAuthUserId.length > 0,
      shouldInvestigate: issues.invalidRoles.length > 0,
    }
  });
}

async function fixLegacyRoles(supabase: any) {
  const { data: legacyProfiles } = await supabase
    .from("profiles")
    .select("id, email, role")
    .in("role", [DB_ROLES.FOUNDER, DB_ROLES.ADMIN, DB_ROLES.SENIOR]);

  if (!legacyProfiles?.length) {
    return NextResponse.json({
      message: "No legacy roles found",
      fixed: 0
    });
  }

  const updates = legacyProfiles.map((profile: { id: string; email: string | null; role: string }) => ({
    id: profile.id,
    role: getEffectiveRole(profile.role), // Convert to active role
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("profiles")
    .upsert(updates, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to update profiles: ${error.message}`);
  }

  return NextResponse.json({
    message: "Legacy roles fixed successfully",
    fixed: updates.length,
    updates: updates.map((u: (typeof updates)[number]) => ({
      id: u.id,
      newRole: u.role
    }))
  });
}

async function fixMissingProfiles(supabase: any) {
  // This would require more complex logic to match auth users with profiles
  // For now, just return info about profiles missing auth_user_id
  const { data: orphanProfiles } = await supabase
    .from("profiles")
    .select("id, email, role")
    .is("auth_user_id", null);

  return NextResponse.json({
    message: "Profiles missing auth_user_id (manual fix required)",
    count: orphanProfiles?.length || 0,
    profiles: orphanProfiles?.slice(0, 10) || [], // First 10 for review
    note: "These profiles need manual review to link with auth users"
  });
}