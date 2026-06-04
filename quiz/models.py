from django.db import models


class Chapter(models.Model):
    number = models.PositiveIntegerField(unique=True, verbose_name="章節編號")
    title = models.CharField(max_length=100, verbose_name="章節名稱")

    class Meta:
        ordering = ["number"]
        verbose_name = "章節"
        verbose_name_plural = "章節"

    def __str__(self):
        return f"Ch.{self.number} {self.title}"

    def question_count(self):
        return self.questions.count()
    question_count.short_description = "題數"


class Question(models.Model):
    DIFFICULTY_CHOICES = [
        ("easy",   "簡單"),
        ("medium", "中等"),
        ("hard",   "困難"),
    ]

    chapter = models.ForeignKey(
        Chapter, on_delete=models.CASCADE,
        related_name="questions", verbose_name="所屬章節",
    )
    text = models.TextField(verbose_name="題幹")
    block = models.TextField(blank=True, verbose_name="程式碼區塊")
    hint = models.TextField(blank=True, verbose_name="解析")
    difficulty = models.CharField(
        max_length=10, choices=DIFFICULTY_CHOICES,
        default="medium", verbose_name="難易度",
    )
    is_custom = models.BooleanField(default=False, verbose_name="本組設計")
    user_added = models.BooleanField(default=False, verbose_name="管理員新增")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "題目"
        verbose_name_plural = "題目"

    def __str__(self):
        return f"[Ch.{self.chapter.number}] {self.text[:50]}"

    def correct_choice(self):
        return self.choices.filter(is_correct=True).first()


class Choice(models.Model):
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE,
        related_name="choices", verbose_name="所屬題目",
    )
    text = models.CharField(max_length=255, verbose_name="選項文字")
    is_correct = models.BooleanField(default=False, verbose_name="是否為正解")

    class Meta:
        verbose_name = "選項"
        verbose_name_plural = "選項"

    def __str__(self):
        mark = "✓" if self.is_correct else " "
        return f"[{mark}] {self.text[:60]}"


class QuizRecord(models.Model):
    user_name = models.CharField(max_length=50, verbose_name="作答者")
    chapter = models.ForeignKey(
        Chapter, on_delete=models.CASCADE,
        related_name="records", verbose_name="章節",
    )
    score = models.PositiveIntegerField(verbose_name="得分 (百分比)")
    correct_count = models.PositiveIntegerField(verbose_name="答對題數")
    total = models.PositiveIntegerField(verbose_name="總題數")
    question_count = models.PositiveIntegerField(default=15, verbose_name="出題數")
    spaced_rep = models.BooleanField(default=False, verbose_name="間隔學習")
    is_review = models.BooleanField(default=False, verbose_name="錯題複習模式")
    duration_seconds = models.PositiveIntegerField(null=True, blank=True, verbose_name="作答秒數")
    details_json = models.TextField(default="[]", verbose_name="詳細結果 (JSON)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "作答紀錄"
        verbose_name_plural = "作答紀錄"

    def __str__(self):
        return f"{self.user_name} | Ch.{self.chapter.number} | {self.score}分"
