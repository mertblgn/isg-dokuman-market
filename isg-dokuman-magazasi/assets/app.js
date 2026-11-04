document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* =========================================================
     AYARLAR
  ========================================================= */
  const SUPABASE_URL = 'https://wcerczmsamjrntmrkjpo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_GQQhcCdhqQAU4-N3N3-AIA_MwtUi5XV';
  const BASE_VISITOR_COUNT = 420;
  const DEFAULT_PRICE = 99;
  const TOAST_DURATION = 3000;

  const supabaseClient = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /* =========================================================
     DURUM (STATE)
  ========================================================= */
  let products = [];
  let cart = loadCart();
  let activeCategory = 'Tümü';
  let activeFormat = 'Tümü';
  let currentModalProduct = null;
  let toastTimer = null;

  /* =========================================================
     DOM ELEMANLARI
  ========================================================= */
  const $ = (id) => document.getElementById(id);

  const productGrid = $('productGrid');
  const emptyState = $('emptyState');
  const searchInput = $('searchInput');
  const sortSelect = $('sortSelect');
  const resultCount = $('resultCount');
  const categoryGrid = $('categoryGrid');
  const cartCount = $('cartCount');
  const yearSpan = $('year');

  const previewModal = $('previewModal');
  const closeModalBtn = $('closeModal');
  const buyButton = $('buyButton');

  const cartButton = $('cartButton');
  const cartModal = $('cartModal');
  const closeCartModalBtn = $('closeCartModal');
  const cartItemList = $('cartItemList');
  const cartTotalPrice = $('cartTotalPrice');
  const checkoutButton = $('checkoutButton');

  /* =========================================================
     YARDIMCI FONKSİYONLAR
  ========================================================= */

  function escapeHtml(value) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, (ch) => map[ch]);
  }

  function normalize(value) {
    return String(value ?? '')
      .toLocaleLowerCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ı/g, 'i')
      .trim();
  }

  const isAll = (value) => normalize(value) === 'tumu';

  function getTitle(p) {
    return p.title || p.name || 'İsimsiz Şablon';
  }

  function getPrice(p) {
    const n = Number(p.price);
    return p.price !== null && p.price !== undefined && p.price !== '' && Number.isFinite(n)
      ? n
      : DEFAULT_PRICE;
  }

  function formatPrice(n) {
    return `${Number(n).toLocaleString('tr-TR')} TL`;
  }

  function getFormat(p) {
    return String(p.format || 'Word').trim();
  }

  function getFormatIcon(format) {
    const f = format.toLowerCase();
    if (f.includes('excel') || f.includes('xls')) return '📊';
    if (f.includes('pdf')) return '📑';
    return '📄';
  }

  function cleanDescription(text) {
    if (!text) return 'Profesyonel İSG doküman şablonu.';
    return String(text)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseIncludes(value) {
    const fallback = ['Düzenlenebilir dosya', 'Örnek tablolar ve alanlar'];
    let list = value;
    if (typeof list === 'string') {
      try {
        list = JSON.parse(list);
      } catch (err) {
        list = list.split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean);
      }
    }
    return Array.isArray(list) && list.length ? list.map(String) : fallback;
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function showToast(msg) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), TOAST_DURATION);
  }

  function openModal(el) {
    if (el) el.hidden = false;
  }

  function closeModal(el) {
    if (el) el.hidden = true;
  }

  /* =========================================================
     SEPET (localStorage)
  ========================================================= */
  function loadCart() {
    try {
      const parsed = JSON.parse(localStorage.getItem('cart'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (err) {
      console.warn('Sepet kaydedilemedi:', err);
    }
  }

  function updateCartCount() {
    if (cartCount) cartCount.textContent = cart.length;
  }

  function syncCartWithProducts() {
    if (!cart.length || !products.length) return;
    const byId = new Map(products.map((p) => [String(p.id), p]));
    const before = cart.length;
    cart = cart.map((item) => byId.get(String(item.id))).filter(Boolean);
    saveCart();
    updateCartCount();
    if (cart.length < before) {
      showToast('Sepetinizdeki bazı ürünler artık satışta olmadığı için kaldırıldı.');
    }
  }

  function renderCartItems() {
    if (!cartItemList) return;

    if (cart.length === 0) {
      cartItemList.innerHTML = '<p class="cart-empty">Sepetiniz henüz boş.</p>';
      if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(0);
      return;
    }

    let total = 0;
    cartItemList.innerHTML = cart
      .map((item) => {
        const price = getPrice(item);
        total += price;
        return `
          <div class="cart-item">
            <div>
              <p class="cart-item-title">${escapeHtml(getTitle(item))}</p>
              <small>${formatPrice(price)}</small>
            </div>
            <button type="button" class="btn-remove" data-remove-id="${escapeHtml(item.id)}">Kaldır</button>
          </div>
        `;
      })
      .join('');

    if (cartTotalPrice) cartTotalPrice.textContent = formatPrice(total);
  }

  /* =========================================================
     ZİYARETÇİ SAYACI
  ========================================================= */
  function hasVisited() {
    try {
      return Boolean(sessionStorage.getItem('visited'));
    } catch (err) {
      return false;
    }
  }

  function markVisited() {
    try {
      sessionStorage.setItem('visited', 'true');
    } catch (err) {
      /* sessionStorage kullanılamıyorsa sessizce geç */
    }
  }

  async function trackVisitor() {
    if (!supabaseClient || hasVisited()) return;

    try {
      const { data, error } = await supabaseClient
        .from('stats')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      let writeError = null;

      if (data) {
        const current = Number(data.visitor_count);
        const newCount = (Number.isFinite(current) ? current : BASE_VISITOR_COUNT) + 1;

        let query = supabaseClient.from('stats').update({ visitor_count: newCount });
        query = data.id !== undefined
          ? query.eq('id', data.id)
          : query.not('visitor_count', 'is', null);

        ({ error: writeError } = await query);
      } else {
        ({ error: writeError } = await supabaseClient
          .from('stats')
          .insert([{ visitor_count: BASE_VISITOR_COUNT + 1 }]));
      }

      if (writeError) throw writeError;

      markVisited();
    } catch (err) {
      console.error('Ziyaretçi sayacı güncellenemedi:', err);
    }
  }

  /* =========================================================
     ÜRÜNLER
  ========================================================= */
  function showLoadError() {
    if (productGrid) {
      productGrid.innerHTML =
        '<p class="product-grid-message">Şablonlar yüklenemedi. Lütfen sayfayı yenileyip tekrar deneyin.</p>';
    }
    if (resultCount) resultCount.textContent = '0 şablon';
    showToast('Ürünler yüklenirken bir sorun oluştu.');
  }

  async function fetchProducts() {
    if (!supabaseClient) {
      console.error('Supabase kütüphanesi yüklenemedi.');
      showLoadError();
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      products = Array.isArray(data) ? data : [];
      syncCartWithProducts();
      renderProducts();
    } catch (err) {
      console.error('Supabase hatası:', err);
      showLoadError();
    }
  }

  function matchesCategory(p) {
    if (isAll(activeCategory)) return true;
    const pCat = normalize(p.category);
    const aCat = normalize(activeCategory);
    if (!pCat) return false;
    return pCat === aCat || pCat.includes(aCat) || aCat.includes(pCat);
  }

  function matchesFormat(p) {
    if (isAll(activeFormat)) return true;
    return normalize(getFormat(p)).includes(normalize(activeFormat));
  }

  function matchesSearch(p) {
    const term = searchInput ? normalize(searchInput.value) : '';
    if (!term) return true;
    return normalize(getTitle(p)).includes(term) || normalize(p.description).includes(term);
  }

  function renderProducts() {
    if (!productGrid) return;

    const filtered = products.filter((p) => matchesCategory(p) && matchesFormat(p) && matchesSearch(p));

    const sortVal = sortSelect ? sortSelect.value : 'featured';
    if (sortVal === 'price-low') {
      filtered.sort((a, b) => getPrice(a) - getPrice(b));
    } else if (sortVal === 'price-high') {
      filtered.sort((a, b) => getPrice(b) - getPrice(a));
    }

    if (resultCount) resultCount.textContent = `${filtered.length} şablon`;

    if (filtered.length === 0) {
      productGrid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    productGrid.innerHTML = filtered
      .map((p) => {
        const title = getTitle(p);
        const format = getFormat(p);
        const price = getPrice(p);
        const listPrice = Number(p.list_price);
        const hasDiscount = Number.isFinite(listPrice) && listPrice > price;
        const tag = p.tag || 'ÖNE ÇIKAN';
        const pages = p.pages || 5;
        const desc = cleanDescription(p.description);

        const id = escapeHtml(p.id);

        return `
          <article class="product-card">
            <span class="product-badge">${escapeHtml(tag)}</span>

            <div class="product-card-preview" data-id="${id}">
              <span class="watermark" aria-hidden="true">ÖRNEK FİLİGRAN</span>
              <span class="preview-title">${escapeHtml(title)}</span>
            </div>

            <div class="product-info">
              <div class="product-meta">
                <span>${getFormatIcon(format)} ${escapeHtml(format)}</span>
                <span>${escapeHtml(pages)} Sayfa</span>
              </div>
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(desc)}</p>

              <div class="product-footer">
                <span class="price-wrap">
                  ${hasDiscount ? `<s class="price-old">${formatPrice(listPrice)}</s>` : ''}
                  <span class="price">${formatPrice(price)}</span>
                </span>
                <button type="button" class="btn-inspect" data-id="${id}">Ürünü İncele ↗</button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /* =========================================================
     ÖNİZLEME MODALI
  ========================================================= */
  function openPreview(id) {
    const p = products.find((item) => String(item.id) === String(id));
    if (!p) return;
    currentModalProduct = p;

    const title = getTitle(p);

    setText('modalCategory', p.category || 'İSG Şablonu');
    setText('modalTitle', title);
    setText('paperTitle', `ÖNİZLEME: ${title}`);
    setText('modalDescription', cleanDescription(p.description));
    setText('modalPrice', formatPrice(getPrice(p)));
    setText('modalFormat', `Format: ${getFormat(p)}`);
    setText('modalPages', `Sayfa: ${p.pages || 5}`);

    const includesList = $('modalIncludes');
    if (includesList) {
      includesList.innerHTML = parseIncludes(p.includes)
        .map((inc) => `<li>✓ ${escapeHtml(inc)}</li>`)
        .join('');
    }

    openModal(previewModal);
  }

  /* =========================================================
     OLAY DİNLEYİCİLERİ
  ========================================================= */

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn-inspect, .product-card-preview');
    if (target && target.dataset.id) openPreview(target.dataset.id);
  });

  if (categoryGrid) {
    categoryGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.category-tile');
      if (!tile) return;
      document.querySelectorAll('.category-tile').forEach((t) => t.classList.remove('active'));
      tile.classList.add('active');
      activeCategory = tile.dataset.category || 'Tümü';
      renderProducts();
    });
  }

  document.querySelectorAll('.format-filter').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.format-filter').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFormat = btn.dataset.format || 'Tümü';
      renderProducts();
    });
  });

  if (searchInput) searchInput.addEventListener('input', renderProducts);
  if (sortSelect) sortSelect.addEventListener('change', renderProducts);

  if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal(previewModal));

  if (buyButton) {
    buyButton.addEventListener('click', () => {
      if (!currentModalProduct) return;

      const exists = cart.some((item) => String(item.id) === String(currentModalProduct.id));
      if (exists) {
        showToast('Bu ürün zaten sepetinizde.');
      } else {
        cart.push(currentModalProduct);
        saveCart();
        updateCartCount();
        showToast(`"${getTitle(currentModalProduct)}" sepete eklendi!`);
      }
      closeModal(previewModal);
    });
  }

  if (cartButton) {
    cartButton.addEventListener('click', () => {
      renderCartItems();
      openModal(cartModal);
    });
  }

  if (closeCartModalBtn) closeCartModalBtn.addEventListener('click', () => closeModal(cartModal));

  if (cartItemList) {
    cartItemList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-id]');
      if (!btn) return;
      const removeId = btn.dataset.removeId;
      cart = cart.filter((item) => String(item.id) !== removeId);
      saveCart();
      updateCartCount();
      renderCartItems();
    });
  }

  [previewModal, cartModal].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeModal(previewModal);
    closeModal(cartModal);
  });

  /* =========================================================
     ÖDEME ADIMI (GERÇEK PAYTR İSTEĞİ)
  ========================================================= */
  if (checkoutButton) {
    checkoutButton.addEventListener('click', async () => {
      if (cart.length === 0) {
        showToast('Sepetiniz boş.');
        return;
      }

      const emailInput = $('customerEmail');
      const customerEmail = emailInput ? emailInput.value.trim() : '';
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(customerEmail)) {
        showToast('Lütfen geçerli bir e-posta adresi girin.');
        if (emailInput) emailInput.focus();
        return;
      }

      try {
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'PayTR Ödeme Sayfasına Bağlanılıyor...';

        // Kullanıcının IP adresini alıyoruz
        let userIp = '176.240.0.1';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          userIp = ipData.ip;
        } catch (e) {
          console.warn('IP adresi otomatik alınamadı.');
        }

        // Supabase Edge Function'a İstek Gönderiyoruz
        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-paytr-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            email: customerEmail,
            cart: cart,
            user_ip: userIp
          })
        });

        const data = await response.json();

        if (data.status === 'success' && data.token) {
          localStorage.setItem('lastPurchasedCart', JSON.stringify(cart));
          localStorage.setItem('customerEmail', customerEmail);

          showToast('Güvenli ödeme sayfasına yönlendiriliyorsunuz...');
          
          // PayTR ödeme sayfasına canlı yönlendirme yapılıyor
          window.location.href = `https://www.paytr.com/odeme/guvenli/${data.token}`;
        } else {
          showToast('Ödeme başlatılamadı: ' + (data.reason || data.message || 'Bilinmeyen hata'));
          checkoutButton.disabled = false;
          checkoutButton.textContent = 'Ödemeyi Tamamla ve Satın Al';
        }

      } catch (err) {
        console.error('Ödeme hatası:', err);
        showToast('Bağlantı sırasında bir sorun oluştu.');
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Ödemeyi Tamamla ve Satın Al';
      }
    });
  }

  /* =========================================================
     BAŞLANGIÇ
  ========================================================= */
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
  updateCartCount();

  if (productGrid) {
    productGrid.innerHTML = '<p class="product-grid-message">Şablonlar yükleniyor...</p>';
  }

  fetchProducts();
  trackVisitor();
});