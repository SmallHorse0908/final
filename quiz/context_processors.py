from .models import Chapter


def default_chapter(request):
    chapter = Chapter.objects.filter(number=6).first()
    return {
        "default_chapter": chapter,
        "user_name": request.session.get("user_name", ""),
    }
