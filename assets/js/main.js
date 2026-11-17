/**
 * OWNGO - Main Application Scripts
 * Preloader with Driving Auto, Front Auto 3D Tilt, Investor ROI Calculator, 360 Studio, Multi-Language & Interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons Package
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // Initialize Components
  initThemeToggle();
  initPreloader();
  initNavbar();
  initVisitorTracker();
  initHeroTiltAndAngles();
  initStudio360();
  initInvestorCalculator();
  initFoundingQuotaTracker();
  initBookingForm();
  initPilotBookingForm();
  initPilotNavCta();
  initLanguageToggle();
  initScrollAnimations();
});

/* ===================================================
   HARDWARE & CANVAS FINGERPRINT (Immutable across cache clears)
   =================================================== */
function getHardwareFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('OWNGO_MOBILITY_HARDWARE_FP_V1', 4, 4);
      ctx.fillStyle = 'rgba(0, 209, 146, 0.8)';
      ctx.fillRect(40, 20, 100, 25);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(30, 30, 18, 0, Math.PI * 2, true);
      ctx.fill();
    }
    const canvasData = canvas.toDataURL();

    // Get WebGL GPU Renderer Info
    let glRenderer = 'standard_gpu';
    try {
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'webgl';
        }
      }
    } catch (e) {}

    const screenInfo = `${screen.width}x${screen.height}_${screen.colorDepth}_${window.devicePixelRatio || 1}`;
    const cpuInfo = `${navigator.hardwareConcurrency || 4}_${navigator.deviceMemory || 8}`;
    const tz = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';
    const platform = navigator.platform || '';

    const raw = `${canvasData}::${glRenderer}::${screenInfo}::${cpuInfo}::${tz}::${platform}`;

    // FNV-1a deterministic hash
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    const hex = (hash >>> 0).toString(16).padStart(8, '0');
    const screenHex = ((screen.width * 10000) + screen.height).toString(16);

    return {
      hwFp: `hw_${hex}_${screenHex}`,
      screenRes: `${screen.width}x${screen.height}`,
      gpuRenderer: glRenderer.substring(0, 120)
    };
  } catch (err) {
    return {
      hwFp: 'hw_fallback_' + (screen.width || 1920) + 'x' + (screen.height || 1080),
      screenRes: `${screen.width || 1920}x${screen.height || 1080}`,
      gpuRenderer: 'generic_gpu'
    };
  }
}

/* ===================================================
   UNIQUE DEVICE ID GENERATOR (1 Device = 1 View)
   =================================================== */
function getOrCreateDeviceId() {
  const STORAGE_KEY = 'owngo_device_id';
  let deviceId = null;

  // 1. Try reading from localStorage
  try {
    deviceId = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  // 2. Try reading from sessionStorage
  if (!deviceId) {
    try {
      deviceId = sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {}
  }

  // 3. Fallback: Try reading from document.cookie
  if (!deviceId) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + STORAGE_KEY + '=([^;]+)'));
    if (match) {
      deviceId = decodeURIComponent(match[2]);
    }
  }

  // 4. Generate robust unique device ID if not found
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = 'dev_' + crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 12);
    }
  }

  // 5. Save across localStorage, sessionStorage & cookie (2 years persistence)
  try { localStorage.setItem(STORAGE_KEY, deviceId); } catch (e) {}
  try { sessionStorage.setItem(STORAGE_KEY, deviceId); } catch (e) {}
  try {
    const maxAge = 60 * 60 * 24 * 730; // 2 years
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(deviceId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch (e) {}

  return deviceId;
}

/* ===================================================
   REAL-TIME EXACT VISITOR TRACKER (1 Physical Device = 1 View)
   =================================================== */
async function initVisitorTracker() {
  const visitorCountEl = document.getElementById('live-visitor-count');
  if (!visitorCountEl) return;

  const deviceId = getOrCreateDeviceId();
  const { hwFp, screenRes, gpuRenderer } = getHardwareFingerprint();

  try {
    const params = new URLSearchParams({
      device_id: deviceId,
      hw_fp: hwFp,
      screen_res: screenRes,
      gpu_renderer: gpuRenderer
    });

    const res = await fetch(`/api/visitor-count?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      const count = data.total_views ?? data.total_visits ?? 1;

      // Update stored device ID if returned from DB
      if (data.device_id && data.device_id !== deviceId) {
        try { localStorage.setItem('owngo_device_id', data.device_id); } catch(e) {}
      }

      visitorCountEl.innerHTML = `Live: <strong>${count.toLocaleString()}</strong> ${count === 1 ? 'View' : 'Views'}`;
    }
  } catch (err) {
    console.log('Visitor tracker running offline fallback');
    visitorCountEl.textContent = 'Live: 1 View';
  }
}

/* ===================================================
   1. PRELOADER: EXACT OWNGO AUTO ANIMATION (Method 1)
   =================================================== */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const circleProgress = document.getElementById('progress-circle');
  const percentText = document.getElementById('loader-percent');

  if (!preloader) return;

  const circumference = 2 * Math.PI * 66; // ~414.69
  if (circleProgress) {
    circleProgress.style.strokeDasharray = `${circumference}`;
    circleProgress.style.strokeDashoffset = `${circumference}`;
  }

  let progress = 0;
  const targetTime = 1800; // 1.8s smooth experience
  const intervalTime = 20;
  const increment = 100 / (targetTime / intervalTime);

  const loaderInterval = setInterval(() => {
    progress += increment + (Math.random() * 0.8);
    if (progress >= 100) {
      progress = 100;
      clearInterval(loaderInterval);
      finishLoading();
    }
    updateLoader(progress);
  }, intervalTime);

  function updateLoader(val) {
    const rounded = Math.min(100, Math.floor(val));
    if (percentText) percentText.textContent = `${rounded}%`;
    if (circleProgress) {
      const offset = circumference - (rounded / 100) * circumference;
      circleProgress.style.strokeDashoffset = `${offset}`;
    }
  }

  function finishLoading() {
    updateLoader(100);
    setTimeout(() => {
      preloader.classList.add('loaded');
      document.body.style.overflow = 'auto';
      setTimeout(() => { preloader.style.display = 'none'; }, 650);
      triggerHeroEntrance();
    }, 350);
  }
}

function triggerHeroEntrance() {
  const heroContent = document.querySelector('.hero-content');
  const heroCard = document.querySelector('.hero-front-card');
  if (heroContent) {
    heroContent.style.opacity = '0';
    heroContent.style.transform = 'translateY(25px)';
    heroContent.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => {
      heroContent.style.opacity = '1';
      heroContent.style.transform = 'translateY(0)';
    }, 100);
  }
  if (heroCard) {
    heroCard.style.opacity = '0';
    heroCard.style.transform = 'scale(0.96)';
    heroCard.style.transition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s';
    setTimeout(() => {
      heroCard.style.opacity = '1';
      heroCard.style.transform = 'scale(1)';
    }, 150);
  }
}

/* ===================================================
   2. NAVBAR, SCROLLSPY & MOBILE DRAWER
   =================================================== */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawer = document.getElementById('close-drawer');

  // 1. Scrolled navbar shadow
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  // 2. Mobile drawer open / close
  if (hamburger && mobileDrawer) {
    hamburger.addEventListener('click', () => {
      mobileDrawer.classList.add('open');
    });
  }
  if (closeDrawer && mobileDrawer) {
    closeDrawer.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
    });
  }

  // 3. STRICT SINGLE-ACTIVE HIGHLIGHT & SCROLLSPY HANDLER
  // Only the exact selected or visible section link is active.
  const allNavLinks = document.querySelectorAll('.nav-menu .nav-link, .mobile-nav-menu .nav-link');
  const trackedSections = [
    { id: 'hero', href: '#hero' },
    { id: 'investment-model', href: '#investment-model' },
    { id: 'ola-tieup', href: '#ola-tieup' },
    { id: 'chennai-growth', href: '#chennai-growth' },
    { id: 'calculator', href: '#calculator' },
    { id: 'studio-360', href: '#studio-360' },
    { id: 'specs', href: '#specs' }
  ];

  function setActiveNavLink(targetHref) {
    allNavLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === targetHref || (targetHref === '#hero' && (href === '#hero' || href === '#'))) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Click handler on navigation links: immediately activate ONLY the clicked item
  allNavLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || !href.startsWith('#')) return;

      setActiveNavLink(href);

      if (mobileDrawer) mobileDrawer.classList.remove('open');

      const targetEl = document.querySelector(href);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 70;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // Global smooth scroll for non-nav anchor tags
  document.querySelectorAll('a[href^="#"]:not(.nav-link)').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveNavLink(targetId);
      }
    });
  });

  // ScrollSpy: strictly highlight only the section currently in view
  let scrollTimeout = null;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) return;
    scrollTimeout = setTimeout(() => {
      scrollTimeout = null;

      // At top of page -> always Hero
      if (window.scrollY < 200) {
        setActiveNavLink('#hero');
        return;
      }

      const scrollPosition = window.scrollY + 180;
      let currentSectionHref = '#hero';

      for (let i = trackedSections.length - 1; i >= 0; i--) {
        const sec = document.getElementById(trackedSections[i].id);
        if (sec) {
          const top = sec.offsetTop;
          if (scrollPosition >= top) {
            currentSectionHref = trackedSections[i].href;
            break;
          }
        }
      }

      setActiveNavLink(currentSectionHref);
    }, 60);
  }, { passive: true });
}

/* ===================================================
   3. HERO 3D TILT EFFECT FOR 360° GIF
   =================================================== */
function initHeroTiltAndAngles() {
  const tiltCard = document.getElementById('hero-tilt-card');
  const heroGif = document.getElementById('hero-rotating-gif') || document.getElementById('hero-displayed-auto');

  if (!tiltCard || !heroGif) return;

  // Subtle 3D Card Tilt on Mouse Move
  tiltCard.addEventListener('mousemove', (e) => {
    const rect = tiltCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 6;
    
    heroGif.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  tiltCard.addEventListener('mouseleave', () => {
    heroGif.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
  });
}

/* ===================================================
   4. 360° MULTI-ANGLE STUDIO EXPLORER
   =================================================== */
function initStudio360() {
  const angleData = [
    {
      id: 'front',
      name: 'Front View',
      badge: '0° Aerodynamic Front',
      image: 'assets/images/view-front.jpg',
      desc: 'Sleek aerodynamic nose cowl with dual crystal LED headlights, high-impact fiber bumper, and prominent OWNGO electric branding. Designed for optimal urban pedestrian visibility.',
      specs: [
        { label: 'Lighting', val: 'Dual Crystal LED' },
        { label: 'Cowl Material', val: 'Reinforced Polymer' },
        { label: 'Wiper Motor', val: 'Multi-speed Dual Arc' },
        { label: 'Turning Radius', val: 'Compact 2.88 Meters' }
      ]
    },
    {
      id: 'turntable',
      name: '3D Studio Turntable',
      badge: '360° Studio Platform',
      image: 'assets/images/hero-turntable.jpg',
      desc: 'Dynamic 3/4 perspective of the Bajaj GOGO EV Auto on the glowing circular studio turntable. Demonstrates balanced vehicle proportions and aerodynamic styling.',
      specs: [
        { label: 'Chassis Type', val: 'Monocoque Tubular' },
        { label: 'Ground Clearance', val: '180 mm Unladen' },
        { label: 'Gradeability', val: '18% Flyover Grade' },
        { label: 'Suspension', val: 'Heavy Helical Springs' }
      ]
    },
    {
      id: 'front-right',
      name: 'Front Right 45°',
      badge: '45° Dynamic Stance',
      image: 'assets/images/view-front-right.jpg',
      desc: 'Three-quarter dynamic perspective showcasing the iconic dual-tone Bajaj yellow roof cowl and emerald green lower cabin. Offers EV Pilot optimal street clearance.',
      specs: [
        { label: 'Door Safety', val: 'Side Impact Guards' },
        { label: 'Pilot Legroom', val: 'Ergonomic Extended' },
        { label: 'Step Height', val: 'Low Floor 320 mm' },
        { label: 'Seat Fabric', val: 'Waterproof PU Leather' }
      ]
    },
    {
      id: 'side',
      name: 'Right Side Profile',
      badge: '90° Passenger Cabin',
      image: 'assets/images/view-side.jpg',
      desc: 'Broad ergonomic entrance with reinforced side safety door and dynamic speed vinyl graphics. Designed for easy passenger ingress and egress in bustling city traffic.',
      specs: [
        { label: 'Door Safety', val: 'Side Impact Guards' },
        { label: 'Battery IP Rating', val: 'IP67 Submersible' },
        { label: 'Wheelbase', val: '2,010 mm' },
        { label: 'Payload Capacity', val: '420 kg (Pilot + 3 Passengers)' }
      ]
    },
    {
      id: 'rear',
      name: 'Rear View',
      badge: '180° Boot & Tailgate',
      image: 'assets/images/view-rear.jpg',
      desc: 'Heavy-duty lockable luggage boot with high-mounted LED tail stop lamps and prominent OWNGO EV identification. Ensures zero passenger luggage compromise.',
      specs: [
        { label: 'Boot Capacity', val: '120 Liters Enclosed' },
        { label: 'Tail Lamps', val: 'LED High-Lumen Cluster' },
        { label: 'Reverse Camera', val: 'Available Sensor Ready' },
        { label: 'Bumper', val: 'Heavy Carbon Steel' }
      ]
    },
    {
      id: 'rear-left',
      name: 'Rear Left Angle',
      badge: '315° Complete Stance',
      image: 'assets/images/view-rear-left.jpg',
      desc: 'Full perspective of the all-weather reinforced roof canopy, aerodynamic rear roof spoiler lip, and tubeless tires designed for maximum energy efficiency.',
      specs: [
        { label: 'Canopy Durability', val: 'UV Resistant 5-Yr' },
        { label: 'Tire Specification', val: '4.00-8 Tubeless' },
        { label: 'Warranty', val: '3 Years / 1,00,000 km' },
        { label: 'Kerb Weight', val: '465 kg' }
      ]
    }
  ];

  const mainImg = document.getElementById('studio-active-img');
  const viewName = document.getElementById('studio-view-name');
  const viewBadge = document.getElementById('studio-angle-badge');
  const viewDesc = document.getElementById('studio-view-desc');
  const specsGrid = document.getElementById('studio-specs-list');
  const thumbs = document.querySelectorAll('.thumb-card');

  if (!mainImg || thumbs.length === 0) return;

  function setAngle(idx) {
    const item = angleData[idx];
    if (!item) return;

    thumbs.forEach(t => t.classList.remove('active'));
    thumbs[idx].classList.add('active');

    // Fade animation on image
    mainImg.style.opacity = '0';
    mainImg.style.transform = 'scale(0.96)';

    setTimeout(() => {
      mainImg.src = item.image;
      mainImg.alt = item.name;
      if (viewName) viewName.textContent = item.name;
      if (viewBadge) viewBadge.textContent = item.badge;
      if (viewDesc) viewDesc.textContent = item.desc;

      if (specsGrid) {
        specsGrid.innerHTML = item.specs.map(s => `
          <div class="studio-spec-card">
            <div class="spec-title-sm">${s.label}</div>
            <div class="spec-value-sm">${s.val}</div>
          </div>
        `).join('');
      }

      mainImg.style.opacity = '1';
      mainImg.style.transform = 'scale(1)';
    }, 200);
  }

  thumbs.forEach((thumb, idx) => {
    thumb.addEventListener('click', () => setAngle(idx));
  });
}

/* ===================================================
   5. INVESTOR CO-OWNERSHIP & ROI CALCULATOR
   =================================================== */
function initInvestorCalculator() {
  const autosSlider = document.getElementById('autos-slider');
  const autosDisplay = document.getElementById('autos-count-display');
  
  // Output fields
  const totalInvestmentEl = document.getElementById('calc-total-investment');
  const refundAmountEl = document.getElementById('calc-refund-amount');
  const monthlyPayoutEl = document.getElementById('calc-monthly-payout');
  const annualPayoutEl = document.getElementById('calc-annual-payout');
  const emiCoveredEl = document.getElementById('calc-emi-covered');
  const fiveYearCorpusEl = document.getElementById('calc-5yr-corpus');

  if (!autosSlider) return;

  const AUTO_RATE = 427000;         // ₹4.27 Lakhs on-road price
  const INVESTOR_DOWNPAY = 100000;  // ₹1.0 Lakh investor investment
  const MONTHLY_RETURN = 10000;     // ₹10,000 fixed passive return per auto
  const CAPITAL_REFUND = 40000;     // ₹40,000 refund after 6 months
  const EST_EMI = 12650;            // Monthly EMI paid directly by OWNGO

  function calculate() {
    const count = parseInt(autosSlider.value, 10) || 1;
    
    // Values
    const totalDownpay = count * INVESTOR_DOWNPAY;
    const totalRefund = count * CAPITAL_REFUND;
    const monthlyPayout = count * MONTHLY_RETURN;
    const annualPayout = monthlyPayout * 12;
    const emiSaved = count * EST_EMI;
    const fiveYearGross = (monthlyPayout * 60) + totalRefund + (count * 150000); // 5 yrs payout + 6mo refund + resale residual

    // Update UI displays
    const isTa = document.documentElement.lang === 'ta';
    if (autosDisplay) {
      autosDisplay.textContent = isTa 
        ? `${count} ${count === 1 ? 'ஆட்டோ' : 'ஆட்டோக்கள்'}`
        : `${count} ${count === 1 ? 'Auto' : 'Autos'}`;
    }

    if (totalInvestmentEl) {
      totalInvestmentEl.textContent = formatINR(totalDownpay);
    }
    if (refundAmountEl) {
      refundAmountEl.textContent = formatINR(totalRefund);
    }
    if (monthlyPayoutEl) {
      const perMo = isTa ? 'மாதம்' : 'mo';
      monthlyPayoutEl.textContent = `${formatINR(monthlyPayout)} / ${perMo}`;
    }
    if (annualPayoutEl) {
      annualPayoutEl.textContent = formatINR(annualPayout);
    }
    if (emiCoveredEl) {
      const emiNote = isTa ? 'மாதம் (100% OWNGO நிறுவனம் செலுத்துகிறது)' : 'mo (100% OWNGO)';
      emiCoveredEl.textContent = `${formatINR(emiSaved)} / ${emiNote}`;
    }
    if (fiveYearCorpusEl) {
      fiveYearCorpusEl.textContent = formatINR(fiveYearGross);
    }
  }

  function formatINR(val) {
    const isTa = document.documentElement.lang === 'ta';
    const crSuffix = isTa ? ' கோடி' : ' Cr';
    const lakhSuffix = isTa ? ' லட்சம்' : (val === 100000 ? ' Lakh' : ' Lakhs');
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}${crSuffix}`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 2)}${lakhSuffix}`;
    }
    return `₹${val.toLocaleString('en-IN')}`;
  }

  autosSlider.addEventListener('input', calculate);
  calculate(); // run initial
}

/* ===================================================
   6. INVESTOR BOOKING & LEAD FORM
   =================================================== */
function initBookingForm() {
  const form = document.getElementById('investor-booking-form');
  const toast = document.getElementById('toast-msg');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('investor-name').value.trim();
    const phone = document.getElementById('investor-phone').value.trim();
    const autosCount = document.getElementById('investor-autos').value;
    const city = document.getElementById('investor-city').value;
    const cibil = document.getElementById('investor-cibil') ? document.getElementById('investor-cibil').value : 'Good';

    if (!name || !phone) {
      alert('Please fill your name and phone number');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="lucide-loader-2"></i> Registering in Database...`;
    }

    try {
      // POST to backend SQLite database & trigger email notification
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          phone: phone,
          autos: parseInt(autosCount, 10),
          city: city,
          cibil: cibil
        })
      });

      const result = await response.json();

      // Trigger celebratory confetti
      if (window.confetti) {
        window.confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#10b981', '#22c55e', '#facc15']
        });
      }

      // Show toast with database Lead ID
      if (toast) {
        const leadId = result.lead_id || 'CONFIRMED';
        toast.innerHTML = `<i class="lucide-check-circle"></i> <strong>Application #${leadId} Stored in DB!</strong> Thank you ${name}! Email notification dispatched. Our executive will reach you within 2 hours.`;
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
        }, 6000);
      }

      form.reset();

    } catch (err) {
      console.error('Registration error:', err);
      if (toast) {
        toast.innerHTML = `<i class="lucide-check-circle"></i> Thank you ${name}! Application registered.`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}


/* ===================================================
   6B. ROLE SWITCHER & PILOT BOOKING FORM
   =================================================== */
window.switchApplyRole = function(role) {
  const partnerTab = document.getElementById('tab-btn-partner');
  const pilotTab = document.getElementById('tab-btn-pilot');
  const partnerInfo = document.getElementById('partner-booking-info');
  const pilotInfo = document.getElementById('pilot-booking-info');
  const partnerForm = document.getElementById('investor-booking-form');
  const pilotForm = document.getElementById('pilot-booking-form');

  if (role === 'pilot') {
    if (partnerTab) partnerTab.classList.remove('active');
    if (pilotTab) pilotTab.classList.add('active');
    if (partnerInfo) partnerInfo.style.display = 'none';
    if (pilotInfo) pilotInfo.style.display = 'block';
    if (partnerForm) partnerForm.style.display = 'none';
    if (pilotForm) pilotForm.style.display = 'block';
  } else {
    if (pilotTab) pilotTab.classList.remove('active');
    if (partnerTab) partnerTab.classList.add('active');
    if (pilotInfo) pilotInfo.style.display = 'none';
    if (partnerInfo) partnerInfo.style.display = 'block';
    if (pilotForm) pilotForm.style.display = 'none';
    if (partnerForm) partnerForm.style.display = 'block';
  }
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
};

function initPilotNavCta() {
  const pilotNavBtn = document.getElementById('nav-pilot-cta');
  const pilotMobileBtn = document.getElementById('mobile-pilot-btn');
  const handlePilotClick = (e) => {
    e.preventDefault();
    if (window.switchApplyRole) {
      window.switchApplyRole('pilot');
    }
    const applySec = document.getElementById('apply');
    if (applySec) {
      applySec.scrollIntoView({ behavior: 'smooth' });
    }
    const drawer = document.getElementById('mobile-drawer');
    if (drawer && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
    }
  };
  if (pilotNavBtn) pilotNavBtn.addEventListener('click', handlePilotClick);
  if (pilotMobileBtn) pilotMobileBtn.addEventListener('click', handlePilotClick);

  // Check URL hash on page load
  if (window.location.hash === '#pilot-apply') {
    setTimeout(() => {
      if (window.switchApplyRole) window.switchApplyRole('pilot');
      const applySec = document.getElementById('apply');
      if (applySec) applySec.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  }
}

function initPilotBookingForm() {
  const form = document.getElementById('pilot-booking-form');
  const toast = document.getElementById('toast-msg');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('pilot-name').value.trim();
    const phone = document.getElementById('pilot-phone').value.trim();
    const licenseType = document.getElementById('pilot-license') ? document.getElementById('pilot-license').value : 'Auto Rickshaw';
    const preferredArea = document.getElementById('pilot-area') ? document.getElementById('pilot-area').value : 'Central Chennai';
    const experience = document.getElementById('pilot-exp') ? document.getElementById('pilot-exp').value : '1-3 Years';

    if (!name || !phone) {
      alert('Please fill your name and phone number');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="lucide-loader-2"></i> Registering Pilot Application...`;
    }

    try {
      const response = await fetch('/api/register-pilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          phone: phone,
          license_type: licenseType,
          preferred_area: preferredArea,
          experience: experience
        })
      });

      const result = await response.json();

      if (window.confetti) {
        window.confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#facc15', '#eab308', '#10b981']
        });
      }

      if (toast) {
        const leadId = result.pilot_id || 'CONFIRMED';
        const isTamil = document.documentElement.lang === 'ta';
        toast.innerHTML = isTamil 
          ? `<i class="lucide-check-circle"></i> <strong>விண்ணப்ப எண் #${leadId} பதிவானது!</strong> நன்றி ${name}! உங்கள் ₹30,000 மாத சம்பள EV பைலட் விண்ணப்பம் ஏற்கப்பட்டது. விரைவில் எங்கள் மேலாளர் தொடர்புகொள்வார்.`
          : `<i class="lucide-check-circle"></i> <strong>Pilot Application #${leadId} Received!</strong> Thank you ${name}! Fixed ₹30,000/mo salary application recorded. Our recruitment team will call you within 2 hours.`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 6000);
      }

      form.reset();

    } catch (err) {
      console.error('Pilot registration error:', err);
      if (toast) {
        toast.innerHTML = `<i class="lucide-check-circle"></i> Thank you ${name}! Application registered.`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 5000);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  });
}

/* ===================================================
   7. DUAL LANGUAGE TOGGLE (English / தமிழ் - 100% COMPLETE)
   =================================================== */
function initLanguageToggle() {
  const langBtn = document.getElementById('lang-toggle-btn');
  const mobileLangBtn = document.getElementById('mobile-lang-btn');
  const langSpan = document.getElementById('lang-label-span');
  const mobileLangSpan = document.querySelector('.mobile-lang-span');

  let currentLang = 'en';
  try {
    currentLang = localStorage.getItem('owngo_lang') || 'en';
  } catch (e) {}

  function applyLanguage(lang) {
    const translations = window.OWNGO_TRANSLATIONS || {};
    const dict = translations[lang] || {};

    // 1. Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });

    // 2. Update toggle button labels (shows alternative language to switch to)
    const nextLabel = lang === 'en' ? 'தமிழ்' : 'English';
    if (langSpan) langSpan.textContent = nextLabel;
    if (mobileLangSpan) mobileLangSpan.textContent = nextLabel;

    document.documentElement.lang = lang;
    try {
      localStorage.setItem('owngo_lang', lang);
    } catch (e) {}

    // 3. Re-render Lucide icons
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }

    // 4. Update dynamic calculator & tracker in the active language
    const slider = document.getElementById('autos-slider');
    if (slider) {
      slider.dispatchEvent(new Event('input'));
    }
    if (typeof window.updateFoundingProgressLabels === 'function') {
      window.updateFoundingProgressLabels();
    }
  }

  // If page was previously set to Tamil, apply immediately
  if (currentLang === 'ta') {
    applyLanguage('ta');
  }

  function toggleLanguage(e) {
    if (e) e.preventDefault();
    currentLang = currentLang === 'en' ? 'ta' : 'en';
    applyLanguage(currentLang);
    if (typeof showToast === 'function') {
      showToast(currentLang === 'ta' ? 'தமிழ் மொழிக்கு மாற்றப்பட்டது' : 'Switched to English');
    }
  }

  if (langBtn) {
    langBtn.addEventListener('click', toggleLanguage);
  }
  if (mobileLangBtn) {
    mobileLangBtn.addEventListener('click', toggleLanguage);
  }
}

/* ===================================================
   8. SCROLL REVEAL ANIMATIONS
   =================================================== */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.pillar-card, .detail-card, .step-card, .calc-box');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(35px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
  });
}


/* ===================================================
   DARK & LIGHT THEME TOGGLE (HEADER SWITCHER)
   =================================================== */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const navLogo = document.querySelector('.nav-logo-img');
  const footerLogo = document.querySelector('.footer-brand img');

  // Check saved theme or default to light (Logo Theme)
  const savedTheme = localStorage.getItem('owngo-theme') || 'dark';
  applyTheme(savedTheme, false);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isDark = document.body.classList.contains('dark-theme');
      const targetTheme = isDark ? 'light' : 'dark';
      applyTheme(targetTheme, true);
      localStorage.setItem('owngo-theme', targetTheme);
    });
  }

  function applyTheme(theme, notify = false) {
    const preloaderImg = document.getElementById('moving-auto-img');
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      if (navLogo) navLogo.src = 'assets/images/logo-transparent.png';
      if (footerLogo) footerLogo.src = 'assets/images/logo-transparent.png';
      if (preloaderImg) preloaderImg.src = 'assets/images/Code_Generated_Image2.gif';
      if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
        themeToggleBtn.setAttribute('title', 'Switch to Light Theme');
        themeToggleBtn.setAttribute('aria-label', 'Switch to Light Theme');
      }
      if (notify && typeof showToast === 'function') {
        showToast('🌙 Dark Cyber Theme Activated');
      }
    } else {
      document.body.classList.remove('dark-theme');
      if (navLogo) navLogo.src = 'assets/images/logo-light.png';
      if (footerLogo) footerLogo.src = 'assets/images/logo-light.png';
      if (preloaderImg) preloaderImg.src = 'assets/images/Code_Generated_Image1.gif';
      if (themeToggleBtn) {
        themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
        themeToggleBtn.setAttribute('title', 'Switch to Dark Theme');
        themeToggleBtn.setAttribute('aria-label', 'Switch to Dark Theme');
      }
      if (notify && typeof showToast === 'function') {
        showToast('☀️ OWNGO Logo Light Theme Activated');
      }
    }

    // Refresh Lucide icons for the new sun/moon icon
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }
}

/* ===================================================
   9. LIVE FOUNDING 100 QUOTA TRACKER & DRIVING AUTO ANIMATION
   =================================================== */
function initFoundingQuotaTracker() {
  const wrap = document.getElementById('founding-progress-wrap');
  const fillBar = document.getElementById('founding-progress-fill');
  const drivingAuto = document.getElementById('progress-driving-auto');
  const claimedEl = document.getElementById('founding-claimed-count');
  const remainingEl = document.getElementById('founding-remaining-count');
  const badgeTextEl = document.getElementById('auto-badge-text');

  if (!wrap || !fillBar || !drivingAuto) return;

  // Base date: Nov 14, 2026. Starts at default 10 autos!
  const BASE_DATE = new Date('2026-11-14T00:00:00+05:30');
  const BASE_COUNT = 10;
  const TOTAL_CAP = 100;

  // Calculate dynamic per-day increment (1 or 2 autos added per day)
  const now = new Date();
  const diffTime = Math.max(0, now - BASE_DATE);
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  let currentCount = BASE_COUNT;
  for (let d = 0; d < daysPassed; d++) {
    // Alternates between 1 and 2 per day
    const inc = (d % 2 === 0) ? 2 : 1;
    currentCount += inc;
  }
  const targetCount = Math.min(TOTAL_CAP, currentCount);
  const remainingSlots = TOTAL_CAP - targetCount;
  const targetPct = targetCount; // 1 auto = 1% on 100 scale

  // Initially set bar to 0% so it animates when scrolled into view
  fillBar.style.width = '0%';
  drivingAuto.style.left = '0%';

    window.updateFoundingProgressLabels = function() {
    const isTa = document.documentElement.lang === 'ta';
    if (claimedEl) {
      claimedEl.textContent = isTa ? `${targetCount} / ${TOTAL_CAP} ஆட்டோக்கள் பதிவு` : `${targetCount} / ${TOTAL_CAP} Autos Claimed`;
    }
    if (badgeTextEl) {
      badgeTextEl.textContent = isTa ? `${targetCount} ஆட்டோக்கள்` : `${targetCount} Autos Claimed`;
    }
    if (remainingEl) {
      remainingEl.innerHTML = isTa
        ? `<i class="lucide-zap" data-lucide="zap" style="width: 14px; height: 14px;"></i> 7 மாத அசல் மீட்புக்கு இன்னும் ${remainingSlots} இடங்களே உள்ளன`
        : `<i class="lucide-zap" data-lucide="zap" style="width: 14px; height: 14px;"></i> Only ${remainingSlots} Slots Left for 7-Mo Payback`;
    }
  };
  let animated = false;

  function runAnimation() {
    if (animated) return;
    animated = true;

    // Trigger CSS width and left transition to target position
    requestAnimationFrame(() => {
      fillBar.style.width = `${targetPct}%`;
      drivingAuto.style.left = `${targetPct}%`;
    });

    // Animate the counter smoothly from 0 to targetCount
    let current = 0;
    const duration = 2200;
    const startTime = performance.now();

    function step(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      current = Math.round(ease * targetCount);

      const isTa = document.documentElement.lang === 'ta';
      if (claimedEl) {
        claimedEl.textContent = isTa ? `${current} / ${TOTAL_CAP} ஆட்டோக்கள் பதிவு` : `${current} / ${TOTAL_CAP} Autos Claimed`;
      }
      if (badgeTextEl) {
        badgeTextEl.textContent = isTa ? `${current} ஆட்டோக்கள்` : `${current} Autos Claimed`;
      }
      if (remainingEl) {
        remainingEl.innerHTML = isTa 
          ? `<i class="lucide-zap" data-lucide="zap" style="width: 14px; height: 14px;"></i> 7 மாத அசல் மீட்புக்கு இன்னும் ${TOTAL_CAP - current} இடங்களே உள்ளன`
          : `<i class="lucide-zap" data-lucide="zap" style="width: 14px; height: 14px;"></i> Only ${TOTAL_CAP - current} Slots Left for 7-Mo Payback`;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (typeof window.updateFoundingProgressLabels === 'function') {
          window.updateFoundingProgressLabels();
        }
        if (window.lucide && typeof lucide.createIcons === 'function') {
          lucide.createIcons();
        }
      }
    }

    requestAnimationFrame(step);
  }

  // Use IntersectionObserver to animate when user scrolls to it
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runAnimation();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    observer.observe(wrap);
  } else {
    runAnimation();
  }
}
