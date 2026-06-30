/* ════════════════════════════════════════
   POND PHUWIN · Space Soul-dyssey CONCERT
   script.js — Supabase 即時同步版
   ════════════════════════════════════════ */


/* ────────────────────────────────────────────
   1. Supabase 連線設定
   ──────────────────────────────────────────── */
const SUPABASE_URL = "https://jnpddmlnikjtvqrgbtjo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpucGRkbWxuaWtqdHZxcmdidGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTA4MzEsImV4cCI6MjA5ODMyNjgzMX0.vkkF5z24fPaT7-Z2NiO6HXLyWMq8zhmmDHAo7J9ZkgE";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});


/* ────────────────────────────────────────────
   2. 全域狀態
   ──────────────────────────────────────────── */
let currentDate = "8/21";
let isAdmin = sessionStorage.getItem('admin') === 'true';
let lastRegisteredName = "";
let lastPos = { x: 0, y: 0 };
let allData = { "8/21": [], "8/22": [], "8/23": [] };

let realtimeChannel = null;   // 座位輪詢計時器
let chatPollTimer = null;     // 區域聊天室輪詢計時器
let globalChatPollTimer = null; // 全場聊天室輪詢計時器
let tooltipTimer = null;      // 暱稱提示框自動隱藏計時器

let shareMode = false;            // 是否處於「分享模式」
let selectedShareIds = new Set(); // 分享模式下被勾選的座位 id

// 截圖專用模式（透過分享連結進入，網址帶 ?share=1）
const urlParams = new URLSearchParams(window.location.search);
const screenshotMode = urlParams.get('share') === '1';
const screenshotIds = screenshotMode
    ? (urlParams.get('ids') || '').split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n))
    : [];
const screenshotDate = urlParams.get('date');


/* ────────────────────────────────────────────
   3. 多語言文字（i18n）
   ──────────────────────────────────────────── */
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

        // 我的座位
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

        // 登記成功提示密碼
        pinSuccessTitle: "🎉 登記成功！",
        pinSuccessDesc:  "請記住這組密碼，之後可用來修改或刪除你的座位：",
        pinConfirmBtn:   "我記住了",

        // 區域聊天室
        chatToggleArea: "📍 區域聊天",
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

        // 全場聊天室
        globalChatToggle: "🌐 全場聊天室",
        globalChatTitle:  "🌐 全場聊天室",

        // 分享模式
        shareModeEnter: "分享模式",
        shareModeExit:  "結束分享模式",
        shareHint:      "勾選想要分享的人，最多 10 位",
        shareGenerate:  "🔗 產生分享連結",
        shareResultTitle: "🔗 分享連結已產生",
        shareResultHint:  "複製這個連結分享出去，打開後只會看到被選中的人",
        shareCopy:        "📋 複製連結",
        addSeatBtn: "➕ 新增座位",
        mapFilterAll: "🗺️ 顯示全部區域",
        statsOutOfZone: "(???)"
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

        chatToggleArea: "📍 Zone Chat",
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

        globalChatToggle: "🌐 Global Chat",
        globalChatTitle:  "🌐 Global Chat",

        shareModeEnter: "Share Mode",
        shareModeExit:  "Exit Share Mode",
        shareHint:      "Select up to 10 people to share",
        shareGenerate:  "🔗 Generate Share Link",
        shareResultTitle: "🔗 Link Generated",
        shareResultHint:  "Copy this link to share — only the selected people will be shown",
        shareCopy:        "📋 Copy Link",
        addSeatBtn: "➕ Add Seat",
        mapFilterAll: "🗺️ Show All Zones",
        statsOutOfZone: "(???)"
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

        chatToggleArea: "📍 แชทตามโซน",
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

        globalChatToggle: "🌐 แชทรวม",
        globalChatTitle:  "🌐 แชทรวม",

        shareModeEnter: "โหมดแชร์",
        shareModeExit:  "ออกจากโหมดแชร์",
        shareHint:      "เลือกได้สูงสุด 10 คน",
        shareGenerate:  "🔗 สร้างลิงก์แชร์",
        shareResultTitle: "🔗 สร้างลิงก์แล้ว",
        shareResultHint:  "คัดลอกลิงก์นี้ไปแชร์ จะแสดงเฉพาะคนที่เลือกเท่านั้น",
        shareCopy:        "📋 คัดลอกลิงก์",
        addSeatBtn: "➕ เพิ่มที่นั่ง",
        mapFilterAll: "🗺️ แสดงทุกโซน",
        statsOutOfZone: "(???)"
    }
};

function getLang() {
    return localStorage.getItem('lang') || 'zh';
}


/* ────────────────────────────────────────────
   4. 語言切換
   ──────────────────────────────────────────── */
function setLang(l) {
    localStorage.setItem('lang', l);
    const d = i18n[l];
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setAttr = (id, a, v) => { const el = document.getElementById(id); if (el) el.setAttribute(a, v); };

    // 主畫面 / 登記座位
    setText('ui-title', d.title);
    setText('ui-m-title', d.reg);
    setText('ui-btn', d.confirm);
    setText('ui-cancel-btn', d.cancel);
    setText('ui-close-btn', d.close);
    setText('ui-list-title', d.listTitle);
    setText('ui-emoji-placeholder', d.em);
    setAttr('name', 'placeholder', d.ph);
    setText('ui-zone-placeholder', d.zonePh);

    // 我的座位
    setText('ui-mine-btn', d.mineBtn);
    setText('ui-mine-title', d.mineTitle);
    setAttr('mine-name', 'placeholder', d.minePh);
    setAttr('mine-pin', 'placeholder', d.minePinPh);
    setText('ui-mine-query', d.mineQuery);
    setText('ui-mine-close', d.close);

    // 登記成功密碼提示
    setText('ui-pin-title', d.pinSuccessTitle);
    setText('ui-pin-desc', d.pinSuccessDesc);
    setText('ui-pin-confirm', d.pinConfirmBtn);

    // 區域聊天室
    setText('ui-chat-toggle', d.chatToggleArea);
    setText('ui-chat-title', d.chatTitle);
    setText('ui-chat-send', d.chatSend);
    setAttr('chat-name', 'placeholder', d.chatNamePh);
    setAttr('chat-input', 'placeholder', d.chatInputPh);
    setText('ui-chat-view-label', d.chatViewLabel);
    setText('ui-chat-send-label', d.chatSendLabel);
    setText('ui-chat-zone-all', d.chatZoneAll);

    // 全場聊天室
    setText('ui-global-chat-toggle', d.globalChatToggle);
    setText('ui-global-chat-title', d.globalChatTitle);
    setText('ui-global-chat-send', d.chatSend);
    setAttr('global-chat-name', 'placeholder', d.chatNamePh);
    setAttr('global-chat-input', 'placeholder', d.chatInputPh);

    // 分享模式
    if (!shareMode) {
        const shareToggle = document.getElementById('ui-share-toggle');
        if (shareToggle) shareToggle.textContent = '📤 ' + d.shareModeEnter;
    }
    setText('ui-share-hint', d.shareHint);
    setText('ui-share-generate', d.shareGenerate);
    setText('ui-share-result-title', d.shareResultTitle);
    setText('ui-share-result-hint', d.shareResultHint);
    setText('ui-share-copy', d.shareCopy);

    // 新增座位按鈕
    setText('ui-add-seat-btn', d.addSeatBtn);

    // 地圖區域篩選選單
    setText('ui-map-filter-all', d.mapFilterAll);
    setText('ui-map-filter-outofzone', d.statsOutOfZone);

    const bar = document.getElementById('notify-bar');
    if (bar && bar.dataset.isUser !== 'true') bar.textContent = d.wait;

    render();
}


/* ────────────────────────────────────────────
   5. Modal 開關工具
   ──────────────────────────────────────────── */
function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
    if (id === 'modal') {
        ['name', 'zone', 'img', 'emoji'].forEach(i => {
            const el = document.getElementById(i);
            if (el) el.value = '';
        });
    }
}

// 點擊 Modal 外側暗色背景可直接關閉
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            if (modal.id === 'modal') {
                ['name', 'zone', 'img', 'emoji'].forEach(i => {
                    const el = document.getElementById(i);
                    if (el) el.value = '';
                });
            }
        }
    });
});


/* ────────────────────────────────────────────
   6. 場次切換
   ──────────────────────────────────────────── */
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


/* ────────────────────────────────────────────
   7. 地圖縮放與拖曳（雙指縮放 / 拖曳平移 / 滾輪 / 按鈕）
   ──────────────────────────────────────────── */
const mapViewport = document.getElementById('map-viewport');
const mapInner = document.getElementById('map-inner');

let mapScale = 1;
let mapTranslateX = 0;
let mapTranslateY = 0;

const MAP_MIN_SCALE = 0.6;
const MAP_MAX_SCALE = 4;

function applyMapTransform() {
    mapInner.style.transform = `translate(${mapTranslateX}px, ${mapTranslateY}px) scale(${mapScale})`;
}

// 縮放時把超出邊界的位移夾回合理範圍，避免地圖被拖出視窗外太多
function clampMapTranslate() {
    const viewportRect = mapViewport.getBoundingClientRect();
    const scaledWidth = viewportRect.width * mapScale;
    const scaledHeight = viewportRect.height * mapScale;

    if (scaledWidth <= viewportRect.width) {
        // 地圖比視窗還小（縮小檢視）：直接置中，不允許拖出視窗
        mapTranslateX = (viewportRect.width - scaledWidth) / 2;
    } else {
        const maxX = 0;
        const minX = viewportRect.width - scaledWidth;
        mapTranslateX = Math.min(maxX, Math.max(minX, mapTranslateX));
    }

    if (scaledHeight <= viewportRect.height) {
        mapTranslateY = (viewportRect.height - scaledHeight) / 2;
    } else {
        const maxY = 0;
        const minY = viewportRect.height - scaledHeight;
        mapTranslateY = Math.min(maxY, Math.max(minY, mapTranslateY));
    }
}

function zoomMap(factor, centerX, centerY) {
    const viewportRect = mapViewport.getBoundingClientRect();
    const cx = centerX !== undefined ? centerX - viewportRect.left : viewportRect.width / 2;
    const cy = centerY !== undefined ? centerY - viewportRect.top : viewportRect.height / 2;

    const newScale = Math.min(MAP_MAX_SCALE, Math.max(MAP_MIN_SCALE, mapScale * factor));
    const actualFactor = newScale / mapScale;

    // 讓縮放以指定中心點為基準，而不是永遠以左上角為基準
    mapTranslateX = cx - (cx - mapTranslateX) * actualFactor;
    mapTranslateY = cy - (cy - mapTranslateY) * actualFactor;
    mapScale = newScale;

    clampMapTranslate();
    applyMapTransform();
}

function resetMapZoom() {
    mapScale = 1;
    mapTranslateX = 0;
    mapTranslateY = 0;
    applyMapTransform();
}

// ── 滑鼠滾輪縮放（桌機）──
mapViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    zoomMap(factor, e.clientX, e.clientY);
}, { passive: false });

// ── 觸控：拖曳平移 + 雙指縮放 ──
let touchState = null; // 'pan' | 'pinch' | null
let lastPanX = 0, lastPanY = 0;
let lastPinchDist = 0;
let isPossibleTap = false; // 用來分辨「點擊新增座位」還是「拖曳地圖」

function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

mapViewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        touchState = 'pan';
        isPossibleTap = true; // 單指剛開始，先假設可能是點擊
        lastPanX = e.touches[0].clientX;
        lastPanY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        touchState = 'pinch';
        isPossibleTap = false;
        lastPinchDist = getTouchDist(e.touches);
    }
}, { passive: true });

mapViewport.addEventListener('touchmove', (e) => {
    if (touchState === 'pan' && e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastPanX;
        const dy = e.touches[0].clientY - lastPanY;

        // 移動超過一點點距離，視為拖曳而非單純點擊
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) isPossibleTap = false;

        if (mapScale > 1) {
            e.preventDefault();
            mapTranslateX += dx;
            mapTranslateY += dy;
            clampMapTranslate();
            applyMapTransform();
        }

        lastPanX = e.touches[0].clientX;
        lastPanY = e.touches[0].clientY;
    } else if (touchState === 'pinch' && e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const factor = dist / lastPinchDist;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomMap(factor, cx, cy);
        lastPinchDist = dist;
    }
}, { passive: false });

mapViewport.addEventListener('touchend', () => {
    touchState = null;
});

// ── 桌機：滑鼠拖曳平移（放大狀態下）──
let isMouseDragging = false;
let mouseDragMoved = false;
let lastMouseX = 0, lastMouseY = 0;

mapViewport.addEventListener('mousedown', (e) => {
    if (mapScale <= 1) return;
    isMouseDragging = true;
    mouseDragMoved = false;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

window.addEventListener('mousemove', (e) => {
    if (!isMouseDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) mouseDragMoved = true;

    mapTranslateX += dx;
    mapTranslateY += dy;
    clampMapTranslate();
    applyMapTransform();

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

window.addEventListener('mouseup', () => {
    isMouseDragging = false;
});


/* ────────────────────────────────────────────
   7-2. 地圖點擊（新增座位）
   ──────────────────────────────────────────── */
const wrapper = document.getElementById('map-wrapper');

wrapper.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    const rect = wrapper.getBoundingClientRect();
    lastPos = {
        x: ((t.clientX - rect.left) / rect.width) * 100,
        y: ((t.clientY - rect.top) / rect.height) * 100
    };
}, { passive: true });

wrapper.addEventListener('click', (e) => {
    // 剛剛是拖曳地圖造成的點擊事件，不應該觸發新增座位
    if (!isPossibleTap && e.pointerType === 'touch') return;
    if (mouseDragMoved && e.pointerType !== 'touch') { mouseDragMoved = false; return; }

    // 桌機滑鼠點擊：pointerType 不是 touch，需要在這裡取座標
    if (e.pointerType !== 'touch') {
        const rect = wrapper.getBoundingClientRect();
        lastPos = {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };
    }
    openModal('modal');
});


/* ────────────────────────────────────────────
   7-3. 區域座標對照表（依座位圖實際量測，單位：百分比）
   ──────────────────────────────────────────── */
// 中心點：用於「新增座位」按鈕選擇區域時的定位
const ZONE_COORDS = {
    A1: { x: 33.27, y: 30.19 }, A2: { x: 41.32, y: 26.26 },
    A3: { x: 58.68, y: 26.26 }, A4: { x: 66.82, y: 30.19 },
    B1: { x: 34.44, y: 44.28 }, B2: { x: 49.91, y: 46.29 }, B3: { x: 65.56, y: 44.28 },
    C1: { x: 34.44, y: 53.71 }, C2: { x: 49.91, y: 53.71 }, C3: { x: 65.56, y: 53.71 },
    FF: { x: 42.04, y: 60.66 }, HH: { x: 56.71, y: 60.66 },
    SB: { x: 23.88, y: 22.42 }, SC: { x: 23.88, y: 31.38 },
    SD: { x: 23.88, y: 43.00 }, SE: { x: 23.88, y: 54.53 },
    SF: { x: 29.87, y: 65.05 }, SG: { x: 39.80, y: 73.19 },
    SH: { x: 49.91, y: 71.91 }, SI: { x: 60.11, y: 73.19 },
    SJ: { x: 70.48, y: 65.05 }, SK: { x: 76.48, y: 54.53 },
    SL: { x: 76.48, y: 43.00 }, SM: { x: 76.48, y: 31.38 }, SN: { x: 76.48, y: 22.42 },
    C:  { x: 7.87,  y: 31.38 }, D:  { x: 7.87,  y: 43.00 }, E:  { x: 7.87,  y: 54.53 },
    F:  { x: 10.64, y: 64.68 }, G:  { x: 14.67, y: 73.01 }, H:  { x: 19.86, y: 80.79 },
    I:  { x: 29.87, y: 86.09 }, J:  { x: 39.80, y: 88.11 }, K:  { x: 49.91, y: 88.47 },
    L:  { x: 60.11, y: 88.11 }, M:  { x: 70.21, y: 86.09 }, N:  { x: 80.32, y: 80.79 },
    O:  { x: 85.51, y: 73.01 }, P:  { x: 89.53, y: 64.68 }, Q:  { x: 92.31, y: 54.53 },
    R:  { x: 92.31, y: 43.00 }, S:  { x: 92.31, y: 31.38 }
};

// 矩形邊界：用於精準判斷某個座標實際落在哪個座位區內（x1,y1 為左上角，x2,y2 為右下角，單位百分比）
const ZONE_BOUNDS = {
    A1: { x1: 28.18, y1: 22.87, x2: 38.01, y2: 37.51 },
    A2: { x1: 38.01, y1: 21.04, x2: 51.43, y2: 37.51 },
    A3: { x1: 50.54, y1: 21.04, x2: 63.95, y2: 37.51 },
    A4: { x1: 63.95, y1: 22.87, x2: 73.79, y2: 37.51 },
    B1: { x1: 30.86, y1: 38.43, x2: 38.01, y2: 50.32 },
    B2: { x1: 38.01, y1: 38.43, x2: 62.16, y2: 51.69 },
    B3: { x1: 62.16, y1: 38.43, x2: 69.32, y2: 50.32 },
    C1: { x1: 30.86, y1: 51.69, x2: 38.01, y2: 56.27 },
    C2: { x1: 38.01, y1: 51.69, x2: 62.16, y2: 56.27 },
    C3: { x1: 62.16, y1: 51.69, x2: 69.32, y2: 56.27 },
    FF: { x1: 40.25, y1: 57.18, x2: 46.96, y2: 64.04 },
    HH: { x1: 52.77, y1: 57.18, x2: 59.48, y2: 64.04 },
    SB: { x1: 19.68, y1: 18.30, x2: 28.18, y2: 26.53 },
    SC: { x1: 19.68, y1: 26.53, x2: 28.18, y2: 36.14 },
    SD: { x1: 19.68, y1: 36.14, x2: 28.18, y2: 46.66 },
    SE: { x1: 19.68, y1: 46.66, x2: 28.18, y2: 56.72 },
    SF: { x1: 20.13, y1: 56.72, x2: 33.99, y2: 65.87 },
    SG: { x1: 34.44, y1: 65.87, x2: 44.72, y2: 77.31 },
    SH: { x1: 44.72, y1: 64.50, x2: 55.46, y2: 77.31 },
    SI: { x1: 55.46, y1: 65.87, x2: 65.74, y2: 77.31 },
    SJ: { x1: 66.64, y1: 56.72, x2: 80.50, y2: 65.87 },
    SK: { x1: 73.79, y1: 46.66, x2: 80.50, y2: 56.72 },
    SL: { x1: 73.79, y1: 36.14, x2: 80.50, y2: 46.66 },
    SM: { x1: 73.79, y1: 26.53, x2: 80.50, y2: 36.14 },
    SN: { x1: 73.79, y1: 18.30, x2: 80.50, y2: 26.53 },
    C:  { x1: 2.24,  y1: 26.08, x2: 19.68, y2: 36.14 },
    D:  { x1: 2.24,  y1: 36.14, x2: 19.68, y2: 46.66 },
    E:  { x1: 2.24,  y1: 46.66, x2: 19.68, y2: 56.72 },
    F:  { x1: 0.89,  y1: 60.38, x2: 21.02, y2: 69.99 },
    G:  { x1: 0.45,  y1: 69.99, x2: 26.39, y2: 79.60 },
    H:  { x1: 0.00,  y1: 78.23, x2: 32.20, y2: 88.29 },
    I:  { x1: 16.10, y1: 82.80, x2: 37.12, y2: 92.41 },
    J:  { x1: 35.33, y1: 82.80, x2: 45.62, y2: 92.41 },
    K:  { x1: 40.70, y1: 82.80, x2: 53.67, y2: 92.86 },
    L:  { x1: 53.67, y1: 82.80, x2: 63.95, y2: 92.41 },
    M:  { x1: 62.61, y1: 82.80, x2: 83.63, y2: 92.41 },
    N:  { x1: 67.98, y1: 78.23, x2: 100.00, y2: 88.29 },
    O:  { x1: 73.79, y1: 69.99, x2: 99.73, y2: 79.60 },
    P:  { x1: 79.16, y1: 60.38, x2: 99.46, y2: 69.99 },
    Q:  { x1: 80.50, y1: 46.66, x2: 97.94, y2: 56.72 },
    R:  { x1: 80.50, y1: 36.14, x2: 97.94, y2: 46.66 },
    S:  { x1: 80.50, y1: 26.08, x2: 97.94, y2: 36.14 }
};

// 同一區域內多人時，在中心點附近做小範圍隨機散開，避免完全重疊在同一格
function jitterZoneCoord(zone) {
    const base = ZONE_COORDS[zone];
    if (!base) return { x: 50, y: 50 }; // 找不到對照時退回地圖中心

    const range = 3; // 上下左右各 3% 範圍內隨機散開
    return {
        x: Math.min(98, Math.max(2, base.x + (Math.random() - 0.5) * range * 2)),
        y: Math.min(98, Math.max(2, base.y + (Math.random() - 0.5) * range * 2))
    };
}

// 根據實際座標 (x, y) 判斷落在哪個座位區的矩形範圍內；都不在任何範圍內則視為「非座位區」
const ZONE_BOUNDS_PADDING = 1.5; // 容許邊界誤差（百分比），稍微放寬避免邊緣誤判

function detectZoneByCoord(x, y) {
    for (const [zone, b] of Object.entries(ZONE_BOUNDS)) {
        if (
            x >= b.x1 - ZONE_BOUNDS_PADDING && x <= b.x2 + ZONE_BOUNDS_PADDING &&
            y >= b.y1 - ZONE_BOUNDS_PADDING && y <= b.y2 + ZONE_BOUNDS_PADDING
        ) {
            return zone;
        }
    }
    return null; // 不在任何座位區範圍內
}

// 「新增座位」按鈕：不需要先點地圖，直接打開登記視窗
// 座標會在使用者選擇區域時自動對應；尚未選擇區域前先放在地圖中心點
function openAddSeatFromButton() {
    lastPos = { x: 50, y: 50 };
    openModal('modal');
}

// 登記視窗裡的區域下拉選單一旦變更，立即更新預定座標（不論是用按鈕還是點地圖進來的）
document.addEventListener('DOMContentLoaded', () => {
    const zoneSelect = document.getElementById('zone');
    if (zoneSelect) {
        zoneSelect.addEventListener('change', () => {
            if (zoneSelect.value) {
                lastPos = jitterZoneCoord(zoneSelect.value);
            }
        });
    }
});


/* ────────────────────────────────────────────
   8. 圖片壓縮（上傳前縮小並轉為 Blob）
   ──────────────────────────────────────────── */
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


/* ────────────────────────────────────────────
   9. 登記座位
   ──────────────────────────────────────────── */
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

    // 圖片上傳到 Supabase Storage（壓縮後最大 100px、品質 60%）
    let imgUrl = null;
    if (file) {
        const blob = await compressImageToBlob(file, 100, 0.6);
        const fileName = `seat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

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

    const { error } = await db.from('seats').insert(payload).select();

    if (error) {
        console.error('Insert error:', JSON.stringify(error));
        if (bar) bar.textContent = "❌ " + (error.message || '登記失敗，請再試一次');
        return;
    }

    const d = i18n[getLang()];
    if (bar) bar.textContent = "✨ " + name + d.joined;
    await loadSeats();

    // 顯示密碼給使用者記住
    const pinDisplay = document.getElementById('pin-display');
    if (pinDisplay) pinDisplay.textContent = pin;
    openModal('pin-modal');
}


/* ────────────────────────────────────────────
   10. 從 Supabase 載入座位資料（分批讀取避免逾時）
   ──────────────────────────────────────────── */
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

// 座位資料每 30 秒自動重新整理一次（輪詢，不用 Realtime 長連線，更穩定）
function subscribeRealtime() {
    if (realtimeChannel) clearInterval(realtimeChannel);
    realtimeChannel = setInterval(() => loadSeats(), 30000);
}


/* ────────────────────────────────────────────
   11. 地圖渲染
   ──────────────────────────────────────────── */
let avatarsHidden = false; // 是否處於「隱藏所有頭像」狀態

function render() {
    let seats = allData[currentDate] || [];
    const lang = getLang();
    const d = i18n[lang];

    // 截圖專用模式：只顯示被選中的人
    if (screenshotMode && screenshotIds.length > 0) {
        seats = seats.filter(s => screenshotIds.includes(s.id));
    }

    // 地圖區域篩選：選擇特定區域時，只顯示該區域的人（包含 (???) 非座位區）
    const mapFilterEl = document.getElementById('map-zone-filter');
    const mapFilterValue = mapFilterEl ? mapFilterEl.value : '';

    if (mapFilterValue) {
        seats = seats.filter(s => {
            const detectedZone = detectZoneByCoord(s.x, s.y);
            if (mapFilterValue === 'OUT_OF_ZONE') return detectedZone === null;
            return detectedZone === mapFilterValue;
        });
    }

    const countEl = document.getElementById('ui-count-label');
    if (countEl) countEl.textContent = d.count + seats.length + d.unit;

    document.querySelectorAll('.node').forEach(n => n.remove());

    seats.forEach(s => {
        const node = document.createElement('div');
        node.className = 'node';
        node.dataset.id = s.id;
        node.style.left = s.x + '%';
        node.style.top = s.y + '%';
        if (avatarsHidden) node.classList.add('node-hidden');

        if (s.img_data) {
            const img = document.createElement('img');
            img.src = s.img_data;
            node.appendChild(img);
        } else {
            node.textContent = s.emoji || '👤';
        }

        // 點頭像顯示暱稱（截圖模式下不需要互動）
        if (!screenshotMode) {
            if (isAdmin) {
                // Admin 模式：支援拖曳座位到新位置（按住移動超過閾值才視為拖曳，否則維持點擊顯示暱稱）
                attachAdminDragHandlers(node, s);
            } else {
                node.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showNameTooltip(node, s.name);
                });
            }
        }

        wrapper.appendChild(node);
    });

    if (!screenshotMode) renderList();
}

// 隱藏／顯示所有頭像（先看清楚座位圖底圖，再決定要不要看人群）
function toggleAvatarsVisibility() {
    avatarsHidden = !avatarsHidden;

    document.querySelectorAll('.node').forEach(node => {
        node.classList.toggle('node-hidden', avatarsHidden);
    });

    const btn = document.getElementById('ui-toggle-avatars');
    if (btn) btn.textContent = avatarsHidden ? '👁️‍🗨️' : '👁️';
}


/* ────────────────────────────────────────────
   11-2. Admin 拖曳移動座位（按住頭像拖曳到新位置，鬆手即儲存）
   ──────────────────────────────────────────── */
const ADMIN_DRAG_THRESHOLD = 6; // 移動超過此距離（像素）才視為拖曳，否則視為點擊

function attachAdminDragHandlers(node, seat) {
    let isDragging = false;
    let didMove = false;
    let startClientX = 0, startClientY = 0;

    function getPercentPos(clientX, clientY) {
        const rect = wrapper.getBoundingClientRect();
        return {
            x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
            y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
        };
    }

    function onMove(clientX, clientY) {
        const dx = clientX - startClientX;
        const dy = clientY - startClientY;
        if (Math.abs(dx) > ADMIN_DRAG_THRESHOLD || Math.abs(dy) > ADMIN_DRAG_THRESHOLD) {
            didMove = true;
        }
        if (didMove) {
            const pos = getPercentPos(clientX, clientY);
            node.style.left = pos.x + '%';
            node.style.top = pos.y + '%';
        }
    }

    async function onEnd(clientX, clientY) {
        isDragging = false;
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('touchmove', touchMoveHandler);
        document.removeEventListener('touchend', touchEndHandler);

        if (didMove) {
            const pos = getPercentPos(clientX, clientY);
            await saveSeatPosition(seat.id, pos.x, pos.y);
        } else {
            // 沒有實際拖曳，視為單純點擊，顯示暱稱
            showNameTooltip(node, seat.name);
        }
    }

    function mouseMoveHandler(e) { onMove(e.clientX, e.clientY); }
    function mouseUpHandler(e) { onEnd(e.clientX, e.clientY); }
    function touchMoveHandler(e) {
        if (e.touches.length !== 1) return;
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    function touchEndHandler(e) {
        const t = e.changedTouches[0];
        onEnd(t.clientX, t.clientY);
    }

    node.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isDragging = true;
        didMove = false;
        startClientX = e.clientX;
        startClientY = e.clientY;
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    });

    node.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        e.stopPropagation();
        isDragging = true;
        didMove = false;
        startClientX = e.touches[0].clientX;
        startClientY = e.touches[0].clientY;
        document.addEventListener('touchmove', touchMoveHandler, { passive: false });
        document.addEventListener('touchend', touchEndHandler);
    }, { passive: true });
}

// 拖曳結束後，把新座標存進資料庫
async function saveSeatPosition(id, x, y) {
    const { error } = await db
        .from('seats')
        .update({ x: x, y: y })
        .eq('id', id);

    if (error) {
        console.error('Update position error:', error);
        alert('位置更新失敗，請再試一次');
        await loadSeats(); // 失敗時重新載入，恢復原本位置
    } else {
        await loadSeats();
    }
}


/* ────────────────────────────────────────────
   12. 名單渲染（支援搜尋 / 分享模式勾選）
   ──────────────────────────────────────────── */
function renderList() {
    const seats = allData[currentDate] || [];
    const lang = getLang();
    const d = i18n[lang];

    const listEl = document.getElementById('seat-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const searchEl = document.getElementById('search-input');
    const keyword = searchEl ? searchEl.value.trim().toLowerCase() : '';

    const filtered = keyword
        ? seats.filter(s => s.name.toLowerCase().includes(keyword))
        : seats;

    filtered.forEach(s => {
        const item = document.createElement('div');
        item.className = 'seat-item';

        // 分享模式：每一列前面加勾選框
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

            // 一般模式：點名單項目跳到地圖位置並高亮閃爍
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
        p.textContent = keyword
            ? (lang === 'th' ? 'ไม่พบ' : lang === 'en' ? 'No results' : '找不到符合的暱稱')
            : d.empty;
        listEl.appendChild(p);
    }
}



/* ────────────────────────────────────────────
   13. 分享模式（勾選座位產生只顯示特定人的連結）
   ──────────────────────────────────────────── */
function toggleShareMode() {
    shareMode = !shareMode;
    selectedShareIds.clear();

    const toolbar = document.getElementById('share-toolbar');
    const toggleBtn = document.getElementById('ui-share-toggle');

    if (toolbar) toolbar.classList.toggle('show', shareMode);

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


/* ────────────────────────────────────────────
   14. 地圖座位跳轉 / 暱稱提示框
   ──────────────────────────────────────────── */
function jumpToSeat(id) {
    const node = wrapper.querySelector(`.node[data-id="${id}"]`);
    if (!node) return;

    // 自動放大並把該座位移到視窗正中央（取代原本頁面捲動的做法）
    const seat = (allData[currentDate] || []).find(s => s.id === id);
    if (seat) {
        const viewportRect = mapViewport.getBoundingClientRect();
        const targetScale = Math.max(mapScale, 2.2);

        mapScale = Math.min(MAP_MAX_SCALE, targetScale);
        mapTranslateX = viewportRect.width / 2 - (seat.x / 100) * viewportRect.width * mapScale;
        mapTranslateY = viewportRect.height / 2 - (seat.y / 100) * viewportRect.height * mapScale;

        clampMapTranslate();
        applyMapTransform();
    }

    node.classList.remove('highlight');
    void node.offsetWidth; // 強制重啟動畫
    node.classList.add('highlight');

    if (seat) showNameTooltip(node, seat.name, 3000);

    setTimeout(() => node.classList.remove('highlight'), 3600);
}

function showNameTooltip(node, name, duration = 2000) {
    const tooltip = document.getElementById('name-tooltip');
    if (!tooltip) return;

    const rect = node.getBoundingClientRect();
    tooltip.textContent = name;
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top = rect.top + 'px';
    tooltip.style.display = 'block';

    if (tooltipTimer) clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => { tooltip.style.display = 'none'; }, duration);
}


/* ────────────────────────────────────────────
   15. 我的座位（憑暱稱 + 密碼查詢 / 改名 / 刪除）
   ──────────────────────────────────────────── */
async function verifyMine() {
    const nameEl = document.getElementById('mine-name');
    const pinEl = document.getElementById('mine-pin');
    const resultEl = document.getElementById('mine-result');
    const d = i18n[getLang()];

    const name = nameEl.value.trim();
    const pin = pinEl.value.trim();

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
        return;
    }

    alert(d.mineUpdateOk);
    await loadSeats();
    closeModal('mine-modal');
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
        return;
    }

    alert(d.mineDeleteOk);
    await loadSeats();
    closeModal('mine-modal');
}


/* ────────────────────────────────────────────
   16. Admin 模式
   ──────────────────────────────────────────── */
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
        return;
    }

    isAdmin = false;
    sessionStorage.setItem('admin', 'false');
    alert("已登出管理員模式");
    render();
}

async function del(id) {
    // 找出該座位是否有上傳圖片，連同 Storage 一起刪除
    const seat = (allData[currentDate] || []).find(s => s.id === id);
    if (seat && seat.img_data && seat.img_data.includes('/avatars/')) {
        const fileName = seat.img_data.split('/avatars/')[1];
        if (fileName) await db.storage.from('avatars').remove([fileName]);
    }

    const { error } = await db.from('seats').delete().eq('id', id);
    if (error) console.error('Delete error:', error);
    else await loadSeats();
}


/* ────────────────────────────────────────────
   17. 區域聊天室（按場次 + 區域分區，輪詢更新）
   ──────────────────────────────────────────── */
function openChat() {
    document.getElementById('chat-drawer').classList.add('open');
    document.getElementById('chat-overlay').classList.add('show');
    loadChatMessages();
    if (chatPollTimer) clearInterval(chatPollTimer);
    chatPollTimer = setInterval(loadChatMessages, 8000);
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

    if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const nameEl = document.getElementById('chat-name');
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


/* ────────────────────────────────────────────
   18. 全場聊天室（不分場次、不分區域，所有人共用）
   ──────────────────────────────────────────── */
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

    if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

async function sendGlobalChatMessage() {
    const nameEl = document.getElementById('global-chat-name');
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

// Enter 鍵送出訊息（兩個聊天室都支援）
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


/* ────────────────────────────────────────────
   19. 截圖專用模式（透過分享連結進入）
   ──────────────────────────────────────────── */
function enterScreenshotMode() {
    document.body.classList.add('screenshot-mode');

    const hideIds = ['ui-chat-toggle', 'ui-global-chat-toggle', 'date-select'];
    hideIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 隱藏語言切換、stats-area 的按鈕（List / 我的座位）
    document.querySelectorAll('.lang-group, .stats-area, .control-row').forEach(el => {
        el.style.display = 'none';
    });

    const header = document.querySelector('header');
    if (header) header.style.borderRadius = '18px';
}


/* ────────────────────────────────────────────
   19-2. 視窗尺寸變動時，重新校正縮放／拖曳邊界
   （地圖高度已由 CSS aspect-ratio 原生鎖定，這裡不再需要 JS 計算高度）
   ──────────────────────────────────────────── */
function syncMapViewportHeight() {
    clampMapTranslate();
    applyMapTransform();
}

window.addEventListener('resize', syncMapViewportHeight);
window.addEventListener('orientationchange', () => setTimeout(syncMapViewportHeight, 200));


/* ────────────────────────────────────────────
   20. 初始化
   ──────────────────────────────────────────── */
window.onload = async () => {
    setLang(getLang());

    if (screenshotMode) {
        enterScreenshotMode();
        if (screenshotDate) currentDate = screenshotDate;
    }

    const bar = document.getElementById('notify-bar');
    if (bar) bar.textContent = i18n[getLang()].loading;

    // 等座位圖實際載入完成後，才能正確量測圖片比例
    const seatImg = document.getElementById('seat-img');
    if (seatImg.complete) {
        syncMapViewportHeight();
    } else {
        seatImg.addEventListener('load', syncMapViewportHeight);
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
