/** Scrub mailbox handoff secrets from navigation breadcrumbs, request bodies, and exceptions. */
export const scrubAuthTelemetry = <T>(value: T): T => {
  const seen = new WeakSet<object>();
  const scrub = (entry: unknown): unknown => {
    if (typeof entry === 'string') {
      if (entry.startsWith('{') || entry.startsWith('[')) {
        try { return JSON.stringify(scrub(JSON.parse(entry))); } catch { /* Not serialized JSON. */ }
      }
      return entry.replace(/(?:[a-z][a-z0-9+.-]*:\/\/|\/)[^\s"'<>]*[?#][^\s"'<>]*/gi,
        (url) => url.split(/[?#]/, 1)[0] + '?[REDACTED]');
    }
    if (!entry || typeof entry !== 'object') return entry;
    if (seen.has(entry)) return '[Circular]';
    seen.add(entry);
    if (Array.isArray(entry)) return entry.map(scrub);
    return Object.fromEntries(Object.entries(entry).map(([key, child]) => [key,
      /token|password|secret|verifier|authorization|cookie/i.test(key) || ['state', 'code', 'query_string'].includes(key)
        ? '[REDACTED]' : scrub(child)]));
  };
  return scrub(value) as T;
};
