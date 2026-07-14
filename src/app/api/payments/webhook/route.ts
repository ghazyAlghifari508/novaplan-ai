import { NextRequest, NextResponse } from "next/server";

import { handlePaymentSuccess } from "@/app/actions/payment";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { order_id, transaction_status, status_code, gross_amount } = body;

  const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
  const signatureKey = `${order_id}${status_code}${gross_amount}${serverKey}`;
  const expectedSignature = crypto
    .createHash("sha512")
    .update(signatureKey)
    .digest("hex");

  if (body.signature_key !== expectedSignature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const transitionSuccessStatuses = ["settlement", "capture"];
  const isSuccess = transitionSuccessStatuses.includes(transaction_status);

  if (isSuccess) {
    try {
      await handlePaymentSuccess(order_id);
    } catch (err) {
      // Return 500 so Midtrans retries instead of silently losing the payment.
      console.error("Webhook processing error:", err);
      return NextResponse.json({ status: "error", message: "Processing failed, will retry" }, { status: 500 });
    }
  }

  if (transaction_status === "expire" || transaction_status === "cancel") {
    const { getAdminInsforge } = await import("@/lib/insforge/admin");
    const admin = getAdminInsforge();
    await admin.database
      .from("payments")
      .update({ status: "failed" })
      .eq("midtrans_order_id", order_id)
      .neq("status", "success"); // guard: never overwrite settled payments
  }

  return NextResponse.json({ status: "ok" });
}