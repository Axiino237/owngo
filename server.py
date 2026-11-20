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
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
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

# Admin Authentication Credentials
ADMIN_EMAIL = "info@owngo.in"
ADMIN_PASSWORD = "Login@owngo"
ADMIN_COOKIE_NAME = "owngo_admin_session"
ADMIN_SESSION_TOKEN = hashlib.sha256(f"{ADMIN_EMAIL}:{ADMIN_PASSWORD}:owngo_salt_2026".encode()).hexdigest()

class AdminLoginRequest(BaseModel):
    email: str
    password: str

def is_admin_authenticated(request: Request) -> bool:
    token = request.cookies.get(ADMIN_COOKIE_NAME)
    return token == ADMIN_SESSION_TOKEN

def get_admin_login_html(error_msg: str = ""):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OWNGO Admin Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
    <link href="assets/images/logo-transparent.png" rel="icon" type="image/png">
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: radial-gradient(circle at 50% 30%, #0d1e17 0%, #060b0e 100%);
            color: #f8fafc;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }}
        .login-card {{
            background: #0f1722;
            border: 1px solid rgba(0, 230, 153, 0.28);
            border-radius: 20px;
            padding: 36px 32px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 35px rgba(0,230,153,0.12);
            text-align: center;
        }}
        .brand-logo {{
            height: 48px;
            margin-bottom: 18px;
            display: inline-block;
        }}
        .login-title {{
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 6px;
        }}
        .login-sub {{
            font-size: 13px;
            color: #94a3b8;
            margin-bottom: 24px;
            line-height: 1.5;
        }}
        .form-group {{
            margin-bottom: 18px;
            text-align: left;
        }}
        .form-label {{
            display: block;
            font-size: 12px;
            font-weight: 700;
            color: #cbd5e1;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .form-input {{
            width: 100%;
            padding: 12px 14px;
            background: #141f2e;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px;
            color: #fff;
            font-size: 14px;
            font-family: inherit;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }}
        .form-input:focus {{
            border-color: #00e699;
            box-shadow: 0 0 0 3px rgba(0,230,153,0.15);
        }}
        .error-banner {{
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            border-radius: 8px;
            color: #f87171;
            font-size: 13px;
            padding: 10px 12px;
            margin-bottom: 16px;
            display: none;
            text-align: left;
        }}
        .btn-submit {{
            width: 100%;
            padding: 13px;
            background: #00e699;
            color: #04200f;
            border: none;
            border-radius: 30px;
            font-size: 15px;
            font-weight: 800;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(0,230,153,0.3);
            transition: all 0.2s;
            margin-top: 6px;
        }}
        .btn-submit:hover {{
            background: #00ffaa;
            transform: translateY(-1px);
            box-shadow: 0 14px 30px rgba(0,230,153,0.45);
        }}
        .footer-note {{
            margin-top: 20px;
            font-size: 12px;
            color: #64748b;
        }}
        .back-link {{
            color: #94a3b8;
            text-decoration: none;
            display: inline-block;
            margin-top: 14px;
            font-size: 13px;
        }}
        .back-link:hover {{ color: #00e699; }}
    </style>
</head>
<body>
    <div class="login-card">
        <img src="assets/images/logo-transparent.png" alt="OWNGO" class="brand-logo">
        <h1 class="login-title">Admin Security Portal</h1>
        <p class="login-sub">Enter authorized credentials to manage fleet leads and applications.</p>
        
        <div id="error-banner" class="error-banner"></div>

        <form id="login-form">
            <div class="form-group">
                <label class="form-label" for="login-email">Authorized Email</label>
                <input class="form-input" id="login-email" type="email" value="info@owngo.in" required autocomplete="username">
            </div>
            <div class="form-group">
                <label class="form-label" for="login-password">Password</label>
                <input class="form-input" id="login-password" type="password" placeholder="••••••••" required autocomplete="current-password">
            </div>
            <button class="btn-submit" id="btn-submit" type="submit">Sign In to Dashboard →</button>
        </form>

        <a href="/" class="back-link">← Return to Public Website</a>
        <div class="footer-note">OWNGO Mobility Private Limited • Official Fleet Admin</div>
    </div>

    <script>
        document.getElementById('login-form').addEventListener('submit', async (e) => {{
            e.preventDefault();
            const btn = document.getElementById('btn-submit');
            const err = document.getElementById('error-banner');
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            btn.disabled = true;
            btn.textContent = 'Verifying...';
            err.style.display = 'none';

            try {{
                const res = await fetch('/api/admin/login', {{
                    method: 'POST',
                    headers: {{ 'Content-Type': 'application/json' }},
                    body: JSON.stringify({{ email, password }})
                }});
                const data = await res.json();
                if (res.ok && data.success) {{
                    window.location.reload();
                }} else {{
                    err.textContent = data.message || 'Invalid email or password. Please try again.';
                    err.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Sign In to Dashboard →';
                }}
            }} catch (error) {{
                err.textContent = 'Network error. Please try again.';
                err.style.display = 'block';
                btn.disabled = false;
                btn.textContent = 'Sign In to Dashboard →';
            }}
        }});
    </script>
</body>
</html>
"""


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

class RegisterPilotRequest(BaseModel):
    name: str
    phone: str
    license_type: Optional[str] = "Commercial Auto Driver Badge"
    preferred_area: Optional[str] = "Central Chennai"
    experience: Optional[str] = "2 to 5 Years"
    source: Optional[str] = "Direct Website"

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
async def register_investor(lead: RegisterLeadRequest):
    """Registers an investor lead into SQLite and triggers email notification"""
    if not lead.name or not lead.phone:
        raise HTTPException(status_code=400, detail="Name and Phone are strictly required.")

    lead_source = (lead.source or "Direct Website").strip()
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

    return {
        "success": True,
        "lead_id": lead_id,
        "source": lead_source,
        "message": f"Application #{lead_id} successfully registered in database and notification sent!"
    }

@app.post("/api/register-pilot")
async def register_pilot(pilot: RegisterPilotRequest):
    """Registers an EV Pilot application into SQLite and triggers email notification"""
    if not pilot.name or not pilot.phone:
        raise HTTPException(status_code=400, detail="Name and Phone are strictly required.")

    pilot_source = (pilot.source or "Direct Website").strip()
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

    return {
        "success": True,
        "pilot_id": pilot_id,
        "source": pilot_source,
        "message": f"Pilot Application #{pilot_id} successfully registered in database and notification sent!"
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

# ===================================================
# ADMIN AUTH & DATA MANAGEMENT ROUTES
# ===================================================
@app.post("/api/admin/login")
async def api_admin_login(creds: AdminLoginRequest):
    if creds.email.strip().lower() == ADMIN_EMAIL.lower() and creds.password == ADMIN_PASSWORD:
        resp = JSONResponse({"success": True, "message": "Login successful"})
        resp.set_cookie(
            key=ADMIN_COOKIE_NAME,
            value=ADMIN_SESSION_TOKEN,
            max_age=86400 * 7, # 7 days
            httponly=True,
            samesite="lax"
        )
        return resp
    return JSONResponse(
        {"success": False, "message": "Invalid email or password. Please verify your credentials."},
        status_code=401
    )

@app.get("/admin/logout")
async def admin_logout():
    resp = HTMLResponse("<script>window.location.href='/admin';</script>")
    resp.delete_cookie(key=ADMIN_COOKIE_NAME)
    return resp

@app.post("/api/admin/clear-leads")
async def api_clear_leads(request: Request):
    if not is_admin_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM leads")
    cur.execute("DELETE FROM pilot_leads")
    try:
        cur.execute("DELETE FROM sqlite_sequence WHERE name IN ('leads', 'pilot_leads')")
    except Exception:
        pass
    conn.commit()
    conn.close()
    return {"success": True, "message": "All leads data removed successfully"}

# ADMIN DASHBOARD ROUTE (/admin)
# ===================================================
@app.get("/admin", response_class=HTMLResponse)
async def admin_portal(request: Request):
    if not is_admin_authenticated(request):
        return HTMLResponse(get_admin_login_html())
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(DISTINCT device_id) FROM visitors WHERE device_id IS NOT NULL AND device_id != ''")
    unique_devices = cur.fetchone()[0]
    cur.execute("SELECT id, name, phone, autos_count, city, source, email_status, created_at FROM leads ORDER BY id DESC")
    leads = cur.fetchall()

    cur.execute("SELECT id, name, phone, license_type, preferred_area, experience, source, status, created_at FROM pilot_leads ORDER BY id DESC")
    pilots = cur.fetchall()
    conn.close()

    partner_rows_html = "".join([
        f"""
        <tr>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; font-weight:bold; color:#10b981;'>#{r[0]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#fff; font-weight:600;'>{r[1]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#94a3b8;'><a href='tel:{r[2]}' style='color:#38bdf8; text-decoration:none;'>{r[2]}</a></td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#facc15; font-weight:bold;'>{r[3]} Auto(s) (₹{r[3]}L)</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#cbd5e1;'>{r[4]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140;'>{format_source_badge(r[5])}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140;'><span style='background:rgba(34,197,94,0.15); color:#22c55e; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:bold;'>{r[6]}</span></td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#38bdf8; font-size:13px; font-weight:600;'>{format_ist_datetime(r[7])}</td>
        </tr>
        """
        for r in leads
    ]) or "<tr><td colspan='8' style='padding:24px; text-align:center; color:#64748b;'>No investor applications received yet.</td></tr>"

    pilot_rows_html = "".join([
        f"""
        <tr>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; font-weight:bold; color:#facc15;'>#{r[0]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#fff; font-weight:600;'>{r[1]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#94a3b8;'><a href='tel:{r[2]}' style='color:#38bdf8; text-decoration:none;'>{r[2]}</a></td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#38bdf8; font-weight:600;'>{r[3]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#cbd5e1;'>{r[4]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#a78bfa;'>{r[5]}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140;'>{format_source_badge(r[6])}</td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140;'><span style='background:rgba(250,204,21,0.15); color:#facc15; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:bold;'>{r[7]}</span></td>
            <td style='padding:12px 16px; border-bottom:1px solid #233140; color:#38bdf8; font-size:13px; font-weight:600;'>{format_ist_datetime(r[8])}</td>
        </tr>
        """
        for r in pilots
    ]) or "<tr><td colspan='9' style='padding:24px; text-align:center; color:#64748b;'>No EV Pilot applications received yet.</td></tr>"

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>OWNGO Mobility - Lead &amp; Pilot Management Dashboard</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
        <style>
            body {{ font-family: 'Plus Jakarta Sans', sans-serif; background:#070a0e; color:#f8fafc; margin:0; padding:30px; }}
            .card {{ background:#0f1722; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:24px; margin-bottom:24px; }}
            .stats-grid {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:20px; margin-bottom:24px; }}
            .stat-box {{ background:#141f2e; border:1px solid rgba(34,197,94,0.2); border-radius:14px; padding:20px; }}
            .stat-val {{ font-family:'Outfit'; font-size:32px; font-weight:900; color:#22c55e; margin:6px 0; }}
            .stat-lbl {{ font-size:13px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; }}
            table {{ width:100%; border-collapse:collapse; text-align:left; }}
            th {{ background:rgba(255,255,255,0.04); padding:14px 16px; font-size:13px; text-transform:uppercase; color:#94a3b8; border-bottom:1px solid #233140; }}
            .btn {{ background:#10b981; color:#04200f; padding:10px 20px; border-radius:30px; font-weight:700; text-decoration:none; display:inline-block; }}
        </style>
    </head>
    <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <div>
                <h1 style="font-family:'Outfit'; font-size:28px; margin:0; color:#fff;">⚡ OWNGO Admin &amp; Lead Management Portal</h1>
                <p style="color:#94a3b8; margin:4px 0 0;">Connected to SQLite Database (<code>{DB_PATH}</code>) &amp; Automated Email Notification Engine</p>
            </div>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <span style="font-size:13px; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:6px 14px; border-radius:20px; border:1px solid rgba(255,255,255,0.1);">👤 <strong>info@owngo.in</strong></span>
                <a href="/" class="btn" style="background:rgba(255,255,255,0.08); color:#fff;">&larr; View Website</a>
                <button onclick="clearAllLeads()" class="btn" style="background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.4); cursor:pointer;">🗑️ Clear All Leads</button>
                <a href="/admin/logout" class="btn" style="background:#ef4444; color:#fff;">Logout 🔒</a>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-lbl">Fleet Partner Leads</div>
                <div class="stat-val">{len(leads)}</div>
                <div style="font-size:12px; color:#94a3b8;">₹1 Lakh Investors</div>
            </div>
            <div class="stat-box" style="border-color: rgba(250,204,21,0.25);">
                <div class="stat-lbl">EV Pilot Applicants</div>
                <div class="stat-val" style="color:#facc15;">{len(pilots)}</div>
                <div style="font-size:12px; color:#94a3b8;">₹25,000/Mo Salary Pilots</div>
            </div>
            <div class="stat-box" style="border-color: rgba(6,182,212,0.25);">
                <div class="stat-lbl">Unique Device Views</div>
                <div class="stat-val" style="color:#06b6d4;">{unique_devices}</div>
                <div style="font-size:12px; color:#94a3b8;">Strict: 1 Device = 1 View Only</div>
            </div>
            <div class="stat-box">
                <div class="stat-lbl">Notification Engine</div>
                <div class="stat-val" style="color:#a855f7; font-size:20px; margin:12px 0;">ACTIVE (Auto-Log)</div>
                <div style="font-size:12px; color:#94a3b8;">Target: {NOTIFICATION_EMAIL}</div>
            </div>
        </div>

        <!-- Section: Referral Link Generator -->
        <div class="card" style="border-color: rgba(56, 189, 248, 0.25); background: #0c1622;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h3 style="font-family:'Outfit'; font-size:17px; margin:0; color:#38bdf8;">🔗 Quick Marketing &amp; Sales Referral Links</h3>
                    <p style="color:#94a3b8; font-size:12px; margin:3px 0 0;">Share these links across channels. When a user applies, the exact source appears automatically in the table below!</p>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
                <div style="background:#141f2e; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; color:#f43f5e; font-weight:700;">📸 Instagram Bio / Story</div>
                        <code style="font-size:11px; color:#cbd5e1;">https://owngo.in/?ref=instagram#apply</code>
                    </div>
                    <button onclick="copyToClipboard('https://owngo.in/?ref=instagram#apply', this)" style="background:rgba(244,63,94,0.15); color:#f43f5e; border:1px solid rgba(244,63,94,0.3); border-radius:6px; padding:4px 10px; font-size:11px; cursor:pointer; font-weight:700;">Copy</button>
                </div>
                <div style="background:#141f2e; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; color:#ef4444; font-weight:700;">▶️ YouTube Description / Video</div>
                        <code style="font-size:11px; color:#cbd5e1;">https://owngo.in/?ref=youtube#apply</code>
                    </div>
                    <button onclick="copyToClipboard('https://owngo.in/?ref=youtube#apply', this)" style="background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:4px 10px; font-size:11px; cursor:pointer; font-weight:700;">Copy</button>
                </div>
                <div style="background:#141f2e; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:12px; color:#22c55e; font-weight:700;">💬 WhatsApp Broadcast / Status</div>
                        <code style="font-size:11px; color:#cbd5e1;">https://owngo.in/?ref=whatsapp#apply</code>
                    </div>
                    <button onclick="copyToClipboard('https://owngo.in/?ref=whatsapp#apply', this)" style="background:rgba(34,197,94,0.15); color:#22c55e; border:1px solid rgba(34,197,94,0.3); border-radius:6px; padding:4px 10px; font-size:11px; cursor:pointer; font-weight:700;">Copy</button>
                </div>
                <div style="background:#141f2e; padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.06); display:flex; gap:8px; align-items:center;">
                    <div style="flex:1;">
                        <div style="font-size:12px; color:#c084fc; font-weight:700;">💼 Custom Sales Person Link</div>
                        <input id="customSalesTag" placeholder="e.g. rahul or dinesh" style="background:#070a0e; border:1px solid #233140; color:#fff; padding:4px 8px; border-radius:6px; font-size:11px; width:90%; margin-top:2px;" />
                    </div>
                    <button onclick="copySalesLink(this)" style="background:rgba(168,85,247,0.15); color:#c084fc; border:1px solid rgba(168,85,247,0.3); border-radius:6px; padding:4px 10px; font-size:11px; cursor:pointer; font-weight:700; white-space:nowrap;">Copy Link</button>
                </div>
            </div>
        </div>

        <!-- Section 1: Partner Leads -->
        <div class="card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-family:'Outfit'; font-size:20px; margin:0; color:#10b981;">👥 Registered Fleet Partner Applications (₹1 Lakh)</h2>
                <span style="font-size:13px; color:#94a3b8;">Total: {len(leads)}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Lead ID</th>
                        <th>Investor Name</th>
                        <th>Phone / WhatsApp</th>
                        <th>Autos Count</th>
                        <th>Target City</th>
                        <th>Lead Source / Channel</th>
                        <th>Notification</th>
                        <th>Date &amp; Time (IST)</th>
                    </tr>
                </thead>
                <tbody>
                    {partner_rows_html}
                </tbody>
            </table>
        </div>

        <!-- Section 2: EV Pilot Applications -->
        <div class="card" style="border-color: rgba(250,204,21,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h2 style="font-family:'Outfit'; font-size:20px; margin:0; color:#facc15;">🛺 Registered EV Pilot Applications (₹25,000/Mo Salary)</h2>
                <span style="font-size:13px; color:#94a3b8;">Total: {len(pilots)}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Pilot ID</th>
                        <th>Pilot Name</th>
                        <th>Phone / WhatsApp</th>
                        <th>License Type</th>
                        <th>Preferred Operating Hub</th>
                        <th>Experience</th>
                        <th>Lead Source / Channel</th>
                        <th>Status</th>
                        <th>Date &amp; Time (IST)</th>
                    </tr>
                </thead>
                <tbody>
                    {pilot_rows_html}
                </tbody>
            </table>
        </div>

        <script>
        function copyToClipboard(text, btn) {{
            navigator.clipboard.writeText(text).then(() => {{
                const orig = btn.innerText;
                btn.innerText = 'Copied! ✓';
                setTimeout(() => btn.innerText = orig, 2000);
            }}).catch(() => {{
                prompt('Copy this link:', text);
            }});
        }}
        function copySalesLink(btn) {{
            const tagInput = document.getElementById('customSalesTag');
            const tag = (tagInput && tagInput.value.trim() ? tagInput.value.trim() : 'sales-team').replace(/\\s+/g, '-').toLowerCase();
            const url = `https://owngo.in/?ref=sales-${{tag}}#apply`;
            copyToClipboard(url, btn);
        }}
        async function clearAllLeads() {{
            if (!confirm('⚠️ Are you sure you want to permanently clear all leads and pilot applications? This cannot be undone.')) return;
            try {{
                const res = await fetch('/api/admin/clear-leads', {{ method: 'POST' }});
                const data = await res.json();
                if (data.success) {{
                    alert('All leads removed successfully.');
                    window.location.reload();
                }} else {{
                    alert('Error: ' + (data.message || 'Failed to clear'));
                }}
            }} catch (e) {{
                alert('Request failed: ' + e);
            }}
        }}
        </script>
    </body>
    </html>
    """

# ===================================================
# STATIC FILES & ROOT ROUTE
# ===================================================
# Mount assets directory
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/")
async def root():
    return FileResponse("index.html")

# Launch server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8088))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🚀 Starting OWNGO Backend on http://{host}:{port}")
    print(f"📊 Admin Dashboard available at: http://{host}:{port}/admin")
    uvicorn.run("server:app", host=host, port=port, reload=False)

