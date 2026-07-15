import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhookHandler } from "./webhooks/clerk";
import { getEnv } from "./lib/env";
import fs from "node:fs";
import path from "node:path";
import keepAliveCron from "./lib/cron";
import * as Sentry from "@sentry/node";
import { sentryClerkUserMiddleware } from "./middleware/sentryClerkUser";

import productRouter from "./routes/productRouter";
import meRouter from "./routes/meRouter";
import streamRouter from "./routes/streamRouter";
import checkoutRouter from "./routes/checkoutRouter";
import { polarWebhookHandler } from "./webhooks/polar";
import adminRouter from "./routes/adminRouter.js";
import orderRouter from "./routes/orderRouter.js";



const env = getEnv();
const app = express();
const rawJson = express.raw({ type: () => true, limit: "1mb" });

app.post("/webhooks/clerk", rawJson, (req, res) => {
  void clerkWebhookHandler(req, res);
});
app.post("/webhooks/polar", rawJson, (req, res) => {
  void polarWebhookHandler(req, res);
});

app.use(express.json());
app.use(clerkMiddleware());
app.use(sentryClerkUserMiddleware);
app.use(cors());

app.get("/health", (_req, res) => {
  res.json({ok:true});
});
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
app.use("/api/me", meRouter);
app.use("/api/products", productRouter);
app.use("/api/stream", streamRouter);
app.use("/api/checkout", checkoutRouter);
app.use("/api/admin", adminRouter);
app.use("/api/orders", orderRouter);

Sentry.setupExpressErrorHandler(app);

app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const sentryId = (res as express.Response & { sentry?: string }).sentry;

    console.error(err);

    res.status(500).json({
      error: "Internal server error",
      ...(sentryId !== undefined && { sentryId }),
    });
  },
);

app.listen(env.PORT, () => {
  console.log("Listening on port:", env.PORT);
  if (env.NODE_ENV === "production")
    keepAliveCron.start();
});