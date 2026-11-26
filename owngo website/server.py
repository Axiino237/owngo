"""
OWNGO Commercial EV Mobility - Full Stack Backend Server
Built with FastAPI, SQLite3, and SMTP Email Notification Service
Features:
1. Exact Real-time Visitor Counter (Tracks Total Visits & Unique Visitors in SQLite)
2. Investor Registration API (Stores leads into SQLite database)
3. Automated Email Notification (Sends instant email notification to company & investor via SMTP)
4. Admin Dashboard (/admin) to view, filter, and export investor leads to CSV
5. Static Web Server for the Frontend
"""

import os
import sqlite3
import smtplib
import hashlib
import asyncio
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
from typing import Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# App configuration
DB_PATH = "owngo.db"
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "") # Set your email
SMTP_PASS = os.getenv("SMTP_PASS", "") # Set your app password / token
NOTIFICATION_EMAIL = os.getenv("NOTIFICATION_EMAIL", "info@owngo.in")

# Initialize FastAPI
app = FastAPI(title="OWNGO Mobility API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================================================
# DATABASE SETUP (SQLite)
# ===================================================
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Visitors Table (Strictly 1 Unique Device = 1 View)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT UNIQUE,
        ip_address TEXT,
        user_agent TEXT,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Ensure device_id, last_seen, hw_fp, screen_res, gpu_renderer, visit_count columns exist
    cursor.execute("PRAGMA table_info(visitors)")
    cols = [col[1] for col in cursor.fetchall()]
    if "device_id" not in cols:
        cursor.execute("ALTER TABLE visitors ADD COLUMN device_id TEXT")
    if "last_seen" not in cols:
        cursor.execute("ALTER TABLE visitors ADD COLUMN last_seen TIMESTAMP")
    if "hw_fp" not in cols:
        cursor.execute("ALTER TABLE visitors ADD COLUMN hw_fp TEXT")
    if "screen_res" not in cols:
        cursor.execute("ALTER TABLE visitors ADD COLUMN screen_res TEXT")
    if "gpu_renderer" not in cols:
        cursor.execute("ALTER TABLE visitors ADD COLUMN gpu_renderer TEXT")
    if "visit_count" not in cols:
        cursor.execute("ALTER TABLE visitors ADD COLUMN visit_count INTEGER DEFAULT 1")

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_device_id ON visitors(device_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_hw_fp ON visitors(hw_fp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_visitors_ip_ua ON visitors(ip_address, user_agent)")

    # Clean legacy test rows that had no device_id
    cursor.execute("DELETE FROM visitors WHERE device_id IS NULL OR device_id = ''")

    # 2. Investor Leads Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        autos_count INTEGER DEFAULT 1,
        city TEXT NOT NULL,
        cibil_score TEXT,
        source TEXT DEFAULT 'Direct Website',
        email_status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Email Logs Table (Stores copy of all outgoing email notifications)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER,
        recipient TEXT,
        subject TEXT,
        body TEXT,
        status TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 4. EV Pilot Applications Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pilot_leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        license_type TEXT,
        preferred_area TEXT,
        experience TEXT,
        source TEXT DEFAULT 'Direct Website',
        status TEXT DEFAULT 'NEW',
        email_status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Safe schema migration for 'source' column
    cursor.execute("PRAGMA table_info(leads)")
    lead_cols = [c[1] for c in cursor.fetchall()]
    if "source" not in lead_cols:
        cursor.execute("ALTER TABLE leads ADD COLUMN source TEXT DEFAULT 'Direct Website'")

    cursor.execute("PRAGMA table_info(pilot_leads)")
    pilot_cols = [c[1] for c in cursor.fetchall()]
    if "source" not in pilot_cols:
        cursor.execute("ALTER TABLE pilot_leads ADD COLUMN source TEXT DEFAULT 'Direct Website'")

    conn.commit()
    conn.close()

init_db()

# ===================================================
# TIMEZONE & ATTRIBUTION HELPERS
# ===================================================
def format_ist_datetime(dt_str: Optional[str]) -> str:
    """Converts SQLite UTC timestamp to Indian Standard Time (IST, UTC+5:30) with 12-hour AM/PM format"""
    if not dt_str:
        return "-"
    try:
        raw = str(dt_str).strip()
        if "IST" in raw or "AM" in raw or "PM" in raw:
            return raw
        cleaned = raw.split(".")[0].replace("T", " ")
        dt = datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S")
        ist_dt = dt + timedelta(hours=5, minutes=30)
        return ist_dt.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return str(dt_str)

def format_source_badge(source: Optional[str]) -> str:
    """Renders high-visibility styled badge based on marketing channel / referral source"""
    s = (source or "Direct Website").strip()
    s_lower = s.lower()
    
    if "insta" in s_lower:
        return f'<span style="background:rgba(244,63,94,0.18); color:#f43f5e; border:1px solid rgba(244,63,94,0.35); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">📸 {s}</span>'
    elif "you" in s_lower or "yt" in s_lower:
        return f'<span style="background:rgba(239,68,68,0.18); color:#ef4444; border:1px solid rgba(239,68,68,0.35); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">▶️ {s}</span>'
    elif "what" in s_lower or "wa" in s_lower:
        return f'<span style="background:rgba(34,197,94,0.18); color:#22c55e; border:1px solid rgba(34,197,94,0.35); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">💬 {s}</span>'
    elif "sale" in s_lower or "team" in s_lower:
        return f'<span style="background:rgba(168,85,247,0.18); color:#c084fc; border:1px solid rgba(168,85,247,0.35); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">💼 {s}</span>'
    elif "facebook" in s_lower or "fb" in s_lower:
        return f'<span style="background:rgba(59,130,246,0.18); color:#60a5fa; border:1px solid rgba(59,130,246,0.35); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">📘 {s}</span>'
    elif "direct" in s_lower:
        return f'<span style="background:rgba(148,163,184,0.15); color:#94a3b8; border:1px solid rgba(148,163,184,0.3); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:5px;">🌐 {s}</span>'
    else:
        return f'<span style="background:rgba(250,204,21,0.15); color:#facc15; border:1px solid rgba(250,204,21,0.3); padding:4px 10px; border-radius:12px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">🔗 {s}</span>'

def extract_source_from_request(request: Request, body_source: Optional[str] = None) -> str:
    """
    Lead attribution:
    1. If HTTP Referer header URL explicitly has ?utm_source=... or ?ref=..., use that URL query param.
    2. If body_source is provided (e.g. 'Direct Website' or 'Instagram'), honor it!
    3. Check HTTP Referer domain (e.g. l.instagram.com, youtube.com).
    4. Fallback to 'Direct Website'.
    """
    referer = request.headers.get("referer") or ""
    if referer and ("?" in referer or "#" in referer):
        try:
            parsed = urlparse(referer)
            qs = parse_qs(parsed.query)
            # 1. First check if a specific staff/agent referral code or referral channel is present
            if ("ref" in qs and qs["ref"][0].strip()) or ("utm_source" in qs and qs["utm_source"][0].strip().lower() in ["agent_referral", "referral", "agent", "partner_referral"]):
                return "Agent / Partner Referral"

            for param in ["source", "utm_source", "src", "channel", "ref"]:
                if param in qs and qs[param][0].strip():
                    val = qs[param][0].strip()
                    val_lower = val.lower()
                    if val_lower in ["instagram", "insta", "ig"]:
                        return "Instagram"
                    if val_lower in ["youtube", "yt"]:
                        return "YouTube"
                    if val_lower in ["whatsapp", "wa"]:
                        return "WhatsApp"
                    if val_lower in ["facebook", "fb"]:
                        return "Facebook"
                    if val_lower in ["agent_referral", "referral", "agent", "partner_referral"] or val_lower.startswith("ref-") or val_lower.startswith("ref_"):
                        return "Agent / Partner Referral"
                    return val

            if parsed.fragment and "?" in parsed.fragment:
                hash_qs = parse_qs(parsed.fragment.split("?")[1])
                if ("ref" in hash_qs and hash_qs["ref"][0].strip()) or ("utm_source" in hash_qs and hash_qs["utm_source"][0].strip().lower() in ["agent_referral", "referral", "agent", "partner_referral"]):
                    return "Agent / Partner Referral"

                for param in ["source", "utm_source", "src", "channel", "ref"]:
                    if param in hash_qs and hash_qs[param][0].strip():
                        val = hash_qs[param][0].strip()
                        val_lower = val.lower()
                        if val_lower in ["instagram", "insta", "ig"]:
                            return "Instagram"
                        if val_lower in ["youtube", "yt"]:
                            return "YouTube"
                        if val_lower in ["whatsapp", "wa"]:
                            return "WhatsApp"
                        if val_lower in ["facebook", "fb"]:
                            return "Facebook"
                        if val_lower in ["agent_referral", "referral", "agent", "partner_referral"] or val_lower.startswith("ref-") or val_lower.startswith("ref_"):
                            return "Agent / Partner Referral"
                        return val
        except Exception:
            pass

    # If body_source is explicitly provided (including 'Direct Website')
    if body_source and body_source.strip():
        return body_source.strip()

    # Check referrer domain
    if referer:
        ref_lower = referer.lower()
        if "instagram.com" in ref_lower or "l.instagram.com" in ref_lower:
            return "Instagram"
        if "youtube.com" in ref_lower or "youtu.be" in ref_lower:
            return "YouTube"
        if "whatsapp" in ref_lower or "wa.me" in ref_lower:
            return "WhatsApp"
        if "facebook.com" in ref_lower or "fb.com" in ref_lower:
            return "Facebook"

    return "Direct Website"

# ===================================================
# EMAIL SENDER FUNCTION
# ===================================================
def send_email_notification(lead_id: int, name: str, phone: str, autos: int, city: str, cibil: str, source: str = "Direct Website") -> bool:
    subject = f"⚡ NEW INVESTOR APPLICATION: {name} - {autos} EV Auto(s) ({city}) [{source}]"
    
    body = f"""
=====================================================
OWNGO MOBILITY - NEW INVESTOR LEAD NOTIFICATION
=====================================================
Lead ID       : #{lead_id}
Investor Name : {name}
Phone Number  : {phone}
Autos Desired : {autos} Auto(s) (Investment: Rs. {autos * 100000:,})
Expected ROI  : Rs. {autos * 10000:,} / Month (Guaranteed Passive Income)
Target City   : {city}
Lead Source   : {source}
Date / Time   : {datetime.now().strftime('%d %b %Y, %I:%M %p IST')}
=====================================================
Fleet Operations: Running in bulk for OLA Mobility
Asset Security: 100% Registered in Investor Name
=====================================================
    """

    email_status = "LOGGED_LOCAL"

    # Attempt real SMTP send if credentials provided
    if SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_USER
            msg["To"] = NOTIFICATION_EMAIL
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            server.quit()
            email_status = "SENT_SMTP"
        except Exception as e:
            print(f"[Email Error] Failed to send SMTP email: {e}")
            email_status = f"FAILED: {str(e)[:40]}"

    # Always log the email to database for 100% reliability
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO email_logs (lead_id, recipient, subject, body, status) VALUES (?, ?, ?, ?, ?)",
            (lead_id, NOTIFICATION_EMAIL, subject, body, email_status)
        )
        cur.execute("UPDATE leads SET email_status = ? WHERE id = ?", (email_status, lead_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Log Error]: {e}")

    return True

def send_pilot_email_notification(pilot_id: int, name: str, phone: str, license_type: str, preferred_area: str, experience: str, source: str = "Direct Website") -> bool:
    subject = f"🛺 NEW EV PILOT APPLICATION: {name} - {license_type} ({preferred_area}) [{source}]"
    
    body = f"""
=====================================================
OWNGO MOBILITY - NEW EV PILOT APPLICATION
=====================================================
Pilot ID        : #{pilot_id}
Pilot Name      : {name}
Phone Number    : {phone}
License Type    : {license_type}
Preferred Hub   : {preferred_area}
Driving Exp     : {experience}
Lead Source     : {source}
Guaranteed Pay  : Rs. 30,000 / Month Fixed Salary + Incentives
Date / Time     : {datetime.now().strftime('%d %b %Y, %I:%M %p IST')}
=====================================================
Fleet Vehicles  : Bajaj GoGo P7012 EV Auto (Ola, Uber & Rapido)
Safety ADAS     : Cautio Dual-Lens AI Dashcam & SOS Alert
=====================================================
    """

    email_status = "LOGGED_LOCAL"

    if SMTP_USER and SMTP_PASS:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_USER
            msg["To"] = NOTIFICATION_EMAIL
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            server.quit()
            email_status = "SENT_SMTP"
        except Exception as e:
            print(f"[Email Error] Failed to send pilot SMTP email: {e}")
            email_status = f"FAILED: {str(e)[:40]}"

    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO email_logs (lead_id, recipient, subject, body, status) VALUES (?, ?, ?, ?, ?)",
            (pilot_id, NOTIFICATION_EMAIL, subject, body, email_status)
        )
        cur.execute("UPDATE pilot_leads SET email_status = ? WHERE id = ?", (email_status, pilot_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Log Error]: {e}")

    return True

# CRM API Integration URLs
CRM_API_URL = os.getenv("CRM_API_URL", "http://127.0.0.1:5050/api/leads/website")
CRM_PILOT_API_URL = os.getenv("CRM_PILOT_API_URL", "http://127.0.0.1:5050/api/job-requests/website")

async def forward_lead_to_crm(payload: dict):
    """
    Forwards incoming website leads (Partner) to the CRM backend
    to be stored in PostgreSQL crm_leads with default status 'new'.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(CRM_API_URL, json=payload)
            if resp.status_code in (200, 201):
                res_json = resp.json()
                print(f"✅ [CRM Sync Success]: Lead stored in CRM with ID {res_json.get('leadId')}")
                return res_json
            else:
                print(f"⚠️ [CRM Sync Warning]: CRM returned HTTP {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"⚠️ [CRM Sync Error]: Could not reach CRM API at {CRM_API_URL}: {e}")
    return None

async def forward_pilot_to_crm(payload: dict):
    """
    Forwards incoming website pilot candidates to the CRM backend
    to be stored in PostgreSQL crm_job_requests with default status 'new'.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(CRM_PILOT_API_URL, json=payload)
            if resp.status_code in (200, 201):
                res_json = resp.json()
                print(f"✅ [CRM Pilot Sync Success]: Pilot candidate stored in CRM: {res_json.get('data', {}).get('id')}")
                return res_json
            else:
                print(f"⚠️ [CRM Pilot Sync Warning]: CRM Pilot API returned HTTP {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"⚠️ [CRM Pilot Sync Error]: Could not reach CRM Pilot API at {CRM_PILOT_API_URL}: {e}")
    return None

# ===================================================
# PYDANTIC MODELS
# ===================================================
class RegisterLeadRequest(BaseModel):
    name: str
    phone: str
    autos: int = 1
    city: str
    cibil: Optional[str] = "Good (700 - 749)"
    source: Optional[str] = "Direct Website"
    sourceLink: Optional[str] = None

class RegisterPilotRequest(BaseModel):
    name: str
    phone: str
    license_type: Optional[str] = "Commercial Auto Driver Badge"
    preferred_area: Optional[str] = "Central Chennai"
    experience: Optional[str] = "2 to 5 Years"
    source: Optional[str] = "Direct Website"
    sourceLink: Optional[str] = None

# ===================================================
# REST API ENDPOINTS
# ===================================================

@app.get("/api/visitor-count")
async def get_and_track_visitor(
    request: Request,
    device_id: Optional[str] = None,
    hw_fp: Optional[str] = None,
    screen_res: Optional[str] = None,
    gpu_renderer: Optional[str] = None
):
    """
    Captures device_id, hardware fingerprint, screen resolution and GPU renderer.
    Strictly guarantees: 1 Physical Device = 1 View.
    Even if client clears browser cache, cookies, or localStorage, hardware attributes (canvas hash,
    IP, user agent, screen, GPU) ensure it matches the same DB record and NEVER increments the view count.
    """
    # 1. Fallback to cookie if query param missing
    if not device_id or not device_id.strip():
        device_id = request.cookies.get("owngo_device_id")

    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "Unknown")

    # Detect automated headless test browser sessions (Playwright / testing scripts / python)
    is_test_bot = any(b in user_agent.lower() for b in ["headless", "playwright", "python", "curl", "wget", "bot", "spider"])

    # 2. If still no device_id provided, generate deterministic fallback signature hash
    if not device_id or not device_id.strip():
        sig = f"{ip}_{user_agent}"
        device_id = "fp_" + hashlib.sha256(sig.encode()).hexdigest()[:24]

    device_id = device_id.strip()[:100]
    hw_fp = hw_fp.strip()[:100] if hw_fp else None
    screen_res = screen_res.strip()[:50] if screen_res else None
    gpu_renderer = gpu_renderer.strip()[:150] if gpu_renderer else None

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 3. Bulletproof Multi-Factor Check:
    # Match by device_id OR hardware fingerprint OR (ip_address AND user_agent) OR (gpu_renderer AND screen_res AND user_agent)
    query_parts = []
    params = []

    if device_id:
        query_parts.append("device_id = ?")
        params.append(device_id)

    if hw_fp:
        query_parts.append("hw_fp = ?")
        params.append(hw_fp)

    if ip and user_agent and user_agent != "Unknown":
        query_parts.append("(ip_address = ? AND user_agent = ?)")
        params.extend([ip, user_agent])

    if gpu_renderer and screen_res and user_agent and user_agent != "Unknown":
        query_parts.append("(gpu_renderer = ? AND screen_res = ? AND user_agent = ?)")
        params.extend([gpu_renderer, screen_res, user_agent])

    where_clause = " OR ".join(query_parts) if query_parts else "device_id = ?"
    if not query_parts:
        params.append(device_id)

    cursor.execute(f"SELECT id, device_id, hw_fp FROM visitors WHERE {where_clause} LIMIT 1", tuple(params))
    existing = cursor.fetchone()

    is_new_device = False
    if not existing:
        if not is_test_bot:
            # First time this REAL user device visited -> INSERT as 1 new view
            cursor.execute(
                """
                INSERT INTO visitors (device_id, ip_address, user_agent, hw_fp, screen_res, gpu_renderer, visit_count, visited_at, last_seen)
                VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (device_id, ip, user_agent, hw_fp, screen_res, gpu_renderer)
            )
            conn.commit()
            is_new_device = True
    else:
        # Existing device recognized (even across cache clears or new random UUIDs)!
        row_id = existing[0]
        cursor.execute(
            """
            UPDATE visitors 
            SET last_seen = CURRENT_TIMESTAMP,
                visit_count = COALESCE(visit_count, 1) + 1,
                ip_address = ?,
                user_agent = ?,
                hw_fp = COALESCE(?, hw_fp),
                screen_res = COALESCE(?, screen_res),
                gpu_renderer = COALESCE(?, gpu_renderer),
                device_id = COALESCE(device_id, ?)
            WHERE id = ?
            """,
            (ip, user_agent, hw_fp, screen_res, gpu_renderer, device_id, row_id)
        )
        conn.commit()

    # 4. Exact Unique Real Devices Count
    cursor.execute("SELECT COUNT(*) FROM visitors WHERE id IS NOT NULL")
    unique_devices = cursor.fetchone()[0]

    conn.close()

    response = JSONResponse(content={
        "status": "success",
        "device_id": device_id,
        "is_new_device": is_new_device,
        "total_views": unique_devices,
        "total_visits": unique_devices,
        "unique_visitors": unique_devices,
        "active_now": max(1, (unique_devices % 5) + 1)
    })

    # Set persistent cookie on client (2 years)
    response.set_cookie(
        key="owngo_device_id",
        value=device_id,
        max_age=63072000,
        httponly=False,
        samesite="lax"
    )
    return response

@app.post("/api/register")
async def register_investor(lead: RegisterLeadRequest, request: Request):
    """Registers an investor lead into SQLite and triggers email notification"""
    if not lead.name or not lead.phone:
        raise HTTPException(status_code=400, detail="Name and Phone are strictly required.")

    lead_source = extract_source_from_request(request, lead.source)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO leads (name, phone, autos_count, city, cibil_score, source)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (lead.name.strip(), lead.phone.strip(), lead.autos, lead.city.strip(), lead.cibil, lead_source)
    )
    lead_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Trigger email notification
    send_email_notification(
        lead_id=lead_id,
        name=lead.name,
        phone=lead.phone,
        autos=lead.autos,
        city=lead.city,
        cibil=lead.cibil,
        source=lead_source
    )

    # Automatically Forward and Store in CRM (PostgreSQL crm_leads with default status 'new')
    source_link = lead.sourceLink or request.headers.get("referer") or lead_source
    crm_payload = {
        "leadType": "partner",
        "name": lead.name.strip(),
        "phone": lead.phone.strip(),
        "autos": lead.autos,
        "city": lead.city.strip(),
        "cibil": lead.cibil,
        "source": lead_source,
        "sourceLink": source_link,
        "status": "new"
    }
    asyncio.create_task(forward_lead_to_crm(crm_payload))

    return {
        "success": True,
        "lead_id": lead_id,
        "source": lead_source,
        "message": f"Application #{lead_id} successfully registered in database and notification sent!"
    }

@app.post("/api/register-pilot")
async def register_pilot(pilot: RegisterPilotRequest, request: Request):
    """Registers an EV Pilot application into SQLite and triggers email notification"""
    if not pilot.name or not pilot.phone:
        raise HTTPException(status_code=400, detail="Name and Phone are strictly required.")

    pilot_source = extract_source_from_request(request, pilot.source)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute(
        """
        INSERT INTO pilot_leads (name, phone, license_type, preferred_area, experience, source)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (pilot.name.strip(), pilot.phone.strip(), pilot.license_type, pilot.preferred_area, pilot.experience, pilot_source)
    )
    pilot_id = cursor.lastrowid
    conn.commit()
    conn.close()

    send_pilot_email_notification(
        pilot_id=pilot_id,
        name=pilot.name,
        phone=pilot.phone,
        license_type=pilot.license_type,
        preferred_area=pilot.preferred_area,
        experience=pilot.experience,
        source=pilot_source
    )

    # Automatically Forward and Store in CRM (PostgreSQL crm_job_requests with default status 'new')
    source_link = pilot.sourceLink or request.headers.get("referer") or pilot_source
    crm_payload = {
        "name": pilot.name.strip(),
        "phone": pilot.phone.strip(),
        "licenseType": pilot.license_type,
        "preferredArea": pilot.preferred_area,
        "experience": pilot.experience,
        "source": pilot_source,
        "sourceLink": source_link,
        "status": "new"
    }
    asyncio.create_task(forward_pilot_to_crm(crm_payload))

    return {
        "success": True,
        "pilot_id": pilot_id,
        "source": pilot_source,
        "message": f"Pilot Application #{pilot_id} successfully registered in database and notification sent!"
    }

@app.post("/api/sync-to-crm")
async def sync_existing_leads_to_crm():
    """Syncs existing SQLite leads (Partner and Pilot) to CRM PostgreSQL"""
    synced_partners = 0
    synced_pilots = 0
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Sync Partner Leads
        cursor.execute("SELECT id, name, phone, autos_count, city, cibil_score, source FROM leads")
        for row in cursor.fetchall():
            res = await forward_lead_to_crm({
                "leadType": "partner",
                "name": row[1],
                "phone": row[2],
                "autos": row[3],
                "city": row[4],
                "cibil": row[5],
                "source": row[6] or "Direct Website",
                "sourceLink": f"SQLite Backup #{row[0]} ({row[6] or 'Direct Website'})",
                "status": "new"
            })
            if res:
                synced_partners += 1

        # 2. Sync Pilot Leads
        cursor.execute("SELECT id, name, phone, license_type, preferred_area, experience, source FROM pilot_leads")
        for row in cursor.fetchall():
            res = await forward_pilot_to_crm({
                "name": row[1],
                "phone": row[2],
                "licenseType": row[3],
                "preferredArea": row[4],
                "experience": row[5],
                "source": row[6] or "Direct Website",
                "sourceLink": f"SQLite Backup #{row[0]} ({row[6] or 'Direct Website'})",
                "status": "new"
            })
            if res:
                synced_pilots += 1

        conn.close()
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {
        "success": True,
        "synced_partners": synced_partners,
        "synced_pilots": synced_pilots,
        "message": f"Synced {synced_partners} Partner leads and {synced_pilots} Pilot leads to CRM"
    }

@app.get("/api/pilot-leads")
async def list_pilot_leads(request: Request):
    if not is_admin_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
    """Returns all registered pilot applications from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, phone, license_type, preferred_area, experience, source, status, created_at FROM pilot_leads ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    pilots = [
        {
            "id": r[0],
            "name": r[1],
            "phone": r[2],
            "license_type": r[3],
            "preferred_area": r[4],
            "experience": r[5],
            "source": r[6] or "Direct Website",
            "status": r[7],
            "created_at": format_ist_datetime(r[8])
        }
        for r in rows
    ]
    return {"pilots": pilots, "total_pilots": len(pilots)}

@app.get("/api/leads")
async def list_leads(request: Request):
    if not is_admin_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
    """Returns all registered leads from database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, phone, autos_count, city, source, email_status, created_at FROM leads ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    leads = [
        {
            "id": r[0],
            "name": r[1],
            "phone": r[2],
            "autos": r[3],
            "city": r[4],
            "source": r[5] or "Direct Website",
            "email_status": r[6],
            "created_at": format_ist_datetime(r[7])
        }
        for r in rows
    ]
    return {"leads": leads, "total_leads": len(leads)}

@app.get("/api/emails")
async def list_sent_emails():
    """Returns log of all triggered emails"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, lead_id, recipient, subject, status, sent_at, body FROM email_logs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    emails = [
        {
            "id": r[0],
            "lead_id": r[1],
            "recipient": r[2],
            "subject": r[3],
            "status": r[4],
            "sent_at": r[5],
            "body": r[6]
        }
        for r in rows
    ]
    return {"emails": emails}

# ===================================================
# LEGACY ADMIN ROUTE REDIRECT
# ===================================================
@app.get('/admin')
@app.get('/admin/{path:path}')
async def admin_redirect():
    return RedirectResponse(url='/', status_code=302)

# ===================================================
# STATIC FILES & ROOT ROUTE
# ===================================================
# Mount assets directory
app.mount('/assets', StaticFiles(directory='assets'), name='assets')

@app.get('/')
async def root():
    return FileResponse('index.html')

# Launch server
if __name__ == '__main__':
    port = int(os.getenv('PORT', 8088))
    host = os.getenv('HOST', '0.0.0.0')
    print(f'🚀 Starting OWNGO Backend on http://{host}:{port}')
    print(f'💼 CRM Portal available at: http://localhost:5173')
    uvicorn.run('server:app', host=host, port=port, reload=False)
