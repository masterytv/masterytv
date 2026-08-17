/**
 * The consent read — INTEGRATION_SPRINT.md §3 / I5.5.
 *
 * Deliberately the smallest thing that can answer the only question the server
 * side ever asks: does this person have a live consent for this program.
 *
 * 🔑 IT KNOWS NOTHING ABOUT VERSIONS OR COPY, and that is what keeps it from
 * becoming a lockstep twin of a `src/lib` module (ORIENT §7's duplication tax).
 * The screen owns the version string and the disclosures because the screen is
 * what shows them; the row records which version was shown; this asks only
 * whether a row exists. When a revision eventually needs everybody to re-accept,
 * the rows say exactly who to re-prompt, and that read belongs to whatever
 * decides to do the re-prompting.
 *
 * ─── WHY IT FAILS CLOSED ──────────────────────────────────────────────────
 *
 * Every other control in this vertical fails OPEN, on purpose: an auditor that
 * can 500 the coach is worse than the drafts it catches. This one is the other
 * way round, because what it gates is not the quality of a reply but whether
 * this product may keep what somebody said. If the read fails, the answer is no,
 * and the cost is that a turn writes no memory — recoverable. The cost of
 * guessing yes is a stored fact about somebody who never agreed to be
 * remembered, which is not.
 */

/**
 * The minimum surface of the supabase client this needs, typed structurally so
 * the module stays importable by a plain Node gate script as well as by Deno.
 */
interface ConsentQuery {
  eq(column: string, value: string): ConsentQuery;
  is(column: string, value: null): ConsentQuery;
  limit(n: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}
interface ConsentReader {
  from(table: string): { select(columns: string): ConsentQuery };
}

export async function hasLiveConsent(
  supabase: unknown,
  userId: string,
  program: string | null,
): Promise<boolean> {
  // A null program is the executive default, which has no consent surface and
  // never had one. Gating it here would break three shipped verticals.
  if (!program) return true;

  try {
    const { data, error } = await (supabase as ConsentReader)
      .from("coaching_consents")
      .select("id")
      .eq("user_id", userId)
      .eq("program", program)
      .is("revoked_at", null)
      .limit(1);

    if (error) {
      console.warn(`[consent] read failed, treating as NOT consented: ${error.message}`);
      return false;
    }
    return (data?.length ?? 0) > 0;
  } catch (e) {
    console.warn(`[consent] read threw, treating as NOT consented: ${(e as Error).message}`);
    return false;
  }
}
