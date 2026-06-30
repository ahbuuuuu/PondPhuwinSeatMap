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
function switchDate() {
    currentDate = document.getElementById('date-select').value;
    lastRegisteredName = "";
    const bar = document.getElementById('notify-bar');
    if (bar) { bar.dataset.isUser = 'false'; bar.textContent = i18n[getLang()].wait; }
    render();
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
// 圖片壓縮（縮小到 maxSize px，品質 quality）
// ────────────────────────────────────────────
function compressImage(file, maxSize, quality) {
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
                resolve(canvas.toDataURL('image/jpeg', quality));
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

    lastRegisteredName = name;
    closeModal('modal');

    const bar = document.getElementById('notify-bar');
    if (bar) { bar.dataset.isUser = 'true'; bar.textContent = "⏳ 登記中..."; }

    let imgData = null;
    if (file) {
        imgData = await compressImage(file, 100, 0.6); // 最大 100px，品質 60%
    }

    const payload = {
        date:     currentDate,
        name:     name,
        x:        lastPos.x,
        y:        lastPos.y,
        emoji:    emoji || null,
        img_data: imgData || null
    };

    console.log('Inserting:', { ...payload, img_data: imgData ? '[base64]' : null });

    const { data, error } = await db.from('seats').insert(payload).select();

    if (error) {
        console.error('Insert error:', JSON.stringify(error));
        if (bar) bar.textContent = "❌ " + (error.message || '登記失敗，請再試一次');
    } else {
        console.log('Insert success:', data);
        const d = i18n[getLang()];
        if (bar) bar.textContent = "✨ " + name + d.joined;
        await loadSeats();
    }
}

// ────────────────────────────────────────────
// Load from Supabase
// ────────────────────────────────────────────
async function loadSeats() {
    const { data, error } = await db
        .from('seats')
        .select('*')
        .order('id', { ascending: true });

    if (error) { console.error('Load error:', JSON.stringify(error)); return; }

    allData = { "8/21": [], "8/22": [], "8/23": [] };
    (data || []).forEach(row => {
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
// Render
// ────────────────────────────────────────────
function render() {
    const seats = allData[currentDate] || [];
    const lang  = getLang();
    const d     = i18n[lang];

    const countEl = document.getElementById('ui-count-label');
    if (countEl) countEl.textContent = d.count + seats.length + d.unit;

    document.querySelectorAll('.node').forEach(n => n.remove());
    const listEl = document.getElementById('seat-list');
    if (listEl) listEl.innerHTML = '';

    seats.forEach(s => {
        const node = document.createElement('div');
        node.className  = 'node';
        node.style.left = s.x + '%';
        node.style.top  = s.y + '%';

        if (s.img_data) {
            const img = document.createElement('img');
            img.src = s.img_data;
            node.appendChild(img);
        } else {
            node.textContent = s.emoji || '👤';
        }
        wrapper.appendChild(node);

        if (listEl) {
            const item = document.createElement('div');
            item.className = 'seat-item';
            const span = document.createElement('span');
            span.textContent = s.name;
            item.appendChild(span);

            if (isAdmin) {
                const btn = document.createElement('button');
                btn.className = 'btn-del';
                btn.textContent = '✕';
                btn.onclick = () => del(s.id);
                item.appendChild(btn);
            }
            listEl.appendChild(item);
        }
    });

    if (listEl && seats.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'text-align:center;color:rgba(255,255,255,0.4);font-size:13px;margin:20px 0;';
        p.textContent = d.empty;
        listEl.appendChild(p);
    }
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
    const { error } = await db.from('seats').delete().eq('id', id);
    if (error) console.error('Delete error:', error);
    else await loadSeats();
}

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
