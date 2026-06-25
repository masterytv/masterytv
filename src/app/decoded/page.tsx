import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * /decoded — retired as a marketing/auth page (its copy duplicated the home
 * page). It now forwards to the clean, brand-aware /login, preserving context
 * (invite / next / error / ref). Every historical /decoded link keeps working;
 * /login handles the authed-user case.
 */
export default async function DecodedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const query = qs.toString();
  redirect(`/login${query ? `?${query}` : ""}`);
}
