import * as THREE from 'three';

// Helper to create materials efficiently
function createMat(color: number, metalness = 0.1, roughness = 0.5, transparent = false, opacity = 1.0) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    transparent,
    opacity,
  });
}

// -------------------------------------------------------------
// 1. الأرصفة والممرات (Sidewalks & Pavements)
// -------------------------------------------------------------

export function buildSidewalkConcrete(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 2.5;
  const height = Math.max(0.2, sy * 0.25);
  const length = sz * 8.0;

  // Main concrete slab
  const slabGeo = new THREE.BoxGeometry(width, height, length);
  const slabMat = createMat(0xd1d5db, 0.05, 0.85); // Light concrete
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = height / 2;
  slab.receiveShadow = true;
  group.add(slab);

  // Kerbstone borders on both outer sides
  const kerbWidth = 0.18;
  const kerbHeight = height + 0.08;
  const kerbGeo = new THREE.BoxGeometry(kerbWidth, kerbHeight, length);
  const kerbMat = createMat(0x9ca3af, 0.1, 0.7);

  const leftKerb = new THREE.Mesh(kerbGeo, kerbMat);
  leftKerb.position.set(-width / 2 + kerbWidth / 2, kerbHeight / 2, 0);
  leftKerb.castShadow = true;
  group.add(leftKerb);

  const rightKerb = new THREE.Mesh(kerbGeo, kerbMat);
  rightKerb.position.set(width / 2 - kerbWidth / 2, kerbHeight / 2, 0);
  rightKerb.castShadow = true;
  group.add(rightKerb);

  // Expansion joint grooves across the concrete at 2m intervals
  const jointGeo = new THREE.BoxGeometry(width - kerbWidth * 2, 0.015, 0.025);
  const jointMat = createMat(0x4b5563, 0.1, 0.9);
  const steps = Math.floor(length / 2);
  for (let i = -steps / 2; i <= steps / 2; i++) {
    const joint = new THREE.Mesh(jointGeo, jointMat);
    joint.position.set(0, height + 0.005, i * 2.0);
    group.add(joint);
  }

  // Tactile yellow paving strip along one side for accessibility
  const tactileGeo = new THREE.BoxGeometry(0.35, 0.015, length * 0.95);
  const tactileMat = createMat(0xf59e0b, 0.2, 0.6); // Safety amber
  const tactile = new THREE.Mesh(tactileGeo, tactileMat);
  tactile.position.set(-width / 4, height + 0.008, 0);
  group.add(tactile);

  root.add(group);
}

export function buildSidewalkInterlock(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 3.0;
  const height = Math.max(0.2, sy * 0.25);
  const length = sz * 8.0;

  // Base foundation slab
  const baseGeo = new THREE.BoxGeometry(width, height, length);
  const baseMat = createMat(0x94a3b8, 0.05, 0.8);
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = height / 2;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Decorative interlocking pavers (terracotta & gray brick sections)
  const rows = Math.min(16, Math.floor(length / 0.5));
  const cols = Math.min(6, Math.floor(width / 0.5));
  const brickW = (width - 0.3) / cols;
  const brickL = length / rows;
  const brickGeo = new THREE.BoxGeometry(brickW * 0.94, 0.02, brickL * 0.94);

  const matRed = createMat(0xb91c1c, 0.1, 0.8); // Terracotta red brick
  const matGray = createMat(0x64748b, 0.1, 0.85); // Slate gray brick
  const matSand = createMat(0xd97706, 0.1, 0.8); // Warm amber brick

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isAlt = (r + c) % 3 === 0 ? matRed : (r + c) % 2 === 0 ? matSand : matGray;
      const brick = new THREE.Mesh(brickGeo, isAlt);
      const bx = -width / 2 + 0.15 + c * brickW + brickW / 2;
      const bz = -length / 2 + r * brickL + brickL / 2;
      brick.position.set(bx, height + 0.01, bz);
      group.add(brick);
    }
  }

  // Precast curbs
  const curbGeo = new THREE.BoxGeometry(0.15, height + 0.06, length);
  const curbMat = createMat(0x475569, 0.1, 0.7);
  const curbL = new THREE.Mesh(curbGeo, curbMat);
  curbL.position.set(-width / 2 + 0.075, (height + 0.06) / 2, 0);
  const curbR = new THREE.Mesh(curbGeo, curbMat);
  curbR.position.set(width / 2 - 0.075, (height + 0.06) / 2, 0);
  group.add(curbL, curbR);

  root.add(group);
}

export function buildSidewalkKerbstone(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 2.5;
  const height = Math.max(0.22, sy * 0.3);
  const length = sz * 8.0;

  // Main concrete pavement
  const slabGeo = new THREE.BoxGeometry(width, height, length);
  const slabMat = createMat(0xe2e8f0, 0.05, 0.8);
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = height / 2;
  slab.receiveShadow = true;
  group.add(slab);

  // Alternating Yellow & Black safety kerbstones on the curb line
  const blockL = 0.6;
  const blockW = 0.2;
  const blockH = height + 0.1;
  const kerbBlockGeo = new THREE.BoxGeometry(blockW, blockH, blockL * 0.95);
  const yellowMat = createMat(0xeab308, 0.2, 0.6); // Safety yellow
  const blackMat = createMat(0x1e293b, 0.1, 0.7); // Dark black/slate

  const count = Math.floor(length / blockL);
  for (let i = 0; i < count; i++) {
    const mat = i % 2 === 0 ? yellowMat : blackMat;
    const zPos = -length / 2 + i * blockL + blockL / 2;

    const blockLft = new THREE.Mesh(kerbBlockGeo, mat);
    blockLft.position.set(-width / 2 + blockW / 2, blockH / 2, zPos);
    blockLft.castShadow = true;
    group.add(blockLft);

    const blockRgt = new THREE.Mesh(kerbBlockGeo, mat);
    blockRgt.position.set(width / 2 - blockW / 2, blockH / 2, zPos);
    blockRgt.castShadow = true;
    group.add(blockRgt);
  }

  root.add(group);
}

export function buildCoveredWalkway(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 3.2;
  const height = sy * 3.2;
  const length = sz * 9.0;

  // Base walkway floor
  const floorGeo = new THREE.BoxGeometry(width, 0.18, length);
  const floorMat = createMat(0xe2e8f0, 0.1, 0.7);
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = 0.09;
  floor.receiveShadow = true;
  group.add(floor);

  // Modern structural steel arch frames (columns + curved canopy rafters)
  const steelMat = createMat(0x334155, 0.6, 0.3); // Architectural dark steel
  const frameCount = Math.max(3, Math.floor(length / 2.5));
  const colGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 12);

  for (let i = 0; i <= frameCount; i++) {
    const z = -length / 2 + (i * length) / frameCount;

    // Left column
    const colL = new THREE.Mesh(colGeo, steelMat);
    colL.position.set(-width / 2 + 0.15, height / 2, z);
    colL.castShadow = true;
    group.add(colL);

    // Right column
    const colR = new THREE.Mesh(colGeo, steelMat);
    colR.position.set(width / 2 - 0.15, height / 2, z);
    colR.castShadow = true;
    group.add(colR);

    // Cross beam / curved arch
    const archGeo = new THREE.BoxGeometry(width, 0.08, 0.08);
    const arch = new THREE.Mesh(archGeo, steelMat);
    arch.position.set(0, height, z);
    group.add(arch);
  }

  // Translucent curved polycarbonate awning roof
  const roofCurve = new THREE.CylinderGeometry(
    width * 0.75,
    width * 0.75,
    length * 1.02,
    24,
    1,
    true,
    Math.PI * 0.25,
    Math.PI * 0.5
  );
  roofCurve.rotateZ(Math.PI / 2);
  roofCurve.rotateY(Math.PI / 2);
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8, // Sky blue tint
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const canopy = new THREE.Mesh(roofCurve, canopyMat);
  canopy.position.set(0, height + 0.3, 0);
  canopy.castShadow = true;
  group.add(canopy);

  // Continuous LED light strip running down the center ceiling
  const stripGeo = new THREE.BoxGeometry(0.1, 0.03, length * 0.95);
  const stripMat = new THREE.MeshStandardMaterial({
    color: isNight && isLightsOn ? 0xfef08a : 0xffffff,
    emissive: isNight && isLightsOn ? 0xfef08a : 0x000000,
    emissiveIntensity: isNight && isLightsOn ? 1.8 : 0,
  });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.set(0, height - 0.02, 0);
  group.add(strip);

  root.add(group);
}

export function buildAccessibleRamp(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 2.0;
  const targetHeight = sy * 0.9;
  const length = sz * 6.0;

  // Sloping ramp wedge geometry
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(length, targetHeight);
  shape.lineTo(length, 0);
  shape.closePath();

  const extrudeSettings = { steps: 1, depth: width, bevelEnabled: false };
  const rampGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  rampGeo.rotateY(Math.PI / 2);
  const rampMat = createMat(0xd1d5db, 0.1, 0.8);
  const ramp = new THREE.Mesh(rampGeo, rampMat);
  ramp.position.set(-width / 2, 0, length / 2);
  ramp.receiveShadow = true;
  group.add(ramp);

  // Double-tier Stainless Steel Handrails
  const railMat = createMat(0xe2e8f0, 0.9, 0.2); // Polished stainless steel
  const postCount = 5;
  for (let i = 0; i <= postCount; i++) {
    const t = i / postCount;
    const z = -length / 2 + t * length;
    const yGround = t * targetHeight;
    const postH = 0.95;

    const postGeo = new THREE.CylinderGeometry(0.025, 0.025, postH, 8);

    // Left post
    const postL = new THREE.Mesh(postGeo, railMat);
    postL.position.set(-width / 2 + 0.08, yGround + postH / 2, z);
    postL.castShadow = true;
    group.add(postL);

    // Right post
    const postR = new THREE.Mesh(postGeo, railMat);
    postR.position.set(width / 2 - 0.08, yGround + postH / 2, z);
    postR.castShadow = true;
    group.add(postR);
  }

  // Sloping upper and lower handrail tubes
  const railLen = Math.sqrt(length * length + targetHeight * targetHeight);
  const railAngle = Math.atan2(targetHeight, length);
  const railTubeGeo = new THREE.CylinderGeometry(0.025, 0.025, railLen, 12);
  railTubeGeo.rotateX(Math.PI / 2 + railAngle);

  // Top handrail Left & Right (height 0.9m)
  const topRailL = new THREE.Mesh(railTubeGeo, railMat);
  topRailL.position.set(-width / 2 + 0.08, targetHeight / 2 + 0.9, 0);
  const topRailR = new THREE.Mesh(railTubeGeo, railMat);
  topRailR.position.set(width / 2 - 0.08, targetHeight / 2 + 0.9, 0);
  group.add(topRailL, topRailR);

  // Middle safety rail Left & Right (height 0.55m)
  const midRailL = new THREE.Mesh(railTubeGeo, railMat);
  midRailL.position.set(-width / 2 + 0.08, targetHeight / 2 + 0.55, 0);
  const midRailR = new THREE.Mesh(railTubeGeo, railMat);
  midRailR.position.set(width / 2 - 0.08, targetHeight / 2 + 0.55, 0);
  group.add(midRailL, midRailR);

  // Yellow warning tactile pad at the bottom landing
  const padGeo = new THREE.BoxGeometry(width * 0.9, 0.015, 0.8);
  const padMat = createMat(0xf59e0b, 0.2, 0.6);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.set(0, 0.008, -length / 2 - 0.4);
  group.add(pad);

  root.add(group);
}

// -------------------------------------------------------------
// 2. سواري الأعلام (Flagpoles & Standards)
// -------------------------------------------------------------

export function buildFlagpoleSingle(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const height = sy * 10.0; // 10m high mast

  // Tiered Dark Granite Plinth Base
  const baseMat = createMat(0x1e293b, 0.3, 0.4); // Polished dark granite
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(sx * 1.6, 0.25, sz * 1.6), baseMat);
  tier1.position.y = 0.125;
  tier1.receiveShadow = true;
  group.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(sx * 1.2, 0.3, sz * 1.2), baseMat);
  tier2.position.y = 0.4;
  tier2.receiveShadow = true;
  group.add(tier2);

  const brassCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.25, 16),
    createMat(0xd97706, 0.8, 0.2) // Brass
  );
  brassCollar.position.y = 0.65;
  group.add(brassCollar);

  // Tapered polished chrome flagpole mast
  const mastGeo = new THREE.CylinderGeometry(0.05, 0.12, height, 16);
  const mastMat = createMat(0xf1f5f9, 0.95, 0.15); // Chrome finish
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.y = height / 2 + 0.65;
  mast.castShadow = true;
  group.add(mast);

  // Golden finial sphere at the summit
  const finialGeo = new THREE.SphereGeometry(0.16, 16, 16);
  const finialMat = createMat(0xf59e0b, 0.9, 0.15); // Gold
  const finial = new THREE.Mesh(finialGeo, finialMat);
  finial.position.y = height + 0.75;
  group.add(finial);

  // Iraqi National Flag (3 bands: Red, White with "الله أكبر", Black)
  const flagW = 2.4 * sx;
  const flagH = 1.6 * sy;
  const flagGroup = new THREE.Group();

  // Waving sinusoidal geometry for dynamic flag realism
  const flagSegmentsX = 16;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH, flagSegmentsX, 6);
  const posAttr = flagGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const xVal = posAttr.getX(i);
    // Sine wave displacement along X
    const zOffset = Math.sin((xVal / flagW) * Math.PI * 2.5) * 0.18 * (xVal / flagW + 0.5);
    posAttr.setZ(i, zOffset);
  }
  flagGeo.computeVertexNormals();

  // Flag stripes
  const stripeH = flagH / 3;

  // Red top stripe
  const redGeo = new THREE.PlaneGeometry(flagW, stripeH, flagSegmentsX, 2);
  const redMat = new THREE.MeshStandardMaterial({ color: 0xce1126, roughness: 0.6, side: THREE.DoubleSide });
  const redMesh = new THREE.Mesh(redGeo, redMat);
  redMesh.position.set(flagW / 2 + 0.05, stripeH, 0);
  flagGroup.add(redMesh);

  // White middle stripe
  const whiteGeo = new THREE.PlaneGeometry(flagW, stripeH, flagSegmentsX, 2);
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide });
  const whiteMesh = new THREE.Mesh(whiteGeo, whiteMat);
  whiteMesh.position.set(flagW / 2 + 0.05, 0, 0);
  flagGroup.add(whiteMesh);

  // Green Takbir center badge ("الله أكبر")
  const takbirGeo = new THREE.PlaneGeometry(flagW * 0.45, stripeH * 0.55);
  const takbirMat = new THREE.MeshStandardMaterial({
    color: 0x007a3d, // Islamic green
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  const takbirMesh = new THREE.Mesh(takbirGeo, takbirMat);
  takbirMesh.position.set(flagW / 2 + 0.05, 0, 0.01);
  flagGroup.add(takbirMesh);

  // Black bottom stripe
  const blackGeo = new THREE.PlaneGeometry(flagW, stripeH, flagSegmentsX, 2);
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6, side: THREE.DoubleSide });
  const blackMesh = new THREE.Mesh(blackGeo, blackMat);
  blackMesh.position.set(flagW / 2 + 0.05, -stripeH, 0);
  flagGroup.add(blackMesh);

  flagGroup.position.set(0, height + 0.65 - flagH / 2 - 0.1, 0);
  flagGroup.rotation.y = Math.PI * 0.15; // Realistic wind angle
  group.add(flagGroup);

  // Base ground spotlight aiming up at the flag
  const spotGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.2, 12);
  const spotMat = createMat(0x0f172a, 0.8, 0.3);
  const spot = new THREE.Mesh(spotGeo, spotMat);
  spot.position.set(0.6, 0.4, 0.6);
  spot.rotation.x = Math.PI * 0.2;
  spot.rotation.z = -Math.PI * 0.2;
  group.add(spot);

  if (isNight && isLightsOn) {
    const light = new THREE.PointLight(0xfffbeb, 2.5, 16);
    light.position.set(0.6, 1.2, 0.6);
    group.add(light);
  }

  root.add(group);
}

export function buildFlagpoleTriple(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 4.5;
  const mainH = sy * 10.5;

  // Stately stepped white marble podium
  const marbleMat = createMat(0xf8fafc, 0.1, 0.25); // White Italian marble
  const base1 = new THREE.Mesh(new THREE.BoxGeometry(width, 0.3, sz * 2.0), marbleMat);
  base1.position.y = 0.15;
  base1.receiveShadow = true;
  group.add(base1);

  const base2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.3, sz * 1.5), marbleMat);
  base2.position.y = 0.45;
  base2.receiveShadow = true;
  group.add(base2);

  // Three Flagpoles (Center: National Flag, Flanks: Ministry & Company Banners)
  const mastMat = createMat(0xf1f5f9, 0.95, 0.15);
  const finialMat = createMat(0xf59e0b, 0.9, 0.15);

  const poles = [
    { x: -width * 0.3, h: mainH * 0.92, flagColor: 0x0284c7 }, // Left: Oil Ministry blue
    { x: 0, h: mainH, flagColor: 0xce1126 }, // Center: National Flag
    { x: width * 0.3, h: mainH * 0.92, flagColor: 0x059669 }, // Right: Corporate Green
  ];

  poles.forEach((p) => {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.11, p.h, 16), mastMat);
    mast.position.set(p.x, p.h / 2 + 0.6, 0);
    mast.castShadow = true;
    group.add(mast);

    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), finialMat);
    finial.position.set(p.x, p.h + 0.7, 0);
    group.add(finial);

    // Protocol Banner
    const bannerW = 2.0 * sx;
    const bannerH = 1.3 * sy;
    const bannerGeo = new THREE.PlaneGeometry(bannerW, bannerH, 8, 4);
    const bannerMat = new THREE.MeshStandardMaterial({ color: p.flagColor, roughness: 0.6, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(p.x + bannerW / 2 + 0.05, p.h + 0.6 - bannerH / 2 - 0.1, 0);
    banner.rotation.y = Math.PI * 0.12;
    group.add(banner);
  });

  if (isNight && isLightsOn) {
    const podLight = new THREE.PointLight(0xfffbeb, 2.0, 14);
    podLight.position.set(0, 1.5, 1.2);
    group.add(podLight);
  }

  root.add(group);
}

export function buildFlagpoleWall(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const poleLen = sy * 3.2;

  // Wall Mounting Plate
  const plateGeo = new THREE.BoxGeometry(sx * 0.35, sy * 0.45, 0.05);
  const plateMat = createMat(0x334155, 0.7, 0.3);
  const plate = new THREE.Mesh(plateGeo, plateMat);
  plate.position.set(0, 0, 0.025);
  group.add(plate);

  // 4 Hex Anchor Bolts
  const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.04, 6);
  boltGeo.rotateX(Math.PI / 2);
  const boltMat = createMat(0x94a3b8, 0.8, 0.2);
  [
    [-0.12, 0.15],
    [0.12, 0.15],
    [-0.12, -0.15],
    [0.12, -0.15],
  ].forEach(([bx, by]) => {
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(bx, by, 0.05);
    group.add(bolt);
  });

  // Angled Socket (45 degrees)
  const socketGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.25, 12);
  socketGeo.rotateX(Math.PI * 0.25);
  const socket = new THREE.Mesh(socketGeo, plateMat);
  socket.position.set(0, 0, 0.12);
  group.add(socket);

  // Angled Mast
  const mastGeo = new THREE.CylinderGeometry(0.025, 0.035, poleLen, 12);
  mastGeo.rotateX(Math.PI * 0.25);
  const mastMat = createMat(0xe2e8f0, 0.9, 0.2);
  const mast = new THREE.Mesh(mastGeo, mastMat);
  const midDist = (poleLen / 2) * Math.sin(Math.PI * 0.25);
  mast.position.set(0, midDist, midDist + 0.1);
  mast.castShadow = true;
  group.add(mast);

  // Hanging Flag
  const flagW = 1.4 * sx;
  const flagH = 0.9 * sy;
  const flagGeo = new THREE.PlaneGeometry(flagW, flagH);
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xce1126, roughness: 0.6, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  const tipY = poleLen * Math.sin(Math.PI * 0.25);
  const tipZ = poleLen * Math.cos(Math.PI * 0.25);
  flag.position.set(flagW / 2 + 0.02, tipY - flagH / 2 - 0.1, tipZ);
  flag.rotation.y = Math.PI * 0.08;
  group.add(flag);

  root.add(group);
}

// -------------------------------------------------------------
// 3. اللافتات واللوحات الإرشادية (Signboards & Signage)
// -------------------------------------------------------------

export function buildSignMonument(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 3.6;
  const height = sy * 2.2;
  const depth = sz * 0.9;

  // Concrete footing foundation
  const footGeo = new THREE.BoxGeometry(width * 1.1, 0.2, depth * 1.2);
  const footMat = createMat(0x64748b, 0.1, 0.8);
  const foot = new THREE.Mesh(footGeo, footMat);
  foot.position.y = 0.1;
  foot.receiveShadow = true;
  group.add(foot);

  // Dark Granite Monolithic Block
  const blockGeo = new THREE.BoxGeometry(width, height, depth);
  const blockMat = createMat(0x1e293b, 0.3, 0.35); // Polished charcoal granite
  const block = new THREE.Mesh(blockGeo, blockMat);
  block.position.y = height / 2 + 0.2;
  block.castShadow = true;
  group.add(block);

  // Brushed Bronze / Gold Inscribed Sign Face Plaque
  const plaqueGeo = new THREE.BoxGeometry(width * 0.85, height * 0.65, 0.04);
  const plaqueMat = createMat(0xd97706, 0.85, 0.25); // Brushed Bronze
  const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaque.position.set(0, height / 2 + 0.25, depth / 2 + 0.02);
  group.add(plaque);

  // Raised Lettering Emblem Bars (Arabic official crest representation)
  const lineMat = createMat(0xffedd5, 0.9, 0.2);
  [-0.3, 0.0, 0.3].forEach((yOff, idx) => {
    const barGeo = new THREE.BoxGeometry(width * (0.75 - idx * 0.15), 0.08, 0.02);
    const bar = new THREE.Mesh(barGeo, lineMat);
    bar.position.set(0, height / 2 + 0.25 + yOff, depth / 2 + 0.045);
    group.add(bar);
  });

  // Top Architectural Coping Stone
  const capGeo = new THREE.BoxGeometry(width * 1.04, 0.1, depth * 1.08);
  const capMat = createMat(0xf8fafc, 0.2, 0.4);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = height + 0.25;
  group.add(cap);

  // Recessed ground uplights illuminating sign face
  [-width * 0.3, width * 0.3].forEach((lx) => {
    const lightFixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.1, 12),
      createMat(0x0f172a, 0.7, 0.3)
    );
    lightFixture.position.set(lx, 0.2, depth / 2 + 0.45);
    group.add(lightFixture);
  });

  if (isNight && isLightsOn) {
    const signLight = new THREE.PointLight(0xfef08a, 2.2, 8);
    signLight.position.set(0, height * 0.6, depth / 2 + 0.8);
    group.add(signLight);
  }

  root.add(group);
}

export function buildSignWayfinding(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const height = sy * 3.2;

  // Concrete Base Post Support
  const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16);
  const baseMat = createMat(0x64748b, 0.1, 0.8);
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.15;
  group.add(baseMesh);

  // Central Sturdy Steel Mast
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, height, 16);
  const poleMat = createMat(0x334155, 0.8, 0.25);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = height / 2 + 0.3;
  pole.castShadow = true;
  group.add(pole);

  // 4 Directional Chevron Arrow Placards
  const chevronConfigs = [
    { y: height * 0.88, angle: 0, color: 0x0284c7, textLen: 1.1 }, // Blue
    { y: height * 0.75, angle: Math.PI * 0.5, color: 0x059669, textLen: 0.95 }, // Green
    { y: height * 0.62, angle: Math.PI, color: 0xd97706, textLen: 1.05 }, // Amber
    { y: height * 0.49, angle: -Math.PI * 0.5, color: 0xdc2626, textLen: 0.85 }, // Red
  ];

  chevronConfigs.forEach((cfg) => {
    const placardGroup = new THREE.Group();
    const pWidth = cfg.textLen * sx;
    const pHeight = 0.22 * sy;

    const placardGeo = new THREE.BoxGeometry(pWidth, pHeight, 0.03);
    const placardMat = createMat(cfg.color, 0.2, 0.6);
    const placard = new THREE.Mesh(placardGeo, placardMat);
    placard.position.set(pWidth / 2 + 0.08, 0, 0);
    placardGroup.add(placard);

    // Directional Arrow Tip (Triangle Chevron)
    const arrowGeo = new THREE.ConeGeometry(0.14, 0.22, 3);
    arrowGeo.rotateZ(-Math.PI / 2);
    const arrow = new THREE.Mesh(arrowGeo, placardMat);
    arrow.position.set(pWidth + 0.14, 0, 0);
    placardGroup.add(arrow);

    // White text strip indicator
    const textGeo = new THREE.BoxGeometry(pWidth * 0.75, 0.08, 0.04);
    const textMat = createMat(0xffffff, 0.1, 0.3);
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.set(pWidth / 2 + 0.05, 0, 0.01);
    placardGroup.add(textMesh);

    placardGroup.position.set(0, cfg.y, 0);
    placardGroup.rotation.y = cfg.angle;
    group.add(placardGroup);
  });

  root.add(group);
}

export function buildSignSafetyHSE(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 2.4;
  const height = sy * 2.6;

  // Dual Structural Posts
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, height, 12);
  const postMat = createMat(0x475569, 0.7, 0.3);

  const postL = new THREE.Mesh(postGeo, postMat);
  postL.position.set(-width / 2 + 0.1, height / 2, 0);
  postL.castShadow = true;
  group.add(postL);

  const postR = new THREE.Mesh(postGeo, postMat);
  postR.position.set(width / 2 - 0.1, height / 2, 0);
  postR.castShadow = true;
  group.add(postR);

  // Safety Board (Industrial Yellow with Black Safety Striping)
  const boardH = height * 0.65;
  const boardGeo = new THREE.BoxGeometry(width, boardH, 0.04);
  const boardMat = createMat(0xfacc15, 0.15, 0.5); // Safety Yellow
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, height * 0.65, 0);
  board.castShadow = true;
  group.add(board);

  // Diagonal Hazard Caution Stripes on header & footer
  const stripeH = 0.12;
  const stripeGeo = new THREE.BoxGeometry(width, stripeH, 0.045);
  const stripeMat = createMat(0x0f172a, 0.1, 0.8); // Black
  const topStripe = new THREE.Mesh(stripeGeo, stripeMat);
  topStripe.position.set(0, height * 0.65 + boardH / 2 - stripeH / 2, 0.005);
  const botStripe = new THREE.Mesh(stripeGeo, stripeMat);
  botStripe.position.set(0, height * 0.65 - boardH / 2 + stripeH / 2, 0.005);
  group.add(topStripe, botStripe);

  // Green HSE Safety Cross Emblem in center
  const crossMat = createMat(0x16a34a, 0.2, 0.5);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.05), crossMat);
  crossV.position.set(-width * 0.3, height * 0.65, 0.01);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.05), crossMat);
  crossH.position.set(-width * 0.3, height * 0.65, 0.01);
  group.add(crossV, crossH);

  // White instructional text blocks on sign
  const textMat = createMat(0x1e293b, 0.1, 0.7);
  [-0.15, 0.0, 0.15].forEach((yOff) => {
    const textLine = new THREE.Mesh(new THREE.BoxGeometry(width * 0.45, 0.06, 0.05), textMat);
    textLine.position.set(width * 0.15, height * 0.65 + yOff, 0.01);
    group.add(textLine);
  });

  root.add(group);
}

export function buildSignDigitalLED(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 3.8;
  const height = sy * 3.6;
  const depth = sz * 0.6;

  // Concrete Pylon Footing
  const foot = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, 0.3, depth * 1.4), createMat(0x64748b, 0.1, 0.8));
  foot.position.y = 0.15;
  group.add(foot);

  // Dual Structural Steel Support Pylons
  const pylonMat = createMat(0x1e293b, 0.6, 0.3);
  const pylonGeo = new THREE.BoxGeometry(0.2, height * 0.55, depth * 0.8);
  const pylonL = new THREE.Mesh(pylonGeo, pylonMat);
  pylonL.position.set(-width * 0.3, height * 0.28, 0);
  const pylonR = new THREE.Mesh(pylonGeo, pylonMat);
  pylonR.position.set(width * 0.3, height * 0.28, 0);
  group.add(pylonL, pylonR);

  // Main Digital Enclosure Box
  const screenH = height * 0.5;
  const frameGeo = new THREE.BoxGeometry(width, screenH, depth);
  const frameMat = createMat(0x0f172a, 0.8, 0.2); // Carbon black aluminum
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, height * 0.72, 0);
  frame.castShadow = true;
  group.add(frame);

  // High-Brightness LED Matrix Face
  const ledGeo = new THREE.PlaneGeometry(width * 0.94, screenH * 0.9);
  const ledMat = new THREE.MeshStandardMaterial({
    color: isNight && isLightsOn ? 0xf59e0b : 0x1e293b,
    emissive: isNight && isLightsOn ? 0xf59e0b : 0x0369a1,
    emissiveIntensity: isNight && isLightsOn ? 2.5 : 0.8,
    roughness: 0.1,
  });
  const ledScreen = new THREE.Mesh(ledGeo, ledMat);
  ledScreen.position.set(0, height * 0.72, depth / 2 + 0.01);
  group.add(ledScreen);

  // Top Solar Panel for Eco Telemetry
  const solarRoof = new THREE.Mesh(new THREE.BoxGeometry(width * 1.05, 0.08, depth * 1.5), createMat(0x0369a1, 0.8, 0.2));
  solarRoof.position.set(0, height * 0.72 + screenH / 2 + 0.05, 0);
  group.add(solarRoof);

  root.add(group);
}

export function buildSignAssemblyPoint(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const height = sy * 3.0;

  // Post
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, height, 12),
    createMat(0x15803d, 0.4, 0.4) // Powder green
  );
  post.position.y = height / 2;
  post.castShadow = true;
  group.add(post);

  // Standard Green ISO 7010 Assembly Point Board
  const boardSize = sx * 0.9;
  const boardGeo = new THREE.BoxGeometry(boardSize, boardSize, 0.03);
  const boardMat = createMat(0x16a34a, 0.2, 0.5); // ISO Emergency Green
  const board = new THREE.Mesh(boardGeo, boardMat);
  board.position.set(0, height - boardSize / 2, 0);
  board.castShadow = true;
  group.add(board);

  // White Inward Pointing Arrows on four corners
  const arrowMat = createMat(0xffffff, 0.1, 0.3);
  const arrowGeo = new THREE.ConeGeometry(0.08, 0.14, 3);

  [
    [-0.25, 0.25, -Math.PI * 0.25],
    [0.25, 0.25, Math.PI * 0.25],
    [-0.25, -0.25, -Math.PI * 0.75],
    [0.25, -0.25, Math.PI * 0.75],
  ].forEach(([ax, ay, rot]) => {
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.position.set(ax, height - boardSize / 2 + ay, 0.02);
    arrow.rotation.z = rot;
    group.add(arrow);
  });

  // Center Silhouette figures
  const centerFig = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.03), arrowMat);
  centerFig.position.set(0, height - boardSize / 2, 0.02);
  group.add(centerFig);

  root.add(group);
}

// -------------------------------------------------------------
// 4. المعدات والمنظومات التشغيلية (Heavy Equipment & Utilities)
// -------------------------------------------------------------

export function buildGeneratorDiesel(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 3.4;
  const height = sy * 2.2;
  const depth = sz * 1.8;

  // Heavy Duty Skid Base with fork pockets
  const skidH = 0.25;
  const skidGeo = new THREE.BoxGeometry(width * 1.05, skidH, depth * 1.05);
  const skidMat = createMat(0x0f172a, 0.8, 0.3); // Structural steel black
  const skid = new THREE.Mesh(skidGeo, skidMat);
  skid.position.y = skidH / 2;
  skid.receiveShadow = true;
  group.add(skid);

  // Forklift pockets through the skid
  const pocketGeo = new THREE.BoxGeometry(0.3, 0.14, depth * 1.08);
  const pocketMat = createMat(0x020617, 0.9, 0.5);
  [-width * 0.25, width * 0.25].forEach((px) => {
    const pocket = new THREE.Mesh(pocketGeo, pocketMat);
    pocket.position.set(px, skidH / 2, 0);
    group.add(pocket);
  });

  // Acoustic Soundproof Canopy Enclosure (Industrial Green / Yellow steel)
  const canopyH = height - skidH;
  const canopyGeo = new THREE.BoxGeometry(width, canopyH, depth);
  const canopyMat = createMat(0x15803d, 0.4, 0.45); // Industrial Diesel Green
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.y = skidH + canopyH / 2;
  canopy.castShadow = true;
  group.add(canopy);

  // Intake Air Louver Grilles on Front & Radiator Louver on Rear
  const louverMat = createMat(0x1e293b, 0.6, 0.4);
  const frontLouver = new THREE.Mesh(new THREE.BoxGeometry(0.04, canopyH * 0.7, depth * 0.8), louverMat);
  frontLouver.position.set(-width / 2 - 0.01, skidH + canopyH / 2, 0);
  const rearLouver = new THREE.Mesh(new THREE.BoxGeometry(0.04, canopyH * 0.7, depth * 0.8), louverMat);
  rearLouver.position.set(width / 2 + 0.01, skidH + canopyH / 2, 0);
  group.add(frontLouver, rearLouver);

  // Top Exhaust Muffler & Silencer with Rain Cap
  const mufflerGeo = new THREE.CylinderGeometry(0.18, 0.18, depth * 0.6, 16);
  mufflerGeo.rotateZ(Math.PI / 2);
  const mufflerMat = createMat(0x475569, 0.9, 0.2); // Stainless heat steel
  const muffler = new THREE.Mesh(mufflerGeo, mufflerMat);
  muffler.position.set(0, height + 0.15, 0);
  group.add(muffler);

  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 12), mufflerMat);
  exhaustPipe.position.set(0, height + 0.45, -depth * 0.2);
  group.add(exhaustPipe);

  // Rain Cap Flap
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.24), mufflerMat);
  flap.position.set(0, height + 0.76, -depth * 0.2);
  flap.rotation.x = Math.PI * 0.15;
  group.add(flap);

  // Recessed Digital Control Panel with Viewing Glass
  const panelDoor = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.05), createMat(0x0f172a, 0.7, 0.3));
  panelDoor.position.set(width * 0.25, skidH + canopyH * 0.6, depth / 2 + 0.01);
  group.add(panelDoor);

  const glassScreen = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.35, 0.06),
    new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: isNight && isLightsOn ? 0x0284c7 : 0x000000,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    })
  );
  glassScreen.position.set(width * 0.25, skidH + canopyH * 0.65, depth / 2 + 0.02);
  group.add(glassScreen);

  // Emergency Stop Palm Button (Red mushroom push)
  const eStop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), createMat(0xdc2626, 0.2, 0.4));
  eStop.rotateX(Math.PI / 2);
  eStop.position.set(width * 0.25 - 0.25, skidH + canopyH * 0.6, depth / 2 + 0.04);
  group.add(eStop);

  root.add(group);
}

export function buildFuelTank(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const radius = sy * 0.9;
  const length = sx * 3.8;

  // Dual Concrete Support Saddles
  const saddleGeo = new THREE.BoxGeometry(0.4, 0.6, radius * 2.2);
  const saddleMat = createMat(0x64748b, 0.1, 0.8);
  const saddleL = new THREE.Mesh(saddleGeo, saddleMat);
  saddleL.position.set(-length * 0.3, 0.3, 0);
  const saddleR = new THREE.Mesh(saddleGeo, saddleMat);
  saddleR.position.set(length * 0.3, 0.3, 0);
  group.add(saddleL, saddleR);

  // Horizontal Cylindrical Steel Vessel
  const vesselGeo = new THREE.CylinderGeometry(radius, radius, length, 24);
  vesselGeo.rotateZ(Math.PI / 2);
  const vesselMat = createMat(0xe2e8f0, 0.7, 0.3); // Heavy painted steel
  const vessel = new THREE.Mesh(vesselGeo, vesselMat);
  vessel.position.y = radius + 0.4;
  vessel.castShadow = true;
  group.add(vessel);

  // Domed Ends (Hemispheres)
  const domeMat = createMat(0xe2e8f0, 0.7, 0.3);
  const domeL = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  domeL.rotateZ(Math.PI / 2);
  domeL.position.set(-length / 2, radius + 0.4, 0);
  const domeR = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  domeR.rotateZ(-Math.PI / 2);
  domeR.position.set(length / 2, radius + 0.4, 0);
  group.add(domeL, domeR);

  // Top Access Manhole with Domed Cover
  const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16), createMat(0x334155, 0.8, 0.3));
  manhole.position.set(0, radius * 2 + 0.45, 0);
  group.add(manhole);

  // Atmospheric Gooseneck Breather Vent Pipe
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 12), createMat(0xd97706, 0.7, 0.3));
  pipe.position.set(length * 0.25, radius * 2 + 0.75, 0);
  group.add(pipe);

  // Fuel Level Sight Glass Gauge tube
  const gauge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, radius * 1.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
  );
  gauge.position.set(length / 2 + 0.05, radius + 0.4, 0);
  group.add(gauge);

  root.add(group);
}

export function buildTransformerSubstation(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 3.6;
  const height = sy * 2.8;
  const depth = sz * 3.0;

  // Reinforced Concrete Pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), createMat(0x64748b, 0.1, 0.8));
  pad.position.y = 0.1;
  pad.receiveShadow = true;
  group.add(pad);

  // Main Transformer Core Tank (Heavy gray metal)
  const tankW = width * 0.55;
  const tankH = height * 0.65;
  const tankD = depth * 0.5;
  const tankGeo = new THREE.BoxGeometry(tankW, tankH, tankD);
  const tankMat = createMat(0x475569, 0.6, 0.35);
  const tank = new THREE.Mesh(tankGeo, tankMat);
  tank.position.set(0, 0.2 + tankH / 2, 0);
  tank.castShadow = true;
  group.add(tank);

  // Corrugated Cooling Radiator Fins on both flanks
  const finCount = 8;
  const finMat = createMat(0x334155, 0.5, 0.4);
  for (let i = 0; i < finCount; i++) {
    const finZ = -tankD / 2 + (i * tankD) / (finCount - 1);
    const finL = new THREE.Mesh(new THREE.BoxGeometry(0.3, tankH * 0.8, 0.03), finMat);
    finL.position.set(-tankW / 2 - 0.15, 0.2 + tankH / 2, finZ);
    const finR = new THREE.Mesh(new THREE.BoxGeometry(0.3, tankH * 0.8, 0.03), finMat);
    finR.position.set(tankW / 2 + 0.15, 0.2 + tankH / 2, finZ);
    group.add(finL, finR);
  }

  // Overhead Oil Conservator Drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, tankW * 0.85, 16), tankMat);
  drum.rotateZ(Math.PI / 2);
  drum.position.set(0, 0.2 + tankH + 0.35, -tankD * 0.2);
  group.add(drum);

  // 3 High-Voltage Ribbed Ceramic Bushings on top
  const bushingMat = createMat(0x991b1b, 0.8, 0.2); // Terracotta insulator glaze
  [-tankW * 0.25, 0, tankW * 0.25].forEach((bx) => {
    const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.65, 12), bushingMat);
    bushing.position.set(bx, 0.2 + tankH + 0.32, tankD * 0.2);
    group.add(bushing);

    // Spark arrestor horn tip
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 8), createMat(0xf59e0b, 0.9, 0.1));
    horn.position.set(bx, 0.2 + tankH + 0.7, tankD * 0.2);
    group.add(horn);
  });

  // Perimeter Chain-Link Security Fence with Yellow Danger Sign
  const fenceMat = createMat(0x94a3b8, 0.7, 0.4, true, 0.45);
  const fenceGeo = new THREE.BoxGeometry(width * 0.96, height * 0.75, depth * 0.96);
  const fence = new THREE.Mesh(fenceGeo, fenceMat);
  fence.position.y = (height * 0.75) / 2 + 0.2;
  group.add(fence);

  // Yellow Danger High Voltage Warning Sign
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.02), createMat(0xfacc15, 0.2, 0.5));
  sign.position.set(0, height * 0.55, depth * 0.49);
  group.add(sign);

  root.add(group);
}

export function buildHvacChiller(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 3.8;
  const height = sy * 2.0;
  const depth = sz * 2.4;

  // Structural Base Frame & Spring Isolators
  const baseFrame = new THREE.Mesh(new THREE.BoxGeometry(width, 0.15, depth), createMat(0x1e293b, 0.8, 0.3));
  baseFrame.position.y = 0.15;
  group.add(baseFrame);

  // 4 Spring vibration isolator feet
  const springMat = createMat(0xd97706, 0.9, 0.2);
  [
    [-width * 0.45, -depth * 0.45],
    [width * 0.45, -depth * 0.45],
    [-width * 0.45, depth * 0.45],
    [width * 0.45, depth * 0.45],
  ].forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.15, 8), springMat);
    foot.position.set(fx, 0.075, fz);
    group.add(foot);
  });

  // Main Chiller Cabinet Body
  const cabGeo = new THREE.BoxGeometry(width * 0.94, height * 0.7, depth * 0.9);
  const cabMat = createMat(0xe2e8f0, 0.5, 0.4); // Clean galvanized industrial white
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.y = 0.15 + (height * 0.7) / 2;
  cab.castShadow = true;
  group.add(cab);

  // V-Bank Condenser Aluminum Fin Coils (Sloped surfaces)
  const coilMat = createMat(0x94a3b8, 0.85, 0.2);
  const leftCoil = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.04, depth * 0.4), coilMat);
  leftCoil.position.set(0, 0.15 + height * 0.55, -depth * 0.25);
  leftCoil.rotation.x = Math.PI * 0.12;
  const rightCoil = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, 0.04, depth * 0.4), coilMat);
  rightCoil.position.set(0, 0.15 + height * 0.55, depth * 0.25);
  rightCoil.rotation.x = -Math.PI * 0.12;
  group.add(leftCoil, rightCoil);

  // Twin Top Axial Condenser Fan Shrouds
  const fanRadius = Math.min(depth * 0.22, 0.55);
  const shroudMat = createMat(0x0f172a, 0.7, 0.3);
  [-width * 0.25, width * 0.25].forEach((fx) => {
    const shroud = new THREE.Mesh(new THREE.CylinderGeometry(fanRadius, fanRadius * 1.08, 0.2, 16, 1, true), shroudMat);
    shroud.position.set(fx, height + 0.15, 0);
    group.add(shroud);

    // Fan Blade Hub Cone
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), createMat(0x38bdf8, 0.6, 0.3));
    hub.position.set(fx, height + 0.15, 0);
    group.add(hub);

    // Wire Guard Dome Grill
    const grill = new THREE.Mesh(
      new THREE.SphereGeometry(fanRadius * 0.98, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      createMat(0x94a3b8, 0.8, 0.3, true, 0.6)
    );
    grill.position.set(fx, height + 0.25, 0);
    group.add(grill);
  });

  // Insulated Supply & Return Pipe Manifold connections
  const pipeMat = createMat(0x0284c7, 0.7, 0.3);
  const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), pipeMat);
  pipe1.rotateZ(Math.PI / 2);
  pipe1.position.set(width / 2 + 0.15, 0.5, -0.3);
  const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), pipeMat);
  pipe2.rotateZ(Math.PI / 2);
  pipe2.position.set(width / 2 + 0.15, 0.8, 0.3);
  group.add(pipe1, pipe2);

  root.add(group);
}

export function buildWaterTankRoof(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const radius = sx * 1.2;
  const height = sy * 2.6;

  // Steel I-Beam Dunnage Support Grillage
  const dunnageH = 0.35;
  const dunnageMat = createMat(0x334155, 0.8, 0.25);
  [-radius * 0.6, radius * 0.6].forEach((bx) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, dunnageH, radius * 2.2), dunnageMat);
    beam.position.set(bx, dunnageH / 2, 0);
    group.add(beam);
  });

  // Stainless Steel Ribbed Vertical Tank Cylinder
  const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 24);
  const cylMat = createMat(0xf1f5f9, 0.9, 0.15); // Reflective stainless steel
  const cyl = new THREE.Mesh(cylGeo, cylMat);
  cyl.position.y = dunnageH + height / 2;
  cyl.castShadow = true;
  group.add(cyl);

  // Circumferential Stiffening Rings
  const ringMat = createMat(0x94a3b8, 0.8, 0.2);
  const ringGeo = new THREE.TorusGeometry(radius + 0.02, 0.025, 8, 24);
  ringGeo.rotateX(Math.PI / 2);
  [0.25, 0.5, 0.75].forEach((t) => {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = dunnageH + height * t;
    group.add(ring);
  });

  // Conical Roof with Top Manhole Hatch
  const coneGeo = new THREE.ConeGeometry(radius * 1.05, 0.45, 24);
  const cone = new THREE.Mesh(coneGeo, cylMat);
  cone.position.y = dunnageH + height + 0.225;
  group.add(cone);

  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.15, 16), createMat(0x0f172a, 0.7, 0.3));
  hatch.position.y = dunnageH + height + 0.48;
  group.add(hatch);

  // External Caged Service Ladder
  const ladderMat = createMat(0x64748b, 0.7, 0.3);
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.35, height + 0.4, 0.05), ladderMat);
  ladder.position.set(0, (height + 0.4) / 2 + dunnageH, radius + 0.1);
  group.add(ladder);

  // Overflow discharge downpipe
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, height + 0.2, 8), createMat(0x38bdf8, 0.6, 0.3));
  pipe.position.set(radius + 0.08, (height + 0.2) / 2 + dunnageH, 0);
  group.add(pipe);

  root.add(group);
}

export function buildWaterReservoirGround(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 5.0;
  const height = sy * 1.8;
  const depth = sz * 5.0;

  // Heavy Concrete Underground/Semi-underground Reservoir Vault
  const vaultGeo = new THREE.BoxGeometry(width, height, depth);
  const vaultMat = createMat(0x94a3b8, 0.05, 0.85); // Heavy reinforced concrete
  const vault = new THREE.Mesh(vaultGeo, vaultMat);
  vault.position.y = height / 2;
  vault.receiveShadow = true;
  vault.castShadow = true;
  group.add(vault);

  // Aluminum Security Access Hatch
  const hatchGeo = new THREE.BoxGeometry(1.0, 0.12, 1.0);
  const hatchMat = createMat(0xe2e8f0, 0.8, 0.25);
  const hatch = new THREE.Mesh(hatchGeo, hatchMat);
  hatch.position.set(-width * 0.25, height + 0.06, -depth * 0.25);
  group.add(hatch);

  // 2 Gooseneck Ventilation Snorkels
  const ventMat = createMat(0x334155, 0.7, 0.3);
  [-width * 0.25, width * 0.25].forEach((vx) => {
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 12), ventMat);
    vent.position.set(vx, height + 0.35, depth * 0.25);
    group.add(vent);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), ventMat);
    cap.position.set(vx, height + 0.7, depth * 0.25);
    group.add(cap);
  });

  // Red Emergency Fire Department Suction Connection Storz Coupling
  const couplingMat = createMat(0xdc2626, 0.7, 0.3); // Safety red
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12), couplingMat);
  st.rotateZ(Math.PI / 2);
  st.position.set(width / 2 + 0.2, height * 0.6, 0);
  group.add(st);

  root.add(group);
}

export function buildTelecomTower(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const height = sy * 14.0; // 14m high lattice mast
  const baseW = sx * 2.2;
  const topW = sx * 0.8;

  // 4 Concrete Pier Footings
  const pierMat = createMat(0x64748b, 0.1, 0.8);
  const pierRadius = 0.25;
  [
    [-baseW / 2, -baseW / 2],
    [baseW / 2, -baseW / 2],
    [-baseW / 2, baseW / 2],
    [baseW / 2, baseW / 2],
  ].forEach(([px, pz]) => {
    const pier = new THREE.Mesh(new THREE.CylinderGeometry(pierRadius, pierRadius * 1.2, 0.4, 12), pierMat);
    pier.position.set(px, 0.2, pz);
    group.add(pier);
  });

  // 4 Main Structural Steel Angle Legs (Tapered from base to top)
  const steelMat = createMat(0xd1d5db, 0.8, 0.3); // Hot-dip galvanized steel
  const legLen = Math.sqrt(height * height + Math.pow((baseW - topW) / 2, 2));
  const legAngle = Math.atan2((baseW - topW) / 2, height);
  const legGeo = new THREE.CylinderGeometry(0.045, 0.06, legLen, 8);

  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];

  corners.forEach(([cx, cz]) => {
    const leg = new THREE.Mesh(legGeo, steelMat);
    leg.position.set((cx * (baseW + topW)) / 4, height / 2 + 0.4, (cz * (baseW + topW)) / 4);
    leg.rotation.z = -cx * legAngle;
    leg.rotation.x = cz * legAngle;
    leg.castShadow = true;
    group.add(leg);
  });

  // Cross Diagonal Bracing Bars up the tower
  const sectionCount = 8;
  for (let s = 1; s <= sectionCount; s++) {
    const t = s / sectionCount;
    const y = 0.4 + t * height;
    const wAtY = baseW - t * (baseW - topW);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(wAtY, 0.04, wAtY), steelMat);
    ring.position.set(0, y, 0);
    group.add(ring);
  }

  // Top Microwave Drum Dish Antenna with white radome
  const dishMat = createMat(0xf8fafc, 0.3, 0.4);
  const dishDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 24), dishMat);
  dishDrum.rotateZ(Math.PI / 2);
  dishDrum.position.set(topW / 2 + 0.45, height * 0.85, 0);
  dishDrum.castShadow = true;
  group.add(dishDrum);

  // Omnidirectional VHF/UHF Collinear Antenna Rods at apex
  const rodMat = createMat(0xe2e8f0, 0.9, 0.1);
  [-0.2, 0.2].forEach((rx) => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 8), rodMat);
    rod.position.set(rx, height + 1.2, 0);
    group.add(rod);
  });

  // FAA Aviation Obstruction Warning Flashing Red Beacon at top summit
  const beaconGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Red
    emissive: 0xef4444,
    emissiveIntensity: isNight ? 3.0 : 1.2,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, height + 0.5, 0);
  group.add(beacon);

  if (isNight) {
    const redLight = new THREE.PointLight(0xef4444, 2.0, 12);
    redLight.position.set(0, height + 0.6, 0);
    group.add(redLight);
  }

  root.add(group);
}

export function buildSatelliteDish(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const dishRadius = sx * 1.2;

  // Sturdy Pedestal Base
  const baseMat = createMat(0x334155, 0.8, 0.3);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 12), baseMat);
  base.position.y = 0.075;
  group.add(base);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12), baseMat);
  mast.position.y = 0.65;
  mast.castShadow = true;
  group.add(mast);

  // Azimuth / Elevation Gimbal Bracket
  const gimbal = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), createMat(0x0f172a, 0.9, 0.2));
  gimbal.position.set(0, 1.25, 0);
  group.add(gimbal);

  // Parabolic Reflector Dish (Curved bowl)
  const dishGroup = new THREE.Group();
  const dishGeo = new THREE.SphereGeometry(dishRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
  const dishMat = createMat(0xf8fafc, 0.2, 0.4); // Matte white powder coat
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.castShadow = true;
  dishGroup.add(dish);

  // Feedhorn 3-Strut Support Boom
  const strutMat = createMat(0x64748b, 0.8, 0.3);
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3;
    const strutLen = dishRadius * 0.95;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, strutLen, 6), strutMat);
    strut.position.set((Math.cos(angle) * dishRadius) / 2, (Math.sin(angle) * dishRadius) / 2, strutLen / 2);
    strut.rotation.x = -Math.PI * 0.25;
    strut.rotation.z = angle;
    dishGroup.add(strut);
  }

  // Focal Feedhorn / LNB RF Receiver Block
  const lnb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.2, 12), createMat(0x0284c7, 0.7, 0.3));
  lnb.rotateX(Math.PI / 2);
  lnb.position.set(0, 0, dishRadius * 0.75);
  dishGroup.add(lnb);

  // Aim dish towards sky/satellite (45 degrees elevation)
  dishGroup.position.set(0, 1.35, 0);
  dishGroup.rotation.x = -Math.PI * 0.3;
  dishGroup.rotation.y = Math.PI * 0.2;
  group.add(dishGroup);

  root.add(group);
}

export function buildCctvPole(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const height = sy * 6.2; // 6.2m camera pole

  // Concrete Base with Flange Bolts
  const baseMat = createMat(0x64748b, 0.1, 0.8);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.25, 12), baseMat);
  base.position.y = 0.125;
  group.add(base);

  // Octagonal Tapered Steel Pole
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.14, height, 8);
  const poleMat = createMat(0xd1d5db, 0.8, 0.3); // Galvanized steel
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = height / 2 + 0.25;
  pole.castShadow = true;
  group.add(pole);

  // Weatherproof NEMA Equipment Cabinet at base
  const cabGeo = new THREE.BoxGeometry(0.4, 0.65, 0.28);
  const cabMat = createMat(0x94a3b8, 0.6, 0.4);
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 1.4, 0.18);
  group.add(cab);

  // Top Camera Cross-Arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), poleMat);
  arm.position.set(0, height + 0.1, 0);
  group.add(arm);

  // Dual 360-Degree PTZ Dome Security Cameras
  const domeMat = createMat(0xffffff, 0.3, 0.2); // White camera body
  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.75,
  });

  [-0.45, 0.45].forEach((cx) => {
    const camHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 16), domeMat);
    camHousing.position.set(cx, height + 0.02, 0);
    group.add(camHousing);

    const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), bubbleMat);
    bubble.rotateX(Math.PI);
    bubble.position.set(cx, height - 0.06, 0);
    group.add(bubble);

    // Infrared LED Ring Status Indicator
    if (isNight && isLightsOn) {
      const irRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.015, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.0 })
      );
      irRing.rotateX(Math.PI / 2);
      irRing.position.set(cx, height - 0.04, 0);
      group.add(irRing);
    }
  });

  root.add(group);
}

export function buildSecurityBarrierJersey(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const length = sz * 6.0;
  const height = sy * 1.1;
  const bottomW = sx * 0.7;
  const topW = sx * 0.25;

  // Segmented Jersey Barriers
  const segmentL = 2.0;
  const count = Math.max(1, Math.floor(length / segmentL));
  const barrierMat = createMat(0xd1d5db, 0.05, 0.85); // Cast Concrete

  for (let i = 0; i < count; i++) {
    const zPos = -length / 2 + i * segmentL + segmentL / 2;

    // Extruded Jersey profile
    const shape = new THREE.Shape();
    shape.moveTo(-bottomW / 2, 0);
    shape.lineTo(bottomW / 2, 0);
    shape.lineTo(bottomW * 0.35, height * 0.35);
    shape.lineTo(topW / 2, height);
    shape.lineTo(-topW / 2, height);
    shape.lineTo(-bottomW * 0.35, height * 0.35);
    shape.closePath();

    const extrudeSettings = { steps: 1, depth: segmentL * 0.96, bevelEnabled: false };
    const barrierGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    barrierGeo.rotateY(Math.PI / 2);
    const barrier = new THREE.Mesh(barrierGeo, barrierMat);
    barrier.position.set(-segmentL * 0.48, 0, zPos);
    barrier.castShadow = true;
    barrier.receiveShadow = true;
    group.add(barrier);

    // Reflective Safety Diamond Chevron Markers (Red & White)
    const markerMat = createMat(0xdc2626, 0.4, 0.4);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.015), markerMat);
    marker.position.set(0, height * 0.7, zPos);
    group.add(marker);
  }

  root.add(group);
}

export function buildSecurityBoomGate(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const armLen = sz * 4.6;

  // Gate Motor Pedestal Housing (Yellow / Dark Slate)
  const pedestalGeo = new THREE.BoxGeometry(0.45, 1.25, 0.45);
  const pedMat = createMat(0xf59e0b, 0.5, 0.3); // Safety Traffic Amber
  const pedestal = new THREE.Mesh(pedestalGeo, pedMat);
  pedestal.position.set(0, 0.625, 0);
  pedestal.castShadow = true;
  group.add(pedestal);

  // Top Flashing Amber Warning Light
  const strobe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: isNight && isLightsOn ? 0xf59e0b : 0x000000,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    })
  );
  strobe.position.set(0, 1.31, 0);
  group.add(strobe);

  // Pivot Arm Mechanism Hub
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16), createMat(0x0f172a, 0.8, 0.3));
  hub.rotateX(Math.PI / 2);
  hub.position.set(0.24, 0.95, 0);
  group.add(hub);

  // Striped Boom Barrier Arm (White & Red Reflective Bands)
  const armGeo = new THREE.BoxGeometry(0.06, 0.14, armLen);
  const armMatWhite = createMat(0xffffff, 0.2, 0.4);
  const arm = new THREE.Mesh(armGeo, armMatWhite);
  arm.position.set(0.26, 0.95, armLen / 2);
  arm.castShadow = true;
  group.add(arm);

  // Alternating red stripes along the arm
  const redMat = createMat(0xdc2626, 0.3, 0.4);
  const stripeCount = Math.floor(armLen / 0.5);
  for (let i = 0; i < stripeCount; i += 2) {
    const sMesh = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.145, 0.25), redMat);
    sMesh.position.set(0.26, 0.95, i * 0.5 + 0.25);
    group.add(sMesh);
  }

  // Tip Support Catch Post
  const tipPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), createMat(0x334155, 0.7, 0.3));
  tipPost.position.set(0.26, 0.475, armLen);
  group.add(tipPost);

  root.add(group);
}

export function buildFirePumpStation(root: THREE.Group, sx: number, sy: number, sz: number) {
  const group = new THREE.Group();
  const width = sx * 2.8;
  const height = sy * 1.8;
  const depth = sz * 2.2;

  // Steel Skid Base
  const skid = new THREE.Mesh(new THREE.BoxGeometry(width, 0.15, depth), createMat(0x0f172a, 0.8, 0.3));
  skid.position.y = 0.075;
  group.add(skid);

  // Red Fire Pump Volute & Casing
  const fireRedMat = createMat(0xdc2626, 0.6, 0.35); // Safety Fire Red
  const pumpVolute = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 16), fireRedMat);
  pumpVolute.rotateZ(Math.PI / 2);
  pumpVolute.position.set(-width * 0.2, 0.55, 0);
  pumpVolute.castShadow = true;
  group.add(pumpVolute);

  // Diesel Engine Driver (Black / Yellow block)
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.55), createMat(0x1e293b, 0.7, 0.4));
  engine.position.set(width * 0.25, 0.55, 0);
  group.add(engine);

  // Drive Shaft Coupler Guard
  const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12), createMat(0xf59e0b, 0.8, 0.2));
  coupler.rotateZ(Math.PI / 2);
  coupler.position.set(0.02, 0.55, 0);
  group.add(coupler);

  // Red Delivery Piping Manifold with Flanges
  const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, depth * 0.9, 12);
  const pipe = new THREE.Mesh(pipeGeo, fireRedMat);
  pipe.position.set(-width * 0.2, 1.1, 0);
  group.add(pipe);

  // Brass Analog Pressure Dial Gauges
  const gaugeMat = createMat(0xd97706, 0.9, 0.2); // Brass
  [-0.3, 0.3].forEach((gz) => {
    const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), gaugeMat);
    gauge.rotateX(Math.PI / 2);
    gauge.position.set(-width * 0.2, 1.25, gz);
    group.add(gauge);
  });

  // Outdoor Storz Fire Hydrant Standpipe next to pump
  const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 12), fireRedMat);
  hydrant.position.set(width * 0.4, 0.6, depth * 0.4);
  group.add(hydrant);

  // Top Operating Handwheel
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16), createMat(0xfacc15, 0.7, 0.3));
  wheel.rotateX(Math.PI / 2);
  wheel.position.set(width * 0.4, 1.07, depth * 0.4);
  group.add(wheel);

  root.add(group);
}

export function buildFloodlightTower(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const height = sy * 9.0; // 9-meter high floodlight mast

  // Concrete Base with Anchor Studs
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.35, 12), createMat(0x64748b, 0.1, 0.8));
  base.position.y = 0.175;
  group.add(base);

  // Tapered Steel Pole Mast
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.16, height, 12);
  const poleMat = createMat(0x94a3b8, 0.8, 0.3);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = height / 2 + 0.35;
  pole.castShadow = true;
  group.add(pole);

  // Top Cross-Arm Bracket Frame for 4 Floodlights
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.25), createMat(0x334155, 0.8, 0.3));
  frame.position.set(0, height + 0.35, 0);
  group.add(frame);

  // 4 High-Output LED Floodlight Projector Fixtures
  const lightOffsets = [-0.6, -0.2, 0.2, 0.6];
  lightOffsets.forEach((lx) => {
    const fixtureGroup = new THREE.Group();

    // Fixture Housing Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.14), createMat(0x0f172a, 0.8, 0.3));
    fixtureGroup.add(box);

    // Glowing LED Projector Glass Face
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.18),
      new THREE.MeshStandardMaterial({
        color: isNight && isLightsOn ? 0xfef08a : 0xffffff,
        emissive: isNight && isLightsOn ? 0xfef08a : 0x000000,
        emissiveIntensity: isNight && isLightsOn ? 3.0 : 0,
        roughness: 0.1,
      })
    );
    glass.position.set(0, 0, 0.075);
    fixtureGroup.add(glass);

    // Tilt downward at 45 degrees towards the ground
    fixtureGroup.position.set(lx, height + 0.45, 0);
    fixtureGroup.rotation.x = Math.PI * 0.25;
    group.add(fixtureGroup);
  });

  // Active SpotLight beam illuminating ground at night
  if (isNight && isLightsOn) {
    const spot = new THREE.SpotLight(0xfffbeb, 4.5, 30, Math.PI * 0.4, 0.4, 1.2);
    spot.position.set(0, height + 0.5, 0.5);
    spot.target.position.set(0, 0, 8);
    group.add(spot);
    group.add(spot.target);
  }

  root.add(group);
}

// -------------------------------------------------------------
// 5. معدات سلامة ودفاع مدني ميدانية (Civil Defense & HSE Safety)
// -------------------------------------------------------------

/**
 * 1. مدفع ورشاش رغوي هيدروليكي للمواقع الحيوية (Foam Monitor)
 */
export function buildFireFoamMonitor(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const scale = Math.min(sx, sy, sz);

  // Foundation skid plinth (dark heavy concrete / steel plate)
  const basePadGeo = new THREE.BoxGeometry(1.6 * sx, 0.2 * sy, 1.6 * sz);
  const basePadMat = createMat(0x334155, 0.2, 0.8);
  const basePad = new THREE.Mesh(basePadGeo, basePadMat);
  basePad.position.y = 0.1 * sy;
  basePad.receiveShadow = true;
  group.add(basePad);

  // 4 Yellow protective corner bollards on foundation
  const bollardGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6 * sy, 8);
  const bollardMat = createMat(0xfacc15, 0.3, 0.5);
  const bOffsets = [
    [-0.65 * sx, -0.65 * sz],
    [0.65 * sx, -0.65 * sz],
    [-0.65 * sx, 0.65 * sz],
    [0.65 * sx, 0.65 * sz],
  ];
  bOffsets.forEach(([bx, bz]) => {
    const b = new THREE.Mesh(bollardGeo, bollardMat);
    b.position.set(bx, 0.4 * sy, bz);
    group.add(b);
  });

  // Base Mounting Flange with bolted ring
  const flangeGeo = new THREE.CylinderGeometry(0.32 * scale, 0.36 * scale, 0.08 * sy, 16);
  const fireRedMat = createMat(0xdc2626, 0.3, 0.4); // High-visibility Fire Signal Red
  const flange = new THREE.Mesh(flangeGeo, fireRedMat);
  flange.position.y = 0.24 * sy;
  group.add(flange);

  // 8 Chrome Bolt Nuts on flange
  const boltGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.04 * sy, 6);
  const boltMat = createMat(0xe2e8f0, 0.8, 0.2);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(Math.cos(angle) * 0.28 * scale, 0.28 * sy, Math.sin(angle) * 0.28 * scale);
    group.add(bolt);
  }

  // Main Vertical High-Pressure Riser Pipe
  const riserHeight = 0.85 * sy;
  const riserGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, riserHeight, 16);
  const riser = new THREE.Mesh(riserGeo, fireRedMat);
  riser.position.y = 0.28 * sy + riserHeight / 2;
  riser.castShadow = true;
  group.add(riser);

  // Reflective Yellow Safety Stripes on riser pipe
  const stripeGeo = new THREE.CylinderGeometry(0.145 * scale, 0.145 * scale, 0.08 * sy, 16);
  const stripeMat = createMat(0xfacc15, 0.4, 0.4);
  const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
  stripe1.position.y = 0.5 * sy;
  group.add(stripe1);
  const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
  stripe2.position.y = 0.85 * sy;
  group.add(stripe2);

  // Dial Pressure Gauge with brass stem
  const gaugeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12 * scale, 8), createMat(0xd97706, 0.8, 0.3));
  gaugeStem.rotation.z = Math.PI / 2;
  gaugeStem.position.set(0.18 * scale, 0.75 * sy, 0);
  group.add(gaugeStem);

  const gaugeDial = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.025 * scale, 16), createMat(0xffffff, 0.1, 0.2));
  gaugeDial.rotation.z = Math.PI / 2;
  gaugeDial.position.set(0.24 * scale, 0.75 * sy, 0);
  group.add(gaugeDial);

  const gaugeRim = new THREE.Mesh(new THREE.TorusGeometry(0.06 * scale, 0.01 * scale, 8, 16), createMat(0xd97706, 0.8, 0.3));
  gaugeRim.rotation.y = Math.PI / 2;
  gaugeRim.position.set(0.25 * scale, 0.75 * sy, 0);
  group.add(gaugeRim);

  // Horizontal Swivel Joint (Azimuth Pan Joint)
  const swivelGeo = new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.18 * sy, 16);
  const darkSwivelMat = createMat(0x1e293b, 0.6, 0.3);
  const swivel = new THREE.Mesh(swivelGeo, darkSwivelMat);
  swivel.position.y = 0.28 * sy + riserHeight + 0.09 * sy;
  group.add(swivel);

  // Gooseneck Dual Elbows Loop Assembly
  const elbowMat = fireRedMat;
  const pivotY = 0.28 * sy + riserHeight + 0.24 * sy;

  // Elevation Swivel & Monitor Carriage
  const carriageGeo = new THREE.BoxGeometry(0.28 * scale, 0.24 * sy, 0.24 * scale);
  const carriage = new THREE.Mesh(carriageGeo, fireRedMat);
  carriage.position.set(0, pivotY, 0);
  group.add(carriage);

  // Dual Manual Control Hand-Wheels (Azimuth & Elevation)
  // 1. Right Elevation Hand-Wheel
  const wheelRimGeo = new THREE.TorusGeometry(0.12 * scale, 0.016 * scale, 8, 16);
  const wheelHubGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.08 * scale, 8);
  const wheelMat = createMat(0xfacc15, 0.4, 0.3); // Bright yellow wheel

  const wheel1 = new THREE.Mesh(wheelRimGeo, wheelMat);
  wheel1.rotation.y = Math.PI / 2;
  wheel1.position.set(0.22 * scale, pivotY, 0);
  group.add(wheel1);

  const hub1 = new THREE.Mesh(wheelHubGeo, createMat(0x0f172a, 0.7, 0.3));
  hub1.rotation.z = Math.PI / 2;
  hub1.position.set(0.18 * scale, pivotY, 0);
  group.add(hub1);

  // 2. Left Horizontal Pan Hand-Wheel
  const wheel2 = new THREE.Mesh(wheelRimGeo, wheelMat);
  wheel2.position.set(-0.22 * scale, pivotY - 0.12 * sy, 0);
  wheel2.rotation.x = Math.PI / 2;
  group.add(wheel2);

  // High-Flow Deluge Foam Barrel (angled upwards 30 degrees)
  const cannonGroup = new THREE.Group();
  cannonGroup.position.set(0, pivotY, 0);
  cannonGroup.rotation.x = -Math.PI * 0.16; // 30° elevation angle

  // Monitor Main Barrel Tube
  const barrelGeo = new THREE.CylinderGeometry(0.08 * scale, 0.11 * scale, 0.85 * sy, 16);
  const barrel = new THREE.Mesh(barrelGeo, fireRedMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.45 * scale;
  cannonGroup.add(barrel);

  // Foam Aeration Induction Sleeve (Aspiration chamber with air holes)
  const foamSleeveGeo = new THREE.CylinderGeometry(0.13 * scale, 0.1 * scale, 0.45 * sy, 16);
  const chromeMat = createMat(0xe2e8f0, 0.85, 0.15); // Polished stainless steel / chrome
  const foamSleeve = new THREE.Mesh(foamSleeveGeo, chromeMat);
  foamSleeve.rotation.x = Math.PI / 2;
  foamSleeve.position.z = 0.75 * scale;
  cannonGroup.add(foamSleeve);

  // Brass Deluge Discharge Nozzle Tip
  const nozzleGeo = new THREE.CylinderGeometry(0.07 * scale, 0.11 * scale, 0.18 * sy, 16);
  const brassMat = createMat(0xd97706, 0.8, 0.25);
  const nozzle = new THREE.Mesh(nozzleGeo, brassMat);
  nozzle.rotation.x = Math.PI / 2;
  nozzle.position.z = 1.02 * scale;
  cannonGroup.add(nozzle);

  // Black Foam Pickup Hose Connector
  const hoseGeo = new THREE.CylinderGeometry(0.035 * scale, 0.035 * scale, 0.7 * sy, 8);
  const hoseMat = createMat(0x1e293b, 0.2, 0.9);
  const hose = new THREE.Mesh(hoseGeo, hoseMat);
  hose.position.set(0.08 * scale, -0.25 * sy, 0.45 * scale);
  hose.rotation.z = 0.3;
  cannonGroup.add(hose);

  group.add(cannonGroup);
  root.add(group);
}

/**
 * 2. مظلات ومحطات إسعاف أولي ونقاط تجمع طوارئ (Muster Points & First Aid Station)
 */
export function buildMusterFirstAidStation(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const width = sx * 4.2;
  const height = sy * 3.2;
  const depth = sz * 3.6;

  // 1. Concrete Platform Pad with Hazard Perimeter
  const padHeight = 0.22;
  const padGeo = new THREE.BoxGeometry(width, padHeight, depth);
  const padMat = createMat(0xd1d5db, 0.1, 0.8);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = padHeight / 2;
  pad.receiveShadow = true;
  group.add(pad);

  // Hazard border (yellow & black safety banding on pad edges)
  const borderThick = 0.2;
  const borderGeo = new THREE.BoxGeometry(width + 0.04, padHeight + 0.01, borderThick);
  const yellowMat = createMat(0xfacc15, 0.2, 0.5);
  const frontBorder = new THREE.Mesh(borderGeo, yellowMat);
  frontBorder.position.set(0, padHeight / 2, depth / 2 - borderThick / 2);
  group.add(frontBorder);

  const backBorder = new THREE.Mesh(borderGeo, yellowMat);
  backBorder.position.set(0, padHeight / 2, -depth / 2 + borderThick / 2);
  group.add(backBorder);

  // 2. 4 Tubular Steel Support Posts with Footing Plates
  const postRadius = 0.075;
  const postHeight = height - 0.5;
  const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 16);
  const postMat = createMat(0xf8fafc, 0.4, 0.4); // Clean industrial white/silver

  const postPositions = [
    [-width / 2 + 0.35, -depth / 2 + 0.35],
    [width / 2 - 0.35, -depth / 2 + 0.35],
    [-width / 2 + 0.35, depth / 2 - 0.35],
    [width / 2 - 0.35, depth / 2 - 0.35],
  ];

  postPositions.forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(px, padHeight + postHeight / 2, pz);
    post.castShadow = true;
    group.add(post);

    // Footing Flange Plate
    const footing = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), createMat(0x64748b, 0.6, 0.3));
    footing.position.set(px, padHeight + 0.02, pz);
    group.add(footing);
  });

  // 3. Sloped Weather Canopy Roof (Industrial Safety Green)
  const roofGroup = new THREE.Group();
  roofGroup.position.set(0, padHeight + postHeight, 0);

  // Pitched/Curved Canopy Slab
  const canopyWidth = width + 0.4;
  const canopyDepth = depth + 0.4;
  const canopyGeo = new THREE.BoxGeometry(canopyWidth, 0.12, canopyDepth);
  const canopyGreenMat = createMat(0x15803d, 0.3, 0.4); // Official ISO Safety Green
  const canopy = new THREE.Mesh(canopyGeo, canopyGreenMat);
  canopy.castShadow = true;
  roofGroup.add(canopy);

  // White Fascia Edge Trim
  const fasciaGeo = new THREE.BoxGeometry(canopyWidth + 0.05, 0.16, 0.06);
  const whiteMat = createMat(0xffffff, 0.1, 0.3);
  const frontFascia = new THREE.Mesh(fasciaGeo, whiteMat);
  frontFascia.position.set(0, 0, canopyDepth / 2);
  roofGroup.add(frontFascia);

  const backFascia = new THREE.Mesh(fasciaGeo, whiteMat);
  backFascia.position.set(0, 0, -canopyDepth / 2);
  roofGroup.add(backFascia);

  // Green Beacon Indicator on Roof Peak
  const beaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.16, 16);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: isNight ? 0x22c55e : 0x15803d,
    emissiveIntensity: isNight ? 2.5 : 0.4,
    roughness: 0.1,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 0.14, 0);
  roofGroup.add(beacon);

  group.add(roofGroup);

  // 4. Double-Sided Emergency Assembly / Muster Point Signboard (Hanging from front trusses)
  const signWidth = 2.4;
  const signHeight = 0.75;
  const signBoard = new THREE.Mesh(new THREE.BoxGeometry(signWidth, signHeight, 0.08), canopyGreenMat);
  signBoard.position.set(0, padHeight + postHeight - 0.5, depth / 2 - 0.35);
  group.add(signBoard);

  // Sign White Border and ISO Symbols Plate
  const signFaceMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.2,
    emissive: isNight && isLightsOn ? 0x16a34a : 0x000000,
    emissiveIntensity: isNight && isLightsOn ? 0.8 : 0,
  });
  const signFace = new THREE.Mesh(new THREE.PlaneGeometry(signWidth - 0.1, signHeight - 0.1), signFaceMat);
  signFace.position.set(0, padHeight + postHeight - 0.5, depth / 2 - 0.35 + 0.045);
  group.add(signFace);

  // Central Gathering Circle Graphic
  const centerCircle = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), whiteMat);
  centerCircle.position.set(0, padHeight + postHeight - 0.5, depth / 2 - 0.35 + 0.05);
  group.add(centerCircle);

  // 4 Converging Inward Arrows (ISO 7010 evacuation symbol)
  const arrowGeo = new THREE.ConeGeometry(0.06, 0.12, 3);
  const arrowPositions = [
    { x: -0.22, y: padHeight + postHeight - 0.5, rot: -Math.PI / 2 },
    { x: 0.22, y: padHeight + postHeight - 0.5, rot: Math.PI / 2 },
    { x: 0, y: padHeight + postHeight - 0.28, rot: 0 },
    { x: 0, y: padHeight + postHeight - 0.72, rot: Math.PI },
  ];
  arrowPositions.forEach((pos) => {
    const arr = new THREE.Mesh(arrowGeo, whiteMat);
    arr.position.set(pos.x, pos.y, depth / 2 - 0.35 + 0.05);
    arr.rotation.z = pos.rot;
    group.add(arr);
  });

  // 5. Rear Safety Wall Partition with First Aid Cabinet & Stretcher Rack
  const wallWidth = width - 0.7;
  const wallHeight = 2.1;
  const rearWallGeo = new THREE.BoxGeometry(wallWidth, wallHeight, 0.08);
  const rearWallMat = createMat(0xe2e8f0, 0.2, 0.7);
  const rearWall = new THREE.Mesh(rearWallGeo, rearWallMat);
  rearWall.position.set(0, padHeight + wallHeight / 2, -depth / 2 + 0.4);
  group.add(rearWall);

  // Metal Emergency First Aid Cabinet (Green box with bold White Cross)
  const cabWidth = 0.65;
  const cabHeight = 0.85;
  const cabinet = new THREE.Mesh(new THREE.BoxGeometry(cabWidth, cabHeight, 0.24), canopyGreenMat);
  cabinet.position.set(-0.8, padHeight + 1.35, -depth / 2 + 0.4 + 0.14);
  group.add(cabinet);

  // White Medical Cross on Cabinet Door
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.02), whiteMat);
  crossH.position.set(-0.8, padHeight + 1.35, -depth / 2 + 0.4 + 0.27);
  group.add(crossH);

  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.02), whiteMat);
  crossV.position.set(-0.8, padHeight + 1.35, -depth / 2 + 0.4 + 0.27);
  group.add(crossV);

  // Emergency Folding Evacuation Stretcher on Wall Rack
  const stretcherPoleGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8);
  const stretcherCanvasGeo = new THREE.BoxGeometry(0.45, 1.6, 0.03);
  const canvasMat = createMat(0xea580c, 0.1, 0.8); // High-vis rescue orange
  const stretcher = new THREE.Mesh(stretcherCanvasGeo, canvasMat);
  stretcher.position.set(0.8, padHeight + 1.15, -depth / 2 + 0.4 + 0.08);
  group.add(stretcher);

  const p1 = new THREE.Mesh(stretcherPoleGeo, createMat(0x94a3b8, 0.8, 0.2));
  p1.position.set(0.8 - 0.24, padHeight + 1.15, -depth / 2 + 0.4 + 0.08);
  group.add(p1);
  const p2 = new THREE.Mesh(stretcherPoleGeo, createMat(0x94a3b8, 0.8, 0.2));
  p2.position.set(0.8 + 0.24, padHeight + 1.15, -depth / 2 + 0.4 + 0.08);
  group.add(p2);

  // Emergency Eye-Wash / Safety Shower Unit
  const showerPipeMat = createMat(0xe2e8f0, 0.8, 0.2);
  const showerRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 8), showerPipeMat);
  showerRiser.position.set(0, padHeight + 1.1, -depth / 2 + 0.4 + 0.22);
  group.add(showerRiser);

  // Eye-wash green bowl
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.08, 16), canopyGreenMat);
  bowl.position.set(0, padHeight + 1.05, -depth / 2 + 0.4 + 0.35);
  group.add(bowl);

  // Shower top head
  const showerHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.1, 16), canopyGreenMat);
  showerHead.rotation.x = Math.PI;
  showerHead.position.set(0, padHeight + 2.15, -depth / 2 + 0.4 + 0.35);
  group.add(showerHead);

  // 6. Rest & Triage Bench with Wooden Slats
  const benchGeo = new THREE.BoxGeometry(width - 1.2, 0.08, 0.45);
  const benchWoodMat = createMat(0x78350f, 0.1, 0.7);
  const bench = new THREE.Mesh(benchGeo, benchWoodMat);
  bench.position.set(0, padHeight + 0.45, -depth / 2 + 1.1);
  group.add(bench);

  const bLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), createMat(0x1e293b, 0.8, 0.3));
  bLeg1.position.set(-width / 2 + 0.9, padHeight + 0.225, -depth / 2 + 1.1);
  group.add(bLeg1);

  const bLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), createMat(0x1e293b, 0.8, 0.3));
  bLeg2.position.set(width / 2 - 0.9, padHeight + 0.225, -depth / 2 + 1.1);
  group.add(bLeg2);

  root.add(group);
}

/**
 * 3. برج صفارات إنذار عامة مع أعمدة تحذير ومكبرات صوت (Public Siren & Warning Tower)
 */
export function buildEmergencySirenPole(
  root: THREE.Group,
  sx: number,
  sy: number,
  sz: number,
  isNight: boolean,
  isLightsOn: boolean
) {
  const group = new THREE.Group();
  const scale = Math.min(sx, sz);
  const totalHeight = sy * 9.5;

  // 1. Heavy Concrete Base Pedestal with Anchor Bolts
  const padGeo = new THREE.BoxGeometry(1.2 * scale, 0.45, 1.2 * scale);
  const padMat = createMat(0x64748b, 0.1, 0.85);
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.position.y = 0.225;
  pad.receiveShadow = true;
  group.add(pad);

  // Steel Base Plate & 4 Heavy Gusset Plates
  const basePlateGeo = new THREE.BoxGeometry(0.7 * scale, 0.06, 0.7 * scale);
  const steelMat = createMat(0x475569, 0.8, 0.3);
  const basePlate = new THREE.Mesh(basePlateGeo, steelMat);
  basePlate.position.y = 0.48;
  group.add(basePlate);

  // 2. High-Strength Tubular Galvanized Steel Mast (9.5m)
  const mastGeo = new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, totalHeight, 16);
  const mastMat = createMat(0x94a3b8, 0.7, 0.3);
  const mast = new THREE.Mesh(mastGeo, mastMat);
  mast.position.y = 0.5 + totalHeight / 2;
  mast.castShadow = true;
  group.add(mast);

  // Safety Hazard Bands (Alternating Yellow & Black Stripes near base)
  const bandHeight = 0.25;
  const bandMatYellow = createMat(0xfacc15, 0.3, 0.4);
  const bandMatBlack = createMat(0x0f172a, 0.5, 0.4);
  for (let i = 0; i < 6; i++) {
    const bGeo = new THREE.CylinderGeometry(0.205 * scale, 0.205 * scale, bandHeight, 16);
    const bMesh = new THREE.Mesh(bGeo, i % 2 === 0 ? bandMatYellow : bandMatBlack);
    bMesh.position.y = 0.8 + i * bandHeight;
    group.add(bMesh);
  }

  // 3. Eye-Level Weatherproof Control & Siren Amplifier Enclosure (Yellow Enclosure)
  const cabWidth = 0.55 * scale;
  const cabHeight = 0.8 * scale;
  const cabDepth = 0.35 * scale;
  const cabGeo = new THREE.BoxGeometry(cabWidth, cabHeight, cabDepth);
  const cabMat = createMat(0xeab308, 0.4, 0.4); // Warning yellow
  const cab = new THREE.Mesh(cabGeo, cabMat);
  cab.position.set(0, 2.7, 0.28 * scale);
  group.add(cab);

  // Red Emergency Stop/Activation Button on Cabinet Door
  const eStopGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.05 * scale, 12);
  const redMat = createMat(0xdc2626, 0.5, 0.3);
  const eStop = new THREE.Mesh(eStopGeo, redMat);
  eStop.rotation.x = Math.PI / 2;
  eStop.position.set(0, 2.7, 0.28 * scale + cabDepth / 2 + 0.02);
  group.add(eStop);

  // 4. Climbing Safety Access Ladder on Back of Mast
  const ladderGeo = new THREE.BoxGeometry(0.35 * scale, totalHeight - 2.5, 0.04);
  const ladderMat = createMat(0x334155, 0.8, 0.3);
  const ladder = new THREE.Mesh(ladderGeo, ladderMat);
  ladder.position.set(0, 2.5 + (totalHeight - 2.5) / 2, -0.22 * scale);
  group.add(ladder);

  // 5. Directional Megaphone Horn Array (4 Acoustic Horns facing 360 degrees)
  const hornArmY = totalHeight * 0.82;
  const armGeo = new THREE.BoxGeometry(1.6 * scale, 0.08, 1.6 * scale);
  const arm = new THREE.Mesh(armGeo, steelMat);
  arm.position.y = hornArmY;
  group.add(arm);

  const hornAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  hornAngles.forEach((angle) => {
    const hornGroup = new THREE.Group();
    hornGroup.position.set(0, hornArmY, 0);
    hornGroup.rotation.y = angle;

    // Horn Mounting Bracket
    const bStub = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4 * scale), steelMat);
    bStub.position.set(0, 0, 0.5 * scale);
    hornGroup.add(bStub);

    // Driver Housing (Acoustic Compression Driver Unit)
    const driverGeo = new THREE.CylinderGeometry(0.09 * scale, 0.09 * scale, 0.16 * scale, 12);
    const driver = new THREE.Mesh(driverGeo, createMat(0x1e293b, 0.7, 0.3));
    driver.rotation.x = Math.PI / 2 + 0.25; // Angled downwards 15°
    driver.position.set(0, 0, 0.75 * scale);
    hornGroup.add(driver);

    // Bell Horn Flare (Trumpet Megaphone)
    const hornGeo = new THREE.ConeGeometry(0.24 * scale, 0.45 * scale, 16, 1, true);
    const hornMat = createMat(0xe2e8f0, 0.3, 0.5); // Light grey aluminum horn
    const horn = new THREE.Mesh(hornGeo, hornMat);
    horn.rotation.x = -Math.PI / 2 + 0.25; // Pointing outward & slightly downward
    horn.position.set(0, -0.06 * scale, 1.02 * scale);
    hornGroup.add(horn);

    group.add(hornGroup);
  });

  // 6. High-Decibel Rotational Electromechanical Siren Head Unit on Mast Summit
  const sirenY = totalHeight * 0.94;
  const sirenRotorGeo = new THREE.CylinderGeometry(0.38 * scale, 0.38 * scale, 0.45 * scale, 16);
  const sirenMat = createMat(0xdc2626, 0.4, 0.3); // Emergency Red Siren Housing
  const sirenRotor = new THREE.Mesh(sirenRotorGeo, sirenMat);
  sirenRotor.position.y = sirenY;
  group.add(sirenRotor);

  // Louver Ports / Sound Projector Rings
  for (let r = -0.15; r <= 0.15; r += 0.08) {
    const ringGeo = new THREE.TorusGeometry(0.39 * scale, 0.02 * scale, 8, 16);
    const ring = new THREE.Mesh(ringGeo, createMat(0x0f172a, 0.8, 0.3));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = sirenY + r * scale;
    group.add(ring);
  }

  // Deflector Rain Hood Dome on Siren Head
  const hoodGeo = new THREE.ConeGeometry(0.48 * scale, 0.18 * scale, 16);
  const hood = new THREE.Mesh(hoodGeo, sirenMat);
  hood.position.y = sirenY + 0.3 * scale;
  group.add(hood);

  // 7. Backup Solar PV Panel (tilted for autonomous emergency operation)
  const solarGroup = new THREE.Group();
  solarGroup.position.set(0.45 * scale, hornArmY - 0.8 * scale, 0);
  solarGroup.rotation.x = 0.5; // 30° tilt
  const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 0.04, 0.6 * scale), createMat(0x1e3a8a, 0.8, 0.2));
  solarGroup.add(solarPanel);
  group.add(solarGroup);

  // 8. Emergency Xenon Strobe Warning Beacon at Mast Pinnacle
  const beaconY = totalHeight + 0.25;
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.1 * scale, 12), steelMat);
  beaconBase.position.y = beaconY;
  group.add(beaconBase);

  const strobeGeo = new THREE.CylinderGeometry(0.07 * scale, 0.07 * scale, 0.18 * scale, 16);
  const strobeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Intense Red Strobe
    emissive: 0xef4444,
    emissiveIntensity: isNight ? 4.0 : 1.2,
    roughness: 0.1,
    transparent: true,
    opacity: 0.95,
  });
  const strobe = new THREE.Mesh(strobeGeo, strobeMat);
  strobe.position.y = beaconY + 0.12 * scale;
  group.add(strobe);

  // Night beacon point-light glow
  if (isNight) {
    const beaconLight = new THREE.PointLight(0xef4444, 2.5, 20);
    beaconLight.position.y = beaconY + 0.2 * scale;
    group.add(beaconLight);
  }

  root.add(group);
}
