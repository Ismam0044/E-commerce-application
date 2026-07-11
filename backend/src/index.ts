import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { getEnv } from "./lib/env";
import fs from "node:fs";
import path from "node:path";

const env = getEnv();
const app = express();
const rawJson = express.raw({ type: "application/json", limit: "1mb" });

app.use(cors());

// Webhook route uses rawJson instead of express.json()
// so it must be registered before app.use(express.json()).
app.post("/webhooks/clerk", rawJson, (req, res) => {
  void clerkWebhookHandler(req, res);
});

app.use(express.json());
app.use(clerkMiddleware());
const publicDir = path.join(process.cwd(), "public");
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
 
  app.get(/.*/, (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }

    if (req.path.startsWith("/api/") || req.path.startsWith("/webhooks/")) {
      next();
      return;
    }

    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}


app.listen(env.PORT, () => console.log("Listening on port:", env.PORT));
