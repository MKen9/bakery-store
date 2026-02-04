document.addEventListener('DOMContentLoaded', () => {
    const reservationData = localStorage.getItem('bakery-reservation-latest');
    const container = document.getElementById('reservation-details');

    if (!reservationData) {
        container.innerHTML = '<p style="text-align: center;">予約情報が見つかりませんでした。<br><a href="index.html">トップページへ戻る</a></p>';
        return;
    }

    try {
        const reservation = JSON.parse(reservationData);

        // Format date
        const dateObj = new Date(reservation.date);
        const dateStr = dateObj.toLocaleString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'short'
        });

        let html = `
            <div style="border-bottom: 2px solid #F3F4F6; padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: var(--primary-dark);">受取日時</h3>
                <p style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color);">📅 ${dateStr}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: var(--primary-dark);">予約商品</h3>
                <ul style="list-style: none;">
        `;

        reservation.items.forEach(item => {
            html += `
                <li style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; border-bottom: 1px dashed #eee; padding-bottom: 0.5rem;">
                    <span>
                        ${item.placeholder || '🍞'} 
                        <strong>${item.name}</strong> 
                        <span style="font-size: 0.9em; color: #666;">x ${item.quantity}</span>
                    </span>
                    <span>¥${(item.price * item.quantity).toLocaleString()}</span>
                </li>
            `;
        });

        html += `
                </ul>
            </div>

            <div style="text-align: right; border-top: 2px solid #F3F4F6; padding-top: 1rem; margin-top: 1rem;">
                <span style="font-size: 1.1rem;">合計金額:</span>
                <span style="font-size: 1.5rem; font-weight: 800; color: var(--primary-color); margin-left: 0.5rem;">¥${reservation.totalPrice.toLocaleString()}</span>
            </div>

            <div style="margin-top: 2rem; background: #F9FAFB; padding: 1rem; border-radius: 8px;">
                <h4 style="margin-bottom: 0.5rem; font-size: 1rem;">ご予約者情報</h4>
                <p><strong>お名前:</strong> ${reservation.name}</p>
                <p><strong>メール:</strong> ${reservation.email}</p>
            </div>
        `;

        container.innerHTML = html;

    } catch (e) {
        console.error('Error parsing reservation data:', e);
        container.innerHTML = '<p style="text-align: center;">予約情報の読み込みに失敗しました。</p>';
    }
});
