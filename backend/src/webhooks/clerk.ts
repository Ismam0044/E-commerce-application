import type { Request, Response } from "express";
import { getEnv } from "../lib/env";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { parseRole } from "../lib/roles";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export async function clerkWebhookHandler(req: Request, res: Response) {
  const env = getEnv();

  try {
    // webhook verification needs a shared secret; without it we cannot trust incoming POSTs.
    if (!env.CLERK_WEBHOOK_SECRET) {
      res.status(503).send("Webhooks secret is not provided");
      return;
    }

    // Clerk's verifier expects a Web Request with the raw body.
    const rawBody = req.body instanceof Buffer
      ? req.body
      : typeof req.body === "string"
      ? Buffer.from(req.body, "utf8")
      : Buffer.from(JSON.stringify(req.body), "utf8");

    const signatureHeader =
      req.headers["clerk-signature"] ||
      req.headers["Clerk-Signature"] ||
      req.headers["x-clerk-signature"] ||
      req.headers["X-Clerk-Signature"];

    console.log("Clerk webhook received headers", {
      clerkSignaturePresent: Boolean(signatureHeader),
      contentType: req.headers["content-type"],
      bodyLength: rawBody.length,
    });

    const request = new Request("http://internal/webhooks/clerk", {
      method: "POST",
      headers: new Headers(req.headers as HeadersInit),
      body: rawBody,
    });

    // throws if signature is wrong or body was tampered with; only then we trust evt.
    const evt = await verifyWebhook(request, { signingSecret: env.CLERK_WEBHOOK_SECRET });
    const u = evt.data as {
      id: string;
      email_addresses?: Array<{ id: string; email_address: string }>;
      primary_email_address_id?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
      public_metadata?: { role?: string };
    };

    console.log("Clerk webhook verified", evt.type, "for", u.id);

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const email =
        u.email_addresses?.find((e: { id: string; email_address: string }) =>
          e.id === u.primary_email_address_id,
        )?.email_address ?? u.email_addresses?.[0]?.email_address ?? "";

      const displayName =
        [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || null;

      const role = parseRole(u.public_metadata?.role) ?? "customer";

      await db
        .insert(users)
        .values({
          clerkUserId: u.id,
          email,
          displayName,
          role,
        } as any)
        .onConflictDoUpdate({
          target: users.clerkUserId,
          set: { email, displayName, role, updatedAt: new Date() },
        });
    }

    if (evt.type === "user.deleted") {
      const id = evt.data.id;
      if (id) {
        await db.delete(users).where(eq(users.clerkUserId, id));
      }
    }

    res.json({ ok: true });
  } catch (err) {
    // Bad signature, malformed payload, or DB error — do not leak details to the client.
    console.error("Clerk webhook error", err);
    res.status(400).json({ error: "Invalid webhook" });
  }
}