const safeProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function sanitizeHref(rawHref: string) {
  const trimmed = rawHref.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return safeProtocols.has(parsed.protocol) ? trimmed : "";
  } catch {
    return "";
  }
}

function normalizeAnchorTags(value: string) {
  return value
    .replace(/<\s*a\b([^>]*)>/gi, (_match, attributes: string) => {
      const hrefMatch = attributes.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const safeHref = sanitizeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? "");
      return safeHref ? `<a href="${escapeAttribute(safeHref)}">` : "<a>";
    })
    .replace(/<\s*\/\s*a\s*>/gi, "</a>");
}

function sanitizeNotificationHtmlString(value: string) {
  return normalizeAnchorTags(value)
    .replace(/<\s*(\/?)\s*b\s*>/gi, "<$1strong>")
    .replace(/<\s*(\/?)\s*i\s*>/gi, "<$1em>")
    .replace(/<\s*(\/?)\s*strike\s*>/gi, "<$1s>")
    .replace(/<\s*br\s*\/?\s*>/gi, "<br>")
    .replace(/<\s*(p|div)\b[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*(p|div)\s*>/gi, "</p>")
    .replace(/<\s*strong\b[^>]*>/gi, "<strong>")
    .replace(/<\s*\/\s*strong\s*>/gi, "</strong>")
    .replace(/<\s*em\b[^>]*>/gi, "<em>")
    .replace(/<\s*\/\s*em\s*>/gi, "</em>")
    .replace(/<\s*u\b[^>]*>/gi, "<u>")
    .replace(/<\s*\/\s*u\s*>/gi, "</u>")
    .replace(/<\s*s\b[^>]*>/gi, "<s>")
    .replace(/<\s*\/\s*s\s*>/gi, "</s>")
    .replace(/<\s*ul\b[^>]*>/gi, "<ul>")
    .replace(/<\s*\/\s*ul\s*>/gi, "</ul>")
    .replace(/<\s*ol\b[^>]*>/gi, "<ol>")
    .replace(/<\s*\/\s*ol\s*>/gi, "</ol>")
    .replace(/<\s*li\b[^>]*>/gi, "<li>")
    .replace(/<\s*\/\s*li\s*>/gi, "</li>")
    .replace(/<li>\s*<p>/gi, "<li>")
    .replace(/<\/p>\s*<\/li>/gi, "</li>")
    .replace(/<(?!\/?(p|br|strong|em|u|s|a|ul|ol|li)\b)[^>]*>/gi, "")
    .replace(/(?:<br>\s*){3,}/g, "<br><br>")
    .trim();
}

export function sanitizeNotificationHtml(value: string | undefined) {
  if (!value) return "";
  return sanitizeNotificationHtmlString(value);
}
