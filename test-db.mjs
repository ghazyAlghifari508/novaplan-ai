import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hiotgmmhhtklltjmsvic.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpb3RnbW1oaHRrbGx0am1zdmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTg4MTksImV4cCI6MjA5Mzk3NDgxOX0.ZmerTmjhcg1kIXH3kYT4DottPhKmCaCFwgHMXsEq0gE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('payments').insert({
    user_id: '16921313-f860-4966-baad-36ef8f3521e1', // Mock uuid
    amount: 149000,
    status: 'pending',
    midtrans_order_id: 'ORDER-12345678-1234567890',
    payment_method: 'midtrans',
  });
  console.log('Error:', error);
  console.log('Data:', data);
}

testInsert();
