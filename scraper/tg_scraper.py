#!/usr/bin/env python3
"""Прототип скрапера телеграм-каналов для ExchangeHub.

Читает публичный канал через веб-превью t.me/s/<channel> (без API-ключей
телеграма), отбрасывает посты, не похожие на программы, и просит Gemini
разобрать оставшиеся в структурированный JSON.

Ничего никуда не записывает — только печатает результат и кладёт его в файл.
"""

import argparse
import datetime
import html
import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, ValidationError

ROOT = Path(__file__).resolve().parent.parent
SEEN_FILE = Path(__file__).resolve().parent / "seen.json"

# Приписка в конце описания, чтобы при модерации было видно происхождение
# карточки, пока в заявке нет отдельного поля "источник".
MARKER = "\n\nAutomatically added"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36"

# Грубый фильтр: гоняем через модель только то, что хоть отдалённо похоже
# на программу. Экономит запросы и квоту.
# Страховка на случай, если модель ошиблась с is_in_russia.
RU_PLACES = re.compile(
    r"росси|\bрф\b|russia|москв|moscow|санкт-петербург|петербург|spb|"
    r"новосибирск|казан|екатеринбург|иннополис|innopolis",
    re.I,
)

# Ссылки на мессенджеры и соцсети — это контакт организатора, а не страница
# программы. Держим их как запасной вариант, но не как основную ссылку.
WEAK_LINKS = re.compile(
    r"wa\.me|whatsapp|t\.me|telegram\.me|instagram\.com|vk\.com|"
    r"facebook\.com|youtu|linkedin\.com|mailto:",
    re.I,
)

KEYWORDS = re.compile(
    r"стажиров|интернш|internship|грант\b|grant\b|стипенди|scholarship|"
    r"обмен|exchange|программ|дедлайн|deadline|подать заявк|apply|"
    r"набор|отбор|конкурс|школа|summer school|fellowship",
    re.I,
)


# --------------------------------------------------------------------------
# 1. Забираем посты
# --------------------------------------------------------------------------

def looks_russian(parsed) -> bool:
    """Программа внутри России? Верим модели, но подстраховываемся текстом страны."""
    return bool(parsed.is_in_russia or RU_PLACES.search(parsed.country))


def clean_link(href: str) -> str:
    """Раскодирует HTML-entity и срезает utm-хвост."""
    href = html.unescape(href)
    base, sep, query = href.partition("?")
    if not sep:
        return href
    kept = [p for p in query.split("&") if p and not p.startswith("utm_")]
    return base + ("?" + "&".join(kept) if kept else "")


def fetch_posts(channel: str, pages: int = 1) -> list[dict]:
    """Возвращает посты канала, от новых к старым."""
    posts: list[dict] = []
    before = None
    session = requests.Session()
    session.headers["User-Agent"] = UA

    for _ in range(pages):
        url = f"https://t.me/s/{channel}"
        if before:
            url += f"?before={before}"
        resp = session.get(url, timeout=25)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        page_posts = []
        for msg in soup.select(".tgme_widget_message"):
            data_post = msg.get("data-post", "")
            if "/" not in data_post:
                continue
            msg_id = int(data_post.split("/")[-1])

            body = msg.select_one(".tgme_widget_message_text")
            if body is None:
                continue
            for br in body.find_all("br"):
                br.replace_with("\n")
            text = body.get_text().strip()
            if not text:
                continue

            time_tag = msg.select_one("time[datetime]")
            date = time_tag["datetime"][:10] if time_tag else ""

            # Ссылки вытаскиваем сами из разметки, а не доверяем модели.
            # Часть каналов прячет ссылку на программу в inline-кнопку
            # ("Подробнее") под постом, а не в текст.
            button_links = [
                clean_link(a["href"])
                for a in msg.select("a.tgme_widget_message_inline_button[href]")
                if a["href"].startswith("http") and "t.me" not in a["href"]
            ]
            text_links = [
                clean_link(a["href"]) for a in body.select("a[href]")
                if a["href"].startswith("http") and "t.me" not in a["href"]
            ]
            raw_links = button_links + text_links
            # Убираем дубли, сохраняя порядок; мессенджеры — в хвост.
            raw_links = list(dict.fromkeys(raw_links))
            links = ([l for l in raw_links if not WEAK_LINKS.search(l)]
                     + [l for l in raw_links if WEAK_LINKS.search(l)])

            page_posts.append({
                "id": msg_id,
                "date": date,
                "url": f"https://t.me/{channel}/{msg_id}",
                "text": text,
                "links": links,
            })

        if not page_posts:
            break
        posts.extend(page_posts)
        before = min(p["id"] for p in page_posts)
        time.sleep(1)  # не долбим телеграм

    posts.sort(key=lambda p: p["id"], reverse=True)
    return posts


# --------------------------------------------------------------------------
# 2. Схема разбора
# --------------------------------------------------------------------------

class ParsedProgram(BaseModel):
    is_program: bool
    title: str = ""
    description: str = ""
    program_type: str = "OTHER"
    country: str = ""
    is_in_russia: bool = False
    deadline: str = ""


# Схему для модели пишем руками, а не через model_json_schema():
# так в ней нет служебных ключей pydantic, которые провайдеры не любят.
SCHEMA = {
    "type": "object",
    "properties": {
        "is_program": {
            "type": "boolean",
            "description": "true, только если пост описывает конкретную программу, "
                           "стажировку, грант, стипендию или обмен, на которые можно подать заявку. "
                           "Анонсы вебинаров, подборки советов, реклама и мемы — false.",
        },
        "title": {"type": "string", "description": "Краткое название программы, до 150 символов. Пустая строка, если is_program = false."},
        "description": {"type": "string", "description": "Пересказ сути в 2-3 предложениях: что за программа, для кого, что даёт. Без эмодзи, хештегов и призывов подписаться."},
        "program_type": {"type": "string", "enum": ["INTERNSHIP", "EXCHANGE", "SCHOLARSHIP", "OTHER"]},
        "country": {"type": "string", "description": "Страна или страны проведения. Пустая строка, если в тексте не сказано."},
        "is_in_russia": {
            "type": "boolean",
            "description": "true, если участие не выводит человека за пределы России: программа проходит "
                           "в российском городе, онлайн у российской компании или вуза, либо это грант или "
                           "стипендия на учёбу внутри России. false, если участие подразумевает поездку, "
                           "учёбу, стажировку или удалённую работу за пределами России, либо если программа "
                           "международная и Россия в ней лишь одна из стран. Если по тексту определить "
                           "невозможно — false.",
        },
        "deadline": {"type": "string", "description": "Дедлайн подачи в формате YYYY-MM-DD. Пустая строка, если явной даты в тексте нет."},
    },
    "required": ["is_program", "title", "description", "program_type", "country", "is_in_russia", "deadline"],
}

SYSTEM = """Ты разбираешь посты из телеграм-каналов про образовательные возможности
и превращаешь их в карточки программ для каталога.

Правила:
- Если информации для поля в тексте нет — оставляй пустую строку. Никогда не додумывай
  и не угадывай: выдуманный дедлайн хуже отсутствующего.
- Дедлайн считай относительно указанной даты публикации поста. "до 15 марта" при
  публикации в январе 2026 — это 2026-03-15. Относительные формулировки вроде
  "до конца недели" в дату не превращай, оставь пустую строку.
- description пиши нейтральным тоном, без эмодзи, хештегов, "жми сюда" и "подписывайся".
- Если пост — не про конкретную возможность подать заявку, ставь is_program = false
  и оставляй остальные поля пустыми.
- is_in_russia определяй по тому, где человек окажется физически. Стажировка в Москве,
  грант на учёбу в российском вузе, онлайн-школа российской компании — true. Стажировка
  в Берлине, летняя школа в Корее, стипендия на магистратуру за рубежом — false.
  Российская организация, отправляющая участников за границу, — это false: важна не
  прописка организатора, а место участия."""


# --------------------------------------------------------------------------
# 3. Разбор через Gemini
# --------------------------------------------------------------------------

class QuotaExceeded(RuntimeError):
    """Квота Gemini исчерпана — продолжать прогон бессмысленно."""


def make_client():
    from google import genai
    return genai.Client(http_options={
        # Без явного таймаута SDK может висеть на запросе бесконечно.
        "timeout": 60_000,  # мс
        # Свои повторы у SDK прячут 429 и выглядят как зависание:
        # разбираемся с лимитами сами, в llm_parse.
        "retry_options": {"attempts": 1},
    })


def llm_parse(client, model: str, post: dict) -> ParsedProgram:
    prompt = (
        f"{SYSTEM}\n\nДата публикации поста: {post['date']}\n\n"
        f"Текст поста:\n{post['text']}"
    )

    last_err = None
    for attempt in range(3):
        try:
            try:
                interaction = client.interactions.create(
                    model=model,
                    input=prompt,
                    response_format={
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": SCHEMA,
                    },
                )
                raw = interaction.output_text
            except AttributeError:
                # SDK постарше — другой вызов, смысл тот же.
                resp = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": SCHEMA,
                    },
                )
                raw = resp.text
            return ParsedProgram.model_validate_json(raw)
        except ValidationError as e:
            raise RuntimeError(f"модель вернула невалидный JSON: {e}") from e
        except Exception as e:  # noqa: BLE001
            last_err = e
            msg = str(e)
            is_quota = "429" in msg or "RESOURCE_EXHAUSTED" in msg
            # Суточный лимит ждать бессмысленно — он сбрасывается раз в день.
            if is_quota and ("per day" in msg or "PerDay" in msg or "free_tier_requests" in msg):
                raise QuotaExceeded(msg) from e
            if is_quota or "503" in msg or "timeout" in msg.lower() or "deadline" in msg.lower():
                wait = 20 * (attempt + 1)
                print(f"    лимит или таймаут, жду {wait}с…", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError(f"не удалось после повторов: {last_err}")


# --------------------------------------------------------------------------
# 4. Заливка в заявки ExchangeHub
# --------------------------------------------------------------------------

def load_seen() -> dict:
    if SEEN_FILE.exists():
        return json.loads(SEEN_FILE.read_text(encoding="utf-8"))
    return {}


def save_seen(seen: dict) -> None:
    SEEN_FILE.write_text(json.dumps(seen, ensure_ascii=False, indent=2), encoding="utf-8")


class Session:
    """Держит токен и сам переполучает его, когда сервер отвечает 401.

    Access-токен живёт минуты, а полный обход каналов — больше часа,
    поэтому одного логина на прогон не хватает.
    """

    def __init__(self, base_url: str, email: str, password: str):
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.token = ""
        self.login()

    def login(self) -> None:
        resp = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"email": self.email, "password": self.password},
            timeout=30,
        )
        if resp.status_code != 200:
            raise RuntimeError(f"вход не удался ({resp.status_code}): {resp.text[:300]}")
        self.token = resp.json()["accessToken"]

    def post(self, path: str, payload: dict) -> requests.Response:
        resp = requests.post(
            f"{self.base_url}{path}",
            json=payload,
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=30,
        )
        if resp.status_code == 401:
            print("    токен протух, вхожу заново…", file=sys.stderr)
            self.login()
            resp = requests.post(
                f"{self.base_url}{path}",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30,
            )
        return resp


def to_submission(row: dict) -> tuple[dict | None, str]:
    """Превращает разобранную программу в тело запроса.

    Возвращает (payload, причина отказа). Бэкенд строгий: title, description и
    country обязательны и непустые, дедлайн не может быть в прошлом,
    url должен быть валидным или отсутствовать.
    """
    title = row["title"].strip()[:255]
    if not title:
        return None, "пустой заголовок"

    description = row["description"].strip()
    if not description:
        return None, "пустое описание"
    description = description[: 5000 - len(MARKER)] + MARKER

    # country обязателен и непустой — пусть модератор поправит, чем терять карточку.
    country = row["country"].strip()[:100] or "Не указана"

    deadline = row["deadline"].strip() or None
    if deadline:
        try:
            if datetime.date.fromisoformat(deadline) < datetime.date.today():
                return None, f"дедлайн уже прошёл ({deadline})"
        except ValueError:
            deadline = None  # модель вернула что-то нечитаемое — лучше без даты

    url = row["url"].strip()[:500] or None

    return {
        "title": title,
        "description": description,
        "country": country,
        "type": row["program_type"],
        "deadline": deadline,
        "url": url,
    }, ""


def submit(session: "Session", payload: dict) -> tuple[bool, str]:
    resp = session.post("/api/submissions", payload)
    if resp.status_code in (200, 201):
        return True, ""
    return False, f"{resp.status_code}: {resp.text[:300]}"


# --------------------------------------------------------------------------
# 5. Точка входа
# --------------------------------------------------------------------------

def read_channels(path: Path) -> list[str]:
    """Список каналов из файла: по одному на строку, # — комментарий."""
    if not path.exists():
        return []
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split("#")[0].strip().lstrip("@")
        if line:
            out.append(line)
    return out


def load_env_file(path: Path) -> None:
    """Подтягивает переменные из .env, не перетирая уже заданные."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def collect_candidates(channel: str, pages: int) -> list[dict]:
    print(f"=== @{channel} ===")
    print(f"Читаю t.me/s/{channel} …")
    posts = fetch_posts(channel, pages)
    candidates = [p for p in posts if KEYWORDS.search(p["text"])]
    print(f"Собрано постов: {len(posts)}, похожи на программы: {len(candidates)}")
    return candidates


def process_channel(channel: str, args, client, session, seen: dict) -> dict:
    """Разбирает один канал. Возвращает статистику и разобранные программы."""
    stats = {"parsed": [], "skipped_ru": 0, "sent": 0}

    candidates = collect_candidates(channel, args.pages)

    done_ids = set(seen.get(channel, []))
    fresh = [p for p in candidates if p["id"] not in done_ids]
    if len(fresh) < len(candidates):
        print(f"Пропускаю {len(candidates) - len(fresh)} уже обработанных постов")
    candidates = fresh[: args.limit]
    print()

    for i, post in enumerate(candidates, 1):
        print(f"[{i}/{len(candidates)}] {post['url']}")
        try:
            parsed = llm_parse(client, args.model, post)
        except Exception as e:  # noqa: BLE001
            if isinstance(e, QuotaExceeded):
                raise
            print(f"    ошибка: {e}\n", file=sys.stderr)
            continue

        if not parsed.is_program:
            print("    -> не программа, пропускаю\n")
            continue

        if not args.keep_russia and looks_russian(parsed):
            stats["skipped_ru"] += 1
            print(f"    -> внутри России ({parsed.country or 'Россия'}), пропускаю\n")
            continue

        row = parsed.model_dump()
        row["source_url"] = post["url"]
        row["source_date"] = post["date"]
        row["source_channel"] = channel
        # Ссылку берём из разметки поста, а не из ответа модели.
        row["url"] = post["links"][0] if post["links"] else ""
        stats["parsed"].append(row)
        print(json.dumps(row, ensure_ascii=False, indent=2))

        payload, reason = to_submission(row)
        if payload is None:
            print(f"    -> в заявки не годится: {reason}\n")
            time.sleep(1)
            continue

        if not args.submit:
            print("    -> годится в заявки (для отправки добавь --submit)\n")
            time.sleep(1)
            continue

        ok, err = submit(session, payload)
        if ok:
            stats["sent"] += 1
            done_ids.add(post["id"])
            seen[channel] = sorted(done_ids)
            save_seen(seen)
            print("    -> отправлено в заявки\n")
        else:
            print(f"    -> не отправилось, {err}\n", file=sys.stderr)
        time.sleep(1)

    return stats


def main() -> int:
    ap = argparse.ArgumentParser(description="Прототип скрапера телеграм-каналов")
    ap.add_argument("channels", nargs="*",
                    help="имена каналов без @, через пробел. Если не указаны — берутся из channels.txt")
    ap.add_argument("--pages", type=int, default=1, help="сколько страниц истории пролистать (по 16-20 постов)")
    ap.add_argument("--limit", type=int, default=5, help="сколько кандидатов отдать модели на каждый канал")
    ap.add_argument("--no-llm", action="store_true", help="только собрать посты, без разбора")
    ap.add_argument("--keep-russia", action="store_true",
                    help="не отсеивать программы, проходящие внутри России")
    ap.add_argument("--model", default="gemini-3.8-flash")
    ap.add_argument("--submit", action="store_true",
                    help="залить разобранное в заявки ExchangeHub (без флага — только показать)")
    ap.add_argument("--api", default=os.environ.get("EXCHANGEHUB_API", "https://exchange-hub.su"),
                    help="базовый URL сайта, по умолчанию из EXCHANGEHUB_API")
    ap.add_argument("--out", default="out.json")
    ap.add_argument("--channels-file", default=str(Path(__file__).resolve().parent / "channels.txt"),
                    help="файл со списком каналов, по одному на строку")
    args = ap.parse_args()

    load_env_file(ROOT / ".env")

    channels = args.channels or read_channels(Path(args.channels_file))
    if not channels:
        print(f"Каналы не заданы: укажи их аргументами или впиши в {args.channels_file}",
              file=sys.stderr)
        return 1
    channels = [c.lstrip("@") for c in channels]
    print(f"Каналов в работе: {len(channels)} ({', '.join('@' + c for c in channels)})\n")

    if args.no_llm:
        raw = []
        for channel in channels:
            candidates = collect_candidates(channel, args.pages)
            for post in candidates[: args.limit]:
                preview = post["text"][:200].replace("\n", " ")
                print(f"[{post['date']}] {post['url']}\n    {preview}…")
            print()
            raw.extend(candidates)
        Path(args.out).write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Сырые посты ({len(raw)}) сохранены в {args.out}")
        return 0

    if not os.environ.get("GEMINI_API_KEY"):
        print("GEMINI_API_KEY не найден ни в окружении, ни в .env", file=sys.stderr)
        return 1

    session = None
    if args.submit:
        email = os.environ.get("SCRAPER_EMAIL")
        password = os.environ.get("SCRAPER_PASSWORD")
        if not email or not password:
            print("Для --submit нужны SCRAPER_EMAIL и SCRAPER_PASSWORD в .env", file=sys.stderr)
            return 1
        try:
            session = Session(args.api, email, password)
        except Exception as e:  # noqa: BLE001
            print(f"Не удалось войти на {args.api}: {e}", file=sys.stderr)
            return 1
        print(f"Вошла на {args.api} как {email}, заявки будут отправлены\n")
    else:
        print("Режим показа: ничего никуда не отправляю (залить — флаг --submit)\n")

    client = make_client()
    seen = load_seen()
    results, skipped_ru, sent = [], 0, 0

    for channel in channels:
        try:
            stats = process_channel(channel, args, client, session, seen)
        except QuotaExceeded:
            print(
                "\n  Дневная квота Gemini исчерпана — останавливаюсь.\n"
                "  Варианты: подождать сброса (полночь по тихоокеанскому времени),\n"
                "  взять модель полегче (--model gemini-flash-lite-latest)\n"
                "  или включить платный тариф в Google AI Studio.\n"
                f"  Необработанными остались каналы: "
                f"{', '.join('@' + c for c in channels[channels.index(channel):])}",
                file=sys.stderr,
            )
            break
        except requests.RequestException as e:
            print(f"  Канал @{channel} не прочитался: {e}\n", file=sys.stderr)
            continue
        results.extend(stats["parsed"])
        skipped_ru += stats["skipped_ru"]
        sent += stats["sent"]

    Path(args.out).write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"\nИтого: {len(results)} программ, результат в {args.out}")
    if skipped_ru:
        print(f"Отсеяно как российские: {skipped_ru} (показать их — флаг --keep-russia)")
    if args.submit:
        print(f"Отправлено заявок: {sent}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
