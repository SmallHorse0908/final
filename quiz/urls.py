from django.urls import path
from . import views

app_name = "quiz"

urlpatterns = [
    path("",                          views.index,          name="index"),
    path("set-name/",                 views.set_name,       name="set_name"),
    path("quiz/<int:chapter_id>/",    views.chapter_detail, name="chapter_detail"),
    path("quiz/<int:chapter_id>/start/", views.start_quiz,  name="start_quiz"),
    path("quiz/result/",              views.quiz_result,    name="quiz_result"),
    path("leaderboard/",              views.leaderboard,    name="leaderboard"),
    path("history/",                  views.history,        name="history"),
    path("review/",                   views.review,         name="review"),
    path("record/<int:record_id>/",   views.record_detail,  name="record_detail"),
    path("admin-panel/",              views.admin_panel,    name="admin_panel"),
]
