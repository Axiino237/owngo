# OWNGO - Electric Auto Partnership Platform 🛺⚡

Official web platform for **OWNGO** (Own • Earn • Grow), Chennai's pioneering Electric Auto Partnership ecosystem. OWNGO offers guaranteed daily/monthly passive income through 100% asset-backed, EV-fleet partnerships with AI-powered dashcam security (Cautio) and automated earnings management.

---

## 🌟 Key Features

- **Hero 360° Interactive Vehicle Showcase**: Seamless 360-degree interactive viewer with colorway customization (Emerald Green, Sonic Yellow, Cyber White).
- **Interactive Wealth & Unit Economics Calculator**: Real-time monthly return and 5-year wealth projection calculation based on unit allocations.
- **Founding 100 Auto Allocation Progress**: Live progress track showing slots claimed and countdown with real-time dynamic counters.
- **Cautio AI Telematics & Dashcam Integration**: Complete breakdown of dual-camera safety, ADAS, driver fatigue monitoring, and cloud live-streaming.
- **Bilingual Support**: Instant, comprehensive English and Tamil language switching across 400+ keys.
- **Admin Lead Management Portal**: Secure real-time lead tracking, export to CSV, visitor analytics with deduplication, and application filtering.
- **Dark & Light Mode**: High-contrast, theme-switchable UI tailored for mobile, tablet, and desktop viewports.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Modern Flexbox/Grid, Glassmorphism, CSS Custom Properties), Vanilla JavaScript (ES6+ Modules)
- **Backend API**: Python FastAPI / Uvicorn
- **Database**: SQLite (Automated thread-safe schema initialization)
- **Security & Infrastructure**: Let's Encrypt SSL, Nginx Reverse Proxy, Systemd Service

---

## 🚀 Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Axiino237/owngo.git
   cd owngo
   ```

2. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the server:**
   ```bash
   python server.py
   ```

5. **Open in browser:**
   - Landing Page: `http://localhost:8080/`
   - Admin Portal: `http://localhost:8080/admin`

---

## 📁 Project Structure

```
owngo/
├── assets/
│   ├── css/
│   │   ├── style.css         # Complete styling, animations, and dark/light themes
│   │   └── admin.css         # Admin dashboard styles
│   ├── js/
│   │   ├── main.js           # Interactive studio, calculator, and theme controllers
│   │   ├── translations.js   # Comprehensive EN / TA bilingual dictionary
│   │   └── admin.js          # Admin portal lead management & analytics
│   └── images/               # Optimized SVGs, WebP images, and vehicle renders
├── index.html                # Main responsive landing page
├── server.py                 # FastAPI backend server with REST endpoints
├── requirements.txt          # Python package requirements
└── README.md
```

---

## 📄 License

Proprietary © OWNGO Mobility Technologies. All rights reserved.
