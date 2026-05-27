import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { novaPlanPlans } from '@/lib/pricing-data';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Harap login terlebih dahulu untuk melakukan pembayaran.' }, { status: 401 });
    }

    const { planId, cycle } = await req.json();

    if (!planId || !cycle) {
      return NextResponse.json({ error: 'Plan atau cycle tidak valid.' }, { status: 400 });
    }

    const plan = novaPlanPlans.find(p => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: 'Plan tidak ditemukan.' }, { status: 404 });
    }

    const price = cycle === 'monthly' ? plan.priceMonthly : plan.priceAnnually;

    if (price === 0) {
      return NextResponse.json({ error: 'Plan gratis tidak memerlukan pembayaran.' }, { status: 400 });
    }

    const orderId = `ORDER-${user.id.substring(0, 8)}-${Date.now()}`;

    // Use service role key if available to bypass RLS for inserts
    let dbClient = supabase;
    try {
      const { getAdminClient } = await import('@/lib/supabase/admin');
      dbClient = getAdminClient();
    } catch (e) {
      console.warn("Service Role Key not found, falling back to authenticated client.");
    }

    // Record the pending payment in the database so the webhook can process it later
    const { error: dbError } = await dbClient.from('payments').insert({
      user_id: user.id,
      amount: price,
      currency: 'IDR',
      status: 'pending',
      midtrans_order_id: orderId,
      payment_method: 'midtrans',
    });

    if (dbError) {
      console.error('Database Error:', dbError);
      return NextResponse.json({ error: `Gagal membuat catatan pembayaran: ${dbError.message}` }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'https://novaplan-ai.vercel.app';
    const parameters = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price
      },
      customer_details: {
        first_name: user.user_metadata?.full_name || 'Customer',
        email: user.email
      },
      item_details: [
        {
          id: planId,
          price: price,
          quantity: 1,
          name: `Langganan Paket ${plan.name} (${cycle})`,
        }
      ],
      custom_field1: planId,
      custom_field2: cycle,
      custom_field3: user.id,
      callbacks: {
        finish: `${origin}/pricing?payment=success`
      }
    };

    const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX || '';
    const authString = Buffer.from(`${serverKey}:`).toString('base64');
    
    const response = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${authString}`,
        'X-Override-Notification': `${origin}/api/payments/webhook`
      },
      body: JSON.stringify(parameters)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Midtrans API Error:', errText);
      return NextResponse.json({ error: 'Gagal membuat sesi pembayaran Midtrans.' }, { status: 500 });
    }

    const transaction = await response.json();
    return NextResponse.json({ redirect_url: transaction.redirect_url, token: transaction.token });
  } catch (error: unknown) {
    console.error('Midtrans Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
