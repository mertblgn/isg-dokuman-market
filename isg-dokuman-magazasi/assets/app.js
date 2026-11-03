document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://wcerczmsamjrntmrkjpo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_GQQhcCdhqQAU4-N3N3-AIA_MwtUi5XV';
  
  const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  let products = [];
  let cart = [];
  let activeCategory = 'Tümü';
  let activeFormat = 'Tümü';
  let currentModalProduct = null;

  const productGrid = document.getElementById('productGrid');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const resultCount = document.getElementById('resultCount');
  const categoryGrid = document.getElementById('categoryGrid');
  const cartCount = document.getElementById('cartCount');
  const yearSpan = document.getElementById('year');

  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // Ziyaretçi Sayacını Güvenli Şekilde Artıran Fonksiyon
  async function trackVisitor() {
    if (!supabaseClient) return;
    if (sessionStorage.getItem('visited')) return;
    
    try {
      let { data, error } = await supabaseClient.from('stats').select('*').limit(1).maybeSingle();
      
      if (data) {
        const newCount = (data.visitor_count || 420) + 1;
        
        const { error: updateError } = await supabaseClient
          .from('stats')
          .update({ visitor_count: newCount })
          .not('visitor_count', 'is', null);
          
        if (!updateError) {
          sessionStorage.setItem('visited', 'true');
        }
      } else {
        await supabaseClient.from('stats').insert([{ visitor_count: 421 }]);
        sessionStorage.setItem('visited', 'true');
      }
    } catch (err) {
      console.error('Ziyaretçi sayacı güncellenemedi:', err);
    }
  }

  // Markdown ve özel sembolleri temizleyen fonksiyon
  function cleanDescription(text) {
    if (!text) return 'Profesyonel İSG doküman şablonu.';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') 
      .replace(/\*(.*?)\*(.*?)/g, '$1')  
      .replace(/[📄📌⭐🚀]/g, '')     
      .replace(/^[^\w\sÇĞİÖŞÜçğıöşü]+/, '') 
      .trim();
  }

  async function fetchProducts() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase hatası:', error);
      return;
    }

    products = data || [];
    renderProducts();
  }

  function renderProducts() {
    let filtered = products.filter(p => {
      const pCat = (p.category || '').trim().toLowerCase();
      const aCat = activeCategory.trim().toLowerCase();
      const matchesCategory = activeCategory === 'Tümü' || pCat === aCat || pCat.includes(aCat) || aCat.includes(pCat);

      const pFmt = (p.format || '').trim().toLowerCase();
      const aFmt = activeFormat.trim().toLowerCase();
      const matchesFormat = activeFormat === 'Tümü' || pFmt.includes(aFmt);

      const term = searchInput ? searchInput.value.toLowerCase() : '';
      const matchesSearch = (p.title || p.name || '').toLowerCase().includes(term) || (p.description || '').toLowerCase().includes(term);
      
      return matchesCategory && matchesFormat && matchesSearch;
    });

    const sortVal = sortSelect ? sortSelect.value : 'featured';
    if (sortVal === 'price-low') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortVal === 'price-high') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    if (resultCount) resultCount.textContent = `${filtered.length} şablon`;

    if (!productGrid) return;

    if (filtered.length === 0) {
      productGrid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    productGrid.innerHTML = filtered.map(p => {
      const title = p.title || p.name || 'İsimsiz Şablon';
      const format = (p.format || 'Word').trim();
      const price = p.price !== undefined ? p.price : 99;
      const listPrice = p.list_price || (price + 50);
      const tag = p.tag || 'ÖNE ÇIKAN';
      const pages = p.pages || 5;
      const cleanDesc = cleanDescription(p.description);

      let formatIcon = '📄';
      let formatClass = 'format-word';
      const fmtLower = format.toLowerCase();
      
      if (fmtLower.includes('excel') || fmtLower.includes('xls')) {
        formatIcon = '📊';
        formatClass = 'format-excel';
      } else if (fmtLower.includes('pdf')) {
        formatIcon = '📑';
        formatClass = 'format-pdf';
      }

      return `
        <article class="product-card">
          <div class="product-badge">${tag}</div>
          
          <div class="product-card-preview" onclick="openPreview('${p.id}')" style="cursor: pointer; height: 160px; background: #f8faf7; border-bottom: 1px solid #eee; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 15px;">
            <div style="position: absolute; font-size: 16px; font-weight: 900; color: rgba(224, 0, 24, 0.08); transform: rotate(-25deg); letter-spacing: 0.1em; pointer-events: none; text-align: center; width: 100%;">İSG DOKÜMAN MARKET</div>
            <div style="background: white; width: 100px; height: 130px; border: 1px solid #ddd; box-shadow: 0 4px 12px rgba(0,0,0,0.06); padding: 10px; font-size: 5px; color: #777; position: relative;">
              <div style="font-size:5px; color:#e00018; font-weight:bold;">T.C. İSG</div>
              <h4 style="font-size: 6px; color: #111; margin: 0 0 5px 0; border-bottom: 1px solid #e00018; padding-bottom: 3px;">${title.substring(0, 20)}...</h4>
              <div style="height:3px; background:#eee; margin-bottom:3px; width:90%;"></div>
              <div style="height:3px; background:#eee; margin-bottom:3px; width:70%;"></div>
              <div style="height:3px; background:#eee; margin-bottom:3px; width:80%;"></div>
            </div>
          </div>

          <div class="product-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px 0 16px;">
            <span class="format-pill ${formatClass}" style="font-weight: 800; font-size: 10px;">${formatIcon} ${format}</span>
            <span class="page-count" style="font-size: 10px; color: #686868;">${pages} Sayfa / Alan</span>
          </div>
          <div class="product-info">
            <h3>${title}</h3>
            <p>${cleanDesc}</p>
            <div class="product-footer">
              <div class="price-box">
                <span class="current-price" style="font-weight: 800; font-size: 16px;">${price} TL</span>
                <span class="old-price">${listPrice} TL</span>
              </div>
              <button class="btn btn-sm btn-secondary" onclick="openPreview('${p.id}')">İncele <span>↗</span></button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  if (categoryGrid) {
    categoryGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.category-tile');
      if (!tile) return;
      document.querySelectorAll('.category-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      activeCategory = tile.dataset.category;
      renderProducts();
    });
  }

  document.querySelectorAll('.format-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.format-filter').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeFormat = e.target.dataset.format;
      renderProducts();
    });
  });

  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (sortSelect) sortSelect.addEventListener('change', renderProducts);

  window.openPreview = function(id) {
    const p = products.find(item => item.id === id);
    if (!p) return;
    currentModalProduct = p;

    const title = p.title || p.name || 'İsimsiz Şablon';
    const cleanDesc = cleanDescription(p.description);

    document.getElementById('modalCategory').textContent = p.category || 'İSG Şablonu';
    document.getElementById('modalTitle').textContent = title;
    
    // Kağıt önizlemesi üzerine gerçek ürün başlığı yansıtılıyor
    const paperTitleEl = document.getElementById('paperTitle');
    if (paperTitleEl) paperTitleEl.textContent = title;

    document.getElementById('modalDescription').textContent = cleanDesc;
    
    document.getElementById('modalPrice').innerHTML = `
      <div style="display: flex; align-items: baseline; gap: 10px; margin: 8px 0 12px 0;">
        <span class="current-price" style="font-size: 24px; font-weight: 850; color: #111;">${p.price} TL</span>
        <span class="old-price" style="font-size: 14px; color: #888; text-decoration: line-through;">${p.list_price || (p.price + 50)} TL</span>
      </div>
    `;

    const formatStr = (p.format || 'Word').trim();
    let fmtIcon = '📄';
    if (formatStr.toLowerCase().includes('excel')) fmtIcon = '📊';
    if (formatStr.toLowerCase().includes('pdf')) fmtIcon = '📑';

    document.getElementById('modalFormat').innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; background: #f4f6f5; border: 1px solid #e1e8e3; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #222; margin-right: 8px;">${fmtIcon} Format: ${formatStr}</span>`;
    document.getElementById('modalPages').innerHTML = `<span style="display: inline-flex; align-items: center; gap: 6px; background: #f4f6f5; border: 1px solid #e1e8e3; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; color: #222;">📑 Kapsam: ${p.pages || 5} Sayfa</span>`;

    const includesList = document.getElementById('modalIncludes');
    const includes = Array.isArray(p.includes) ? p.includes : ['Düzenlenebilir dosya', 'Örnek tablolar', 'Kullanım kılavuzu'];
    includesList.innerHTML = includes.map(inc => `<li style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #444; margin-bottom: 6px;"><span style="color: #16a34a; font-weight: bold;">✓</span> ${inc}</li>`).join('');

    const paperPreviewEl = document.querySelector('.paper-preview');
    if (paperPreviewEl) {
      paperPreviewEl.style.filter = 'blur(4px)';
      paperPreviewEl.style.userSelect = 'none';
      paperPreviewEl.style.pointerEvents = 'none';
      paperPreviewEl.style.opacity = '0.75';
      
      let wrapper = paperPreviewEl.parentElement;
      if (!wrapper.style.position) {
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
      }
      
      let existingBanner = wrapper.querySelector('.preview-overlay-banner');
      if (!existingBanner) {
        const banner = document.createElement('div');
        banner.className = 'preview-overlay-banner';
        banner.style.cssText = 'position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(17, 17, 17, 0.4); backdrop-filter: blur(2px); color: white; text-align: center; padding: 20px; border-radius: 8px;';
        banner.innerHTML = `
          <b style="font-size: 14px; margin-bottom: 6px; color: #ffd400;">🔒 Önizleme Sınırlandırıldı</b>
          <p style="font-size: 10px; color: #f1f1f1; margin: 0;">İçeriğin tamamını görmek ve düzenlenebilir dosyayı indirmek için sepete ekleyin.</p>
        `;
        wrapper.appendChild(banner);
      }
    }

    document.getElementById('previewModal').hidden = false;
  };

  const closeModalBtn = document.getElementById('closeModal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      document.getElementById('previewModal').hidden = true;
    });
  }

  const buyButton = document.getElementById('buyButton');
  if (buyButton) {
    buyButton.addEventListener('click', () => {
      if (!currentModalProduct) return;
      cart.push(currentModalProduct);
      if (cartCount) cartCount.textContent = cart.length;
      showToast(`"${currentModalProduct.title || currentModalProduct.name}" sepete eklendi!`);
      document.getElementById('previewModal').hidden = true;
    });
  }

  const cartButton = document.getElementById('cartButton');
  const cartModal = document.getElementById('cartModal');
  const closeCartModal = document.getElementById('closeCartModal');

  if (cartButton) {
    cartButton.addEventListener('click', () => {
      renderCartItems();
      if (cartModal) cartModal.hidden = false;
    });
  }

  if (closeCartModal) {
    closeCartModal.addEventListener('click', () => {
      if (cartModal) cartModal.hidden = true;
    });
  }

  function renderCartItems() {
    const cartItemList = document.getElementById('cartItemList');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    if (!cartItemList) return;

    if (cart.length === 0) {
      cartItemList.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">Sepetiniz henüz boş.</p>`;
      if (cartTotalPrice) cartTotalPrice.textContent = '0 TL';
      return;
    }

    let total = 0;
    cartItemList.innerHTML = cart.map((item, index) => {
      const price = item.price || 0;
      total += price;
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
          <div>
            <h4 style="margin: 0; font-size: 15px;">${item.title || item.name}</h4>
            <small style="color: #64748b;">${item.format} • ${price} TL</small>
          </div>
          <button onclick="removeFromCart(${index})" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Kaldır</button>
        </div>
      `;
    }).join('');

    if (cartTotalPrice) cartTotalPrice.textContent = `${total} TL`;
  }

  window.removeFromCart = function(index) {
    cart.splice(index, 1);
    if (cartCount) cartCount.textContent = cart.length;
    renderCartItems();
  };

  const checkoutButton = document.getElementById('checkoutButton');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', async () => {
      if (cart.length === 0) {
        alert('Sepetiniz boş.');
        return;
      }

      // E-posta alanını kontrol et
      const emailInput = document.getElementById('customerEmail');
      const customerEmail = emailInput ? emailInput.value.trim() : '';

      if (!customerEmail || !customerEmail.includes('@')) {
        alert('Lütfen dosyaların gönderileceği geçerli bir e-posta adresi girin.');
        if (emailInput) emailInput.focus();
        return;
      }

      // Satın alınan ürünleri ve e-posta adresini basarili.html için hafızaya kaydet
      localStorage.setItem('lastPurchasedCart', JSON.stringify(cart));
      localStorage.setItem('customerEmail', customerEmail);

      showToast('PayTR güvenli ödeme ekranı yükleniyor...');

      try {
        const res = await fetch('/api/paytr-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            cart, 
            email: customerEmail 
          })
        });
        const data = await res.json();

        if (data.status === 'success') {
          if (cartModal) cartModal.hidden = true;
          
          let paytrModal = document.getElementById('paytrModal');
          if (!paytrModal) {
            paytrModal = document.createElement('div');
            paytrModal.id = 'paytrModal';
            paytrModal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;';
            paytrModal.innerHTML = `
              <div style="background: white; width: 100%; max-width: 900px; height: 80vh; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; position: relative;">
                <div style="background: #111; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
                  <b>Güvenli Kredi Kartı Ödeme Ekranı (PayTR)</b>
                  <button id="closePaytrModal" style="background: transparent; border: none; color: white; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <iframe id="paytriframe" src="https://www.paytr.com/odeme/guvenli/${data.token}" style="width: 100%; height: 100%; border: none;" frameborder="0"></iframe>
              </div>
            `;
            document.body.appendChild(paytrModal);
            
            document.getElementById('closePaytrModal').addEventListener('click', () => {
              paytrModal.remove();
            });
          } else {
            document.getElementById('paytriframe').src = `https://www.paytr.com/odeme/guvenli/${data.token}`;
            paytrModal.style.display = 'flex';
          }

        } else {
          alert('Ödeme başlatılamadı: ' + (data.reason || 'Sunucu hatası'));
        }
      } catch (err) {
        console.error('Ödeme hatası:', err);
        alert('Bağlantı hatası oluştu.');
      }
    });
  }

  // Başlangıç tetikleyicileri
  fetchProducts();
  trackVisitor();
});