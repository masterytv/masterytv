import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";
import { Topbar } from "@/components/dashboard/topbar";
// The ad-* styling kit for EVERY admin page. Import it here (not per-page):
// when only some leaf pages imported it, the others (e.g. /admin/beta) rendered
// unstyled unless you'd visited an importing page first in the same session.
import "./admin.css";

export const metadata = { title: "Admin — Mastery" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/decoded");

  const { data: profile } = await supabase
    .from("users")
    .select("role, email, name")
    .eq("id", authUser.id)
    .single();

  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--color-surface-0)" }}>
      <AdminNav role={profile.role as "admin" | "superadmin"} email={profile.email} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar userName={profile.name} userRole={profile.role} />
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
