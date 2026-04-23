import { proxyJsonRequest } from '../_lib/backend';

export async function GET(
  req: Request = new Request('http://localhost'),
): Promise<Response> {
  return proxyJsonRequest(req, '/chat/sessions', {
    method: 'GET',
  });
}
