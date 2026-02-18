// Supabase設定
const supabaseUrl = 'https://vfqiahdfwvsctgkrvucw.supabase.co';
// 注意: ここには `anon` キー (eyJから始まる文字列) が入るのが一般的です。
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcWlhaGRmd3ZzY3Rna3J2dWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4Mzg3NTEsImV4cCI6MjA4NTQxNDc1MX0.2fVKGc9g4xz__WUNYpb74HU6YIvwRVC2upuTYNg5Dgs';

// 変数名を supabase から supabaseClient に変更して衝突を回避
let supabaseClient;
try {
    if (!window.supabase) {
        throw new Error('Supabaseライブラリがロードされていません。');
    }
    // ライブラリ(window.supabase)を使ってクライアントを作成
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} catch (e) {
    console.error('Supabase Init Error:', e);
    alert('システムの初期化に失敗しました: ' + e.message);
}

// グローバル変数
let localProducts = [];
let cart = JSON.parse(localStorage.getItem('bakery-cart')) || [];
let isAdmin = false;
let editingProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    updateCartCount();
    setupCartModal();
    setupAdminToggle();
    checkAdminState();
    checkReservationStatus();
    updatePublicReservationCount(); // 予約人数を表示
    fetchReservations(); // 予約一覧を表示
    setupViewToggle(); // 表示切り替えボタンの設定
});

function setupViewToggle() {
    const btn = document.getElementById('toggle-view-btn');
    const list = document.getElementById('product-list');

    if (btn && list) {
        btn.onclick = () => {
            const isCompact = list.classList.toggle('compact-view');
            btn.innerText = isCompact ? '元の表示に戻す' : '小さく表示';

            // ローカルストレージに設定を保存（オプション）
            localStorage.setItem('bakery-view-mode', isCompact ? 'compact' : 'normal');
        };

        // 初期表示の設定を復元
        const savedMode = localStorage.getItem('bakery-view-mode');
        if (savedMode === 'compact') {
            list.classList.add('compact-view');
            btn.innerText = '元の表示に戻す';
        }
    }
}

async function updatePublicReservationCount() {
    if (!supabaseClient) return;

    // データの中身は取得せず、件数（count）だけを取得する効率的なクエリ
    const { count, error } = await supabaseClient
        .from('reservations')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
        return;
    }

    const display = document.getElementById('reservation-count-display');
    if (display) {
        display.innerHTML = `現在 <span style="font-size: 1.4rem; color: var(--accent-color);">${count || 0}名</span> の方が予約しています！`;
    }
}

function checkReservationStatus() {
    const reservationBtn = document.getElementById('view-reservation-btn');
    if (reservationBtn && localStorage.getItem('bakery-reservation-latest')) {
        reservationBtn.style.display = 'inline-block';
    }
}

// 認証状態の監視
if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session) {
            isAdmin = true;
        } else {
            isAdmin = false;
        }
        checkAdminState();
    });
}

// Supabaseから商品データを取得
async function fetchProducts() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('stock', { ascending: false });

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
        fetchReservations(); // 管理者なら予約一覧を取得
    } else {
        section.style.display = 'none';
        toggleBtn.innerText = '商品管理';
    }
}

async function fetchReservations() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('reservations')
        .select('*')
        .order('pickup_time', { ascending: true }); // 受け取り日時順

    if (error) {
        console.error('Error fetching reservations:', error);
        return;
    }

    if (data) {
        renderPublicReservations(data); // 公開リストを更新
        if (isAdmin) {
            renderAdminReservations(data); // 管理者リストを更新
        }
    }
}

function renderPublicReservations(reservations) {
    const list = document.getElementById('public-reservation-list');
    if (!list) return;

    if (reservations.length === 0) {
        list.innerHTML = '<tr><td colspan="3" style="padding: 2rem; text-align: center;">現在、予約はありません。</td></tr>';
        return;
    }

    list.innerHTML = reservations.map(r => {
        // Itemsのパース
        let items = r.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { }
        }

        const itemsHtml = Array.isArray(items)
            ? items.map(i => {
                const icon = i.placeholder && i.placeholder.startsWith('http') ? '📷' : (i.placeholder || '🍞');
                return `<span style="display:inline-block; margin-right:10px;">${icon} ${i.name} x${i.quantity}</span>`;
            }).join('')
            : '内容不明';

        const dateStr = new Date(r.pickup_time).toLocaleString('ja-JP', {
            month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', weekday: 'short'
        });

        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 1rem; color: var(--primary-color); font-weight:bold;">${dateStr}</td>
            <td style="padding: 1rem;">${itemsHtml}</td>
        </tr>
        `;
    }).join('');
}

function renderAdminReservations(reservations) {
    const list = document.getElementById('admin-reservation-list');
    if (!list) return;

    if (reservations.length === 0) {
        list.innerHTML = '<tr><td colspan="5" style="padding: 1rem; text-align: center;">予約はまだありません</td></tr>';
        return;
    }

    list.innerHTML = reservations.map(r => {
        // Itemsのパース (JSONBとして保存されている想定)
        let items = r.items;
        if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch (e) { }
        }

        const itemsHtml = Array.isArray(items)
            ? items.map(i => `<div>${i.name} x${i.quantity}</div>`).join('')
            : '内容不明';

        const dateStr = new Date(r.pickup_time).toLocaleString('ja-JP');

        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 1rem;">${dateStr}</td>
            <td style="padding: 1rem;">${r.name}</td>
            <td style="padding: 1rem;">${itemsHtml}</td>
            <td style="padding: 1rem;">¥${r.total_price.toLocaleString()}</td>
            <td style="padding: 1rem;">${r.email}</td>
            <td style="padding: 1rem;">
                <button onclick="deleteReservation(${r.id})" style="color: red; border: 1px solid red; background: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;">削除</button>
            </td>
        </tr>
        `;
    }).join('');
}

// 予約削除機能
async function deleteReservation(id) {
    if (!supabaseClient || !isAdmin) return;
    if (!confirm("この予約を削除しますか？\n（復元できません）")) return;

    const { error } = await supabaseClient
        .from('reservations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting reservation:', error);
        alert('削除に失敗しました: ' + error.message);
    } else {
        fetchReservations(); // リスト更新
    }
}

function displayProducts() {
    const productList = document.getElementById('product-list');
    if (!productList) return;

    if (localProducts.length === 0) {
        productList.innerHTML = '<p style="text-align:center; width:100%;">商品が読み込まれていません。<br>管理画面から商品を追加するか、データベースを確認してください。</p>';
        return;
    }

    productList.innerHTML = localProducts.map(product => {
        const imageContent = product.placeholder && product.placeholder.startsWith('http')
            ? `<img src="${product.placeholder}" alt="${product.name}">`
            : (product.placeholder || '🍞');

        return `
        <div class="product-card">
            <div class="product-image">${imageContent}</div>
            <div class="product-info">
                <h4>${product.name}</h4>
                <p>${product.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <span class="product-price">¥${product.price.toLocaleString()}</span>
                    <span style="font-size: 0.9rem; color: ${product.stock > 0 ? '#666' : '#e44'}; font-weight: bold;">
                        ${product.stock > 0 ? `残り: ${product.stock}個` : '売り切れ'}
                    </span>
                </div>
                ${product.stock > 0
                ? `
                    <div class="quantity-selector">
                        <label for="qty-${product.id}">個数:</label>
                        <input type="number" id="qty-${product.id}" class="quantity-input" value="1" min="1" max="${product.stock}">
                    </div>
                    <button class="btn-add" onclick="addToCart(${product.id})">予約リストに追加</button>
                  `
                : `<button class="btn-add" style="background-color: #ccc; cursor: not-allowed;" disabled>売り切れ</button>`
            }
            </div>
        </div>
    `}).join('');
}

function displayAdminProducts() {
    const adminList = document.getElementById('admin-product-list');
    if (!adminList) return;

    adminList.innerHTML = localProducts.map(product => {
        const icon = product.placeholder && product.placeholder.startsWith('http')
            ? '📷'
            : (product.placeholder || '🍞');

        return `
        <div class="admin-item">
            <span style="flex-grow: 1;">${icon} <strong>${product.name}</strong> - ¥${product.price} (在庫: ${product.stock})</span>
            <div style="display: flex; gap: 10px;">
                <button onclick="startEditProduct(${product.id})" style="color: var(--primary-color); border: 1px solid var(--primary-color); background: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">編集</button>
                <button onclick="deleteProduct(${product.id})" style="color: #f44336; border: 1px solid #f44336; background: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">削除</button>
            </div>
        </div>
    `}).join('');
}

function startEditProduct(id) {
    const product = localProducts.find(p => p.id === id);
    if (!product) return;

    editingProductId = id;

    // フォームに値をセット
    document.getElementById('new-p-name').value = product.name;
    document.getElementById('new-p-price').value = product.price;
    document.getElementById('new-p-stock').value = product.stock;
    document.getElementById('new-p-desc').value = product.description;
    // 画像はリセット（現在の画像は維持されるようにロジックを組む）
    document.getElementById('new-p-image').value = '';

    // ボタン表示の切り替え
    document.getElementById('add-product-btn').innerText = '保存する';
    document.getElementById('cancel-edit-btn').style.display = 'block';

    // フォームまでスクロール
    document.getElementById('admin-section').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    editingProductId = null;

    // フォームをクリア
    document.getElementById('new-p-name').value = '';
    document.getElementById('new-p-price').value = '';
    document.getElementById('new-p-stock').value = '';
    document.getElementById('new-p-desc').value = '';
    document.getElementById('new-p-image').value = '';

    // ボタン表示を戻す
    document.getElementById('add-product-btn').innerText = '商品を追加';
    document.getElementById('cancel-edit-btn').style.display = 'none';
}

async function handleProductSubmit() {
    if (editingProductId) {
        await updateProduct(editingProductId);
    } else {
        await addNewProduct();
    }
}

// 商品追加（Supabase）
async function addNewProduct() {
    if (!supabaseClient) return;

    const name = document.getElementById('new-p-name').value;
    const price = parseInt(document.getElementById('new-p-price').value);
    const desc = document.getElementById('new-p-desc').value;
    const imageFile = document.getElementById('new-p-image').files[0];

    if (!name || isNaN(price)) {
        alert("名前と価格を入力してください。");
        return;
    }

    let icon = "🍞"; // デフォルト

    // 画像アップロード処理
    if (imageFile) {
        try {
            const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const { data, error } = await supabaseClient.storage
                .from('product-images')
                .upload(fileName, imageFile);

            if (error) throw error;

            const { data: publicUrlData } = supabaseClient.storage
                .from('product-images')
                .getPublicUrl(fileName);

            icon = publicUrlData.publicUrl;
        } catch (e) {
            console.error('Upload failed:', e);
            alert('画像のアップロードに失敗しました: ' + e.message);
            return;
        }
    }

    const stock = parseInt(document.getElementById('new-p-stock').value) || 0;

    const newProduct = {
        name: name,
        price: price,
        description: desc,
        placeholder: icon,
        stock: stock
    };

    const { data, error } = await supabaseClient
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
        document.getElementById('new-p-stock').value = '';
        document.getElementById('new-p-desc').value = '';
        document.getElementById('new-p-image').value = '';
    }
}

async function updateProduct(id) {
    if (!supabaseClient) return;

    const name = document.getElementById('new-p-name').value;
    const price = parseInt(document.getElementById('new-p-price').value);
    const desc = document.getElementById('new-p-desc').value;
    const imageFile = document.getElementById('new-p-image').files[0];
    const stock = parseInt(document.getElementById('new-p-stock').value) || 0;

    if (!name || isNaN(price)) {
        alert("名前と価格を入力してください。");
        return;
    }

    const currentProduct = localProducts.find(p => p.id === id);
    let icon = currentProduct.placeholder; // 現在の画像をデフォルトにする

    // 画像アップロード処理（新しく選択された場合のみ）
    if (imageFile) {
        try {
            const fileName = `${Date.now()}_${imageFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const { data, error } = await supabaseClient.storage
                .from('product-images')
                .upload(fileName, imageFile);

            if (error) throw error;

            const { data: publicUrlData } = supabaseClient.storage
                .from('product-images')
                .getPublicUrl(fileName);

            icon = publicUrlData.publicUrl;
        } catch (e) {
            console.error('Upload failed:', e);
            alert('画像のアップロードに失敗しました: ' + e.message);
            return;
        }
    }

    const updatedProduct = {
        name: name,
        price: price,
        description: desc,
        placeholder: icon,
        stock: stock
    };

    const { error } = await supabaseClient
        .from('products')
        .update(updatedProduct)
        .eq('id', id);

    if (error) {
        console.error('Error updating product:', error);
        alert('更新に失敗しました: ' + error.message);
    } else {
        alert('更新しました！');
        cancelEdit(); // フォームリセットと表示戻し
        fetchProducts(); // 再取得して表示更新
    }
}

// 商品削除（Supabase）
async function deleteProduct(id) {
    if (!supabaseClient) return;
    if (!confirm("この商品を削除しますか？")) return;

    const { error } = await supabaseClient
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

    const qtyInput = document.getElementById(`qty-${productId}`);
    const requestedQty = parseInt(qtyInput.value) || 1;

    if (requestedQty <= 0) {
        alert("1つ以上選択してください。");
        return;
    }

    const existingItem = cart.find(item => item.id === productId);
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;

    if (currentQtyInCart + requestedQty > product.stock) {
        alert(`在庫不足です。現在の予約リストには${currentQtyInCart}個入っており、在庫は残り${product.stock}個です。`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += requestedQty;
    } else {
        cart.push({ ...product, quantity: requestedQty });
    }

    saveCart();
    updateCartCount();
    alert(`${product.name}を${requestedQty}個予約リストに追加しました！`);
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

async function attemptLogin() {
    if (!supabaseClient) return;

    const pass = document.getElementById('admin-password').value;
    const errorMsg = document.getElementById('login-error');

    // 管理者用メールアドレス
    const email = 'admin@bakery.com';

    const { data, error } = await supabaseClient.auth.signInWithPassword({
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
    if (!supabaseClient) return;
    if (!confirm("ログアウトしますか？")) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) console.error('Logout failed:', error);
    // 状態更新は onAuthStateChange で行われます
}

async function confirmReservation() {
    const name = document.getElementById('res-name').value;
    const date = document.getElementById('res-date').value;
    const email = document.getElementById('res-email').value;

    if (!name || !date || !email) {
        alert("すべての項目を入力してください。");
        return;
    }

    // 予約データを準備
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const reservation = {
        name: name,
        date: date,
        email: email,
        items: cart, // 現在のカートの内容を保存
        totalPrice: totalPrice,
        createdAt: new Date().toISOString()
    };

    // Supabaseに保存
    if (supabaseClient) {
        // 1. 最新の在庫をチェック
        const insufficientStockItems = [];
        const stockUpdates = [];

        for (const item of cart) {
            const { data: pData, error: fetchError } = await supabaseClient
                .from('products')
                .select('stock, name')
                .eq('id', item.id)
                .single();

            if (fetchError || !pData) {
                alert(`商品「${item.name}」の情報取得に失敗しました。`);
                return;
            }

            if (pData.stock < item.quantity) {
                insufficientStockItems.push(`${pData.name} (在庫: ${pData.stock}, 注文: ${item.quantity})`);
            } else {
                stockUpdates.push({ id: item.id, newStock: pData.stock - item.quantity });
            }
        }

        if (insufficientStockItems.length > 0) {
            alert(`以下の商品の在庫が不足しているため、予約を完了できませんでした：\n\n${insufficientStockItems.join('\n')}\n\n予約内容を調整してください。`);
            return;
        }

        // 2. 予約データを保存
        const { error: resError } = await supabaseClient
            .from('reservations')
            .insert([{
                name: name,
                pickup_time: date,
                email: email,
                items: cart,
                total_price: totalPrice
            }]);

        if (resError) {
            console.error('Error saving reservation to Supabase:', resError);
            alert('予約の送信に失敗しました。');
            return;
        }

        // 3. 在庫を減らす (本来はSupabaseのRPCなどでトランザクション化すべきですが、フロントエンドで逐次実行します)
        for (const update of stockUpdates) {
            await supabaseClient
                .from('products')
                .update({ stock: update.newStock })
                .eq('id', update.id);
        }
    }

    // 確認ページ用にローカルストレージに保存
    localStorage.setItem('bakery-reservation-latest', JSON.stringify(reservation));

    // カートを空にする
    cart = [];
    saveCart();
    updateCartCount();

    // 予約人数表示を更新（自分も増えたので）
    updatePublicReservationCount();

    // モーダルを閉じてページ遷移
    document.getElementById('cart-modal').style.display = 'none';
    window.location.href = 'reservation-confirmed.html';
}
