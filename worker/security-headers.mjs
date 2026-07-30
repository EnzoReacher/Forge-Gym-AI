const STATIC_SECURITY_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Origin-Agent-Cluster": "?1",
  "Permissions-Policy":
    "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Frame-Options": "DENY",
};

function isHtml(response) {
  return /^text\/html\b/i.test(response.headers.get("content-type") ?? "");
}

function contentSecurityPolicy(nonce, isHttps) {
  const directives = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self'",
    "manifest-src 'self'",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
  ];

  if (isHttps) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function nonceScripts(html, nonce) {
  return html.replace(
    /<script\b([^>]*)>/gi,
    (_match, attributes) =>
      `<script${attributes.replace(/\snonce=(["']).*?\1/gi, "")} nonce="${nonce}">`,
  );
}

export async function applySecurityHeaders(request, response) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  headers.delete("Server");
  headers.delete("X-Powered-By");

  const isHttps = new URL(request.url).protocol === "https:";
  if (isHttps) {
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  if (!isHtml(response)) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const nonce = crypto.randomUUID().replaceAll("-", "");
  headers.set("Content-Security-Policy", contentSecurityPolicy(nonce, isHttps));

  return new Response(nonceScripts(await response.text(), nonce), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
