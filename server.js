import "dotenv/config";

import express from "express";
import cors from "cors";
import { getNow } from "./tester.js";
import {
  isExpired,
  hasViewsLeft,
  decrementViews,
  getExpiresAt,
} from "./timingLogic.js";

import { Redis } from "@upstash/redis";

const redis=new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const app = express();
app.use(cors());
app.use(express.json());
let paste = {};
const PORT = process.env.PORT || 3000;
const initialise = async () => {
  try {
    app.listen(PORT, () => {
      console.log("backend start run on 4000");
    });
  } catch (e) {
    console.log(e);
  }
};

app.get("/api/healthz", (req, res) => {
  try {
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "server error" });
  }
});

app.post("/api/pastes", async (req, res) => {
  try {
    
    const { content, ttl_seconds, max_views } = req.body;
    if (typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ ok: false, error: "content is required" });
    }
    
if (ttl_seconds !== undefined) {
  if (!Number.isInteger(ttl_seconds) || ttl_seconds < 1) {
    return res.status(400).json({ error: "ttl_seconds must be an integer >= 1" });
  }
}

if (max_views !== undefined) {
  if (!Number.isInteger(max_views) || max_views < 1) {
    return res.status(400).json({ error: "max_views must be an integer >= 1" });
  }
}
    let id = Math.random().toString(36).slice(2, 10);
   
    const pasteContent = {
  content,
  remaining_views: max_views ?? null,
  time_limit: ttl_seconds ?? null,
  created_at: getNow(req),
};
    await redis.set(id,pasteContent)
    res.status(201).json({
      ok: true,
      id,
      url: `http://localhost:4000/p/${id}`,
    });
  } catch (e) {
    console.error(e);
     res.status(500).json({ ok: false, error: "server error" });
  }
});

app.get("/api/pastes/:id", async (req, res) => {
  const { id } = req.params;
  const pasteVal = await redis.get(id);
  if (!pasteVal) {
  
    return res.status(404).json({ ok: false, error: "paste not found" });
  }

  let now = getNow(req);
  if (isExpired(pasteVal, now) || !hasViewsLeft(pasteVal)) {

    await redis.del(id);
    return res.status(404).json({ ok: false });
  }
  decrementViews(pasteVal);
await redis.set(id, pasteVal);
  res.status(200).json({
    content: pasteVal.content,
    remaining_views: pasteVal.remaining_views,
    expires_at: getExpiresAt(pasteVal),
  });
});

app.get("/p/:id",async (req,res)=>{
  const { id } = req.params;
  const pasteVal = await redis.get(id);
  if (!pasteVal) {
   
    return res.status(404).json({ ok: false, error: "paste not found" });
  }
 
  let now = getNow(req);
  if (isExpired(pasteVal, now) || !hasViewsLeft(pasteVal)) {
   
    await redis.del(id);
return res.status(404).json({
  ok: false,
  error: "paste not found",
});
  }
  decrementViews(pasteVal);
  await redis.set(id, pasteVal);
  res.status(200).type("text/html").send(
    `<!DOCTYPE html>
    <html>
    <body>
    <pre>${pasteVal.content}</pre>
    </body>
    </html>`
  );
})
initialise();

export default app;
