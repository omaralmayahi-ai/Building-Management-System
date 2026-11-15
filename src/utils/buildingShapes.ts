// أشكال المباني ومعاملات مساحتها (كانت داخل معالج الإضافة؛ يستخدمها النموذج الموحد وسجل الوحدات)
export interface BuildingShapeOption {
  id: string;
  nameAr: string;
  symbol: string;
  category: string;
  desc: string;
}

export const BUILDING_SHAPE_OPTIONS: BuildingShapeOption[] = [
  { id: 'مستطيل', nameAr: 'مستطيل (Rectangular)', symbol: '▭', category: 'الأشكال الأساسية', desc: 'الشكل الهيكلي القياسي الأكثر شيوعاً للمباني والكرفانات والورش' },
  { id: 'مربع', nameAr: 'مربع (Square)', symbol: '▢', category: 'الأشكال الأساسية', desc: 'تصميم متناظر الأبعاد للوحدات المربعة والمخازن ومراكز المراقبة' },
  { id: 'دائري', nameAr: 'دائري / أسطواني (Circular)', symbol: '◯', category: 'الأشكال الأساسية', desc: 'خزانات النفط، أبراج المراقبة والمياه، والمباني الدائرية' },
  { id: 'مثلث', nameAr: 'مثلث / منشور (Triangular)', symbol: '△', category: 'الأشكال الأساسية', desc: 'مباني زوايا المفارق والمساحات المثلثية الميدانية' },
  { id: 'L-Shape', nameAr: 'على شكل حرف L (L-Shape)', symbol: '└', category: 'أبنية حرفية/هندسية', desc: 'أجنحة إدارية وسكنية متقاطعة بزاوية قائمة' },
  { id: 'U-Shape', nameAr: 'على شكل حرف U (U-Shape)', symbol: '⊔', category: 'أبنية حرفية/هندسية', desc: 'مبانٍ إدارية وسكنية تحيط بفناء مفتوح من ثلاث جهات' },
  { id: 'T-Shape', nameAr: 'على شكل حرف T (T-Shape)', symbol: '┬', category: 'أبنية حرفية/هندسية', desc: 'جناح تشغيلي رئيسي مع مدخل أو جناح عمودي' },
  { id: 'H-Shape', nameAr: 'على شكل حرف H (H-Shape)', symbol: '⦚', category: 'أبنية حرفية/هندسية', desc: 'جناحين متوازيين يربطهما ممر رئيسي وسطي' },
  { id: 'C-Shape', nameAr: 'على شكل حرف C (C-Shape)', symbol: '⊂', category: 'أبنية حرفية/هندسية', desc: 'مبنى قوسي أو على شكل حذوة حصان مع مدخل مقعر' },
  { id: 'E-Shape', nameAr: 'على شكل حرف E / F (E-Shape)', symbol: 'ヨ', category: 'أبنية حرفية/هندسية', desc: 'مجمعات كبيرة بأجنحة ممتدة متوازية متعددة' },
  { id: 'Cross-Shape', nameAr: 'على شكل صليب / زائد (+)', symbol: '+', category: 'تصاميم متخصصة', desc: 'مراكز الطوارئ الإسعافية، مستشفيات وغرف التحكم والسيطرة' },
  { id: 'Courtyard', nameAr: 'فناء داخلي مفرغ (Courtyard)', symbol: '⧈', category: 'تصاميم متخصصة', desc: 'مبنى مغلق ذو صحن مكشوف أو فناء وسطي مفرغ' },
  { id: 'Octagonal', nameAr: 'ثماني الأضلاع / مضلع (Octagonal)', symbol: '⬡', category: 'تصاميم متخصصة', desc: 'أبراج المراقبة، غرف السيطرة الميدانية والسيطرات' },
  { id: 'Dome', nameAr: 'قُبّي / كروي (Dome / Geodesic)', symbol: '⌒', category: 'تصاميم متخصصة', desc: 'قبات ساندويتش بانل، خزانات كروية، ومستودعات مقببة' },
  { id: 'Irregular', nameAr: 'شكل مركب / غير منتظم (Irregular)', symbol: '⬟', category: 'تصاميم مخصصة', desc: 'تصميم هندسي مخصص غير منتظم أو معقد مع أضلاع متعددة' },
];

export const getShapeFactor = (shape: string): number => {
  if (shape === 'مستطيل' || shape === 'مربع') return 1.0;
  if (shape === 'دائري' || shape === 'Dome') return 0.7854; // π/4
  if (shape === 'مثلث') return 0.5;
  if (shape === 'L-Shape' || shape === 'T-Shape' || shape === 'C-Shape') return 0.75;
  if (shape === 'U-Shape' || shape === 'E-Shape' || shape === 'Courtyard') return 0.70;
  if (shape === 'H-Shape') return 0.80;
  if (shape === 'Cross-Shape') return 0.60;
  if (shape === 'Octagonal') return 0.828;
  return 0.85; // Irregular
};

export const calculateUnitArea = (length: number, width: number, shape: string): number => {
  const factor = getShapeFactor(shape);
  return Math.round(length * width * factor * 10) / 10;
};
