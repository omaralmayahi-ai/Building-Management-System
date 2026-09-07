import * as THREE from 'three';

export interface Building2DPoint {
  x: number;
  z: number;
}

export interface BuildingPolygon {
  outer: Building2DPoint[];
  holes: Building2DPoint[][];
  isCircle?: boolean;
  radius?: number;
}

export interface RoomSlot {
  id: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  wingName: string;
}

export interface WallSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  length: number;
  angle: number;
  isCourtyardFacing?: boolean;
}

/**
 * Returns the exact 3D ground plane (X-Z) polygon boundary for any building shape.
 * X corresponds to width (from -width/2 to +width/2)
 * Z corresponds to depth (from -depth/2 to +depth/2)
 */
export function getBuildingFootprintPolygon(
  shapeType: string,
  width: number,
  depth: number
): BuildingPolygon {
  const hw = width / 2;
  const hd = depth / 2;

  switch (shapeType) {
    case 'مربع':
    case 'مستطيل':
    default:
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [],
      };

    case 'دائري':
    case 'Dome': {
      const r = Math.min(hw, hd);
      const outer: Building2DPoint[] = [];
      const steps = 32;
      for (let i = 0; i < steps; i++) {
        const theta = (i / steps) * Math.PI * 2;
        outer.push({ x: r * Math.cos(theta), z: r * Math.sin(theta) });
      }
      return { outer, holes: [], isCircle: true, radius: r };
    }

    case 'مثلث':
      return {
        outer: [
          { x: -hw, z: hd },
          { x: hw, z: hd },
          { x: 0, z: -hd },
        ],
        holes: [],
      };

    case 'L-Shape':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: 0, z: -hd },
          { x: 0, z: 0 },
          { x: hw, z: 0 },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [],
      };

    case 'U-Shape':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: -hw * 0.4, z: -hd },
          { x: -hw * 0.4, z: hd * 0.2 },
          { x: hw * 0.4, z: hd * 0.2 },
          { x: hw * 0.4, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [],
      };

    case 'T-Shape':
      return {
        outer: [
          { x: -hw * 0.35, z: -hd },
          { x: hw * 0.35, z: -hd },
          { x: hw * 0.35, z: hd * 0.2 },
          { x: hw, z: hd * 0.2 },
          { x: hw, z: hd },
          { x: -hw, z: hd },
          { x: -hw, z: hd * 0.2 },
          { x: -hw * 0.35, z: hd * 0.2 },
        ],
        holes: [],
      };

    case 'H-Shape':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: -hw * 0.35, z: -hd },
          { x: -hw * 0.35, z: -hd * 0.2 },
          { x: hw * 0.35, z: -hd * 0.2 },
          { x: hw * 0.35, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: hd },
          { x: hw * 0.35, z: hd },
          { x: hw * 0.35, z: hd * 0.2 },
          { x: -hw * 0.35, z: hd * 0.2 },
          { x: -hw * 0.35, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [],
      };

    case 'C-Shape':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: -hd * 0.3 },
          { x: -hw * 0.3, z: -hd * 0.3 },
          { x: -hw * 0.3, z: hd * 0.3 },
          { x: hw, z: hd * 0.3 },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [],
      };

    case 'E-Shape':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: -hd * 0.6 },
          { x: -hw * 0.3, z: -hd * 0.6 },
          { x: -hw * 0.3, z: -hd * 0.15 },
          { x: hw * 0.7, z: -hd * 0.15 },
          { x: hw * 0.7, z: hd * 0.15 },
          { x: -hw * 0.3, z: hd * 0.15 },
          { x: -hw * 0.3, z: hd * 0.6 },
          { x: hw, z: hd * 0.6 },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [],
      };

    case 'Cross-Shape':
      return {
        outer: [
          { x: -hw * 0.35, z: -hd },
          { x: hw * 0.35, z: -hd },
          { x: hw * 0.35, z: -hd * 0.35 },
          { x: hw, z: -hd * 0.35 },
          { x: hw, z: hd * 0.35 },
          { x: hw * 0.35, z: hd * 0.35 },
          { x: hw * 0.35, z: hd },
          { x: -hw * 0.35, z: hd },
          { x: -hw * 0.35, z: hd * 0.35 },
          { x: -hw, z: hd * 0.35 },
          { x: -hw, z: -hd * 0.35 },
          { x: -hw * 0.35, z: -hd * 0.35 },
        ],
        holes: [],
      };

    case 'Courtyard':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
        holes: [
          [
            { x: -hw * 0.4, z: -hd * 0.4 },
            { x: hw * 0.4, z: -hd * 0.4 },
            { x: hw * 0.4, z: hd * 0.4 },
            { x: -hw * 0.4, z: hd * 0.4 },
          ],
        ],
      };

    case 'Octagonal': {
      const r = Math.min(hw, hd);
      const outer: Building2DPoint[] = [];
      for (let i = 0; i < 8; i++) {
        const theta = (i * Math.PI) / 4 - Math.PI / 8;
        outer.push({ x: r * Math.cos(theta), z: r * Math.sin(theta) });
      }
      return { outer, holes: [] };
    }

    case 'Irregular':
      return {
        outer: [
          { x: -hw, z: -hd },
          { x: hw * 0.6, z: -hd },
          { x: hw, z: -hd * 0.3 },
          { x: hw, z: hd },
          { x: -hw * 0.2, z: hd },
          { x: -hw, z: hd * 0.5 },
        ],
        holes: [],
      };
  }
}

/**
 * Converts 3D ground plane polygon to Three.js Shape for ExtrudeGeometry
 * Note: Three.js shape coordinates (X, Y) map to 3D as (x, -y) when rotated by -PI/2
 */
export function createThreeShapeFromPolygon(poly: BuildingPolygon): THREE.Shape {
  const shape = new THREE.Shape();
  if (poly.outer.length === 0) return shape;

  // Move to first vertex (shapeX = x, shapeY = -z)
  shape.moveTo(poly.outer[0].x, -poly.outer[0].z);
  for (let i = 1; i < poly.outer.length; i++) {
    shape.lineTo(poly.outer[i].x, -poly.outer[i].z);
  }
  shape.closePath();

  // Add holes if present
  if (poly.holes && poly.holes.length > 0) {
    for (const holePoints of poly.holes) {
      if (holePoints.length === 0) continue;
      const holePath = new THREE.Path();
      holePath.moveTo(holePoints[0].x, -holePoints[0].z);
      for (let j = 1; j < holePoints.length; j++) {
        holePath.lineTo(holePoints[j].x, -holePoints[j].z);
      }
      holePath.closePath();
      shape.holes.push(holePath);
    }
  }

  return shape;
}

/**
 * Standard ray-casting point-in-polygon test
 */
function isPointInSimplePolygon(px: number, pz: number, polygon: Building2DPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, zi = polygon[i].z;
    const xj = polygon[j].x, zj = polygon[j].z;
    const intersect = ((zi > pz) !== (zj > pz)) && (px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Distance from point to line segment
 */
function distToSegment(px: number, pz: number, x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.hypot(px - x1, pz - z1);
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.hypot(px - projX, pz - projZ);
}

/**
 * Minimum distance from point to any edge of polygon
 */
function minDistanceToPolygonEdges(px: number, pz: number, polygon: Building2DPoint[]): number {
  let minDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = distToSegment(px, pz, polygon[i].x, polygon[i].z, polygon[j].x, polygon[j].z);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Tests whether a point (x, z) is strictly inside the building massing with an optional clearance margin
 */
export function isPointInBuildingFootprint(
  x: number,
  z: number,
  shapeType: string,
  width: number,
  depth: number,
  margin: number = 0
): boolean {
  const poly = getBuildingFootprintPolygon(shapeType, width, depth);

  if (poly.isCircle && poly.radius) {
    return Math.hypot(x, z) <= poly.radius - margin;
  }

  // Must be inside outer boundary
  if (!isPointInSimplePolygon(x, z, poly.outer)) {
    return false;
  }

  // Must NOT be inside any hole (e.g. courtyard void)
  for (const hole of poly.holes) {
    if (isPointInSimplePolygon(x, z, hole)) {
      return false;
    }
  }

  // If margin is required, ensure distance to any edge is >= margin
  if (margin > 0) {
    const outerDist = minDistanceToPolygonEdges(x, z, poly.outer);
    if (outerDist < margin) return false;

    for (const hole of poly.holes) {
      const holeDist = minDistanceToPolygonEdges(x, z, hole);
      if (holeDist < margin) return false;
    }
  }

  return true;
}

/**
 * Tests whether an entire rectangular box (e.g. room pad or furniture) is 100% inside the building footprint
 */
export function isBoxInBuildingFootprint(
  cx: number,
  cz: number,
  boxW: number,
  boxD: number,
  shapeType: string,
  width: number,
  depth: number,
  margin: number = 0.05
): boolean {
  const hw = boxW / 2;
  const hd = boxD / 2;

  // Test center
  if (!isPointInBuildingFootprint(cx, cz, shapeType, width, depth, margin)) return false;

  // Test 4 corners
  if (!isPointInBuildingFootprint(cx - hw, cz - hd, shapeType, width, depth, margin)) return false;
  if (!isPointInBuildingFootprint(cx + hw, cz - hd, shapeType, width, depth, margin)) return false;
  if (!isPointInBuildingFootprint(cx + hw, cz + hd, shapeType, width, depth, margin)) return false;
  if (!isPointInBuildingFootprint(cx - hw, cz + hd, shapeType, width, depth, margin)) return false;

  // Test 4 edge midpoints
  if (!isPointInBuildingFootprint(cx, cz - hd, shapeType, width, depth, margin)) return false;
  if (!isPointInBuildingFootprint(cx, cz + hd, shapeType, width, depth, margin)) return false;
  if (!isPointInBuildingFootprint(cx - hw, cz, shapeType, width, depth, margin)) return false;
  if (!isPointInBuildingFootprint(cx + hw, cz, shapeType, width, depth, margin)) return false;

  return true;
}

/**
 * Returns solid wings/zones for a given building shape
 */
export function getBuildingWings(
  shapeType: string,
  width: number,
  depth: number
): Array<{ name: string; minX: number; maxX: number; minZ: number; maxZ: number }> {
  const hw = width / 2;
  const hd = depth / 2;

  switch (shapeType) {
    case 'U-Shape':
      return [
        { name: 'الجناح الأيسر', minX: -hw, maxX: -hw * 0.4, minZ: -hd, maxZ: hd * 0.2 },
        { name: 'الجناح الأيمن', minX: hw * 0.4, maxX: hw, minZ: -hd, maxZ: hd * 0.2 },
        { name: 'الجناح الرئيسي الخلفي', minX: -hw, maxX: hw, minZ: hd * 0.2, maxZ: hd },
      ];

    case 'L-Shape':
      return [
        { name: 'الجناح الطولي', minX: -hw, maxX: 0, minZ: -hd, maxZ: 0 },
        { name: 'ركن الزاوية', minX: -hw, maxX: 0, minZ: 0, maxZ: hd },
        { name: 'الجناح العرضي', minX: 0, maxX: hw, minZ: 0, maxZ: hd },
      ];

    case 'Courtyard':
      return [
        { name: 'الممر الشمالي', minX: -hw, maxX: hw, minZ: hd * 0.4, maxZ: hd },
        { name: 'الممر الجنوبي', minX: -hw, maxX: hw, minZ: -hd, maxZ: -hd * 0.4 },
        { name: 'الممر الغربي', minX: -hw, maxX: -hw * 0.4, minZ: -hd * 0.4, maxZ: hd * 0.4 },
        { name: 'الممر الشرقي', minX: hw * 0.4, maxX: hw, minZ: -hd * 0.4, maxZ: hd * 0.4 },
      ];

    case 'T-Shape':
      return [
        { name: 'الجناح العرضي الرئيسي', minX: -hw, maxX: hw, minZ: hd * 0.2, maxZ: hd },
        { name: 'الجناح الطولي الأمامي', minX: -hw * 0.35, maxX: hw * 0.35, minZ: -hd, maxZ: hd * 0.2 },
      ];

    case 'H-Shape':
      return [
        { name: 'الجناح الأيسر', minX: -hw, maxX: -hw * 0.35, minZ: -hd, maxZ: hd },
        { name: 'الجناح الأيمن', minX: hw * 0.35, maxX: hw, minZ: -hd, maxZ: hd },
        { name: 'الجسر الرابط الأوسط', minX: -hw * 0.35, maxX: hw * 0.35, minZ: -hd * 0.2, maxZ: hd * 0.2 },
      ];

    case 'C-Shape':
      return [
        { name: 'العمود الفقري الخلفي', minX: -hw, maxX: -hw * 0.3, minZ: -hd, maxZ: hd },
        { name: 'الجناح الأمامي', minX: -hw * 0.3, maxX: hw, minZ: -hd, maxZ: -hd * 0.3 },
        { name: 'الجناح الخلفي', minX: -hw * 0.3, maxX: hw, minZ: hd * 0.3, maxZ: hd },
      ];

    case 'E-Shape':
      return [
        { name: 'الممر الرابط الخلفي', minX: -hw, maxX: -hw * 0.3, minZ: -hd, maxZ: hd },
        { name: 'الجناح العلوي', minX: -hw * 0.3, maxX: hw, minZ: -hd, maxZ: -hd * 0.6 },
        { name: 'الجناح الأوسط', minX: -hw * 0.3, maxX: hw * 0.7, minZ: -hd * 0.15, maxZ: hd * 0.15 },
        { name: 'الجناح السفلي', minX: -hw * 0.3, maxX: hw, minZ: hd * 0.6, maxZ: hd },
      ];

    case 'Cross-Shape':
      return [
        { name: 'المركز الأوسط', minX: -hw * 0.35, maxX: hw * 0.35, minZ: -hd * 0.35, maxZ: hd * 0.35 },
        { name: 'الجناح الشمالي', minX: -hw * 0.35, maxX: hw * 0.35, minZ: hd * 0.35, maxZ: hd },
        { name: 'الجناح الجنوبي', minX: -hw * 0.35, maxX: hw * 0.35, minZ: -hd, maxZ: -hd * 0.35 },
        { name: 'الجناح الشرقي', minX: hw * 0.35, maxX: hw, minZ: -hd * 0.35, maxZ: hd * 0.35 },
        { name: 'الجناح الغربي', minX: -hw, maxX: -hw * 0.35, minZ: -hd * 0.35, maxZ: hd * 0.35 },
      ];

    default:
      return [
        { name: 'الكتلة الرئيسية', minX: -hw, maxX: hw, minZ: -hd, maxZ: hd },
      ];
  }
}

/**
 * Computes strictly contained, elegant room slots for any building shape and room count
 * NEVER places rooms in courtyards or outside exterior walls!
 */
export function computeRoomSlotsForFloor(
  shapeType: string,
  width: number,
  depth: number,
  roomCount: number
): RoomSlot[] {
  if (roomCount <= 0) return [];

  const wings = getBuildingWings(shapeType, width, depth);
  const slots: RoomSlot[] = [];

  if (wings.length > 1) {
    // Distribute rooms across wings
    const wingRoomCounts: number[] = new Array(wings.length).fill(0);
    for (let i = 0; i < roomCount; i++) {
      wingRoomCounts[i % wings.length]++;
    }

    let roomIndex = 0;
    wings.forEach((wing, wIdx) => {
      const countInWing = wingRoomCounts[wIdx];
      if (countInWing === 0) return;

      const wingW = wing.maxX - wing.minX;
      const wingD = wing.maxZ - wing.minZ;
      const margin = 0.35; // Wall setback

      const usableW = Math.max(1.2, wingW - margin * 2);
      const usableD = Math.max(1.2, wingD - margin * 2);

      // Divide wing along longer axis
      if (wingW >= wingD) {
        // Divide along X
        const subW = usableW / countInWing;
        for (let s = 0; s < countInWing; s++) {
          const cx = wing.minX + margin + s * subW + subW / 2;
          const cz = wing.minZ + margin + usableD / 2;
          const roomW = Math.max(1.0, subW * 0.92);
          const roomD = Math.max(1.0, usableD * 0.92);

          slots.push({
            id: `slot-${roomIndex++}`,
            x: cx,
            z: cz,
            width: roomW,
            depth: roomD,
            wingName: wing.name,
          });
        }
      } else {
        // Divide along Z
        const subD = usableD / countInWing;
        for (let s = 0; s < countInWing; s++) {
          const cx = wing.minX + margin + usableW / 2;
          const cz = wing.minZ + margin + s * subD + subD / 2;
          const roomW = Math.max(1.0, usableW * 0.92);
          const roomD = Math.max(1.0, subD * 0.92);

          slots.push({
            id: `slot-${roomIndex++}`,
            x: cx,
            z: cz,
            width: roomW,
            depth: roomD,
            wingName: wing.name,
          });
        }
      }
    });
  } else {
    // Single block or circular / polygon shapes
    if (shapeType === 'دائري' || shapeType === 'Dome' || shapeType === 'Octagonal') {
      const r = (Math.min(width, depth) / 2) * 0.75;
      if (roomCount === 1) {
        const side = r * 1.1;
        slots.push({ id: 'slot-0', x: 0, z: 0, width: side, depth: side, wingName: 'المركز' });
      } else {
        for (let i = 0; i < roomCount; i++) {
          const angle = (i / roomCount) * Math.PI * 2;
          const dist = r * 0.55;
          const cx = dist * Math.cos(angle);
          const cz = dist * Math.sin(angle);
          const side = Math.min(2.8, (2 * Math.PI * dist) / (roomCount * 1.3));
          slots.push({
            id: `slot-${i}`,
            x: cx,
            z: cz,
            width: side,
            depth: side,
            wingName: `جناح دائري ${i + 1}`,
          });
        }
      }
    } else {
      // Standard rectangular block
      const cols = roomCount > 4 ? 3 : roomCount > 1 ? 2 : 1;
      const rows = Math.ceil(roomCount / cols);
      const cellW = (width - 0.8) / cols;
      const cellD = (depth - 0.8) / rows;

      for (let i = 0; i < roomCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = -width / 2 + 0.4 + col * cellW + cellW / 2;
        const z = -depth / 2 + 0.4 + row * cellD + cellD / 2;

        slots.push({
          id: `slot-${i}`,
          x,
          z,
          width: cellW * 0.92,
          depth: cellD * 0.92,
          wingName: 'الكتلة الرئيسية',
        });
      }
    }
  }

  // Safety Clamp: Validate each slot against polygon boundary
  // If any corner is outside, gently shrink the slot so it is 100% inside
  return slots.map((slot) => {
    let w = slot.width;
    let d = slot.depth;
    let attempts = 0;
    while (attempts < 5 && !isBoxInBuildingFootprint(slot.x, slot.z, w, d, shapeType, width, depth, 0.08)) {
      w *= 0.85;
      d *= 0.85;
      attempts++;
    }
    return { ...slot, width: Math.max(0.8, w), depth: Math.max(0.8, d) };
  });
}

/**
 * Extracts exterior wall segments from the polygon boundary
 * Every window will be placed along an actual wall segment, never spanning open air!
 */
export function getBuildingExteriorWallSegments(
  shapeType: string,
  width: number,
  depth: number
): WallSegment[] {
  const poly = getBuildingFootprintPolygon(shapeType, width, depth);
  const segments: WallSegment[] = [];

  const addPolygonSegments = (points: Building2DPoint[], isCourtyard: boolean) => {
    for (let i = 0; i < points.length; i++) {
      const nextIdx = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[nextIdx];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(-dz, dx);

      segments.push({
        x1: p1.x,
        z1: p1.z,
        x2: p2.x,
        z2: p2.z,
        length,
        angle,
        isCourtyardFacing: isCourtyard,
      });
    }
  };

  addPolygonSegments(poly.outer, false);

  for (const hole of poly.holes) {
    addPolygonSegments(hole, true);
  }

  return segments;
}

/**
 * Finds a guaranteed valid exterior entrance door position on a solid outer wall
 */
export function getMainEntranceDoorPosition(
  shapeType: string,
  width: number,
  depth: number
): { x: number; z: number; rotationY: number } {
  const hw = width / 2;
  const hd = depth / 2;

  switch (shapeType) {
    case 'U-Shape':
      // Entrance on the back wall of base wing (z = hd)
      return { x: 0, z: hd + 0.05, rotationY: 0 };

    case 'L-Shape':
      // Entrance on front vertical wing tip (z = -hd)
      return { x: -hw / 2, z: -hd - 0.05, rotationY: Math.PI };

    case 'H-Shape':
      // Entrance on Left Wing front tip
      return { x: -hw * 0.67, z: -hd - 0.05, rotationY: Math.PI };

    case 'T-Shape':
      // Entrance on front stem tip
      return { x: 0, z: -hd - 0.05, rotationY: Math.PI };

    case 'Courtyard':
      // Entrance on South outer wall
      return { x: 0, z: -hd - 0.05, rotationY: Math.PI };

    case 'Cross-Shape':
      return { x: 0, z: -hd - 0.05, rotationY: Math.PI };

    case 'مثلث':
      return { x: 0, z: hd + 0.05, rotationY: 0 };

    case 'دائري':
    case 'Dome':
    case 'Octagonal': {
      const r = Math.min(hw, hd);
      return { x: 0, z: r + 0.05, rotationY: 0 };
    }

    default:
      return { x: 0, z: hd + 0.05, rotationY: 0 };
  }
}

/**
 * Finds a guaranteed valid interior position for inside or roof equipment
 */
export function getInsideEquipmentPosition(
  shapeType: string,
  width: number,
  depth: number,
  idx: number,
  totalCount: number = 1
): { x: number; z: number; wingName: string } {
  const wings = getBuildingWings(shapeType, width, depth);
  if (wings.length === 0) {
    return { x: 0, z: 0, wingName: 'الكتلة الرئيسية' };
  }

  const wing = wings[idx % wings.length];
  const itemsInThisWing = Math.max(1, Math.ceil(totalCount / wings.length));
  const subIdx = Math.floor(idx / wings.length);

  const wingW = Math.max(0.5, wing.maxX - wing.minX - 1.0);
  const wingD = Math.max(0.5, wing.maxZ - wing.minZ - 1.0);

  let x = (wing.minX + wing.maxX) / 2;
  let z = (wing.minZ + wing.maxZ) / 2;

  if (itemsInThisWing > 1) {
    if (wingW >= wingD) {
      const step = wingW / itemsInThisWing;
      x = (wing.minX + 0.5) + step * (subIdx + 0.5);
    } else {
      const step = wingD / itemsInThisWing;
      z = (wing.minZ + 0.5) + step * (subIdx + 0.5);
    }
  }

  return { x, z, wingName: wing.name };
}
