import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./chat-markdown";

/**
 * This is the one place model output becomes HTML, so the tests are mostly
 * about what must NOT come out of it.
 */
describe("renderMarkdown", () => {
  it("escapes HTML before anything else runs", () => {
    const html = renderMarkdown('<script>alert("x")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders ordinary formatting", () => {
    expect(renderMarkdown("**bold**")).toContain("<strong>bold</strong>");
    expect(renderMarkdown("a\nb")).toContain("<br/>");
  });

  describe("links", () => {
    it("links https and site-relative paths", () => {
      expect(renderMarkdown("[here](https://example.com/x)")).toContain(
        '<a href="https://example.com/x" class="chat-link">here</a>',
      );
      expect(renderMarkdown("[dash](/dashboard)")).toContain('href="/dashboard"');
    });

    // The regex used to accept any scheme while its comment claimed otherwise,
    // so a prompt-injected coach reply could hand the user a live
    // `javascript:` anchor. It now renders as the inert text it was.
    it("refuses a javascript: URL, and shows it instead of hiding it", () => {
      const html = renderMarkdown("[click me](javascript:alert(1))");
      expect(html).not.toContain("<a ");
      expect(html).toContain("click me");
    });

    it("refuses data: and other schemes", () => {
      expect(renderMarkdown("[x](data:text/html;base64,PHNjcmlwdD4=)")).not.toContain("<a ");
      expect(renderMarkdown("[x](vbscript:msgbox)")).not.toContain("<a ");
    });

    // I6.2: the corpus reveal labels every link "the recording" and hangs the
    // source's own title on the hover, because YouTube titles are headlines and
    // this surface is somebody's account of the strangest hour of their life.
    it("carries a hover title from [text](url 'title')", () => {
      const html = renderMarkdown(
        "[the recording](https://youtu.be/abc 'Woman DIES! The MOST PROFOUND NDE')",
      );
      expect(html).toContain('href="https://youtu.be/abc"');
      expect(html).toContain('title="Woman DIES! The MOST PROFOUND NDE"');
      expect(html).toContain(">the recording</a>");
    });

    it("a title cannot break out of the attribute", () => {
      const html = renderMarkdown("[x](https://e.com 'a\" onmouseover=\"alert(1)')");
      expect(html).not.toContain('onmouseover="alert');
    });

    // Half these titles carry "(NDE)" or "(Full Interview)", and a title body
    // that stopped at the first paren would drop the hover on all of them.
    it("keeps a hover title that contains parentheses", () => {
      const html = renderMarkdown(
        "[the recording](https://youtu.be/abc 'LIFE BETWEEN LIVES! (NDE) | Mariko F')",
      );
      expect(html).toContain('title="LIFE BETWEEN LIVES! (NDE) | Mariko F"');
      expect(html).toContain('href="https://youtu.be/abc"');
    });

    it("still links when no title is given", () => {
      expect(renderMarkdown("[x](https://e.com)")).not.toContain("title=");
    });
  });
});
