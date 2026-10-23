import { transcribe } from "../../server/ai";

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const result = await transcribe(body ?? {});
  return Response.json(result.body, { status: result.status });
};

export const config = {
  path: "/api/transcribe",
  method: "POST",
};
