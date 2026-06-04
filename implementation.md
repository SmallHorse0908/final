# Implementation Guide — 資料結構主題測驗網站

> **本文件反映已完成的實作狀態（2026/05）。**
> 所有功能皆已開發完畢，可直接照第 0 節的指令啟動。

---

## Phase 0：快速啟動（已完成，直接執行）

```bash
cd "/Users/smallhorse/Desktop/大學/資料結構/final "

# 安裝依賴
pip install django

# 建立資料表
python manage.py migrate

# 匯入 15 道題目 + 10 筆排行榜種子資料（只需執行一次）
python manage.py setup_quiz

# 啟動開發伺服器
python manage.py runserver
```

開啟瀏覽器前往 **http://127.0.0.1:8000/**

- 首次訪問會自動跳轉到登入頁，輸入名稱（不需密碼）即可進入。
- Admin 後台：`http://127.0.0.1:8000/admin/`（需另執行 `python manage.py createsuperuser`）

---

## Phase 1：專案初始化（已完成）

### 1.1 目錄結構

```
final/
├── manage.py
├── requirements.txt
├── db.sqlite3
├── ds_quiz/          # 專案設定
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── quiz/             # 主 App
    ├── models.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    ├── utils.py
    ├── migrations/
    ├── management/commands/setup_quiz.py
    ├── templates/quiz/
    └── static/quiz/
```

### 1.2 關鍵 `settings.py` 設定

```python
INSTALLED_APPS = [..., "quiz"]
SESSION_ENGINE  = "django.contrib.sessions.backends.db"
LANGUAGE_CODE   = "zh-hant"
TIME_ZONE       = "Asia/Taipei"
```

---

## Phase 2：資料模型（已完成）

### 2.1 定義的四個 Model

| Model | 用途 |
|-------|------|
| `Chapter` | 章節（編號、名稱） |
| `Question` | 題目（題幹、程式碼區塊、解析、難易度） |
| `Choice` | 選項（選項文字、是否正解） |
| `QuizRecord` | 作答記錄（使用者名稱、分數、用時、每題明細 JSON） |

### 2.2 Migration

```bash
python manage.py makemigrations quiz   # 已完成，產生 0001_initial.py
python manage.py migrate               # 已套用
```

---

## Phase 3：使用者識別（Session 機制）

### 設計說明

不使用 Django 內建 `auth` 系統（無需密碼），改用 Session 儲存使用者名稱：

```python
# set_name view — POST 處理
request.session["user_name"] = name   # 寫入 Session
```

```python
# index view — 未登入自動跳轉
if not request.session.get("user_name"):
    return redirect(f"{reverse('quiz:set_name')}?next={reverse('quiz:index')}")
```

### 流程

```
訪問任何頁面
    ↓（無 Session）
/set-name/ → 輸入名稱 → 按鈕送出
    ↓
重新導向回原頁面（?next= 參數）
```

---

## Phase 4：Admin 後台（已完成）

登入 `http://127.0.0.1:8000/admin/` 後可：

- 新增／編輯／刪除 **章節**、**題目**、**選項**（ChoiceInline 同頁面操作）
- 查看 **作答記錄**（QuizRecord）

---

## Phase 5：View 邏輯（已完成）

### 隨機出題重點

```python
# views.py — start_quiz GET
questions = get_shuffled_questions(chapter)
for q in questions:
    q.shuffled_choices = shuffle_choices(q)
    correct = q.choices.filter(is_correct=True).first()
    q.correct_choice_id = correct.id if correct else 0
```

### POST 評分

```python
# views.py — start_quiz POST
for q in questions:
    selected_id = request.POST.get(f"question_{q.id}")
    correct = q.choices.filter(is_correct=True).first()
    is_correct = (user_choice.is_correct) if user_choice else False
```

評分結果存入 `QuizRecord`，同時寫入 `request.session["last_result"]` 供結果頁讀取。

### 錯題複習邏輯

```python
# views.py — review
# 遍歷所有 QuizRecord（按時間舊→新），用 dict 追蹤每題最後狀態
for record in qs:
    for d in details:
        if not d["is_correct"]:
            wrong_map[qid] = d      # 答錯 → 加入
        elif qid in wrong_map:
            del wrong_map[qid]      # 之後答對 → 移除
```

---

## Phase 6：前端實作（已完成）

### 6.1 CSS 設計主題

```css
:root {
  --bg:       #0a0a0a;   /* 深黑背景 */
  --green:    #4ade80;   /* 正確 */
  --red:      #f87171;   /* 錯誤 */
  --amber:    #fbbf24;   /* 警示 */
  --cyan:     #67e8f9;   /* 強調 */
}
```

字型：`JetBrains Mono`（等寬）+ `Noto Sans TC`（中文）

### 6.2 JavaScript — QuizController（`main.js`）

| 功能 | 說明 |
|------|------|
| `startTimer(seconds, el, onExpire)` | 1 秒 Interval 倒數，時間到呼叫 `onExpire` 自動交卷 |
| `showQuestion(idx)` | 切換顯示題目，更新導覽點狀態 |
| `selectOption(btn, choiceId, correctId, hint)` | 判斷對錯、設定 hidden radio、顯示 Feedback、更新導覽點顏色 |
| 鍵盤快捷鍵 | A–E 選選項，←→ 切換題目，Enter 下一題 |

### 6.3 即時回饋實作

```html
<!-- start.html — 每題 wrapper -->
<div class="question-wrapper" data-correct-id="{{ q.correct_choice_id }}">
  ...
  <div class="feedback" id="feedback_{{ q.id }}"></div>
</div>
```

```javascript
// main.js
function selectOption(btn, choiceId, correctId, hint) {
  const isCorrect = choiceId === correctId;
  btn.classList.add(isCorrect ? "correct" : "wrong");
  // 也標出正確選項
  feedbackEl.innerHTML = isCorrect ? "✓ 正確！" : `✗ 正確答案：...`;
}
```

---

## Phase 7：題庫匯入（已完成）

### setup_quiz 指令

```bash
python manage.py setup_quiz
```

執行內容：
1. 建立 `Chapter(number=6, title="堆疊與佇列")`
2. 匯入 **15 道**選擇題（含題幹、選項、正解、解析）
3. 建立 **10 筆** QuizRecord 種子資料（排行榜預設資料，含馬睿廷、黃立宇等組員）

---

## Phase 8：測試（已完成）

### 手動驗證流程

1. `python manage.py runserver`
2. 瀏覽 `http://127.0.0.1:8000/` → 確認自動跳轉到登入頁
3. 輸入名稱 → 進入首頁
4. 點擊「第 6 章」→ 進入章節頁 → 點「開始作答」
5. 確認題目隨機排列、選項隨機排列
6. 選取選項 → 確認即時顯示對錯與解析
7. 使用導覽點或 ←→ 鍵切換題目
8. 交卷 → 確認結果頁顯示分數與等第
9. 確認排行榜、歷史成績、錯題複習正常顯示

### 已驗證 HTTP 狀態

| 路由 | 狀態 |
|------|------|
| `GET /` | 302 redirect → `/set-name/` |
| `GET /set-name/` | 200 |
| `POST /set-name/` | 302 redirect → next |
| `GET /quiz/1/start/`（有 Session） | 200 |
| `GET /leaderboard/` | 200 |
| `GET /history/` | 200 |
| `GET /review/` | 200 |

---

## 常見問題排解

| 問題 | 原因與解法 |
|------|-----------|
| POST 後分數永遠 0 | 確認 form field name 為 `question_<id>`，value 為 `choice.id` |
| 選項順序沒變 | 確認 `shuffle_choices()` 有被呼叫並賦值給 `q.shuffled_choices` |
| Admin 看不到 Model | 確認 `admin.py` 已註冊，且 App 已加入 `INSTALLED_APPS` |
| 靜態檔案 404 | 確認 template 有 `{% load static %}`，且路徑正確 |
| Session 資料消失 | 確認已執行 `migrate`，且 `django.contrib.sessions` 在 INSTALLED_APPS |
| setup_quiz 重複執行 | 指令有 `get_or_create` 保護，可安全重複執行 |
