/**
 * MoneyMapCard — the MoneyTraits™ archetype card (MONEY_TRAITS_INSTRUMENT.md §5).
 *
 * The reveal ladder's Rung-0 artifact: the shareable "read" that sits at the top
 * of the money reveal chat, ahead of the coach's Rung-1 message ("here's the
 * read — want me to check if it's true?"). Renders straight from the stored
 * StoredMoneyMap bundle (the money WRITE path's assessment_reports.sections
 * .money_map) — never re-scores. (Internal names keep the historical Map
 * wording; the storage keys are locked — MONEY_TRAITS_RENAME.md §1.2.)
 *
 * BRAND.md: one edge + one challenge keeps it credible, not flattery-only (§4
 * anti-cringe); the Fear line is the hook. Lucide marks only (the §5 mockup's
 * ⚡/⚠ are placeholders) — Compass (money's mark, and BRAND's endorsed abstract
 * pick), ArrowUpRight for the edge/leverage, AlertTriangle for the challenge.
 * Deliberately NOT Zap (banned lightning) or Sparkles (banned). Tokens only, so
 * it adapts to the money palette in both themes.
 *
 * Public string is the brand name "MoneyTraits" (locked 2026-07-20 — never the
 * old "Money Maps"/"MoneyMaps" name, a third party's registered mark).
 */

import { Compass, ArrowUpRight, AlertTriangle } from "lucide-react";
import type { StoredMoneyMap } from "@/lib/decoded/scoring/money-maps";
import { secondaryAdjective, describeFear } from "./money-map-card-format";
import "./money-map-card.css";

export default function MoneyMapCard({ map }: { map: StoredMoneyMap }) {
  return (
    <aside className="mm-card" aria-label="Your MoneyTraits profile">
      <div className="mm-card__eyebrow">
        <Compass className="mm-card__eyebrow-mark" size={14} strokeWidth={2} aria-hidden="true" />
        <span>MoneyTraits™</span>
      </div>

      <h2 className="mm-card__name">{map.archetype}</h2>
      <p className="mm-card__maps">
        <span className="mm-card__map-dominant">{map.dominant}</span>
        <span className="mm-card__map-sep" aria-hidden="true">·</span>
        <span className="mm-card__map-secondary">{secondaryAdjective(map.secondary)}</span>
      </p>

      <div className="mm-card__lines">
        <div className="mm-card__line">
          <ArrowUpRight className="mm-card__line-mark" size={16} strokeWidth={2} aria-hidden="true" />
          <span className="mm-card__line-label">Edge</span>
          <span className="mm-card__line-text">{map.edge}</span>
        </div>
        <div className="mm-card__line">
          <AlertTriangle className="mm-card__line-mark" size={16} strokeWidth={2} aria-hidden="true" />
          <span className="mm-card__line-label">Challenge</span>
          <span className="mm-card__line-text">{map.leak}</span>
        </div>
      </div>

      <p className="mm-card__leap">
        <span className="mm-card__leap-label">The Fear</span>
        <span className="mm-card__leap-value">{describeFear(map.leap.band, map.leap.tilt)}</span>
      </p>

      <p className="mm-card__footer">built on the science of money beliefs · MoneyTraits</p>
    </aside>
  );
}
