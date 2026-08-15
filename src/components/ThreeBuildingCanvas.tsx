import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  RotateCw,
  Layers,
  Sun,
  Moon,
  Sliders,
  X,
  Building,
  DoorOpen,
  Box,
  Users,
  Briefcase,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { EquipmentItem, Room, UnitDesignFinishing } from '../types';
import { Lightbulb, LightbulbOff } from 'lucide-react';
import { toArabicDigits } from '../utils/arabicUtils';
import { safeSetItem } from '../utils/storageUtils';

interface ThreeBuildingCanvasProps {
  unitCode: string;
  unitName?: string;
  unitType?: string;
  conditionGrade?: string;
  buildingShape?: string;
  totalAreaSqM?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  floorsCount?: number;
  rooms?: Room[];
  selectedFloor?: string;
  viewMode?: 'exterior' | 'floor_cut' | 'walkthrough' | 'blueprint2d';
  equipment?: EquipmentItem[];
  onViewModeChange?: (mode: 'exterior' | 'floor_cut' | 'walkthrough' | 'blueprint2d') => void;
  onFloorChange?: (floor: string) => void;
  theme?: 'dark' | 'light';
  designFinishing?: UnitDesignFinishing;
  onUpdateDesignFinishing?: (finishing: UnitDesignFinishing) => void;
  unitStatus?: 'active' | 'decommissioned';
  decommissionReason?: string;
}

export const ThreeBuildingCanvas: React.FC<ThreeBuildingCanvasProps> = ({
  unitCode,
  unitName = 'وحدة سكنية / إدارية',
  unitType = 'building',
  conditionGrade = 'B',
  buildingShape = 'مستطيل',
  totalAreaSqM = 320,
  lengthM,
  widthM,
  heightM,
  floorsCount = 2,
  rooms = [],
  selectedFloor = 'G',
  viewMode = 'exterior',
  equipment = [],
  onViewModeChange,
  onFloorChange,
  theme = 'dark',
  designFinishing,
  onUpdateDesignFinishing,
  unitStatus = 'active',
  decommissionReason,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Controls & Display State
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isNightMode, setIsNightMode] = useState<boolean>(false);
  const [isNightLightsOn, setIsNightLightsOn] = useState<boolean>(true);
  const [explodePercent, setExplodePercent] = useState<number>(0);
  const [archStyle, setArchStyle] = useState<'modern' | 'classic' | 'industrial' | 'minimalist'>('modern');
  const [roofType, setRoofType] = useState<'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden' | 'pitched'>('flat_parapet');
  const [showFurniture, setShowFurniture] = useState<boolean>(true);
  const [showWindows, setShowWindows] = useState<boolean>(true);
  const [showTrees, setShowTrees] = useState<boolean>(true);
  const [interiorLightIntensity, setInteriorLightIntensity] = useState<number>(3.5);
  const [exteriorLightIntensity, setExteriorLightIntensity] = useState<number>(3.5);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [activePerspective, setActivePerspective] = useState<'isometric' | 'top' | 'front'>('isometric');

  // Load and sync persisted unit finishes per unitCode
  useEffect(() => {
    const savedStr = localStorage.getItem(`unit_finishing_${unitCode}`);
    let saved: UnitDesignFinishing | null = null;
    if (savedStr) {
      try {
        saved = JSON.parse(savedStr);
      } catch (e) {}
    }
    const initial = designFinishing || saved;
    if (initial) {
      setArchStyle(initial.archStyle || 'modern');
      setRoofType(initial.roofType || 'flat');
      setShowFurniture(typeof initial.showFurniture === 'boolean' ? initial.showFurniture : true);
      setShowWindows(typeof initial.showWindows === 'boolean' ? initial.showWindows : true);
      setShowTrees(typeof initial.showTrees === 'boolean' ? initial.showTrees : true);
      setInteriorLightIntensity(typeof initial.interiorLightIntensity === 'number' ? initial.interiorLightIntensity : 3.5);
      setExteriorLightIntensity(typeof initial.exteriorLightIntensity === 'number' ? initial.exteriorLightIntensity : 3.5);
    } else {
      // Revert to unit default features if no custom finishing exists for this specific unit
      setArchStyle('modern');
      setRoofType('flat');
      setShowFurniture(true);
      setShowWindows(true);
      setShowTrees(true);
      setInteriorLightIntensity(3.5);
      setExteriorLightIntensity(3.5);
    }
  }, [unitCode, designFinishing]);

  const saveFinishingSettings = (updated: Partial<UnitDesignFinishing>) => {
    const current: UnitDesignFinishing = {
      archStyle,
      roofType,
      showFurniture,
      showWindows,
      showTrees,
      interiorLightIntensity,
      exteriorLightIntensity,
      ...updated,
    };
    safeSetItem(`unit_finishing_${unitCode}`, current);
    if (onUpdateDesignFinishing) {
      onUpdateDesignFinishing(current);
    }
  };

  // Selected Room Details for Raycasting Overlay
  const [selectedRoomData, setSelectedRoomData] = useState<{
    id: string;
    name: string;
    floorName: string;
    dimensions: string;
    area: string;
    type: string;
    contents: string[];
  } | null>(null);

  // Walkthrough position state for human camera
  const [camPos, setCamPos] = useState<{ x: number; z: number; rotY: number }>({
    x: 0,
    z: 2.5,
    rotY: 0,
  });

  // Scene references for cleanup & animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const floorGroupsRef = useRef<THREE.Group[]>([]);
  const roomMeshesRef = useRef<THREE.Mesh[]>([]);
  const roomHighlightRef = useRef<THREE.LineSegments | null>(null);

  const isCaravan = unitType === 'caravan' || unitCode.includes('CRV');

  // Filter rooms belonging to selected floor
  const floorRooms = rooms.filter((rm) => {
    const rmFloorStr = String(rm.floor || (rm as any).floorNumber || '1').toUpperCase();
    if (selectedFloor === 'G') return rmFloorStr === 'G' || rmFloorStr === '1' || rmFloorStr === '0';
    if (selectedFloor === '1') return rmFloorStr === '1' || rmFloorStr === '2';
    if (selectedFloor === '2') return rmFloorStr === '2' || rmFloorStr === '3';
    return true;
  });

  // Calculate 3D dimensions from lengthM, widthM, heightM or fallback to totalAreaSqM
  const baseArea = Math.max(35, totalAreaSqM / Math.max(1, floorsCount));
  const baseScale = Math.sqrt(baseArea / 30);
  const width = lengthM ? Math.min(30, Math.max(4, lengthM * 0.5)) : Math.min(18, Math.max(6.0, 7.5 * baseScale));
  const depth = widthM ? Math.min(25, Math.max(3, widthM * 0.5)) : Math.min(14, Math.max(4.5, 5.5 * baseScale));
  const storyHeight = heightM ? heightM : (isCaravan ? 2.6 : 3.2);

  // Main Three.js Scene Initialization & Re-render
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const w = container.clientWidth || 700;
    const h = container.clientHeight || 480;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const bgHex = isNightMode ? 0x020617 : theme === 'light' ? 0xe2e8f0 : 0x090d16;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.008);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    cameraRef.current = camera;

    const totalY = floorsCount * storyHeight;
    camera.position.set(22, totalY + 8, 26);
    camera.lookAt(0, totalY / 2, 0);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going below ground
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.target.set(0, totalY / 2, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;

    // 5. Dynamic Lighting System
    setupLights(scene, isNightMode, theme, exteriorLightIntensity);

    // 6. Ground Pad, Grid, and Peripheral Environment (with night floodlights if enabled)
    setupEnvironment(scene, width, depth, showTrees, isNightMode, isNightLightsOn, theme, exteriorLightIntensity);

    // 7. Main Building Architecture Group
    const buildingGroup = new THREE.Group();
    buildingGroupRef.current = buildingGroup;
    scene.add(buildingGroup);

    floorGroupsRef.current = [];
    roomMeshesRef.current = [];

    // Condition Grade Color
    const gradeHex =
      conditionGrade === 'A'
        ? 0x10b981
        : conditionGrade === 'B'
        ? 0x3b82f6
        : conditionGrade === 'C'
        ? 0xf59e0b
        : 0xef4444;

    // Facade & Accent Colors based on Arch Style
    const styleColors = {
      modern: { facade: 0xf8fafc, accent: 0x0f172a, glass: 0x93c5fd },
      classic: { facade: 0xe2e8f0, accent: 0x78350f, glass: 0xfef08a },
      industrial: { facade: 0x64748b, accent: 0x1e293b, glass: 0x38bdf8 },
      minimalist: { facade: 0xffffff, accent: 0x334155, glass: 0xe0f2fe },
    }[archStyle];

    if (isCaravan) {
      // --- CARAVAN / FIELD CABIN MODEL ---
      const caravanGroup = new THREE.Group();
      caravanGroup.userData = { floorIndex: 0, baseElevation: 0 };
      floorGroupsRef.current.push(caravanGroup);
      buildingGroup.add(caravanGroup);

      // Chassis Beams
      const chassisGeo = new THREE.BoxGeometry(width + 0.6, 0.35, depth + 0.3);
      const chassisMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const chassis = new THREE.Mesh(chassisGeo, chassisMat);
      chassis.position.y = 0.18;
      chassis.castShadow = true;
      caravanGroup.add(chassis);

      // Body Sandwich Panel
      const bodyGeo = new THREE.BoxGeometry(width, storyHeight - 0.3, depth);
      const bodyMat = new THREE.MeshStandardMaterial({ color: styleColors.facade, roughness: 0.35 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = storyHeight / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      caravanGroup.add(body);

      // Corrugation Ribs
      const ribCount = Math.floor(width / 0.6);
      for (let i = 0; i <= ribCount; i++) {
        const rx = -width / 2 + i * 0.6;
        const ribGeo = new THREE.BoxGeometry(0.04, storyHeight - 0.32, depth + 0.03);
        const ribMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1 });
        const rib = new THREE.Mesh(ribGeo, ribMat);
        rib.position.set(rx, storyHeight / 2, 0);
        caravanGroup.add(rib);
      }

      // Roof
      const roofGeo = new THREE.BoxGeometry(width + 0.4, 0.2, depth + 0.4);
      const roofMat = new THREE.MeshStandardMaterial({ color: styleColors.accent, metalness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = storyHeight - 0.05;
      caravanGroup.add(roof);

      // Status Beacon
      const beaconGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16);
      const beaconMat = new THREE.MeshStandardMaterial({ color: gradeHex, emissive: gradeHex, emissiveIntensity: 0.9 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, storyHeight + 0.2, 0);
      caravanGroup.add(beacon);

      // Windows and Door
      if (showWindows) {
        const doorGeo = new THREE.BoxGeometry(0.08, 2.1, 0.95);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(width / 2 + 0.02, 1.1, 0);
        caravanGroup.add(door);

        const winGeo = new THREE.BoxGeometry(1.1, 1.0, 0.08);
        const winMat = new THREE.MeshPhysicalMaterial({ color: styleColors.glass, transparent: true, opacity: 0.4, transmission: 0.7 });
        const win1 = new THREE.Mesh(winGeo, winMat);
        win1.position.set(-width / 4, 1.6, depth / 2 + 0.02);
        caravanGroup.add(win1);
        const win2 = new THREE.Mesh(winGeo, winMat);
        win2.position.set(width / 4, 1.6, depth / 2 + 0.02);
        caravanGroup.add(win2);
      }

      // Rooms & Furniture inside caravan
      renderInteriorRooms(caravanGroup, rooms, 0, width, depth, storyHeight, showFurniture, isNightMode && isNightLightsOn, roomMeshesRef.current, interiorLightIntensity);
    } else {
      // --- DYNAMIC MULTI-STORY BUILDING ---
      const shape2D = createBuildingShape(buildingShape, width, depth);

      const wallMat = new THREE.MeshStandardMaterial({
        color: styleColors.facade,
        roughness: archStyle === 'industrial' ? 0.7 : 0.4,
        side: THREE.DoubleSide,
      });

      const beamMat = new THREE.MeshStandardMaterial({
        color: styleColors.accent,
        roughness: 0.3,
      });

      const glassIsLit = (isNightMode && isNightLightsOn) || interiorLightIntensity > 2.0;
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: styleColors.glass,
        transparent: true,
        opacity: showWindows ? 0.35 : 0.9,
        roughness: 0.1,
        transmission: 0.7,
        ior: 1.5,
        emissive: glassIsLit ? 0xfef08a : 0x000000,
        emissiveIntensity: glassIsLit ? Math.min(3.0, 0.4 * interiorLightIntensity) : 0.0,
      });

      const totalStories = Math.max(1, Math.min(8, floorsCount));

      for (let f = 0; f < totalStories; f++) {
        const floorGroup = new THREE.Group();
        const baseElevation = f * storyHeight;
        floorGroup.userData = { floorIndex: f, baseElevation };
        floorGroup.position.y = baseElevation;

        // Floor Base Concrete Slab
        const slabSettings = { steps: 1, depth: 0.25, bevelEnabled: false };
        const slabGeom = new THREE.ExtrudeGeometry(shape2D, slabSettings);
        slabGeom.rotateX(-Math.PI / 2);
        const slabMesh = new THREE.Mesh(slabGeom, beamMat);
        slabMesh.position.y = 0.12;
        slabMesh.receiveShadow = true;
        floorGroup.add(slabMesh);

        // Extrude Story Walls
        const extrudeSettings = {
          steps: 1,
          depth: storyHeight - 0.3,
          bevelEnabled: true,
          bevelThickness: 0.04,
          bevelSize: 0.04,
          bevelSegments: 2,
        };

        const geom = new THREE.ExtrudeGeometry(shape2D, extrudeSettings);
        geom.rotateX(-Math.PI / 2);
        const storyMesh = new THREE.Mesh(geom, wallMat);
        storyMesh.position.y = 0.25;
        storyMesh.castShadow = true;
        storyMesh.receiveShadow = true;
        floorGroup.add(storyMesh);

        // Glass Curtain Front Facade Panels
        if (showWindows) {
          const glassFrontGeo = new THREE.BoxGeometry(width - 1.2, storyHeight - 0.8, 0.1);
          const frontGlass = new THREE.Mesh(glassFrontGeo, glassMat);
          frontGlass.position.set(0, storyHeight / 2, depth / 2 + 0.02);
          floorGroup.add(frontGlass);

          const backGlass = frontGlass.clone();
          backGlass.position.z = -depth / 2 - 0.02;
          floorGroup.add(backGlass);
        }

        // Entrance Door on Ground Floor
        if (f === 0) {
          const doorGeo = new THREE.BoxGeometry(1.4, 2.2, 0.15);
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
          const mainDoor = new THREE.Mesh(doorGeo, doorMat);
          mainDoor.position.set(0, 1.1, depth / 2 + 0.06);
          floorGroup.add(mainDoor);
        }

        // Render Interior Rooms & Furniture
        renderInteriorRooms(floorGroup, rooms, f, width, depth, storyHeight, showFurniture, isNightMode && isNightLightsOn, roomMeshesRef.current, interiorLightIntensity);

        floorGroupsRef.current.push(floorGroup);
        buildingGroup.add(floorGroup);
      }

      // Roof Structure
      const roofTopY = totalStories * storyHeight;
      createRoofStructure(buildingGroup, floorGroupsRef.current, roofType, shape2D, buildingShape, styleColors.accent, width, depth, roofTopY, storyHeight, gradeHex);
    }

    // Equipment Models
    renderEquipmentMeshes(buildingGroup, equipment, width, depth, floorsCount * storyHeight, roomMeshesRef.current);

    // Apply Explode Separation
    applyExplodeOffset(floorGroupsRef.current, explodePercent);

    // 8. Raycaster Pointer Event Handler for Room Selection
    const handlePointerDown = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      const intersects = raycaster.intersectObjects(roomMeshesRef.current, true);

      if (intersects.length > 0) {
        const hitRoom = intersects[0].object as THREE.Mesh;
        if (hitRoom.userData && hitRoom.userData.isRoom) {
          highlightRoomMesh(hitRoom, scene, roomHighlightRef);
          setSelectedRoomData(hitRoom.userData as any);
        }
      }
    };

    const canvasElem = renderer.domElement;
    canvasElem.addEventListener('pointerdown', handlePointerDown);

    // 9. ResizeObserver for responsive layout & initial mount auto-resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const width = container.clientWidth || 700;
      const height = container.clientHeight || 480;
      if (width > 0 && height > 0) {
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Trigger resize twice shortly after mount to ensure accurate full width after flex layout settles
    handleResize();
    const resizeTimer1 = setTimeout(handleResize, 50);
    const resizeTimer2 = setTimeout(handleResize, 250);

    // 10. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      clearTimeout(resizeTimer1);
      clearTimeout(resizeTimer2);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      canvasElem.removeEventListener('pointerdown', handlePointerDown);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [
    unitCode,
    unitName,
    unitType,
    conditionGrade,
    buildingShape,
    totalAreaSqM,
    floorsCount,
    rooms,
    equipment,
    theme,
    isNightMode,
    isNightLightsOn,
    archStyle,
    roofType,
    showFurniture,
    showWindows,
    showTrees,
    interiorLightIntensity,
    exteriorLightIntensity,
    autoRotate,
  ]);

  // Handle Explode Slider Offset updates dynamically
  useEffect(() => {
    applyExplodeOffset(floorGroupsRef.current, explodePercent);
  }, [explodePercent]);

  // Handle View Mode changes
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const totalY = floorsCount * storyHeight;

    if (viewMode === 'floor_cut') {
      setExplodePercent(50);
      camera.position.set(16, totalY + 12, 18);
      controls.target.set(0, totalY / 2, 0);
    } else if (viewMode === 'blueprint2d') {
      setExplodePercent(0);
      camera.position.set(0, totalY + 28, 0.01);
      controls.target.set(0, 0, 0);
    } else if (viewMode === 'walkthrough') {
      setExplodePercent(0);
      camera.position.set(camPos.x, 1.6, camPos.z);
      controls.target.set(camPos.x - Math.sin(camPos.rotY) * 5, 1.6, camPos.z - Math.cos(camPos.rotY) * 5);
    } else {
      // Exterior
      setExplodePercent(0);
      camera.position.set(22, totalY + 8, 26);
      controls.target.set(0, totalY / 2, 0);
    }
    controls.update();
  }, [viewMode, floorsCount, storyHeight]);

  // Preset Camera Views
  const setCameraPerspective = (type: 'isometric' | 'top' | 'front' | 'reset') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const totalY = floorsCount * storyHeight;

    if (type === 'isometric' || type === 'reset') {
      camera.position.set(22, totalY + 8, 26);
      controls.target.set(0, totalY / 2, 0);
      setActivePerspective('isometric');
    } else if (type === 'top') {
      camera.position.set(0, totalY + 32, 0.01);
      controls.target.set(0, 0, 0);
      setActivePerspective('top');
    } else if (type === 'front') {
      camera.position.set(0, totalY / 2 + 1, depth + 22);
      controls.target.set(0, totalY / 2, 0);
      setActivePerspective('front');
    }
    controls.update();
  };

  // Walkthrough navigation
  const handleWalkMove = (dir: 'forward' | 'backward' | 'turnLeft' | 'turnRight') => {
    setCamPos((prev) => {
      let { x, z, rotY } = prev;
      const step = 0.6;
      const rotStep = 0.18;

      if (dir === 'turnLeft') rotY += rotStep;
      if (dir === 'turnRight') rotY -= rotStep;
      if (dir === 'forward') {
        x -= Math.sin(rotY) * step;
        z -= Math.cos(rotY) * step;
      }
      if (dir === 'backward') {
        x += Math.sin(rotY) * step;
        z += Math.cos(rotY) * step;
      }

      x = Math.max(-width / 2 + 0.8, Math.min(width / 2 - 0.8, x));
      z = Math.max(-depth / 2 + 0.8, Math.min(depth / 2 - 0.8, z));

      if (cameraRef.current && controlsRef.current && viewMode === 'walkthrough') {
        cameraRef.current.position.set(x, 1.6, z);
        controlsRef.current.target.set(x - Math.sin(rotY) * 5, 1.6, z - Math.cos(rotY) * 5);
        controlsRef.current.update();
      }

      return { x, z, rotY };
    });
  };

  // Take Canvas Snapshot Export
  const takeSnapshot = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `مجسم_3D_${unitCode}_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* 3D Control Bar - Positioned outside above the 3D canvas */}
      <div className={`p-3 rounded-2xl border shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
        isNightMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        {/* Camera Views Perspective Shortcuts */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border transition-colors ${
          isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setCameraPerspective('isometric')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activePerspective === 'isometric'
                ? 'bg-amber-500 text-slate-950 shadow'
                : isNightMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            منظور أساسي
          </button>
          <button
            onClick={() => setCameraPerspective('top')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activePerspective === 'top'
                ? 'bg-amber-500 text-slate-950 shadow'
                : isNightMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            مسقط علوي
          </button>
          <button
            onClick={() => setCameraPerspective('front')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activePerspective === 'front'
                ? 'bg-amber-500 text-slate-950 shadow'
                : isNightMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            واجهة
          </button>
        </div>

        {unitStatus === 'decommissioned' && (
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-black flex items-center gap-1.5" title={decommissionReason || 'وحدة مشطوبة ومجمدة عن الخدمة'}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>🔒 وحدة مشطوبة ومجمدة</span>
          </div>
        )}

        {/* Action Controls (Day/Night, Night Lighting Toggle, Auto-rotate, Settings Drawer) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isNightMode
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-amber-500/20 text-amber-700 border-amber-500/40'
            }`}
            title={isNightMode ? 'الوضع الليلي (مفعل)' : 'وضع النهار (مفعل)'}
          >
            {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>{isNightMode ? 'ليلي' : 'نهاري'}</span>
          </button>

          {isNightMode && (
            <button
              onClick={() => setIsNightLightsOn(!isNightLightsOn)}
              className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isNightLightsOn
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={isNightLightsOn ? 'إطفاء الإنارة الخارجية والداخلية' : 'تشغيل الإنارة الخارجية والداخلية'}
            >
              {isNightLightsOn ? <Lightbulb className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <LightbulbOff className="w-3.5 h-3.5" />}
              <span>{isNightLightsOn ? 'الإنارة مفعلة' : 'الإنارة مطفأة'}</span>
            </button>
          )}

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 cursor-pointer ${
              autoRotate
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : isNightMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={autoRotate ? 'إيقاف التدوير التلقائي' : 'تشغيل التدوير التلقائي'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>تدوير</span>
          </button>

          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 cursor-pointer ${
              showSettingsPanel
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : isNightMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="إعدادات الهيكل والتصميم"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>تخصيص المعالم</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div
        className={`relative w-full h-[520px] rounded-2xl overflow-hidden border shadow-2xl flex flex-col select-none transition-colors ${
          isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}
      >
        {/* 3D WebGL Canvas Host Container - Single Ref & Full Mouse Interaction */}
        <div
          ref={mountRef}
          className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
        />

      {/* Floating Exploded View Control Bar (Bottom Center) */}
      {!isCaravan && floorsCount > 1 && (
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-10 backdrop-blur-md px-4 py-2 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs w-72 sm:w-80 transition-colors ${
          isNightMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <span className={`font-bold whitespace-nowrap flex items-center gap-1 ${isNightMode ? 'text-amber-400' : 'text-amber-700'}`}>
            <Layers className="w-3.5 h-3.5" />
            تفكيك الطوابق:
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={explodePercent}
            onChange={(e) => setExplodePercent(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className={`font-mono font-bold w-10 text-left ${isNightMode ? 'text-slate-300' : 'text-slate-800'}`}>{toArabicDigits(explodePercent)}%</span>
        </div>
      )}

      {/* Floating Architectural Customization Panel */}
      {showSettingsPanel && (
        <div className={`absolute top-16 right-3 z-30 w-72 sm:w-80 backdrop-blur-md rounded-2xl border p-4 shadow-2xl space-y-4 text-xs animate-in fade-in slide-in-from-top-2 transition-colors ${
          isNightMode
            ? 'bg-slate-900/95 border-slate-800 text-slate-200'
            : 'bg-white/95 border-slate-200 text-slate-800'
        }`}>
          <div className={`flex items-center justify-between border-b pb-2 ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <h4 className={`font-extrabold flex items-center gap-1.5 ${isNightMode ? 'text-amber-400' : 'text-amber-700'}`}>
              <Building className="w-4 h-4" />
              تخصيص التصميم والتشطيب
            </h4>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className={`p-1 rounded-lg ${isNightMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className={`block font-bold mb-1 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>النمط المعماري:</label>
              <select
                value={archStyle}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setArchStyle(val);
                  saveFinishingSettings({ archStyle: val });
                }}
                className={`w-full border rounded-xl p-2 font-bold outline-none cursor-pointer transition-colors ${
                  isNightMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-600'
                }`}
              >
                <option value="modern">حديث مع واجهات زجاجية (Modern Glass)</option>
                <option value="classic">كلاسيكي حجري (Classic Stone)</option>
                <option value="industrial">صناعي متطور (Industrial Frame)</option>
                <option value="minimalist">بسيط وأنيق (Minimalist White)</option>
              </select>
            </div>

            <div>
              <label className={`block font-bold mb-1 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>نوع السطح والتصميم:</label>
              <select
                value={roofType}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setRoofType(val);
                  saveFinishingSettings({ roofType: val });
                }}
                className={`w-full border rounded-xl p-2 font-bold outline-none cursor-pointer transition-colors ${
                  isNightMode
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-amber-600'
                }`}
              >
                <option value="flat">سطح مسطح (سطح مستوي)</option>
                <option value="flat_parapet">سطح مسطح مع سياج السطح</option>
                <option value="gabled">سطح مثلث مائل الشكل (مخصص للجملونات)</option>
                <option value="pitched_tile">سطح من القرميد مائل الشكل</option>
                <option value="garden">سطح حديقة خضراء (Roof Garden)</option>
              </select>
            </div>

            <div className={`space-y-2 pt-1 border-t ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <label className={`flex items-center gap-2 cursor-pointer ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={showFurniture}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowFurniture(checked);
                    saveFinishingSettings({ showFurniture: checked });
                  }}
                  className="rounded border-slate-400 accent-amber-500"
                />
                <span>إظهار الأثاث والمعدات الداخلية</span>
              </label>

              <label className={`flex items-center gap-2 cursor-pointer ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={showWindows}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowWindows(checked);
                    saveFinishingSettings({ showWindows: checked });
                  }}
                  className="rounded border-slate-400 accent-amber-500"
                />
                <span>نوافذ وواجهات زجاجية شفافة</span>
              </label>

              <label className={`flex items-center gap-2 cursor-pointer ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <input
                  type="checkbox"
                  checked={showTrees}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowTrees(checked);
                    saveFinishingSettings({ showTrees: checked });
                  }}
                  className="rounded border-slate-400 accent-amber-500"
                />
                <span>إظهار المحيط والبيئة الميدانية (أشجار)</span>
              </label>
            </div>

            {/* Lighting Intensity Controls */}
            <div className={`space-y-3 pt-3 border-t ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <label className={`font-extrabold flex items-center gap-1.5 text-xs ${isNightMode ? 'text-amber-400' : 'text-amber-700'}`}>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>التحكم بشدة وسطوع الإنارة:</span>
                </label>
              </div>

              {/* Interior Lighting Slider */}
              <div>
                <div className="flex items-center justify-between mb-1 font-bold">
                  <span className={`flex items-center gap-1.5 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    الإنارة الداخلية (الغرف والأنوار):
                  </span>
                  <span className="font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px]">
                    {toArabicDigits(interiorLightIntensity.toFixed(1))}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={interiorLightIntensity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setInteriorLightIntensity(val);
                    saveFinishingSettings({ interiorLightIntensity: val });
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>

              {/* Exterior Lighting Slider */}
              <div>
                <div className="flex items-center justify-between mb-1 font-bold">
                  <span className={`flex items-center gap-1.5 ${isNightMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <Sun className="w-3.5 h-3.5 text-sky-400" />
                    الإنارة الخارجية (الكشافات والمحيط):
                  </span>
                  <span className="font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded text-[11px]">
                    {toArabicDigits(exteriorLightIntensity.toFixed(1))}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={exteriorLightIntensity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setExteriorLightIntensity(val);
                    saveFinishingSettings({ exteriorLightIntensity: val });
                  }}
                  className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Room Details Floating Overlay Card (Raycaster Selection) */}
      {selectedRoomData && (
        <div className={`absolute bottom-14 left-3 right-3 sm:right-auto sm:w-80 z-20 backdrop-blur-md rounded-2xl p-3.5 border shadow-2xl text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2 transition-colors ${
          isNightMode
            ? 'bg-slate-900/95 border-amber-500/40 text-slate-200'
            : 'bg-white/95 border-amber-500/60 text-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className={`p-2 rounded-xl font-bold ${
                isNightMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
              }`}>
                <DoorOpen className="w-4 h-4" />
              </span>
              <div>
                <h4 className={`font-extrabold text-sm ${isNightMode ? 'text-white' : 'text-slate-900'}`}>{selectedRoomData.name}</h4>
                <p className={`font-bold text-[11px] ${isNightMode ? 'text-amber-400' : 'text-amber-700'}`}>{selectedRoomData.floorName}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRoomData(null)}
              className={`p-1 rounded-lg ${isNightMode ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-800'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`p-2 rounded-xl border flex items-center justify-between ${
            isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-slate-500 text-xs font-bold">المساحة:</span>
            <strong className={`font-bold text-sm ${isNightMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{toArabicDigits(selectedRoomData.area)}</strong>
          </div>

          {selectedRoomData.contents && selectedRoomData.contents.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedRoomData.contents.map((item, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
                    isNightMode
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-slate-100 text-slate-700 border-slate-200/90 shadow-sm'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

// --- HELPER FUNCTION: DYNAMIC LIGHTS SETUP ---
function setupLights(scene: THREE.Scene, isNightMode: boolean, theme: string, exteriorIntensity: number = 3.5) {
  const mult = Math.max(0.3, exteriorIntensity / 2.5);
  const ambientLight = new THREE.AmbientLight(
    isNightMode ? 0x1e1b4b : 0xffffff,
    (isNightMode ? 0.35 : theme === 'light' ? 0.85 : 0.7) * mult
  );
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(
    isNightMode ? 0x60a5fa : 0xfffbeb,
    (isNightMode ? 0.3 : 1.25) * mult
  );
  sunLight.position.set(20, 35, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, (isNightMode ? 0.2 : 0.5) * mult);
  fillLight.position.set(-15, 15, -15);
  scene.add(fillLight);
}

// --- HELPER FUNCTION: SETUP ENVIRONMENT (Grid, Pavement, Trees, Floodlights) ---
function setupEnvironment(
  scene: THREE.Scene,
  width: number,
  depth: number,
  showTrees: boolean,
  isNightMode: boolean,
  isNightLightsOn: boolean,
  theme: string,
  exteriorIntensity: number = 3.5
) {
  const gridHelper = new THREE.GridHelper(100, 40, 0x3b82f6, 0x334155);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  const padW = width + 10;
  const padD = depth + 10;
  const padGeo = new THREE.BoxGeometry(padW, 0.2, padD);
  const padMat = new THREE.MeshStandardMaterial({
    color: isNightMode ? 0x0f172a : theme === 'light' ? 0xcbd5e1 : 0x1e293b,
    roughness: 0.8,
  });
  const padMesh = new THREE.Mesh(padGeo, padMat);
  padMesh.position.y = -0.1;
  padMesh.receiveShadow = true;
  scene.add(padMesh);

  if (showTrees) {
    const treePositions = [
      [-padW / 2 - 3, -padD / 2 - 3],
      [padW / 2 + 3, -padD / 2 - 3],
      [-padW / 2 - 3, padD / 2 + 3],
      [padW / 2 + 3, padD / 2 + 3],
    ];

    treePositions.forEach(([x, z]) => {
      const tree = createTreeMesh();
      tree.position.set(x, 0, z);
      scene.add(tree);
    });
  }

  // Outdoor Perimeter Floodlights for Night Lighting Mode or boosted exterior
  if (isNightMode && isNightLightsOn) {
    const postPositions = [
      [-padW / 2 + 1.2, -padD / 2 + 1.2],
      [padW / 2 - 1.2, -padD / 2 + 1.2],
      [-padW / 2 + 1.2, padD / 2 - 1.2],
      [padW / 2 - 1.2, padD / 2 - 1.2],
    ];

    const lightPower = 2.8 * (exteriorIntensity / 2.5);

    postPositions.forEach(([x, z]) => {
      // Lamp Post Pole
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.2, 12);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 2.1, z);
      scene.add(pole);

      // Lamp Head Fixture
      const headGeo = new THREE.BoxGeometry(0.6, 0.2, 0.6);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: Math.min(4.0, 1.2 * (exteriorIntensity / 2.5)),
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, 4.2, z);
      scene.add(head);

      // Floodlight Source Illuminating Ground & Building Outer Perimeter
      const lampLight = new THREE.PointLight(0xfffbeb, lightPower, 30);
      lampLight.position.set(x, 4.1, z);
      lampLight.castShadow = true;
      scene.add(lampLight);
    });
  }
}

function createTreeMesh(): THREE.Group {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 2.5, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  group.add(trunk);

  const folGeo = new THREE.ConeGeometry(1.6, 4.0, 8);
  const folMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
  const fol = new THREE.Mesh(folGeo, folMat);
  fol.position.y = 3.8;
  fol.castShadow = true;
  group.add(fol);

  return group;
}

// --- HELPER FUNCTION: INTERIOR ROOMS & FURNITURE RENDERING ---
function renderInteriorRooms(
  floorGroup: THREE.Group,
  rooms: Room[],
  floorIndex: number,
  width: number,
  depth: number,
  storyHeight: number,
  showFurniture: boolean,
  isNightMode: boolean,
  roomMeshesStore: THREE.Mesh[],
  interiorIntensity: number = 3.5
) {
  if (!rooms || rooms.length === 0) {
    return; // Strict rule: No fake default rooms if no rooms exist in database/unit state
  }

  const currentFloorRooms = rooms.filter((rm) => {
    const fStr = String(rm.floor || (rm as any).floorNumber || '1').toUpperCase();
    if (floorIndex === 0) {
      return (
        fStr === '1' ||
        fStr === 'G' ||
        fStr === '0' ||
        fStr.includes('1') ||
        fStr.includes('G') ||
        fStr.includes('الأرضي')
      );
    } else if (floorIndex === 1) {
      return fStr === '2' || fStr.includes('2') || fStr.includes('الأول');
    } else if (floorIndex === 2) {
      return fStr === '3' || fStr.includes('3') || fStr.includes('الثاني');
    }
    const idxStr = String(floorIndex + 1);
    return fStr === idxStr || fStr.includes(idxStr);
  });

  const activeRooms =
    currentFloorRooms.length > 0
      ? currentFloorRooms
      : floorIndex === 0
      ? rooms.filter((rm) => !rm.floor || rm.floor === '1' || rm.floor === 'G')
      : [];

  if (activeRooms.length === 0) return;

  const count = activeRooms.length;
  const cols = count > 4 ? 3 : count > 1 ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const cellW = (width - 0.8) / cols;
  const cellD = (depth - 0.8) / rows;

  activeRooms.forEach((rm, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);

    const x = -width / 2 + 0.4 + col * cellW + cellW / 2;
    const z = -depth / 2 + 0.4 + row * cellD + cellD / 2;

    const typeStr = (rm.type || rm.name || '').toLowerCase();
    const isStopped = rm.status === 'Stopped' || rm.status === 'متوقفة';
    const colorHex = isStopped
      ? 0xef4444
      : typeStr.includes('إداري') || typeStr.includes('مكتب')
      ? 0x0284c7
      : typeStr.includes('سيرفر') || typeStr.includes('مختبر') || typeStr.includes('خوادم')
      ? 0x10b981
      : typeStr.includes('اجتماعات') || typeStr.includes('قاعة')
      ? 0xf59e0b
      : typeStr.includes('استقبال') || typeStr.includes('راحة')
      ? 0x8b5cf6
      : typeStr.includes('مخزن') || typeStr.includes('ورشة')
      ? 0xd97706
      : 0x6366f1;

    // Room Floor Pad Mesh (Raycaster Target)
    const padGeo = new THREE.BoxGeometry(cellW * 0.92, 0.06, cellD * 0.92);
    const padMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.4,
      transparent: true,
      opacity: 0.85,
    });
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(x, 0.18, z);

    padMesh.userData = {
      isRoom: true,
      id: rm.id || `rm-${i}`,
      name: rm.name || `غرفة ${i + 1}`,
      floorName: rm.floor || (floorIndex === 0 ? 'الطابق الأرضي' : `الطابق ${floorIndex + 1}`),
      dimensions: `${(cellW * 0.92).toFixed(1)}م × ${(cellD * 0.92).toFixed(1)}م`,
      area: `${rm.areaSqM || Math.round((cellW * cellD) * 10) / 10} م²`,
      type: rm.type || 'غرفة مسجلة',
      contents: [
        isStopped ? 'الحالة: متوقفة 🔴' : 'الحالة: فعالة 🟢',
        isStopped && rm.notes ? `سبب التوقف: ${rm.notes}` : null,
        rm.occupiedBy ? `الجهة الشاغلة: ${rm.occupiedBy}` : null,
      ].filter(Boolean),
    };

    floorGroup.add(padMesh);
    roomMeshesStore.push(padMesh);

    // Partition Divider Walls
    const wallH = storyHeight - 0.6;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 });
    if (col < cols - 1) {
      const pWallGeo = new THREE.BoxGeometry(0.08, wallH, cellD * 0.9);
      const pWall = new THREE.Mesh(pWallGeo, wallMat);
      pWall.position.set(x + cellW / 2, wallH / 2 + 0.2, z);
      floorGroup.add(pWall);
    }

    // Interior Furniture Models
    if (showFurniture) {
      renderFurnitureInRoom(floorGroup, rm.type || rm.name || '', x, 0.25, z);
    }

    // Interior Light Source (always rendered when interior intensity > 1.0 or night mode)
    if (isNightMode || interiorIntensity > 1.5) {
      const pIntensity = (isNightMode ? 1.8 : 1.0) * (interiorIntensity / 2.5);
      const roomLight = new THREE.PointLight(colorHex, pIntensity, 12);
      roomLight.position.set(x, storyHeight - 0.5, z);
      floorGroup.add(roomLight);
    }
  });
}

function renderFurnitureInRoom(parentGroup: THREE.Group, type: string, x: number, y: number, z: number) {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  if (type.includes('اجتماعات') || type.includes('قاعة')) {
    const tableGeo = new THREE.BoxGeometry(2.2, 0.65, 1.1);
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.32;
    group.add(table);

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    [-0.8, 0, 0.8].forEach((cx) => {
      const chair1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), chairMat);
      chair1.position.set(cx, 0.25, 0.7);
      group.add(chair1);

      const chair2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), chairMat);
      chair2.position.set(cx, 0.25, -0.7);
      group.add(chair2);
    });
  } else if (type.includes('استقبال') || type.includes('راحة')) {
    const sofaGeo = new THREE.BoxGeometry(2.0, 0.55, 0.8);
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const sofa = new THREE.Mesh(sofaGeo, sofaMat);
    sofa.position.set(0, 0.28, -0.6);
    group.add(sofa);

    const cTable = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    cTable.position.set(0, 0.18, 0.1);
    group.add(cTable);
  } else if (type.includes('سيرفر')) {
    const rackGeo = new THREE.BoxGeometry(0.7, 1.6, 0.7);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const rack1 = new THREE.Mesh(rackGeo, rackMat);
    rack1.position.set(-0.6, 0.8, 0);
    group.add(rack1);

    const rack2 = new THREE.Mesh(rackGeo, rackMat);
    rack2.position.set(0.6, 0.8, 0);
    group.add(rack2);
  } else {
    // Standard Desks
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const desk1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.6), deskMat);
    desk1.position.set(-0.6, 0.3, -0.4);
    group.add(desk1);

    const desk2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.6), deskMat);
    desk2.position.set(0.6, 0.3, 0.4);
    group.add(desk2);
  }

  parentGroup.add(group);
}

// --- HELPER FUNCTION: ROOF STRUCTURE ---
function createRoofStructure(
  buildingGroup: THREE.Group,
  floorGroups: THREE.Group[],
  roofType: 'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden' | 'pitched',
  shape2D: THREE.Shape,
  buildingShape: string,
  accentColorHex: number,
  width: number,
  depth: number,
  roofTopY: number,
  storyHeight: number,
  gradeHex: number
) {
  const roofGroup = new THREE.Group();
  roofGroup.userData = { isRoof: true };

  const roofMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.6 });

  // Calculate local base Y depending on whether attached to top floor group or main building group
  const baseRoofY = floorGroups.length > 0 ? storyHeight : roofTopY;

  // 1. Concrete Structural Base Slab (Extruded directly from shape2D to guarantee 100% exact footprint match)
  const slabSettings = { steps: 1, depth: 0.22, bevelEnabled: false };
  const slabGeom = new THREE.ExtrudeGeometry(shape2D, slabSettings);
  slabGeom.rotateX(-Math.PI / 2);
  const slab = new THREE.Mesh(slabGeom, roofMat);
  slab.position.set(0, baseRoofY + 0.11, 0);
  slab.castShadow = true;
  slab.receiveShadow = true;
  roofGroup.add(slab);

  if (roofType === 'gabled') {
    // --- 3. GABLED TRIANGULAR TRUSS ROOF (سطح مثلث مائل الشكل - مخصص للجملونات والهناجر) ---
    // Rule: Pointed apex at the top center with a base spanning 100% of the building width/depth at the bottom
    const gabledHeight = Math.max(1.2, Math.min(2.8, depth * 0.38));

    // 2D Triangle shape along Z-Y plane: Base = [-depth/2, +depth/2], Apex = (0, gabledHeight)
    const triShape = new THREE.Shape();
    triShape.moveTo(-depth / 2, 0);
    triShape.lineTo(depth / 2, 0);
    triShape.lineTo(0, gabledHeight); // Pointed top apex
    triShape.closePath();

    const gabledGeo = new THREE.ExtrudeGeometry(triShape, {
      steps: 1,
      depth: width,
      bevelEnabled: false,
    });

    // Extrude geometry extrudes along +Z from 0 to width.
    // Rotate Y by Math.PI / 2 so it extrudes along X, and translate to center on X.
    gabledGeo.rotateY(Math.PI / 2);
    gabledGeo.translate(-width / 2, baseRoofY + 0.22, 0);

    const gabledMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate industrial metallic steel for gabled hangars
      roughness: 0.35,
      metalness: 0.6,
    });

    const gabledMesh = new THREE.Mesh(gabledGeo, gabledMat);
    gabledMesh.castShadow = true;
    roofGroup.add(gabledMesh);

    // Triangular Gable End Cap Walls (واجهات الجملون الهيكلية على طرفي البناء)
    const wallThick = 0.08;
    const endWallMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.5 });

    [-width / 2 + wallThick / 2, width / 2 - wallThick / 2].forEach((xPos) => {
      const endWallGeo = new THREE.ExtrudeGeometry(triShape, { steps: 1, depth: wallThick, bevelEnabled: false });
      endWallGeo.rotateY(Math.PI / 2);
      endWallGeo.translate(xPos, baseRoofY + 0.22, 0);
      const endWallMesh = new THREE.Mesh(endWallGeo, endWallMat);
      roofGroup.add(endWallMesh);
    });

  } else if (roofType === 'pitched_tile' || roofType === 'pitched') {
    // --- 4. PITCHED TERRACOTTA TILE ROOF (سطح من القرميد مائل الشكل) ---
    const minDim = Math.min(width, depth);
    const maxSlopeOffset = Math.max(0.4, Math.min(1.8, minDim * 0.25));
    const pitchRoofHeight = Math.max(0.7, Math.min(2.0, maxSlopeOffset * 1.15));

    const pitchSettings = {
      steps: 1,
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: pitchRoofHeight,
      bevelSize: -maxSlopeOffset,
      bevelSegments: 2,
    };

    const pitchGeom = new THREE.ExtrudeGeometry(shape2D, pitchSettings);
    pitchGeom.rotateX(-Math.PI / 2);

    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Terracotta Tile Red
      roughness: 0.45,
      metalness: 0.1,
    });

    const pitchMesh = new THREE.Mesh(pitchGeom, pitchMat);
    pitchMesh.position.set(0, baseRoofY + 0.22, 0);
    pitchMesh.castShadow = true;
    roofGroup.add(pitchMesh);

    // Dark Wood Eave Trim
    const trimSettings = { steps: 1, depth: 0.14, bevelEnabled: false };
    const trimGeom = new THREE.ExtrudeGeometry(shape2D, trimSettings);
    trimGeom.rotateX(-Math.PI / 2);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.set(0, baseRoofY + 0.22, 0);
    roofGroup.add(trim);

  } else if (roofType === 'flat_parapet') {
    // --- 2. FLAT ROOF WITH PARAPET FENCE (سطح مسطح مع سياج السطح) ---
    const parapetShape = createBuildingShape(buildingShape, width, depth);
    const innerHoleShape = createBuildingShape(buildingShape, Math.max(1, width - 0.35), Math.max(1, depth - 0.35));
    const holePath = new THREE.Path(innerHoleShape.getPoints());
    parapetShape.holes = [holePath];

    const parapetGeo = new THREE.ExtrudeGeometry(parapetShape, { steps: 1, depth: 0.42, bevelEnabled: false });
    parapetGeo.rotateX(-Math.PI / 2);
    const parapetMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.5 });
    const parapetMesh = new THREE.Mesh(parapetGeo, parapetMat);
    parapetMesh.position.set(0, baseRoofY + 0.22, 0);
    roofGroup.add(parapetMesh);

  } else if (roofType === 'garden') {
    // --- ROOF GARDEN (حديقة سقف خضراء) ---
    const gardenSettings = { steps: 1, depth: 0.08, bevelEnabled: false };
    const gardenGeom = new THREE.ExtrudeGeometry(shape2D, gardenSettings);
    gardenGeom.rotateX(-Math.PI / 2);
    const gardenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.9 });
    const garden = new THREE.Mesh(gardenGeom, gardenMat);
    garden.position.set(0, baseRoofY + 0.23, 0);
    garden.receiveShadow = true;
    roofGroup.add(garden);

    const parapetShape = createBuildingShape(buildingShape, width, depth);
    const innerHoleShape = createBuildingShape(buildingShape, Math.max(1, width - 0.35), Math.max(1, depth - 0.35));
    const holePath = new THREE.Path(innerHoleShape.getPoints());
    parapetShape.holes = [holePath];

    const parapetGeo = new THREE.ExtrudeGeometry(parapetShape, { steps: 1, depth: 0.40, bevelEnabled: false });
    parapetGeo.rotateX(-Math.PI / 2);
    const parapetMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.5 });
    const parapetMesh = new THREE.Mesh(parapetGeo, parapetMat);
    parapetMesh.position.set(0, baseRoofY + 0.22, 0);
    roofGroup.add(parapetMesh);

    const pWidth = Math.min(width * 0.35, 3.5);
    const pDepth = Math.min(depth * 0.35, 2.5);
    const pergolaGeo = new THREE.BoxGeometry(pWidth, 0.08, pDepth);
    const pergolaMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const pergola = new THREE.Mesh(pergolaGeo, pergolaMat);
    pergola.position.set(0, baseRoofY + 1.9, 0);
    roofGroup.add(pergola);

    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    [
      [-pWidth / 2 + 0.1, -pDepth / 2 + 0.1],
      [pWidth / 2 - 0.1, -pDepth / 2 + 0.1],
      [-pWidth / 2 + 0.1, pDepth / 2 - 0.1],
      [pWidth / 2 - 0.1, pDepth / 2 - 0.1],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, baseRoofY + 0.31 + 0.8, pz);
      roofGroup.add(post);
    });

  } else {
    // --- 1. FLAT ROOF (سطح مسطح مستوي بدون سياج) ---
    // Smooth, clean concrete/steel roof deck. No parapet wall. Base slab covers 100% of footprint.
  }

  // Beacon Light (Aviation Safety Light)
  const beaconY = (roofType === 'pitched_tile' || roofType === 'pitched' || roofType === 'gabled') ? baseRoofY + 1.4 : baseRoofY + 0.55;
  const beaconGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.4, 16);
  const beaconMat = new THREE.MeshStandardMaterial({ color: gradeHex, emissive: gradeHex, emissiveIntensity: 1.0 });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(width * 0.35, beaconY, depth * 0.35);
  roofGroup.add(beacon);

  if (floorGroups.length > 0) {
    floorGroups[floorGroups.length - 1].add(roofGroup);
  } else {
    buildingGroup.add(roofGroup);
  }
}

// --- HELPER FUNCTION: DYNAMIC DATABASE EQUIPMENT RENDERING & LOCATION POSITIONING ---
function renderEquipmentMeshes(
  parentGroup: THREE.Group,
  items: EquipmentItem[],
  width: number,
  depth: number,
  totalHeight: number,
  roomMeshesStore?: THREE.Mesh[]
) {
  if (!items || items.length === 0) {
    return; // Strict rule: No fake default equipment rendered if no equipment is registered
  }

  // Group equipment by location (Roof, Outer Perimeter, Inside Unit)
  const roofItems: EquipmentItem[] = [];
  const perimeterItems: EquipmentItem[] = [];
  const insideItems: EquipmentItem[] = [];

  items.forEach((eq) => {
    const loc = (eq.location || '').toLowerCase();
    if (loc.includes('roof') || loc.includes('سقف') || loc.includes('سطح')) {
      roofItems.push(eq);
    } else if (
      loc.includes('perimeter') ||
      loc.includes('محيط') ||
      loc.includes('خارجي') ||
      loc.includes('ميدان')
    ) {
      perimeterItems.push(eq);
    } else {
      // Default to inside or explicit inside
      insideItems.push(eq);
    }
  });

  // 1. Render Roof Equipment
  roofItems.forEach((eq, idx) => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(roofItems.length)));
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    const spanX = Math.max(1, width - 2.5);
    const spanZ = Math.max(1, depth - 2.5);
    const stepX = spanX / (cols || 1);
    const stepZ = spanZ / (Math.ceil(roofItems.length / cols) || 1);

    const x = -spanX / 2 + stepX / 2 + col * stepX;
    const z = -spanZ / 2 + stepZ / 2 + row * stepZ;
    const y = totalHeight + 0.45;

    const group = createEquipmentMesh3D(eq);
    group.position.set(x, y, z);
    parentGroup.add(group);

    // Make interactive mesh target for raycaster
    const boundBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    boundBox.position.set(x, y, z);
    boundBox.userData = {
      isRoom: true,
      id: eq.id || `eq-roof-${idx}`,
      name: eq.name || 'معدة سقف الوحدة',
      floorName: 'موقع التثبيت: سقف الوحدة (Roof Top)',
      dimensions: `السعة/النوع: ${eq.capacity || eq.type || 'سقف'}`,
      area: `الحالة: ${eq.status || 'Active'}`,
      type: 'معدة',
      contents: [
        `اسم المعدة: ${eq.name}`,
        `الموقع الهيكلي: سقف الوحدة`,
        `السعة والقدرة: ${eq.capacity || 'قياسي'}`,
        `الحالة التشغيلية: ${eq.status || 'عملية مستقرة'}`,
      ],
    };
    parentGroup.add(boundBox);
    if (roomMeshesStore) roomMeshesStore.push(boundBox);
  });

  // 2. Render Outer Perimeter Equipment
  perimeterItems.forEach((eq, idx) => {
    const sideOffset = (idx - perimeterItems.length / 2) * 2.2 + 1.1;
    const x = width / 2 + 2.2;
    const z = sideOffset;
    const y = 0.5;

    const group = createEquipmentMesh3D(eq);
    group.position.set(x, y, z);
    parentGroup.add(group);

    const boundBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.4, 1.4),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    boundBox.position.set(x, y, z);
    boundBox.userData = {
      isRoom: true,
      id: eq.id || `eq-perim-${idx}`,
      name: eq.name || 'معدة المحيط الخارجي',
      floorName: 'موقع التثبيت: المحيط الخارجي للوحدة (Outer Perimeter)',
      dimensions: `السعة/النوع: ${eq.capacity || eq.type || 'محيط ميداني'}`,
      area: `الحالة: ${eq.status || 'Active'}`,
      type: 'معدة',
      contents: [
        `اسم المعدة: ${eq.name}`,
        `الموقع الهيكلي: المحيط الخارجي للوحدة`,
        `السعة والقدرة: ${eq.capacity || 'قياسي'}`,
        `الحالة التشغيلية: ${eq.status || 'عملية مستقرة'}`,
      ],
    };
    parentGroup.add(boundBox);
    if (roomMeshesStore) roomMeshesStore.push(boundBox);
  });

  // 3. Render Inside Unit Equipment
  insideItems.forEach((eq, idx) => {
    const x = (idx % 2 === 0 ? -1 : 1) * (width / 4);
    const z = (Math.floor(idx / 2) - 0.5) * (depth / 3);
    const y = 0.45;

    const group = createEquipmentMesh3D(eq);
    group.position.set(x, y, z);
    parentGroup.add(group);

    const boundBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    boundBox.position.set(x, y, z);
    boundBox.userData = {
      isRoom: true,
      id: eq.id || `eq-in-${idx}`,
      name: eq.name || 'منظومة داخلية',
      floorName: 'موقع التثبيت: داخل الوحدة (Inside Unit)',
      dimensions: `السعة/النوع: ${eq.capacity || eq.type || 'داخلي'}`,
      area: `الحالة: ${eq.status || 'Active'}`,
      type: 'معدة',
      contents: [
        `اسم المعدة: ${eq.name}`,
        `الموقع الهيكلي: داخل الوحدة`,
        `السعة والقدرة: ${eq.capacity || 'قياسي'}`,
        `الحالة التشغيلية: ${eq.status || 'عملية مستقرة'}`,
      ],
    };
    parentGroup.add(boundBox);
    if (roomMeshesStore) roomMeshesStore.push(boundBox);
  });
}

// --- HELPER FUNCTION: CREATE 3D MODEL FOR EQUIPMENT ITEM ---
function createEquipmentMesh3D(eq: EquipmentItem): THREE.Group {
  const group = new THREE.Group();
  const nameStr = `${eq.name || ''} ${eq.type || ''}`.toLowerCase();

  if (nameStr.includes('gen') || nameStr.includes('مولد') || nameStr.includes('طاقة')) {
    // Diesel Generator Canopy Skid
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 1.1), baseMat);
    base.position.y = 0.125;
    group.add(base);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.95), bodyMat);
    body.position.y = 0.675;
    body.castShadow = true;
    group.add(body);

    // Radiator Grill & Exhaust Pipe
    const grillMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.8), grillMat);
    grill.position.set(0.825, 0.675, 0);
    group.add(grill);

    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12), pipeMat);
    pipe.position.set(-0.4, 1.35, 0.2);
    group.add(pipe);
  } else if (nameStr.includes('tank') || nameStr.includes('خزان') || nameStr.includes('مياه') || nameStr.includes('tnk')) {
    // Water / Fuel Tank Cylinder
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    [-0.4, 0.4].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), legMat);
      leg.position.set(lx, 0.2, 0);
      group.add(leg);
    });

    const tankMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.6, roughness: 0.2 });
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.2, 24), tankMat);
    tank.position.y = 0.9;
    tank.castShadow = true;
    group.add(tank);
  } else if (nameStr.includes('ac') || nameStr.includes('تكييف') || nameStr.includes('hvac')) {
    // HVAC Condenser Unit
    const acMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    const acBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 1.1), acMat);
    acBox.position.y = 0.425;
    acBox.castShadow = true;
    group.add(acBox);

    const fanMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 16), fanMat);
    fan.position.set(0, 0.875, 0);
    group.add(fan);
  } else if (nameStr.includes('شمس') || nameStr.includes('solar')) {
    // Solar PV Array Panel
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12), frameMat);
    pole.position.y = 0.4;
    group.add(pole);

    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.8, roughness: 0.1 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.1), panelMat);
    panel.position.set(0, 0.8, 0);
    panel.rotation.x = Math.PI / 6; // 30 deg tilt
    group.add(panel);
  } else if (nameStr.includes('سيرفر') || nameStr.includes('it') || nameStr.includes('شبكة')) {
    // IT Server Cabinet Rack
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.5, 0.7), rackMat);
    rack.position.y = 0.75;
    group.add(rack);

    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), ledMat);
    led.position.set(0, 1.2, 0.36);
    group.add(led);
  } else {
    // Generic Heavy Equipment Skid
    const eqMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const eqBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.9), eqMat);
    eqBox.position.y = 0.375;
    eqBox.castShadow = true;
    group.add(eqBox);
  }

  return group;
}

// --- HELPER FUNCTION: APPLY EXPLODE OFFSET ---
function applyExplodeOffset(floorGroups: THREE.Group[], explodePercent: number) {
  const spacing = (explodePercent / 100) * 5.0;
  floorGroups.forEach((fg, idx) => {
    fg.position.y = fg.userData.baseElevation + idx * spacing;
  });
}

// --- HELPER FUNCTION: HIGHLIGHT SELECTED ROOM ---
function highlightRoomMesh(
  roomMesh: THREE.Mesh,
  scene: THREE.Scene,
  roomHighlightRef: React.MutableRefObject<THREE.LineSegments | null>
) {
  if (roomHighlightRef.current) {
    if (roomHighlightRef.current.parent) {
      roomHighlightRef.current.parent.remove(roomHighlightRef.current);
    }
    roomHighlightRef.current = null;
  }

  const geo = roomMesh.geometry;
  const edges = new THREE.EdgesGeometry(geo);
  const mat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 });
  const highlightMesh = new THREE.LineSegments(edges, mat);

  highlightMesh.position.copy(roomMesh.position);
  highlightMesh.rotation.copy(roomMesh.rotation);
  highlightMesh.scale.set(1.02, 1.3, 1.02);

  if (roomMesh.parent) {
    roomMesh.parent.add(highlightMesh);
  } else {
    scene.add(highlightMesh);
  }

  roomHighlightRef.current = highlightMesh;
}

// --- HELPER FUNCTION: CREATE 2D BUILDING SHAPE FOR THREE.JS EXTRUSION ---
function createBuildingShape(shapeType: string, width: number, depth: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hd = depth / 2;

  switch (shapeType) {
    case 'مربع':
    case 'مستطيل':
    default:
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();
      break;

    case 'دائري':
      shape.absarc(0, 0, Math.min(hw, hd), 0, Math.PI * 2, false);
      break;

    case 'مثلث':
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(0, hd);
      shape.closePath();
      break;

    case 'L-Shape':
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, 0);
      shape.lineTo(0, 0);
      shape.lineTo(0, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();
      break;

    case 'U-Shape':
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, hd);
      shape.lineTo(hw * 0.4, hd);
      shape.lineTo(hw * 0.4, -hd * 0.2);
      shape.lineTo(-hw * 0.4, -hd * 0.2);
      shape.lineTo(-hw * 0.4, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();
      break;

    case 'T-Shape':
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, -hd * 0.2);
      shape.lineTo(hw * 0.35, -hd * 0.2);
      shape.lineTo(hw * 0.35, hd);
      shape.lineTo(-hw * 0.35, hd);
      shape.lineTo(-hw * 0.35, -hd * 0.2);
      shape.lineTo(-hw, -hd * 0.2);
      shape.closePath();
      break;

    case 'H-Shape':
      shape.moveTo(-hw, -hd);
      shape.lineTo(-hw * 0.35, -hd);
      shape.lineTo(-hw * 0.35, -hd * 0.2);
      shape.lineTo(hw * 0.35, -hd * 0.2);
      shape.lineTo(hw * 0.35, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, hd);
      shape.lineTo(hw * 0.35, hd);
      shape.lineTo(hw * 0.35, hd * 0.2);
      shape.lineTo(-hw * 0.35, hd * 0.2);
      shape.lineTo(-hw * 0.35, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();
      break;

    case 'C-Shape':
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, -hd * 0.3);
      shape.lineTo(-hw * 0.3, -hd * 0.3);
      shape.lineTo(-hw * 0.3, hd * 0.3);
      shape.lineTo(hw, hd * 0.3);
      shape.lineTo(hw, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();
      break;

    case 'Courtyard':
      shape.moveTo(-hw, -hd);
      shape.lineTo(hw, -hd);
      shape.lineTo(hw, hd);
      shape.lineTo(-hw, hd);
      shape.closePath();

      const hole = new THREE.Path();
      hole.moveTo(-hw * 0.4, -hd * 0.4);
      hole.lineTo(-hw * 0.4, hd * 0.4);
      hole.lineTo(hw * 0.4, hd * 0.4);
      hole.lineTo(hw * 0.4, -hd * 0.4);
      hole.closePath();
      shape.holes.push(hole);
      break;

    case 'Octagonal':
      const r = Math.min(hw, hd);
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 8;
        const px = r * Math.cos(angle);
        const py = r * Math.sin(angle);
        if (i === 0) shape.moveTo(px, py);
        else shape.lineTo(px, py);
      }
      shape.closePath();
      break;
  }

  return shape;
}
