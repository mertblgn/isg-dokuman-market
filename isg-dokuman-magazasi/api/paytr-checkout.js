const crypto = require('crypto');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cart, userEmail, userName, userPhone, userAddress } = req.body;

  const merchant_id = '770404';
  const merchant_key = 'bkhoftywDU4nFUUy';
  const merchant_salt = 'HpP2ZuXuYEqiRnQj';

  // Sepetteki ürünlerin toplam tutarını kuruş cinsinden hesapla
  let totalAmount = 0;
  const basket = (cart || []).map(item => {
    const price = Math.round((item.price || 99) * 100);
    totalAmount += price;
    return [item.title || item.name || 'ISG Dokuman', (item.price || 99).toFixed(2), 1];
  });

  const merchant_oid = 'ISG' + Date.now();
  const user_ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const email = userEmail || 'musteri@isgdokumanmarket.com';
  const payment_amount = totalAmount; 
  const currency = 'TL';
  const test_mode = 0; // Şu an test modundayız! Canlıya geçince 0 yapılacak.
  const non_3d = 0;
  const merchant_ok_url = 'https://isg-dokuman-market.vercel.app/?success=true';
  const merchant_fail_url = 'https://isg-dokuman-market.vercel.app/?fail=true';
  const user_basket = Buffer.from(JSON.stringify(basket)).toString('base64');
  const user_name = userName || 'Mert Bilgen';
  const user_address = userAddress || 'Akhisar Manisa';
  const user_phone = userPhone || '05555555555';
  const timeout_limit = '30';
  const debug_on = 1;
  const no_installment = 0;
  const max_installment = 0;

  // PayTR Token Oluşturma Algoritması
  const hash_str = merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
  const token_str = hash_str + merchant_salt;
  const paytr_token = crypto.createHmac('sha256', merchant_key).update(token_str).digest('base64');

  const postData = new URLSearchParams({
    merchant_id,
    user_ip,
    merchant_oid,
    email,
    payment_amount,
    paytr_token,
    user_basket,
    debug_on,
    no_installment,
    max_installment,
    user_name,
    user_address,
    user_phone,
    merchant_ok_url,
    merchant_fail_url,
    user_type: '1',
    lang: 'tr',
    timeout_limit,
    currency,
    test_mode,
    non_3d
  });

  try {
    const response = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body: postData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const result = await response.json();
    
    if (result.status === 'success') {
      return res.status(200).json({ status: 'success', token: result.token });
    } else {
      return res.status(400).json({ status: 'failed', reason: result.reason || 'Bilinmeyen hata' });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}