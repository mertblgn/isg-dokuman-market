const crypto = require('crypto');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { merchant_oid, status, total_amount, hash } = req.body;

  // PayTR mağaza şifrelerin (Aynı kalıyor)
  const merchant_key = 'ZkhoftywDU4nFUUy';
  const merchant_salt = 'ApP2ZuXuYEqiRnQj';

  // PayTR Güvenlik Hash Doğrulaması
  const hash_str = merchant_oid + merchant_salt + status + total_amount;
  const calculated_hash = crypto.createHmac('sha256', merchant_key).update(hash_str).digest('base64');

  if (calculated_hash !== hash) {
    return res.status(400).send('PAYTR notification failed: bad hash');
  }

  if (status === 'success') {
    // BURADA BAŞARILI ÖDEME İŞLEMLERİ YAPILABİLİR
    // Örn: Veritabanında siparişin durumunu "ödendi" olarak güncelleme
    console.log(`Ödeme başarılı! Sipariş No: ${merchant_oid}`);
  } else {
    // Ödeme başarısız veya iptal
    console.log(`Ödeme başarısız. Sipariş No: ${merchant_oid}`);
  }

  // PayTR sunucusuna mutlaka "OK" dönülmesi gerekir, aksi takdirde hata vermeye devam eder
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send('OK');
}