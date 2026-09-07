import * as THREE from 'three';
import { CustomSiteElement, CustomSiteElementType } from '../types';
import {
  buildSidewalkConcrete,
  buildSidewalkInterlock,
  buildSidewalkKerbstone,
  buildCoveredWalkway,
  buildAccessibleRamp,
  buildFlagpoleSingle,
  buildFlagpoleTriple,
  buildFlagpoleWall,
  buildSignMonument,
  buildSignWayfinding,
  buildSignSafetyHSE,
  buildSignDigitalLED,
  buildSignAssemblyPoint,
  buildGeneratorDiesel,
  buildFuelTank,
  buildTransformerSubstation,
  buildHvacChiller,
  buildWaterTankRoof,
  buildWaterReservoirGround,
  buildTelecomTower,
  buildSatelliteDish,
  buildCctvPole,
  buildSecurityBarrierJersey,
  buildSecurityBoomGate,
  buildFirePumpStation,
  buildFloodlightTower,
} from './customSiteElements3DExtended';

export interface SiteElementDefinition {
  type: CustomSiteElementType;
  nameAr: string;
  category: 'site' | 'openings' | 'structure' | 'safety' | 'sidewalks' | 'signage_flags' | 'equipment';
  defaultSize: { x: number; y: number; z: number };
  iconName: string;
  description: string;
  defaultMount: 'ground' | 'roof' | 'wall';
}

export const SITE_ELEMENT_DEFINITIONS: SiteElementDefinition[] = [
  // --- أرصفة وممرات ---
  {
    type: 'sidewalk_concrete',
    nameAr: 'رصيف جانبي خرساني قياسي',
    category: 'sidewalks',
    defaultSize: { x: 2.5, y: 0.25, z: 8 },
    iconName: 'Square',
    description: 'رصيف خرساني قياسي مع حافة كربستون وخطوط فواصل تمدد مخصص لحركة المشاة بمحيط المنشأة',
    defaultMount: 'ground',
  },
  {
    type: 'sidewalk_interlock',
    nameAr: 'رصيف مشاة إنترلوك ملون',
    category: 'sidewalks',
    defaultSize: { x: 3.0, y: 0.25, z: 8 },
    iconName: 'Layers',
    description: 'رصيف مشاة متطور مرصوف ببلاط إنترلوك ملون بأنماط متداخلة مع حواف إسمنتية جانبية',
    defaultMount: 'ground',
  },
  {
    type: 'sidewalk_kerbstone',
    nameAr: 'رصيف محيطي بكربستون أصفر وأسود',
    category: 'sidewalks',
    defaultSize: { x: 2.5, y: 0.3, z: 8 },
    iconName: 'Columns',
    description: 'رصيف أمان محيطي بحواف كربستون ملونة بالأصفر والأسود التحذيري لمحيط المباني والشوارع',
    defaultMount: 'ground',
  },
  {
    type: 'walkway_covered',
    nameAr: 'ممر مشاة مظلل للمداخل والممرات',
    category: 'sidewalks',
    defaultSize: { x: 3.2, y: 3.2, z: 9 },
    iconName: 'Shield',
    description: 'ممر مشاة مظلل حديث بهيكل فولاذي وسقف قوسي عازل مع إضاءة مدمجة للمداخل',
    defaultMount: 'ground',
  },
  {
    type: 'ramp_accessible',
    nameAr: 'منحدر وصول لذوي الاحتياجات الخاصة',
    category: 'sidewalks',
    defaultSize: { x: 2.0, y: 0.9, z: 6.0 },
    iconName: 'Move',
    description: 'منحدر وصول هندسي آمن بميول قياسية مع درابزين مزدوج من الستانلس ستيل وخطوط تحذير',
    defaultMount: 'ground',
  },

  // --- سواري الأعلام ---
  {
    type: 'flagpole_single',
    nameAr: 'سارية العلم الوطني بقاعدة رخامية',
    category: 'signage_flags',
    defaultSize: { x: 1.6, y: 10.0, z: 1.6 },
    iconName: 'Flag',
    description: 'سارية علم وطني رسمية شاهقة بارتفاع 10م مع قاعدة رخامية فاخرة وكرة ذهبية وعلم وطني يرفرف',
    defaultMount: 'ground',
  },
  {
    type: 'flagpole_triple',
    nameAr: 'سواري مراسم ثلاثية رسمية',
    category: 'signage_flags',
    defaultSize: { x: 4.5, y: 10.5, z: 1.8 },
    iconName: 'Flag',
    description: 'منصة مراسم رسمية متدرجة تضم ثلاث سواري متوازية للأعلام الوطنية والمؤسسية',
    defaultMount: 'ground',
  },
  {
    type: 'flagpole_wall',
    nameAr: 'سارية علم جدارية مائلة 45°',
    category: 'signage_flags',
    defaultSize: { x: 0.8, y: 3.0, z: 2.2 },
    iconName: 'Flag',
    description: 'سارية علم معدنية أنيقة تثبت على الجدار الخارجي لمداخل المباني والواجهات بزاوية 45 درجة',
    defaultMount: 'wall',
  },

  // --- اللافتات واللوحات الإرشادية ---
  {
    type: 'sign_monument',
    nameAr: 'لافتة مدخل التشكيل والمبنى (غرانيت/برونز)',
    category: 'signage_flags',
    defaultSize: { x: 3.6, y: 2.2, z: 0.9 },
    iconName: 'Building2',
    description: 'لوحة صرحية فاخرة عند مدخل المقر تحمل اسم التشكيل والوزارة مع كشافات أرضية ليلية',
    defaultMount: 'ground',
  },
  {
    type: 'sign_wayfinding',
    nameAr: 'لافتة توجيه اتجاهات ومسارات الموقع',
    category: 'signage_flags',
    defaultSize: { x: 1.4, y: 3.2, z: 0.4 },
    iconName: 'Compass',
    description: 'عمود إرشادي متين بأسهم توجيه متعددة للمباني والورش والمهبط والعيادة ومسارات الطوارئ',
    defaultMount: 'ground',
  },
  {
    type: 'sign_safety_hse',
    nameAr: 'لوحة إرشادات السلامة المهنية HSE',
    category: 'signage_flags',
    defaultSize: { x: 2.4, y: 2.6, z: 0.3 },
    iconName: 'ShieldAlert',
    description: 'لوحة تحذيرية صفراء بمواصفات السلامة والصحة المهنية ومعدات الوقاية الإلزامية PPE',
    defaultMount: 'ground',
  },
  {
    type: 'sign_digital_led',
    nameAr: 'شاشة إلكترونية رقمية LED للموقع',
    category: 'signage_flags',
    defaultSize: { x: 3.8, y: 3.6, z: 0.6 },
    iconName: 'Sliders',
    description: 'شاشة معلومات إلكترونية LED ذكية لعرض التنبيهات والأخبار وإحصائيات السلامة اليومية',
    defaultMount: 'ground',
  },
  {
    type: 'sign_assembly_point',
    nameAr: 'لافتة نقطة التجمع في حالات الطوارئ',
    category: 'signage_flags',
    defaultSize: { x: 1.0, y: 3.0, z: 0.2 },
    iconName: 'CheckCircle2',
    description: 'شاخصة خضراء قياسية معتمدة عالمياً لتحديد نقاط تجمع الإخلاء في الحالات الطارئة',
    defaultMount: 'ground',
  },

  // --- المعدات والمنظومات التشغيلية الميدانية ---
  {
    type: 'generator_diesel',
    nameAr: 'مولد كهربائي ديزل كاتم للصوت',
    category: 'equipment',
    defaultSize: { x: 3.4, y: 2.2, z: 1.8 },
    iconName: 'Zap',
    description: 'مولد طاقة كهربائية ديزل ثقيل بغرفة عازلة للصوت وعادم silencer وشاشة تحكم رقمية',
    defaultMount: 'ground',
  },
  {
    type: 'fuel_tank',
    nameAr: 'خزان وقود ديزل أرضي مع مضخة',
    category: 'equipment',
    defaultSize: { x: 4.2, y: 2.4, z: 2.0 },
    iconName: 'Database',
    description: 'خزان وقود أسطواني فولاذي بسعة 5000 لتر مع قواعد خرسانية ومحبس تفريغ ومقياس منسوب',
    defaultMount: 'ground',
  },
  {
    type: 'transformer_substation',
    nameAr: 'محولة كهرباء ضغط عالي مع سياج حماية',
    category: 'equipment',
    defaultSize: { x: 3.6, y: 2.8, z: 3.0 },
    iconName: 'Zap',
    description: 'محطة تحويل كهربائي مع زعانف تبريد وعوازل خزفية وسياج شبكي أمني لمنع الاقتراب',
    defaultMount: 'ground',
  },
  {
    type: 'hvac_chiller',
    nameAr: 'منظومة تكييف مركزي / تشيلر سطحي',
    category: 'equipment',
    defaultSize: { x: 3.8, y: 2.0, z: 2.4 },
    iconName: 'Wind',
    description: 'وحدة تبريد وتكييف مركزي صناعية مزودة بمراوح تبريد علوية وقنوات تهوية وتوزيع',
    defaultMount: 'roof',
  },
  {
    type: 'water_tank_roof',
    nameAr: 'خزان مياه علوي سطحي أسطواني',
    category: 'equipment',
    defaultSize: { x: 2.4, y: 2.8, z: 2.4 },
    iconName: 'Droplet',
    description: 'خزان مياه ستانلس ستيل معزول على قواعد حديدية مع سلم صيانة وأنبوب تفريغ',
    defaultMount: 'roof',
  },
  {
    type: 'water_reservoir_ground',
    nameAr: 'خزان مياه أرضي خرساني للطوارئ',
    category: 'equipment',
    defaultSize: { x: 5.0, y: 1.8, z: 5.0 },
    iconName: 'Database',
    description: 'خزان خرساني أرضي لمياه الإطفاء والتغذية مع فتحة معاينة وتجهيزات سحب وتوصيل',
    defaultMount: 'ground',
  },
  {
    type: 'telecom_tower',
    nameAr: 'برج اتصالات وهوائي لاسلكي شبكي',
    category: 'equipment',
    defaultSize: { x: 2.2, y: 14.0, z: 2.2 },
    iconName: 'Radio',
    description: 'برج اتصالات لاسلكي فولاذي شبكي بارتفاع 14م مع طبق ميكروويف وهوائيات وإضاءة تحذير طيران',
    defaultMount: 'ground',
  },
  {
    type: 'satellite_dish',
    nameAr: 'طبق وهوائي اتصالات أقمار صناعية VSAT',
    category: 'equipment',
    defaultSize: { x: 2.4, y: 2.8, z: 2.0 },
    iconName: 'Radio',
    description: 'طبق استقبال واتصال بالأقمار الصناعية عالي الدقة مع قاعدة توجيه كهروميكانيكية',
    defaultMount: 'roof',
  },
  {
    type: 'cctv_pole',
    nameAr: 'عمود مراقبة أمني بكاميرات PTZ 360°',
    category: 'equipment',
    defaultSize: { x: 1.2, y: 6.2, z: 1.2 },
    iconName: 'Camera',
    description: 'عمود كاميرات مراقبة أمنية متكامل مع كابينة تغذية وكاميراتين ذكيتين 4K ورؤية ليلية',
    defaultMount: 'ground',
  },
  {
    type: 'security_barrier_jersey',
    nameAr: 'حواجز خرسانية أمنية (نيوجيرسي)',
    category: 'safety',
    defaultSize: { x: 1.2, y: 1.1, z: 6.0 },
    iconName: 'Shield',
    description: 'صف حواجز نيوجيرسي خرسانية مسلحة للحماية الأمنية ومصدات صدمات مع عاكسات',
    defaultMount: 'ground',
  },
  {
    type: 'security_boom_gate',
    nameAr: 'بوابة أمنية بذراع هيدروليكي إلكتروني',
    category: 'safety',
    defaultSize: { x: 1.2, y: 1.4, z: 4.6 },
    iconName: 'Lock',
    description: 'بوابة تحكم مروري بذراع إلكتروني مخطط بالأبيض والأحمر وحساسات سيارات',
    defaultMount: 'ground',
  },
  {
    type: 'fire_pump_station',
    nameAr: 'محطة مضخات مكافحة الحريق وصمام مائي',
    category: 'equipment',
    defaultSize: { x: 2.8, y: 1.8, z: 2.2 },
    iconName: 'Flame',
    description: 'مضخة إطفاء حريق ديزل مع أنابيب ضغط حمراء ومقاييس ضغط وصنبور مائي خارجي',
    defaultMount: 'ground',
  },
  {
    type: 'floodlight_tower',
    nameAr: 'عمود كشافات إنارة ليلية غامرة للموقع',
    category: 'equipment',
    defaultSize: { x: 1.6, y: 9.0, z: 1.6 },
    iconName: 'Lightbulb',
    description: 'برج كشافات LED غامرة بقدرة عالية لإضاءة الساحات والمخازن ومواقف السيارات ليلاً',
    defaultMount: 'ground',
  },

  // --- عناصر الموقع والساحات القائمة ---
  {
    type: 'helipad',
    nameAr: 'مهبط مروحيات (سطح / أرضي)',
    category: 'site',
    defaultSize: { x: 8, y: 0.6, z: 8 },
    iconName: 'Plane',
    description: 'مهبط طائرات عامودية مجهز بعلامات الهبوط H ومصابيح الملاحة الليلية',
    defaultMount: 'ground',
  },
  {
    type: 'fountain',
    nameAr: 'نافورة مائية تفاعلية',
    category: 'site',
    defaultSize: { x: 5, y: 1.8, z: 5 },
    iconName: 'Waves',
    description: 'حوض حجري دائري ببركة مائية ونوافير نفاثة وإضاءة مائية',
    defaultMount: 'ground',
  },
  {
    type: 'street',
    nameAr: 'شارع وطريق أسفلتي',
    category: 'site',
    defaultSize: { x: 6, y: 0.15, z: 18 },
    iconName: 'Compass',
    description: 'طريق مروري أسفلتي بخطوط وسطية متقطعة وأرصفة جانبية خرسانية',
    defaultMount: 'ground',
  },
  {
    type: 'parking_open',
    nameAr: 'كراج سيارات مكشوف',
    category: 'site',
    defaultSize: { x: 8, y: 1.4, z: 10 },
    iconName: 'Car',
    description: 'مواقف سيارات خارجية مخططة بمصدات خرسانية وسيارات متوقفة',
    defaultMount: 'ground',
  },
  {
    type: 'parking_covered',
    nameAr: 'كراج مسقوف بمظلات',
    category: 'site',
    defaultSize: { x: 8, y: 3.2, z: 8 },
    iconName: 'Shield',
    description: 'مظلات هيكلية فولاذية حديثة لوقاية المركبات من أشعة الشمس',
    defaultMount: 'ground',
  },
  {
    type: 'garden',
    nameAr: 'حديقة خارجية ومساحات خضراء',
    category: 'site',
    defaultSize: { x: 8, y: 2.5, z: 8 },
    iconName: 'Flower2',
    description: 'مسطحات عشبية طبيعية بممرات حجرية، أشجار زينة ومقعد خشبي',
    defaultMount: 'ground',
  },
  {
    type: 'door_glass',
    nameAr: 'باب مدخل زجاجي حديث',
    category: 'openings',
    defaultSize: { x: 2.2, y: 2.6, z: 0.3 },
    iconName: 'DoorOpen',
    description: 'باب زجاجي مزدوج بإطار ستانلس ستيل ومقابض طولية عصرية',
    defaultMount: 'wall',
  },
  {
    type: 'door_wood',
    nameAr: 'باب خشبي كلاسيكي',
    category: 'openings',
    defaultSize: { x: 1.4, y: 2.4, z: 0.3 },
    iconName: 'DoorClosed',
    description: 'باب خشب البلوط بنقوش هندسية فخمة ومقبض نحاسي',
    defaultMount: 'wall',
  },
  {
    type: 'door_metal',
    nameAr: 'باب حديدي مصفح صناعي',
    category: 'openings',
    defaultSize: { x: 1.3, y: 2.3, z: 0.3 },
    iconName: 'Lock',
    description: 'باب حديد صلب مزود بدعامات أمان وشفرات تهوية صناعية',
    defaultMount: 'wall',
  },
  {
    type: 'window',
    nameAr: 'نافذة معمارية بإطار زجاجي',
    category: 'openings',
    defaultSize: { x: 1.8, y: 1.6, z: 0.25 },
    iconName: 'Square',
    description: 'نافذة بواجهات زجاجية عاكسة وأطر ألمنيوم مع حافة سفلية بارزة',
    defaultMount: 'wall',
  },
  {
    type: 'light_pole',
    nameAr: 'عمود إنارة خارجية حديث',
    category: 'site',
    defaultSize: { x: 0.8, y: 5.2, z: 0.8 },
    iconName: 'Lightbulb',
    description: 'عمود إنارة معدني برأس LED كشاف ينير الساحات والشوارع ليلاً',
    defaultMount: 'ground',
  },
  {
    type: 'concrete_column',
    nameAr: 'عمود كونكريتي معماري',
    category: 'structure',
    defaultSize: { x: 0.9, y: 4.5, z: 0.9 },
    iconName: 'Columns',
    description: 'عمود خرساني مسلح للمداخل والواجهات مع قاعدة وتاج معماري',
    defaultMount: 'ground',
  },
  {
    type: 'fire_escape',
    nameAr: 'منافذ وأدراج الطوارئ الخارجية',
    category: 'safety',
    defaultSize: { x: 3.2, y: 6.5, z: 2.8 },
    iconName: 'Flame',
    description: 'سلم طوارئ معدني صناعي متعدد الطوابق مع درابزين ومنصات خروج',
    defaultMount: 'wall',
  },
  {
    type: 'solar_panel',
    nameAr: 'منظومة ألواح شمسية كهروضوئية',
    category: 'structure',
    defaultSize: { x: 5.0, y: 1.4, z: 3.6 },
    iconName: 'SunMedium',
    description: 'مصفوفة ألواح طاقة شمسية مائلة بإطارات ألمنيوم وخلايا سيليكونية ومحول طاقة عاكس للسطح أو الأرض',
    defaultMount: 'roof',
  },
];

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

/**
 * Builds a high-fidelity 3D mesh for the requested custom element
 */
export function buildCustomSiteElementMesh(
  element: CustomSiteElement,
  isNightMode: boolean,
  isNightLightsOn: boolean
): THREE.Group {
  const root = new THREE.Group();
  root.name = `CustomElement_${element.id}`;
  root.userData = {
    isCustomElement: true,
    elementId: element.id,
    elementType: element.type,
    elementData: element,
  };

  const sx = element.scale?.x ?? 1;
  const sy = element.scale?.y ?? 1;
  const sz = element.scale?.z ?? 1;

  switch (element.type) {
    case 'helipad':
      buildHelipad(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;

    case 'fountain':
      buildFountain(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;

    case 'street':
      buildStreet(root, sx, sy, sz);
      break;

    case 'parking_open':
      buildOpenParking(root, sx, sy, sz);
      break;

    case 'parking_covered':
      buildCoveredParking(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;

    case 'garden':
      buildGarden(root, sx, sy, sz);
      break;

    case 'door_glass':
      buildGlassDoor(root, sx, sy, sz);
      break;

    case 'door_wood':
      buildWoodDoor(root, sx, sy, sz);
      break;

    case 'door_metal':
      buildMetalDoor(root, sx, sy, sz);
      break;

    case 'window':
      buildWindow(root, sx, sy, sz);
      break;

    case 'light_pole':
      buildLightPole(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;

    case 'concrete_column':
      buildConcreteColumn(root, sx, sy, sz);
      break;

    case 'fire_escape':
      buildFireEscape(root, sx, sy, sz);
      break;

    case 'solar_panel':
      buildSolarPanels(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;

    // --- الأرصفة والممرات ---
    case 'sidewalk_concrete':
      buildSidewalkConcrete(root, sx, sy, sz);
      break;
    case 'sidewalk_interlock':
      buildSidewalkInterlock(root, sx, sy, sz);
      break;
    case 'sidewalk_kerbstone':
      buildSidewalkKerbstone(root, sx, sy, sz);
      break;
    case 'walkway_covered':
      buildCoveredWalkway(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'ramp_accessible':
      buildAccessibleRamp(root, sx, sy, sz);
      break;

    // --- سواري الأعلام ---
    case 'flagpole_single':
      buildFlagpoleSingle(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'flagpole_triple':
      buildFlagpoleTriple(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'flagpole_wall':
      buildFlagpoleWall(root, sx, sy, sz);
      break;

    // --- اللافتات واللوحات ---
    case 'sign_monument':
      buildSignMonument(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'sign_wayfinding':
      buildSignWayfinding(root, sx, sy, sz);
      break;
    case 'sign_safety_hse':
      buildSignSafetyHSE(root, sx, sy, sz);
      break;
    case 'sign_digital_led':
      buildSignDigitalLED(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'sign_assembly_point':
      buildSignAssemblyPoint(root, sx, sy, sz);
      break;

    // --- المعدات والمنظومات ---
    case 'generator_diesel':
      buildGeneratorDiesel(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'fuel_tank':
      buildFuelTank(root, sx, sy, sz);
      break;
    case 'transformer_substation':
      buildTransformerSubstation(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'hvac_chiller':
      buildHvacChiller(root, sx, sy, sz);
      break;
    case 'water_tank_roof':
      buildWaterTankRoof(root, sx, sy, sz);
      break;
    case 'water_reservoir_ground':
      buildWaterReservoirGround(root, sx, sy, sz);
      break;
    case 'telecom_tower':
      buildTelecomTower(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'satellite_dish':
      buildSatelliteDish(root, sx, sy, sz);
      break;
    case 'cctv_pole':
      buildCctvPole(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'security_barrier_jersey':
      buildSecurityBarrierJersey(root, sx, sy, sz);
      break;
    case 'security_boom_gate':
      buildSecurityBoomGate(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;
    case 'fire_pump_station':
      buildFirePumpStation(root, sx, sy, sz);
      break;
    case 'floodlight_tower':
      buildFloodlightTower(root, sx, sy, sz, isNightMode, isNightLightsOn);
      break;

    default:
      // Fallback simple geometric cube
      const fallbackGeo = new THREE.BoxGeometry(sx, sy, sz);
      const fallbackMat = createMat(0x64748b, 0.2, 0.6);
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      fallbackMesh.position.y = sy / 2;
      root.add(fallbackMesh);
      break;
  }

  // Apply position & rotation
  root.position.set(element.position.x, element.position.y, element.position.z);
  root.rotation.y = ((element.rotationY || 0) * Math.PI) / 180;

  return root;
}

// 1. HELIPAD (مهبط مروحيات)
function buildHelipad(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  isNight: boolean,
  nightLights: boolean
) {
  const radius = Math.min(w, d) / 2;

  // Base platform slab (Concrete)
  const slabGeo = new THREE.CylinderGeometry(radius, radius * 1.02, 0.35 * h, 32);
  const slabMat = createMat(0x334155, 0.1, 0.8);
  const slab = new THREE.Mesh(slabGeo, slabMat);
  slab.position.y = (0.35 * h) / 2;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  // Outer safety yellow ring
  const ringGeo = new THREE.RingGeometry(radius * 0.85, radius * 0.95, 32);
  const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, yellowMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.35 * h + 0.01;
  group.add(ring);

  // Inner white circle
  const innerRingGeo = new THREE.RingGeometry(radius * 0.55, radius * 0.6, 32);
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const innerRing = new THREE.Mesh(innerRingGeo, whiteMat);
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.35 * h + 0.012;
  group.add(innerRing);

  // Large Bold "H" Mark
  const hBarThickness = radius * 0.15;
  const hBarLength = radius * 0.7;
  const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  // Left vertical leg
  const leg1Geo = new THREE.PlaneGeometry(hBarThickness, hBarLength);
  const leg1 = new THREE.Mesh(leg1Geo, hMat);
  leg1.rotation.x = -Math.PI / 2;
  leg1.position.set(-radius * 0.25, 0.35 * h + 0.015, 0);
  group.add(leg1);

  // Right vertical leg
  const leg2Geo = new THREE.PlaneGeometry(hBarThickness, hBarLength);
  const leg2 = new THREE.Mesh(leg2Geo, hMat);
  leg2.rotation.x = -Math.PI / 2;
  leg2.position.set(radius * 0.25, 0.35 * h + 0.015, 0);
  group.add(leg2);

  // Cross horizontal bar
  const crossGeo = new THREE.PlaneGeometry(radius * 0.4, hBarThickness);
  const cross = new THREE.Mesh(crossGeo, hMat);
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(0, 0.35 * h + 0.016, 0);
  group.add(cross);

  // Boundary Navigation Lights around perimeter
  const numLights = 12;
  const lightColor = isNight && nightLights ? 0x22c55e : 0x15803d;
  const lightMat = new THREE.MeshStandardMaterial({
    color: lightColor,
    emissive: isNight && nightLights ? 0x22c55e : 0x000000,
    emissiveIntensity: isNight && nightLights ? 2.5 : 0,
  });

  for (let i = 0; i < numLights; i++) {
    const angle = (i / numLights) * Math.PI * 2;
    const lx = Math.cos(angle) * (radius * 0.96);
    const lz = Math.sin(angle) * (radius * 0.96);

    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8);
    const postMat = createMat(0x1e293b, 0.8, 0.2);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(lx, 0.35 * h + 0.09, lz);
    group.add(post);

    const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const bulb = new THREE.Mesh(bulbGeo, lightMat);
    bulb.position.set(lx, 0.35 * h + 0.2, lz);
    group.add(bulb);
  }
}

// 2. WATER FOUNTAIN (نافورة مائية)
function buildFountain(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  isNight: boolean,
  nightLights: boolean
) {
  const radius = Math.min(w, d) / 2;

  // Outer stone basin ring
  const basinOuter = new THREE.CylinderGeometry(radius, radius * 1.05, 0.45 * h, 32);
  const stoneMat = createMat(0xd1d5db, 0.05, 0.7);
  const basin = new THREE.Mesh(basinOuter, stoneMat);
  basin.position.y = (0.45 * h) / 2;
  basin.castShadow = true;
  basin.receiveShadow = true;
  group.add(basin);

  // Basin coping rim
  const rimGeo = new THREE.TorusGeometry(radius, 0.12 * h, 12, 32);
  const rim = new THREE.Mesh(rimGeo, stoneMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.45 * h;
  group.add(rim);

  // Water pool surface
  const waterGeo = new THREE.CircleGeometry(radius * 0.95, 32);
  const waterColor = isNight ? 0x06b6d4 : 0x38bdf8;
  const waterMat = new THREE.MeshStandardMaterial({
    color: waterColor,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.38 * h;
  group.add(water);

  // Central column pedestal
  const pedGeo = new THREE.CylinderGeometry(radius * 0.22, radius * 0.3, 0.9 * h, 16);
  const ped = new THREE.Mesh(pedGeo, stoneMat);
  ped.position.y = (0.9 * h) / 2;
  ped.castShadow = true;
  group.add(ped);

  // Upper bowl tier
  const upperBowlGeo = new THREE.CylinderGeometry(radius * 0.45, radius * 0.15, 0.25 * h, 24);
  const upperBowl = new THREE.Mesh(upperBowlGeo, stoneMat);
  upperBowl.position.y = 0.9 * h;
  group.add(upperBowl);

  // Water Jet Spout / Spray Dome
  const jetGeo = new THREE.ConeGeometry(radius * 0.2, 0.8 * h, 16);
  const jetMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
  });
  const jet = new THREE.Mesh(jetGeo, jetMat);
  jet.position.y = 0.9 * h + (0.8 * h) / 2;
  group.add(jet);

  // Underwater light (Night mode illumination)
  if (isNight && nightLights) {
    const underLight = new THREE.PointLight(0x06b6d4, 2.5, 8);
    underLight.position.set(0, 0.5 * h, 0);
    group.add(underLight);
  }
}

// 3. STREET / ROAD (شارع أسفلتي)
function buildStreet(group: THREE.Group, w: number, h: number, d: number) {
  const roadW = Math.max(3, w);
  const roadL = Math.max(6, d);

  // Asphalt Base Slab
  const roadGeo = new THREE.BoxGeometry(roadW, 0.12 * h, roadL);
  const asphaltMat = createMat(0x1e293b, 0.1, 0.85);
  const road = new THREE.Mesh(roadGeo, asphaltMat);
  road.position.y = (0.12 * h) / 2;
  road.receiveShadow = true;
  group.add(road);

  // Left Concrete Curb
  const curbGeo = new THREE.BoxGeometry(0.3, 0.18 * h, roadL);
  const curbMat = createMat(0x94a3b8, 0.05, 0.8);
  const curbL = new THREE.Mesh(curbGeo, curbMat);
  curbL.position.set(-roadW / 2 - 0.15, (0.18 * h) / 2, 0);
  curbL.castShadow = true;
  group.add(curbL);

  // Right Concrete Curb
  const curbR = new THREE.Mesh(curbGeo, curbMat);
  curbR.position.set(roadW / 2 + 0.15, (0.18 * h) / 2, 0);
  curbR.castShadow = true;
  group.add(curbR);

  // Continuous White Edge Lines
  const lineGeo = new THREE.PlaneGeometry(0.12, roadL * 0.98);
  const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  const edgeL = new THREE.Mesh(lineGeo, whiteLineMat);
  edgeL.rotation.x = -Math.PI / 2;
  edgeL.position.set(-roadW / 2 + 0.35, 0.12 * h + 0.01, 0);
  group.add(edgeL);

  const edgeR = new THREE.Mesh(lineGeo, whiteLineMat);
  edgeR.rotation.x = -Math.PI / 2;
  edgeR.position.set(roadW / 2 - 0.35, 0.12 * h + 0.01, 0);
  group.add(edgeR);

  // Yellow Dashed Center Line
  const dashLength = 1.6;
  const gapLength = 1.2;
  const numDashes = Math.floor(roadL / (dashLength + gapLength));
  const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });

  for (let i = 0; i < numDashes; i++) {
    const dz = -roadL / 2 + (i + 0.5) * (dashLength + gapLength);
    const dashGeo = new THREE.PlaneGeometry(0.15, dashLength);
    const dash = new THREE.Mesh(dashGeo, yellowLineMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.12 * h + 0.012, dz);
    group.add(dash);
  }

  // Pedestrian Zebra Crossing on one side
  const zebraWidth = 0.5;
  const zebraGap = 0.35;
  const numStripes = Math.floor((roadW - 1.2) / (zebraWidth + zebraGap));
  for (let s = 0; s < numStripes; s++) {
    const sx = -((numStripes - 1) * (zebraWidth + zebraGap)) / 2 + s * (zebraWidth + zebraGap);
    const stripeGeo = new THREE.PlaneGeometry(zebraWidth, 2.0);
    const stripe = new THREE.Mesh(stripeGeo, whiteLineMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(sx, 0.12 * h + 0.013, roadL / 2 - 1.5);
    group.add(stripe);
  }
}

// 4. OPEN PARKING (كراج سيارات مكشوف)
function buildOpenParking(group: THREE.Group, w: number, h: number, d: number) {
  const lotW = Math.max(6, w);
  const lotD = Math.max(6, d);

  // Asphalt surface
  const asphaltGeo = new THREE.BoxGeometry(lotW, 0.15, lotD);
  const asphaltMat = createMat(0x334155, 0.1, 0.85);
  const lot = new THREE.Mesh(asphaltGeo, asphaltMat);
  lot.position.y = 0.075;
  lot.receiveShadow = true;
  group.add(lot);

  // White Stall Lines for 4 parking bays
  const baysCount = 4;
  const bayW = lotW / baysCount;
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

  for (let i = 0; i <= baysCount; i++) {
    const bx = -lotW / 2 + i * bayW;
    const lineGeo = new THREE.PlaneGeometry(0.12, lotD * 0.85);
    const line = new THREE.Mesh(lineGeo, whiteMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(bx, 0.16, 0);
    group.add(line);

    // Concrete Wheel Stop in each stall
    if (i < baysCount) {
      const stopGeo = new THREE.BoxGeometry(bayW * 0.65, 0.15, 0.25);
      const stopMat = createMat(0x94a3b8, 0.1, 0.7);
      const stop = new THREE.Mesh(stopGeo, stopMat);
      stop.position.set(bx + bayW / 2, 0.22, -lotD * 0.35);
      stop.castShadow = true;
      group.add(stop);
    }
  }

  // Add 2 Realistic stylized parked vehicles
  buildParkedCar(group, -bayW * 1.0, 0.15, 0, 0x0284c7, 1.0);
  buildParkedCar(group, bayW * 0.5, 0.15, 0, 0xd97706, 1.0);
}

// 5. COVERED PARKING (كراج مسقوف بمظلات)
function buildCoveredParking(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  isNight: boolean,
  nightLights: boolean
) {
  const lotW = Math.max(6, w);
  const lotD = Math.max(6, d);
  const canopyH = Math.max(2.8, h);

  // Ground base
  const groundGeo = new THREE.BoxGeometry(lotW, 0.15, lotD);
  const groundMat = createMat(0x334155, 0.1, 0.8);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = 0.075;
  ground.receiveShadow = true;
  group.add(ground);

  // Steel Support Columns (4 posts)
  const steelMat = createMat(0x475569, 0.8, 0.3);
  const postGeo = new THREE.BoxGeometry(0.2, canopyH, 0.2);

  const postPositions = [
    [-lotW / 2 + 0.4, canopyH / 2, -lotD / 2 + 0.4],
    [lotW / 2 - 0.4, canopyH / 2, -lotD / 2 + 0.4],
    [-lotW / 2 + 0.4, canopyH / 2, lotD / 2 - 0.4],
    [lotW / 2 - 0.4, canopyH / 2, lotD / 2 - 0.4],
  ];

  postPositions.forEach(([px, py, pz]) => {
    const post = new THREE.Mesh(postGeo, steelMat);
    post.position.set(px, py, pz);
    post.castShadow = true;
    group.add(post);
  });

  // Canopy Roof Structure (Curved or corrugated architectural shade)
  const canopyGeo = new THREE.BoxGeometry(lotW + 0.4, 0.15, lotD + 0.4);
  const canopyMat = createMat(0x0284c7, 0.4, 0.4);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.position.set(0, canopyH, 0);
  canopy.rotation.x = 0.05; // Slight drainage tilt
  canopy.castShadow = true;
  group.add(canopy);

  // Under-canopy strip light
  if (isNight && nightLights) {
    const tubeLight = new THREE.PointLight(0xffedd5, 2.2, 10);
    tubeLight.position.set(0, canopyH - 0.3, 0);
    group.add(tubeLight);
  }

  // Parked Vehicles under canopy
  buildParkedCar(group, -lotW * 0.22, 0.15, 0, 0xe2e8f0, 0.95);
  buildParkedCar(group, lotW * 0.22, 0.15, 0, 0x475569, 0.95);
}

// Helper: Stylized 3D Car
function buildParkedCar(parent: THREE.Group, x: number, y: number, z: number, color: number, scale = 1.0) {
  const car = new THREE.Group();
  car.scale.set(scale, scale, scale);
  car.position.set(x, y, z);

  // Body lower chassis
  const bodyGeo = new THREE.BoxGeometry(1.7, 0.55, 3.8);
  const bodyMat = createMat(color, 0.6, 0.3);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.4;
  body.castShadow = true;
  car.add(body);

  // Cabin / Glass roof
  const cabinGeo = new THREE.BoxGeometry(1.4, 0.5, 2.0);
  const glassMat = createMat(0x0f172a, 0.8, 0.1, true, 0.6);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 0.85, -0.2);
  cabin.castShadow = true;
  car.add(cabin);

  // 4 Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMat = createMat(0x0f172a, 0.2, 0.8);
  const wheelPositions = [
    [-0.85, 0.3, -1.2],
    [0.85, 0.3, -1.2],
    [-0.85, 0.3, 1.2],
    [0.85, 0.3, 1.2],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    car.add(wheel);
  });

  // Headlights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const head1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), headMat);
  head1.position.set(-0.6, 0.45, 1.91);
  car.add(head1);
  const head2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), headMat);
  head2.position.set(0.6, 0.45, 1.91);
  car.add(head2);

  parent.add(car);
}

// 6. EXTERIOR GARDEN (حديقة خارجية)
function buildGarden(group: THREE.Group, w: number, h: number, d: number) {
  const gw = Math.max(5, w);
  const gd = Math.max(5, d);

  // Lush Green Turf Lawn
  const grassGeo = new THREE.BoxGeometry(gw, 0.15, gd);
  const grassMat = createMat(0x15803d, 0.05, 0.85);
  const lawn = new THREE.Mesh(grassGeo, grassMat);
  lawn.position.y = 0.075;
  lawn.receiveShadow = true;
  group.add(lawn);

  // Curved Stone Stepping Path
  const stoneMat = createMat(0xd1d5db, 0.05, 0.6);
  const stepsCount = 7;
  for (let i = 0; i < stepsCount; i++) {
    const t = i / (stepsCount - 1);
    const px = Math.sin(t * Math.PI) * (gw * 0.25) - gw * 0.1;
    const pz = -gd / 2 + 0.6 + t * (gd - 1.2);

    const stepGeo = new THREE.CylinderGeometry(0.45, 0.48, 0.08, 12);
    const step = new THREE.Mesh(stepGeo, stoneMat);
    step.position.set(px, 0.16, pz);
    step.receiveShadow = true;
    group.add(step);
  }

  // 2 Miniature Pine / Cypress Trees
  const tree1 = createOrnamentalTree();
  tree1.position.set(-gw / 2 + 1.2, 0.15, -gd / 2 + 1.2);
  group.add(tree1);

  const tree2 = createOrnamentalTree();
  tree2.position.set(gw / 2 - 1.2, 0.15, gd / 2 - 1.2);
  group.add(tree2);

  // Decorative flowering shrubs / flowerbeds
  const shrubGeo = new THREE.DodecahedronGeometry(0.4);
  const flowerMat1 = createMat(0xf43f5e, 0.1, 0.7); // Rose
  const flowerMat2 = createMat(0xeab308, 0.1, 0.7); // Yellow

  const shrubPositions = [
    [-gw * 0.35, 0.35, gd * 0.25, flowerMat1],
    [-gw * 0.25, 0.3, gd * 0.35, flowerMat2],
    [gw * 0.35, 0.35, -gd * 0.25, flowerMat2],
    [gw * 0.25, 0.3, -gd * 0.35, flowerMat1],
  ];

  shrubPositions.forEach(([sx, sy, sz, mat]) => {
    const shrub = new THREE.Mesh(shrubGeo, mat as any);
    shrub.position.set(sx as number, sy as number, sz as number);
    shrub.castShadow = true;
    group.add(shrub);
  });

  // Garden Park Bench
  const bench = new THREE.Group();
  const woodMat = createMat(0x78350f, 0.1, 0.7);
  const ironMat = createMat(0x1e293b, 0.7, 0.4);

  const seatGeo = new THREE.BoxGeometry(1.4, 0.08, 0.5);
  const seat = new THREE.Mesh(seatGeo, woodMat);
  seat.position.y = 0.45;
  bench.add(seat);

  const backGeo = new THREE.BoxGeometry(1.4, 0.4, 0.08);
  const back = new THREE.Mesh(backGeo, woodMat);
  back.position.set(0, 0.7, -0.22);
  bench.add(back);

  const legGeo = new THREE.BoxGeometry(0.08, 0.45, 0.48);
  const legL = new THREE.Mesh(legGeo, ironMat);
  legL.position.set(-0.6, 0.22, 0);
  bench.add(legL);
  const legR = new THREE.Mesh(legGeo, ironMat);
  legR.position.set(0.6, 0.22, 0);
  bench.add(legR);

  bench.position.set(gw * 0.25, 0.15, 0);
  bench.rotation.y = -Math.PI / 4;
  group.add(bench);
}

function createOrnamentalTree(): THREE.Group {
  const tree = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8);
  const trunkMat = createMat(0x451a03, 0.1, 0.9);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.6;
  trunk.castShadow = true;
  tree.add(trunk);

  const foliageGeo = new THREE.ConeGeometry(0.9, 2.2, 8);
  const foliageMat = createMat(0x166534, 0.05, 0.8);
  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.y = 1.9;
  foliage.castShadow = true;
  tree.add(foliage);

  return tree;
}

// 7. GLASS DOOR (باب زجاجي)
function buildGlassDoor(group: THREE.Group, w: number, h: number, d: number) {
  const doorW = Math.max(1.8, w);
  const doorH = Math.max(2.2, h);

  // Outer Stainless Frame
  const frameGeo = new THREE.BoxGeometry(doorW, doorH, 0.12);
  const frameMat = createMat(0x0f172a, 0.8, 0.2);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = doorH / 2;
  group.add(frame);

  // Double Glass Panels
  const glassGeo = new THREE.BoxGeometry((doorW - 0.25) / 2, doorH - 0.3, 0.04);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transmission: 0.8,
    opacity: 0.45,
    transparent: true,
    roughness: 0.1,
    metalness: 0.1,
  });

  const glassL = new THREE.Mesh(glassGeo, glassMat);
  glassL.position.set(-(doorW - 0.25) / 4 - 0.03, doorH / 2, 0);
  group.add(glassL);

  const glassR = new THREE.Mesh(glassGeo, glassMat);
  glassR.position.set((doorW - 0.25) / 4 + 0.03, doorH / 2, 0);
  group.add(glassR);

  // Vertical Stainless Steel Handles
  const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.1, 8);
  const handleMat = createMat(0xf8fafc, 0.9, 0.1);

  const handleL = new THREE.Mesh(handleGeo, handleMat);
  handleL.position.set(-0.12, doorH / 2, 0.06);
  group.add(handleL);

  const handleR = new THREE.Mesh(handleGeo, handleMat);
  handleR.position.set(0.12, doorH / 2, 0.06);
  group.add(handleR);
}

// 8. WOODEN DOOR (باب خشبي)
function buildWoodDoor(group: THREE.Group, w: number, h: number, d: number) {
  const doorW = Math.max(1.2, w);
  const doorH = Math.max(2.2, h);

  // Wood Architrave Frame
  const frameGeo = new THREE.BoxGeometry(doorW, doorH, 0.15);
  const frameMat = createMat(0x451a03, 0.2, 0.6);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = doorH / 2;
  group.add(frame);

  // Door Leaf with timber panels
  const leafGeo = new THREE.BoxGeometry(doorW - 0.15, doorH - 0.15, 0.08);
  const leafMat = createMat(0x78350f, 0.15, 0.5);
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0, doorH / 2, 0.02);
  leaf.castShadow = true;
  group.add(leaf);

  // Decorative Raised Panels
  const panelGeo = new THREE.BoxGeometry((doorW - 0.35) / 2, (doorH - 0.6) / 3, 0.03);
  const panelMat = createMat(0x92400e, 0.2, 0.4);

  for (let r = 0; r < 3; r++) {
    const py = 0.4 + r * ((doorH - 0.6) / 3 + 0.1);
    const pL = new THREE.Mesh(panelGeo, panelMat);
    pL.position.set(-(doorW - 0.35) / 4, py, 0.05);
    group.add(pL);

    const pR = new THREE.Mesh(panelGeo, panelMat);
    pR.position.set((doorW - 0.35) / 4, py, 0.05);
    group.add(pR);
  }

  // Brass Handle & Escutcheon
  const brassMat = createMat(0xf59e0b, 0.8, 0.2);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.08), brassMat);
  handle.position.set(doorW / 2 - 0.25, 1.05, 0.08);
  group.add(handle);
}

// 9. METAL INDUSTRIAL DOOR (باب حديدي أمني)
function buildMetalDoor(group: THREE.Group, w: number, h: number, d: number) {
  const doorW = Math.max(1.2, w);
  const doorH = Math.max(2.2, h);

  // Heavy steel frame
  const frameGeo = new THREE.BoxGeometry(doorW, doorH, 0.18);
  const frameMat = createMat(0x1e293b, 0.8, 0.3);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = doorH / 2;
  group.add(frame);

  // Steel leaf plate
  const leafGeo = new THREE.BoxGeometry(doorW - 0.12, doorH - 0.12, 0.08);
  const leafMat = createMat(0x475569, 0.7, 0.35);
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.set(0, doorH / 2, 0.03);
  leaf.castShadow = true;
  group.add(leaf);

  // Horizontal reinforcement stiffeners
  for (let i = 0; i < 4; i++) {
    const ribGeo = new THREE.BoxGeometry(doorW - 0.25, 0.06, 0.02);
    const ribMat = createMat(0x334155, 0.8, 0.3);
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(0, 0.4 + i * (doorH / 4), 0.075);
    group.add(rib);
  }

  // Emergency Panic Push Bar
  const barGeo = new THREE.BoxGeometry(doorW * 0.65, 0.08, 0.06);
  const barMat = createMat(0xef4444, 0.5, 0.3); // High-vis emergency red
  const bar = new THREE.Mesh(barGeo, barMat);
  bar.position.set(0, 1.05, 0.08);
  group.add(bar);
}

// 10. ARCHITECTURAL WINDOW (نافذة معمارية)
function buildWindow(group: THREE.Group, w: number, h: number, d: number) {
  const winW = Math.max(1.4, w);
  const winH = Math.max(1.2, h);

  // Outer Aluminum Frame
  const frameGeo = new THREE.BoxGeometry(winW, winH, 0.14);
  const frameMat = createMat(0x0f172a, 0.7, 0.3);
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.y = winH / 2;
  group.add(frame);

  // Concrete Lintel and Sill
  const sillGeo = new THREE.BoxGeometry(winW + 0.3, 0.12, 0.22);
  const sillMat = createMat(0xcbd5e1, 0.1, 0.7);
  const sill = new THREE.Mesh(sillGeo, sillMat);
  sill.position.set(0, -0.05, 0.04);
  sill.castShadow = true;
  group.add(sill);

  // Double Glass Panes
  const glassGeo = new THREE.BoxGeometry((winW - 0.2) / 2, winH - 0.2, 0.04);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x93c5fd,
    transmission: 0.75,
    opacity: 0.5,
    transparent: true,
    roughness: 0.05,
  });

  const glass1 = new THREE.Mesh(glassGeo, glassMat);
  glass1.position.set(-(winW - 0.2) / 4 - 0.02, winH / 2, 0);
  group.add(glass1);

  const glass2 = new THREE.Mesh(glassGeo, glassMat);
  glass2.position.set((winW - 0.2) / 4 + 0.02, winH / 2, 0);
  group.add(glass2);
}

// 11. STREET LIGHT POLE (عمود إنارة خارجية)
function buildLightPole(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  isNight: boolean,
  nightLights: boolean
) {
  const poleH = Math.max(4.5, h);

  // Base Flange
  const baseGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.4, 8);
  const steelMat = createMat(0x334155, 0.8, 0.3);
  const base = new THREE.Mesh(baseGeo, steelMat);
  base.position.y = 0.2;
  base.castShadow = true;
  group.add(base);

  // Main Pole Mast
  const mastGeo = new THREE.CylinderGeometry(0.08, 0.14, poleH, 12);
  const mast = new THREE.Mesh(mastGeo, steelMat);
  mast.position.y = poleH / 2 + 0.2;
  mast.castShadow = true;
  group.add(mast);

  // Curved Top Arm
  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
  const arm = new THREE.Mesh(armGeo, steelMat);
  arm.rotation.z = Math.PI / 3;
  arm.position.set(0.5, poleH + 0.4, 0);
  group.add(arm);

  // Luminaire LED Fixture Head
  const headGeo = new THREE.BoxGeometry(0.7, 0.15, 0.35);
  const headMat = createMat(0x0f172a, 0.6, 0.4);
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(1.0, poleH + 0.65, 0);
  group.add(head);

  // Emissive Lens
  const lensGeo = new THREE.BoxGeometry(0.55, 0.04, 0.25);
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: isNight && nightLights ? 0xfef08a : 0x000000,
    emissiveIntensity: isNight && nightLights ? 3.0 : 0.0,
  });
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.set(1.0, poleH + 0.57, 0);
  group.add(lens);

  // Downward Spotlight in night mode
  if (isNight && nightLights) {
    const spot = new THREE.SpotLight(0xffedd5, 3.5, 18, Math.PI / 4, 0.3);
    spot.position.set(1.0, poleH + 0.5, 0);
    spot.target.position.set(1.0, 0, 0);
    group.add(spot);
    group.add(spot.target);
  }
}

// 12. CONCRETE COLUMN (عمود كونكريتي معماري)
function buildConcreteColumn(group: THREE.Group, w: number, h: number, d: number) {
  const colW = Math.max(0.6, w);
  const colH = Math.max(3.5, h);
  const colD = Math.max(0.6, d);

  const concreteMat = createMat(0xe2e8f0, 0.1, 0.7);

  // Base Plinth Pedestal
  const baseGeo = new THREE.BoxGeometry(colW * 1.35, 0.4, colD * 1.35);
  const base = new THREE.Mesh(baseGeo, concreteMat);
  base.position.y = 0.2;
  base.castShadow = true;
  group.add(base);

  // Main Shaft (Pillar)
  const shaftGeo = new THREE.BoxGeometry(colW, colH - 0.8, colD);
  const shaft = new THREE.Mesh(shaftGeo, concreteMat);
  shaft.position.y = (colH - 0.8) / 2 + 0.4;
  shaft.castShadow = true;
  group.add(shaft);

  // Capital Crown Header
  const crownGeo = new THREE.BoxGeometry(colW * 1.4, 0.4, colD * 1.4);
  const crown = new THREE.Mesh(crownGeo, concreteMat);
  crown.position.y = colH - 0.2;
  crown.castShadow = true;
  group.add(crown);
}

// 13. FIRE ESCAPE STAIRS (منافذ وأدراج الطوارئ)
function buildFireEscape(group: THREE.Group, w: number, h: number, d: number) {
  const stairW = Math.max(2.5, w);
  const totalH = Math.max(4.5, h);
  const stairD = Math.max(2.0, d);

  const steelMat = createMat(0x334155, 0.8, 0.3);
  const gratingMat = createMat(0x1e293b, 0.6, 0.4);

  // Vertical Structural Frame Uprights (4 columns)
  const colGeo = new THREE.BoxGeometry(0.12, totalH, 0.12);
  const uprights = [
    [-stairW / 2 + 0.1, totalH / 2, -stairD / 2 + 0.1],
    [stairW / 2 - 0.1, totalH / 2, -stairD / 2 + 0.1],
    [-stairW / 2 + 0.1, totalH / 2, stairD / 2 - 0.1],
    [stairW / 2 - 0.1, totalH / 2, stairD / 2 - 0.1],
  ];

  uprights.forEach(([ux, uy, uz]) => {
    const post = new THREE.Mesh(colGeo, steelMat);
    post.position.set(ux, uy, uz);
    post.castShadow = true;
    group.add(post);
  });

  // Intermediate and Top Landings
  const numLandings = Math.max(2, Math.floor(totalH / 3.0));
  for (let l = 1; l <= numLandings; l++) {
    const ly = l * (totalH / numLandings);

    // Platform Slab Grating
    const platGeo = new THREE.BoxGeometry(stairW, 0.12, stairD);
    const plat = new THREE.Mesh(platGeo, gratingMat);
    plat.position.set(0, ly, 0);
    plat.castShadow = true;
    group.add(plat);

    // Safety Railings around platform
    const railGeo = new THREE.BoxGeometry(stairW, 1.0, 0.05);
    const railFront = new THREE.Mesh(railGeo, steelMat);
    railFront.position.set(0, ly + 0.5, stairD / 2);
    group.add(railFront);

    const railSideGeo = new THREE.BoxGeometry(0.05, 1.0, stairD);
    const railLeft = new THREE.Mesh(railSideGeo, steelMat);
    railLeft.position.set(-stairW / 2, ly + 0.5, 0);
    group.add(railLeft);
  }

  // Diagonal flight steps between ground and first landing
  const flightSteps = 10;
  const flightH = totalH / numLandings;
  for (let s = 0; s < flightSteps; s++) {
    const sy = (s / flightSteps) * flightH;
    const sz = -stairD / 2 + (s / flightSteps) * (stairD * 0.85);

    const treadGeo = new THREE.BoxGeometry(stairW * 0.45, 0.06, 0.32);
    const tread = new THREE.Mesh(treadGeo, steelMat);
    tread.position.set(stairW * 0.2, sy + 0.03, sz);
    tread.castShadow = true;
    group.add(tread);
  }
}

// 14. SOLAR PHOTOVOLTAIC PANELS (مصفوفة ألواح الطاقة الشمسية الكهروضوئية)
function buildSolarPanels(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  isNight: boolean,
  nightLights: boolean
) {
  const panelWidth = Math.max(3.0, w);
  const panelDepth = Math.max(2.0, d);
  const tiltAngle = (22 * Math.PI) / 180; // 22 degrees tilt for optimal solar gain

  const frameMat = createMat(0x94a3b8, 0.85, 0.3); // Galvanized aluminum racking
  const cellGlassMat = new THREE.MeshPhysicalMaterial({
    color: isNight ? 0x0f172a : 0x1e3a8a, // Deep navy/sapphire blue monocrystalline silicon
    metalness: 0.8,
    roughness: 0.15,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  });
  const borderMat = createMat(0x64748b, 0.7, 0.4);
  const concreteFootingMat = createMat(0x475569, 0.1, 0.9);

  // Concrete Ballast / Mounting Piers
  const footingGeo = new THREE.BoxGeometry(0.35, 0.15, panelDepth * 0.9);
  [-panelWidth * 0.4, panelWidth * 0.4].forEach((fx) => {
    const footing = new THREE.Mesh(footingGeo, concreteFootingMat);
    footing.position.set(fx, 0.08, 0);
    group.add(footing);
  });

  // Vertical Support Posts (rear higher than front for tilt)
  const frontH = 0.25 * h;
  const rearH = frontH + Math.sin(tiltAngle) * panelDepth * 0.85;

  const legGeoFront = new THREE.CylinderGeometry(0.04, 0.04, frontH, 12);
  const legGeoRear = new THREE.CylinderGeometry(0.04, 0.04, rearH, 12);

  [-panelWidth * 0.4, 0, panelWidth * 0.4].forEach((px) => {
    // Front short legs
    const frontLeg = new THREE.Mesh(legGeoFront, frameMat);
    frontLeg.position.set(px, frontH / 2 + 0.1, panelDepth * 0.35);
    group.add(frontLeg);

    // Rear tall legs
    const rearLeg = new THREE.Mesh(legGeoRear, frameMat);
    rearLeg.position.set(px, rearH / 2 + 0.1, -panelDepth * 0.35);
    group.add(rearLeg);

    // Diagonal Cross Bracing
    const braceLen = Math.sqrt(Math.pow(rearH - frontH, 2) + Math.pow(panelDepth * 0.7, 2));
    const braceGeo = new THREE.CylinderGeometry(0.025, 0.025, braceLen, 8);
    const brace = new THREE.Mesh(braceGeo, frameMat);
    brace.position.set(px, (frontH + rearH) / 2 + 0.1, 0);
    brace.rotation.x = -Math.atan2(rearH - frontH, panelDepth * 0.7);
    group.add(brace);
  });

  // Tilted Assembly Group
  const tiltedGroup = new THREE.Group();
  tiltedGroup.position.set(0, (frontH + rearH) / 2 + 0.12, 0);
  tiltedGroup.rotation.x = tiltAngle;
  group.add(tiltedGroup);

  // Cross Rails underneath panels
  const railGeo = new THREE.BoxGeometry(panelWidth * 0.96, 0.05, 0.06);
  [-panelDepth * 0.25, panelDepth * 0.25].forEach((rz) => {
    const rail = new THREE.Mesh(railGeo, frameMat);
    rail.position.set(0, -0.04, rz);
    tiltedGroup.add(rail);
  });

  // 2x3 or 2x4 Photovoltaic Module Array Grid
  const cols = panelWidth > 5 ? 4 : 3;
  const rows = 2;
  const cellW = (panelWidth * 0.94) / cols;
  const cellD = (panelDepth * 0.9) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = -panelWidth * 0.47 + cellW * (c + 0.5);
      const cz = -panelDepth * 0.45 + cellD * (r + 0.5);

      // Aluminum Frame
      const frameBox = new THREE.BoxGeometry(cellW * 0.96, 0.04, cellD * 0.96);
      const frameMesh = new THREE.Mesh(frameBox, borderMat);
      frameMesh.position.set(cx, 0, cz);
      tiltedGroup.add(frameMesh);

      // Silicon Wafer Glass Face
      const glassBox = new THREE.BoxGeometry(cellW * 0.91, 0.015, cellD * 0.91);
      const glassMesh = new THREE.Mesh(glassBox, cellGlassMat);
      glassMesh.position.set(cx, 0.02, cz);
      glassMesh.castShadow = true;
      glassMesh.receiveShadow = true;
      tiltedGroup.add(glassMesh);

      // Wafer grid lines (busbars)
      const busbarMat = createMat(0xe2e8f0, 0.9, 0.2);
      const barGeo = new THREE.BoxGeometry(cellW * 0.88, 0.005, 0.012);
      [-cellD * 0.22, 0, cellD * 0.22].forEach((bz) => {
        const busbar = new THREE.Mesh(barGeo, busbarMat);
        busbar.position.set(cx, 0.03, cz + bz);
        tiltedGroup.add(busbar);
      });
    }
  }

  // Central Solar Inverter / DC Junction Box
  const invGeo = new THREE.BoxGeometry(0.5, 0.65, 0.25);
  const invMat = createMat(0xd1d5db, 0.4, 0.5);
  const inverter = new THREE.Mesh(invGeo, invMat);
  inverter.position.set(0, rearH * 0.55 + 0.1, -panelDepth * 0.35);
  group.add(inverter);

  // Inverter Status Indicator LED
  const ledGeo = new THREE.SphereGeometry(0.03, 12, 12);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: isNight ? 1.5 : 0.8,
  });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0.15, rearH * 0.55 + 0.3, -panelDepth * 0.35 + 0.13);
  group.add(led);
}
