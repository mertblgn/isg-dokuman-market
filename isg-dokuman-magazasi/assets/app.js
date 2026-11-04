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

  // Tıklama olaylarını güvenli bir şekilde dinleme (İncele butonu ve kart önizlemesi)
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

    let modal = document.getElementById('previewModal');
    if (!modal) {
      // Eğer HTML içinde modal yoksa dinamik olarak oluştur
      modal = document.createElement('div');
      modal.id = 'previewModal';
      modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;';
      modal.innerHTML = `
        <div style="background: white; width: 100%; max-width: 600px; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);">
          <div style="background: #111; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;">
            <b style="font-size: 14px;">Ürün Önizleme ve Detayları</b>
            <button id="closeModalBtn" style="background: transparent; border: none; color: white; font-size: 18px; cursor: pointer;">✕</button>
          </div>
          <div style="padding: 20px; max-height: 75vh; overflow-y: auto;">
            <div id="modalWatermarkPreview" style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; height: 160px; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 15px; overflow: hidden;">
              <div style="position: absolute; font-size: 20px; font-weight: 900; color: rgba(224, 0, 24, 0.12); transform: rotate(-25deg); pointer-events: none;">ÖRNEK FİLGIRANLI GÖRÜNÜM</div>
              <span id="modalWatermarkTitle" style="font-weight: 700; color: #475569; font-size: 13px; text-align: center; padding: 0 10px;"></span>
            </div>
            <span id="modalCategory" style="background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;"></span>
            <h2 id="modalTitle" style="font-size: 18px; color: #0f172a; margin: 8px 0;"></h2>
            <p id="modalDescription" style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 15px;"></p>
            <div id="modalPrice" style="font-size: 22px; font-weight: 800; color: #dc2626; margin-bottom: 15px;"></div>
            <div style="display: flex; gap: 10px; font-size: 12px; color: #64748b; margin-bottom: 15px;">
              <span id="modalFormat"></span> | <span id="modalPages"></span>
            </div>
            <button id="modalAddToCartBtn" style="width: 100%; background: #dc2626; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;">
              🛒 Sepete Ekle
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('closeModalBtn').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
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
        modal.style.display = 'none';
      });
    } else {
      modal.style.display = 'flex';
    }

    document.getElementById('modalCategory').textContent = p.category || 'İSG Şablonu';
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalWatermarkTitle').textContent = `ÖNİZLEME: ${title}`;
    document.getElementById('modalDescription').textContent = cleanDesc;
    document.getElementById('modalPrice').textContent = `${p.price} TL`;
    document.getElementById('modalFormat').textContent = `Format: ${p.format || 'Word'}`;
    document.getElementById('modalPages').textContent = `Sayfa: ${p.pages || 5}`;
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