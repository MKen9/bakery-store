// Supabase設定
const supabaseUrl = 'https://vfqiahdfwvsctgkrvucw.supabase.co';
// 注意: ここには `anon` キー (eyJから始まる文字列) が入るのが一般的です。
// 現在の値: 'sb_publishable_C3m9rLGbMpRa4FAhqrKxEw_NrBDkF_n'
const supabaseKey = 'sb_publishable_C3m9rLGbMpRa4FAhqrKxEw_NrBDkF_n';

let supabase;
try {
    if (!window.supabase) {
        throw new Error('Supabaseライブラリがロードされていません。');
    }
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (e) {
    console.error('Supabase Init Error:', e);
    alert('システムの初期化に失敗しました: ' + e.message);
}

// グローバル変数
let localProducts = [];
let cart = JSON.parse(localStorage.getItem('bakery-cart')) || [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartCount();
    setupCartModal();
    setupAdminToggle();
    checkAdminState();
});

// Supabaseから商品データを取得
async function fetchProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching products:', error);
        // テーブルがまだない場合などのエラーハンドリング
        if (error.code === '42P01') { // undefined_table
            alert('Supabaseに "products" テーブルが見つかりません。SQLを実行してテーブルを作成してください。');
        }
        return;
    }

    if (data) {
        localProducts = data;
        displayProducts();
        displayAdminProducts();
    }
}

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

    if (localProducts.length === 0) {
        productList.innerHTML = '<p style="text-align:center; width:100%;">商品が読み込まれていません。<br>管理画面から商品を追加するか、データベースを確認してください。</p>';
        return;
    }

    productList.innerHTML = localProducts.map(product => `
        <div class="product-card">
            <div class="product-image">${product.placeholder || '🍞'}</div>
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
            <span>${product.placeholder || '🍞'} <strong>${product.name}</strong> - ¥${product.price}</span>
            <button onclick="deleteProduct(${product.id})" style="color: red; border: none; background: none; cursor: pointer;">削除</button>
        </div>
    `).join('');
}

// 商品追加（Supabase）
async function addNewProduct() {
    const name = document.getElementById('new-p-name').value;
    const price = parseInt(document.getElementById('new-p-price').value);
    const desc = document.getElementById('new-p-desc').value;
    const icon = document.getElementById('new-p-icon').value || "🍞";

    if (!name || isNaN(price)) {
        alert("名前と価格を入力してください。");
        return;
    }

    const newProduct = {
        name: name,
        price: price,
        description: desc,
        placeholder: icon
    };

    const { data, error } = await supabase
        .from('products')
        .insert([newProduct]);

    if (error) {
        console.error('Error inserting product:', error);
        alert('追加に失敗しました: ' + error.message);
    } else {
        // 再取得して表示更新
        fetchProducts();

        // クリア
        document.getElementById('new-p-name').value = '';
        document.getElementById('new-p-price').value = '';
        document.getElementById('new-p-desc').value = '';
        document.getElementById('new-p-icon').value = '';
    }
}

// 商品削除（Supabase）
async function deleteProduct(id) {
    if (!confirm("この商品を削除しますか？")) return;

    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting product:', error);
        alert('削除に失敗しました: ' + error.message);
    } else {
        fetchProducts();
    }
}

// カート機能（ローカルストレージ使用）
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

// 認証状態の監視
supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        isAdmin = true;
    } else {
        isAdmin = false;
    }
    checkAdminState();
});

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

async function attemptLogin() {
    const pass = document.getElementById('admin-password').value;
    const errorMsg = document.getElementById('login-error');

    // 管理者用メールアドレス（固定）
    const email = 'admin@bakery.com';

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass
    });

    if (error) {
        console.error('Login failed:', error);
        errorMsg.innerText = 'パスワードが正しくありません。';
        errorMsg.style.display = 'block';
    } else {
        document.getElementById('login-modal').style.display = 'none';
        document.getElementById('admin-password').value = '';
        errorMsg.style.display = 'none';
        // 状態更新は onAuthStateChange で行われます
    }
}

async function logout() {
    if (!confirm("ログアウトしますか？")) return;
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout failed:', error);
    // 状態更新は onAuthStateChange で行われます
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
