# POND PHUWIN · Space Soul-dyssey CONCERT
> 演唱會座位認領互動應援看板

## 📁 檔案結構

```
PondPhuwinSeatMap/
├── index.html      # 主頁面（HTML 結構）
├── style.css       # 所有樣式（賽博朋克主題）
├── script.js       # 所有邏輯（座位、語言、Admin）
├── seatmap.jpg     # 座位圖（自行放入）⚠️ 必要
├── vercel.json     # Vercel 部署設定
└── README.md       # 本說明文件
```

## 🚀 部署到 Vercel

### 方法一：Vercel CLI（推薦）
```bash
npm i -g vercel
cd PondPhuwinSeatMap
vercel
```

### 方法二：GitHub + Vercel Dashboard
1. 將整個資料夾推到 GitHub repo
2. 前往 [vercel.com](https://vercel.com) → Import Project
3. 選擇 repo，Framework 選 **Other**
4. Deploy

## ⚙️ 功能說明

| 功能 | 說明 |
|------|------|
| 日期切換 | 8/21 / 8/22 / 8/23 三場次獨立資料 |
| 點擊地圖 | 彈出登記窗，可輸入暱稱、上傳頭貼或選 Emoji |
| 語言切換 | 中文 / English / ภาษาไทย 即時切換 |
| 💖 List | 查看所有已入座粉絲名單 |
| ⚙️ Admin | 密碼：`2026`，解鎖後可刪除錯誤點位 |

## ⚠️ 注意事項

- **seatmap.jpg 必須自行放入**，否則地圖區域為空白
- 資料儲存於瀏覽器 `localStorage`，**不同裝置/瀏覽器之間不共享**
- 若要多人即時同步，需改接 Firebase Realtime Database（參見技術說明）

## 🔧 自訂設定

**更改 Admin 密碼**（script.js 第 178 行）：
```js
if (pw === "2026") {   // ← 改成你要的密碼
```

**新增 Emoji 選項**（index.html emoji select 區塊）：
```html
<option value="🦋">🦋 蝴蝶</option>
```
