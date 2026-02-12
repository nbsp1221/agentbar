type GitHubUser = {
  login?: string;
  email?: string | null;
};

type GitHubEmail = {
  email: string;
  primary?: boolean;
  verified?: boolean;
  visibility?: string | null;
};

const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails";

export function resolveCopilotLabelFromGitHub(input: {
  user?: GitHubUser;
  emails?: GitHubEmail[];
}): string {
  const emails = Array.isArray(input.emails) ? input.emails : [];

  const primaryVerified = emails.find((e) => e.primary === true && e.verified === true)?.email;
  if (typeof primaryVerified === "string" && primaryVerified.trim().length > 0) {
    return primaryVerified.trim();
  }

  const anyVerified = emails.find((e) => e.verified === true)?.email;
  if (typeof anyVerified === "string" && anyVerified.trim().length > 0) {
    return anyVerified.trim();
  }

  const anyEmail = emails.find((e) => typeof e.email === "string" && e.email.trim().length > 0)?.email;
  if (typeof anyEmail === "string" && anyEmail.trim().length > 0) {
    return anyEmail.trim();
  }

  const userEmail = input.user?.email;
  if (typeof userEmail === "string" && userEmail.trim().length > 0) {
    return userEmail.trim();
  }

  const login = input.user?.login;
  if (typeof login === "string" && login.trim().length > 0) {
    return login.trim();
  }

  return "copilot";
}

async function fetchJson(
  url: string,
  token: string,
  fetchImpl: typeof fetch
): Promise<{ ok: boolean; status: number; json?: any }> {
  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `token ${token}`,
      "User-Agent": "agentbar",
      "X-Github-Api-Version": "2022-11-28"
    }
  });

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  return { ok: true, status: res.status, json: (await res.json()) as any };
}

export async function fetchCopilotLabel(
  githubToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  let user: GitHubUser | undefined;
  let emails: GitHubEmail[] | undefined;

  try {
    const userRes = await fetchJson(GITHUB_USER_URL, githubToken, fetchImpl);
    if (userRes.ok) {
      user = userRes.json as GitHubUser;
    }
  } catch {
    // ignore; fallback to default label
  }

  try {
    const emailsRes = await fetchJson(GITHUB_USER_EMAILS_URL, githubToken, fetchImpl);
    if (emailsRes.ok && Array.isArray(emailsRes.json)) {
      emails = emailsRes.json as GitHubEmail[];
    }
  } catch {
    // ignore; fallback to login or default
  }

  return resolveCopilotLabelFromGitHub({ user, emails });
}

