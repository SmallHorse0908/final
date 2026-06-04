# 資料結構主題測驗網站

**資管二甲 期末專題** · 馬睿廷 CBF113015 · 魚量漢 CBF113017 · 黃立宇 CBF113020

---

## 專案簡介

以 Django MTV 架構開發的線上選擇題測驗平台，題庫聚焦第 6 章「堆疊與佇列」。  
每次測驗隨機出題、隨機排列選項，作答後即時顯示對錯與解析。  
支援**間隔學習法**（Spaced Repetition）：答錯的題目會在稍後自動重新出現，直到答對為止。

---

## 功能特色

| # | 功能 | 說明 |
|---|------|------|
| 01 | 隨機出題 | 每次重新洗牌題目順序，避免背題目位置 |
| 02 | 隨機選項 | 選項位置亂數排列，後端保留正解對應 |
| 03 | 即時回饋 | 作答後立刻顯示對錯、正確答案與解析 |
| 04 | 自選題數 | 可選 5 / 10 / 全部，計時依題數動態調整 |
| 05 | 間隔學習 | 答錯題目自動插回佇列，直到答對才算掌握 |
| 06 | 歷史成績 | 每次作答結果存入資料庫，可隨時查看詳細對照 |
| 07 | 排行榜 | 依分數與作答時間排序 Top 10 |
| 08 | 錯題複習 | 自動蒐集錯題，再次答對後自動移除 |
| 09 | 題庫管理 | 自訂後台可新增 / 編輯 / 刪除題目，直接寫入資料庫 |

---

## 技術架構

```
後端框架   Django 6.x（Python 3.13）
前端       HTML / CSS / Vanilla JavaScript
資料庫     SQLite（Django 內建 ORM）
架構模式   MTV（Model–Template–View）
套件管理   uv
UI 字型    JetBrains Mono ＋ Noto Sans TC
```

---

## 快速啟動

### 環境需求

- Python 3.12 以上
- [uv](https://docs.astral.sh/uv/)（建議）或 pip

### 使用 uv（建議）

```bash
# 1. 安裝 uv（尚未安裝的話）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. 進入專案目錄
cd "final "

# 3. 建立虛擬環境並安裝依賴
uv sync

# 4. 建立資料表
uv run python manage.py migrate

# 5. 匯入題庫（14 題）
uv run python manage.py setup_quiz

# 6. 啟動伺服器
uv run python manage.py runserver
```

### 使用 pip

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py setup_quiz
python manage.py runserver
```

開啟瀏覽器前往 **http://127.0.0.1:8000/**

> 若 port 8000 已被佔用：
> ```bash
> uv run python manage.py runserver 8080
> ```

---

## 頁面路由

| 路由 | 頁面 |
|------|------|
| `/` | 首頁（章節列表、功能說明） |
| `/set-name/` | 設定名稱（session 登入，無需密碼） |
| `/quiz/<id>/` | 章節介紹、測驗設定、歷史成績 |
| `/quiz/<id>/start/?count=N&sr=1` | 作答頁（計時、即時回饋、間隔學習） |
| `/quiz/result/` | 結果頁（分數、等第、逐題對照） |
| `/record/<id>/` | 查看歷史某次作答的完整結果 |
| `/leaderboard/` | 排行榜 Top 10 |
| `/history/` | 個人歷史成績 |
| `/review/` | 錯題複習 |
| `/admin-panel/` | 題庫管理（新增 / 編輯 / 刪除，資料庫直連） |
| `/admin/` | Django 內建後台 |

---

## 鍵盤快捷鍵（作答頁）

| 按鍵 | 功能 |
|------|------|
| `A` `S` `D` `F` `G` | 選擇選項 A / B / C / D / E |
| `Enter` / `→` | 下一題（選完後才能按） |
| `←` | 上一題 |

---

## 專案結構

```
final/
├── manage.py
├── pyproject.toml            # uv 專案設定
├── uv.lock                   # 鎖定依賴版本
├── requirements.txt          # pip 備用
├── .python-version           # Python 版本宣告
├── db.sqlite3
├── ds_quiz/                  # Django 專案設定
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── quiz/                     # 主要 App
    ├── models.py             # Chapter / Question / Choice / QuizRecord
    ├── views.py              # 所有 View 邏輯
    ├── urls.py               # 路由設定
    ├── admin.py              # Django 內建後台設定
    ├── utils.py              # 隨機出題工具函式
    ├── context_processors.py # 全域 template 變數
    ├── management/commands/
    │   └── setup_quiz.py     # 題庫匯入指令
    ├── templates/quiz/       # HTML 模板
    │   ├── base.html
    │   ├── index.html
    │   ├── chapter.html
    │   ├── start.html
    │   ├── result.html
    │   ├── history.html
    │   ├── leaderboard.html
    │   ├── review.html
    │   ├── set_name.html
    │   └── admin.html        # 題庫管理後台
    └── static/quiz/
        ├── css/style.css     # 極簡終端機深色風格
        └── js/
            ├── quiz.js       # 測驗引擎（JSON 驅動、SR 佇列、計時）
            └── admin.js      # 題庫管理後台 JS（CRUD、搜尋、Modal）
```

---

## 題庫說明

| 章節 | 主題 | 題數 |
|------|------|------|
| 第 6 章 | 堆疊與佇列（Stack & Queue） | 14 題 |

題目涵蓋：LIFO / FIFO 定義、Push / Pop / Enqueue / Dequeue、環狀佇列、雙向佇列、迷宮搜尋（DFS / BFS）、運算式轉換（中序轉後序）。
