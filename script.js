/* ════════════════════════════════════════
   POND PHUWIN · Space Soul-dyssey CONCERT
   script.js
   ════════════════════════════════════════ */

// ────────────────────────────────────────────
// State
// ────────────────────────────────────────────
let currentDate = "8/21";
let isAdmin = sessionStorage.getItem('admin') === 'true';
let lastRegisteredName = "";
let lastPos = { x: 0, y: 0 };
let allData = JSON.parse(localStorage.getItem('pond_seats')) || {
    "8/21": [],
    "8/22": [],
    "8/23": []
};

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

function getLang() {
    return localStorage.getItem('lang') || 'zh';
}

// ────────────────────────────────────────────
// Language Switch
// ────────────────────────────────────────────
function setLang(l) {
    localStorage.setItem('lang', l);
    const d = i18n[l];

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    const setAttr = (id, attr, val) => {
        const el = document.getElementById(id);
        if (el) el.setAttribute(attr, val);
    };

    setText('ui-title',           d.title);
    setText('ui-m-title',         d.reg);
    setText('ui-btn',             d.confirm);
    setText('ui-cancel-btn',      d.cancel);
    setText('ui-close-btn',       d.close);
    setText('ui-list-title',      d.listTitle);
    setText('ui-emoji-placeholder', d.em);
    setAttr('name', 'placeholder', d.ph);

    const bar = document.getElementById('notify-bar');
    if (bar) {
        bar.textContent = (bar.dataset.isUser === 'true' && lastRegisteredName)
            ? "✨ " + lastRegisteredName + d.joined
            : d.wait;
    }

    render();
}

// ────────────────────────────────────────────
// Modal Helpers
// ────────────────────────────────────────────
function openModal(id) {
    document.getElementById(id).classList.add('show');
}

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
    if (bar) {
        bar.dataset.isUser = 'false';
        bar.textContent = i18n[getLang()].wait;
    }
    render();
}

// ────────────────────────────────────────────
// Map Click
// touchstart (passive) → 記座標
// click → 開 modal（手機自動從 touchstart 串接）
// 不攔截 touchend，徹底避免 cancelable=false 警告
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
    // 桌機滑鼠點擊：pointerType 不是 touch，需要在這裡取座標
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
function save() {
    const nameEl = document.getElementById('name');
    const name = (nameEl && nameEl.value.trim()) ? nameEl.value.trim() : "Anonymous";
    const file  = document.getElementById('img').files[0];
    const emoji = document.getElementById('emoji').value;

    lastRegisteredName = name;

    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => addSeat(name, ev.target.result, null);
        reader.readAsDataURL(file);
    } else {
        addSeat(name, null, emoji || '👤');
    }

    closeModal('modal');

    const bar = document.getElementById('notify-bar');
    if (bar) bar.dataset.isUser = 'true';
}

function addSeat(name, imgData, emoji) {
    if (!allData[currentDate]) allData[currentDate] = [];
    allData[currentDate].push({
        id: Date.now(),
        x: lastPos.x,
        y: lastPos.y,
        name,
        imgData,
        emoji
    });
    localStorage.setItem('pond_seats', JSON.stringify(allData));
    render();
    setLang(getLang()); // 更新 notify bar 顯示名字
}

// ────────────────────────────────────────────
// Render
// ────────────────────────────────────────────
function render() {
    const seats = allData[currentDate] || [];
    const lang  = getLang();
    const d     = i18n[lang];

    // 更新人數
    const countEl = document.getElementById('ui-count-label');
    if (countEl) countEl.textContent = d.count + seats.length + d.unit;

    // 清除舊 node
    document.querySelectorAll('.node').forEach(n => n.remove());

    // 清除名單
    const listEl = document.getElementById('seat-list');
    if (listEl) listEl.innerHTML = '';

    seats.forEach(s => {
        // ── 地圖節點 ──
        const node = document.createElement('div');
        node.className = 'node';
        node.style.left = s.x + '%';
        node.style.top  = s.y + '%';

        if (s.imgData) {
            const img = document.createElement('img');
            img.src = s.imgData;
            node.appendChild(img);
        } else {
            node.textContent = s.emoji || '👤';
        }
        wrapper.appendChild(node);

        // ── 名單項目 ──
        if (listEl) {
            const item = document.createElement('div');
            item.className = 'seat-item';

            const nameSpan = document.createElement('span');
            nameSpan.textContent = s.name;
            item.appendChild(nameSpan);

            if (isAdmin) {
                const delBtn = document.createElement('button');
                delBtn.className = 'btn-del';
                delBtn.textContent = '✕';
                delBtn.onclick = () => del(s.id);
                item.appendChild(delBtn);
            }
            listEl.appendChild(item);
        }
    });

    // 空狀態提示
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

function del(id) {
    allData[currentDate] = (allData[currentDate] || []).filter(s => s.id !== id);
    localStorage.setItem('pond_seats', JSON.stringify(allData));
    render();
}

// ────────────────────────────────────────────
// Init
// ────────────────────────────────────────────
window.onload = () => setLang(getLang());
