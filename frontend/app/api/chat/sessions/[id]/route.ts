import { proxyJsonRequest } from '../../_lib/backend';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  return proxyJsonRequest(req, `/chat/sessions/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;

  return proxyJsonRequest(req, `/chat/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
