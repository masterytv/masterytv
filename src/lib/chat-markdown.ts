/**
 * The chat bubble's markdown — extracted from `chat-window.tsx` so it can be
 * tested, because it is the one place in the app where model output becomes
 * HTML.
 *
 * Two things live here and both matter:
 *
 *   1. **Sanitize first, transform second.** Every HTML entity is escaped
 *      before any markdown rule runs, so a compromised or prompt-injected model
 *      cannot reach `dangerouslySetInnerHTML` with a `<script>`.
 *   2. **Only known-safe link schemes become links.** The regex used to accept
 *      any scheme while its comment claimed otherwise, so a coach reply
 *      containing `[click](javascript:…)` rendered as a live anchor. Now an
 *      `href` must be `https:`, `http:`, or a site-relative path; anything else
 *      renders as the literal text it was, which is visible and inert.
 */

/**
 * Escape HTML entities. MUST run before the markdown transforms — it is what
 * makes `dangerouslySetInnerHTML` safe downstream, and it is also why the link
 * rule below matches `&quot;` rather than `"` for a title.
 */
export function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** `https://…`, `http://…`, or a site-relative `/path`. Nothing else links. */
const SAFE_HREF = String.raw`https?:\/\/[^\s)]+|\/[^\s)]*`;

/**
 * `[text](href)` and `[text](href 'hover title')`.
 *
 * The optional title is what lets a link say where it goes without shouting it:
 * the integration corpus reveal labels every link "the recording" and hangs the
 * source's own title on the hover (INTEGRATION_SPRINT.md I6.2), because those
 * titles are YouTube headlines and the surface they land on is somebody's
 * account of the strangest hour of their life.
 *
 * 🔑 SINGLE quotes, and markdown allows both forms. A double-quoted title is a
 * long run inside quotation marks, which the coach's own output auditor reads
 * as a quotation and blocks for misquoting a source. `&#039;` rather than `'`
 * because `sanitizeHtml` has already run.
 *
 * The title body runs to the LAST delimiter before the closing paren, not the
 * first, and it may not contain a square bracket. Both halves are load-bearing
 * and both were measured against the real corpus:
 *
 *   - GREEDY, because 17.6% of these titles carry an apostrophe of their own
 *     ("Yvonne's Story", "Agnostic's Near-Death Experience") — two of the three
 *     links in the first live reveal — and a lazy body ends the title at the
 *     possessive and loses the hover.
 *   - NO BRACKETS, because that is what stops a greedy body from swallowing the
 *     text between two links and merging them: every following link starts with
 *     `[`. Parentheses are deliberately allowed, since "(NDE)" is in half the
 *     titles in this corpus.
 */
const LINK = new RegExp(
  String.raw`\[([^\]]+)\]\((` + SAFE_HREF + String.raw`)(?:\s+&#039;([^\][]*)&#039;)?\)`,
  "g",
);

export function renderMarkdown(text: string): string {
  // Sanitize first — escape all HTML, THEN apply known-safe transforms
  return sanitizeHtml(text)
    // Code blocks (```...```)
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="chat-code-block"><code>$2</code></pre>')
    // Inline code (`...`)
    .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Headings (#, ##, ### …) → bold line. The coach is instructed not to emit
    // headings (E14 conversational stance), but never render a raw "### " if it does.
    .replace(/^#{1,6}\s+(.+?)\s*$/gm, "<strong>$1</strong>")
    // Bold (**text**)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    // Italic (*text*)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
    // Links — safe schemes only, with an optional hover title. Both attribute
    // values have already been entity-escaped by `sanitizeHtml`, so neither can
    // break out of the attribute.
    .replace(LINK, (_match, label: string, href: string, title?: string) =>
      `<a href="${href}" class="chat-link"${title ? ` title="${title}"` : ""}>${label}</a>`)
    // Bullet lists
    .replace(/^- (.+)$/gm, '<li class="chat-li">$1</li>')
    .replace(new RegExp('(<li class="chat-li">.*?<\\/li>\\n?)+', "g"), '<ul class="chat-ul">$&</ul>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="chat-li-num">$1</li>')
    .replace(new RegExp('(<li class="chat-li-num">.*?<\\/li>\\n?)+', "g"), '<ol class="chat-ol">$&</ol>')
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}
