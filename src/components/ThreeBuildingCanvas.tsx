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
  RotateCcw,
  Camera,
  Video,
  Plus,
  Compass,
  Plane,
  Waves,
  Maximize2,
  Minimize2,
  Info,
} from 'lucide-react';
import { EquipmentItem, Room, UnitDesignFinishing, CustomSiteElement, CustomSiteElementType } from '../types';
import { Lightbulb, LightbulbOff } from 'lucide-react';
import { isRoomVacant } from '../utils/unitAndRoomCodeUtils';
import { toArabicDigits } from '../utils/arabicUtils';
import { safeSetItem } from '../utils/storageUtils';
import { DroneHudOverlay, DroneFlightMode } from './DroneHudOverlay';
import { SiteElementsManagerModal } from './SiteElementsManagerModal';
import { ElementTransformToolbar } from './ElementTransformToolbar';
import { InteractiveEngineeringEditor } from './InteractiveEngineeringEditor';
import { updateUnit } from '../services/apiClient';
import { buildCustomSiteElementMesh, SITE_ELEMENT_DEFINITIONS } from '../utils/customSiteElements3D';
import {
  getBuildingFootprintPolygon,
  createThreeShapeFromPolygon,
  isPointInBuildingFootprint,
  getBuildingWings,
  computeRoomSlotsForFloor,
  getBuildingExteriorWallSegments,
  getMainEntranceDoorPosition,
  getInsideEquipmentPosition,
} from '../utils/buildingGeometryUtils';

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

const ThreeBuildingCanvasComponent: React.FC<ThreeBuildingCanvasProps> = ({
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
  const [showExplodePopover, setShowExplodePopover] = useState<boolean>(false);
  const [archStyle, setArchStyle] = useState<'modern' | 'classic' | 'industrial' | 'minimalist'>('modern');
  const [roofType, setRoofType] = useState<'flat' | 'flat_parapet' | 'gabled' | 'pitched_tile' | 'garden' | 'pitched'>('flat_parapet');
  const [showFurniture, setShowFurniture] = useState<boolean>(true);
  const [showWindows, setShowWindows] = useState<boolean>(true);
  const [showTrees, setShowTrees] = useState<boolean>(false);
  const [interiorLightIntensity, setInteriorLightIntensity] = useState<number>(3.5);
  const [exteriorLightIntensity, setExteriorLightIntensity] = useState<number>(3.5);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [activePerspective, setActivePerspective] = useState<'isometric' | 'top' | 'front'>('isometric');

  // Custom Site Elements State (Helipad, Fountain, Street, Parking, Garden, Doors, Windows, Light Poles, Columns, Fire Escape)
  const [customElements, setCustomElements] = useState<CustomSiteElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showSiteElementsModal, setShowSiteElementsModal] = useState<boolean>(false);
  const customElementsGroupRef = useRef<THREE.Group | null>(null);
  const elementHighlightRef = useRef<THREE.BoxHelper | null>(null);
  const customElementsRef = useRef<CustomSiteElement[]>([]);
  customElementsRef.current = customElements;
  const selectedElementIdRef = useRef<string | null>(null);
  selectedElementIdRef.current = selectedElementId;
  const isDraggingRef = useRef<boolean>(false);
  const draggedIdRef = useRef<string | null>(null);

  // Cinematic Drone Camera State
  const [isDroneMode, setIsDroneMode] = useState<boolean>(false);
  const [droneFlightMode, setDroneFlightMode] = useState<DroneFlightMode>('orbit_360');
  const [droneSpeed, setDroneSpeed] = useState<number>(1.0);
  const [droneAltitude, setDroneAltitude] = useState<number>(14.0);
  const [droneSpeedKmH, setDroneSpeedKmH] = useState<number>(18.0);
  const [droneGimbalPitch, setDroneGimbalPitch] = useState<number>(-18);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [showDroneGrid, setShowDroneGrid] = useState<boolean>(false);
  const [showCinematicBars, setShowCinematicBars] = useState<boolean>(true);
  const droneTimeRef = useRef<number>(0);
  const isDroneModeRef = useRef<boolean>(false);
  isDroneModeRef.current = isDroneMode;
  const droneFlightModeRef = useRef<DroneFlightMode>(droneFlightMode);
  droneFlightModeRef.current = droneFlightMode;
  const droneSpeedRef = useRef<number>(droneSpeed);
  droneSpeedRef.current = droneSpeed;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Fullscreen and Interactive Engineering Editor States
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showEngineeringEditor, setShowEngineeringEditor] = useState<boolean>(false);
  const [showAxesHelper, setShowAxesHelper] = useState<boolean>(false);
  const [isSavingDb, setIsSavingDb] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  useEffect(() => {
    if (sceneRef.current) {
      const helper = sceneRef.current.getObjectByName('geometricAxesHelper');
      if (helper) {
        helper.visible = showAxesHelper;
      }
    }
  }, [showAxesHelper]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        if (rendererRef.current && cameraRef.current && mountRef.current) {
          const w = mountRef.current.clientWidth || window.innerWidth;
          const h = mountRef.current.clientHeight || window.innerHeight;
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
        window.dispatchEvent(new Event('resize'));
      }, 100);
      return next;
    });
  };

  // Keyboard shortcut (Escape) to exit 3D model fullscreen independently without touching browser/system fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
        setTimeout(() => {
          if (rendererRef.current && cameraRef.current && mountRef.current) {
            const w = mountRef.current.clientWidth || window.innerWidth;
            const h = mountRef.current.clientHeight || window.innerHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
          }
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isFullscreen]);

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
      setShowTrees(typeof initial.showTrees === 'boolean' ? initial.showTrees : false);
      setInteriorLightIntensity(typeof initial.interiorLightIntensity === 'number' ? initial.interiorLightIntensity : 3.5);
      setExteriorLightIntensity(typeof initial.exteriorLightIntensity === 'number' ? initial.exteriorLightIntensity : 3.5);
      if (initial.customElements && Array.isArray(initial.customElements)) {
        const cleaned = initial.customElements.filter(
          (elem: CustomSiteElement) =>
            !elem.id.startsWith('starter_light_') &&
            !elem.id.startsWith('starter_garden_')
        );
        setCustomElements(cleaned);
      }
    } else {
      // Revert to unit default features if no custom finishing exists for this specific unit
      setArchStyle('modern');
      setRoofType('flat');
      setShowFurniture(true);
      setShowWindows(true);
      setShowTrees(false);
      setInteriorLightIntensity(3.5);
      setExteriorLightIntensity(3.5);
    }
  }, [unitCode, designFinishing]);

  const autoSaveTimerRef = useRef<any>(null);

  const autoSaveToDatabase = async (
    elementsList?: CustomSiteElement[],
    finishingUpdates?: Partial<UnitDesignFinishing>
  ) => {
    const finalElements = elementsList !== undefined ? elementsList : customElementsRef.current;
    const finalFinishing: UnitDesignFinishing = {
      archStyle,
      roofType,
      showFurniture,
      showWindows,
      showTrees,
      interiorLightIntensity,
      exteriorLightIntensity,
      customElements: finalElements,
      ...finishingUpdates,
    };

    safeSetItem(`unit_elements_${unitCode}`, finalElements);
    safeSetItem(`unit_finishing_${unitCode}`, finalFinishing);

    if (onUpdateDesignFinishing) {
      onUpdateDesignFinishing(finalFinishing);
    }

    setIsSavingDb(true);
    try {
      const unitsStr = localStorage.getItem('app_units');
      if (unitsStr) {
        const units = JSON.parse(unitsStr);
        const idx = units.findIndex((u: any) => u.code === unitCode);
        if (idx !== -1) {
          const updatedUnit = {
            ...units[idx],
            designFinishing: finalFinishing,
          };
          units[idx] = updatedUnit;
          localStorage.setItem('app_units', JSON.stringify(units));
          await updateUnit(updatedUnit);
        }
      }
      setLastSavedTime(new Date().toLocaleTimeString('ar-IQ'));
    } catch (err) {
      console.warn('Auto-save note:', err);
    } finally {
      setIsSavingDb(false);
    }
  };

  const autoSaveImmediate = (
    elementsList?: CustomSiteElement[],
    finishingUpdates?: Partial<UnitDesignFinishing>
  ) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveToDatabase(elementsList, finishingUpdates);
  };

  const autoSaveDebounced = (
    elementsList?: CustomSiteElement[],
    finishingUpdates?: Partial<UnitDesignFinishing>
  ) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveToDatabase(elementsList, finishingUpdates);
    }, 350);
  };

  const autoSaveImmediateRef = useRef(autoSaveImmediate);
  autoSaveImmediateRef.current = autoSaveImmediate;

  const saveFinishingSettings = (updated: Partial<UnitDesignFinishing>) => {
    autoSaveDebounced(customElementsRef.current, updated);
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

  // Initialize site elements without automatically injecting starter light poles or trees
  useEffect(() => {
    const savedCustom = localStorage.getItem(`unit_elements_${unitCode}`);
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          // Remove any automatic starter light poles or trees/gardens that were saved previously
          const cleaned = parsed.filter(
            (elem: CustomSiteElement) =>
              !elem.id.startsWith('starter_light_') &&
              !elem.id.startsWith('starter_garden_')
          );
          setCustomElements(cleaned);
          if (cleaned.length !== parsed.length) {
            safeSetItem(`unit_elements_${unitCode}`, cleaned);
          }
          return;
        }
      } catch (e) {}
    }

    if (designFinishing?.customElements && Array.isArray(designFinishing.customElements)) {
      const cleaned = designFinishing.customElements.filter(
        (elem: CustomSiteElement) =>
          !elem.id.startsWith('starter_light_') &&
          !elem.id.startsWith('starter_garden_')
      );
      setCustomElements(cleaned);
      return;
    }

    // Do not automatically inject elements to units
    setCustomElements([]);
  }, [unitCode, designFinishing]);

  const handleAddSiteElement = (type: CustomSiteElementType, options?: { mountTarget?: 'ground' | 'roof' | 'wall'; position?: { x: number; y: number; z: number } }) => {
    const def = SITE_ELEMENT_DEFINITIONS.find((d) => d.type === type);
    const mount = options?.mountTarget || def?.defaultMount || 'ground';
    const roofTopY = floorsCount * storyHeight;

    let posX = 0;
    let posY = 0;
    let posZ = 0;

    if (type === 'helipad') {
      if (mount === 'roof') {
        posX = 0;
        posY = roofTopY;
        posZ = 0;
      } else {
        posX = width / 2 + 7;
        posY = 0;
        posZ = 0;
      }
    } else if (type === 'solar_panel') {
      if (mount === 'roof') {
        posX = 0;
        posY = roofTopY;
        posZ = 0;
      } else {
        posX = width / 2 + 6;
        posY = 0;
        posZ = 0;
      }
    } else if (type === 'fountain') {
      posX = 0;
      posY = 0;
      posZ = depth / 2 + 5.5;
    } else if (type === 'street') {
      posX = 0;
      posY = 0;
      posZ = depth / 2 + 11;
    } else if (type === 'parking_open') {
      posX = width / 2 + 7.5;
      posY = 0;
      posZ = 0;
    } else if (type === 'parking_covered') {
      posX = -width / 2 - 7.5;
      posY = 0;
      posZ = 0;
    } else if (type === 'garden') {
      posX = width / 2 + 6.5;
      posY = 0;
      posZ = depth / 2 + 3;
    } else if (type === 'door_glass' || type === 'door_wood' || type === 'door_metal') {
      posX = 0;
      posY = 0;
      posZ = depth / 2;
    } else if (type === 'window') {
      posX = width * 0.25;
      posY = storyHeight * 0.5;
      posZ = depth / 2;
    } else if (type === 'light_pole') {
      posX = width / 2 + 3;
      posY = 0;
      posZ = depth / 2 + 5;
    } else if (type === 'concrete_column') {
      posX = -2.5;
      posY = 0;
      posZ = depth / 2 + 0.4;
    } else if (type === 'fire_escape') {
      posX = width / 2 + 0.2;
      posY = 0;
      posZ = 0;
    } else if (type === 'sidewalk_concrete' || type === 'sidewalk_interlock' || type === 'sidewalk_kerbstone') {
      posX = 0;
      posY = 0;
      posZ = depth / 2 + 3.0;
    } else if (type === 'walkway_covered') {
      posX = 0;
      posY = 0;
      posZ = depth / 2 + 4.5;
    } else if (type === 'ramp_accessible') {
      posX = 2.5;
      posY = 0;
      posZ = depth / 2 + 1.2;
    } else if (type === 'flagpole_single') {
      posX = -3.5;
      posY = 0;
      posZ = depth / 2 + 4.5;
    } else if (type === 'flagpole_triple') {
      posX = 0;
      posY = 0;
      posZ = depth / 2 + 5.5;
    } else if (type === 'flagpole_wall') {
      posX = -1.5;
      posY = storyHeight * 0.8;
      posZ = depth / 2;
    } else if (type === 'sign_monument') {
      posX = 4.5;
      posY = 0;
      posZ = depth / 2 + 5.5;
    } else if (type === 'sign_wayfinding') {
      posX = width / 2 + 2;
      posY = 0;
      posZ = depth / 2 + 3;
    } else if (type === 'sign_safety_hse') {
      posX = -width / 2 - 2;
      posY = 0;
      posZ = depth / 2 + 3;
    } else if (type === 'sign_digital_led') {
      posX = width / 2 + 3.5;
      posY = 0;
      posZ = depth / 2 + 7.5;
    } else if (type === 'sign_assembly_point') {
      posX = -width / 2 - 5.5;
      posY = 0;
      posZ = depth / 2 + 6.5;
    } else if (type === 'generator_diesel') {
      posX = -width / 2 - 5.5;
      posY = 0;
      posZ = -depth / 2 - 2;
    } else if (type === 'fuel_tank') {
      posX = -width / 2 - 8.5;
      posY = 0;
      posZ = -depth / 2 - 4;
    } else if (type === 'transformer_substation') {
      posX = width / 2 + 5.5;
      posY = 0;
      posZ = -depth / 2 - 2;
    } else if (type === 'hvac_chiller') {
      posX = -2.5;
      posY = roofTopY;
      posZ = -2.0;
    } else if (type === 'water_tank_roof') {
      posX = 2.5;
      posY = roofTopY;
      posZ = -2.0;
    } else if (type === 'water_reservoir_ground') {
      posX = -width / 2 - 5.5;
      posY = 0;
      posZ = 3.0;
    } else if (type === 'telecom_tower') {
      posX = width / 2 + 8.5;
      posY = 0;
      posZ = -depth / 2 - 5.0;
    } else if (type === 'satellite_dish') {
      posX = 0;
      posY = mount === 'roof' ? roofTopY : 0;
      posZ = mount === 'roof' ? 2.5 : depth / 2 + 7.5;
    } else if (type === 'cctv_pole') {
      posX = width / 2 + 3.0;
      posY = 0;
      posZ = depth / 2 + 4.0;
    } else if (type === 'security_barrier_jersey') {
      posX = 0;
      posY = 0;
      posZ = depth / 2 + 8.5;
    } else if (type === 'security_boom_gate') {
      posX = 3.0;
      posY = 0;
      posZ = depth / 2 + 8.5;
    } else if (type === 'fire_pump_station') {
      posX = width / 2 + 6.0;
      posY = 0;
      posZ = 2.5;
    } else if (type === 'floodlight_tower') {
      posX = -width / 2 - 7.0;
      posY = 0;
      posZ = depth / 2 + 8.5;
    }

    // Override with custom dropped coordinates if specified
    if (options?.position) {
      posX = options.position.x;
      posY = options.position.y;
      posZ = options.position.z;
    }

    const newElement: CustomSiteElement = {
      id: 'el_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type,
      name: def?.nameAr || type,
      position: { x: posX, y: posY, z: posZ },
      rotationY: type === 'fire_escape' ? 90 : type === 'street' ? 90 : 0,
      scale: { x: 1, y: 1, z: 1 },
      mountTarget: mount,
    };

    const updated = [...customElements, newElement];
    setCustomElements(updated);
    customElementsRef.current = updated;
    setSelectedElementId(newElement.id);
    selectedElementIdRef.current = newElement.id;
    safeSetItem(`unit_elements_${unitCode}`, updated);
    autoSaveImmediate(updated);
  };

  const handleUpdateElement = (updated: CustomSiteElement) => {
    const list = customElements.map((e) => (e.id === updated.id ? updated : e));
    setCustomElements(list);
    customElementsRef.current = list;
    safeSetItem(`unit_elements_${unitCode}`, list);
    autoSaveDebounced(list);
  };

  const handleDeleteElement = (id: string) => {
    const list = customElements.filter((e) => e.id !== id);
    setCustomElements(list);
    customElementsRef.current = list;
    if (selectedElementId === id) {
      setSelectedElementId(null);
      selectedElementIdRef.current = null;
    }
    safeSetItem(`unit_elements_${unitCode}`, list);
    autoSaveImmediate(list);
  };

  const handleDuplicateElement = (target: CustomSiteElement | string) => {
    const element = typeof target === 'string' ? customElements.find((e) => e.id === target) : target;
    if (!element) return;
    const dupe: CustomSiteElement = {
      ...element,
      id: 'el_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: element.name + ' (نسخة)',
      position: {
        ...element.position,
        x: element.position.x + 1.5,
        z: element.position.z + 1.5,
      },
    };
    const list = [...customElements, dupe];
    setCustomElements(list);
    customElementsRef.current = list;
    setSelectedElementId(dupe.id);
    selectedElementIdRef.current = dupe.id;
    safeSetItem(`unit_elements_${unitCode}`, list);
    autoSaveImmediate(list);
  };

  const handleSaveToDatabase = async () => {
    autoSaveImmediate(customElementsRef.current);
  };

  const handleDropOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const type = (e.dataTransfer.getData('application/site-element-type') || e.dataTransfer.getData('text/plain')) as CustomSiteElementType;
    if (!type) return;

    const def = SITE_ELEMENT_DEFINITIONS.find((d) => d.type === type);
    const defaultMount = def?.defaultMount || 'ground';
    const roofTopY = floorsCount * storyHeight;

    if (!rendererRef.current || !cameraRef.current) {
      handleAddSiteElement(type, { mountTarget: defaultMount });
      return;
    }

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

    let dropPos = { x: 0, y: defaultMount === 'roof' ? roofTopY : 0, z: 0 };

    if (defaultMount === 'roof') {
      const roofPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -roofTopY);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(roofPlane, hit)) {
        dropPos = {
          x: Math.round(hit.x * 10) / 10,
          y: roofTopY,
          z: Math.round(hit.z * 10) / 10,
        };
      }
    } else {
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        dropPos = {
          x: Math.round(hit.x * 10) / 10,
          y: 0,
          z: Math.round(hit.z * 10) / 10,
        };
      }
    }

    handleAddSiteElement(type, { mountTarget: defaultMount, position: dropPos });
  };

  const handleLiveMoveElement = (id: string, newX: number, newZ: number) => {
    setCustomElements((prev) =>
      prev.map((e) => (e.id === id ? { ...e, position: { ...e.position, x: newX, z: newZ } } : e))
    );
  };

  const handleCaptureDronePhoto = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataURL = rendererRef.current.domElement.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `drone_shot_${unitCode}_${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleToggleDroneRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      clearInterval(recordTimerRef.current);
      setIsRecording(false);
      setRecordSeconds(0);
    } else {
      if (!rendererRef.current) return;
      const canvas = rendererRef.current.domElement;
      try {
        const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
        if (!stream) return;
        const options: MediaRecorderOptions = {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm',
        };
        const recorder = new MediaRecorder(stream, options);
        recordedChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `drone_cinematic_${unitCode}_${Date.now()}.webm`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        setRecordSeconds(0);
        recordTimerRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        console.error('Video recording not supported in this environment:', err);
      }
    }
  };

  const handleDroneManualMove = (
    action: 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'yawLeft' | 'yawRight'
  ) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const step = 2.0;
    if (action === 'forward') {
      cam.position.addScaledVector(forward, step);
    } else if (action === 'backward') {
      cam.position.addScaledVector(forward, -step);
    } else if (action === 'left') {
      cam.position.addScaledVector(right, -step);
    } else if (action === 'right') {
      cam.position.addScaledVector(right, step);
    } else if (action === 'up') {
      cam.position.y += step;
    } else if (action === 'down') {
      cam.position.y = Math.max(1.5, cam.position.y - step);
    }
    setDroneAltitude(cam.position.y);
  };

  // Update 3D meshes of custom elements when list, selection, or lighting changes
  useEffect(() => {
    const group = customElementsGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    customElements.forEach((el) => {
      const meshGroup = buildCustomSiteElementMesh(el, isNightMode, isNightLightsOn);
      group.add(meshGroup);
    });

    if (sceneRef.current) {
      if (elementHighlightRef.current) {
        sceneRef.current.remove(elementHighlightRef.current);
        elementHighlightRef.current.dispose();
        elementHighlightRef.current = null;
      }

      if (selectedElementId) {
        const selectedMesh = group.children.find((c) => c.userData?.elementId === selectedElementId);
        if (selectedMesh) {
          const boxHelper = new THREE.BoxHelper(selectedMesh, 0xf59e0b);
          elementHighlightRef.current = boxHelper;
          sceneRef.current.add(boxHelper);
        }
      }
    }
  }, [customElements, selectedElementId, isNightMode, isNightLightsOn]);

  // Helper to calculate ideal camera framing with generous zoom-out so the building is completely visible at initial load
  const getOptimalCameraPlacement = (
    aspectRatio: number,
    bWidth: number,
    bDepth: number,
    totalHeight: number,
    mode: 'isometric' | 'top' | 'front' | 'floor_cut' | 'reset' = 'isometric'
  ) => {
    // 3D bounding radius from center
    const halfX = bWidth / 2;
    const halfZ = bDepth / 2;
    const halfY = totalHeight / 2;
    const boundingRadius = Math.sqrt(halfX * halfX + halfZ * halfZ + halfY * halfY);

    // 45 degrees vertical FOV
    const halfFovRad = (45 / 2) * (Math.PI / 180);
    const tanHalfFov = Math.tan(halfFovRad);

    // Calculate required distance to fit both vertically and horizontally
    // On mobile screens with portrait aspect < 0.8, horizontal framing requires larger distance
    const distV = (boundingRadius * 1.55) / tanHalfFov;
    const distH = (boundingRadius * 1.55) / (tanHalfFov * Math.max(aspectRatio, 0.45));

    // Generous zoom-out distance with safe minimum (48) so the model is fully framed with padding
    const optimalDist = Math.max(distV, distH, 48);
    const targetY = totalHeight * 0.45;

    if (mode === 'top') {
      return {
        pos: new THREE.Vector3(0, optimalDist * 1.3, 0.01),
        target: new THREE.Vector3(0, 0, 0),
      };
    }

    if (mode === 'front') {
      return {
        pos: new THREE.Vector3(0, targetY + optimalDist * 0.12, optimalDist * 1.15),
        target: new THREE.Vector3(0, targetY, 0),
      };
    }

    if (mode === 'floor_cut') {
      return {
        pos: new THREE.Vector3(optimalDist * 0.62, targetY + optimalDist * 0.65, optimalDist * 0.74),
        target: new THREE.Vector3(0, targetY, 0),
      };
    }

    // Isometric / Exterior / Reset: Angled camera with full comfortable zoom-out
    return {
      pos: new THREE.Vector3(optimalDist * 0.68, targetY + optimalDist * 0.58, optimalDist * 0.78),
      target: new THREE.Vector3(0, targetY, 0),
    };
  };

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

    // 2. Camera setup with generous initial zoom-out to ensure building is completely visible
    const aspect = w / h;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1500);
    cameraRef.current = camera;

    const totalY = floorsCount * storyHeight;
    const initialCam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'isometric');
    camera.position.copy(initialCam.pos);
    camera.lookAt(initialCam.target);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls with adjusted zoom range
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going below ground
    controls.minDistance = 4;
    controls.maxDistance = Math.max(250, initialCam.pos.length() * 3);
    controls.target.copy(initialCam.target);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;

    // 5. Dynamic Lighting System
    setupLights(scene, isNightMode, theme, exteriorLightIntensity);

    // 6. Ground Pad, Grid, and Peripheral Environment (with night floodlights and geometric axes if enabled)
    setupEnvironment(scene, width, depth, showTrees, isNightMode, isNightLightsOn, theme, exteriorLightIntensity, showAxesHelper);

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
      const doorGeo = new THREE.BoxGeometry(0.08, 2.1, 0.95);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(width / 2 + 0.02, 1.1, 0);
      caravanGroup.add(door);

      const winGeo = new THREE.BoxGeometry(1.1, 1.0, 0.08);
      const winMat = new THREE.MeshPhysicalMaterial({ color: styleColors.glass, transparent: true, opacity: showWindows ? 0.4 : 0.9, transmission: 0.7 });
      const win1 = new THREE.Mesh(winGeo, winMat);
      win1.position.set(-width / 4, 1.6, depth / 2 + 0.02);
      win1.userData = { isWindow: true, isGlassMaterial: true };
      win1.visible = showWindows;
      caravanGroup.add(win1);
      const win2 = new THREE.Mesh(winGeo, winMat);
      win2.position.set(width / 4, 1.6, depth / 2 + 0.02);
      win2.userData = { isWindow: true, isGlassMaterial: true };
      win2.visible = showWindows;
      caravanGroup.add(win2);

      // Rooms & Furniture inside caravan
      renderInteriorRooms(caravanGroup, rooms, 0, width, depth, storyHeight, showFurniture, isNightMode, isNightLightsOn, roomMeshesRef.current, interiorLightIntensity);
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

        // Architectural Windows along real wall segments (Never spanning open courtyards!)
        renderBuildingWindows(
          floorGroup,
          buildingShape,
          width,
          depth,
          storyHeight,
          glassMat,
          showWindows
        );

        // Entrance Door on Ground Floor placed on guaranteed solid wall
        if (f === 0) {
          const doorPos = getMainEntranceDoorPosition(buildingShape, width, depth);
          const doorGeo = new THREE.BoxGeometry(1.4, 2.2, 0.15);
          const doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 });
          const mainDoor = new THREE.Mesh(doorGeo, doorMat);
          mainDoor.position.set(doorPos.x, 1.1, doorPos.z);
          mainDoor.rotation.y = doorPos.rotationY;
          floorGroup.add(mainDoor);
        }

        // Render Interior Rooms & Furniture strictly inside building envelope
        renderInteriorRooms(
          floorGroup,
          rooms,
          f,
          width,
          depth,
          storyHeight,
          showFurniture,
          isNightMode,
          isNightLightsOn,
          roomMeshesRef.current,
          interiorLightIntensity,
          true,
          buildingShape
        );

        floorGroupsRef.current.push(floorGroup);
        buildingGroup.add(floorGroup);
      }

      // Roof Structure
      const roofTopY = totalStories * storyHeight;
      createRoofStructure(buildingGroup, floorGroupsRef.current, roofType, shape2D, buildingShape, styleColors.accent, width, depth, roofTopY, storyHeight, gradeHex);
    }

    // Equipment Models
    renderEquipmentMeshes(buildingGroup, equipment, width, depth, floorsCount * storyHeight, roomMeshesRef.current, buildingShape);

    // Apply Explode Separation
    applyExplodeOffset(floorGroupsRef.current, explodePercent);

    // 7.5 Render Custom Site Elements Group (Helipads, Fountains, Streets, Garages, Gardens, Doors, Windows, Columns, Fire Escapes)
    const customElementsGroup = new THREE.Group();
    customElementsGroup.name = 'CustomElementsGroup';
    customElementsGroupRef.current = customElementsGroup;
    scene.add(customElementsGroup);

    customElementsRef.current.forEach((el) => {
      const meshGroup = buildCustomSiteElementMesh(el, isNightMode, isNightLightsOn);
      customElementsGroup.add(meshGroup);
    });

    if (selectedElementIdRef.current) {
      const selMesh = customElementsGroup.children.find(
        (c) => c.userData?.elementId === selectedElementIdRef.current
      );
      if (selMesh) {
        const boxHelper = new THREE.BoxHelper(selMesh, 0xf59e0b);
        elementHighlightRef.current = boxHelper;
        scene.add(boxHelper);
      }
    }

    // 8. Raycaster Pointer Event Handlers for Element Dragging & Selection
    const handlePointerDown = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      // Check custom site elements first!
      if (customElementsGroupRef.current && customElementsGroupRef.current.children.length > 0) {
        const siteIntersects = raycaster.intersectObjects(customElementsGroupRef.current.children, true);
        if (siteIntersects.length > 0) {
          let hitRoot: THREE.Object3D | null = siteIntersects[0].object;
          while (hitRoot && !hitRoot.userData?.isCustomElement && hitRoot.parent) {
            hitRoot = hitRoot.parent;
          }
          if (hitRoot && hitRoot.userData?.isCustomElement) {
            const elId = hitRoot.userData.elementId;
            setSelectedElementId(elId);
            selectedElementIdRef.current = elId;

            // Start direct manipulation dragging
            isDraggingRef.current = true;
            draggedIdRef.current = elId;
            if (controlsRef.current) {
              controlsRef.current.enabled = false;
            }
            return;
          }
        }
      }

      // Check interior rooms
      const intersects = raycaster.intersectObjects(roomMeshesRef.current, true);
      if (intersects.length > 0) {
        const hitRoom = intersects[0].object as THREE.Mesh;
        if (hitRoom.userData && hitRoom.userData.isRoom) {
          highlightRoomMesh(hitRoom, scene, roomHighlightRef);
          setSelectedRoomData(hitRoom.userData as any);
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current || !draggedIdRef.current || !rendererRef.current || !cameraRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      const el = customElementsRef.current.find((e) => e.id === draggedIdRef.current);
      const elY = el?.position.y ?? 0;
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -elY);
      const hitPoint = new THREE.Vector3();

      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        const targetX = Math.round(hitPoint.x * 2) / 2;
        const targetZ = Math.round(hitPoint.z * 2) / 2;

        const mesh = customElementsGroupRef.current?.children.find(
          (c) => c.userData?.elementId === draggedIdRef.current
        );
        if (mesh) {
          mesh.position.x = targetX;
          mesh.position.z = targetZ;
          if (elementHighlightRef.current) {
            elementHighlightRef.current.update();
          }
        }

        handleLiveMoveElement(draggedIdRef.current, targetX, targetZ);
      }
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        draggedIdRef.current = null;
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
        if (autoSaveImmediateRef.current) {
          autoSaveImmediateRef.current(customElementsRef.current);
        }
      }
    };

    const canvasElem = renderer.domElement;
    canvasElem.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

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

      if (isDroneModeRef.current) {
        droneTimeRef.current += 0.014 * (droneSpeedRef.current || 1.0);
        const t = droneTimeRef.current;
        const totalBuildingH = floorsCount * storyHeight;
        const centerTarget = new THREE.Vector3(0, totalBuildingH * 0.45, 0);

        const mode = droneFlightModeRef.current;
        if (mode === 'orbit_360') {
          const orbitRadius = Math.max(width, depth) * 1.5 + 16;
          const camX = Math.sin(t * 0.35) * orbitRadius;
          const camZ = Math.cos(t * 0.35) * orbitRadius;
          const camY = Math.max(8, totalBuildingH + 9 + Math.sin(t * 0.25) * 3.5);
          camera.position.set(camX, camY, camZ);
          camera.lookAt(centerTarget);

          setDroneAltitude(camY);
          setDroneSpeedKmH(16.0 + Math.sin(t) * 3.0);
          setDroneGimbalPitch(-18 - Math.sin(t * 0.3) * 6);
        } else if (mode === 'spiral_ascend') {
          const loopT = (t * 0.6) % 24;
          const spiralRadius = Math.max(width, depth) * 1.4 + 10 - loopT * 0.2;
          const camX = Math.sin(loopT * 0.5) * spiralRadius;
          const camZ = Math.cos(loopT * 0.5) * spiralRadius;
          const camY = 3.5 + loopT * 1.4;
          camera.position.set(camX, camY, camZ);
          camera.lookAt(centerTarget);

          setDroneAltitude(camY);
          setDroneSpeedKmH(14.5 + Math.cos(t) * 2.0);
          setDroneGimbalPitch(-22);
        } else if (mode === 'flyby') {
          const passL = Math.max(width, depth) + 32;
          const zPos = ((t * 7) % (passL * 2)) - passL;
          const camX = width / 2 + 18;
          const camY = totalBuildingH + 6 + Math.sin(t * 0.4) * 2;
          camera.position.set(camX, camY, zPos);
          camera.lookAt(0, totalBuildingH * 0.4, zPos + 8);

          setDroneAltitude(camY);
          setDroneSpeedKmH(24.0);
          setDroneGimbalPitch(-14);
        } else if (mode === 'topdown_dive') {
          const diveT = (Math.sin(t * 0.4) + 1) / 2;
          const altY = totalBuildingH + 34 - diveT * 22;
          const forwardZ = depth / 2 + 22 - diveT * 15;
          camera.position.set(Math.sin(t * 0.2) * 6, altY, forwardZ);
          camera.lookAt(0, totalBuildingH * 0.2, 0);

          setDroneAltitude(altY);
          setDroneSpeedKmH(18.0 + diveT * 8.0);
          setDroneGimbalPitch(-45 - diveT * 30);
        }
      } else if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (elementHighlightRef.current) {
        elementHighlightRef.current.update();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Helper to deeply dispose all Three.js geometries and materials
    const disposeHierarchy = (obj: THREE.Object3D) => {
      for (let i = obj.children.length - 1; i >= 0; i--) {
        disposeHierarchy(obj.children[i]);
      }
      const mesh = obj as any;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat: THREE.Material) => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    };

    // Cleanup on unmount or structural rebuild
    return () => {
      clearTimeout(resizeTimer1);
      clearTimeout(resizeTimer2);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      canvasElem.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      disposeHierarchy(scene);
      renderer.dispose();
      try {
        renderer.forceContextLoss();
      } catch (e) {}
    };
  }, [
    unitCode,
    unitName,
    unitType,
    conditionGrade,
    buildingShape,
    totalAreaSqM,
    lengthM,
    widthM,
    heightM,
    floorsCount,
    rooms,
    selectedFloor,
    viewMode,
    equipment,
    archStyle,
    roofType,
  ]);

  // Dynamic Auto-rotate update without scene destruction
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Dynamic Visibility Updates for Furniture, Windows, Trees
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.traverse((obj: any) => {
      if (obj.userData?.isFurniture) {
        obj.visible = showFurniture;
      } else if (obj.userData?.isWindow) {
        obj.visible = showWindows;
      } else if (obj.userData?.isTree) {
        obj.visible = showTrees;
      }
    });
  }, [showFurniture, showWindows, showTrees]);

  // Dynamic Light & Environment Updates without full scene destruction
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const mult = Math.max(0.3, exteriorLightIntensity / 2.5);
    const bgHex = isNightMode ? 0x020617 : theme === 'light' ? 0xe2e8f0 : 0x090d16;
    scene.background = new THREE.Color(bgHex);
    if (scene.fog) {
      scene.fog.color = new THREE.Color(bgHex);
    }

    scene.traverse((obj: any) => {
      if (obj.userData?.isAmbientLight) {
        obj.color.setHex(isNightMode ? 0x1e1b4b : 0xffffff);
        obj.intensity = (isNightMode ? 0.35 : theme === 'light' ? 0.85 : 0.7) * mult;
      } else if (obj.userData?.isSunLight) {
        obj.color.setHex(isNightMode ? 0x60a5fa : 0xfffbeb);
        obj.intensity = (isNightMode ? 0.3 : 1.25) * mult;
      } else if (obj.userData?.isFillLight) {
        obj.intensity = (isNightMode ? 0.2 : 0.5) * mult;
      } else if (obj.userData?.isPerimeterFloodlight) {
        obj.visible = isNightMode && isNightLightsOn;
        if (obj.visible) {
          obj.intensity = 2.8 * (exteriorLightIntensity / 2.5);
        }
      } else if (obj.userData?.isInteriorLight) {
        const pIntensity = (isNightMode ? 1.8 : 1.0) * (interiorLightIntensity / 2.5);
        obj.intensity = isNightMode && !isNightLightsOn ? 0 : pIntensity;
      } else if (obj.userData?.isGroundPad && obj.material) {
        obj.material.color.setHex(isNightMode ? 0x0f172a : theme === 'light' ? 0xcbd5e1 : 0x1e293b);
      } else if (obj.userData?.isGlassMaterial && obj.material) {
        const isLit = (isNightMode && isNightLightsOn) || interiorLightIntensity > 2.0;
        obj.material.emissiveIntensity = isLit ? Math.min(3.0, 0.4 * interiorLightIntensity) : 0.0;
      }
    });
  }, [isNightMode, isNightLightsOn, theme, interiorLightIntensity, exteriorLightIntensity]);

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
    const aspect = camera.aspect || 1;

    if (viewMode === 'floor_cut') {
      setExplodePercent(50);
      const cam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'floor_cut');
      camera.position.copy(cam.pos);
      controls.target.copy(cam.target);
    } else if (viewMode === 'blueprint2d') {
      setExplodePercent(0);
      const cam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'top');
      camera.position.copy(cam.pos);
      controls.target.copy(cam.target);
    } else if (viewMode === 'walkthrough') {
      setExplodePercent(0);
      let posX = camPos.x;
      let posZ = camPos.z;
      if (!isPointInBuildingFootprint(posX, posZ, buildingShape, width, depth, 0.35)) {
        const wings = getBuildingWings(buildingShape, width, depth);
        if (wings.length > 0) {
          posX = (wings[0].minX + wings[0].maxX) / 2;
          posZ = (wings[0].minZ + wings[0].maxZ) / 2;
          setCamPos((prev) => ({ ...prev, x: posX, z: posZ }));
        }
      }
      camera.position.set(posX, 1.6, posZ);
      controls.target.set(posX - Math.sin(camPos.rotY) * 5, 1.6, posZ - Math.cos(camPos.rotY) * 5);
    } else {
      // Exterior
      setExplodePercent(0);
      const cam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'isometric');
      camera.position.copy(cam.pos);
      controls.target.copy(cam.target);
    }
    controls.update();
  }, [viewMode, floorsCount, storyHeight, width, depth]);

  // Preset Camera Views
  const setCameraPerspective = (type: 'isometric' | 'top' | 'front' | 'reset') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const totalY = floorsCount * storyHeight;
    const aspect = camera.aspect || 1;

    if (type === 'isometric' || type === 'reset') {
      const cam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'isometric');
      camera.position.copy(cam.pos);
      controls.target.copy(cam.target);
      setActivePerspective('isometric');
    } else if (type === 'top') {
      const cam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'top');
      camera.position.copy(cam.pos);
      controls.target.copy(cam.target);
      setActivePerspective('top');
    } else if (type === 'front') {
      const cam = getOptimalCameraPlacement(aspect, width, depth, totalY, 'front');
      camera.position.copy(cam.pos);
      controls.target.copy(cam.target);
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
      let nextX = x;
      let nextZ = z;
      if (dir === 'forward') {
        nextX -= Math.sin(rotY) * step;
        nextZ -= Math.cos(rotY) * step;
      }
      if (dir === 'backward') {
        nextX += Math.sin(rotY) * step;
        nextZ += Math.cos(rotY) * step;
      }

      // Check if candidate position is strictly inside building massing
      if (isPointInBuildingFootprint(nextX, nextZ, buildingShape, width, depth, 0.35)) {
        x = nextX;
        z = nextZ;
      }

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
    <div
      ref={containerRef}
      className={`transition-all duration-300 ${
        isFullscreen
          ? `fixed inset-0 z-50 w-screen h-screen ${isNightMode ? 'bg-slate-950' : 'bg-slate-100'} flex flex-col p-2 space-y-2 overflow-hidden`
          : 'space-y-3'
      }`}
    >
      {/* 3D Control Bar - Positioned outside above the 3D canvas (hidden in drone mode to keep 3D view clean and unobstructed) */}
      {!isDroneMode && (
        <div className={`p-1.5 sm:p-2 rounded-2xl border shadow-md flex flex-wrap items-center justify-between gap-1.5 text-xs transition-colors w-full min-w-0 ${
          isNightMode ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-800'
        }`}>
        {/* Camera Views Perspective Shortcuts */}
        <div className={`flex items-center gap-0.5 p-0.5 rounded-xl border shrink-0 transition-colors ${
          isNightMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => setCameraPerspective('isometric')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              activePerspective === 'isometric'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isNightMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="منظور ثلاثي الأبعاد أساسي"
          >
            منظور
          </button>
          <button
            onClick={() => setCameraPerspective('top')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              activePerspective === 'top'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isNightMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="مسقط رأسي علوي"
          >
            علوي
          </button>
          <button
            onClick={() => setCameraPerspective('front')}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10.5px] sm:text-xs font-bold transition-all cursor-pointer ${
              activePerspective === 'front'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : isNightMode
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="واجهة المبنى الأمامية"
          >
            واجهة
          </button>
        </div>

        {unitStatus === 'decommissioned' && (
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] sm:text-xs font-black flex items-center gap-1 shrink-0" title={decommissionReason || 'وحدة مشطوبة ومجمدة عن الخدمة'}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>مشطوبة</span>
          </div>
        )}

        {/* Action Controls - Responsive flex row with compact text and clear icons */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0 text-xs font-bold">
          {/* Day / Night Mode */}
          <button
            onClick={() => setIsNightMode(!isNightMode)}
            className={`px-2 sm:px-2.5 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer text-[10.5px] sm:text-xs ${
              isNightMode
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-amber-500/20 text-amber-700 border-amber-500/40'
            }`}
            title={isNightMode ? 'الوضع الداكن (مفعل)' : 'الوضع الفاتح (مفعل)'}
          >
            {isNightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">{isNightMode ? 'داكن' : 'فاتح'}</span>
          </button>

          {/* Night Lights */}
          {isNightMode && (
            <button
              onClick={() => setIsNightLightsOn(!isNightLightsOn)}
              className={`px-2 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer text-[10.5px] sm:text-xs ${
                isNightLightsOn
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={isNightLightsOn ? 'إطفاء الإنارة' : 'تشغيل الإنارة'}
            >
              {isNightLightsOn ? <Lightbulb className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> : <LightbulbOff className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">إنارة</span>
            </button>
          )}

          {/* Auto Rotate */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer text-[10.5px] sm:text-xs ${
              autoRotate
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : isNightMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={autoRotate ? 'إيقاف التدوير التلقائي' : 'تشغيل التدوير التلقائي'}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تدوير</span>
          </button>

          {/* Explode Floors (if multi-floor) */}
          {!isCaravan && floorsCount > 1 && (
            <button
              type="button"
              onClick={() => setShowExplodePopover(!showExplodePopover)}
              className={`px-2 sm:px-2.5 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer text-[10.5px] sm:text-xs ${
                explodePercent > 0 || showExplodePopover
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow'
                  : isNightMode
                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title="تفكيك وفصل الطوابق عمودياً (Exploded View)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تفكيك{explodePercent > 0 ? ` (${toArabicDigits(explodePercent)}%)` : ''}</span>
            </button>
          )}

          {/* Drone Mode */}
          <button
            onClick={() => {
              const next = !isDroneMode;
              setIsDroneMode(next);
              if (next) {
                if (controlsRef.current) controlsRef.current.enabled = false;
              } else {
                if (controlsRef.current) controlsRef.current.enabled = true;
              }
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer text-[10.5px] sm:text-xs ${
              isDroneMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow animate-pulse'
                : isNightMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="تصوير درون سينمائي جوي"
          >
            <Camera className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xs:inline">درون</span>
          </button>

          {/* Interactive Engineering Editor & Equipment Trigger */}
          <button
            onClick={() => setShowEngineeringEditor(!showEngineeringEditor)}
            className={`px-2 sm:px-2.5 py-1 rounded-xl border transition flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm text-[10.5px] sm:text-xs ${
              showEngineeringEditor
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold ring-2 ring-amber-500/30'
                : customElements.length > 0
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                : isNightMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title="المحرر الهندسي والمعدات وتخصيص الهيكل"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">المحرر والمعدات</span>
            <span className="sm:hidden">المحرر</span>
            {customElements.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-mono font-black ${
                showEngineeringEditor ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {toArabicDigits(customElements.length)}
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`px-2 sm:px-2.5 py-1 rounded-xl border transition flex items-center gap-1 cursor-pointer text-[10.5px] sm:text-xs ${
              isFullscreen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                : isNightMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
            title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-500" />}
            <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
          </button>
        </div>
      </div>
      )}

      {/* 3D WebGL Canvas Viewport */}
      <div
        className={`relative w-full ${
          isFullscreen ? 'flex-1 h-full rounded-none border-0' : 'h-[360px] xs:h-[440px] sm:h-[540px] rounded-2xl border'
        } overflow-hidden shadow-2xl flex flex-col select-none transition-all duration-300 min-w-0 ${
          isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDropOnCanvas}
      >
        {/* 3D WebGL Canvas Host Container - Single Ref & Full Mouse Interaction */}
        <div
          ref={mountRef}
          className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
        />

        {/* Interactive Exploded View Floating Controller Overlay (Always on top of 3D Canvas, never clipped) */}
        {!isCaravan && floorsCount > 1 && showExplodePopover && !isDroneMode && (
          <div
            className={`absolute top-3 left-3 sm:left-auto sm:right-3 z-30 p-3.5 sm:p-4 rounded-2xl border shadow-2xl backdrop-blur-md w-72 sm:w-80 max-w-[92vw] space-y-3 text-xs animate-in fade-in slide-in-from-top-2 transition-all ${
              isNightMode
                ? 'bg-slate-900/95 border-amber-500/40 text-slate-200 shadow-black/80 ring-1 ring-amber-500/20'
                : 'bg-white/95 border-amber-500/50 text-slate-800 shadow-slate-400/50 ring-1 ring-amber-500/20'
            }`}
          >
            {/* Header with Title and Close Button */}
            <div className={`flex items-center justify-between border-b pb-2.5 ${isNightMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-xs sm:text-sm text-amber-500">تفكيك وفصل الطوابق</h4>
                  <p className={`text-[10px] ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>فصل الطوابق رأسياً لمعاينة التقسيمات والمعدات</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExplodePopover(false)}
                className={`p-1 rounded-lg transition cursor-pointer ${
                  isNightMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
                title="إغلاق اللوحة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Percentage & Quick Reset */}
            <div className="flex items-center justify-between font-bold">
              <span className={isNightMode ? 'text-slate-300' : 'text-slate-700'}>مسافة التباعد العمودي:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 shadow-sm">
                  {toArabicDigits(explodePercent)}%
                </span>
                {explodePercent > 0 && (
                  <button
                    type="button"
                    onClick={() => setExplodePercent(0)}
                    className={`p-1 rounded-lg transition cursor-pointer ${
                      isNightMode ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-amber-600'
                    }`}
                    title="إعادة ضم الطوابق بالكامل (0%)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Interactive Range Slider */}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={explodePercent}
              onChange={(e) => setExplodePercent(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              <button
                type="button"
                onClick={() => setExplodePercent(0)}
                className={`py-1 px-1 rounded-lg font-bold text-[10px] text-center transition cursor-pointer border ${
                  explodePercent === 0
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                ضم (٠%)
              </button>
              <button
                type="button"
                onClick={() => setExplodePercent(30)}
                className={`py-1 px-1 rounded-lg font-bold text-[10px] text-center transition cursor-pointer border ${
                  explodePercent === 30
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                خفيف (٣٠%)
              </button>
              <button
                type="button"
                onClick={() => setExplodePercent(60)}
                className={`py-1 px-1 rounded-lg font-bold text-[10px] text-center transition cursor-pointer border ${
                  explodePercent === 60
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                متوسط (٦٠%)
              </button>
              <button
                type="button"
                onClick={() => setExplodePercent(100)}
                className={`py-1 px-1 rounded-lg font-bold text-[10px] text-center transition cursor-pointer border ${
                  explodePercent === 100
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : isNightMode
                    ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                كامل (١٠٠%)
              </button>
            </div>

            {/* Informational Hint */}
            <div className={`text-[10px] p-2 rounded-xl border flex items-center gap-1.5 ${
              isNightMode ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <Info className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>يمكنك تدوير المبنى أو تكبيره بحرية لرؤية الغرف والمعدات أثناء التفكيك.</span>
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

          <div className={`p-2 rounded-xl border flex items-center justify-between ${
            isNightMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-slate-500 text-xs font-bold">الجهة الشاغلة:</span>
            <strong className={`font-bold text-xs ${
              isRoomVacant(selectedRoomData.occupiedBy) ? 'text-amber-500' : 'text-sky-500'
            }`}>
              {isRoomVacant(selectedRoomData.occupiedBy) ? 'شاغرة' : selectedRoomData.occupiedBy}
            </strong>
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

      {/* Floating Element Transform Toolbar (Move, Rotate, Scale, Duplicate, Delete) */}
      {selectedElementId && !isDroneMode && (
        (() => {
          const selectedEl = customElements.find((e) => e.id === selectedElementId);
          if (!selectedEl) return null;
          return (
            <ElementTransformToolbar
              element={selectedEl}
              onUpdate={handleUpdateElement}
              onUpdateElement={handleUpdateElement}
              onDelete={handleDeleteElement}
              onDeleteElement={handleDeleteElement}
              onDuplicate={handleDuplicateElement}
              onDuplicateElement={handleDuplicateElement}
              onClose={() => {
                setSelectedElementId(null);
                selectedElementIdRef.current = null;
              }}
              onDeselect={() => {
                setSelectedElementId(null);
                selectedElementIdRef.current = null;
              }}
              roofHeight={floorsCount * storyHeight}
              isNightMode={isNightMode}
            />
          );
        })()
      )}

      {/* Cinematic Drone HUD Overlay */}
      {isDroneMode && (
        <DroneHudOverlay
          flightMode={droneFlightMode}
          onFlightModeChange={setDroneFlightMode}
          speed={droneSpeed}
          onSpeedChange={setDroneSpeed}
          altitude={droneAltitude}
          speedKmH={droneSpeedKmH}
          gimbalPitch={droneGimbalPitch}
          isRecording={isRecording}
          onToggleRecording={handleToggleDroneRecording}
          onCapturePhoto={handleCaptureDronePhoto}
          onExit={() => {
            setIsDroneMode(false);
            if (controlsRef.current) {
              controlsRef.current.enabled = true;
            }
          }}
          showGrid={showDroneGrid}
          onToggleGrid={() => setShowDroneGrid(!showDroneGrid)}
          showCinematicBars={showCinematicBars}
          onToggleCinematicBars={() => setShowCinematicBars(!showCinematicBars)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          unitCode={unitCode}
          onManualMove={handleDroneManualMove}
          isNightMode={isNightMode}
        />
      )}

      {/* Interactive Engineering Editor - Draggable & Configurable Site Elements + Finishing Settings */}
      <InteractiveEngineeringEditor
        isOpen={showEngineeringEditor}
        onToggleOpen={() => setShowEngineeringEditor(!showEngineeringEditor)}
        elements={customElements}
        selectedElementId={selectedElementId}
        onSelectElement={(id) => {
          setSelectedElementId(id);
          selectedElementIdRef.current = id;
        }}
        onAddElement={handleAddSiteElement}
        onUpdateElement={handleUpdateElement}
        onDeleteElement={handleDeleteElement}
        onDuplicateElement={handleDuplicateElement}
        isSavingDatabase={isSavingDb}
        lastSavedTime={lastSavedTime}
        roofHeight={floorsCount * storyHeight}
        buildingWidth={width}
        buildingDepth={depth}
        isNightMode={isNightMode}
        theme={theme}
        archStyle={archStyle}
        roofType={roofType}
        showFurniture={showFurniture}
        showWindows={showWindows}
        showTrees={showTrees}
        interiorLightIntensity={interiorLightIntensity}
        exteriorLightIntensity={exteriorLightIntensity}
        onUpdateFinishingSettings={(updated) => {
          if (updated.archStyle !== undefined) setArchStyle(updated.archStyle);
          if (updated.roofType !== undefined) setRoofType(updated.roofType as any);
          if (updated.showFurniture !== undefined) setShowFurniture(updated.showFurniture);
          if (updated.showWindows !== undefined) setShowWindows(updated.showWindows);
          if (updated.showTrees !== undefined) setShowTrees(updated.showTrees);
          if (updated.interiorLightIntensity !== undefined) setInteriorLightIntensity(updated.interiorLightIntensity);
          if (updated.exteriorLightIntensity !== undefined) setExteriorLightIntensity(updated.exteriorLightIntensity);
          autoSaveDebounced(customElements, updated);
        }}
      />

      {/* Site Elements Manager & Catalog Modal */}
      <SiteElementsManagerModal
        isOpen={showSiteElementsModal}
        onClose={() => setShowSiteElementsModal(false)}
        onAddElement={handleAddSiteElement}
        existingElements={customElements}
        onSelectElement={(id) => {
          setSelectedElementId(id);
          selectedElementIdRef.current = id;
          setShowSiteElementsModal(false);
        }}
        onDeleteElement={handleDeleteElement}
        selectedElementId={selectedElementId}
        isNightMode={isNightMode}
        buildingHeight={floorsCount * storyHeight}
      />
      </div>
    </div>
  );
};

export const ThreeBuildingCanvas = React.memo(ThreeBuildingCanvasComponent);

// --- HELPER FUNCTION: DYNAMIC LIGHTS SETUP ---
function setupLights(scene: THREE.Scene, isNightMode: boolean, theme: string, exteriorIntensity: number = 3.5) {
  const mult = Math.max(0.3, exteriorIntensity / 2.5);
  const ambientLight = new THREE.AmbientLight(
    isNightMode ? 0x1e1b4b : 0xffffff,
    (isNightMode ? 0.35 : theme === 'light' ? 0.85 : 0.7) * mult
  );
  ambientLight.userData = { isAmbientLight: true };
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(
    isNightMode ? 0x60a5fa : 0xfffbeb,
    (isNightMode ? 0.3 : 1.25) * mult
  );
  sunLight.position.set(20, 35, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 1024;
  sunLight.shadow.mapSize.height = 1024;
  sunLight.userData = { isSunLight: true };
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x38bdf8, (isNightMode ? 0.2 : 0.5) * mult);
  fillLight.position.set(-15, 15, -15);
  fillLight.userData = { isFillLight: true };
  scene.add(fillLight);
}

// --- HELPER FUNCTION: SETUP ENVIRONMENT (Grid, Pavement, Trees, Floodlights, Geometric Axes) ---
function setupEnvironment(
  scene: THREE.Scene,
  width: number,
  depth: number,
  showTrees: boolean,
  isNightMode: boolean,
  isNightLightsOn: boolean,
  theme: string,
  exteriorIntensity: number = 3.5,
  showAxes: boolean = false
) {
  const gridHelper = new THREE.GridHelper(100, 40, 0x3b82f6, 0x334155);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // Geometric Coordinate Axes (XYZ Axes Helper)
  const axesHelper = new THREE.AxesHelper(14);
  axesHelper.name = 'geometricAxesHelper';
  axesHelper.position.set(-width / 2 - 1.5, 0.05, -depth / 2 - 1.5);
  axesHelper.visible = showAxes;
  scene.add(axesHelper);

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
  padMesh.userData = { isGroundPad: true };
  scene.add(padMesh);
}

// --- REUSABLE CACHES FOR GEOMETRY & MATERIAL EFFICIENCY ---
const GEOM_CACHE: Record<string, THREE.BufferGeometry> = {};
const MAT_CACHE: Record<string, THREE.Material> = {};

function getCachedBoxGeometry(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `box_${w.toFixed(2)}_${h.toFixed(2)}_${d.toFixed(2)}`;
  if (!GEOM_CACHE[key]) {
    GEOM_CACHE[key] = new THREE.BoxGeometry(w, h, d);
  }
  return GEOM_CACHE[key] as THREE.BoxGeometry;
}

function getCachedCylinderGeometry(rt: number, rb: number, h: number, segs: number = 8): THREE.CylinderGeometry {
  const key = `cyl_${rt.toFixed(2)}_${rb.toFixed(2)}_${h.toFixed(2)}_${segs}`;
  if (!GEOM_CACHE[key]) {
    GEOM_CACHE[key] = new THREE.CylinderGeometry(rt, rb, h, segs);
  }
  return GEOM_CACHE[key] as THREE.CylinderGeometry;
}

function getCachedConeGeometry(r: number, h: number, segs: number = 8): THREE.ConeGeometry {
  const key = `cone_${r.toFixed(2)}_${h.toFixed(2)}_${segs}`;
  if (!GEOM_CACHE[key]) {
    GEOM_CACHE[key] = new THREE.ConeGeometry(r, h, segs);
  }
  return GEOM_CACHE[key] as THREE.ConeGeometry;
}

function getCachedStandardMaterial(
  color: number,
  metalness: number = 0,
  roughness: number = 0.5,
  transparent: boolean = false,
  opacity: number = 1.0
): THREE.MeshStandardMaterial {
  const key = `std_${color.toString(16)}_${metalness}_${roughness}_${transparent}_${opacity}`;
  if (!MAT_CACHE[key]) {
    MAT_CACHE[key] = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      transparent,
      opacity,
    });
  }
  return MAT_CACHE[key] as THREE.MeshStandardMaterial;
}

function getCachedBasicMaterial(color: number, visible: boolean = true): THREE.MeshBasicMaterial {
  const key = `basic_${color.toString(16)}_${visible}`;
  if (!MAT_CACHE[key]) {
    MAT_CACHE[key] = new THREE.MeshBasicMaterial({ color, visible });
  }
  return MAT_CACHE[key] as THREE.MeshBasicMaterial;
}

function createTreeMesh(): THREE.Group {
  const group = new THREE.Group();
  const trunkGeo = getCachedCylinderGeometry(0.25, 0.4, 2.5, 8);
  const trunkMat = getCachedStandardMaterial(0x78350f, 0, 0.9);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  group.add(trunk);

  const folGeo = getCachedConeGeometry(1.6, 4.0, 8);
  const folMat = getCachedStandardMaterial(0x15803d, 0, 0.7);
  const fol = new THREE.Mesh(folGeo, folMat);
  fol.position.y = 3.8;
  fol.castShadow = true;
  group.add(fol);

  return group;
}

// --- HELPER FUNCTION: RENDER ARCHITECTURAL WINDOWS STRICTLY ON REAL WALLS ---
function renderBuildingWindows(
  floorGroup: THREE.Group,
  buildingShape: string,
  width: number,
  depth: number,
  storyHeight: number,
  glassMat: THREE.Material,
  showWindows: boolean
) {
  const segments = getBuildingExteriorWallSegments(buildingShape, width, depth);
  const winHeight = storyHeight - 0.75;
  const winThickness = 0.08;

  segments.forEach((seg, idx) => {
    // Only place glass panels on wall segments long enough for a window
    if (seg.length < 1.4) return;

    // Leave a 0.35m structural column at each corner
    const panelLen = Math.max(0.8, seg.length - 0.7);
    const geom = getCachedBoxGeometry(panelLen, winHeight, winThickness);
    const winMesh = new THREE.Mesh(geom, glassMat);

    const midX = (seg.x1 + seg.x2) / 2;
    const midZ = (seg.z1 + seg.z2) / 2;

    winMesh.position.set(midX, storyHeight / 2, midZ);
    winMesh.rotation.y = seg.angle;
    winMesh.userData = { isWindow: true, isGlassMaterial: true, segmentIndex: idx };
    winMesh.visible = showWindows;

    floorGroup.add(winMesh);
  });
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
  isNightLightsOn: boolean,
  roomMeshesStore: THREE.Mesh[],
  interiorIntensity: number = 3.5,
  isFloorActive: boolean = true,
  buildingShape: string = 'مستطيل'
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

  // Compute strictly-contained room slots inside the real building footprint
  const roomSlots = computeRoomSlotsForFloor(buildingShape, width, depth, activeRooms.length);
  if (roomSlots.length === 0) return;

  const wallH = storyHeight - 0.6;
  const wallMat = getCachedStandardMaterial(0xcbd5e1, 0, 0.8);

  // Determine dominant light color for the floor
  let floorDominantColor = 0xffffff;

  activeRooms.forEach((rm, i) => {
    const slot = roomSlots[i] || roomSlots[roomSlots.length - 1];
    const { x, z, width: roomW, depth: roomD, wingName } = slot;

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

    if (i === 0) {
      floorDominantColor = colorHex;
    }

    // Room Floor Pad Mesh (Guaranteed strictly within building perimeter)
    const padGeo = getCachedBoxGeometry(roomW, 0.06, roomD);
    const padMat = getCachedStandardMaterial(colorHex, 0, 0.4, true, 0.85);
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.set(x, 0.18, z);

    padMesh.userData = {
      isRoom: true,
      id: rm.id || `rm-${i}`,
      name: rm.name || `غرفة ${i + 1}`,
      floorName: `${rm.floor || (floorIndex === 0 ? 'الطابق الأرضي' : `الطابق ${floorIndex + 1}`)} (${wingName})`,
      dimensions: `${roomW.toFixed(1)}م × ${roomD.toFixed(1)}م`,
      area: `${rm.areaSqM || Math.round((roomW * roomD) * 10) / 10} م²`,
      type: rm.type || 'غرفة مسجلة',
      occupiedBy: rm.occupiedBy || '',
      contents: [
        isStopped ? 'الحالة: متوقفة 🔴' : 'الحالة: فعالة 🟢',
        `الموقع المعماري: ${wingName}`,
        isStopped && rm.notes ? `سبب التوقف: ${rm.notes}` : null,
        `الجهة الشاغلة: ${isRoomVacant(rm.occupiedBy) ? 'شاغرة' : (rm.occupiedBy || 'شاغرة')}`,
      ].filter(Boolean),
    };

    floorGroup.add(padMesh);
    roomMeshesStore.push(padMesh);

    // Partition Divider Walls: Only place divider walls between rooms within the SAME wing
    if (i < activeRooms.length - 1 && roomSlots[i + 1]?.wingName === wingName) {
      const nextSlot = roomSlots[i + 1];
      const midX = (x + nextSlot.x) / 2;
      const midZ = (z + nextSlot.z) / 2;

      if (Math.abs(x - nextSlot.x) > Math.abs(z - nextSlot.z)) {
        // Divider along Z
        const pWallGeo = getCachedBoxGeometry(0.08, wallH, Math.min(roomD, nextSlot.depth));
        const pWall = new THREE.Mesh(pWallGeo, wallMat);
        pWall.position.set(midX, wallH / 2 + 0.2, midZ);
        floorGroup.add(pWall);
      } else {
        // Divider along X
        const pWallGeo = getCachedBoxGeometry(Math.min(roomW, nextSlot.width), wallH, 0.08);
        const pWall = new THREE.Mesh(pWallGeo, wallMat);
        pWall.position.set(midX, wallH / 2 + 0.2, midZ);
        floorGroup.add(pWall);
      }
    }

    // Interior Furniture Models strictly scaled and enclosed inside room boundaries
    renderFurnitureInRoom(floorGroup, rm.type || rm.name || '', x, 0.25, z, showFurniture, roomW, roomD);
  });

  // Consolidated Floor Light Source: placed at center of first active room or wing
  const pIntensity = (isNightMode ? 2.2 : 1.2) * (interiorIntensity / 2.5);
  const firstSlot = roomSlots[0];
  const lightX = firstSlot ? firstSlot.x : 0;
  const lightZ = firstSlot ? firstSlot.z : 0;
  const floorLight = new THREE.PointLight(
    floorDominantColor,
    isNightMode && !isNightLightsOn ? 0 : pIntensity,
    Math.max(width, depth) * 1.8
  );
  floorLight.position.set(lightX, storyHeight - 0.4, lightZ);
  floorLight.userData = { isInteriorLight: true, baseColor: floorDominantColor };
  floorGroup.add(floorLight);
}

function renderFurnitureInRoom(
  parentGroup: THREE.Group,
  type: string,
  x: number,
  y: number,
  z: number,
  showFurniture: boolean = true,
  roomW: number = 3.0,
  roomD: number = 3.0
) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.userData = { isFurniture: true };
  group.visible = showFurniture;

  // Auto-scale furniture to stay strictly inside room boundaries with comfortable clearance
  const scale = Math.max(0.45, Math.min(1.0, Math.min(roomW / 3.0, roomD / 3.0)));
  group.scale.set(scale, 1.0, scale);

  if (type.includes('اجتماعات') || type.includes('قاعة')) {
    const tableW = Math.min(2.2, roomW * 0.7);
    const tableD = Math.min(1.1, roomD * 0.45);
    const tableGeo = getCachedBoxGeometry(tableW, 0.65, tableD);
    const tableMat = getCachedStandardMaterial(0x334155, 0, 0.3);
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = 0.32;
    group.add(table);

    const chairGeo = getCachedBoxGeometry(0.35, 0.5, 0.35);
    const chairMat = getCachedStandardMaterial(0x0284c7);
    const chairDistX = Math.min(0.8, tableW * 0.38);
    const chairDistZ = Math.min(0.7, (roomD * 0.38) / scale);

    [-chairDistX, 0, chairDistX].forEach((cx) => {
      const chair1 = new THREE.Mesh(chairGeo, chairMat);
      chair1.position.set(cx, 0.25, chairDistZ);
      group.add(chair1);

      const chair2 = new THREE.Mesh(chairGeo, chairMat);
      chair2.position.set(cx, 0.25, -chairDistZ);
      group.add(chair2);
    });
  } else if (type.includes('استقبال') || type.includes('راحة')) {
    const sofaW = Math.min(2.0, roomW * 0.65);
    const sofaGeo = getCachedBoxGeometry(sofaW, 0.55, 0.7);
    const sofaMat = getCachedStandardMaterial(0x0284c7);
    const sofa = new THREE.Mesh(sofaGeo, sofaMat);
    sofa.position.set(0, 0.28, -Math.min(0.6, roomD * 0.25));
    group.add(sofa);

    const cTableGeo = getCachedBoxGeometry(Math.min(1.2, sofaW * 0.7), 0.35, 0.5);
    const cTableMat = getCachedStandardMaterial(0x94a3b8);
    const cTable = new THREE.Mesh(cTableGeo, cTableMat);
    cTable.position.set(0, 0.18, Math.min(0.2, roomD * 0.1));
    group.add(cTable);
  } else if (type.includes('سيرفر') || type.includes('مختبر') || type.includes('خوادم')) {
    const rackGeo = getCachedBoxGeometry(0.65, 1.6, 0.65);
    const rackMat = getCachedStandardMaterial(0x0f172a, 0.9, 0.2);
    const rackOffset = Math.min(0.55, roomW * 0.25);
    const rack1 = new THREE.Mesh(rackGeo, rackMat);
    rack1.position.set(-rackOffset, 0.8, 0);
    group.add(rack1);

    const rack2 = new THREE.Mesh(rackGeo, rackMat);
    rack2.position.set(rackOffset, 0.8, 0);
    group.add(rack2);
  } else {
    // Standard Desks
    const deskW = Math.min(1.1, roomW * 0.45);
    const deskD = Math.min(0.6, roomD * 0.35);
    const deskGeo = getCachedBoxGeometry(deskW, 0.6, deskD);
    const deskMat = getCachedStandardMaterial(0x64748b);

    const offsetX = Math.min(0.55, roomW * 0.25);
    const offsetZ = Math.min(0.35, roomD * 0.2);

    const desk1 = new THREE.Mesh(deskGeo, deskMat);
    desk1.position.set(-offsetX, 0.3, -offsetZ);
    group.add(desk1);

    if (roomW >= 2.0) {
      const desk2 = new THREE.Mesh(deskGeo, deskMat);
      desk2.position.set(offsetX, 0.3, offsetZ);
      group.add(desk2);
    }
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
    const parapetMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.5 });
    const segments = getBuildingExteriorWallSegments(buildingShape, width, depth);
    segments.forEach((seg) => {
      if (seg.length < 0.3) return;
      const curbGeo = getCachedBoxGeometry(seg.length, 0.42, 0.18);
      const curbMesh = new THREE.Mesh(curbGeo, parapetMat);
      const midX = (seg.x1 + seg.x2) / 2;
      const midZ = (seg.z1 + seg.z2) / 2;
      curbMesh.position.set(midX, baseRoofY + 0.22 + 0.21, midZ);
      curbMesh.rotation.y = seg.angle;
      roofGroup.add(curbMesh);
    });

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

    const parapetMat = new THREE.MeshStandardMaterial({ color: accentColorHex, roughness: 0.5 });
    const segments = getBuildingExteriorWallSegments(buildingShape, width, depth);
    segments.forEach((seg) => {
      if (seg.length < 0.3) return;
      const curbGeo = getCachedBoxGeometry(seg.length, 0.40, 0.18);
      const curbMesh = new THREE.Mesh(curbGeo, parapetMat);
      const midX = (seg.x1 + seg.x2) / 2;
      const midZ = (seg.z1 + seg.z2) / 2;
      curbMesh.position.set(midX, baseRoofY + 0.22 + 0.20, midZ);
      curbMesh.rotation.y = seg.angle;
      roofGroup.add(curbMesh);
    });

    let pergolaX = 0;
    let pergolaZ = 0;
    if (!isPointInBuildingFootprint(0, 0, buildingShape, width, depth, 0.8)) {
      const wings = getBuildingWings(buildingShape, width, depth);
      if (wings.length > 0) {
        pergolaX = (wings[0].minX + wings[0].maxX) / 2;
        pergolaZ = (wings[0].minZ + wings[0].maxZ) / 2;
      }
    }

    const pWidth = Math.min(width * 0.35, 3.2);
    const pDepth = Math.min(depth * 0.35, 2.2);
    const pergolaGeo = new THREE.BoxGeometry(pWidth, 0.08, pDepth);
    const pergolaMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const pergola = new THREE.Mesh(pergolaGeo, pergolaMat);
    pergola.position.set(pergolaX, baseRoofY + 1.9, pergolaZ);
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
      post.position.set(pergolaX + px, baseRoofY + 0.31 + 0.8, pergolaZ + pz);
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
  let beaconX = width * 0.35;
  let beaconZ = depth * 0.35;
  if (!isPointInBuildingFootprint(beaconX, beaconZ, buildingShape, width, depth, 0.4)) {
    const wings = getBuildingWings(buildingShape, width, depth);
    if (wings.length > 0) {
      beaconX = wings[0].maxX - 0.5;
      beaconZ = wings[0].maxZ - 0.5;
    }
  }
  beacon.position.set(beaconX, beaconY, beaconZ);
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
  roomMeshesStore?: THREE.Mesh[],
  buildingShape: string = 'مستطيل'
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

  // 1. Render Roof Equipment (Strictly on roof massing)
  roofItems.forEach((eq, idx) => {
    const pos = getInsideEquipmentPosition(buildingShape, width, depth, idx, roofItems.length);
    const x = pos.x;
    const z = pos.z;
    const y = totalHeight + 0.45;

    const group = createEquipmentMesh3D(eq);
    group.position.set(x, y, z);
    parentGroup.add(group);

    // Make interactive mesh target for raycaster
    const boundBoxGeo = getCachedBoxGeometry(1.6, 1.2, 1.4);
    const boundBoxMat = getCachedBasicMaterial(0x000000, false);
    const boundBox = new THREE.Mesh(boundBoxGeo, boundBoxMat);
    boundBox.position.set(x, y, z);
    boundBox.userData = {
      isRoom: true,
      id: eq.id || `eq-roof-${idx}`,
      name: eq.name || 'معدة سقف الوحدة',
      floorName: 'موقع التثبيت: سقف الوحدة (Roof Deck)',
      dimensions: `السعة/النوع: ${eq.capacity || eq.type || 'سقف'}`,
      area: `الحالة: ${eq.status || 'Active'}`,
      type: 'معدة',
      contents: [
        `اسم المعدة: ${eq.name}`,
        `الموقع الهيكلي: سقف الوحدة (${pos.wingName})`,
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

    const boundBoxGeo = getCachedBoxGeometry(1.8, 1.4, 1.4);
    const boundBoxMat = getCachedBasicMaterial(0x000000, false);
    const boundBox = new THREE.Mesh(boundBoxGeo, boundBoxMat);
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

  // 3. Render Inside Unit Equipment (Strictly inside building footprint)
  insideItems.forEach((eq, idx) => {
    const pos = getInsideEquipmentPosition(buildingShape, width, depth, idx, insideItems.length);
    const x = pos.x;
    const z = pos.z;
    const y = 0.45;

    const group = createEquipmentMesh3D(eq);
    group.position.set(x, y, z);
    parentGroup.add(group);

    const boundBoxGeo = getCachedBoxGeometry(1.4, 1.2, 1.2);
    const boundBoxMat = getCachedBasicMaterial(0x000000, false);
    const boundBox = new THREE.Mesh(boundBoxGeo, boundBoxMat);
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
        `الموقع الهيكلي: داخل الوحدة (${pos.wingName})`,
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
    const baseMat = getCachedStandardMaterial(0x1e293b, 0.8, 0.5);
    const baseGeo = getCachedBoxGeometry(1.8, 0.25, 1.1);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.125;
    group.add(base);

    const bodyMat = getCachedStandardMaterial(0x0284c7, 0.6, 0.3);
    const bodyGeo = getCachedBoxGeometry(1.6, 0.85, 0.95);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.675;
    group.add(body);

    // Radiator Grill & Exhaust Pipe
    const grillMat = getCachedStandardMaterial(0x0f172a, 0.9, 0.5);
    const grillGeo = getCachedBoxGeometry(0.05, 0.6, 0.8);
    const grill = new THREE.Mesh(grillGeo, grillMat);
    grill.position.set(0.825, 0.675, 0);
    group.add(grill);

    const pipeMat = getCachedStandardMaterial(0x334155, 0.9, 0.5);
    const pipeGeo = getCachedCylinderGeometry(0.06, 0.06, 0.5, 12);
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(-0.4, 1.35, 0.2);
    group.add(pipe);
  } else if (nameStr.includes('tank') || nameStr.includes('خزان') || nameStr.includes('مياه') || nameStr.includes('tnk')) {
    // Water / Fuel Tank Cylinder
    const legMat = getCachedStandardMaterial(0x334155, 0.8, 0.5);
    const legGeo = getCachedCylinderGeometry(0.05, 0.05, 0.4, 8);
    [-0.4, 0.4].forEach((lx) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.2, 0);
      group.add(leg);
    });

    const tankMat = getCachedStandardMaterial(0x38bdf8, 0.6, 0.2);
    const tankGeo = getCachedCylinderGeometry(0.55, 0.55, 1.2, 16);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 0.9;
    group.add(tank);
  } else if (nameStr.includes('ac') || nameStr.includes('تكييف') || nameStr.includes('hvac')) {
    // HVAC Condenser Unit
    const acMat = getCachedStandardMaterial(0x64748b, 0.7, 0.3);
    const acGeo = getCachedBoxGeometry(1.3, 0.85, 1.1);
    const acBox = new THREE.Mesh(acGeo, acMat);
    acBox.position.y = 0.425;
    group.add(acBox);

    const fanMat = getCachedStandardMaterial(0x0f172a, 0.9, 0.5);
    const fanGeo = getCachedCylinderGeometry(0.35, 0.35, 0.05, 12);
    const fan = new THREE.Mesh(fanGeo, fanMat);
    fan.position.set(0, 0.875, 0);
    group.add(fan);
  } else if (nameStr.includes('شمس') || nameStr.includes('solar')) {
    // Solar PV Array Panel
    const frameMat = getCachedStandardMaterial(0x334155, 0.9, 0.5);
    const poleGeo = getCachedCylinderGeometry(0.06, 0.06, 0.8, 8);
    const pole = new THREE.Mesh(poleGeo, frameMat);
    pole.position.y = 0.4;
    group.add(pole);

    const panelMat = getCachedStandardMaterial(0x1e3a8a, 0.8, 0.1);
    const panelGeo = getCachedBoxGeometry(1.6, 0.05, 1.1);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 0.8, 0);
    panel.rotation.x = Math.PI / 6; // 30 deg tilt
    group.add(panel);
  } else if (nameStr.includes('سيرفر') || nameStr.includes('it') || nameStr.includes('شبكة')) {
    // IT Server Cabinet Rack
    const rackMat = getCachedStandardMaterial(0x0f172a, 0.9, 0.2);
    const rackGeo = getCachedBoxGeometry(0.7, 1.5, 0.7);
    const rack = new THREE.Mesh(rackGeo, rackMat);
    rack.position.y = 0.75;
    group.add(rack);

    const ledMat = getCachedBasicMaterial(0x38bdf8);
    const ledGeo = getCachedBoxGeometry(0.5, 0.05, 0.02);
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0, 1.2, 0.36);
    group.add(led);
  } else if (nameStr.includes('foam') || nameStr.includes('رغوي') || nameStr.includes('إطفاء') || nameStr.includes('fire_foam')) {
    // Hydraulic Fire Foam Monitor (High-Visibility Red & Yellow)
    const baseMat = getCachedStandardMaterial(0x1e293b, 0.8, 0.4);
    const baseGeo = getCachedBoxGeometry(1.2, 0.15, 1.2);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.075;
    group.add(base);

    const riserMat = getCachedStandardMaterial(0xdc2626, 0.3, 0.4);
    const riserGeo = getCachedCylinderGeometry(0.12, 0.12, 0.9, 12);
    const riser = new THREE.Mesh(riserGeo, riserMat);
    riser.position.y = 0.6;
    group.add(riser);

    const wheelMat = getCachedStandardMaterial(0xfacc15, 0.3, 0.3);
    const wheelGeo = getCachedCylinderGeometry(0.18, 0.18, 0.04, 12);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(0.18, 0.85, 0);
    wheel.rotation.z = Math.PI / 2;
    group.add(wheel);

    const cannonGeo = getCachedCylinderGeometry(0.08, 0.11, 0.7, 12);
    const cannon = new THREE.Mesh(cannonGeo, riserMat);
    cannon.position.set(0, 1.15, 0.25);
    cannon.rotation.x = Math.PI / 3;
    group.add(cannon);

    const nozzleMat = getCachedStandardMaterial(0xd97706, 0.8, 0.3);
    const nozzleGeo = getCachedCylinderGeometry(0.07, 0.1, 0.2, 12);
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.set(0, 1.35, 0.5);
    nozzle.rotation.x = Math.PI / 3;
    group.add(nozzle);
  } else if (nameStr.includes('muster') || nameStr.includes('إسعاف') || nameStr.includes('تجمع') || nameStr.includes('first_aid')) {
    // Emergency Muster Point & First Aid Station
    const padMat = getCachedStandardMaterial(0x94a3b8, 0.3, 0.7);
    const padGeo = getCachedBoxGeometry(1.8, 0.15, 1.8);
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.y = 0.075;
    group.add(pad);

    const postMat = getCachedStandardMaterial(0xe2e8f0, 0.3, 0.3);
    const postGeo = getCachedCylinderGeometry(0.04, 0.04, 1.8, 8);
    [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]].forEach(([px, pz]) => {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 1.0, pz);
      group.add(post);
    });

    const roofMat = getCachedStandardMaterial(0x15803d, 0.3, 0.4);
    const roofGeo = getCachedBoxGeometry(2.0, 0.1, 2.0);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.95;
    group.add(roof);

    const cabMat = getCachedStandardMaterial(0x16a34a, 0.3, 0.4);
    const cabGeo = getCachedBoxGeometry(0.5, 0.6, 0.2);
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.0, -0.75);
    group.add(cab);

    const crossMat = getCachedBasicMaterial(0xffffff);
    const cross1 = new THREE.Mesh(getCachedBoxGeometry(0.25, 0.07, 0.02), crossMat);
    cross1.position.set(0, 1.0, -0.64);
    group.add(cross1);
    const cross2 = new THREE.Mesh(getCachedBoxGeometry(0.07, 0.25, 0.02), crossMat);
    cross2.position.set(0, 1.0, -0.64);
    group.add(cross2);
  } else if (nameStr.includes('siren') || nameStr.includes('صفارة') || nameStr.includes('إنذار') || nameStr.includes('تحذير')) {
    // Public Emergency Siren & Warning Loudspeakers Pole
    const baseMat = getCachedStandardMaterial(0x334155, 0.8, 0.5);
    const baseGeo = getCachedBoxGeometry(0.8, 0.15, 0.8);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.075;
    group.add(base);

    const poleMat = getCachedStandardMaterial(0x94a3b8, 0.4, 0.5);
    const poleGeo = getCachedCylinderGeometry(0.06, 0.08, 2.4, 10);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.25;
    group.add(pole);

    const hornMat = getCachedStandardMaterial(0x475569, 0.4, 0.4);
    const hornGeo = getCachedConeGeometry(0.16, 0.3, 10);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(Math.cos(angle) * 0.18, 2.2, Math.sin(angle) * 0.18);
      horn.rotation.z = Math.PI / 2;
      horn.rotation.y = angle;
      group.add(horn);
    }

    const beaconMat = getCachedBasicMaterial(0xef4444);
    const beaconGeo = getCachedCylinderGeometry(0.08, 0.08, 0.18, 12);
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 2.5;
    group.add(beacon);
  } else if (nameStr.includes('pump') || nameStr.includes('مضخة')) {
    // Water / Booster Pressure Pump
    const skidMat = getCachedStandardMaterial(0x1e293b, 0.8, 0.4);
    const skidGeo = getCachedBoxGeometry(1.4, 0.15, 0.9);
    const skid = new THREE.Mesh(skidGeo, skidMat);
    skid.position.y = 0.075;
    group.add(skid);

    const motorMat = getCachedStandardMaterial(0x0284c7, 0.6, 0.3);
    const motorGeo = getCachedCylinderGeometry(0.24, 0.24, 0.65, 12);
    const motor = new THREE.Mesh(motorGeo, motorMat);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(-0.25, 0.38, 0);
    group.add(motor);

    const voluteMat = getCachedStandardMaterial(0x0369a1, 0.5, 0.4);
    const voluteGeo = getCachedCylinderGeometry(0.28, 0.28, 0.25, 12);
    const volute = new THREE.Mesh(voluteGeo, voluteMat);
    volute.rotation.z = Math.PI / 2;
    volute.position.set(0.22, 0.38, 0);
    group.add(volute);

    const pipeMat = getCachedStandardMaterial(0x64748b, 0.7, 0.5);
    const pipeGeo = getCachedCylinderGeometry(0.08, 0.08, 0.4, 10);
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.set(0.22, 0.65, 0);
    group.add(pipe);
  } else if (nameStr.includes('cctv') || nameStr.includes('كاميرا') || nameStr.includes('مراقبة')) {
    // Surveillance Camera Pole Mount
    const poleMat = getCachedStandardMaterial(0x334155, 0.6, 0.5);
    const poleGeo = getCachedCylinderGeometry(0.04, 0.05, 1.6, 8);
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 0.8;
    group.add(pole);

    const camMat = getCachedStandardMaterial(0xffffff, 0.2, 0.1);
    const camGeo = getCachedBoxGeometry(0.12, 0.12, 0.28);
    const cam = new THREE.Mesh(camGeo, camMat);
    cam.position.set(0, 1.55, 0.15);
    cam.rotation.x = Math.PI / 8;
    group.add(cam);

    const lensMat = getCachedBasicMaterial(0x0284c7);
    const lensGeo = getCachedCylinderGeometry(0.04, 0.04, 0.02, 10);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(0, 1.52, 0.3);
    lens.rotation.x = Math.PI / 2 + Math.PI / 8;
    group.add(lens);
  } else {
    // Generic Heavy Equipment Skid
    const eqMat = getCachedStandardMaterial(0x475569, 0.7, 0.4);
    const eqGeo = getCachedBoxGeometry(1.2, 0.75, 0.9);
    const eqBox = new THREE.Mesh(eqGeo, eqMat);
    eqBox.position.y = 0.375;
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
  const poly = getBuildingFootprintPolygon(shapeType, width, depth);
  return createThreeShapeFromPolygon(poly);
}
