/**
 * Generates the four Relatti Relationship-Style share cards (one fixed emblem
 * per attachment style) in the same ultra-premium engraving language as the
 * Decoded personality cards. Non-personalized — generated once, committed as
 * static assets at public/relatti/styles/{slug}.png (1024x1024).
 *
 * Usage:  node scripts/relatti-style-cards/generate.mjs [slug]
 *   slug optional — regenerate just one (anchor|devoted|independent|guarded-heart)
 *
 * Reads OPENAI_API_KEY from .env.local. Uses gpt-image-1 (how the originals
 * were made). QA the output; rerun a slug to reroll.
 */
import fs from "node:fs";
import path from "node:path";

// Prefer the Relatti key (no spend limit); fall back to the default key.
// The masterytv-decoded key has a hard billing limit and 429s on image gen.
const envText = fs.readFileSync(".env.local", "utf8");
const readVar = (name) =>
  (envText.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1] ?? "")
    .trim()
    .replace(/^["']|["']$/g, "");
const key = readVar("OPENAI_API_KEY_RELATTI") || readVar("OPENAI_API_KEY");
if (!key) throw new Error("No OpenAI key found in .env.local (OPENAI_API_KEY_RELATTI or OPENAI_API_KEY)");

const STYLES = [
  {
    slug: "anchor",
    name: "THE ANCHOR",
    tagline: "Comfortable with closeness and independence alike",
    traits: ["Steady Presence", "Secure Trust", "Calm in Conflict"],
    emblem:
      "a sturdy ship's anchor standing upright at center, its rope coiling gracefully up the shank and forming a subtle heart-shaped loop near the crown; calm horizontal water lines beneath; a faint compass rose behind it",
  },
  {
    slug: "devoted",
    name: "THE DEVOTED",
    tagline: "You love deeply and thrive on closeness and reassurance",
    traits: ["Deep Devotion", "Emotional Generosity", "Wholehearted Loyalty"],
    emblem:
      "a radiant heart cradled in two open, giving hands, a ribbon spiraling outward, with fine rays of light emanating behind it",
  },
  {
    slug: "independent",
    name: "THE INDEPENDENT",
    tagline: "You value your autonomy and stay steady on your own",
    traits: ["Self-Reliance", "Grounded Calm", "Quiet Strength"],
    emblem:
      "a solitary great oak tree atop a low hill, full canopy, deep visible roots gripping the earth, wind moving through the leaves, standing alone and strong",
  },
  {
    slug: "guarded-heart",
    name: "THE GUARDED HEART",
    tagline: "You crave deep connection — and protect it carefully",
    traits: ["Loyal Depth", "Careful Trust", "Protective Devotion"],
    emblem:
      "an ornate heart encircled by a fine chain with a small keyhole lock at its center; one chain link hangs open and a small ornate key rests at the base, implying the heart can open",
  },
];

function buildPrompt(s) {
  return `Ultra-premium relationship-style collectible share card, square 1:1 format. Dark navy blue background (#0b1326). A consistent template: an elegant thin double-line border with art deco corner ornaments framing the whole card. "RELATTI" in spaced small caps at the very top in cream. A large centered illustration: ${s.emblem}. Rendered in exquisite cream/off-white fine-line engraving on navy — detailed crosshatching and stippling like a luxury banknote, premium playing card, or vintage scientific illustration. NOT cartoon. NOT cute. NOT modern flat illustration. Below the illustration: "${s.name}" in bold cream all-caps serif (Playfair Display style). A small decorative diamond divider. Then the tagline in italic cream serif: "${s.tagline}". Then a single row of three small gold (#fabd00) trait badges reading: "${s.traits[0]}    ${s.traits[1]}    ${s.traits[2]}". At the very bottom, a small cream watermark "relatti.com". Balanced, symmetrical, heraldic coat-of-arms composition. Timeless, elegant, premium engraving aesthetic. All text spelled exactly as given.`;
}

const outDir = "public/relatti/styles";
fs.mkdirSync(outDir, { recursive: true });

const only = process.argv[2];

for (const s of STYLES) {
  if (only && s.slug !== only) continue;
  process.stdout.write(`Generating ${s.slug}… `);
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: buildPrompt(s),
      size: "1024x1024",
      quality: "high",
      n: 1,
    }),
  });
  if (!res.ok) {
    console.error(`FAILED ${res.status}: ${await res.text()}`);
    continue;
  }
  const json = await res.json();
  const b64 = json.data[0].b64_json;
  fs.writeFileSync(path.join(outDir, `${s.slug}.png`), Buffer.from(b64, "base64"));
  console.log(`saved ${outDir}/${s.slug}.png`);
}
console.log("Done.");
