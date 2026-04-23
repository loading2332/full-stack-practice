import { cookies } from 'next/headers';
import {
  buildBackendHeaders,
  buildSseResponseHeaders,
  getBackendUrl,
  injectSessionIdIntoChatBody,
  getTokenFromCookies,
} from './_lib/backend';

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const cookieStore = await cookies();
  const token = getTokenFromCookies(cookieStore);
  const sessionId = req.headers.get('X-Session-Id') ?? undefined;
  const body = injectSessionIdIntoChatBody(rawBody, sessionId);

  const response = await fetch(`${getBackendUrl()}/chat`, {
    method: 'POST',
    headers: buildBackendHeaders({
      token,
      contentType: 'application/json',
    }),
    body,
  });

  if (!response.ok) {
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }

  return new Response(response.body, {
    status: response.status,
    headers: buildSseResponseHeaders(response.headers),
  });
}
