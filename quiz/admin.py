from django.contrib import admin
from django.contrib.auth.models import User, Group
from django.utils.html import format_html
from django.urls import reverse
from .models import Chapter, Question, Choice, QuizRecord

admin.site.unregister(User)
admin.site.unregister(Group)


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 4
    min_num = 2


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("short_text", "chapter", "difficulty", "is_custom", "created_at", "edit_link")
    list_display_links = ("short_text",)
    list_filter = ("chapter", "difficulty", "is_custom")
    search_fields = ("text",)
    inlines = [ChoiceInline]

    def short_text(self, obj):
        return obj.text[:60]
    short_text.short_description = "題幹（點擊編輯）"

    def edit_link(self, obj):
        url = reverse("admin:quiz_question_change", args=[obj.pk])
        return format_html('<a href="{}">✏ 編輯</a>', url)
    edit_link.short_description = ""


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ("number", "title", "question_count")


@admin.register(QuizRecord)
class QuizRecordAdmin(admin.ModelAdmin):
    list_display = ("user_name", "chapter", "score", "correct_count", "total", "duration_seconds", "created_at")
    list_filter = ("chapter",)
    search_fields = ("user_name",)
    readonly_fields = ("details_json", "created_at")
