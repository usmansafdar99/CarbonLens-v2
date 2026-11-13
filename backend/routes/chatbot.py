"""CarbonLens Assistant: topic-restricted chat through Groq's OpenAI-compatible API."""
import logging

import requests
from flask import Blueprint, g, jsonify

import config
from auth_utils import login_required
from security import json_body, rate_limit

chatbot_bp = Blueprint("chatbot", __name__)
log = logging.getLogger("carbonlens.chat")

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are the CarbonLens Assistant inside the CarbonLens crop carbon-footprint calculator built by "
    "SAWiE (Sustainable Agriculture Water and Intelligent Ecosystems). Answer only questions about: "
    "(1) using CarbonLens (registering a farm, entering a season, reading results, downloading the report), "
    "(2) the carbon footprint of cotton and other field crops and its sources (fertiliser, irrigation, "
    "machinery, residue burning, crop protection, labour), "
    "(3) general greenhouse-gas and sustainability concepts in agriculture. "
    "For anything else, say politely that you can only help with CarbonLens and farm carbon questions. "
    "Keep answers short (2-5 sentences), clear and practical. Never invent emission factors; say when a "
    "figure is approximate. Reply in the language the user writes in (English, Urdu or Roman Urdu)."
)


@chatbot_bp.post("/ask")
@login_required
@rate_limit(20, 60, "chat", key_func=lambda: str(g.current_user.id))
def ask():
    data = json_body()
    message = (data.get("message") or "").strip()[:2000]
    history = data.get("history") if isinstance(data.get("history"), list) else []
    if not message:
        return jsonify({"detail": "Message is required"}), 400
    if not config.GROQ_API_KEY:
        return jsonify({"reply": "The assistant is not switched on for this server yet."})

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in history[-6:]:
        if isinstance(turn, dict) and turn.get("role") in ("user", "assistant"):
            content = str(turn.get("content") or "")[:1000]
            if content:
                messages.append({"role": turn["role"], "content": content})
    messages.append({"role": "user", "content": message})

    try:
        resp = requests.post(GROQ_URL, timeout=20,
                             headers={"Authorization": f"Bearer {config.GROQ_API_KEY}",
                                      "Content-Type": "application/json"},
                             json={"model": config.GROQ_MODEL, "messages": messages,
                                   "temperature": 0.3, "max_tokens": 400})
        if resp.status_code != 200:
            log.error("Groq API error %s: %s", resp.status_code, resp.text[:300])
            return jsonify({"reply": "The assistant is unavailable at the moment. Please try again shortly."})
        reply = resp.json()["choices"][0]["message"]["content"].strip()
        return jsonify({"reply": reply})
    except (requests.RequestException, KeyError, IndexError, ValueError) as exc:
        log.error("Assistant request failed: %s", exc)
        return jsonify({"reply": "The assistant is unavailable at the moment. Please try again shortly."})
