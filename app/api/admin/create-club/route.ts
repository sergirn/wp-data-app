import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Check if user is super admin
    const profile = await getCurrentProfile()
    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Error de configuración de Supabase" }, { status: 500 })
    }

    const body = await request.json()
    const { name, short_name, logo_url, primary_color, secondary_color } = body

    // Validate required fields
    if (!name || !short_name) {
      return NextResponse.json({ error: "Nombre y nombre corto son requeridos" }, { status: 400 })
    }

    // Create club
    const { data: club, error: clubError } = await supabase
      .from("clubs")
      .insert({
        name,
        short_name,
        logo_url: logo_url || null,
        primary_color: primary_color || "#1e40af",
        secondary_color: secondary_color || "#dc2626",
      })
      .select()
      .single()

    if (clubError) {
      console.error("Error creating club:", clubError)
      return NextResponse.json({ error: clubError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, club })
  } catch (error) {
    console.error("Error in create-club API:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
