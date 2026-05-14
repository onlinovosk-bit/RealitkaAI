import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { hasPermission, FEATURE_PERMISSIONS } from "@/lib/role-config";

/**
 * GET /api/debug/test-auth
 * 
 * Quick auth test endpoint to verify everything works
 * Tests auth flow and permission checking for current user
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "Not authenticated",
        redirect: "/login"
      });
    }

    // Test permissions for all features
    const permissions = Object.keys(FEATURE_PERMISSIONS).reduce((acc, feature) => {
      acc[feature] = hasPermission(profile?.role, feature as keyof typeof FEATURE_PERMISSIONS);
      return acc;
    }, {} as Record<string, boolean>);

    // Count accessible features
    const accessibleFeatures = Object.values(permissions).filter(Boolean).length;
    const totalFeatures = Object.keys(permissions).length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile ? {
        id: profile.id,
        role: profile.role,
        full_name: profile.full_name,
        is_active: profile.is_active,
        agency_id: profile.agency_id,
        team_id: profile.team_id,
      } : null,
      permissions,
      summary: {
        accessibleFeatures,
        totalFeatures,
        accessPercentage: Math.round((accessibleFeatures / totalFeatures) * 100),
        profileExists: !!profile,
        roleAssigned: !!profile?.role,
      },
      recommendations: profile ? [] : [
        "Profile missing - check profile creation in onboarding",
        "May need to run /api/debug/fix-profiles with action=fix-missing"
      ]
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
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