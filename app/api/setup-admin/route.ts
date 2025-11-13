import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    // Create a Supabase client with service role key for admin operations
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Check if admin already exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", "admin@waterpolostats.com")
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        alreadyExists: true,
      })
    }

    // Create the admin user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "admin@waterpolostats.com",
      password: "Admin123!",
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: "Super Admin",
      },
    })

    if (authError) {
      console.error("Auth error:", authError)
      return NextResponse.json(
        {
          success: false,
          error: authError.message,
        },
        { status: 500 },
      )
    }

    // Create the profile with super admin privileges
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: "admin@waterpolostats.com",
      full_name: "Super Admin",
      role: "admin",
      is_super_admin: true,
      club_id: null,
    })

    if (profileError) {
      console.error("Profile error:", profileError)
      return NextResponse.json(
        {
          success: false,
          error: profileError.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      email: "admin@waterpolostats.com",
    })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
