import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getBetaFunnel } from "./funnel";
import BetaCockpit from "./BetaCockpit";

export const metadata = { title: "Beta Cockpit — Admin" };
// Always reconstruct the funnel fresh — this is a live operations view.
export const dynamic = "force-dynamic";

export default async function BetaPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // The /admin layout already gates this to admin/superadmin. We additionally
  // need the service role here because the funnel spans cross-user tables.
  if (!url || !key) {
    return (
      <div className="ad-content">
        <div className="ad-content__inner">
          <h1 className="ad-page-title">Beta Cockpit</h1>
          <p style={{ color: "var(--text-hint)" }}>
            Server not configured — missing Supabase service-role key.
          </p>
        </div>
      </div>
    );
  }

  const admin = createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { testers, metrics, codes } = await getBetaFunnel(admin);

  return <BetaCockpit testers={testers} metrics={metrics} codes={codes} />;
}
