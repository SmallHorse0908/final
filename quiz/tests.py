import json
from django.test import TestCase, Client
from django.urls import reverse

from .models import Chapter, Choice, Question, QuizRecord
from .utils import get_shuffled_questions, shuffle_choices
from .views import _format_time, _grade


# ─── Helpers ───────────────────────────────────────────────────────────────────

class FormatTimeTest(TestCase):
    def test_none_returns_dash(self):
        self.assertEqual(_format_time(None), "—")

    def test_zero(self):
        self.assertEqual(_format_time(0), "00:00")

    def test_seconds_only(self):
        self.assertEqual(_format_time(45), "00:45")

    def test_minutes_and_seconds(self):
        self.assertEqual(_format_time(125), "02:05")

    def test_over_one_hour(self):
        self.assertEqual(_format_time(3661), "61:01")


class GradeTest(TestCase):
    def test_score_100_is_excellent(self):
        self.assertEqual(_grade(100)[0], "卓越")

    def test_score_90_is_excellent(self):
        self.assertEqual(_grade(90)[0], "卓越")

    def test_score_89_is_good(self):
        self.assertEqual(_grade(89)[0], "良好")

    def test_score_75_is_good(self):
        self.assertEqual(_grade(75)[0], "良好")

    def test_score_74_is_pass(self):
        self.assertEqual(_grade(74)[0], "及格")

    def test_score_60_is_pass(self):
        self.assertEqual(_grade(60)[0], "及格")

    def test_score_59_is_fail(self):
        self.assertEqual(_grade(59)[0], "需加強")

    def test_score_0_is_fail(self):
        self.assertEqual(_grade(0)[0], "需加強")

    def test_grade_returns_color(self):
        _, color = _grade(90)
        self.assertIn("green", color)


# ─── Shared test fixture ────────────────────────────────────────────────────────

class BaseTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.chapter = Chapter.objects.create(number=6, title="堆疊與佇列")
        self.questions = []
        self.correct_choices = []
        for i in range(3):
            q = Question.objects.create(
                chapter=self.chapter,
                text=f"題目 {i + 1}",
                hint=f"解析 {i + 1}",
            )
            for j, text in enumerate(["選項A", "選項B", "選項C", "選項D"]):
                Choice.objects.create(question=q, text=text, is_correct=(j == 0))
            self.questions.append(q)
            self.correct_choices.append(q.choices.filter(is_correct=True).first())

    def login(self, name="測試用戶"):
        session = self.client.session
        session["user_name"] = name
        session.save()

    def _post_quiz(self, answers: dict, spaced_rep="0", eventually_correct="", start_time="0"):
        data = {
            "start_time": start_time,
            "spaced_rep": spaced_rep,
            "eventually_correct": eventually_correct,
        }
        data.update(answers)
        return self.client.post(
            reverse("quiz:start_quiz", args=[self.chapter.id]), data
        )

    def _all_correct_answers(self):
        return {f"question_{q.id}": str(c.id)
                for q, c in zip(self.questions, self.correct_choices)}

    def _all_wrong_answers(self):
        return {f"question_{q.id}": str(q.choices.filter(is_correct=False).first().id)
                for q in self.questions}


# ─── Utils ──────────────────────────────────────────────────────────────────────

class UtilsTest(BaseTest):
    def test_get_shuffled_questions_returns_all(self):
        qs = get_shuffled_questions(self.chapter)
        self.assertEqual(len(qs), 3)

    def test_get_shuffled_questions_with_limit(self):
        qs = get_shuffled_questions(self.chapter, limit=2)
        self.assertEqual(len(qs), 2)

    def test_shuffle_choices_returns_all_choices(self):
        q = self.questions[0]
        choices = shuffle_choices(q)
        self.assertEqual(len(choices), 4)
        self.assertEqual(
            set(c.id for c in choices),
            set(q.choices.values_list("id", flat=True)),
        )


# ─── Index ──────────────────────────────────────────────────────────────────────

class IndexViewTest(BaseTest):
    def test_redirect_to_set_name_when_no_session(self):
        resp = self.client.get(reverse("quiz:index"))
        self.assertEqual(resp.status_code, 302)
        self.assertIn("set-name", resp["Location"])

    def test_renders_when_logged_in(self):
        self.login()
        resp = self.client.get(reverse("quiz:index"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "資料結構")

    def test_shows_history_count(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=80, correct_count=4, total=5, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:index"))
        self.assertEqual(resp.context["history_count"], 1)

    def test_shows_best_score(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=93, correct_count=4, total=5, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:index"))
        self.assertEqual(resp.context["best_score"], 93)

    def test_total_questions_correct(self):
        self.login()
        resp = self.client.get(reverse("quiz:index"))
        self.assertEqual(resp.context["total_questions"], 3)


# ─── Set Name ───────────────────────────────────────────────────────────────────

class SetNameViewTest(BaseTest):
    def test_get_renders_form(self):
        resp = self.client.get(reverse("quiz:set_name"))
        self.assertEqual(resp.status_code, 200)

    def test_post_sets_session_and_redirects(self):
        resp = self.client.post(reverse("quiz:set_name"), {"name": "Alice", "next": "/"})
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(self.client.session["user_name"], "Alice")

    def test_post_empty_name_does_not_redirect(self):
        resp = self.client.post(reverse("quiz:set_name"), {"name": "   ", "next": "/"})
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("user_name", self.client.session)

    def test_post_strips_whitespace_from_name(self):
        self.client.post(reverse("quiz:set_name"), {"name": "  Bob  ", "next": "/"})
        self.assertEqual(self.client.session["user_name"], "Bob")

    def test_open_redirect_blocked(self):
        resp = self.client.post(
            reverse("quiz:set_name"),
            {"name": "Eve", "next": "http://evil.com"},
        )
        self.assertNotIn("evil.com", resp["Location"])

    def test_external_next_falls_back_to_index(self):
        resp = self.client.post(
            reverse("quiz:set_name"),
            {"name": "Eve", "next": "http://evil.com"},
        )
        self.assertIn("/", resp["Location"])


# ─── Chapter Detail ─────────────────────────────────────────────────────────────

class ChapterDetailViewTest(BaseTest):
    def test_404_for_invalid_chapter(self):
        resp = self.client.get(reverse("quiz:chapter_detail", args=[9999]))
        self.assertEqual(resp.status_code, 404)

    def test_renders_for_valid_chapter(self):
        self.login()
        resp = self.client.get(reverse("quiz:chapter_detail", args=[self.chapter.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "堆疊與佇列")

    def test_shows_best_score_in_history(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=93, correct_count=4, total=5, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:chapter_detail", args=[self.chapter.id]))
        self.assertEqual(resp.context["best"], 93)

    def test_no_history_without_login(self):
        resp = self.client.get(reverse("quiz:chapter_detail", args=[self.chapter.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.context["best"])


# ─── Start Quiz ─────────────────────────────────────────────────────────────────

class StartQuizGetTest(BaseTest):
    def test_redirect_to_set_name_when_no_session(self):
        resp = self.client.get(reverse("quiz:start_quiz", args=[self.chapter.id]))
        self.assertEqual(resp.status_code, 302)

    def test_renders_quiz_page(self):
        self.login()
        resp = self.client.get(reverse("quiz:start_quiz", args=[self.chapter.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "QUIZ_DATA")

    def test_count_param_respected(self):
        self.login()
        resp = self.client.get(
            reverse("quiz:start_quiz", args=[self.chapter.id]) + "?count=2"
        )
        data = json.loads(resp.context["questions_json"])
        self.assertEqual(len(data), 2)

    def test_count_exceeds_bank_clamps_to_total(self):
        self.login()
        resp = self.client.get(
            reverse("quiz:start_quiz", args=[self.chapter.id]) + "?count=999"
        )
        data = json.loads(resp.context["questions_json"])
        self.assertEqual(len(data), 3)

    def test_count_zero_defaults_to_all(self):
        self.login()
        resp = self.client.get(
            reverse("quiz:start_quiz", args=[self.chapter.id]) + "?count=0"
        )
        data = json.loads(resp.context["questions_json"])
        self.assertEqual(len(data), 3)

    def test_each_question_has_correct_id(self):
        self.login()
        resp = self.client.get(reverse("quiz:start_quiz", args=[self.chapter.id]))
        data = json.loads(resp.context["questions_json"])
        for item in data:
            self.assertGreater(item["correct_id"], 0)

    def test_sr_flag_passed_to_template(self):
        self.login()
        resp = self.client.get(
            reverse("quiz:start_quiz", args=[self.chapter.id]) + "?sr=1"
        )
        self.assertEqual(resp.context["spaced_rep"], "1")

    def test_time_limit_minimum_180(self):
        self.login()
        resp = self.client.get(
            reverse("quiz:start_quiz", args=[self.chapter.id]) + "?count=1"
        )
        self.assertGreaterEqual(resp.context["time_limit"], 180)


class StartQuizPostTest(BaseTest):
    def test_all_correct_scores_100(self):
        self.login()
        self._post_quiz(self._all_correct_answers())
        record = QuizRecord.objects.latest("created_at")
        self.assertEqual(record.score, 100)
        self.assertEqual(record.correct_count, 3)

    def test_all_wrong_scores_0(self):
        self.login()
        self._post_quiz(self._all_wrong_answers())
        record = QuizRecord.objects.latest("created_at")
        self.assertEqual(record.score, 0)
        self.assertEqual(record.correct_count, 0)

    def test_partial_score_calculated_correctly(self):
        self.login()
        q1, q2, q3 = self.questions
        c1 = self.correct_choices[0]
        answers = {
            f"question_{q1.id}": str(c1.id),
            f"question_{q2.id}": str(q2.choices.filter(is_correct=False).first().id),
            f"question_{q3.id}": str(q3.choices.filter(is_correct=False).first().id),
        }
        self._post_quiz(answers)
        record = QuizRecord.objects.latest("created_at")
        self.assertEqual(record.correct_count, 1)
        self.assertEqual(record.score, 33)  # round(1/3 * 100)

    def test_creates_quiz_record_in_db(self):
        self.login()
        before = QuizRecord.objects.count()
        self._post_quiz(self._all_correct_answers())
        self.assertEqual(QuizRecord.objects.count(), before + 1)

    def test_record_stores_user_name(self):
        self.login("Alice")
        self._post_quiz(self._all_correct_answers())
        record = QuizRecord.objects.latest("created_at")
        self.assertEqual(record.user_name, "Alice")

    def test_spaced_rep_flag_stored(self):
        self.login()
        self._post_quiz(self._all_correct_answers(), spaced_rep="1")
        record = QuizRecord.objects.latest("created_at")
        self.assertTrue(record.spaced_rep)

    def test_eventually_correct_tracked_in_details(self):
        self.login()
        q1 = self.questions[0]
        c1 = self.correct_choices[0]
        self._post_quiz(
            {f"question_{q1.id}": str(c1.id)},
            eventually_correct=str(q1.id),
        )
        record = QuizRecord.objects.latest("created_at")
        details = json.loads(record.details_json)
        q1_detail = next(d for d in details if d["question_id"] == q1.id)
        self.assertTrue(q1_detail["eventually_correct"])

    def test_invalid_choice_id_counts_as_wrong(self):
        self.login()
        q1 = self.questions[0]
        self._post_quiz({f"question_{q1.id}": "99999"})
        record = QuizRecord.objects.latest("created_at")
        self.assertEqual(record.correct_count, 0)

    def test_empty_submission_does_not_create_record(self):
        self.login()
        before = QuizRecord.objects.count()
        self._post_quiz({})  # no answers submitted
        self.assertEqual(QuizRecord.objects.count(), before)

    def test_invalid_start_time_does_not_crash(self):
        self.login()
        self._post_quiz(self._all_correct_answers(), start_time="not-a-number")
        # should not raise, just record with some duration
        record = QuizRecord.objects.latest("created_at")
        self.assertIsNotNone(record)

    def test_duration_clamped_to_max_2_hours(self):
        self.login()
        self._post_quiz(self._all_correct_answers(), start_time="0")
        record = QuizRecord.objects.latest("created_at")
        self.assertLessEqual(record.duration_seconds, 7200)

    def test_redirects_to_result_after_submit(self):
        self.login()
        resp = self._post_quiz(self._all_correct_answers())
        self.assertRedirects(resp, reverse("quiz:quiz_result"))

    def test_session_stores_last_result(self):
        self.login()
        self._post_quiz(self._all_correct_answers())
        self.assertIn("last_result", self.client.session)
        self.assertEqual(self.client.session["last_result"]["score"], 100)


# ─── Quiz Result ────────────────────────────────────────────────────────────────

class QuizResultViewTest(BaseTest):
    def test_redirect_when_no_session_data(self):
        resp = self.client.get(reverse("quiz:quiz_result"))
        self.assertEqual(resp.status_code, 302)

    def test_renders_with_session_data(self):
        session = self.client.session
        session["last_result"] = {
            "record_id": 1,
            "chapter_id": self.chapter.id,
            "chapter_number": 6, "chapter_title": "堆疊與佇列",
            "score": 80, "grade_label": "良好", "grade_color": "var(--cyan)",
            "correct_count": 4, "total": 5, "wrong_count": 1,
            "spaced_rep": False, "duration": 300,
            "duration_fmt": "05:00", "accuracy": 80,
            "details": [], "date": "2026/01/01 12:00",
        }
        session.save()
        resp = self.client.get(reverse("quiz:quiz_result"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "80")


# ─── Leaderboard ────────────────────────────────────────────────────────────────

class LeaderboardViewTest(BaseTest):
    def test_renders_empty(self):
        resp = self.client.get(reverse("quiz:leaderboard"))
        self.assertEqual(resp.status_code, 200)

    def test_top_10_only(self):
        for i in range(15):
            QuizRecord.objects.create(
                user_name=f"u{i}", chapter=self.chapter,
                score=i * 5, correct_count=i, total=10,
                duration_seconds=300, details_json="[]",
            )
        resp = self.client.get(reverse("quiz:leaderboard"))
        self.assertLessEqual(len(resp.context["records"]), 10)

    def test_sorted_by_score_descending(self):
        QuizRecord.objects.create(
            user_name="low", chapter=self.chapter,
            score=60, correct_count=3, total=5,
            duration_seconds=300, details_json="[]",
        )
        QuizRecord.objects.create(
            user_name="high", chapter=self.chapter,
            score=100, correct_count=5, total=5,
            duration_seconds=300, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:leaderboard"))
        records = resp.context["records"]
        self.assertEqual(records[0].user_name, "high")

    def test_same_score_sorted_by_time_ascending(self):
        QuizRecord.objects.create(
            user_name="slow", chapter=self.chapter,
            score=100, correct_count=5, total=5,
            duration_seconds=600, details_json="[]",
        )
        QuizRecord.objects.create(
            user_name="fast", chapter=self.chapter,
            score=100, correct_count=5, total=5,
            duration_seconds=300, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:leaderboard"))
        records = resp.context["records"]
        self.assertEqual(records[0].user_name, "fast")

    def test_is_me_flag_set(self):
        self.login("Alice")
        QuizRecord.objects.create(
            user_name="Alice", chapter=self.chapter,
            score=90, correct_count=5, total=5,
            duration_seconds=300, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:leaderboard"))
        self.assertTrue(any(r.is_me for r in resp.context["records"]))

    def test_rank_assigned_correctly(self):
        for score in [100, 90, 80]:
            QuizRecord.objects.create(
                user_name=f"u{score}", chapter=self.chapter,
                score=score, correct_count=5, total=5,
                duration_seconds=300, details_json="[]",
            )
        resp = self.client.get(reverse("quiz:leaderboard"))
        records = resp.context["records"]
        self.assertEqual(records[0].rank, 1)
        self.assertEqual(records[2].rank, 3)


# ─── History ────────────────────────────────────────────────────────────────────

class HistoryViewTest(BaseTest):
    def test_empty_records_when_no_session(self):
        resp = self.client.get(reverse("quiz:history"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.context["records"], [])

    def test_shows_only_current_user_records(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=80, correct_count=4, total=5, details_json="[]",
        )
        QuizRecord.objects.create(
            user_name="user2", chapter=self.chapter,
            score=60, correct_count=3, total=5, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:history"))
        self.assertEqual(len(resp.context["records"]), 1)

    def test_stats_calculated_correctly(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=80, correct_count=4, total=5,
            duration_seconds=100, details_json="[]",
        )
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=60, correct_count=3, total=5,
            duration_seconds=200, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:history"))
        stats = resp.context["stats"]
        self.assertEqual(stats["attempts"], 2)
        self.assertEqual(stats["best_score"], 80)
        self.assertEqual(stats["avg_score"], 70)
        self.assertEqual(stats["total_time_fmt"], "05:00")

    def test_duration_fmt_set_on_records(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=80, correct_count=4, total=5,
            duration_seconds=125, details_json="[]",
        )
        resp = self.client.get(reverse("quiz:history"))
        self.assertEqual(resp.context["records"][0].duration_fmt, "02:05")


# ─── Review ─────────────────────────────────────────────────────────────────────

class ReviewViewTest(BaseTest):
    def test_empty_without_session(self):
        resp = self.client.get(reverse("quiz:review"))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.context["wrong_list"], [])

    def test_shows_wrong_questions(self):
        self.login("user1")
        q = self.questions[0]
        details = [{"question_id": q.id, "is_correct": False, "stem": q.text,
                    "user_choice_text": "選項B", "correct_choice_text": "選項A", "hint": ""}]
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=0, correct_count=0, total=1, details_json=json.dumps(details),
        )
        resp = self.client.get(reverse("quiz:review"))
        self.assertEqual(len(resp.context["wrong_list"]), 1)

    def test_later_correct_removes_from_wrong_list(self):
        self.login("user1")
        q = self.questions[0]
        wrong = [{"question_id": q.id, "is_correct": False, "stem": q.text,
                  "user_choice_text": "選項B", "correct_choice_text": "選項A", "hint": ""}]
        correct = [{"question_id": q.id, "is_correct": True, "stem": q.text,
                    "user_choice_text": "選項A", "correct_choice_text": "選項A", "hint": ""}]
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=0, correct_count=0, total=1, details_json=json.dumps(wrong),
        )
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=100, correct_count=1, total=1, details_json=json.dumps(correct),
        )
        resp = self.client.get(reverse("quiz:review"))
        self.assertEqual(len(resp.context["wrong_list"]), 0)

    def test_malformed_json_record_skipped_gracefully(self):
        self.login("user1")
        QuizRecord.objects.create(
            user_name="user1", chapter=self.chapter,
            score=0, correct_count=0, total=1, details_json="NOT_JSON",
        )
        resp = self.client.get(reverse("quiz:review"))
        self.assertEqual(resp.status_code, 200)


# ─── Record Detail ───────────────────────────────────────────────────────────────

class RecordDetailViewTest(BaseTest):
    def setUp(self):
        super().setUp()
        self.record = QuizRecord.objects.create(
            user_name="owner", chapter=self.chapter,
            score=80, correct_count=4, total=5, details_json="[]",
        )

    def test_404_for_nonexistent_record(self):
        self.login("owner")
        resp = self.client.get(reverse("quiz:record_detail", args=[99999]))
        self.assertEqual(resp.status_code, 404)

    def test_redirect_for_different_user(self):
        self.login("other")
        resp = self.client.get(reverse("quiz:record_detail", args=[self.record.id]))
        self.assertRedirects(resp, reverse("quiz:history"))

    def test_renders_for_owner(self):
        self.login("owner")
        resp = self.client.get(reverse("quiz:record_detail", args=[self.record.id]))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "80")

    def test_accuracy_calculated_correctly(self):
        self.login("owner")
        resp = self.client.get(reverse("quiz:record_detail", args=[self.record.id]))
        result = resp.context["result"]
        self.assertEqual(result["accuracy"], 80)  # 4/5 * 100


# ─── Admin Panel ─────────────────────────────────────────────────────────────────

class AdminPanelGetTest(BaseTest):
    def test_renders(self):
        resp = self.client.get(reverse("quiz:admin_panel"))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, "題庫管理")

    def test_question_count_correct(self):
        resp = self.client.get(reverse("quiz:admin_panel"))
        self.assertEqual(resp.context["total_count"], 3)

    def test_source_labels_assigned(self):
        Question.objects.create(
            chapter=self.chapter, text="本組設計題", is_custom=True, user_added=False,
        )
        Question.objects.create(
            chapter=self.chapter, text="管理員新增題", is_custom=True, user_added=True,
        )
        resp = self.client.get(reverse("quiz:admin_panel"))
        data = json.loads(resp.context["questions_json"])
        sources = {q["stem"]: q["source"] for q in data}
        self.assertEqual(sources.get("本組設計題"), "group")
        self.assertEqual(sources.get("管理員新增題"), "user")
        self.assertEqual(resp.context["user_count"], 1)


class AdminPanelPostTest(BaseTest):
    def _post_json(self, payload):
        return self.client.post(
            reverse("quiz:admin_panel"),
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_add_creates_question_and_choices(self):
        resp = self._post_json({
            "action": "add",
            "stem": "新測試題目",
            "block": "",
            "hint": "解析",
            "answer": "B",
            "options": [
                {"key": "A", "text": "錯誤答案"},
                {"key": "B", "text": "正確答案"},
                {"key": "C", "text": "另一錯誤"},
            ],
        })
        result = json.loads(resp.content)
        self.assertTrue(result["ok"])
        q = Question.objects.get(pk=result["id"])
        self.assertEqual(q.text, "新測試題目")
        self.assertTrue(q.user_added)
        self.assertEqual(q.choices.filter(is_correct=True).first().text, "正確答案")

    def test_add_empty_stem_rejected(self):
        resp = self._post_json({
            "action": "add", "stem": "  ", "answer": "A",
            "options": [{"key": "A", "text": "選項"}],
        })
        result = json.loads(resp.content)
        self.assertFalse(result["ok"])

    def test_add_too_few_options_rejected(self):
        resp = self._post_json({
            "action": "add", "stem": "題目",
            "answer": "A",
            "options": [{"key": "A", "text": "只有一個"}],
        })
        result = json.loads(resp.content)
        self.assertFalse(result["ok"])

    def test_add_no_correct_answer_rejected(self):
        resp = self._post_json({
            "action": "add", "stem": "題目", "answer": "Z",
            "options": [
                {"key": "A", "text": "選項A"},
                {"key": "B", "text": "選項B"},
            ],
        })
        result = json.loads(resp.content)
        self.assertFalse(result["ok"])

    def test_edit_user_added_question(self):
        q = Question.objects.create(
            chapter=self.chapter, text="原始題目", user_added=True, is_custom=True,
        )
        Choice.objects.create(question=q, text="A", is_correct=True)
        resp = self._post_json({
            "action": "edit", "question_id": q.id,
            "stem": "修改後題目", "block": "", "hint": "",
            "answer": "A",
            "options": [{"key": "A", "text": "新選項A"}, {"key": "B", "text": "選項B"}],
        })
        self.assertTrue(json.loads(resp.content)["ok"])
        q.refresh_from_db()
        self.assertEqual(q.text, "修改後題目")
        self.assertEqual(q.choices.first().text, "新選項A")

    def test_edit_course_question_returns_404(self):
        q = self.questions[0]  # user_added=False
        resp = self._post_json({
            "action": "edit", "question_id": q.id,
            "stem": "改壞課程題", "answer": "A",
            "options": [{"key": "A", "text": "A"}],
        })
        self.assertEqual(resp.status_code, 404)
        q.refresh_from_db()
        self.assertEqual(q.text, "題目 1")  # unchanged

    def test_delete_user_added_question(self):
        q = Question.objects.create(
            chapter=self.chapter, text="要刪除的題", user_added=True, is_custom=True,
        )
        Choice.objects.create(question=q, text="A", is_correct=True)
        resp = self._post_json({"action": "delete", "question_id": q.id})
        self.assertTrue(json.loads(resp.content)["ok"])
        self.assertFalse(Question.objects.filter(pk=q.id).exists())

    def test_delete_course_question_returns_404(self):
        q = self.questions[0]
        resp = self._post_json({"action": "delete", "question_id": q.id})
        self.assertEqual(resp.status_code, 404)
        self.assertTrue(Question.objects.filter(pk=q.id).exists())

    def test_clear_custom_deletes_only_user_added(self):
        for i in range(3):
            uq = Question.objects.create(
                chapter=self.chapter, text=f"自訂 {i}", user_added=True, is_custom=True,
            )
            Choice.objects.create(question=uq, text="A", is_correct=True)
        resp = self._post_json({"action": "clear_custom"})
        result = json.loads(resp.content)
        self.assertTrue(result["ok"])
        self.assertEqual(result["deleted"], 3)
        self.assertEqual(Question.objects.filter(user_added=True).count(), 0)
        self.assertEqual(Question.objects.filter(user_added=False).count(), 3)

    def test_invalid_json_returns_400(self):
        resp = self.client.post(
            reverse("quiz:admin_panel"),
            data="NOT JSON",
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_unknown_action_returns_400(self):
        resp = self._post_json({"action": "hack"})
        self.assertEqual(resp.status_code, 400)
