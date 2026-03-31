import { redirect } from "next/navigation";

/**
 * Dashboard index — redirects to chat (primary interaction)
 */
export default function DashboardPage() {
  redirect("/dashboard/chat");
}
