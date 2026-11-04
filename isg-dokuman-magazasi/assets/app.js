document.addEventListener('DOMContentLoaded', () => {
  const SUPABASE_URL = 'https://wcerczmsamjrntmrkjpo.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_GQQhcCdhqQAU4-N3N3-AIA_MwtUi5XV';
  
  const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

  let products = [];
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
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
  updateCartCount();

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function updateCartCount() {
    if (cartCount) cartCount.textContent = cart.length;
  }

  // Ziyaretçi Sayacı Fonksiyonu Eksiksiz Tanımlandı
  async function trackVisitor() {
    if (!supabaseClient) return;
    if (sessionStorage.getItem('visited')) return;
    try {
      let { data } = await supabaseClient.from('stats').select('*').limit(1).maybeSingle();
      if (data) {
        const newCount = (data.visitor_count || 420) + 1;
        await supabaseClient.from('stats').update({ visitor_count: newCount }).not('visitor_count', 'is', null);
        sessionStorage.setItem('visited', 'true');
      } else {
        await supabaseClient.from('stats').insert([{ visitor_count: 421 }]);
        sessionStorage.setItem('visited', 'true');
      }
    } catch (err) {
      console.error('Ziyaretçi sayacı güncellenemedi:', err);
    }
  }

  function cleanDescription(text) {
    if (!text) return 'Profesyonel İSG doküman şablonu.';
    return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*(.*?)/g, '$1').trim();
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
      const fmtLower = format.toLowerCase();
      if (fmtLower.includes('excel') || fmtLower.includes('xls')) formatIcon = '📊';
      else if (fmtLower.includes('pdf')) formatIcon = '📑';

      return `
        <article class="product-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; position:relative;">
          <div class="product-badge" style="position:absolute; top:10px; left:10px; background:#dc2626; color:#fff; font-size:9px; padding:4px 8px; border-radius:4px; font-weight:700; z-index:2;">${tag}</div>
          
          <div class="product-card-preview" data-id="${p.id}" style="cursor: pointer; height: 140px; background: #f8faf7; border-bottom: 1px solid #eee; display: flex; align-items: center; justify-content: center; position: relative;">
            <div style="position: absolute; font-size: 14px; font-weight: 900; color: rgba(224, 0, 24, 0.1); transform: rotate(-25deg); pointer-events: none;">ÖRNEK FİLGIRAN</div>
            <span style="font-size:12px; font-weight:bold; color:#64748b;">${title}</span>
          </div>

          <div style="padding: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color:#64748b; margin-bottom:8px;">
              <span>${formatIcon} ${format}</span>
              <span>${pages} Sayfa</span>
            </div>
            <h3 style="font-size: 14px; font-weight:700; color:#0f172a; margin:0 0 8px 0; height:36px; overflow:hidden;">${title}</h3>
            <p style="font-size: 12px; color:#475569; margin:0 0 15px 0; height:32px; overflow:hidden;">${cleanDesc}</p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-top:1px solid #f1f5f9; padding-top:10px;">
              <span style="font-weight: 800; font-size: 16px; color:#0f172a;">${price} TL</span>
              <button class="btn-inspect" data-id="${p.id}" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Ürünü İncele ↗</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Tıklama olaylarını güvenli dinle
  document.addEventListener('click', (e) => {
    const inspectBtn = e.target.closest('.btn-inspect, .product-card-preview');
    if (inspectBtn) {
      const id = inspectBtn.dataset.id;
      if (id) openPreview(id);
    }
  });

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

  function openPreview(id) {
    const p = products.find(item => item.id == id);
    if (!p) return;
    currentModalProduct = p;

    const title = p.title || p.name || 'İsimsiz Şablon';
    const cleanDesc = cleanDescription(p.description);

    const setSafeText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setSafeText('modalCategory', p.category || 'İSG Şablonu');
    setSafeText('modalTitle', title);
    setSafeText('paperTitle', `ÖNİZLEME: ${title}`);
    setSafeText('modalDescription', cleanDesc);
    setSafeText('modalPrice', `${p.price} TL`);
    setSafeText('modalFormat', `Format: ${p.format || 'Word'}`);
    setSafeText('modalPages', `Sayfa: ${p.pages || 5}`);

    const includesList = document.getElementById('modalIncludes');
    if (includesList) {
      const includes = Array.isArray(p.includes) ? p.includes : ['Düzenlenebilir dosya', 'Örnek tablolar ve alanlar'];
      includesList.innerHTML = includes.map(inc => `<li>✓ ${inc}</li>`).join('');
    }

    const modal = document.getElementById('previewModal');
    if (modal) modal.removeAttribute('hidden');
  }

  const closeModalBtn = document.getElementById('closeModal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('previewModal');
      if (modal) modal.setAttribute('hidden', 'true');
    });
  }

  const buyButton = document.getElementById('buyButton');
  if (buyButton) {
    buyButton.addEventListener('click', () => {
      if (!currentModalProduct) return;
      const exists = cart.some(item => item.id === currentModalProduct.id);
      if (!exists) {
        cart.push(currentModalProduct);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        showToast(`"${currentModalProduct.title || currentModalProduct.name}" sepete eklendi!`);
      } else {
        showToast('Bu ürün zaten sepetinizde.');
      }
      const modal = document.getElementById('previewModal');
      if (modal) modal.setAttribute('hidden', 'true');
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
            <h4 style="margin: 0; font-size: 14px;">${item.title || item.name}</h4>
            <small style="color: #64748b;">${price} TL</small>
          </div>
          <button onclick="removeFromCart(${index})" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Kaldır</button>
        </div>
      `;
    }).join('');

    if (cartTotalPrice) cartTotalPrice.textContent = `${total} TL`;
  }

  window.removeFromCart = function(index) {
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
  };

  const checkoutButton = document.getElementById('checkoutButton');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Sepetiniz boş.');
        return;
      }
      const emailInput = document.getElementById('customerEmail');
      const customerEmail = emailInput ? emailInput.value.trim() : '';

      if (!customerEmail || !customerEmail.includes('@')) {
        alert('Lütfen geçerli bir e-posta adresi girin.');
        if (emailInput) emailInput.focus();
        return;
      }

      localStorage.setItem('lastPurchasedCart', JSON.stringify(cart));
      localStorage.setItem('customerEmail', customerEmail);
      window.location.href = 'basarili.html';
    });
  }

  fetchProducts();
  trackVisitor();
});