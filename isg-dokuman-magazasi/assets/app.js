// Ziyaretçi Sayacını Artır (Sadece ana sayfaya girildiğinde çalışır)
  async function trackVisitor() {
    if (!supabaseClient) return;
    
    // Oturum başına sadece 1 kez sayması için (tarayıcı kapatılana kadar tekrar saymaz)
    if (sessionStorage.getItem('visited')) return;
    
    try {
      let { data, error } = await supabaseClient.from('stats').select('*').limit(1).single();
      
      if (data) {
        const newCount = (data.visitor_count || 420) + 1;
        await supabaseClient.from('stats').update({ visitor_count: newCount }).eq('id', data.id);
        sessionStorage.setItem('visited', 'true');
      } else {
        // Eğer stats tablosunda hiç kayıt yoksa ilk kaydı oluşturur
        await supabaseClient.from('stats').insert([{ visitor_count: 421 }]);
        sessionStorage.setItem('visited', 'true');
      }
    } catch (err) {
      console.error('Ziyaretçi sayacı güncellenemedi:', err);
    }
  }

  // Sayfa yüklendiğinde çalıştır
  trackVisitor();