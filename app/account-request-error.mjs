const ISSUE_KINDS = new Set(["session", "access", "unavailable"]);
const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function accountIssueForStatus(status) {
  if (status === 401) return "session";
  if (status === 403) return "access";
  return "unavailable";
}

export function safeRequestId(value) {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

export class AccountRequestError extends Error {
  constructor(kind, requestId = null) {
    const safeKind = ISSUE_KINDS.has(kind) ? kind : "unavailable";
    super(safeKind);
    this.name = "AccountRequestError";
    this.kind = safeKind;
    this.requestId = safeRequestId(requestId);
  }
}

export function accountRequestError(response) {
  return new AccountRequestError(
    accountIssueForStatus(response.status),
    response.headers.get("x-request-id"),
  );
}

export function accountIssueFromError(error) {
  if (error instanceof AccountRequestError) {
    return { kind: error.kind, requestId: error.requestId };
  }
  if (error instanceof Error && ISSUE_KINDS.has(error.message)) {
    return { kind: error.message, requestId: null };
  }
  return { kind: "unavailable", requestId: null };
}

export function dominantAccountIssue(issues) {
  const available = issues.filter(Boolean);
  return available.find((issue) => issue.kind === "session")
    ?? available.find((issue) => issue.kind === "access")
    ?? available.find((issue) => issue.kind === "unavailable")
    ?? null;
}

export function accountIssueReference(issue) {
  return issue?.requestId ? `Reference ${issue.requestId}` : null;
}
