// データの読み込み
let localProducts = JSON.parse(localStorage.getItem('bakery-products')) || products;
let cart = JSON.parse(localStorage.getItem('bakery-cart')) || [];
let isAdmin = sessionStorage.getItem('bakery-is-admin') === 'true';

document.addEventListener('DOMContentLoaded', () => {
    displayProducts();
    displayAdminProducts();
    updateCartCount();
    setupCartModal();
    setupAdminToggle();
    checkAdminState();
});

function checkAdminState() {
    const section = document.getElementById('admin-section');
    const toggleBtn = document.getElementById('admin-toggle');
    if (isAdmin) {
        section.style.display = 'block';
        toggleBtn.innerText = '管理画面を閉じる';
    } else {
        section.style.display = 'none';
        toggleBtn.innerText = '商品管理';
    }
}

function displayProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    productList.innerHTML = localProducts.map(product => `
        <div class="product-card">
            <div class="product-image">${product.placeholder}</div>
            <div class="product-info">
                <h4>${product.name}</h4>
                <p>${product.description}</p>
                <span class="product-price">¥${product.price.toLocaleString()}</span>
                <button class="btn-add" onclick="addToCart(${product.id})">予約リストに追加</button>
            </div>
        </div>
    `).join('');
}

function displayAdminProducts() {
    const adminList = document.getElementById('admin-product-list');
    if (!adminList) return;

    adminList.innerHTML = localProducts.map(product => `
        <div class="admin-item">
            <span>${product.placeholder} <strong>${product.name}</strong> - ¥${product.price}</span>
            <button onclick="deleteProduct(${product.id})" style="color: red; border: none; background: none; cursor: pointer;">削除</button>
        </div>
    `).join('');
}

function addNewProduct() {
    const name = document.getElementById('new-p-name').value;
    const price = parseInt(document.getElementById('new-p-price').value);
    const desc = document.getElementById('new-p-desc').value;
    const icon = document.getElementById('new-p-icon').value || "🍞";

    if (!name || isNaN(price)) {
        alert("名前と価格を入力してください。");
        return;
    }

    const newProduct = {
        id: Date.now(),
        name: name,
        price: price,
        description: desc,
        placeholder: icon
    };

    localProducts.push(newProduct);
    saveProducts();
    displayProducts();
    displayAdminProducts();

    // クリア
    document.getElementById('new-p-name').value = '';
    document.getElementById('new-p-price').value = '';
    document.getElementById('new-p-desc').value = '';
    document.getElementById('new-p-icon').value = '';
}

function deleteProduct(id) {
    if (!confirm("この商品を削除しますか？")) return;
    localProducts = localProducts.filter(p => p.id !== id);
    saveProducts();
    displayProducts();
    displayAdminProducts();
}

function saveProducts() {
    localStorage.setItem('bakery-products', JSON.stringify(localProducts));
}

function addToCart(productId) {
    const product = localProducts.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartCount();
    alert(`${product.name}を予約リストに追加しました！`);
}

function updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.innerText = totalItems;
}

function saveCart() {
    localStorage.setItem('bakery-cart', JSON.stringify(cart));
}

function setupCartModal() {
    const modal = document.getElementById('cart-modal');
    const btn = document.getElementById('cart-button');
    const span = document.getElementsByClassName('close')[0];
    const showCheckoutBtn = document.getElementById('show-checkout-btn');
    const checkoutForm = document.getElementById('checkout-form-container');

    btn.onclick = () => {
        renderCart();
        modal.style.display = 'block';
        checkoutForm.style.display = 'none';
        showCheckoutBtn.style.display = cart.length > 0 ? 'block' : 'none';
    }

    span.onclick = () => {
        modal.style.display = 'none';
    }

    showCheckoutBtn.onclick = () => {
        checkoutForm.style.display = 'block';
        showCheckoutBtn.style.display = 'none';
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const totalPrice = document.getElementById('total-price');

    if (cart.length === 0) {
        cartItems.innerHTML = '<p>予約リストは空です。</p>';
        totalPrice.innerText = '0';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong> x ${item.quantity}
            </div>
            <div>
                ¥${(item.price * item.quantity).toLocaleString()}
                <button onclick="removeFromCart(${item.id})" style="margin-left: 10px; cursor: pointer; border:none; background:none; color:#999;">[削除]</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalPrice.innerText = total.toLocaleString();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCart();

    if (cart.length === 0) {
        document.getElementById('show-checkout-btn').style.display = 'none';
        document.getElementById('checkout-form-container').style.display = 'none';
    }
}

function setupAdminToggle() {
    const btn = document.getElementById('admin-toggle');
    const modal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('close-login');

    btn.onclick = () => {
        if (isAdmin) {
            // すでにログイン中なら表示切り替え
            const section = document.getElementById('admin-section');
            const isHidden = section.style.display === 'none';
            section.style.display = isHidden ? 'block' : 'none';
            btn.innerText = isHidden ? '管理画面を閉じる' : '商品管理';
        } else {
            // 未ログインならログインモーダル表示
            modal.style.display = 'block';
        }
    };

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
}

const ADMIN_PASS = "bakery2026"; // 暫定のパスワード

function attemptLogin() {
    const pass = document.getElementById('admin-password').value;
    const errorMsg = document.getElementById('login-error');

    if (pass === ADMIN_PASS) {
        isAdmin = true;
        sessionStorage.setItem('bakery-is-admin', 'true');
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('admin-password').value = '';
        errorMsg.style.display = 'none';
        checkAdminState();
    } else {
        errorMsg.style.display = 'block';
    }
}

function logout() {
    if (!confirm("ログアウトしますか？")) return;
    isAdmin = false;
    sessionStorage.removeItem('bakery-is-admin');
    checkAdminState();
}

function confirmReservation() {
    const name = document.getElementById('res-name').value;
    const date = document.getElementById('res-date').value;
    const email = document.getElementById('res-email').value;

    if (!name || !date || !email) {
        alert("すべての項目を入力してください。");
        return;
    }

    // カートを空にする
    cart = [];
    saveCart();
    updateCartCount();

    // モーダルを切り替え
    document.getElementById('cart-modal').style.display = 'none';
    alert("予約が完了しました！\nご来店をお待ちしております。");
    location.reload();
}

function closeSuccessModal() {
    document.getElementById('success-modal').style.display = 'none';
    location.reload(); // 状態をリセット
}
