import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();

  // Verify caller is superadmin
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: caller } = await supabase
    .from("users")
    .select("role")
    .eq("id", authUser.id)
    .single();

  if (caller?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden — superadmin only" }, { status: 403 });
  }

  const { userId, newRole } = await req.json();

  if (!userId || !newRole) {
    return NextResponse.json({ error: "userId and newRole required" }, { status: 400 });
  }

  if (!["user", "admin"].includes(newRole)) {
    return NextResponse.json({ error: "Role must be 'user' or 'admin'" }, { status: 400 });
  }

  // Fetch target user to prevent changing another superadmin
  const serviceClient = createServiceClient();
  const { data: target } = await serviceClient
    .from("users")
    .select("role, email")
    .eq("id", userId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.role === "superadmin") {
    return NextResponse.json({ error: "Cannot change a superadmin's role" }, { status: 403 });
  }

  const { error } = await serviceClient
    .from("users")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, email: target.email, role: newRole });
}
