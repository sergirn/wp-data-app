import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Error de configuración" }, { status: 500 })
    }

    // Check if the current user is a super admin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Get the request body
    const body = await request.json()
    const { email, password, fullName, role, clubId, isSuperAdmin } = body

    // Create the user using Supabase Admin API
    // Note: This requires the service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key no configurado" }, { status: 500 })
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json({ error: "Supabase URL no configurado" }, { status: 500 })
    }

    // Create user via Supabase Admin API
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || email,
          role,
        },
      }),
    })

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json()
      throw new Error(errorData.message || "Error al crear usuario en Supabase Auth")
    }

    const newUser = await createUserResponse.json()

    // Update the profile with club_id and is_super_admin
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        club_id: isSuperAdmin ? null : clubId,
        is_super_admin: isSuperAdmin,
        role,
        full_name: fullName || email,
      })
      .eq("id", newUser.id)

    if (profileError) {
      console.error("Error updating profile:", profileError)
      // Don't fail the request, the user was created
    }

    return NextResponse.json({ success: true, user: newUser })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear usuario" },
      { status: 500 },
    )
  }
}
