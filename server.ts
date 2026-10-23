import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { advisor, transcribe } from "./server/ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

app.post("/api/transcribe", async (req, res) => {
  const result = await transcribe(req.body);
  res.status(result.status).json(result.body);
});

app.post("/api/advisor", async (req, res) => {
  const result = await advisor(req.body);
  res.status(result.status).json(result.body);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Startup Lessons eBook server running on http://localhost:${PORT}`);
  });
}

startServer();
