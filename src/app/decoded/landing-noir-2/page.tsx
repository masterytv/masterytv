import type { Metadata } from "next";
import DecodedNoir2Landing from "./DecodedNoir2Landing";

export const metadata: Metadata = {
  title: "Decoded — Reopening The Case Of You",
  description:
    "13 validated psychological instruments. One adaptive assessment. A free 30-page dossier — and an informant who's already read every word.",
};

export default function DecodedNoir2Page() {
  return <DecodedNoir2Landing />;
}
