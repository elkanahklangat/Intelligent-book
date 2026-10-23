import { advisor } from "../../server/ai";

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const result = await advisor(body ?? {});
  return Response.json(result.body, { status: result.status });
};

export const config = {
  path: "/api/advisor",
  method: "POST",
};
