"""Per-user calculation history: save, list, view one, delete one, clear all (email-code protected)."""
import logging
from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify, request

import mailer
from auth_utils import OTP_MINUTES, check_otp, login_required, new_otp
from database import session_scope
from models import Calculation, Emission, Farm, OtpCode, Season, User
from security import clean_str, json_body, rate_limit, to_float

history_bp = Blueprint("history", __name__)
log = logging.getLogger("carbonlens.history")

SOURCES = ("fert", "irrig", "land", "resid", "mach", "pest")
FARM_FIELDS = ("farmer_name", "province", "district", "tehsil", "village", "soil_texture",
               "soil_organic_matter", "soil_drainage", "soil_ph", "climate", "moisture_regime")
JSON_FIELDS = ("fertiliser_data", "irrigation_data", "machinery_data", "pest_protection_data",
               "residue_data", "labour_data")


def _json_obj(v, max_items=60):
    """Accept only small dicts of plain values for the JSON input columns."""
    if not isinstance(v, dict):
        return {}
    out = {}
    for k, val in list(v.items())[:max_items]:
        if isinstance(val, list):
            out[str(k)[:60]] = [x for x in val[:max_items] if isinstance(x, (dict, str, int, float, bool))]
        elif isinstance(val, (dict, str, int, float, bool)) or val is None:
            out[str(k)[:60]] = val
    return out


def _summary(c: Calculation) -> dict:
    return {
        "id": c.id,
        "farm_id": c.farm_id or "",
        "farmer_name": c.farmer_name or "",
        "district": c.district or "",
        "province": c.province or "",
        "season": c.season or "",
        "crop": c.crop or "",
        "area": c.area or 0,
        "seed_cotton_yield": c.seed_cotton_yield or 0,
        "total_co2_equiv": c.total_co2_equiv or 0,
        "intensity_per_kg": c.intensity_per_kg or 0,
        "calculated_at": (c.calculated_at.isoformat() + "Z") if c.calculated_at else "",
    }


# ── POST /api/history/save ───────────────────────────────────────────────────
@history_bp.post("/save")
@login_required
@rate_limit(30, 60, "history_save", key_func=lambda: str(g.current_user.id))
def save_calculation():
    data = json_body()
    uid = g.current_user.id
    total = to_float(data.get("total_co2_equiv"))
    farm_code = clean_str(data.get("farm_id"), 100) or f"F-{datetime.utcnow():%Y%m%d%H%M%S}"
    season_name = clean_str(data.get("season"), 100)

    breakdown = {}
    raw_bd = data.get("breakdown") if isinstance(data.get("breakdown"), dict) else {}
    for k in SOURCES:
        breakdown[k] = to_float(raw_bd.get(k))

    results = {}
    raw_res = data.get("results") if isinstance(data.get("results"), dict) else {}
    for k in ("iSeed", "iLint", "iAcre", "water", "labour", "produced"):
        results[k] = to_float(raw_res.get(k))
    fd = raw_res.get("fertDetail") if isinstance(raw_res.get("fertDetail"), dict) else {}
    results["fertDetail"] = {k: to_float(fd.get(k)) for k in ("dir", "ind", "urea", "mfg")}

    with session_scope() as db:
        # Double-click guard: same farm + season + total within 10 seconds.
        dupe = db.query(Calculation).filter(
            Calculation.user_id == uid, Calculation.farm_id == farm_code,
            Calculation.season == season_name, Calculation.total_co2_equiv == total,
            Calculation.calculated_at >= datetime.utcnow() - timedelta(seconds=10)).first()
        if dupe:
            return jsonify({"message": "Already saved", "id": dupe.id})

        # Normalised farm / season tables (kept for the farms API).
        farm = db.query(Farm).filter(Farm.owner_id == uid, Farm.farm_id == farm_code).first()
        if not farm:
            farm = Farm(farm_id=farm_code, owner_id=uid,
                        farmer_name=clean_str(data.get("farmer_name"), 255) or "Unknown")
            db.add(farm)
        for f in FARM_FIELDS:
            if data.get(f) not in (None, ""):
                setattr(farm, f, clean_str(data.get(f), 255))
        farm.area = to_float(data.get("area"))
        farm.harvested_area = to_float(data.get("harvested_area"))
        farm.updated_at = datetime.utcnow()
        db.flush()

        season = db.query(Season).filter(Season.farm_id == farm.id, Season.season == season_name).first()
        if not season:
            season = Season(farm_id=farm.id, season=season_name)
            db.add(season)
        season.crop = clean_str(data.get("crop"), 100) or "Cotton"
        season.variety = clean_str(data.get("variety"), 100)
        season.seed_rate = to_float(data.get("seed_rate"))
        season.seed_source = clean_str(data.get("seed_source"), 100)
        season.seed_cotton_yield = to_float(data.get("seed_cotton_yield"))
        for f in JSON_FIELDS:
            setattr(season, f, _json_obj(data.get(f)))
        season.total_co2_equiv = total
        season.intensity_per_kg = results["iSeed"] or to_float(data.get("intensity_per_kg"))
        season.updated_at = datetime.utcnow()
        db.flush()
        db.query(Emission).filter(Emission.season_id == season.id).delete()
        for src, val in breakdown.items():
            db.add(Emission(season_id=season.id, source=src, value=val,
                            percentage=round(val / total * 100, 2) if total else 0))

        calc = Calculation(
            user_id=uid, farm_id=farm_code,
            farmer_name=clean_str(data.get("farmer_name"), 255),
            country=clean_str(data.get("country"), 100),
            province=clean_str(data.get("province"), 100), district=clean_str(data.get("district"), 100),
            tehsil=clean_str(data.get("tehsil"), 100), village=clean_str(data.get("village"), 100),
            area=to_float(data.get("area")), harvested_area=to_float(data.get("harvested_area")),
            soil_texture=clean_str(data.get("soil_texture"), 100),
            soil_organic_matter=clean_str(data.get("soil_organic_matter"), 50),
            soil_drainage=clean_str(data.get("soil_drainage"), 50), soil_ph=clean_str(data.get("soil_ph"), 50),
            climate=clean_str(data.get("climate"), 100), moisture_regime=clean_str(data.get("moisture_regime"), 100),
            season=season_name, crop=clean_str(data.get("crop"), 100) or "Cotton",
            variety=clean_str(data.get("variety"), 100), seed_rate=to_float(data.get("seed_rate")),
            seed_source=clean_str(data.get("seed_source"), 100),
            seed_cotton_yield=to_float(data.get("seed_cotton_yield")),
            total_co2_equiv=total, intensity_per_kg=results["iSeed"] or to_float(data.get("intensity_per_kg")),
            breakdown=breakdown, results=results, calculated_at=datetime.utcnow(),
            **{f: _json_obj(data.get(f)) for f in JSON_FIELDS},
        )
        db.add(calc)
        db.flush()
        return jsonify({"message": "Saved", "id": calc.id, "farm_id": farm_code}), 201


# ── GET /api/history/ ────────────────────────────────────────────────────────
@history_bp.get("/")
@login_required
def list_history():
    limit = min(max(int(to_float(request.args.get("limit"), 100, 1, 500)), 1), 500)
    with session_scope() as db:
        rows = (db.query(Calculation).filter(Calculation.user_id == g.current_user.id)
                .order_by(Calculation.calculated_at.desc()).limit(limit).all())
        return jsonify([_summary(c) for c in rows])


# ── GET /api/history/<id> ────────────────────────────────────────────────────
@history_bp.get("/<int:calc_id>")
@login_required
def get_one(calc_id):
    with session_scope() as db:
        c = db.query(Calculation).filter(Calculation.id == calc_id,
                                         Calculation.user_id == g.current_user.id).first()
        if not c:
            return jsonify({"detail": "Not found"}), 404
        out = _summary(c)
        out.update({
            "country": c.country or "", "tehsil": c.tehsil or "", "village": c.village or "",
            "harvested_area": c.harvested_area or 0, "variety": c.variety or "",
            "breakdown": c.breakdown or {}, "results": c.results or {},
            **{f: getattr(c, f) or {} for f in JSON_FIELDS},
        })
        return jsonify(out)


# ── DELETE /api/history/<id> ─────────────────────────────────────────────────
@history_bp.delete("/<int:calc_id>")
@login_required
def delete_one(calc_id):
    with session_scope() as db:
        n = db.query(Calculation).filter(Calculation.id == calc_id,
                                         Calculation.user_id == g.current_user.id).delete()
    if not n:
        return jsonify({"detail": "Not found"}), 404
    return jsonify({"message": "Deleted"})


# ── Clear all history: 1) email a code  2) confirm with the code ─────────────
@history_bp.post("/request-clear")
@login_required
@rate_limit(3, 900, "clear_req", key_func=lambda: str(g.current_user.id))
def request_clear():
    if not mailer.configured():
        return jsonify({"detail": "Email is not set up on this server, so history cannot be cleared yet."}), 503
    with session_scope() as db:
        user = db.get(User, g.current_user.id)
        code = new_otp(db, user, "clear_history")
        sent = mailer.send(user.email, "CarbonLens: confirm clearing your history",
                           mailer.otp_email(user.full_name or user.username, code,
                                            "permanently delete your saved calculations", OTP_MINUTES))
        if not sent:
            db.query(OtpCode).filter(OtpCode.user_id == user.id, OtpCode.purpose == "clear_history").delete()
            return jsonify({"detail": "We could not send the email right now. Please try again shortly."}), 502
        at = user.email.find("@")
        masked = (user.email[:2] + "•••" + user.email[at:]) if at > 0 else "your email"
    return jsonify({"message": f"We sent a 6-digit code to {masked}."})


@history_bp.post("/verify-clear")
@login_required
@rate_limit(10, 600, "clear_verify", key_func=lambda: str(g.current_user.id))
def verify_clear():
    code = clean_str(json_body().get("otp"), 6)
    if not code.isdigit() or len(code) != 6:
        return jsonify({"detail": "Enter the 6-digit code."}), 422
    with session_scope() as db:
        user = db.get(User, g.current_user.id)
        ok, msg = check_otp(db, user, "clear_history", code, consume=True)
        if not ok:
            return jsonify({"detail": msg}), 400
        db.query(Calculation).filter(Calculation.user_id == user.id).delete()
        for farm in db.query(Farm).filter(Farm.owner_id == user.id).all():
            db.delete(farm)
    return jsonify({"message": "All saved calculations have been deleted."})
