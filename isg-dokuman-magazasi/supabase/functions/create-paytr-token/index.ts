import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, cart, user_ip } = await req.json();

    // PayTR Kurumsal Bilgileri
    const merchant_id = "770404";
    const merchant_key = "bkhoftywDU4nFUUy";
    const merchant_salt = "HpP2ZuXuYEqiRnQj";

    // Sipariş detayları
    const merchant_oid = "ISG" + Date.now(); // Benzersiz sipariş numarası
    const client_ip = user_ip || "176.240.0.1"; // Kullanıcı IP adresi
    
    // Toplam Tutar Hesaplama (Kuruş cinsinden olmalı, örn: 99 TL -> 9900)
    const totalAmountFloat = cart.reduce((sum: number, item: any) => sum + Number(item.price || 99), 0);
    const payment_amount = Math.round(totalAmountFloat * 100);

    // Başarılı ve Hatalı dönüş URL'leri
    const merchant_ok_url = "https://isgdokumanmarketi.vercel.app/basarili.html"; 
    const merchant_fail_url = "https://isgdokumanmarketi.vercel.app/index.html";

    // Sepet Formatı
    const user_basket = JSON.stringify(
      cart.map((item: any) => [
        item.title || item.name || "İSG Dokümanı",
        String(Number(item.price || 99).toFixed(2)),
        1
      ])
    );
    const user_basket_base64 = btoa(unescape(encodeURIComponent(user_basket)));

    // Standart Parametreler
    const timeout_limit = "30";
    const currency = "TL";
    const test_mode = "0"; // Canlı ortam için "0"
    const no_shipping = "1";

    // Token Hash Hesabı
    const hashStr = `${merchant_id}${client_ip}${merchant_oid}${email}${payment_amount}${user_basket_base64}${no_shipping}${currency}${test_mode}${merchant_salt}`;
    const token = createHmac("sha256", merchant_key).update(hashStr).digest("base64");

    // PayTR API isteği
    const formData = new URLSearchParams({
      merchant_id,
      user_ip: client_ip,
      merchant_oid,
      email,
      payment_amount: String(payment_amount),
      paytr_token: token,
      user_basket: user_basket_base64,
      debug_on: "1",
      no_shipping,
      max_installment: "0",
      web_force_token: "0",
      post_url: "",
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit,
      currency,
      test_mode
    });

    const paytrResponse = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });

    const result = await paytrResponse.json();

    if (result.status === "success") {
      return new Response(JSON.stringify({ status: "success", token: result.token, merchant_oid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ status: "failed", reason: result.reason }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ status: "error", message: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400
    });
  }
});