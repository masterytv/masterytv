"use client";

/**
 * The I1.5 bench — INTEGRATION_SPRINT.md §3 / I1.5.
 *
 * A person writes what happened to them, and this hands back other people's
 * accounts of the same thing, in those people's own words. Sprint 0 exists to
 * put that in front of 5 to 10 real experiencers and ask one question: did it
 * land as "I am not alone" or as "you are studying me".
 *
 * Retrieval only. No model writes anything on this page: the sole model call is
 * an embedding, and every word displayed comes out of the corpus under the
 * provenance contract. Nothing typed here is stored anywhere.
 *
 * The founder drives the session. Self-serve access needs the consent screen
 * (I5.5), the 18+ gate and the state blocklist (I11.2 and I11.3) first.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Claim {
  index: number;
  text: string;
}

interface ClaimMatch {
  claim_index: number;
  distinct_accounts: number;
  best_similarity: number | null;
}

interface RevealAccount {
  source: { video_id: string; video_title: string | null; video_url: string | null };
  similarity: number;
  matched_claim: number;
  excerpt_scope: "chunk" | "sentences";
  excerpt: { text: string; provenance: string };
}

interface DomainDirection {
  code: string;
  name: string;
  up: number;
  down: number;
  mixed: number;
  shifted: number;
  other: number;
}

interface Reveal {
  matched_count: number;
  excluded_non_english: number;
  took_ms: number;
  claims: Claim[];
  claim_matches: ClaimMatch[];
  accounts: RevealAccount[];
  domain_directions: DomainDirection[];
  accounts_with_transformation: number;
  corpus_analysis: { video_id: string; notes: string }[] | null;
}

const PLACEHOLDER =
  "What happened? Take as long as you want. Nothing here is graded, and nobody is going to tell you what it was.";

export default function IntegrationBenchPage() {
  const [account, setAccount] = useState("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function findCompany() {
    if (!account.trim() || loading) return;
    setLoading(true);
    setError(null);
    setReveal(null);

    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke("integration-reveal", {
      body: { account: account.trim() },
    });

    if (fnError) {
      // The function's own message lives in the error body, not in fnError.message.
      let detail = fnError.message;
      const context = (fnError as { context?: Response }).context;
      if (context) {
        const body = await context.json().catch(() => null);
        if (body?.error) detail = body.error;
      }
      setError(detail);
    } else if (data?.error) {
      setError(data.error);
    } else {
      setReveal(data as Reveal);
    }
    setLoading(false);
  }

  const claimsWithMatches = reveal
    ? reveal.claims.filter((c) => reveal.accounts.some((a) => a.matched_claim === c.index))
    : [];

  return (
    <div className="ad-content">
      <div className="ad-content__inner">
        <h1 className="ad-page-title">The Company</h1>

        <p style={{ ...styles.note, marginTop: "-1rem", marginBottom: "1.75rem" }}>
          Paste an account and it returns matched excerpts from the Project Profound corpus,
          grouped by the part of the account each one answers. Retrieval only, so nothing here is
          written by a model. Nothing typed on this page is stored.
        </p>

        <textarea
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={10}
          style={styles.textarea}
        />

        <div style={styles.actions}>
          <button
            onClick={findCompany}
            disabled={loading || !account.trim()}
            style={{
              ...styles.button,
              opacity: loading || !account.trim() ? 0.5 : 1,
              cursor: loading || !account.trim() ? "default" : "pointer",
            }}
          >
            {loading ? "Searching the corpus" : "Find the company"}
          </button>
          <span style={styles.note}>{account.trim().length} characters</span>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {reveal && (
          <div style={{ marginTop: "3rem" }}>
            <div style={styles.stats}>
              <Stat label="Accounts found" value={`${reveal.matched_count}`} hint="a floor, never a total" />
              <Stat label="Claims" value={`${reveal.claims.length}`} hint={`${claimsWithMatches.length} answered`} />
              <Stat label="Non-English dropped" value={`${reveal.excluded_non_english}`} hint="before ranking" />
              <Stat label="Time" value={`${reveal.took_ms}ms`} hint="embed, match, analyse" />
            </div>

            {claimsWithMatches.map((claim) => (
              <section key={claim.index} style={styles.claimBlock}>
                <p style={styles.claimLabel}>Matched on what you said here</p>
                <blockquote style={styles.claimText}>{claim.text.replace(/\s+/g, " ").trim()}</blockquote>

                {reveal.accounts
                  .filter((a) => a.matched_claim === claim.index)
                  .map((a) => (
                    <article key={a.source.video_id} style={styles.excerptCard}>
                      <p style={styles.excerptText}>{a.excerpt.text}</p>
                      <p style={styles.attribution}>
                        {a.source.video_url ? (
                          <a href={a.source.video_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                            {a.source.video_title ?? a.source.video_id}
                          </a>
                        ) : (
                          (a.source.video_title ?? a.source.video_id)
                        )}
                        <span style={styles.meta}>
                          {" "}
                          {a.similarity.toFixed(3)}
                          {a.excerpt_scope === "chunk" ? " · raw chunk, may start mid-word" : ""}
                        </span>
                      </p>
                    </article>
                  ))}
              </section>
            ))}

            {reveal.domain_directions.length > 0 && (
              <section style={styles.claimBlock}>
                <p style={styles.claimLabel}>
                  What happened next, across {reveal.accounts_with_transformation} of{" "}
                  {reveal.accounts.length} accounts
                </p>
                <div style={styles.domains}>
                  {reveal.domain_directions.map((d) => (
                    <div key={d.code} style={styles.domainRow}>
                      <span style={styles.domainName}>{d.name}</span>
                      <span style={styles.meta}>
                        {[
                          d.up && `${d.up} up`,
                          d.down && `${d.down} down`,
                          d.mixed && `${d.mixed} mixed`,
                          d.shifted && `${d.shifted} shifted`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ ...styles.note, marginTop: "0.75rem" }}>
                  Directions are the corpus authors&apos; own, and they read backwards out of
                  context. Attitude Toward Death going down means the fear of it fell.
                </p>
              </section>
            )}

            <p style={styles.noProof}>
              This does not tell us what caused it. It does tell you that you are not an outlier and
              you are not making it up.
            </p>

            {reveal.corpus_analysis && reveal.corpus_analysis.length > 0 && (
              <section style={styles.founderBlock}>
                <p style={styles.claimLabel}>Founder only. Do not show this to a tester.</p>
                <p style={styles.note}>
                  Project Profound&apos;s analyst notes on the matched accounts. Nobody but the
                  founder receives these, on either this page or the coach.
                </p>
                {reveal.corpus_analysis.map((n) => (
                  <p key={n.video_id} style={styles.analystNote}>
                    <span style={styles.meta}>{n.video_id}</span> {n.notes}
                  </p>
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
      <span style={styles.statHint}>{hint}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  note: {
    fontSize: "0.8rem",
    color: "var(--text-hint)",
    lineHeight: 1.6,
    maxWidth: "62ch",
  },
  textarea: {
    width: "100%",
    maxWidth: "780px",
    padding: "1rem 1.1rem",
    background: "var(--color-surface-100)",
    border: "1px solid var(--color-surface-200)",
    borderRadius: "0.75rem",
    color: "var(--text-heading)",
    fontSize: "0.95rem",
    lineHeight: 1.7,
    fontFamily: "inherit",
    resize: "vertical",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginTop: "1rem",
  },
  button: {
    padding: "0.7rem 1.4rem",
    background: "var(--color-primary-container)",
    border: "none",
    borderRadius: "0.75rem",
    // White on primary-container, per BRAND §8.1's Primary Action row and the
    // existing dashboard/onboarding buttons. Not a brand-identity color, so the
    // token rule does not reach it, and there is no token for it to use.
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  error: {
    marginTop: "1.25rem",
    padding: "0.9rem 1.1rem",
    borderRadius: "0.75rem",
    background: "color-mix(in oklch, var(--color-danger) 12%, transparent)",
    color: "var(--color-danger)",
    fontSize: "0.85rem",
    maxWidth: "780px",
  },
  stats: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2.5rem",
    paddingBottom: "2rem",
  },
  stat: { display: "flex", flexDirection: "column", gap: "0.2rem" },
  statLabel: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-hint)",
  },
  statValue: {
    fontFamily: "var(--font-display)",
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "var(--text-heading)",
  },
  statHint: { fontSize: "0.7rem", color: "var(--text-hint)" },
  claimBlock: { marginBottom: "3rem", maxWidth: "780px" },
  claimLabel: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "var(--text-hint)",
    marginBottom: "0.6rem",
  },
  claimText: {
    margin: "0 0 1.5rem 0",
    paddingLeft: "1rem",
    borderLeft: "2px solid var(--color-primary)",
    fontFamily: "var(--font-display)",
    fontSize: "1.1rem",
    lineHeight: 1.5,
    color: "var(--text-heading)",
  },
  excerptCard: {
    background: "var(--color-surface-50)",
    borderRadius: "1rem",
    padding: "1.4rem 1.5rem",
    marginBottom: "1rem",
  },
  excerptText: {
    margin: 0,
    fontSize: "0.95rem",
    lineHeight: 1.75,
    color: "var(--text-body)",
  },
  attribution: { margin: "0.9rem 0 0 0", fontSize: "0.75rem", color: "var(--text-hint)" },
  link: { color: "var(--color-primary)", textDecoration: "none" },
  meta: { color: "var(--text-hint)", fontSize: "0.72rem" },
  domains: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  domainRow: { display: "flex", justifyContent: "space-between", gap: "2rem" },
  domainName: { fontSize: "0.85rem", color: "var(--text-body)" },
  noProof: {
    maxWidth: "780px",
    marginTop: "1rem",
    fontSize: "0.9rem",
    lineHeight: 1.7,
    color: "var(--text-body)",
  },
  founderBlock: {
    marginTop: "3rem",
    maxWidth: "780px",
    padding: "1.4rem 1.5rem",
    borderRadius: "1rem",
    background: "var(--color-surface-50)",
  },
  analystNote: {
    margin: "0.75rem 0 0 0",
    fontSize: "0.8rem",
    lineHeight: 1.6,
    color: "var(--text-hint)",
  },
};
