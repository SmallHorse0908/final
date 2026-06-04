# PRD — 資料結構主題測驗網站

## 1. 產品概述

### 1.1 產品定位
一款以 Django 為後端框架的線上選擇題測驗網站，題庫內容聚焦「資料結構」課程主題（第 6 章：堆疊與佇列），供學生自主練習與教師出題管理。

### 1.2 專案資訊

| 欄位 | 內容 |
|------|------|
| 課程 | 資料結構期末專題 |
| 班級 | 資管二甲 |
| 組員 | 馬睿廷 CBF113015、魚量漢 CBF113017、黃立宇 CBF113020 |
| 技術棧 | Python 3 · Django 4 · SQLite · Vanilla JS · JetBrains Mono |

### 1.3 目標使用者

| 角色 | 描述 |
|------|------|
| 學生（主要） | 資管二甲修課學生，透過網站進行章節測驗與複習 |
| 管理者 | 透過 Django Admin 維護題庫 |

### 1.4 核心價值
- 每次測驗題序與選項皆隨機，避免死背答案位置。
- 作答後即時回饋對錯與正解，強化學習效果。
- 間隔學習（Spaced Repetition）：答錯題目自動在後面重複出現，直到答對為止。
- 歷史紀錄永久保存，可隨時查看排行榜與錯題複習。

---

## 2. 系統架構

### 2.1 Django MTV 架構

```
request
  │
  ▼
urls.py ──► views.py ──► models.py (ORM → SQLite)
               │
               ▼
           templates/ (HTML + Django Template Language)
               │
               ▼
           static/ (CSS + JS)
               │
               ▼
            response
```

### 2.2 目錄結構

```
final/
├── ds_quiz/                    # Django 專案設定
│   ├── settings.py             # 設定（資料庫、靜態檔案、session）
│   ├── urls.py                 # 根 URL 分派
│   └── wsgi.py
│
├── quiz/                       # 主應用程式
│   ├── models.py               # M — 資料模型
│   ├── views.py                # V — 商業邏輯 / 路由處理
│   ├── urls.py                 # 應用程式 URL 規則
│   ├── admin.py                # Django Admin 設定
│   ├── context_processors.py   # 全域 template 變數
│   ├── utils.py                # 隨機出題 / 選項洗牌工具
│   │
│   ├── templates/quiz/         # T — HTML 模板
│   │   ├── base.html           # 共用版型（Header / Footer / Nav）
│   │   ├── index.html          # 首頁
│   │   ├── set_name.html       # 名稱設定（session 登入）
│   │   ├── chapter.html        # 章節介紹 + 測驗設定面板
│   │   ├── start.html          # 測驗作答頁（JSON 驅動 + 間隔學習）
│   │   ├── result.html         # 成績結果頁
│   │   ├── leaderboard.html    # 排行榜
│   │   ├── history.html        # 個人歷史紀錄
│   │   └── review.html         # 錯題複習
│   │
│   ├── static/quiz/
│   │   ├── css/style.css       # 全域樣式（極簡終端機深色風格）
│   │   └── js/
│   │       ├── quiz.js         # 測驗引擎（JSON 驅動、SR 佇列、計時）
│   │       └── main.js         # 舊版（已停用，保留備份）
│   │
│   └── management/commands/
│       └── setup_quiz.py       # 一鍵匯入題庫 + 排行榜種子資料
│
├── manage.py
├── requirements.txt
├── README.md
└── PRD.md
```

---

## 3. 資料模型（models.py）

### Chapter（章節）
| 欄位 | 型別 | 說明 |
|------|------|------|
| number | PositiveIntegerField | 章節編號（unique） |
| title | CharField | 章節名稱 |

### Question（題目）
| 欄位 | 型別 | 說明 |
|------|------|------|
| chapter | ForeignKey(Chapter) | 所屬章節 |
| text | TextField | 題幹文字 |
| block | TextField | 程式碼區塊（可空） |
| hint | TextField | 解析說明（可空） |
| difficulty | CharField | easy / medium / hard |
| is_custom | BooleanField | 是否為本組自設題 |

### Choice（選項）
| 欄位 | 型別 | 說明 |
|------|------|------|
| question | ForeignKey(Question) | 所屬題目 |
| text | CharField | 選項文字 |
| is_correct | BooleanField | 是否為正解 |

### QuizRecord（作答紀錄）
| 欄位 | 型別 | 說明 |
|------|------|------|
| user_name | CharField | 作答者名稱（session） |
| chapter | ForeignKey(Chapter) | 作答章節 |
| score | PositiveIntegerField | 得分（0–100） |
| correct_count | PositiveIntegerField | 答對題數 |
| total | PositiveIntegerField | 作答題數 |
| question_count | PositiveIntegerField | 出題數設定 |
| spaced_rep | BooleanField | 是否啟用間隔學習 |
| duration_seconds | PositiveIntegerField | 作答秒數 |
| details_json | TextField | 每題詳細結果（JSON） |
| created_at | DateTimeField | 作答時間 |

---

## 4. 功能規格

### 4.1 使用者識別
- 無密碼機制：使用者輸入名稱後存入 `request.session["user_name"]`。
- 首次訪問或 session 遺失時自動導向 `/set-name/`。
- 可隨時在 Header 點擊名稱切換帳號。

### 4.2 測驗設定（chapter.html）
| 設定項目 | 選項 | 預設 |
|---------|------|------|
| 題數 | 5 / 10 / 15 / 全部 | min(15, 題庫總數) |
| 間隔學習法 | 開 / 關 | 開啟 |

- 設定以 GET 參數傳遞：`/quiz/<id>/start/?count=15&sr=1`

### 4.3 測驗引擎（quiz.js + start.html）

**資料流：**
```
views.py (GET)
  → 後端隨機抽 N 題，選項洗牌
  → questions_json（JSON 陣列）注入 <script> 標籤
  → quiz.js 讀取 window.QUIZ_DATA
  → 動態渲染每一題
```

**間隔學習佇列（SR Queue）：**
```
初始佇列：[Q1, Q2, Q3, Q4, Q5]

作答 Q1 答錯 (SR_OFFSET=3)：
佇列變成：[Q1, Q2, Q3, Q4, Q1*, Q5]
              ↑ 插入位置 = currentIdx + 1 + 3

Q1* 為複習版本（選項重新洗牌、isRepeat=true）
```

**計分規則：**
- 分數 = 第一次作答就答對的題數 ÷ 原始出題數 × 100
- 同一題在 SR 複習時答對不計入分數
- 第一次答案透過隱藏 `<input>` 傳回後端，後續複習不覆蓋

**鍵盤快捷鍵：**
| 按鍵 | 功能 |
|------|------|
| A / S / D / F / G | 選擇選項 A~E |
| Enter / → | 下一題 |
| ← | 上一題 |

### 4.4 後端評分（views.py POST）
1. 從 POST 資料找出所有 `question_<id>` 欄位（有作答的題目）
2. 對每題取正確選項，比對使用者答案
3. 計算 `score = round(correct_count / total * 100)`
4. 建立 `QuizRecord`，儲存 `details_json`（每題詳細對照）
5. 將結果存入 `request.session["last_result"]`，導向結果頁

### 4.5 其他功能頁面

| 路由 | 功能 |
|------|------|
| `/` | 首頁：統計數字、章節列表、功能介紹 |
| `/leaderboard/` | Top 10 排行榜（按分數↓、用時↑） |
| `/history/` | 個人全部作答紀錄與統計 |
| `/review/` | 錯題複習（蒐集最近一次答錯且未糾正的題目） |
| `/admin/` | Django Admin：題庫 CRUD |

---

## 5. 前端設計規範

### 5.1 設計風格
- **極簡終端機深色風**（Dark Terminal Aesthetic）
- 背景：`#0a0a0a`，主色：`#fafafa`，強調：`#4ade80`（綠）/ `#67e8f9`（青）
- 字體：JetBrains Mono（等寬）+ Noto Sans TC（中文）

### 5.2 CSS 組件（style.css）
| 組件 | 說明 |
|------|------|
| `.panel` / `.panel-header` | 終端機視窗風格面板 |
| `.qcard` | 題目卡片 |
| `.option` | 選項按鈕（含 `.correct` / `.wrong` / `.faded` 狀態） |
| `.feedback` | 即時回饋區塊（`.ok` / `.err`） |
| `.qnav-dot` | 題目導航點（`.current` / `.dot-correct` / `.dot-wrong` / `.repeat`） |
| `.seg` | 分段控制器（題數選擇） |
| `.toggle` | 切換開關（間隔學習） |
| `.settings-panel` | 測驗設定容器 |
| `.result-hero` | 成績英雄區 |

---

## 6. 頁面路由對照

```
/                          → index（首頁）
/set-name/                 → set_name（設定名稱）
/quiz/<id>/                → chapter_detail（章節介紹 + 設定）
/quiz/<id>/start/          → start_quiz（作答，支援 ?count=N&sr=1）
/quiz/result/              → quiz_result（成績頁）
/leaderboard/              → leaderboard（排行榜）
/history/                  → history（個人紀錄）
/review/                   → review（錯題複習）
/admin/                    → Django Admin
```

---

## 7. 快速啟動

```bash
cd "/Users/smallhorse/Desktop/大學/資料結構/final "

# 安裝依賴
pip install -r requirements.txt

# 建立資料庫
python manage.py migrate

# 匯入題庫與種子資料
python manage.py setup_quiz

# 建立管理員
python manage.py createsuperuser

# 啟動伺服器
python manage.py runserver
# 開啟 http://127.0.0.1:8000/
```
