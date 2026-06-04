# Backend Structure — 資料結構主題測驗網站

## 1. 專案目錄結構

```
final/                                    # 專案根目錄
├── manage.py
├── requirements.txt                      # Django>=4.2,<5.2
├── db.sqlite3                            # SQLite 資料庫（含 15 題 + 10 筆排行榜種子資料）
│
├── ds_quiz/                              # 專案設定模組
│   ├── __init__.py
│   ├── settings.py                       # DB、Session、靜態檔、APP 設定
│   ├── urls.py                           # 全域路由
│   └── wsgi.py
│
├── quiz/                                 # 主要 App
│   ├── __init__.py
│   ├── models.py                         # Chapter / Question / Choice / QuizRecord
│   ├── views.py                          # 所有 View 函式
│   ├── urls.py                           # quiz app 路由
│   ├── admin.py                          # Admin 註冊與 Inline 設定
│   ├── utils.py                          # 隨機出題、選項打散工具函式
│   ├── migrations/
│   │   ├── __init__.py
│   │   └── 0001_initial.py
│   ├── management/
│   │   ├── __init__.py
│   │   └── commands/
│   │       ├── __init__.py
│   │       └── setup_quiz.py             # 批次匯入 15 題 + 10 筆種子記錄
│   ├── templates/
│   │   └── quiz/
│   │       ├── base.html                 # 共用版型（Nav、Footer）
│   │       ├── index.html                # 首頁（章節列表、功能說明）
│   │       ├── set_name.html             # 使用者登入（僅輸入名稱）
│   │       ├── chapter.html              # 章節介紹頁
│   │       ├── start.html                # 作答頁（單題顯示 + 計時器）
│   │       ├── result.html               # 結果頁
│   │       ├── leaderboard.html          # 排行榜
│   │       ├── history.html              # 個人歷史成績
│   │       └── review.html               # 錯題複習
│   └── static/
│       └── quiz/
│           ├── css/
│           │   └── style.css             # 深色終端機風格 CSS
│           └── js/
│               └── main.js              # QuizController（計時、導覽、即時回饋）
```

---

## 2. 資料模型（Models）

### 2.1 ER 關係

```
Chapter  1 ──── N  Question  1 ──── N  Choice
Chapter  1 ──── N  QuizRecord
```

### 2.2 Model 定義（`quiz/models.py`）

```python
class Chapter(models.Model):
    number = models.PositiveIntegerField(unique=True)   # 章節編號
    title  = models.CharField(max_length=100)            # 章節名稱
    # Meta: ordering = ["number"]

    def question_count(self):
        return self.questions.count()


class Question(models.Model):
    chapter    = models.ForeignKey(Chapter, related_name="questions", on_delete=CASCADE)
    text       = models.TextField()                      # 題幹
    block      = models.TextField(blank=True)            # 程式碼區塊（選填）
    hint       = models.TextField(blank=True)            # 解析說明（選填）
    difficulty = models.CharField(max_length=10,
                   choices=[("easy","簡單"),("medium","中等"),("hard","困難")],
                   default="medium")
    is_custom  = models.BooleanField(default=False)

    def correct_choice(self):
        return self.choices.filter(is_correct=True).first()


class Choice(models.Model):
    question   = models.ForeignKey(Question, related_name="choices", on_delete=CASCADE)
    text       = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)


class QuizRecord(models.Model):
    user_name      = models.CharField(max_length=50)
    chapter        = models.ForeignKey(Chapter, related_name="records", on_delete=CASCADE)
    score          = models.PositiveIntegerField()         # 0–100 分
    correct_count  = models.PositiveIntegerField()
    total          = models.PositiveIntegerField()
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    details_json   = models.TextField(default="[]")        # JSON 格式，儲存每題對錯明細
    created_at     = models.DateTimeField(auto_now_add=True)
    # Meta: ordering = ["-created_at"]
```

### 2.3 `details_json` 格式（每筆 QuizRecord 內）

```json
[
  {
    "question_id": 1,
    "stem": "下列何者為堆疊的特性？",
    "block": "",
    "user_choice_text": "先進先出 (FIFO)",
    "correct_choice_text": "後進先出 (LIFO)",
    "is_correct": false,
    "hint": "Stack 採 LIFO 結構，最後放入的元素最先取出。"
  }
]
```

---

## 3. URL 路由設計

### 3.1 全域路由（`ds_quiz/urls.py`）

```python
urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("quiz.urls")),
]
```

### 3.2 App 路由（`quiz/urls.py`）

```python
app_name = "quiz"

urlpatterns = [
    path("",                             views.index,          name="index"),
    path("set-name/",                    views.set_name,       name="set_name"),
    path("quiz/<int:chapter_id>/",       views.chapter_detail, name="chapter_detail"),
    path("quiz/<int:chapter_id>/start/", views.start_quiz,     name="start_quiz"),
    path("quiz/result/",                 views.quiz_result,    name="quiz_result"),
    path("leaderboard/",                 views.leaderboard,    name="leaderboard"),
    path("history/",                     views.history,        name="history"),
    path("review/",                      views.review,         name="review"),
]
```

---

## 4. View 邏輯概述（`quiz/views.py`）

| View | HTTP | 說明 |
|------|------|------|
| `index` | GET | 若無 Session user_name，自動 redirect 到 set_name；傳入章節列表、個人統計 |
| `set_name` | GET/POST | GET 渲染登入頁；POST 將名稱寫入 `request.session["user_name"]`，redirect 到 next |
| `chapter_detail` | GET | 章節介紹 + 個人歷史紀錄側欄 |
| `start_quiz` | GET | 呼叫 `get_shuffled_questions()` + `shuffle_choices()`，加入 `correct_choice_id` 屬性 |
| `start_quiz` | POST | 伺服器端比對答案，建立 `QuizRecord`，結果存入 Session，redirect 到 result |
| `quiz_result` | GET | 從 Session 取出 `last_result` 渲染結果頁 |
| `leaderboard` | GET | 第 6 章 Top 10（`-score`, `duration_seconds`），標記 `is_me` |
| `history` | GET | 個人所有 QuizRecord，計算平均分、最佳分、總用時 |
| `review` | GET | 解析所有 QuizRecord 的 details_json，找出「最後一次仍答錯」的題目 |

---

## 5. Admin 後台配置（`quiz/admin.py`）

```python
class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display  = ("text_short", "chapter", "difficulty", "created_at")
    list_filter   = ("chapter", "difficulty")
    search_fields = ("text",)
    inlines       = [ChoiceInline]

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("number", "title", "question_count")

@admin.register(QuizRecord)
class QuizRecordAdmin(admin.ModelAdmin):
    list_display = ("user_name", "chapter", "score", "correct_count", "total", "duration_seconds", "created_at")
    list_filter  = ("chapter",)
```

---

## 6. 工具函式（`quiz/utils.py`）

```python
import random

def get_shuffled_questions(chapter, limit=None):
    qs = list(chapter.questions.prefetch_related("choices").all())
    random.shuffle(qs)
    return qs[:limit] if limit else qs

def shuffle_choices(question):
    choices = list(question.choices.all())
    random.shuffle(choices)
    return choices
```

---

## 7. 設定要點（`ds_quiz/settings.py`）

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "quiz",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.db"

LANGUAGE_CODE = "zh-hant"
TIME_ZONE     = "Asia/Taipei"

STATIC_URL = "/static/"
```

---

## 8. 初始化指令

```bash
# 安裝依賴
pip install django

# 建立資料表
python manage.py migrate

# 匯入 15 道題目 + 10 筆排行榜種子資料
python manage.py setup_quiz

# （選用）建立 Admin 後台帳號
python manage.py createsuperuser

# 啟動開發伺服器
python manage.py runserver
# 瀏覽 http://127.0.0.1:8000/
```

---

## 9. 依賴套件

```
# requirements.txt
Django>=4.2,<5.2
```

開發期間僅需 Django 本體，使用內建 SQLite 即可運作。部署時可加入 `gunicorn`、`psycopg2-binary`、`whitenoise` 等。
