import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { applyPaymentSuccess } from "@/lib/services/payment-service";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = await request.json();
        const { order_id, transaction_status, status_code, gross_amount } = body;

        const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
        const signatureKey = `${order_id}${status_code}${gross_amount}${serverKey}`;
        const expected = createHash("sha512").update(signatureKey).digest("hex");

        if (body.signature_key !== expected) return Response.json({ error: "Invalid signature" }, { status: 401 });

        if (["settlement", "capture"].includes(transaction_status)) {
          try {
            await applyPaymentSuccess(order_id);
          } catch (err) {
            console.error("Webhook processing error:", err);
            return Response.json({ status: "error", message: "Processing failed, will retry" }, { status: 500 });
          }
        }

        if (transaction_status === "expire" || transaction_status === "cancel") {
          await db.update(payments).set({ status: "failed" }).where(and(eq(payments.orderId, order_id), ne(payments.status, "success")));
        }

        return Response.json({ status: "ok" });
      },
    },
  },
});
