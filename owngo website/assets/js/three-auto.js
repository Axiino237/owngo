/**
 * OWNGO 3D Interactive EV Auto Showcase
 * Built with Three.js (Procedural 3D model styled after Bajaj GOGO P5012 EV Auto)
 */

class Auto3DViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.autoGroup = null;
    this.wheels = [];
    this.lightsOn = true;
    this.isRotating = true;
    this.headlightMeshes = [];
    this.bodyMaterials = [];

    // Colors
    this.currentColor = '#16a34a'; // Default emerald green
    this.roofColor = '#facc15';    // Bajaj signature yellow

    this.init();
  }

  init() {
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight || 440;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e14);
    this.scene.fog = new THREE.FogExp2(0x0a0e14, 0.05);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(4.2, 2.2, 4.5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    this.setupLighting();

    // Floor & Podium
    this.setupPodium();

    // Build the Bajaj GOGO EV Auto 3D Model
    this.buildBajajGOGOAuto();

    // Mouse / Touch Controls
    this.setupControls();

    // Responsive Resize
    window.addEventListener('resize', () => this.onResize());

    // Animation Loop
    this.animate();
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    // Main Key Light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    this.scene.add(keyLight);

    // Fill Light (Cool Cyan/Green tint)
    const fillLight = new THREE.DirectionalLight(0x34d399, 0.8);
    fillLight.position.set(-5, 4, -3);
    this.scene.add(fillLight);

    // Rim Light (Warm Yellow)
    const rimLight = new THREE.DirectionalLight(0xfacc15, 0.9);
    rimLight.position.set(0, 5, -5);
    this.scene.add(rimLight);
  }

  setupPodium() {
    // Futuristic circular turntable platform
    const platformGeo = new THREE.CylinderGeometry(2.8, 3.0, 0.12, 64);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x141b24,
      metalness: 0.8,
      roughness: 0.2
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.06;
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Neon Glow Ring
    const ringGeo = new THREE.TorusGeometry(2.85, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    // Subtle Ground Grid
    const grid = new THREE.GridHelper(10, 20, 0x16a34a, 0x1a2332);
    grid.position.y = -0.07;
    this.scene.add(grid);
  }

  buildBajajGOGOAuto() {
    this.autoGroup = new THREE.Group();

    // Material definitions
    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.currentColor),
      metalness: 0.4,
      roughness: 0.3
    });
    this.bodyMaterials.push(bodyMat);

    const roofYellowMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xfacc15),
      metalness: 0.3,
      roughness: 0.4
    });

    const canopyBlackMat = new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.8,
      metalness: 0.1
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.85,
      transparent: true,
      opacity: 0.7
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
      metalness: 0.1
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.85,
      roughness: 0.2
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1
    });

    // 1. Lower Chassis & Cabin Body (Green)
    const chassisGeo = new THREE.BoxGeometry(1.4, 0.65, 2.3);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.set(0, 0.65, 0.1);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.autoGroup.add(chassis);

    // 2. Aerodynamic Front Cowl (Tapered front nose)
    const frontCowlGeo = new THREE.CylinderGeometry(0.55, 0.7, 0.75, 32, 1, false, 0, Math.PI);
    const frontCowl = new THREE.Mesh(frontCowlGeo, bodyMat);
    frontCowl.rotation.y = Math.PI / 2;
    frontCowl.rotation.z = Math.PI / 2;
    frontCowl.position.set(0, 0.7, 1.25);
    frontCowl.castShadow = true;
    this.autoGroup.add(frontCowl);

    // Front Mudguard
    const mudguardGeo = new THREE.CylinderGeometry(0.35, 0.38, 0.3, 16, 1, false, 0, Math.PI);
    const mudguard = new THREE.Mesh(mudguardGeo, bodyMat);
    mudguard.rotation.y = Math.PI / 2;
    mudguard.position.set(0, 0.45, 1.45);
    this.autoGroup.add(mudguard);

    // 3. Upper Front Cowl & Windshield Frame (Bajaj Signature Yellow)
    const upperCowlGeo = new THREE.BoxGeometry(1.3, 0.3, 0.9);
    const upperCowl = new THREE.Mesh(upperCowlGeo, roofYellowMat);
    upperCowl.position.set(0, 1.1, 0.8);
    upperCowl.castShadow = true;
    this.autoGroup.add(upperCowl);

    // 4. Windshield Glass
    const windshieldGeo = new THREE.PlaneGeometry(1.2, 0.65);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, 1.35, 1.05);
    windshield.rotation.x = -Math.PI * 0.12;
    this.autoGroup.add(windshield);

    // Wiper
    const wiperGeo = new THREE.BoxGeometry(0.02, 0.45, 0.02);
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const wiper = new THREE.Mesh(wiperGeo, wiperMat);
    wiper.position.set(0.05, 1.35, 1.12);
    wiper.rotation.x = -Math.PI * 0.12;
    wiper.rotation.z = -Math.PI * 0.2;
    this.autoGroup.add(wiper);

    // 5. All-Weather Premium Roof Canopy (Black texture)
    const canopyGeo = new THREE.BoxGeometry(1.42, 0.1, 2.45);
    const canopy = new THREE.Mesh(canopyGeo, canopyBlackMat);
    canopy.position.set(0, 1.85, 0.05);
    canopy.castShadow = true;
    this.autoGroup.add(canopy);

    // Canopy Pillar Struts (Roll-cage tubes)
    const pillarPositions = [
      [-0.65, 1.45, 1.1],
      [0.65, 1.45, 1.1],
      [-0.68, 1.45, 0.0],
      [0.68, 1.45, 0.0],
      [-0.68, 1.45, -1.05],
      [0.68, 1.45, -1.05]
    ];
    pillarPositions.forEach(pos => {
      const pillarGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 12);
      const pillar = new THREE.Mesh(pillarGeo, chromeMat);
      pillar.position.set(pos[0], pos[1], pos[2]);
      this.autoGroup.add(pillar);
    });

    // 6. Side Half-Doors with OWNGO Livery Swoosh (Green & Yellow Decal Accent)
    const doorGeo = new THREE.BoxGeometry(0.05, 0.5, 0.95);
    const leftDoor = new THREE.Mesh(doorGeo, bodyMat);
    leftDoor.position.set(-0.7, 0.75, -0.15);
    this.autoGroup.add(leftDoor);

    const rightDoor = new THREE.Mesh(doorGeo, bodyMat);
    rightDoor.position.set(0.7, 0.75, -0.15);
    this.autoGroup.add(rightDoor);

    // Dynamic aero decal swoosh on side doors
    const swooshGeo = new THREE.PlaneGeometry(0.65, 0.12);
    const swooshMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    
    const leftSwoosh = new THREE.Mesh(swooshGeo, swooshMat);
    leftSwoosh.position.set(-0.73, 0.65, -0.15);
    leftSwoosh.rotation.y = Math.PI / 2;
    leftSwoosh.rotation.z = -0.2;
    this.autoGroup.add(leftSwoosh);

    const rightSwoosh = new THREE.Mesh(swooshGeo, swooshMat);
    rightSwoosh.position.set(0.73, 0.65, -0.15);
    rightSwoosh.rotation.y = -Math.PI / 2;
    rightSwoosh.rotation.z = 0.2;
    this.autoGroup.add(rightSwoosh);

    // 7. Interior Seating
    // Driver Bench
    const driverSeatGeo = new THREE.BoxGeometry(0.8, 0.15, 0.45);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const driverSeat = new THREE.Mesh(driverSeatGeo, seatMat);
    driverSeat.position.set(0, 0.75, 0.45);
    this.autoGroup.add(driverSeat);

    // Passenger Bench
    const passSeatGeo = new THREE.BoxGeometry(1.25, 0.18, 0.55);
    const passSeat = new THREE.Mesh(passSeatGeo, seatMat);
    passSeat.position.set(0, 0.75, -0.65);
    this.autoGroup.add(passSeat);

    // Passenger Backrest
    const backrestGeo = new THREE.BoxGeometry(1.25, 0.45, 0.1);
    const backrest = new THREE.Mesh(backrestGeo, seatMat);
    backrest.position.set(0, 1.05, -0.95);
    this.autoGroup.add(backrest);

    // 8. Handlebar & Speedometer Console
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 12);
    const handle = new THREE.Mesh(handleGeo, chromeMat);
    handle.rotation.z = Math.PI / 2;
    handle.position.set(0, 1.15, 0.7);
    this.autoGroup.add(handle);

    // 9. Dual Crystal LED Headlights
    const createHeadlight = (x, y, z) => {
      const hlHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.1, 24),
        chromeMat
      );
      hlHousing.rotation.x = Math.PI / 2;
      hlHousing.position.set(x, y, z);
      this.autoGroup.add(hlHousing);

      const hlLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.11, 24),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      hlLens.position.set(x, y, z + 0.055);
      this.autoGroup.add(hlLens);
      this.headlightMeshes.push(hlLens);

      // Light glow spot
      const spotLight = new THREE.SpotLight(0xfffaed, 2, 8, Math.PI * 0.25, 0.5);
      spotLight.position.set(x, y, z + 0.1);
      spotLight.target.position.set(x, 0, z + 4);
      this.scene.add(spotLight);
      this.scene.add(spotLight.target);
    };

    createHeadlight(-0.35, 0.82, 1.48);
    createHeadlight(0.35, 0.82, 1.48);

    // OWNGO Front Badge
    const badgeGeo = new THREE.BoxGeometry(0.35, 0.1, 0.02);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0.82, 1.5);
    this.autoGroup.add(badge);

    // Side Mirrors
    const mirrorStemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8);
    const leftStem = new THREE.Mesh(mirrorStemGeo, chromeMat);
    leftStem.rotation.z = Math.PI * 0.35;
    leftStem.position.set(-0.7, 1.2, 0.95);
    this.autoGroup.add(leftStem);

    const mirrorHeadGeo = new THREE.BoxGeometry(0.1, 0.15, 0.03);
    const leftMirror = new THREE.Mesh(mirrorHeadGeo, chromeMat);
    leftMirror.position.set(-0.8, 1.25, 0.95);
    this.autoGroup.add(leftMirror);

    const rightStem = new THREE.Mesh(mirrorStemGeo, chromeMat);
    rightStem.rotation.z = -Math.PI * 0.35;
    rightStem.position.set(0.7, 1.2, 0.95);
    this.autoGroup.add(rightStem);

    const rightMirror = new THREE.Mesh(mirrorHeadGeo, chromeMat);
    rightMirror.position.set(0.8, 1.25, 0.95);
    this.autoGroup.add(rightMirror);

    // 10. Three Wheels (1 Front Steerable, 2 Rear)
    const createWheel = (x, y, z, isFront = false) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, z);

      // Rubber Tire
      const tireGeo = new THREE.TorusGeometry(0.26, 0.09, 16, 32);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.y = Math.PI / 2;
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Metallic Rim Hub
      const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 24);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelGroup.add(rim);

      // Hub Cap with Green Bolt Accent
      const capGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 16);
      const capMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.rotation.z = Math.PI / 2;
      wheelGroup.add(cap);

      this.autoGroup.add(wheelGroup);
      this.wheels.push(wheelGroup);
      return wheelGroup;
    };

    // Front single wheel
    createWheel(0, 0.28, 1.45, true);
    // Rear left wheel
    createWheel(-0.68, 0.28, -0.65);
    // Rear right wheel
    createWheel(0.68, 0.28, -0.65);

    // Rear LED Tail Lights
    const tailLightGeo = new THREE.BoxGeometry(0.12, 0.1, 0.02);
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    
    const leftTail = new THREE.Mesh(tailLightGeo, tailLightMat);
    leftTail.position.set(-0.55, 0.75, -1.06);
    this.autoGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailLightGeo, tailLightMat);
    rightTail.position.set(0.55, 0.75, -1.06);
    this.autoGroup.add(rightTail);

    this.scene.add(this.autoGroup);
  }

  setupControls() {
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    this.canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
      this.isRotating = false;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging || !this.autoGroup) return;

      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      this.autoGroup.rotation.y += deltaX * 0.008;
      
      // Limit pitch
      this.camera.position.y = Math.max(1.2, Math.min(3.5, this.camera.position.y - deltaY * 0.005));
      this.camera.lookAt(0, 0.8, 0);

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    // Touch support for mobile devices
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
        this.isRotating = false;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || !this.autoGroup || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - prevMouseX;
      this.autoGroup.rotation.y += deltaX * 0.008;

      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    }, { passive: true });
  }

  setBodyColor(hexColor) {
    this.currentColor = hexColor;
    const col = new THREE.Color(hexColor);
    this.bodyMaterials.forEach(mat => {
      mat.color.set(col);
    });
  }

  toggleLights() {
    this.lightsOn = !this.lightsOn;
    const col = this.lightsOn ? 0xffffff : 0x333333;
    this.headlightMeshes.forEach(mesh => {
      mesh.material.color.setHex(col);
    });
  }

  toggleRotation() {
    this.isRotating = !this.isRotating;
  }

  onResize() {
    if (!this.canvas || !this.camera || !this.renderer) return;
    const width = this.canvas.parentElement.clientWidth;
    const height = this.canvas.parentElement.clientHeight || 440;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Auto rotate turntable
    if (this.isRotating && this.autoGroup) {
      this.autoGroup.rotation.y += 0.005;
    }

    // Gentle floating suspension hover
    if (this.autoGroup) {
      const time = Date.now() * 0.002;
      this.autoGroup.position.y = Math.sin(time) * 0.015;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Global hook
window.Auto3DViewer = Auto3DViewer;
