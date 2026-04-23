import { proxyJsonRequest } from '../_lib/backend';

export async function POST(req: Request): Promise<Response> {
  return proxyJsonRequest(req, '/chat/save');
}
