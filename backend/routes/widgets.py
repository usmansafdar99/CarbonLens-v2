"""Live weather and SAWiE news for the home page.

Weather: Open-Meteo (free, no key) for the forecast, OpenStreetMap Nominatim for the place
name, ipwho.is as a fallback when the browser does not share its location.

News: the SAWiE RSS feed. Article images are downloaded once by the server and served from
our own domain, so they load instantly and never break because of hot-link protection,
mixed content or a slow external host.
"""
import hashlib
import html as _html
import logging
import mimetypes
import re
import threading
import time
import xml.etree.ElementTree as ET
from urllib.parse import urljoin

import requests
from flask import Blueprint, jsonify, request, send_file

import config
from security import client_ip, is_public_ip, rate_limit

widgets_bp = Blueprint("widgets", __name__)
log = logging.getLogger("carbonlens.widgets")

UA = {"User-Agent": "CarbonLens/2.0 (+https://sawie.net)"}
# sawie.net (WordPress + security plugin) rejects unknown bots, so look like a normal browser there.
BROWSER_UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/130.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-GB,en;q=0.9"}
HTTP = requests.Session()
HTTP.headers.update(UA)

# ═════════════════════════════ WEATHER ══════════════════════════════════════
WEATHER_TTL = 600          # 10 min
PLACE_TTL = 86400          # place names barely change
_weather_cache: dict = {}
_place_cache: dict = {}
_cache_lock = threading.Lock()

# WMO weather interpretation codes → (description, icon key)
WMO = {
    0: ("Clear sky", "clear"), 1: ("Mainly clear", "clear"), 2: ("Partly cloudy", "partly"),
    3: ("Overcast", "cloud"), 45: ("Fog", "fog"), 48: ("Freezing fog", "fog"),
    51: ("Light drizzle", "drizzle"), 53: ("Drizzle", "drizzle"), 55: ("Heavy drizzle", "drizzle"),
    56: ("Freezing drizzle", "drizzle"), 57: ("Freezing drizzle", "drizzle"),
    61: ("Light rain", "rain"), 63: ("Rain", "rain"), 65: ("Heavy rain", "rain"),
    66: ("Freezing rain", "rain"), 67: ("Freezing rain", "rain"),
    71: ("Light snow", "snow"), 73: ("Snow", "snow"), 75: ("Heavy snow", "snow"), 77: ("Snow grains", "snow"),
    80: ("Rain showers", "rain"), 81: ("Rain showers", "rain"), 82: ("Heavy showers", "rain"),
    85: ("Snow showers", "snow"), 86: ("Snow showers", "snow"),
    95: ("Thunderstorm", "storm"), 96: ("Thunderstorm with hail", "storm"), 99: ("Thunderstorm with hail", "storm"),
}


def _cached(cache, key, ttl):
    with _cache_lock:
        hit = cache.get(key)
        if hit and time.time() - hit[0] < ttl:
            return hit[1]
    return None


def _store(cache, key, value):
    with _cache_lock:
        if len(cache) > 2000:
            cache.clear()
        cache[key] = (time.time(), value)


def _ip_location(ip: str | None):
    """City and coordinates for an IP (or for this server's own IP when ip is None)."""
    try:
        r = HTTP.get(f"https://ipwho.is/{ip or ''}", timeout=4)
        d = r.json() if r.ok else {}
        if d.get("success") and d.get("latitude") is not None:
            return {"lat": float(d["latitude"]), "lon": float(d["longitude"]),
                    "label": ", ".join(x for x in (d.get("city"), d.get("country")) if x)}
    except (requests.RequestException, ValueError):
        pass
    return None


def _place_name(lat: float, lon: float) -> str:
    key = f"{lat:.2f},{lon:.2f}"
    hit = _cached(_place_cache, key, PLACE_TTL)
    if hit is not None:
        return hit
    name = ""
    try:
        r = HTTP.get("https://nominatim.openstreetmap.org/reverse", timeout=5, params={
            "lat": f"{lat:.4f}", "lon": f"{lon:.4f}", "format": "jsonv2", "zoom": 12,
            "accept-language": "en"})  # zoom 12: town level
        if r.ok:
            a = r.json().get("address", {})
            town = (a.get("city") or a.get("town") or a.get("village") or a.get("municipality")
                    or a.get("county") or a.get("state_district") or "")
            name = ", ".join(x for x in (town, a.get("country")) if x)
    except (requests.RequestException, ValueError):
        pass
    _store(_place_cache, key, name)
    return name


def _forecast(lat: float, lon: float) -> dict:
    r = HTTP.get("https://api.open-meteo.com/v1/forecast", timeout=8, params={
        "latitude": f"{lat:.4f}", "longitude": f"{lon:.4f}", "timezone": "auto", "forecast_days": 4,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    })
    r.raise_for_status()
    j = r.json()
    cur = j["current"]
    desc, icon = WMO.get(int(cur.get("weather_code", 0)), ("Unknown", "cloud"))
    daily = j.get("daily", {})
    days = []
    for i, date in enumerate((daily.get("time") or [])[:4]):
        d_desc, d_icon = WMO.get(int(daily["weather_code"][i]), ("Unknown", "cloud"))
        days.append({
            "date": date, "icon": d_icon, "desc": d_desc,
            "max_c": round(daily["temperature_2m_max"][i]), "min_c": round(daily["temperature_2m_min"][i]),
            "rain_pct": (daily.get("precipitation_probability_max") or [None] * 4)[i],
        })
    return {
        "temp_c": round(cur["temperature_2m"]), "feels_c": round(cur["apparent_temperature"]),
        "humidity": round(cur["relative_humidity_2m"]), "wind_kmph": round(cur["wind_speed_10m"]),
        "desc": desc, "icon": icon, "is_day": bool(cur.get("is_day", 1)),
        "observed_at": cur.get("time"), "timezone": j.get("timezone"), "forecast": days,
    }


@widgets_bp.get("/weather")
@rate_limit(30, 60, "weather")
def weather():
    """Weather at ?lat=&lon= (browser location) or, without them, at the visitor's IP location."""
    lat, lon, label, source = request.args.get("lat"), request.args.get("lon"), "", "gps"
    try:
        if lat is not None and lon is not None:
            lat, lon = float(lat), float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                raise ValueError
        else:
            source = "network"
            ip = client_ip()
            loc = _ip_location(ip if is_public_ip(ip) else None)   # local dev: server's own IP
            if not loc:
                return jsonify({"error": "location unavailable"}), 503
            lat, lon, label = loc["lat"], loc["lon"], loc["label"]
    except (TypeError, ValueError):
        return jsonify({"error": "bad coordinates"}), 400

    key = f"{lat:.2f},{lon:.2f}"
    data = _cached(_weather_cache, key, WEATHER_TTL)
    if data is None:
        try:
            data = _forecast(lat, lon)
        except (requests.RequestException, KeyError, ValueError, TypeError) as exc:
            log.warning("Weather lookup failed: %s", exc)
            return jsonify({"error": "weather unavailable"}), 502
        _store(_weather_cache, key, data)
    out = dict(data)
    out["city"] = label or _place_name(lat, lon) or "Your location"
    out["source"] = source
    return jsonify(out)


# ═════════════════════════════ NEWS ═════════════════════════════════════════
SAWIE_FEED = "https://sawie.net/feed/"
NEWS_TTL = 6 * 3600
IMG_DIR = config.CACHE_DIR / "news"
IMG_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMG_BYTES = 6 * 1024 * 1024
RELEVANT = ("cotton", "carbon", "climate", "agricultur", "methane", "rice", "farm", "soil", "water")

FALLBACK_NEWS = [
    {
        "title": "Unlocking Agricultural Carbon Markets: Climate-Smart Solutions for a Resilient Future",
        "desc": "SAWiE and partners explored practical routes to cut emissions, support sustainable rice "
                "production and connect farmers with climate finance and agricultural carbon markets.",
        "url": "https://sawie.net/unlocking-agricultural-carbon-markets-climate-smart-solutions-for-a-resilient-future/",
        "source": "SAWiE | 27 August 2026", "published_at": "2026-08-27",
    },
    {
        "title": "Stakeholder Consultation Meeting | Rice Methane Reduction Project | Layyah",
        "desc": "SAWiE's Layyah project reduces methane from rice through Alternate Wetting and Drying, "
                "supporting low-emission rice value chains alongside cotton footprinting.",
        "url": "https://sawie.net/%f0%9f%8c%be-stakeholder-consultation-meeting-rice-methane-reduction-project-layyah/",
        "source": "SAWiE | Rice Carbon Project", "published_at": "2026-07-02",
    },
]

_news_state = {"articles": None, "ts": 0.0}
_news_lock = threading.Lock()
_refresh_running = threading.Event()

_IMG_TAG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
_OG = [
    re.compile(r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)', re.I),
    re.compile(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', re.I),
    re.compile(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)', re.I),
]
_SKIP_IMG = re.compile(r"pixel|1x1|spacer|blank|gravatar|emoji|s\.w\.org|favicon|/icons?/", re.I)


def _img_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:20]


def _cached_image_path(img_id: str):
    for p in IMG_DIR.glob(f"{img_id}.*"):
        return p
    return None


def _download_image(url: str):
    """Download an image once into the cache. Returns our own URL for it, or ''."""
    if not url or not url.startswith(("http://", "https://")) or _SKIP_IMG.search(url):
        return ""
    img_id = _img_id(url)
    if _cached_image_path(img_id):
        return f"/api/widgets/news-image/{img_id}"
    try:
        with HTTP.get(url, timeout=12, stream=True, headers={**BROWSER_UA, "Referer": "https://sawie.net/"}) as r:
            ctype = r.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if r.status_code != 200 or not ctype.startswith("image/") or ctype == "image/svg+xml":
                return ""
            ext = mimetypes.guess_extension(ctype) or ".img"
            ext = {".jpe": ".jpg", ".jpeg": ".jpg"}.get(ext, ext)
            data = bytearray()
            for chunk in r.iter_content(64 * 1024):
                data.extend(chunk)
                if len(data) > MAX_IMG_BYTES:
                    return ""
        if len(data) < 2048:          # tracking pixels, broken placeholders
            return ""
        tmp = IMG_DIR / f"{img_id}.tmp"
        tmp.write_bytes(bytes(data))
        tmp.replace(IMG_DIR / f"{img_id}{ext}")
        return f"/api/widgets/news-image/{img_id}"
    except requests.RequestException:
        return ""


def _og_images(article_url: str):
    try:
        r = HTTP.get(article_url, timeout=10, headers=BROWSER_UA)
        if r.status_code != 200:
            return []
        found = []
        for pat in _OG:
            for m in pat.finditer(r.text):
                u = _html.unescape(m.group(1)).strip()
                if u.startswith("//"):
                    u = "https:" + u
                found.append(urljoin(article_url, u))
        return found
    except requests.RequestException:
        return []


def _resolve_image(article: dict) -> str:
    """Try the feed image, then the article's own social preview image. First that downloads wins."""
    candidates = [u for u in article.pop("_imgs", []) if u.startswith("http") and not _SKIP_IMG.search(u)]
    og = _og_images(article["url"])
    article["image_remote"] = (og or candidates or [""])[0]   # browser can try this directly
    for url in candidates + og:
        local = _download_image(url)
        if local:
            return local
    return ""


def _parse_feed():
    r = HTTP.get(SAWIE_FEED, timeout=10, headers=BROWSER_UA)
    r.raise_for_status()
    root = ET.fromstring(r.content)
    ns = {"media": "http://search.yahoo.com/mrss/",
          "content": "http://purl.org/rss/1.0/modules/content/"}
    out = []
    for item in root.findall(".//item")[:15]:
        title = _html.unescape((item.findtext("title") or "").strip())
        url = (item.findtext("link") or "").strip()
        if not title or not url.startswith("http"):
            continue
        raw_desc = item.findtext("description") or ""
        desc = re.sub(r"\s+", " ", _html.unescape(re.sub(r"<[^>]+>", " ", raw_desc))).strip()
        desc = re.sub(r"\s*The post .*? appeared first on .*$", "", desc)[:220]
        imgs = []
        for tag in ("media:content", "media:thumbnail"):
            el = item.find(tag, ns)
            if el is not None and el.get("url"):
                imgs.append(el.get("url"))
        enc = item.find("enclosure")
        if enc is not None and "image" in (enc.get("type") or ""):
            imgs.append(enc.get("url"))
        body = (item.findtext("content:encoded", namespaces=ns) or "") + raw_desc
        imgs += _IMG_TAG.findall(body)[:3]
        pub = (item.findtext("pubDate") or "").strip()
        out.append({"title": title, "desc": desc, "url": url, "source": "SAWiE | " + pub[5:16] if pub else "SAWiE",
                    "published_at": pub, "_imgs": [_html.unescape(u) for u in imgs if u]})
    return out


def _refresh_news():
    if _refresh_running.is_set():
        return
    _refresh_running.set()
    try:
        try:
            feed = _parse_feed()
        except (requests.RequestException, ET.ParseError) as exc:
            log.warning("News feed unavailable: %s", exc)
            feed = []
        chosen = [a for a in feed if any(t in (a["title"] + " " + a["desc"]).lower() for t in RELEVANT)][:2]
        for fb in FALLBACK_NEWS:
            if len(chosen) >= 2:
                break
            if fb["url"] not in {a["url"] for a in chosen}:
                chosen.append(dict(fb))
        threads = []
        for a in chosen:
            t = threading.Thread(target=lambda art=a: art.__setitem__("image", _resolve_image(art)), daemon=True)
            t.start()
            threads.append(t)
        for t in threads:
            t.join(30)
        for a in chosen:
            a.pop("_imgs", None)
            a.setdefault("image", "")
        with _news_lock:
            if not feed and _news_state["articles"]:
                # Feed was unreachable: keep the last good set, try again in 15 minutes.
                _news_state["ts"] = time.time() - NEWS_TTL + 900
            else:
                complete = all(a.get("image") for a in chosen)
                # Missing an image? Serve what we have, but try again in 30 minutes.
                _news_state.update(articles=chosen, ts=time.time() if complete else time.time() - NEWS_TTL + 1800)
    finally:
        _refresh_running.clear()


def warm_news_cache():
    """Called at start-up so the first visitor never waits for the feed."""
    threading.Thread(target=_refresh_news, daemon=True, name="news-warmup").start()


@widgets_bp.get("/news")
@rate_limit(60, 60, "news")
def news():
    with _news_lock:
        articles, ts = _news_state["articles"], _news_state["ts"]
    stale = time.time() - ts > NEWS_TTL
    if articles is None:
        # First request before warm-up finished: wait briefly, then fall back.
        if not _refresh_running.is_set():
            warm_news_cache()
        for _ in range(40):
            time.sleep(0.15)
            with _news_lock:
                articles = _news_state["articles"]
            if articles is not None:
                break
        if articles is None:
            articles = [dict(a, image="") for a in FALLBACK_NEWS]
    elif stale:
        warm_news_cache()                      # refresh in the background, answer from cache now
    resp = jsonify({"articles": articles})
    resp.headers["Cache-Control"] = "public, max-age=300"
    return resp


@widgets_bp.get("/news-image/<img_id>")
def news_image(img_id):
    if not re.fullmatch(r"[0-9a-f]{20}", img_id):
        return jsonify({"detail": "not found"}), 404
    path = _cached_image_path(img_id)
    if not path:
        return jsonify({"detail": "not found"}), 404
    resp = send_file(path, mimetype=mimetypes.guess_type(path.name)[0] or "image/jpeg", max_age=7 * 86400)
    resp.headers["Cache-Control"] = "public, max-age=604800, immutable"
    return resp



# ═════════════════════════ STATES / CITIES (non-Pakistan farms) ═══════════════
GEO_TTL = 7 * 86400
_geo_cache: dict = {}


def _countriesnow(path: str, body: dict):
    key = path + "|" + "|".join(f"{k}={v}" for k, v in sorted(body.items()))
    hit = _cached(_geo_cache, key, GEO_TTL)
    if hit is not None:
        return hit
    try:
        r = HTTP.post(f"https://countriesnow.space/api/v0.1/countries/{path}", json=body, timeout=8)
        data = r.json().get("data") if r.ok else None
    except (requests.RequestException, ValueError):
        return None
    _store(_geo_cache, key, data)
    return data


@widgets_bp.get("/geo/states")
@rate_limit(60, 60, "geo")
def geo_states():
    country = (request.args.get("country") or "").strip()[:80]
    if not country:
        return jsonify({"states": []})
    data = _countriesnow("states", {"country": country}) or {}
    states = [s.get("name") for s in (data.get("states") or []) if isinstance(s, dict) and s.get("name")]
    return jsonify({"states": states})


@widgets_bp.get("/geo/cities")
@rate_limit(60, 60, "geo")
def geo_cities():
    country = (request.args.get("country") or "").strip()[:80]
    state = (request.args.get("state") or "").strip()[:80]
    if not country or not state:
        return jsonify({"cities": []})
    data = _countriesnow("state/cities", {"country": country, "state": state}) or []
    return jsonify({"cities": [c for c in data if isinstance(c, str)][:2000]})
