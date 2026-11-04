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
    const merchant_id = "170404";
    const merchant_key = "bkhoftywDU4nFUUW";
    const merchant_salt = "HpP2ZuXuYEqiRnaj";

    // Sipariş detayları
    const merchant_oid = "ISG" + Date.now();
    const client_ip = user_ip || "176.240.0.1";
    
    // Toplam Tutar Hesaplama (Kuruş cinsinden)
    const totalAmountFloat = cart.reduce((sum: number, item: any) => sum + Number(item.price || 99), 0);
    const payment_amount = Math.round(totalAmountFloat * 100);

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

    const timeout_limit = "30";
    const currency = "TL";
    const test_mode = "0";
    const no_shipping = "1";
    const max_installment = "0"; // Taksit istemediğimiz için "0" olmalı

    // Hash string oluşturulurken PayTR kurallarına tam uyum sağlanıyor
    const hashStr = `${merchant_id}${client_ip}${merchant_oid}${email}${payment_amount}${user_basket_base64}${no_shipping}${currency}${test_mode}${max_installment}${merchant_salt}`;
    const token = createHmac("sha256", merchant_key).update(hashStr).digest("base64");

    // PayTR API isteği (Parametreler eksiksiz eklendi)
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
      max_installment,
      no_installment: "1", // Tek çekim zorunluluğu / Taksit kapalı
      web_force_token: "0",
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