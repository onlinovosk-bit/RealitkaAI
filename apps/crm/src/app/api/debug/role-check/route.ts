import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";

/**
 * GET /api/debug/role-check?role=owner
 * POST /api/debug/role-check with { "roles": ["owner", "manager"] }
 * 
 * Debugging endpoint to test role permissions
 * Tests whether current user has specified role(s)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const testRole = searchParams.get("role");
  
  if (!testRole) {
    return NextResponse.json({
      error: "Missing 'role' query parameter. Usage: /api/debug/role-check?role=owner"
    }, { status: 400 });
  }

  return checkRole([testRole]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const roles = body.roles;
    
    if (!Array.isArray(roles)) {
      return NextResponse.json({
        error: "Body must contain 'roles' array. Example: {\"roles\": [\"owner\", \"manager\"]}"
      }, { status: 400 });
    }

    return checkRole(roles);
  } catch (error) {
    return NextResponse.json({
      error: "Invalid JSON body"
    }, { status: 400 });
  }
}

async function checkRole(allowedRoles: string[]) {
  try {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();

    if (!user) {
      return NextResponse.json({
        hasPermission: false,
        reason: "Not authenticated",
        user: null,
        profile: null,
        allowedRoles,
        currentRole: null,
      });
    }

    const currentRole = (profile?.role ?? "agent").trim().toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map((role) => role.trim().toLowerCase());
    const hasPermission = normalizedAllowedRoles.includes(currentRole);

    return NextResponse.json({
      hasPermission,
      reason: hasPermission 
        ? `Role '${currentRole}' is allowed` 
        : `Role '${currentRole}' not in allowed roles: [${normalizedAllowedRoles.join(', ')}]`,
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile ? {
        id: profile.id,
        role: profile.role,
        full_name: profile.full_name,
        email: profile.email,
      } : null,
      allowedRoles,
      normalizedAllowedRoles,
      currentRole,
      fallbackApplied: !profile, // Shows if "agent" fallback was used
      roleDefinitions: {
        owner: "Full access - billing, team, settings, all data",
        manager: "Manager access - same as owner (DB mapping)",  
        agent: "Basic access - own leads and activities",
        senior: "Extended access - own leads + team stats",
        founder: "Legacy role (may need cleanup)",
        admin: "Legacy role (may need cleanup)",
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    return NextResponse.json({
      hasPermission: false,
      reason: "Error checking permissions",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  }
}