/* ════════════════════════════════════════
   POND PHUWIN · Space Soul-dyssey CONCERT
   script.js — Supabase 即時同步版
   ════════════════════════════════════════ */

// ────────────────────────────────────────────
// Supabase 設定
// ────────────────────────────────────────────
const SUPABASE_URL = "https://jnpddmlnikjtvqrgbtjo.supabase.co";
const SUPABASE_KEY = "sb_publishable_i9TmHKHUZdlSVnFgP21eTQ_dyYIKLml";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

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
        count:     "已入座：",
        unit:      " 人",
        joined:    " 已入座！",
        wait:      "✨ 等待觀眾入座...",
        loading:   "⏳ 載入中...",
        reg:       "登記座位",
        confirm:   "確認登記",
        cancel:    "取消",
        close:     "關閉",
        listTitle: "💖 名單列表",
        ph:        "暱稱",
        em:        "或選 Emoji（不上傳圖片時使用）",
        empty:     "目前還沒有人入座"
    },
    en: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "Seated: ",
        unit:      " people",
        joined:    " has joined!",
        wait:      "✨ Waiting for audience...",
        loading:   "⏳ Loading...",
        reg:       "Register Seat",
        confirm:   "Confirm",
        cancel:    "Cancel",
        close:     "Close",
        listTitle: "💖 List",
        ph:        "Nickname",
        em:        "Or pick an Emoji (if no photo)",
        empty:     "No audience yet"
    },
    th: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "จำนวนผู้ชม: ",
        unit:      " คน",
        joined:    " เข้าร่วมแล้ว!",
        wait:      "✨ รอผู้ชมเข้าสู่ระบบ...",
        loading:   "⏳ กำลังโหลด...",
        reg:       "ลงทะเบียน",
        confirm:   "ยืนยัน",
        cancel:    "ยกเลิก",
        close:     "ปิด",
        listTitle: "💖 รายชื่อ",
        ph:        "ชื่อเล่น",
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
    const setAttr = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };

    setText('ui-title',             d.title);
    setText('ui-m-title',           d.reg);
    setText('ui-btn',               d.confirm);
    setText('ui-cancel-btn',        d.cancel);
    setText('ui-close-btn',         d.close);
    setText('ui-list-title',        d.listTitle);
    setText('ui-emoji-placeholder', d.em);
    setAttr('name', 'placeholder',  d.ph);

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
    if (id === 'modal') resetForm();
}
function resetForm() {
    ['name', 'img', 'emoji'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
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
    subscribeRealtime(); // 重新訂閱當日資料
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
// Save Seat → 寫入 Supabase
// ────────────────────────────────────────────
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
        imgData = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload  = (ev) => res(ev.target.result);
            reader.onerror = rej;
            reader.readAsDataURL(file);
        });
    }

    const { error } = await db.from('seats').insert({
        date:     currentDate,
        name:     name,
        x:        lastPos.x,
        y:        lastPos.y,
        emoji:    emoji || (imgData ? null : '👤'),
        img_data: imgData
    });

    if (error) {
        console.error('Insert error:', error);
        if (bar) bar.textContent = "❌ 登記失敗，請再試一次";
    } else {
        const d = i18n[getLang()];
        if (bar) bar.textContent = "✨ " + name + d.joined;
    }
}

// ────────────────────────────────────────────
// 從 Supabase 載入資料
// ────────────────────────────────────────────
async function loadSeats() {
    const { data, error } = await db
        .from('seats')
        .select('*')
        .order('id', { ascending: true });

    if (error) { console.error('Load error:', error); return; }

    allData = { "8/21": [], "8/22": [], "8/23": [] };
    (data || []).forEach(row => {
        if (!allData[row.date]) allData[row.date] = [];
        allData[row.date].push(row);
    });
    render();
}

// ────────────────────────────────────────────
// Realtime 即時訂閱
// ────────────────────────────────────────────
function subscribeRealtime() {
    // 取消舊訂閱
    if (realtimeChannel) {
        db.removeChannel(realtimeChannel);
    }

    realtimeChannel = db
        .channel('seats-changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'seats' },
            () => loadSeats()   // 任何變動（新增/刪除）都重新載入
        )
        .subscribe();
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
        // 地圖節點
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

        // 名單項目
        if (listEl) {
            const item = document.createElement('div');
            item.className = 'seat-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = s.name;
            item.appendChild(nameSpan);

            if (isAdmin) {
                const delBtn = document.createElement('button');
                delBtn.className   = 'btn-del';
                delBtn.textContent = '✕';
                delBtn.onclick     = () => del(s.id);
                item.appendChild(delBtn);
            }
            listEl.appendChild(item);
        }
    });

    if (listEl && seats.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'text-align:center; color:rgba(255,255,255,0.4); font-size:13px; margin:20px 0;';
        empty.textContent = d.empty;
        listEl.appendChild(empty);
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
    if (error) { console.error('Delete error:', error); }
    // Realtime 會自動觸發 loadSeats()，不需要手動 render
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
