"""
一鍵建立第 6 章題庫 + 排行榜種子資料。
執行：python manage.py setup_quiz
"""
import json
from datetime import datetime, timedelta, timezone
from django.core.management.base import BaseCommand
from quiz.models import Chapter, Question, Choice, QuizRecord


QUESTIONS = [
    {
        "text": "下列何者是「後進先出」(LIFO) 的資料結構？",
        "block": "",
        "hint": "LIFO = Last In First Out，最後放入的最先取出，符合堆疊 (Stack) 的特性。",
        "difficulty": "easy",
        "choices": [
            ("陣列", False),
            ("堆疊", True),
            ("佇列", False),
            ("堆積", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "下列何者是「先進先出」(FIFO) 的資料結構？",
        "block": "",
        "hint": "FIFO = First In First Out，最先放入的最先取出，符合佇列 (Queue) 的特性。",
        "difficulty": "easy",
        "choices": [
            ("陣列", False),
            ("堆疊", False),
            ("佇列", True),
            ("堆積", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "假設有一個空的「堆疊」，經過下列操作後，堆疊中的元素 (由底至頂) 為何？",
        "block": "Push(1)、Push(2)、Pop()、Push(3)、Push(4)",
        "hint": "Push 1→[1]，Push 2→[1,2]，Pop→[1]，Push 3→[1,3]，Push 4→[1,3,4]。",
        "difficulty": "medium",
        "choices": [
            ("1, 2, 3", False),
            ("1, 2, 4", False),
            ("1, 3, 4", True),
            ("2, 3, 4", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "假設有一個空的「佇列」，經過下列操作後，佇列中的元素 (由 front 至 rear) 為何？",
        "block": "Enqueue(1)、Enqueue(2)、Dequeue()、Enqueue(3)、Enqueue(4)",
        "hint": "Enqueue 後 [1,2]，Dequeue 取出 front (1) 剩 [2]，再 Enqueue 3、4 → [2,3,4]。",
        "difficulty": "medium",
        "choices": [
            ("1, 2, 3", False),
            ("1, 2, 4", False),
            ("1, 3, 4", False),
            ("2, 3, 4", True),
            ("以上皆非", False),
        ],
    },
    {
        "text": "下列哪個操作可以從「堆疊」刪除一筆資料？",
        "block": "",
        "hint": "堆疊用 Push 放入、Pop 取出。Enqueue / Dequeue 是佇列專用。",
        "difficulty": "easy",
        "choices": [
            ("Push", False),
            ("Pop", True),
            ("Enqueue", False),
            ("Dequeue", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "下列哪個操作可以從「佇列」刪除一筆資料？",
        "block": "",
        "hint": "佇列用 Enqueue 從 rear 放入、Dequeue 從 front 取出。",
        "difficulty": "easy",
        "choices": [
            ("Push", False),
            ("Pop", False),
            ("Enqueue", False),
            ("Dequeue", True),
        ],
    },
    {
        "text": "若想在「堆疊」中找到最小值，則時間複雜度為何？",
        "block": "",
        "hint": "堆疊只能從頂端存取，要找最小值必須走訪每個元素，故為 O(n)。",
        "difficulty": "medium",
        "choices": [
            ("O(1)", False),
            ("O(log n)", False),
            ("O(n)", True),
            ("O(n²)", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "若想在「佇列」中找到最小值，則時間複雜度為何？",
        "block": "",
        "hint": "佇列同樣只能從兩端操作，找最小值需走訪全部 n 個元素，為 O(n)。",
        "difficulty": "medium",
        "choices": [
            ("O(1)", False),
            ("O(log n)", False),
            ("O(n)", True),
            ("O(n²)", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "若環狀佇列的長度為 n，下列何者可以用來判斷環狀佇列已填滿？",
        "block": "",
        "hint": "環狀佇列一般保留一格判斷滿/空，rear 的下一格若等於 front，代表已填滿。",
        "difficulty": "hard",
        "choices": [
            ("front == rear", False),
            ("rear == n - 1", False),
            ("(rear + 1) % n == front", True),
            ("rear == front + 1", False),
        ],
    },
    {
        "text": "下列資料結構中，何者的加入與刪除可以在兩端進行？",
        "block": "",
        "hint": "Deque (Double-ended Queue) 兩端皆可進行 insert / delete 操作。",
        "difficulty": "easy",
        "choices": [
            ("佇列 (Queue)", False),
            ("優先佇列 (Priority Queue)", False),
            ("雙向佇列 (Deque)", True),
            ("以上皆可", False),
        ],
    },
    {
        "text": "下列資料結構中，何者適合用來解「迷宮問題」？",
        "block": "",
        "hint": "迷宮走法常用 DFS (深度優先)，DFS 以堆疊回溯路徑；若用 BFS 找最短路徑則改用佇列。",
        "difficulty": "medium",
        "choices": [
            ("鏈結串列", False),
            ("堆疊", True),
            ("佇列", False),
            ("堆積", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "下列資料結構中，何者適合用來進行「中序表示式轉後序表示式」？",
        "block": "",
        "hint": "Shunting-yard 演算法使用堆疊暫存運算子，依優先權彈出。",
        "difficulty": "medium",
        "choices": [
            ("鏈結串列", False),
            ("堆疊", True),
            ("佇列", False),
            ("堆積", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "已知某運算式的「後序表示式」，下列何種資料結構適合用來計算運算式的結果？",
        "block": "",
        "hint": "後序式求值：遇到數字推入堆疊，遇到運算子彈出兩個數計算後再推回去。",
        "difficulty": "medium",
        "choices": [
            ("鏈結串列", False),
            ("堆疊", True),
            ("佇列", False),
            ("堆積", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "已知 A=1、B=2、C=3、D=4，且運算式的後序式表示法如下，計算結果為何？",
        "block": "A B + C D + *",
        "hint": "(A+B) × (C+D) = (1+2) × (3+4) = 3 × 7 = 21。",
        "difficulty": "hard",
        "choices": [
            ("11", False),
            ("15", False),
            ("21", True),
            ("24", False),
            ("以上皆非", False),
        ],
    },
    {
        "text": "下列何者「不是」堆疊 (Stack) 的典型應用？",
        "block": "",
        "hint": "作業系統的程序排程通常用佇列 (FIFO) 或優先佇列實作，其他三項都是經典堆疊應用。",
        "difficulty": "medium",
        "is_custom": True,
        "choices": [
            ("函式呼叫的返回位址管理", False),
            ("瀏覽器的上一頁 / 下一頁紀錄", False),
            ("作業系統的程序排程 (CPU Scheduling)", True),
            ("編譯器檢查括號是否成對", False),
            ("以上皆是堆疊的應用", False),
        ],
    },
]

SEED_LEADERBOARD = [
    {"user_name": "馬睿廷",    "score": 100, "correct_count": 15, "duration_seconds": 184, "days_ago": 8},
    {"user_name": "Niklaus_W",  "score": 93,  "correct_count": 14, "duration_seconds": 221, "days_ago": 9},
    {"user_name": "黃立宇",    "score": 93,  "correct_count": 14, "duration_seconds": 245, "days_ago": 8},
    {"user_name": "魚量漢",    "score": 86,  "correct_count": 13, "duration_seconds": 198, "days_ago": 7},
    {"user_name": "stack_ovf",  "score": 80,  "correct_count": 12, "duration_seconds": 312, "days_ago": 11},
    {"user_name": "queue_lover","score": 80,  "correct_count": 12, "duration_seconds": 334, "days_ago": 10},
    {"user_name": "Alan_T",     "score": 73,  "correct_count": 11, "duration_seconds": 267, "days_ago": 12},
    {"user_name": "anon_113",   "score": 66,  "correct_count": 10, "duration_seconds": 401, "days_ago": 13},
    {"user_name": "binary_owl", "score": 60,  "correct_count": 9,  "duration_seconds": 289, "days_ago": 14},
    {"user_name": "node_zero",  "score": 53,  "correct_count": 8,  "duration_seconds": 512, "days_ago": 15},
]


class Command(BaseCommand):
    help = "建立第 6 章題庫並植入排行榜種子資料"

    def handle(self, *args, **options):
        chapter, created = Chapter.objects.get_or_create(
            number=6,
            defaults={"title": "堆疊與佇列"},
        )
        action = "已建立" if created else "已存在"
        self.stdout.write(f"章節 Ch.6 {action}。")

        if chapter.questions.exists():
            self.stdout.write("題庫已存在，跳過匯入（若要重設請先 flush 資料庫）。")
        else:
            for q_data in QUESTIONS:
                q = Question.objects.create(
                    chapter=chapter,
                    text=q_data["text"],
                    block=q_data.get("block", ""),
                    hint=q_data.get("hint", ""),
                    difficulty=q_data.get("difficulty", "medium"),
                    is_custom=q_data.get("is_custom", False),
                )
                for text, is_correct in q_data["choices"]:
                    Choice.objects.create(question=q, text=text, is_correct=is_correct)
            self.stdout.write(self.style.SUCCESS(f"✓ 已匯入 {len(QUESTIONS)} 題。"))

        if QuizRecord.objects.filter(chapter=chapter).exists():
            self.stdout.write("排行榜種子已存在，跳過。")
        else:
            now = datetime.now(tz=timezone.utc)
            for entry in SEED_LEADERBOARD:
                created_at = now - timedelta(days=entry["days_ago"])
                details = [{"is_correct": i < entry["correct_count"]} for i in range(15)]
                QuizRecord.objects.create(
                    user_name=entry["user_name"],
                    chapter=chapter,
                    score=entry["score"],
                    correct_count=entry["correct_count"],
                    total=15,
                    duration_seconds=entry["duration_seconds"],
                    details_json=json.dumps(details, ensure_ascii=False),
                    created_at=created_at,
                )
            self.stdout.write(self.style.SUCCESS(f"✓ 已植入 {len(SEED_LEADERBOARD)} 筆排行榜種子。"))

        self.stdout.write(self.style.SUCCESS("\n完成！請執行：python manage.py runserver"))
