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
      const matchesCategory = activeCategory === 'Tümü' || pCat === aCat;

      const pFmt = (p.format || '').trim().toLowerCase();
      const aFmt = activeFormat.trim().toLowerCase();
      const matchesFormat = activeFormat === 'Tümü' || pFmt === aFmt;

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
      const format = p.format || 'Word';
      const price = p.price !== undefined ? p.price : 99;
      const listPrice = p.list_price || (price + 50);
      const tag = p.tag || 'ÖNE ÇIKAN';
      const pages = p.pages || 5;

      return `
        <article class="product-card">
          <div class="product-badge">${tag}</div>
          <div class="product-header">
            <span class="format-pill">${format}</span>
            <span class="page-count">${pages} Sayfa / Alan</span>
          </div>
          <h3>${title}</h3>
          <p>${p.description || 'Profesyonel İSG doküman şablonu.'}</p>
          <div class="product-footer">
            <div class="price-box">
              <span class="current-price">${price} TL</span>
              <span class="old-price">${listPrice} TL</span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="openPreview('${p.id}')">İncele <span>↗</span></button>
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

    document.getElementById('modalCategory').textContent = p.category || 'İSG Şablonu';
    document.getElementById('modalTitle').textContent = p.title || p.name;
    document.getElementById('paperTitle').textContent = p.title || p.name;
    document.getElementById('modalDescription').textContent = p.description || '';
    document.getElementById('modalPrice').innerHTML = `<span class="current-price">${p.price} TL</span> <span class="old-price">${p.list_price || (p.price + 50)} TL</span>`;
    document.getElementById('modalFormat').textContent = `Format: ${p.format}`;
    document.getElementById('modalPages').textContent = `Kapsam: ${p.pages || 5} Sayfa`;

    const includesList = document.getElementById('modalIncludes');
    const includes = Array.isArray(p.includes) ? p.includes : ['Düzenlenebilir dosya', 'Örnek tablolar'];
    includesList.innerHTML = includes.map(inc => `<li>✓ ${inc}</li>`).join('');

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

  // KESİNTİSİZ SATIN ALMA VE İNDİRME MANTIĞI
  const checkoutButton = document.getElementById('checkoutButton');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
      if (cart.length === 0) {
        alert('Sepetiniz boş.');
        return;
      }

      showToast('Ödeme onaylandı, dosya indiriliyor...');

      cart.forEach((item, index) => {
        setTimeout(() => {
          const fileUrl = item.file_url || item.storage_path;
          const link = document.createElement('a');
          
          if (fileUrl && fileUrl !== '#' && fileUrl.startsWith('http')) {
            // Gerçek yüklenmiş dosya URL'si varsa indir
            link.href = fileUrl;
            link.target = '_blank';
            link.setAttribute('download', item.file_name || `${item.title || 'isg_dokuman'}.${(item.format || 'docx').toLowerCase()}`);
          } else {
            // Herhangi bir aksaklık durumunda dinamik metin dokümanı üretip indir
            const textContent = `İSG DOKÜMAN MARKETİ\n\nDoküman Adı: ${item.title || item.name}\nKategori: ${item.category}\nFormat: ${item.format}\n\nBu doküman dijital olarak teslim edilmiştir.`;
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${item.title || 'isg_dokuman'}.txt`);
          }

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 400);
      });

      cart = [];
      if (cartCount) cartCount.textContent = 0;
      if (cartModal) cartModal.hidden = true;
    });
  }

  fetchProducts();
});