const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export const AUTH_COOKIE_NAMES = [
  'adam_token',
  'token',
  'access_token',
  'auth_token',
] as const;

type CookieStore = {
  get(name: string): { value: string } | undefined | null;
};

type BackendHeadersInput = {
  token?: string;
  contentType?: string;
};

type ProxyJsonRequestOptions = {
  method?: string;
  body?: string;
  sessionId?: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function getBackendUrl(): string {
  const configuredUrl =
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    DEFAULT_BACKEND_URL;

  return trimTrailingSlash(configuredUrl);
}

export function buildBackendHeaders(input: BackendHeadersInput): Headers {
  const headers = new Headers();

  if (input.contentType) {
    headers.set('Content-Type', input.contentType);
  }

  if (input.token) {
    headers.set('Authorization', `Bearer ${input.token}`);
  }

  return headers;
}

export function getTokenFromCookies(
  cookieStore: CookieStore,
): string | undefined {
  for (const cookieName of AUTH_COOKIE_NAMES) {
    const cookie = cookieStore.get(cookieName);
    const value = cookie?.value?.trim();

    if (value) {
      return value;
    }
  }

  return undefined;
}

export async function proxyJsonRequest(
  req: Request,
  path: string,
  options: ProxyJsonRequestOptions = {},
): Promise<Response> {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = getTokenFromCookies(cookieStore);
  const method = options.method ?? req.method;
  const body =
    options.body ??
    (method === 'GET' || method === 'HEAD' ? undefined : await req.text());
  const response = await fetch(`${getBackendUrl()}${path}`, {
    method,
    headers: buildBackendHeaders({
      token,
      contentType: body ? 'application/json' : undefined,
    }),
    body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: copyResponseHeaders(response.headers),
  });
}

export function buildSseResponseHeaders(responseHeaders: Headers): Headers {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  const sessionId = responseHeaders.get('X-Session-Id');

  if (sessionId) {
    headers.set('X-Session-Id', sessionId);
  }

  return headers;
}

function copyResponseHeaders(headers: Headers): Headers {
  const copied = new Headers();

  headers.forEach((value, key) => {
    copied.set(key, value);
  });

  return copied;
}

export function injectSessionIdIntoChatBody(
  body: string,
  sessionId?: string,
): string {
  if (!sessionId) {
    return body;
  }

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed) ||
      typeof parsed.sessionId === 'string'
    ) {
      return body;
    }

    return JSON.stringify({
      ...parsed,
      sessionId,
    });
  } catch {
    return body;
  }
}
