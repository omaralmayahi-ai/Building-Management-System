// Iraqi Oilfields Presets and GIS Tile Layers Configuration

export interface OilfieldLocationPreset {
  id: string;
  nameAr: string;
  governorate: string;
  lat: number;
  lng: number;
  zoom: number;
  description: string;
}

export const IRAQ_OILFIELDS_PRESETS: OilfieldLocationPreset[] = [
  {
    id: 'hq',
    nameAr: 'مقر شركة نفط الوسط (بغداد)',
    governorate: 'بغداد',
    lat: 33.3152,
    lng: 44.3661,
    zoom: 14,
    description: 'المقر العام - إدارة العمليات والمشاريع',
  },
  {
    id: 'ahdab',
    nameAr: 'حقل الأحدب النفطي (واسط)',
    governorate: 'واسط',
    lat: 32.6189,
    lng: 45.7531,
    zoom: 13,
    description: 'حقل الأحدب - مجمع المعالجة المركزي والورش',
  },
  {
    id: 'badra',
    nameAr: 'حقل بدرة النفطي (واسط)',
    governorate: 'واسط',
    lat: 33.1025,
    lng: 45.9810,
    zoom: 13,
    description: 'حقل بدرة - المحطة المركزية لمعالجة النفط والغاز',
  },
  {
    id: 'east_baghdad',
    nameAr: 'حقل شرق بغداد (بغداد / ديالى)',
    governorate: 'بغداد',
    lat: 33.3912,
    lng: 44.5123,
    zoom: 13,
    description: 'حقل شرق بغداد - المنطقة الجنوبية والشمالية',
  },
  {
    id: 'naft_khana',
    nameAr: 'حقل نفط خانة (ديالى)',
    governorate: 'ديالى',
    lat: 34.0514,
    lng: 45.4128,
    zoom: 13,
    description: 'حقل نفط خانة الحدودي - محطات الضخ والعزل',
  },
  {
    id: 'mansuriya',
    nameAr: 'حقل المنصورية الغازي (ديالى)',
    governorate: 'ديالى',
    lat: 34.1250,
    lng: 45.0820,
    zoom: 13,
    description: 'حقل المنصورية - مشاريع استثمار الغاز الطبيعي',
  },
  {
    id: 'middle_furat',
    nameAr: 'حقول الفرات الأوسط (كربلاء / النجف)',
    governorate: 'كربلاء',
    lat: 32.0300,
    lng: 44.3400,
    zoom: 12,
    description: 'حقول غرب الكفل والفرات الأوسط',
  },
];

export const GIS_TILE_LAYERS = {
  satellite: {
    name: 'أقمار صناعية',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: 'Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    name: 'شوارع وتضاريس',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
};
