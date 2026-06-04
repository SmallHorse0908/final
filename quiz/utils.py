import random


def get_shuffled_questions(chapter, limit=None):
    qs = list(chapter.questions.prefetch_related("choices").all())
    random.shuffle(qs)
    if limit:
        qs = qs[:limit]
    return qs


def shuffle_choices(question):
    choices = list(question.choices.all())
    random.shuffle(choices)
    return choices
