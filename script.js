/* ════════════════════════════════════════
   POND PHUWIN · Space Soul-dyssey CONCERT
   script.js — Supabase 即時同步版 v2
   ════════════════════════════════════════ */

// ────────────────────────────────────────────
// Supabase 設定
// ────────────────────────────────────────────
const SUPABASE_URL = "https://jnpddmlnikjtvqrgbtjo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucGRkbWxuaWtqdHZxcmdidGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTA4MzEsImV4cCI6MjA5ODMyNjgzMX0.vkkF5z24fPaT7-Z2NiO6HXLyWMq8zhmmDHAo7J9ZkgE";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

// ────────────────────────────────────────────
// State
// ────────────────────────────────────────────
let currentDate = "8/21";
let isAdmin = sessionStorage.getItem('admin') === 'true';
let lastRegisteredName = "";
let lastPos = { x: 0, y: 0 };
let allData = { "8/21": [], "8/22": [], "8/23": [] };
let realtimeChannel = null;

// ────────────────────────────────────────────
// i18n
// ────────────────────────────────────────────
const i18n = {
    zh: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "已入座：", unit: " 人",
        joined:    " 已入座！", wait: "✨ 等待觀眾入座...",
        loading:   "⏳ 載入中...", reg: "登記座位",
        confirm:   "確認登記", cancel: "取消", close: "關閉",
        listTitle: "💖 名單列表", ph: "暱稱",
        em:        "或選 Emoji（不上傳圖片時使用）",
        empty:     "目前還沒有人入座"
    },
    en: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "Seated: ", unit: " people",
        joined:    " has joined!", wait: "✨ Waiting for audience...",
        loading:   "⏳ Loading...", reg: "Register Seat",
        confirm:   "Confirm", cancel: "Cancel", close: "Close",
        listTitle: "💖 List", ph: "Nickname",
        em:        "Or pick an Emoji (if no photo)",
        empty:     "No audience yet"
    },
    th: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "จำนวนผู้ชม: ", unit: " คน",
        joined:    " เข้าร่วมแล้ว!", wait: "✨ รอผู้ชมเข้าสู่ระบบ...",
        loading:   "⏳ กำลังโหลด...", reg: "ลงทะเบียน",
        confirm:   "ยืนยัน", cancel: "ยกเลิก", close: "ปิด",
        listTitle: "💖 รายชื่อ", ph: "ชื่อเล่น",
        em:        "หรือเลือก Emoji (ถ้าไม่ได้อัปโหลดรูป)",
        empty:     "ยังไม่มีผู้ชม"
    }
};

function getLang() { return localStorage.getItem('lang') || 'zh'; }

// ────────────────────────────────────────────
// Language Switch
// ────────────────────────────────────────────
function setLang(l) {
    localStorage.setItem('lang', l);
    const d = i18n[l];
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setAttr = (id, a, v) => { const el = document.getElementById(id); if (el) el.setAttribute(a, v); };

    setText('ui-title', d.title);
    setText('ui-m-title', d.reg);
    setText('ui-btn', d.confirm);
    setText('ui-cancel-btn', d.cancel);
    setText('ui-close-btn', d.close);
    setText('ui-list-title', d.listTitle);
    setText('ui-emoji-placeholder', d.em);
    setAttr('name', 'placeholder', d.ph);

    const bar = document.getElementById('notify-bar');
    if (bar && bar.dataset.isUser !== 'true') bar.textContent = d.wait;
    render();
}

// ────────────────────────────────────────────
// Modal Helpers
// ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    if (id === 'modal') ['name','img','emoji'].forEach(i => { const el = document.getElementById(i); if(el) el.value=''; });
}

// ────────────────────────────────────────────
// Date Switch
// ────────────────────────────────────────────
async function switchDate() {
    currentDate = document.getElementById('date-select').value;
    lastRegisteredName = "";
    const bar = document.getElementById('notify-bar');
    if (bar) { bar.dataset.isUser = 'false'; bar.textContent = i18n[getLang()].loading; }
    await loadSeats();
    if (bar && bar.dataset.isUser !== 'true') bar.textContent = i18n[getLang()].wait;
}

// ────────────────────────────────────────────
// Map Click
// ────────────────────────────────────────────
const wrapper = document.getElementById('map-wrapper');

wrapper.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const rect = wrapper.getBoundingClientRect();
    lastPos = {
        x: ((t.clientX - rect.left) / rect.width)  * 100,
        y: ((t.clientY - rect.top)  / rect.height) * 100
    };
}, { passive: true });

wrapper.addEventListener('click', (e) => {
    if (e.pointerType !== 'touch') {
        const rect = wrapper.getBoundingClientRect();
        lastPos = {
            x: ((e.clientX - rect.left) / rect.width)  * 100,
            y: ((e.clientY - rect.top)  / rect.height) * 100
        };
    }
    openModal('modal');
});

// ────────────────────────────────────────────
// Save Seat
// ────────────────────────────────────────────
// ────────────────────────────────────────────
// 圖片壓縮（縮小到 maxSize px，品質 quality，回傳 Blob 供上傳用）
// ────────────────────────────────────────────
function compressImageToBlob(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
                else       { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
                canvas.width  = Math.round(w);
                canvas.height = Math.round(h);
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function save() {
    const nameEl = document.getElementById('name');
    const name   = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : "Anonymous";
    const file   = document.getElementById('img').files[0];
    const emoji  = document.getElementById('emoji').value;

    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('請上傳圖片檔案（jpg / png 等）');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('圖片檔案過大，請選擇 10MB 以下的圖片');
            return;
        }
    }

    lastRegisteredName = name;
    closeModal('modal');

    const bar = document.getElementById('notify-bar');
    if (bar) { bar.dataset.isUser = 'true'; bar.textContent = "⏳ 登記中..."; }

    let imgUrl = null;
    if (file) {
        const blob = await compressImageToBlob(file, 100, 0.6); // 最大 100px，品質 60%
        const fileName = `seat_${Date.now()}_${Math.random().toString(36).slice(2,8)}.jpg`;

        const { error: uploadError } = await db.storage
            .from('avatars')
            .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            if (bar) bar.textContent = "❌ 圖片上傳失敗，請再試一次";
            return;
        }

        const { data: urlData } = db.storage.from('avatars').getPublicUrl(fileName);
        imgUrl = urlData.publicUrl;
    }

    const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4 位數密碼

    const payload = {
        date:     currentDate,
        name:     name,
        x:        lastPos.x,
        y:        lastPos.y,
        emoji:    emoji || null,
        img_data: imgUrl || null,
        pin:      pin
    };

    console.log('Inserting:', { ...payload, pin: '[hidden]' });

    const { data, error } = await db.from('seats').insert(payload).select();

    if (error) {
        console.error('Insert error:', JSON.stringify(error));
        if (bar) bar.textContent = "❌ " + (error.message || '登記失敗，請再試一次');
    } else {
        console.log('Insert success');
        const d = i18n[getLang()];
        if (bar) bar.textContent = "✨ " + name + d.joined;
        await loadSeats();

        // 顯示密碼給使用者記住
        const pinDisplay = document.getElementById('pin-display');
        if (pinDisplay) pinDisplay.textContent = pin;
        openModal('pin-modal');
    }
}

// ────────────────────────────────────────────
// Load from Supabase
// ────────────────────────────────────────────
async function loadSeats() {
    let rows = [];
    let batchStart = 0;
    const batchSize = 30;
    let hasMore = true;

    while (hasMore) {
        const { data: batch, error } = await db
            .from('seats')
            .select('*')
            .order('id', { ascending: true })
            .range(batchStart, batchStart + batchSize - 1);

        if (error) {
            console.error('Load error:', JSON.stringify(error));
            return; // 保留目前已有的 allData，不要清空畫面
        }

        rows = rows.concat(batch);

        if (!batch || batch.length < batchSize) {
            hasMore = false;
        } else {
            batchStart += batchSize;
        }
    }

    allData = { "8/21": [], "8/22": [], "8/23": [] };
    rows.forEach(row => {
        if (!allData[row.date]) allData[row.date] = [];
        allData[row.date].push(row);
    });
    render();
}

// ────────────────────────────────────────────
// 輪詢模式（每 30 秒自動重新載入，穩定不斷線）
// ────────────────────────────────────────────
function subscribeRealtime() {
    if (realtimeChannel) clearInterval(realtimeChannel);
    realtimeChannel = setInterval(() => loadSeats(), 30000);
    console.log('Polling mode: refresh every 30s');
}

// ────────────────────────────────────────────
// Render（地圖）
// ────────────────────────────────────────────
function render() {
    const seats = allData[currentDate] || [];
    const lang  = getLang();
    const d     = i18n[lang];

    const countEl = document.getElementById('ui-count-label');
    if (countEl) countEl.textContent = d.count + seats.length + d.unit;

    document.querySelectorAll('.node').forEach(n => n.remove());

    seats.forEach(s => {
        const node = document.createElement('div');
        node.className  = 'node';
        node.dataset.id  = s.id;
        node.style.left = s.x + '%';
        node.style.top  = s.y + '%';

        if (s.img_data) {
            const img = document.createElement('img');
            img.src = s.img_data;
            node.appendChild(img);
        } else {
            node.textContent = s.emoji || '👤';
        }

        // 點頭像顯示暱稱
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            showNameTooltip(node, s.name);
        });

        wrapper.appendChild(node);
    });

    renderList();
}

// ────────────────────────────────────────────
// Render（名單，支援搜尋過濾）
// ────────────────────────────────────────────
function renderList() {
    const seats = allData[currentDate] || [];
    const lang  = getLang();
    const d     = i18n[lang];

    const listEl = document.getElementById('seat-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const searchEl = document.getElementById('search-input');
    const keyword  = searchEl ? searchEl.value.trim().toLowerCase() : '';

    const filtered = keyword
        ? seats.filter(s => s.name.toLowerCase().includes(keyword))
        : seats;

    filtered.forEach(s => {
        const item = document.createElement('div');
        item.className = 'seat-item';

        const span = document.createElement('span');
        span.textContent = s.name;
        item.appendChild(span);

        // 點名單項目 → 跳到地圖位置並高亮閃爍
        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-del')) return; // 避免點到刪除鍵也觸發跳轉
            closeModal('list-modal');
            jumpToSeat(s.id);
        });

        if (isAdmin) {
            const btn = document.createElement('button');
            btn.className = 'btn-del';
            btn.textContent = '✕';
            btn.onclick = (e) => { e.stopPropagation(); del(s.id); };
            item.appendChild(btn);
        }
        listEl.appendChild(item);
    });

    if (filtered.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'text-align:center;color:rgba(255,255,255,0.4);font-size:13px;margin:20px 0;';
        p.textContent = keyword ? (lang === 'th' ? 'ไม่พบ' : lang === 'en' ? 'No results' : '找不到符合的暱稱') : d.empty;
        listEl.appendChild(p);
    }
}

// ────────────────────────────────────────────
// 跳到地圖上指定座位並高亮閃爍 + 顯示暱稱
// ────────────────────────────────────────────
function jumpToSeat(id) {
    const node = wrapper.querySelector(`.node[data-id="${id}"]`);
    if (!node) return;

    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    node.classList.remove('highlight');
    void node.offsetWidth; // 強制重啟動畫
    node.classList.add('highlight');

    const seats = allData[currentDate] || [];
    const seat = seats.find(s => s.id === id);
    if (seat) showNameTooltip(node, seat.name, 3000);

    setTimeout(() => node.classList.remove('highlight'), 3600);
}

// ────────────────────────────────────────────
// 顯示暱稱提示框（出現在點擊的頭像正上方）
// ────────────────────────────────────────────
let tooltipTimer = null;
function showNameTooltip(node, name, duration = 2000) {
    const tooltip = document.getElementById('name-tooltip');
    if (!tooltip) return;

    const rect = node.getBoundingClientRect();
    tooltip.textContent = name;
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top  = rect.top + 'px';
    tooltip.style.display = 'block';

    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => { tooltip.style.display = 'none'; }, duration);
}

// ────────────────────────────────────────────
// Admin
// ────────────────────────────────────────────
function toggleAdmin() {
    if (!isAdmin) {
        const pw = prompt("請輸入管理員密碼：");
        if (pw === "2026") {
            isAdmin = true;
            sessionStorage.setItem('admin', 'true');
            alert("✅ 已進入管理員模式");
            render();
        } else if (pw !== null) {
            alert("❌ 密碼錯誤");
        }
    } else {
        isAdmin = false;
        sessionStorage.setItem('admin', 'false');
        alert("已登出管理員模式");
        render();
    }
}

async function del(id) {
    // 找出該座位是否有上傳圖片，連同 Storage 一起刪除
    const seat = (allData[currentDate] || []).find(s => s.id === id);
    if (seat && seat.img_data && seat.img_data.includes('/avatars/')) {
        const fileName = seat.img_data.split('/avatars/')[1];
        if (fileName) {
            await db.storage.from('avatars').remove([fileName]);
        }
    }

    const { error } = await db.from('seats').delete().eq('id', id);
    if (error) console.error('Delete error:', error);
    else await loadSeats();
}



// ────────────────────────────────────────────
// 我的座位（憑暱稱 + 密碼查詢、修改、刪除）
// ────────────────────────────────────────────
let verifiedSeat = null; // 通過驗證後暫存目前操作的座位

async function verifyMine() {
    const nameEl = document.getElementById('mine-name');
    const pinEl  = document.getElementById('mine-pin');
    const resultEl = document.getElementById('mine-result');

    const name = nameEl.value.trim();
    const pin  = pinEl.value.trim();

    if (!name || !pin) {
        resultEl.innerHTML = '<p style="color:#ff6b6b; font-size:13px;">請輸入暱稱和密碼</p>';
        return;
    }

    resultEl.innerHTML = '<p style="color:rgba(255,255,255,0.6); font-size:13px;">⏳ 查詢中...</p>';

    const { data, error } = await db
        .from('seats')
        .select('*')
        .eq('name', name)
        .eq('pin', pin);

    if (error || !data || data.length === 0) {
        resultEl.innerHTML = '<p style="color:#ff6b6b; font-size:13px;">❌ 找不到符合的座位，請確認暱稱與密碼</p>';
        verifiedSeat = null;
        return;
    }

    // 可能同名同密碼有多筆（同一人登記多次），全部列出
    resultEl.innerHTML = '';
    data.forEach(seat => {
        const card = document.createElement('div');
        card.style.cssText = 'background:rgba(255,255,255,0.05); border-radius:10px; padding:10px; margin-bottom:8px;';

        const info = document.createElement('p');
        info.style.cssText = 'font-size:13px; margin:0 0 8px;';
        info.textContent = `📍 場次 ${seat.date}　暱稱：${seat.name}`;
        card.appendChild(info);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px;';

        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️ 改名';
        editBtn.style.cssText = 'flex:1; padding:8px; border-radius:8px; border:1px solid var(--main); background:transparent; color:var(--main); font-size:12px;';
        editBtn.onclick = () => editMySeat(seat);

        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️ 刪除';
        delBtn.style.cssText = 'flex:1; padding:8px; border-radius:8px; border:none; background:rgba(255,60,60,0.7); color:#fff; font-size:12px;';
        delBtn.onclick = () => deleteMySeat(seat);

        btnRow.appendChild(editBtn);
        btnRow.appendChild(delBtn);
        card.appendChild(btnRow);
        resultEl.appendChild(card);
    });
}

async function editMySeat(seat) {
    const newName = prompt('輸入新的暱稱：', seat.name);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) { alert('暱稱不能空白'); return; }

    const { error } = await db
        .from('seats')
        .update({ name: trimmed })
        .eq('id', seat.id)
        .eq('pin', seat.pin);

    if (error) {
        alert('修改失敗：' + error.message);
    } else {
        alert('✅ 已更新暱稱');
        await loadSeats();
        closeModal('mine-modal');
    }
}

async function deleteMySeat(seat) {
    if (!confirm(`確定要刪除「${seat.name}」這個座位嗎？此動作無法復原。`)) return;

    // 連同 Storage 圖片一起刪除
    if (seat.img_data && seat.img_data.includes('/avatars/')) {
        const fileName = seat.img_data.split('/avatars/')[1];
        if (fileName) await db.storage.from('avatars').remove([fileName]);
    }

    const { error } = await db
        .from('seats')
        .delete()
        .eq('id', seat.id)
        .eq('pin', seat.pin);

    if (error) {
        alert('刪除失敗：' + error.message);
    } else {
        alert('✅ 已刪除座位');
        await loadSeats();
        closeModal('mine-modal');
    }
}

// ────────────────────────────────────────────
// 點擊背景關閉 Modal
// ────────────────────────────────────────────
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            if (modal.id === 'modal') {
                ['name','img','emoji'].forEach(i => { const el = document.getElementById(i); if(el) el.value=''; });
            }
        }
    });
});

// ────────────────────────────────────────────
// Init
// ────────────────────────────────────────────
window.onload = async () => {
    setLang(getLang());
    const bar = document.getElementById('notify-bar');
    if (bar) bar.textContent = i18n[getLang()].loading;
    await loadSeats();
    subscribeRealtime();
    if (bar && bar.dataset.isUser !== 'true') {
        bar.textContent = i18n[getLang()].wait;
    }
};
