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

// 截圖專用模式（透過分享連結進入）
const urlParams = new URLSearchParams(window.location.search);
const screenshotMode = urlParams.get('share') === '1';
const screenshotIds = screenshotMode
    ? (urlParams.get('ids') || '').split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n))
    : [];
const screenshotDate = urlParams.get('date');

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
        empty:     "目前還沒有人入座",
        mineBtn:   "🔑 我的座位",
        mineTitle: "🔑 我的座位",
        minePh:    "暱稱",
        minePinPh: "4 位數密碼",
        mineQuery: "查詢",
        mineEmptyInput: "請輸入暱稱和密碼",
        mineLoading: "⏳ 查詢中...",
        mineNotFound: "❌ 找不到符合的座位，請確認暱稱與密碼",
        mineDate:  "場次",
        mineName:  "暱稱",
        mineEdit:  "✏️ 改名",
        mineDelete:"🗑️ 刪除",
        minePromptNewName: "輸入新的暱稱：",
        mineNameEmpty: "暱稱不能空白",
        mineUpdateFail: "修改失敗：",
        mineUpdateOk: "✅ 已更新暱稱",
        mineDeleteConfirm: "確定要刪除這個座位嗎？此動作無法復原。",
        mineDeleteFail: "刪除失敗：",
        mineDeleteOk: "✅ 已刪除座位",
        pinSuccessTitle: "🎉 登記成功！",
        pinSuccessDesc:  "請記住這組密碼，之後可用來修改或刪除你的座位：",
        pinConfirmBtn:   "我記住了",
        chatToggle: "💬 聊天",
        chatTitle:  "💬 聊天室",
        chatSend:   "送出",
        chatNamePh: "暱稱",
        chatInputPh: "說點什麼...",
        chatEmpty:  "目前還沒有人留言，搶頭香！",
        chatNeedInput: "請輸入暱稱和訊息內容",
        zonePh: "選擇你的座位區域",
        chatViewLabel: "👀 正在觀看",
        chatSendLabel: "📤 發送到",
        chatZoneAll: "🌐 全部區域（ALL）",
        chatToggleArea: "📍 區域聊天",
        globalChatToggle: "🌐 全場聊天室",
        globalChatTitle:  "🌐 全場聊天室",
        shareModeEnter: "分享模式",
        shareModeExit:  "結束分享模式",
        shareHint:      "勾選想要分享的人，最多 10 位",
        shareGenerate:  "🔗 產生分享連結",
        shareResultTitle: "🔗 分享連結已產生",
        shareResultHint:  "複製這個連結分享出去，打開後只會看到被選中的人",
        shareCopy:        "📋 複製連結"
    },
    en: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "Seated: ", unit: " people",
        joined:    " has joined!", wait: "✨ Waiting for audience...",
        loading:   "⏳ Loading...", reg: "Register Seat",
        confirm:   "Confirm", cancel: "Cancel", close: "Close",
        listTitle: "💖 List", ph: "Nickname",
        em:        "Or pick an Emoji (if no photo)",
        empty:     "No audience yet",
        mineBtn:   "🔑 My Seat",
        mineTitle: "🔑 My Seat",
        minePh:    "Nickname",
        minePinPh: "4-digit PIN",
        mineQuery: "Search",
        mineEmptyInput: "Please enter nickname and PIN",
        mineLoading: "⏳ Searching...",
        mineNotFound: "❌ No matching seat found, please check nickname and PIN",
        mineDate:  "Date",
        mineName:  "Nickname",
        mineEdit:  "✏️ Edit Name",
        mineDelete:"🗑️ Delete",
        minePromptNewName: "Enter new nickname:",
        mineNameEmpty: "Nickname cannot be empty",
        mineUpdateFail: "Update failed: ",
        mineUpdateOk: "✅ Nickname updated",
        mineDeleteConfirm: "Are you sure you want to delete this seat? This cannot be undone.",
        mineDeleteFail: "Delete failed: ",
        mineDeleteOk: "✅ Seat deleted",
        pinSuccessTitle: "🎉 Registered!",
        pinSuccessDesc:  "Please remember this PIN — you can use it later to edit or delete your seat:",
        pinConfirmBtn:   "Got it",
        chatToggle: "💬 Chat",
        chatTitle:  "💬 Chat Room",
        chatSend:   "Send",
        chatNamePh: "Name",
        chatInputPh: "Say something...",
        chatEmpty:  "No messages yet, be the first!",
        chatNeedInput: "Please enter a nickname and message",
        zonePh: "Select your seating zone",
        chatViewLabel: "👀 Viewing",
        chatSendLabel: "📤 Send to",
        chatZoneAll: "🌐 All Zones (ALL)",
        chatToggleArea: "📍 Zone Chat",
        globalChatToggle: "🌐 Global Chat",
        globalChatTitle:  "🌐 Global Chat",
        shareModeEnter: "Share Mode",
        shareModeExit:  "Exit Share Mode",
        shareHint:      "Select up to 10 people to share",
        shareGenerate:  "🔗 Generate Share Link",
        shareResultTitle: "🔗 Link Generated",
        shareResultHint:  "Copy this link to share — only the selected people will be shown",
        shareCopy:        "📋 Copy Link"
    },
    th: {
        title:     "POND PHUWIN · Space Soul-dyssey CONCERT",
        count:     "จำนวนผู้ชม: ", unit: " คน",
        joined:    " เข้าร่วมแล้ว!", wait: "✨ รอผู้ชมเข้าสู่ระบบ...",
        loading:   "⏳ กำลังโหลด...", reg: "ลงทะเบียน",
        confirm:   "ยืนยัน", cancel: "ยกเลิก", close: "ปิด",
        listTitle: "💖 รายชื่อ", ph: "ชื่อเล่น",
        em:        "หรือเลือก Emoji (ถ้าไม่ได้อัปโหลดรูป)",
        empty:     "ยังไม่มีผู้ชม",
        mineBtn:   "🔑 ที่นั่งของฉัน",
        mineTitle: "🔑 ที่นั่งของฉัน",
        minePh:    "ชื่อเล่น",
        minePinPh: "รหัส 4 หลัก",
        mineQuery: "ค้นหา",
        mineEmptyInput: "กรุณากรอกชื่อเล่นและรหัส",
        mineLoading: "⏳ กำลังค้นหา...",
        mineNotFound: "❌ ไม่พบที่นั่งที่ตรงกัน กรุณาตรวจสอบชื่อเล่นและรหัส",
        mineDate:  "วันที่",
        mineName:  "ชื่อเล่น",
        mineEdit:  "✏️ แก้ไขชื่อ",
        mineDelete:"🗑️ ลบ",
        minePromptNewName: "กรอกชื่อเล่นใหม่:",
        mineNameEmpty: "ชื่อเล่นต้องไม่เว้นว่าง",
        mineUpdateFail: "แก้ไขล้มเหลว: ",
        mineUpdateOk: "✅ อัปเดตชื่อเล่นแล้ว",
        mineDeleteConfirm: "ยืนยันลบที่นั่งนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
        mineDeleteFail: "ลบล้มเหลว: ",
        mineDeleteOk: "✅ ลบที่นั่งแล้ว",
        pinSuccessTitle: "🎉 ลงทะเบียนสำเร็จ!",
        pinSuccessDesc:  "กรุณาจำรหัสนี้ไว้ ใช้สำหรับแก้ไขหรือลบที่นั่งของคุณในอนาคต:",
        pinConfirmBtn:   "จำแล้ว",
        chatToggle: "💬 แชท",
        chatTitle:  "💬 ห้องแชท",
        chatSend:   "ส่ง",
        chatNamePh: "ชื่อเล่น",
        chatInputPh: "พิมพ์ข้อความ...",
        chatEmpty:  "ยังไม่มีข้อความ มาเป็นคนแรกสิ!",
        chatNeedInput: "กรุณากรอกชื่อเล่นและข้อความ",
        zonePh: "เลือกโซนที่นั่งของคุณ",
        chatViewLabel: "👀 กำลังดู",
        chatSendLabel: "📤 ส่งไปยัง",
        chatZoneAll: "🌐 ทุกโซน (ALL)",
        chatToggleArea: "📍 แชทตามโซน",
        globalChatToggle: "🌐 แชทรวม",
        globalChatTitle:  "🌐 แชทรวม",
        shareModeEnter: "โหมดแชร์",
        shareModeExit:  "ออกจากโหมดแชร์",
        shareHint:      "เลือกได้สูงสุด 10 คน",
        shareGenerate:  "🔗 สร้างลิงก์แชร์",
        shareResultTitle: "🔗 สร้างลิงก์แล้ว",
        shareResultHint:  "คัดลอกลิงก์นี้ไปแชร์ จะแสดงเฉพาะคนที่เลือกเท่านั้น",
        shareCopy:        "📋 คัดลอกลิงก์"
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

    setText('ui-mine-btn', d.mineBtn);
    setText('ui-mine-title', d.mineTitle);
    setAttr('mine-name', 'placeholder', d.minePh);
    setAttr('mine-pin', 'placeholder', d.minePinPh);
    setText('ui-mine-query', d.mineQuery);
    setText('ui-mine-close', d.close);
    setText('ui-pin-title', d.pinSuccessTitle);
    setText('ui-pin-desc', d.pinSuccessDesc);
    setText('ui-pin-confirm', d.pinConfirmBtn);

    setText('ui-chat-toggle', d.chatToggle);
    setText('ui-chat-title', d.chatTitle);
    setText('ui-chat-send', d.chatSend);
    setAttr('chat-name', 'placeholder', d.chatNamePh);
    setAttr('chat-input', 'placeholder', d.chatInputPh);
    setText('ui-zone-placeholder', d.zonePh);
    setText('ui-chat-view-label', d.chatViewLabel);
    setText('ui-chat-send-label', d.chatSendLabel);
    setText('ui-chat-zone-all', d.chatZoneAll);
    setText('ui-chat-toggle', d.chatToggleArea);
    setText('ui-global-chat-toggle', d.globalChatToggle);
    setText('ui-global-chat-title', d.globalChatTitle);
    setText('ui-global-chat-send', d.chatSend);
    setAttr('global-chat-name', 'placeholder', d.chatNamePh);
    setAttr('global-chat-input', 'placeholder', d.chatInputPh);

    if (!shareMode) {
        const shareToggle = document.getElementById('ui-share-toggle');
        if (shareToggle) shareToggle.textContent = '📤 ' + d.shareModeEnter;
    }
    setText('ui-share-hint', d.shareHint);
    setText('ui-share-generate', d.shareGenerate);
    setText('ui-share-result-title', d.shareResultTitle);
    setText('ui-share-result-hint', d.shareResultHint);
    setText('ui-share-copy', d.shareCopy);

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
    if (id === 'modal') ['name','zone','img','emoji'].forEach(i => { const el = document.getElementById(i); if(el) el.value=''; });
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

    // 若聊天抽屜開著，切換場次後重新載入對應聊天訊息
    const chatDrawer = document.getElementById('chat-drawer');
    if (chatDrawer && chatDrawer.classList.contains('open')) {
        await loadChatMessages();
    }
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
    const zone   = document.getElementById('zone').value;
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
        pin:      pin,
        zone:     zone || null
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
    let seats = allData[currentDate] || [];
    const lang  = getLang();
    const d     = i18n[lang];

    // 截圖專用模式：只顯示被選中的人
    if (screenshotMode && screenshotIds.length > 0) {
        seats = seats.filter(s => screenshotIds.includes(s.id));
    }

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

        // 點頭像顯示暱稱（截圖模式下不需要互動）
        if (!screenshotMode) {
            node.addEventListener('click', (e) => {
                e.stopPropagation();
                showNameTooltip(node, s.name);
            });
        }

        wrapper.appendChild(node);
    });

    if (!screenshotMode) renderList();
}

// ────────────────────────────────────────────
// Render（名單，支援搜尋過濾）
// ────────────────────────────────────────────
let shareMode = false;
let selectedShareIds = new Set();

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

        if (shareMode) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = selectedShareIds.has(s.id);
            checkbox.style.cssText = 'margin-right:8px; width:16px; height:16px; flex-shrink:0;';
            checkbox.onclick = (e) => {
                e.stopPropagation();
                if (checkbox.checked) {
                    if (selectedShareIds.size >= 10) {
                        checkbox.checked = false;
                        alert(lang === 'th' ? 'เลือกได้สูงสุด 10 คน' : lang === 'en' ? 'Max 10 people' : '最多只能選 10 位');
                        return;
                    }
                    selectedShareIds.add(s.id);
                } else {
                    selectedShareIds.delete(s.id);
                }
            };
            item.appendChild(checkbox);
        }

        const span = document.createElement('span');
        span.textContent = s.name;
        item.appendChild(span);

        item.addEventListener('click', (e) => {
            if (e.target.closest('.btn-del') || e.target.tagName === 'INPUT') return;

            if (shareMode) {
                // 分享模式下點整列也等同勾選
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) checkbox.click();
                return;
            }

            closeModal('list-modal');
            jumpToSeat(s.id);
        });

        if (isAdmin && !shareMode) {
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

function toggleShareMode() {
    shareMode = !shareMode;
    selectedShareIds.clear();
    const toolbar = document.getElementById('share-toolbar');
    const toggleBtn = document.getElementById('ui-share-toggle');
    if (toolbar) toolbar.style.display = shareMode ? 'block' : 'none';
    if (toggleBtn) {
        const d = i18n[getLang()];
        toggleBtn.textContent = shareMode ? '✕ ' + d.shareModeExit : '📤 ' + d.shareModeEnter;
        toggleBtn.style.background = shareMode ? 'rgba(255,60,60,0.7)' : 'transparent';
        toggleBtn.style.color = shareMode ? '#fff' : 'var(--main)';
        toggleBtn.style.border = shareMode ? 'none' : '1px solid var(--main)';
    }
    renderList();
}

function generateShareLink() {
    if (selectedShareIds.size === 0) {
        const lang = getLang();
        alert(lang === 'th' ? 'กรุณาเลือกอย่างน้อย 1 คน' : lang === 'en' ? 'Please select at least 1 person' : '請至少選擇 1 位');
        return;
    }

    const ids = Array.from(selectedShareIds).join(',');
    const url = `${window.location.origin}${window.location.pathname}?share=1&date=${encodeURIComponent(currentDate)}&ids=${ids}`;

    const output = document.getElementById('share-link-output');
    if (output) output.value = url;

    closeModal('list-modal');
    openModal('share-result-modal');
}

function copyShareLink() {
    const output = document.getElementById('share-link-output');
    if (!output) return;
    output.select();
    output.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(output.value).then(() => {
        const lang = getLang();
        alert(lang === 'th' ? '✅ คัดลอกแล้ว' : lang === 'en' ? '✅ Copied!' : '✅ 已複製連結');
    }).catch(() => {
        document.execCommand('copy');
    });
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
    const d = i18n[getLang()];

    const name = nameEl.value.trim();
    const pin  = pinEl.value.trim();

    if (!name || !pin) {
        resultEl.innerHTML = `<p style="color:#ff6b6b; font-size:13px;">${d.mineEmptyInput}</p>`;
        return;
    }

    resultEl.innerHTML = `<p style="color:rgba(255,255,255,0.6); font-size:13px;">${d.mineLoading}</p>`;

    const { data, error } = await db
        .from('seats')
        .select('*')
        .eq('name', name)
        .eq('pin', pin);

    if (error || !data || data.length === 0) {
        resultEl.innerHTML = `<p style="color:#ff6b6b; font-size:13px;">${d.mineNotFound}</p>`;
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
        info.textContent = `📍 ${d.mineDate} ${seat.date}　${d.mineName}：${seat.name}`;
        card.appendChild(info);

        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex; gap:8px;';

        const editBtn = document.createElement('button');
        editBtn.textContent = d.mineEdit;
        editBtn.style.cssText = 'flex:1; padding:8px; border-radius:8px; border:1px solid var(--main); background:transparent; color:var(--main); font-size:12px;';
        editBtn.onclick = () => editMySeat(seat);

        const delBtn = document.createElement('button');
        delBtn.textContent = d.mineDelete;
        delBtn.style.cssText = 'flex:1; padding:8px; border-radius:8px; border:none; background:rgba(255,60,60,0.7); color:#fff; font-size:12px;';
        delBtn.onclick = () => deleteMySeat(seat);

        btnRow.appendChild(editBtn);
        btnRow.appendChild(delBtn);
        card.appendChild(btnRow);
        resultEl.appendChild(card);
    });
}

async function editMySeat(seat) {
    const d = i18n[getLang()];
    const newName = prompt(d.minePromptNewName, seat.name);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) { alert(d.mineNameEmpty); return; }

    const { error } = await db
        .from('seats')
        .update({ name: trimmed })
        .eq('id', seat.id)
        .eq('pin', seat.pin);

    if (error) {
        alert(d.mineUpdateFail + error.message);
    } else {
        alert(d.mineUpdateOk);
        await loadSeats();
        closeModal('mine-modal');
    }
}

async function deleteMySeat(seat) {
    const d = i18n[getLang()];
    if (!confirm(d.mineDeleteConfirm)) return;

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
        alert(d.mineDeleteFail + error.message);
    } else {
        alert(d.mineDeleteOk);
        await loadSeats();
        closeModal('mine-modal');
    }
}

// ────────────────────────────────────────────
// 聊天室（按場次分區，輪詢更新）
// ────────────────────────────────────────────
let chatPollTimer = null;

function openChat() {
    document.getElementById('chat-drawer').classList.add('open');
    document.getElementById('chat-overlay').classList.add('show');
    loadChatMessages();
    if (chatPollTimer) clearInterval(chatPollTimer);
    chatPollTimer = setInterval(loadChatMessages, 8000); // 聊天室更新頻率比座位快一些
}

function closeChat() {
    document.getElementById('chat-drawer').classList.remove('open');
    document.getElementById('chat-overlay').classList.remove('show');
    if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
}

async function loadChatMessages() {
    const zoneSelect = document.getElementById('chat-zone-select');
    const zone = zoneSelect ? zoneSelect.value : '';

    let query = db
        .from('chat_messages')
        .select('*')
        .eq('date', currentDate)
        .order('created_at', { ascending: true })
        .limit(200);

    if (zone) {
        // 看特定區域時：該區域訊息 + 廣播給全部區域（ALL）的訊息都要顯示
        query = query.or(`zone.eq.${zone},zone.eq.ALL`);
    }
    // zone 為空（查看全部區域）時不加篩選，顯示所有訊息

    const { data, error } = await query;

    if (error) { console.error('Chat load error:', error); return; }

    renderChatMessages(data || []);
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;

    container.innerHTML = '';
    const d = i18n[getLang()];

    if (messages.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'text-align:center; color:rgba(255,255,255,0.4); font-size:13px; margin-top:20px;';
        p.textContent = d.chatEmpty;
        container.appendChild(p);
        return;
    }

    messages.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'chat-msg';

        const nameEl = document.createElement('span');
        nameEl.className = 'chat-msg-name';
        const zoneLabel = msg.zone === 'ALL' ? '🌐 ALL' : msg.zone;
        nameEl.textContent = zoneLabel ? `${msg.name} · ${zoneLabel}` : msg.name;
        item.appendChild(nameEl);

        const textEl = document.createElement('span');
        textEl.className = 'chat-msg-text';
        textEl.textContent = msg.message;
        item.appendChild(textEl);

        if (isAdmin) {
            const delBtn = document.createElement('button');
            delBtn.className = 'chat-msg-del';
            delBtn.textContent = '✕';
            delBtn.onclick = () => deleteChatMessage(msg.id);
            item.appendChild(delBtn);
        }

        container.appendChild(item);
    });

    if (wasAtBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendChatMessage() {
    const nameEl  = document.getElementById('chat-name');
    const inputEl = document.getElementById('chat-input');
    const sendZoneSelect = document.getElementById('chat-send-zone-select');
    const d = i18n[getLang()];

    const name = nameEl.value.trim();
    const message = inputEl.value.trim();
    const zone = sendZoneSelect ? sendZoneSelect.value : 'ALL';

    if (!name || !message) {
        alert(d.chatNeedInput);
        return;
    }

    const { error } = await db.from('chat_messages').insert({
        date: currentDate,
        name: name,
        message: message,
        zone: zone
    });

    if (error) {
        console.error('Send chat error:', error);
        alert('送出失敗，請再試一次');
        return;
    }

    inputEl.value = '';
    await loadChatMessages();
}

async function deleteChatMessage(id) {
    const { error } = await db.from('chat_messages').delete().eq('id', id);
    if (error) console.error('Delete chat error:', error);
    else await loadChatMessages();
}

// ────────────────────────────────────────────
// 全場聊天室（不分場次、不分區域，所有人共用）
// ────────────────────────────────────────────
let globalChatPollTimer = null;

function openGlobalChat() {
    document.getElementById('global-chat-drawer').classList.add('open');
    document.getElementById('global-chat-overlay').classList.add('show');
    loadGlobalChatMessages();
    if (globalChatPollTimer) clearInterval(globalChatPollTimer);
    globalChatPollTimer = setInterval(loadGlobalChatMessages, 8000);
}

function closeGlobalChat() {
    document.getElementById('global-chat-drawer').classList.remove('open');
    document.getElementById('global-chat-overlay').classList.remove('show');
    if (globalChatPollTimer) { clearInterval(globalChatPollTimer); globalChatPollTimer = null; }
}

async function loadGlobalChatMessages() {
    // 不限定 date（跨場次共用），zone 固定為 GLOBAL
    const { data, error } = await db
        .from('chat_messages')
        .select('*')
        .eq('zone', 'GLOBAL')
        .order('created_at', { ascending: true })
        .limit(200);

    if (error) { console.error('Global chat load error:', error); return; }

    renderGlobalChatMessages(data || []);
}

function renderGlobalChatMessages(messages) {
    const container = document.getElementById('global-chat-messages');
    if (!container) return;

    const wasAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;

    container.innerHTML = '';
    const d = i18n[getLang()];

    if (messages.length === 0) {
        const p = document.createElement('p');
        p.style.cssText = 'text-align:center; color:rgba(255,255,255,0.4); font-size:13px; margin-top:20px;';
        p.textContent = d.chatEmpty;
        container.appendChild(p);
        return;
    }

    messages.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'chat-msg';

        const nameEl = document.createElement('span');
        nameEl.className = 'chat-msg-name';
        nameEl.textContent = msg.name;
        item.appendChild(nameEl);

        const textEl = document.createElement('span');
        textEl.className = 'chat-msg-text';
        textEl.textContent = msg.message;
        item.appendChild(textEl);

        if (isAdmin) {
            const delBtn = document.createElement('button');
            delBtn.className = 'chat-msg-del';
            delBtn.textContent = '✕';
            delBtn.onclick = () => deleteGlobalChatMessage(msg.id);
            item.appendChild(delBtn);
        }

        container.appendChild(item);
    });

    if (wasAtBottom) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendGlobalChatMessage() {
    const nameEl  = document.getElementById('global-chat-name');
    const inputEl = document.getElementById('global-chat-input');
    const d = i18n[getLang()];

    const name = nameEl.value.trim();
    const message = inputEl.value.trim();

    if (!name || !message) {
        alert(d.chatNeedInput);
        return;
    }

    const { error } = await db.from('chat_messages').insert({
        date: null,       // 全場聊天室不綁定特定場次
        name: name,
        message: message,
        zone: 'GLOBAL'
    });

    if (error) {
        console.error('Send global chat error:', error);
        alert('送出失敗，請再試一次');
        return;
    }

    inputEl.value = '';
    await loadGlobalChatMessages();
}

async function deleteGlobalChatMessage(id) {
    const { error } = await db.from('chat_messages').delete().eq('id', id);
    if (error) console.error('Delete global chat error:', error);
    else await loadGlobalChatMessages();
}

// Enter 鍵送出訊息
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendChatMessage();
        });
    }

    const globalChatInput = document.getElementById('global-chat-input');
    if (globalChatInput) {
        globalChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendGlobalChatMessage();
        });
    }
});

// ────────────────────────────────────────────
// 點擊背景關閉 Modal
// ────────────────────────────────────────────
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            if (modal.id === 'modal') {
                ['name','zone','img','emoji'].forEach(i => { const el = document.getElementById(i); if(el) el.value=''; });
            }
        }
    });
});

// ────────────────────────────────────────────
// Init
// ────────────────────────────────────────────
window.onload = async () => {
    setLang(getLang());

    if (screenshotMode) {
        enterScreenshotMode();
    }

    const bar = document.getElementById('notify-bar');
    if (bar) bar.textContent = i18n[getLang()].loading;

    if (screenshotMode && screenshotDate) {
        currentDate = screenshotDate;
    }

    await loadSeats();

    if (screenshotMode) {
        // 截圖模式不需要輪詢、不需要等待提示文字
        if (bar) bar.style.display = 'none';
    } else {
        subscribeRealtime();
        if (bar && bar.dataset.isUser !== 'true') {
            bar.textContent = i18n[getLang()].wait;
        }
    }
};

// ────────────────────────────────────────────
// 進入截圖專用模式：隱藏所有按鈕與互動 UI
// ────────────────────────────────────────────
function enterScreenshotMode() {
    document.body.classList.add('screenshot-mode');

    const hideIds = [
        'ui-chat-toggle', 'ui-global-chat-toggle',
        'date-select',
    ];
    hideIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 隱藏語言切換、stats-area 的按鈕（List / 我的座位）
    document.querySelectorAll('.lang-group, .stats-area, .control-row').forEach(el => {
        el.style.display = 'none';
    });

    // 隱藏 header 的場次/語言列，只保留標題
    const header = document.querySelector('header');
    if (header) header.style.borderRadius = '18px';
}
