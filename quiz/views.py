import json
import time

from django.http import JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse

from .models import Chapter, Choice, Question, QuizRecord
from .utils import get_shuffled_questions, shuffle_choices


# ─── helpers ───────────────────────────────────────────────────────────────

def _format_time(seconds):
    if seconds is None:
        return "—"
    m, s = divmod(int(seconds), 60)
    return f"{m:02d}:{s:02d}"


def _grade(score):
    if score >= 90:
        return ("卓越", "var(--green)")
    if score >= 75:
        return ("良好", "var(--cyan)")
    if score >= 60:
        return ("及格", "var(--amber)")
    return ("需加強", "var(--red)")


# ─── views ─────────────────────────────────────────────────────────────────

def index(request):
    # 第一次訪問 → 引導設定名稱
    if not request.session.get("user_name"):
        return redirect(f"{reverse('quiz:set_name')}?next={reverse('quiz:index')}")

    chapters = Chapter.objects.all()
    user_name = request.session.get("user_name", "")
    history_count = 0
    best_score = 0
    if user_name:
        records = QuizRecord.objects.filter(user_name=user_name)
        history_count = records.count()
        if history_count:
            best_score = max(r.score for r in records)

    total_questions = sum(ch.question_count() for ch in chapters)

    feature_list = [
        {"key": "[01]", "title": "隨機出題",   "desc": "每次重新洗牌題目順序，避免背題目位置"},
        {"key": "[02]", "title": "隨機選項",   "desc": "選項位置亂數排列，後端保留正解對應"},
        {"key": "[03]", "title": "即時回饋",   "desc": "學習模式：作答後立刻顯示對錯與解析"},
        {"key": "[04]", "title": "倒數計時",   "desc": "依題數動態配置，時間到自動交卷"},
        {"key": "[05]", "title": "歷史成績",   "desc": "每次作答結果存入資料庫，永久保存"},
        {"key": "[06]", "title": "排行榜",     "desc": "依分數與作答時間排序 Top 10"},
        {"key": "[07]", "title": "錯題複習",   "desc": "自動蒐集錯題建立專屬複習題組"},
        {"key": "[08]", "title": "後台管理",   "desc": "Django Admin 題庫 CRUD 操作介面"},
    ]
    return render(request, "quiz/index.html", {
        "chapters": chapters,
        "user_name": user_name,
        "history_count": history_count,
        "best_score": best_score,
        "total_questions": total_questions,
        "feature_list": feature_list,
    })


def set_name(request):
    raw_next = request.GET.get("next") or request.POST.get("next") or ""
    # only allow local redirects to prevent open-redirect attacks
    next_url = raw_next if raw_next.startswith("/") else reverse("quiz:index")
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        if name:
            request.session["user_name"] = name
            return redirect(next_url)
    info_items = [
        {"icon": "15", "label": "題目"},
        {"icon": "⏱", "label": "15 分鐘限時"},
        {"icon": "✓", "label": "即時回饋"},
    ]
    return render(request, "quiz/set_name.html", {
        "next": next_url,
        "info_items": info_items,
        "user_name": request.session.get("user_name", ""),
    })


def chapter_detail(request, chapter_id):
    chapter = get_object_or_404(Chapter, pk=chapter_id)
    user_name = request.session.get("user_name", "")
    records = []
    best = None
    last = None
    if user_name:
        records = list(QuizRecord.objects.filter(chapter=chapter, user_name=user_name).order_by("-created_at"))
        if records:
            best = max(r.score for r in records)
            last = records[0]

    topics = [
        ("LIFO / FIFO 定義", "Stack 與 Queue 的基本特性與差異"),
        ("基本操作", "Push / Pop / Enqueue / Dequeue 與時間複雜度"),
        ("環狀佇列", "Circular Queue 的滿與空判斷條件"),
        ("雙向佇列", "Deque：兩端皆可進行 insert / delete"),
        ("迷宮搜尋", "DFS 使用堆疊，BFS 使用佇列"),
        ("運算式轉換", "中序轉後序、後序式求值的堆疊應用"),
    ]
    return render(request, "quiz/chapter.html", {
        "chapter": chapter,
        "user_name": user_name,
        "records": records,
        "best": best,
        "last": last,
        "history_count": len(records),
        "topics": topics,
    })


def start_quiz(request, chapter_id):
    chapter = get_object_or_404(Chapter, pk=chapter_id)

    if request.method == "POST":
        try:
            start_ts = int(request.POST.get("start_time", 0))
        except (ValueError, TypeError):
            start_ts = int(time.time())
        duration = min(max(0, int(time.time()) - start_ts), 7200)  # clamp 0–2h
        user_name = request.session.get("user_name", "匿名")
        spaced_rep = request.POST.get("spaced_rep", "0") == "1"
        is_review  = request.POST.get("is_review",  "0") == "1"

        # IDs of questions the user eventually answered correctly (includes SR repeats)
        eventually_correct_ids = set()
        for x in request.POST.get("eventually_correct", "").split(","):
            x = x.strip()
            if x.isdigit():
                eventually_correct_ids.add(int(x))

        # Only score questions that were actually in the quiz (have an answer submitted)
        all_questions = list(chapter.questions.prefetch_related("choices").all())
        questions_in_quiz = [q for q in all_questions if f"question_{q.id}" in request.POST]

        correct_count = 0
        details = []

        for q in questions_in_quiz:
            selected_id = request.POST.get(f"question_{q.id}")
            correct = q.choices.filter(is_correct=True).first()

            user_choice = None
            is_correct = False
            if selected_id and correct:
                try:
                    user_choice = q.choices.get(pk=int(selected_id))
                    is_correct = user_choice.is_correct
                except Exception:
                    pass

            if is_correct:
                correct_count += 1

            details.append({
                "question_id": q.id,
                "stem": q.text,
                "block": q.block,
                "user_choice_text": user_choice.text if user_choice else None,
                "correct_choice_text": correct.text if correct else None,
                "is_correct": is_correct,
                "eventually_correct": q.id in eventually_correct_ids,
                "hint": q.hint,
            })

        total = len(questions_in_quiz)
        if total == 0:
            return redirect("quiz:chapter_detail", chapter_id)
        score = round(correct_count / total * 100)

        record = QuizRecord.objects.create(
            user_name=user_name,
            chapter=chapter,
            score=score,
            correct_count=correct_count,
            total=total,
            question_count=total,
            spaced_rep=spaced_rep,
            is_review=is_review,
            duration_seconds=duration,
            details_json=json.dumps(details, ensure_ascii=False),
        )

        grade_label, grade_color = _grade(score)
        request.session["last_result"] = {
            "record_id": record.id,
            "chapter_id": chapter.id,
            "chapter_number": chapter.number,
            "chapter_title": chapter.title,
            "score": score,
            "correct_count": correct_count,
            "total": total,
            "wrong_count": total - correct_count,
            "spaced_rep": spaced_rep,
            "duration": duration,
            "duration_fmt": _format_time(duration),
            "accuracy": round(correct_count / total * 100) if total else 0,
            "grade_label": grade_label,
            "grade_color": grade_color,
            "details": details,
            "date": record.created_at.strftime("%Y/%m/%d %H:%M"),
        }
        return redirect("quiz:quiz_result")

    # GET – require username before starting
    if not request.session.get("user_name"):
        next_url = reverse("quiz:start_quiz", args=[chapter_id])
        return redirect(f"{reverse('quiz:set_name')}?next={next_url}")

    sr = request.GET.get("sr", "0") == "1"
    is_review = request.GET.get("review", "0") == "1"

    # If specific question IDs are provided (from review page), use those only
    ids_param = request.GET.get("ids", "")
    if ids_param:
        id_set = {int(x) for x in ids_param.split(",") if x.strip().isdigit()}
        questions = [q for q in get_shuffled_questions(chapter) if q.id in id_set]
        count = len(questions)
    else:
        total_in_bank = chapter.questions.count()
        try:
            count = int(request.GET.get("count", 0))
        except ValueError:
            count = 0
        count = count if 0 < count <= total_in_bank else total_in_bank
        questions = get_shuffled_questions(chapter)[:count]

    # Build JSON for client-side quiz engine
    questions_data = []
    for q in questions:
        choices = shuffle_choices(q)
        correct = q.choices.filter(is_correct=True).first()
        questions_data.append({
            "id": q.id,
            "stem": q.text,
            "block": q.block,
            "hint": q.hint,
            "is_custom": q.is_custom,
            "correct_id": correct.id if correct else 0,
            "choices": [{"id": c.id, "text": c.text} for c in choices],
        })

    return render(request, "quiz/start.html", {
        "chapter": chapter,
        "question_count": count,
        "spaced_rep": "1" if sr else "0",
        "is_review": "1" if is_review else "0",
        "time_limit": max(180, count * 60),
        "start_timestamp": int(time.time()),
        "questions_json": json.dumps(questions_data, ensure_ascii=False),
    })


def quiz_result(request):
    result = request.session.get("last_result")
    if not result:
        return redirect("quiz:index")
    return render(request, "quiz/result.html", {"result": result})


def leaderboard(request):
    chapter = Chapter.objects.filter(number=6).first()
    records = []
    if chapter:
        records = list(
            QuizRecord.objects
            .filter(chapter=chapter, is_review=False)
            .order_by("-score", "duration_seconds")[:10]
        )
        for i, r in enumerate(records):
            r.rank = i + 1
            r.duration_fmt = _format_time(r.duration_seconds)
            r.is_me = (r.user_name == request.session.get("user_name", ""))

    user_name = request.session.get("user_name", "")
    return render(request, "quiz/leaderboard.html", {
        "chapter": chapter,
        "records": records,
        "user_name": user_name,
    })


def history(request):
    user_name = request.session.get("user_name", "")
    records = []
    stats = {}
    if user_name:
        qs = list(QuizRecord.objects.filter(user_name=user_name).order_by("-created_at"))
        for r in qs:
            r.duration_fmt = _format_time(r.duration_seconds)
        records = qs
        if qs:
            stats = {
                "attempts": len(qs),
                "avg_score": round(sum(r.score for r in qs) / len(qs)),
                "best_score": max(r.score for r in qs),
                "total_time_fmt": _format_time(sum(r.duration_seconds or 0 for r in qs)),
            }

    return render(request, "quiz/history.html", {
        "records": records,
        "user_name": user_name,
        "stats": stats,
    })


def review(request):
    user_name = request.session.get("user_name", "")
    wrong_list = []
    if user_name:
        qs = QuizRecord.objects.filter(user_name=user_name).order_by("created_at")
        wrong_map = {}
        for record in qs:
            try:
                details = json.loads(record.details_json)
            except Exception:
                continue
            for d in details:
                qid = d.get("question_id")
                if not d.get("is_correct"):
                    wrong_map[qid] = d
                elif qid in wrong_map:
                    del wrong_map[qid]
        wrong_list = list(wrong_map.values())

    wrong_ids = ",".join(str(d["question_id"]) for d in wrong_list if d.get("question_id"))

    return render(request, "quiz/review.html", {
        "wrong_list": wrong_list,
        "wrong_ids": wrong_ids,
        "user_name": user_name,
    })


def record_detail(request, record_id):
    record = get_object_or_404(QuizRecord, pk=record_id)
    user_name = request.session.get("user_name", "")
    if record.user_name != user_name:
        return redirect("quiz:history")

    try:
        details = json.loads(record.details_json)
    except Exception:
        details = []

    grade_label, grade_color = _grade(record.score)
    result = {
        "record_id": record.id,
        "chapter_id": record.chapter.id,
        "chapter_number": record.chapter.number,
        "chapter_title": record.chapter.title,
        "score": record.score,
        "correct_count": record.correct_count,
        "total": record.total,
        "wrong_count": record.total - record.correct_count,
        "spaced_rep": record.spaced_rep,
        "duration": record.duration_seconds,
        "duration_fmt": _format_time(record.duration_seconds),
        "accuracy": round(record.correct_count / record.total * 100) if record.total else 0,
        "grade_label": grade_label,
        "grade_color": grade_color,
        "details": details,
        "date": record.created_at.strftime("%Y/%m/%d %H:%M"),
    }
    return render(request, "quiz/result.html", {"result": result})


def admin_panel(request):
    chapter = Chapter.objects.filter(number=6).first()

    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({"ok": False, "error": "Invalid JSON"}, status=400)

        action = data.get("action")
        LETTERS = ["A", "B", "C", "D", "E", "F"]

        if action == "add":
            if not chapter:
                return JsonResponse({"ok": False, "error": "章節不存在"}, status=400)
            stem = data.get("stem", "").strip()
            options = data.get("options", [])
            if not stem:
                return JsonResponse({"ok": False, "error": "題幹不可為空"}, status=400)
            if len(options) < 2:
                return JsonResponse({"ok": False, "error": "至少需要兩個選項"}, status=400)
            answer_key = data.get("answer", "")
            if not any(o.get("key") == answer_key for o in options):
                return JsonResponse({"ok": False, "error": "請指定正確答案"}, status=400)
            q = Question.objects.create(
                chapter=chapter,
                text=stem,
                block=data.get("block", "").strip(),
                hint=data.get("hint", "").strip(),
                is_custom=True,
                user_added=True,
            )
            for opt in options:
                Choice.objects.create(
                    question=q,
                    text=opt["text"].strip(),
                    is_correct=(opt["key"] == answer_key),
                )
            return JsonResponse({"ok": True, "id": q.id})

        elif action == "edit":
            q = get_object_or_404(Question, pk=data.get("question_id"), is_custom=True)
            q.text = data.get("stem", "").strip()
            q.block = data.get("block", "").strip()
            q.hint = data.get("hint", "").strip()
            q.save()
            q.choices.all().delete()
            answer_key = data.get("answer", "A")
            for opt in data.get("options", []):
                Choice.objects.create(
                    question=q,
                    text=opt["text"].strip(),
                    is_correct=(opt["key"] == answer_key),
                )
            return JsonResponse({"ok": True})

        elif action == "delete":
            q = get_object_or_404(Question, pk=data.get("question_id"), is_custom=True)
            q.delete()
            return JsonResponse({"ok": True})

        elif action == "clear_custom":
            if chapter:
                count = Question.objects.filter(chapter=chapter, user_added=True).count()
                Question.objects.filter(chapter=chapter, user_added=True).delete()
            else:
                count = 0
            return JsonResponse({"ok": True, "deleted": count})

        return JsonResponse({"ok": False, "error": "unknown action"}, status=400)

    # GET — build questions_json
    questions_data = []
    LETTERS = ["A", "B", "C", "D", "E", "F"]
    if chapter:
        for q in chapter.questions.prefetch_related("choices").order_by("id"):
            choices = list(q.choices.all())
            answer_letter = "A"
            choices_json = []
            for i, c in enumerate(choices):
                letter = LETTERS[i] if i < len(LETTERS) else str(i + 1)
                if c.is_correct:
                    answer_letter = letter
                choices_json.append({"id": c.id, "text": c.text, "is_correct": c.is_correct, "key": letter})

            if q.user_added:
                source = "user"
            elif q.is_custom:
                source = "group"
            else:
                source = "course"

            questions_data.append({
                "id": q.id,
                "stem": q.text,
                "block": q.block,
                "hint": q.hint,
                "choices": choices_json,
                "answer": answer_letter,
                "source": source,
            })

    total = len(questions_data)
    course_count = sum(1 for q in questions_data if q["source"] == "course")
    user_count = sum(1 for q in questions_data if q["source"] == "user")

    return render(request, "quiz/admin.html", {
        "chapter": chapter,
        "questions_json": json.dumps(questions_data, ensure_ascii=False),
        "total_count": total,
        "course_count": course_count,
        "user_count": user_count,
    })
