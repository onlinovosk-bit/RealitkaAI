import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/debug/auth-status
 * Debugging endpoint pre auth & role troubleshooting
 * Shows current user, profile, and role information
 */
export async function GET() {
  try {
    // Get current user
    const user = await getCurrentUser();
    const profile = await getCurrentProfile();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        error: "No authenticated user"
      });
    }

    // Get additional profile data from database
    const supabase = await createClient();
    const { data: dbProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    // Get all profiles for comparison (limit to basic info for security)
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, is_active")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      authenticated: true,
      timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        role: user.role, // Supabase auth role
      },
      profile: profile ? {
        id: profile.id,
        role: profile.role, // Database role
        full_name: profile.full_name,
        email: profile.email,
        agency_id: profile.agency_id,
        team_id: profile.team_id,
        is_active: profile.is_active,
      } : null,
      dbProfile: dbProfile ? {
        id: dbProfile.id,
        role: dbProfile.role,
        email: dbProfile.email,
        full_name: dbProfile.full_name,
        auth_user_id: dbProfile.auth_user_id,
        is_active: dbProfile.is_active,
      } : null,
      profileError: profileError?.message,
      debug: {
        profileFound: !!profile,
        dbProfileFound: !!dbProfile,
        emailMatch: user.email === profile?.email,
        authUserIdSet: !!dbProfile?.auth_user_id,
        roleFromProfile: profile?.role || "MISSING",
        totalProfiles: allProfiles?.length || 0,
      },
      allProfiles: allProfiles?.slice(0, 10) || [], // First 10 for overview
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    return NextResponse.json({
      authenticated: false,
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