import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildConsentRow, INTEGRATION_CONSENT_VERSION } from "@/lib/platform/integration-consent";

/**
 * POST /api/integration/consent — I5.5.
 *
 * Writes the consent record that gates every derived memory in this vertical
 * and the second turn of every conversation in it.
 *
 * 🔑 THE VERSION AND THE PROGRAM ARE STAMPED SERVER-SIDE, never taken from the
 * body. A consent row is a claim about what somebody was shown; a client that
 * can choose the version can claim they agreed to a document they never saw.
 * The only thing the request carries is the age attestation, and that is
 * refused rather than defaulted when it is absent.
 *
 * The row is append-only by schema (no update or delete policy for the user),
 * so a second POST for the same version is idempotent rather than an edit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: { ageAttested?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is a missing attestation, which is handled below.
  }

  // The 18+ gate. Explicit true only: undefined, "true", 1 and null are all
  // somebody not having answered.
  if (body.ageAttested !== true) {
    return NextResponse.json(
      { error: "AGE_ATTESTATION_REQUIRED", message: "The 18+ attestation is required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("coaching_consents")
    .upsert(buildConsentRow(user.id), { onConflict: "user_id,program,version" });

  if (error) {
    console.error("[integration/consent] insert failed:", error.message);
    return NextResponse.json({ error: "WRITE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, version: INTEGRATION_CONSENT_VERSION });
}
