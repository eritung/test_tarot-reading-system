# 塔羅解牌系統｜GitHub Pages 靜態版

這是將原本需要 Next.js + Prisma + API Key 的塔羅解牌系統，改寫成可直接部署到 **GitHub Pages** 的純前端版本。

## 這版保留了什麼
- 客戶姓名／問題類型／提問內容輸入
- 78 張塔羅牌選擇
- 正逆位切換
- 牌位屬性設定
- 抽牌紀錄編輯與刪除
- 歷史紀錄頁
- 解牌結果顯示

## 這版改成什麼
- **不需要 API Key**
- **不需要 Next.js / Prisma / 資料庫**
- **不需要伺服器**
- 資料改存在瀏覽器 `localStorage`
- AI 解牌改為 **模擬生成內容**，用於展示流程與版型

## 本機預覽方式
直接用 VS Code Live Server、Python 簡易伺服器，或任何靜態伺服器開啟即可。

### Python
```bash
python3 -m http.server 8000
```

然後打開：
- http://localhost:8000
- http://localhost:8000/history.html

## 部署到 GitHub Pages
1. 建立 GitHub repository
2. 上傳整包檔案
3. 到 **Settings → Pages**
4. Source 選 **Deploy from a branch**
5. Branch 選 `main`，資料夾選 `/root`
6. 儲存後等待 GitHub Pages 發布

## 正式版若要再升級
之後若你要回到真正可用的版本，建議：
- 前端：Next.js
- 部署：Vercel
- 資料庫：Supabase / Neon Postgres
- AI：OpenAI 或 Gemini server-side API route

也就是說：
- **這版適合 GitHub Pages 預覽與展示**
- **正式營運版建議另外部署，不要硬塞進 GitHub Pages**
