/**
 * Lookup Relationship — Gives the coach access to compatibility data.
 *
 * Sprint 0.5: When users mention a person they've shared Decoded with,
 * the coach can use this tool to look up their compatibility report,
 * the other person's personality archetype, and their shared data.
 *
 * Claude can call this when:
 * - User mentions a name that might match a connection
 * - User asks about a relationship dynamic
 * - User describes conflict or wants relationship coaching
 *
 * The tool searches decoded_invites for matching connections by name/email,
 * then returns the compatibility report and shared profile data.
 */

import type { AnthropicTool } from "./anthropic.ts";
import { createSupabaseClient } from "./supabase.ts";

// ─── TOOL DEFINITION ────────────────────────────────────────────────────

export const LOOKUP_RELATIONSHIP_TOOL: AnthropicTool = {
  name: "lookup_relationship",
  description:
    "Look up relationship and compatibility data between the user and someone they've shared their Decoded assessment with. Use this when the user mentions a person by name in a relationship context (e.g., arguing, dating, working with, family tension). Searches for matching connections and returns compatibility analysis (friction points, superpowers, advice) and the other person's personality archetype if shared. IMPORTANT: Only call this with a person's name or email — not a generic query.",
  input_schema: {
    type: "object" as const,
    properties: {
      person_name: {
        type: "string",
        description:
          "The name or email of the person the user is asking about. Match is case-insensitive and partial (e.g., 'Tom' matches 'Tom Wood' or 'tom@email.com'). Use the name exactly as the user mentioned it.",
      },
    },
    required: ["person_name"],
  },
};

// ─── TOOL HANDLER ───────────────────────────────────────────────────────

export async function handleLookupRelationship(
  userId: string,
  input: { person_name: string }
): Promise<{ data: unknown; found: boolean }> {
  const supabase = createSupabaseClient();
  const searchName = input.person_name.toLowerCase().trim();

  if (!searchName || searchName.length < 2) {
    return { data: "Please provide a name or email to search for.", found: false };
  }

  // Search for connections where the user is either inviter or recipient
  // and the OTHER person's name/email matches the search
  const { data: invites } = await supabase
    .from("decoded_invites")
    .select(
      "id, inviter_id, recipient_id, inviter_name, recipient_email, " +
      "compatibility_report_inviter, compatibility_report_recipient, compatibility_report, " +
      "inviter_report_id, recipient_report_id, share_with_human, status"
    )
    .in("status", ["consented", "connected"])
    .or(`inviter_id.eq.${userId},recipient_id.eq.${userId}`);

  if (!invites || invites.length === 0) {
    return {
      data: `No Decoded connections found. The user hasn't shared their assessment with anyone yet.`,
      found: false,
    };
  }

  // Find invites where the OTHER person matches the search name
  const matches = invites.filter((invite) => {
    const isInviter = invite.inviter_id === userId;
    if (isInviter) {
      // User is the inviter — search the recipient's email
      const email = invite.recipient_email?.toLowerCase() ?? "";
      return email.includes(searchName) || email.split("@")[0]?.includes(searchName);
    } else {
      // User is the recipient — search the inviter's name
      const name = invite.inviter_name?.toLowerCase() ?? "";
      return name.includes(searchName);
    }
  });

  if (matches.length === 0) {
    // List available connections so Claude can suggest the right one
    const connections = invites.map((invite) => {
      const isInviter = invite.inviter_id === userId;
      return isInviter
        ? invite.recipient_email?.split("@")[0] ?? "Unknown"
        : invite.inviter_name ?? "Unknown";
    });

    return {
      data: {
        message: `No connection found matching "${input.person_name}". The user's Decoded connections are: ${connections.join(", ")}. Try searching with one of these names instead.`,
        available_connections: connections,
      },
      found: false,
    };
  }

  // Use the first match (most likely the one they mean)
  const invite = matches[0];
  const isInviter = invite.inviter_id === userId;
  const otherName = isInviter
    ? (invite.recipient_email?.split("@")[0] ?? "Unknown")
    : (invite.inviter_name ?? "Unknown");

  // Get the user's personalized compatibility report
  const compatReport = isInviter
    ? (invite.compatibility_report_inviter ?? invite.compatibility_report)
    : (invite.compatibility_report_recipient ?? invite.compatibility_report);

  // Build the response
  const result: Record<string, unknown> = {
    connection_name: otherName,
    sharing_level: invite.share_with_human,
    status: invite.status,
  };

  if (compatReport) {
    result.compatibility_report = compatReport;
  } else {
    result.compatibility_note = "Compatibility report hasn't been generated yet.";
  }

  // Load the other person's archetype if sharing level allows
  if (invite.share_with_human === "type_compatibility" || invite.share_with_human === "full") {
    const otherReportId = isInviter ? invite.recipient_report_id : invite.inviter_report_id;
    if (otherReportId) {
      const { data: otherReport } = await supabase
        .from("assessment_reports")
        .select("archetype_base, archetype_sublabel, archetype_tagline")
        .eq("id", otherReportId)
        .maybeSingle();

      if (otherReport) {
        result.other_person_archetype = {
          base: otherReport.archetype_base,
          sublabel: otherReport.archetype_sublabel,
          tagline: otherReport.archetype_tagline,
        };
      }
    }
  }

  // Load the other person's full report summary if full sharing
  if (invite.share_with_human === "full") {
    const otherReportId = isInviter ? invite.recipient_report_id : invite.inviter_report_id;
    if (otherReportId) {
      const { data: otherReport } = await supabase
        .from("assessment_reports")
        .select("sections")
        .eq("id", otherReportId)
        .maybeSingle();

      if (otherReport?.sections) {
        const sections = otherReport.sections as Record<string, { content_markdown?: string }>;
        // Only include S1 (overview) — full report is too large
        if (sections.S1) {
          result.other_person_profile_summary = sections.S1.content_markdown ?? JSON.stringify(sections.S1);
        }
      }
    }
  }

  return { data: result, found: true };
}
