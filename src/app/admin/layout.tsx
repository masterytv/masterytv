import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "./AdminNav";

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
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-surface-0)" }}>
      <AdminNav role={profile.role as "admin" | "superadmin"} email={profile.email} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
}
