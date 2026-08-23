// Iraqi Oilfields Presets and GIS Tile Layers Configuration

export interface IraqiLocationEntry {
  id: string;
  nameAr: string;
  nameEn?: string;
  category: 'oilfield' | 'facility' | 'refinery' | 'hq' | 'governorate' | 'district';
  governorate: string;
  lat: number;
  lng: number;
  zoom: number;
  description: string;
  aliases: string[];
}

export type OilfieldLocationPreset = IraqiLocationEntry;

export const IRAQ_GAZETTEER: IraqiLocationEntry[] = [
  // 1. حقل الأحدب النفطي ومنشآته (واسط)
  {
    id: 'ahdab-field',
    nameAr: 'حقل الأحدب النفطي',
    nameEn: 'Al-Ahdab Oilfield',
    category: 'oilfield',
    governorate: 'واسط',
    lat: 32.6189,
    lng: 45.7531,
    zoom: 14,
    description: 'حقل الأحدب النفطي - مجمع المعالجة المركزي ومحطات الإنتاج (واسط / قضاء النعمانية / الأحرار)',
    aliases: [
      'حقل الاحدب',
      'حقل الأحدب',
      'الاحدب',
      'الأحدب',
      'حقل الاحدب النفطي',
      'حقل الأحدب النفطي',
      'ahdab',
      'al ahdab',
      'al-ahdab',
      'ahdab oilfield',
      'واسط الاحدب',
      'الاحدب واسط',
      'حقل الاحدب واسط',
    ],
  },
  {
    id: 'ahdab-cpf',
    nameAr: 'المحطة المركزية (CPF) - حقل الأحدب',
    nameEn: 'Central Processing Facility (CPF) - Ahdab',
    category: 'facility',
    governorate: 'واسط',
    lat: 32.6189,
    lng: 45.7531,
    zoom: 16,
    description: 'المعالج الرئيسي للنفط الخام المستخرج ومنظومات العزل والغاز - حقل الأحدب',
    aliases: [
      'cpf',
      'المحطة المركزية',
      'المحطه المركزيه',
      'محطة cpf',
      'محطة المعالجة المركزية',
      'مجمع المعالجة المركزي',
      'cpf الاحدب',
      'cpf الأحدب',
      'المحطة المركزية الاحدب',
      'المحطة المركزية الأحدب',
    ],
  },
  {
    id: 'ahdab-pad',
    nameAr: 'محطة ضخ الآبار (Well Pads) - حقل الأحدب',
    nameEn: 'Well Pads Station - Ahdab',
    category: 'facility',
    governorate: 'واسط',
    lat: 32.6250,
    lng: 45.7610,
    zoom: 16,
    description: 'منظومة ضخ وتجميع آبار حقل الأحدب الشمالية والشرقية',
    aliases: [
      'pad',
      'pad-01',
      'well pad',
      'well pads',
      'محطة ضخ الابار',
      'محطة ضخ الآبار',
      'ابار الاحدب',
      'آبار الأحدب',
      'ضخ الابار الاحدب',
    ],
  },
  {
    id: 'ahdab-res',
    nameAr: 'المجمع السكني للموظفين - حقل الأحدب',
    nameEn: 'Staff Housing Complex - Ahdab',
    category: 'facility',
    governorate: 'واسط',
    lat: 32.6100,
    lng: 45.7480,
    zoom: 16,
    description: 'مجمع السكن العائلي والفردي والخدمات لكوادر شركة نفط الوسط والشركات العاملة',
    aliases: [
      'res-01',
      'سكن الموظفين',
      'سكن الاحدب',
      'سكن الأحدب',
      'المجمع السكني',
      'المجمع السكني الاحدب',
      'مجمع سكن الاحدب',
      'مجمع الكوادر الاحدب',
    ],
  },

  // 2. حقل بدرة النفطي (واسط)
  {
    id: 'badra-field',
    nameAr: 'حقل بدرة النفطي',
    nameEn: 'Badra Oilfield',
    category: 'oilfield',
    governorate: 'واسط',
    lat: 33.1025,
    lng: 45.9810,
    zoom: 14,
    description: 'حقل بدرة - المحطة المركزية لمعالجة النفط والغاز ومنشآت الضخ',
    aliases: [
      'حقل بدرة',
      'حقل بدره',
      'بدرة',
      'بدره',
      'badra',
      'badra oilfield',
      'حقل بدرة النفطي',
      'حقل بدره النفطي',
      'نفط بدرة',
      'واسط بدرة',
    ],
  },
  {
    id: 'badra-site',
    nameAr: 'موقع بدرة الميداني والبوابة',
    nameEn: 'Badra Field Site & Gate',
    category: 'facility',
    governorate: 'واسط',
    lat: 33.1121,
    lng: 45.9810,
    zoom: 15,
    description: 'بوابة الدخول ومحطة العزل والتكرير الأولى في بدرة',
    aliases: ['بوابة بدرة', 'موقع بدرة الميداني', 'gate-01'],
  },

  // 3. المقر العام لشركة نفط الوسط والمواقع الإدارية (بغداد)
  {
    id: 'hq-baghdad',
    nameAr: 'مقر شركة نفط الوسط (بغداد)',
    nameEn: 'Midland Oil Company HQ (Baghdad)',
    category: 'hq',
    governorate: 'بغداد',
    lat: 33.3152,
    lng: 44.3661,
    zoom: 15,
    description: 'المقر الرئيسي لشركة نفط الوسط - إدارة العمليات، الهيئة الهندسية والمشاريع (بغداد)',
    aliases: [
      'مقر شركة نفط الوسط',
      'شركة نفط الوسط',
      'نفط الوسط',
      'ادارة نفط الوسط',
      'مقر نفط الوسط',
      'mdoc',
      'midland oil company',
      'midland oil',
      'مقر الشركة بغداد',
      'الوزيرية نفط الوسط',
    ],
  },
  {
    id: 'east-baghdad',
    nameAr: 'حقل شرق بغداد النفطي',
    nameEn: 'East Baghdad Oilfield',
    category: 'oilfield',
    governorate: 'بغداد',
    lat: 33.3912,
    lng: 44.5123,
    zoom: 13,
    description: 'حقل شرق بغداد النفطي - المنطقة الجنوبية والشمالية ومحطات المعالجة',
    aliases: [
      'حقل شرق بغداد',
      'شرق بغداد',
      'east baghdad',
      'east baghdad oilfield',
      'حقل شرق بغداد النفطي',
      'نفط شرق بغداد',
    ],
  },
  {
    id: 'daura-refinery',
    nameAr: 'مصفى الدورة (بغداد)',
    nameEn: 'Daura Refinery (Baghdad)',
    category: 'refinery',
    governorate: 'بغداد',
    lat: 33.2750,
    lng: 44.4200,
    zoom: 15,
    description: 'مصفى الدورة النفطي ومستودعات التوزيع الرئيسية (شركة مصافي الوسط)',
    aliases: [
      'مصفى الدورة',
      'مصفى الدوره',
      'الدورة',
      'الدوره',
      'مصفى بغداد',
      'daura refinery',
      'doura refinery',
      'مستودع الدورة',
    ],
  },
  {
    id: 'karkh-depot',
    nameAr: 'مستودع الكرخ النفطي',
    nameEn: 'Karkh Oil Depot',
    category: 'facility',
    governorate: 'بغداد',
    lat: 33.3000,
    lng: 44.3100,
    zoom: 15,
    description: 'مستودع وتوزيع المشتقات النفطية في جانب الكرخ',
    aliases: ['مستودع الكرخ', 'مستودع الكرخ النفطي', 'كرخ نفط'],
  },
  {
    id: 'rusafa-depot',
    nameAr: 'مستودع الرصافة النفطي',
    nameEn: 'Rusafa Oil Depot',
    category: 'facility',
    governorate: 'بغداد',
    lat: 33.3500,
    lng: 44.4500,
    zoom: 15,
    description: 'مستودع وتوزيع المشتقات النفطية في جانب الرصافة',
    aliases: ['مستودع الرصافة', 'مستودع الرصافه', 'رصافة نفط'],
  },

  // 4. حقول ومنشآت ديالى
  {
    id: 'naft-khana',
    nameAr: 'حقل نفط خانة (ديالى)',
    nameEn: 'Naft Khana Field (Diyala)',
    category: 'oilfield',
    governorate: 'ديالى',
    lat: 34.0514,
    lng: 45.4128,
    zoom: 13,
    description: 'حقل نفط خانة الحدودي - محطات الضخ والعزل والتجميع التاريخية (خانقين / ديالى)',
    aliases: [
      'حقل نفط خانة',
      'حقل نفت خانة',
      'نفط خانة',
      'نفت خانة',
      'نفط خانه',
      'نفت خانه',
      'naft khana',
      'naft khaneh',
      'حقل نفط خانه',
    ],
  },
  {
    id: 'mansuriya',
    nameAr: 'حقل المنصورية الغازي (ديالى)',
    nameEn: 'Mansuriya Gas Field (Diyala)',
    category: 'oilfield',
    governorate: 'ديالى',
    lat: 34.1250,
    lng: 45.0820,
    zoom: 13,
    description: 'حقل المنصورية - مشاريع استثمار ومعالجة الغاز الطبيعي',
    aliases: [
      'حقل المنصورية',
      'حقل المنصوريه',
      'المنصورية',
      'المنصوريه',
      'حقل المنصورية الغازي',
      'غاز المنصورية',
      'mansuriya',
      'mansouria',
    ],
  },

  // 5. حقول ومنشآت الأنبار والوسط والفرات الأوسط
  {
    id: 'akkas-gas',
    nameAr: 'حقل عكاس الغازي (الأنبار)',
    nameEn: 'Akkas Gas Field (Anbar)',
    category: 'oilfield',
    governorate: 'الأنبار',
    lat: 34.0150,
    lng: 41.2150,
    zoom: 13,
    description: 'حقل عكاس الغازي - القائم / غرب الأنبار',
    aliases: ['حقل عكاس', 'عكاس', 'غاز عكاس', 'akkas', 'akkas gas field'],
  },
  {
    id: 'middle-furat',
    nameAr: 'حقول الفرات الأوسط (كربلاء / النجف)',
    nameEn: 'Middle Euphrates Fields',
    category: 'oilfield',
    governorate: 'كربلاء',
    lat: 32.0300,
    lng: 44.3400,
    zoom: 12,
    description: 'حقول غرب الكفل والفرات الأوسط',
    aliases: ['حقول الفرات الاوسط', 'الفرات الاوسط', 'غرب الكفل', 'حقل كفل', 'حقول كربلاء'],
  },
  {
    id: 'karbala-refinery',
    nameAr: 'مصفى كربلاء الحديث',
    nameEn: 'Karbala Modern Refinery',
    category: 'refinery',
    governorate: 'كربلاء',
    lat: 32.4833,
    lng: 43.9000,
    zoom: 15,
    description: 'مصفى كربلاء النفطي التكريري الحديث وفق أعلى المواصفات العالمية',
    aliases: ['مصفى كربلاء', 'مصفى كربلاء الحديث', 'karbala refinery'],
  },
  {
    id: 'wasit-power-plant',
    nameAr: 'محطة كهرباء واسط الحرارية (الزبيدية)',
    nameEn: 'Wasit Thermal Power Plant (Zubaidiya)',
    category: 'facility',
    governorate: 'واسط',
    lat: 32.7800,
    lng: 45.4500,
    zoom: 15,
    description: 'محطة الزبيدية الحرارية لتوليد الطاقة الكهربائية في محافظة واسط',
    aliases: [
      'محطة كهرباء واسط',
      'محطة الزبيدية',
      'كهرباء واسط',
      'محطة واسط الحرارية',
      'الزبيدية',
      'كهرباء الزبيدية',
    ],
  },

  // 6. حقول ومنشآت الجنوب (البصرة وميسان وذي قار)
  {
    id: 'rumaila',
    nameAr: 'حقل الرميلة (البصرة)',
    nameEn: 'Rumaila Oilfield (Basra)',
    category: 'oilfield',
    governorate: 'البصرة',
    lat: 30.4333,
    lng: 47.3333,
    zoom: 12,
    description: 'حقل الرميلة العملاق (الرميلة الشمالية والجنوبية) - البصرة',
    aliases: ['حقل الرميلة', 'حقل الرميله', 'الرميلة', 'الرميله', 'rumaila', 'rumaila oilfield', 'الرميلة الشمالية', 'الرميلة الجنوبية'],
  },
  {
    id: 'majnoon',
    nameAr: 'حقل مجنون النفطي (البصرة)',
    nameEn: 'Majnoon Oilfield (Basra)',
    category: 'oilfield',
    governorate: 'البصرة',
    lat: 31.0667,
    lng: 47.4333,
    zoom: 13,
    description: 'حقل مجنون النفطي العملاق - شمال البصرة',
    aliases: ['حقل مجنون', 'مجنون', 'majnoon', 'majnoon oilfield', 'حقل مجنون النفطي'],
  },
  {
    id: 'west-qurna',
    nameAr: 'حقل غرب القرنة (البصرة)',
    nameEn: 'West Qurna Oilfield (Basra)',
    category: 'oilfield',
    governorate: 'البصرة',
    lat: 30.8500,
    lng: 47.3500,
    zoom: 12,
    description: 'حقل غرب القرنة 1 و 2 العملاق - البصرة',
    aliases: ['حقل غرب القرنة', 'حقل غرب القرنه', 'غرب القرنة', 'غرب القرنه', 'west qurna', 'القرنة'],
  },
  {
    id: 'zubair',
    nameAr: 'حقل الزبير النفطي (البصرة)',
    nameEn: 'Zubair Oilfield (Basra)',
    category: 'oilfield',
    governorate: 'البصرة',
    lat: 30.3833,
    lng: 47.6000,
    zoom: 13,
    description: 'حقل الزبير النفطي - جنوب غرب البصرة',
    aliases: ['حقل الزبير', 'الزبير', 'zubair', 'zubair oilfield'],
  },
  {
    id: 'halfaya',
    nameAr: 'حقل الحلفاية (ميسان)',
    nameEn: 'Halfaya Oilfield (Maysan)',
    category: 'oilfield',
    governorate: 'ميسان',
    lat: 31.6667,
    lng: 47.3333,
    zoom: 13,
    description: 'حقل الحلفاية النفطي العملاق - محافظة ميسان',
    aliases: ['حقل الحلفاية', 'حقل الحلفايه', 'الحلفاية', 'الحلفايه', 'halfaya', 'halfaya oilfield'],
  },
  {
    id: 'buzurgan',
    nameAr: 'حقول بزركان وأبو غرب (ميسان)',
    nameEn: 'Buzurgan & Abu Ghirab Fields',
    category: 'oilfield',
    governorate: 'ميسان',
    lat: 32.0833,
    lng: 47.2500,
    zoom: 12,
    description: 'حقول بزركان، الفكة، وأبو غرب - شركة نفط ميسان',
    aliases: ['بزركان', 'حقل بزركان', 'الفكة', 'الفكه', 'ابو غرب', 'أبو غرب', 'buzurgan'],
  },
  {
    id: 'gharraf',
    nameAr: 'حقل الغراف (ذي قار)',
    nameEn: 'Gharraf Oilfield (Dhi Qar)',
    category: 'oilfield',
    governorate: 'ذي قار',
    lat: 31.5833,
    lng: 46.0833,
    zoom: 13,
    description: 'حقل الغراف النفطي - قضاء الرفاعي / محافظة ذي قار',
    aliases: ['حقل الغراف', 'الغراف', 'حقل الغراف النفطي', 'gharraf', 'الرفاعي'],
  },

  // 7. حقول ومنشآت الشمال (كركوك وصلاح الدين ونينوى)
  {
    id: 'kirkuk-field',
    nameAr: 'حقل كركوك / بابا كركر',
    nameEn: 'Kirkuk / Baba Gurgur Oilfield',
    category: 'oilfield',
    governorate: 'كركوك',
    lat: 35.5333,
    lng: 44.3500,
    zoom: 13,
    description: 'حقل كركوك التاريخي وقبة بابا كركر وآفانا وخورمالة',
    aliases: ['حقل كركوك', 'بابا كركر', 'حقل بابا كركر', 'kirkuk oilfield', 'kirkuk', 'نفط الشمال'],
  },
  {
    id: 'bai-hassan',
    nameAr: 'حقل باي حسن (كركوك)',
    nameEn: 'Bai Hassan Oilfield',
    category: 'oilfield',
    governorate: 'كركوك',
    lat: 35.6833,
    lng: 44.1500,
    zoom: 13,
    description: 'حقل باي حسن النفطي - شركة نفط الشمال',
    aliases: ['باي حسن', 'حقل باي حسن', 'bai hassan'],
  },
  {
    id: 'jambur',
    nameAr: 'حقل جمبور (كركوك)',
    nameEn: 'Jambur Oilfield',
    category: 'oilfield',
    governorate: 'كركوك',
    lat: 35.1500,
    lng: 44.4500,
    zoom: 13,
    description: 'حقل جمبور النفطي والغازي - كركوك',
    aliases: ['جمبور', 'حقل جمبور', 'jambur'],
  },
  {
    id: 'baiji-refinery',
    nameAr: 'مصفى بيجي / مجمع الصمود',
    nameEn: 'Baiji Refinery Complex',
    category: 'refinery',
    governorate: 'صلاح الدين',
    lat: 34.9333,
    lng: 43.4833,
    zoom: 14,
    description: 'مصفى بيجي ومجمع الصمود النفطي الأكبر في العراق (صلاح الدين)',
    aliases: ['مصفى بيجي', 'بيجي', 'مجمع الصمود', 'مصفى الصمود', 'baiji refinery'],
  },
  {
    id: 'qayyarah',
    nameAr: 'حقل القيارة (نينوى)',
    nameEn: 'Qayyarah Oilfield (Nineveh)',
    category: 'oilfield',
    governorate: 'نينوى',
    lat: 35.8000,
    lng: 43.2833,
    zoom: 13,
    description: 'حقل القيارة للنفط الثقيل - جنوب الموصل',
    aliases: ['حقل القيارة', 'حقل القياره', 'القيارة', 'القياره', 'qayyarah'],
  },

  // 8. مدن ومراكز المحافظات والأقضية العراقية (بما فيها مدن محافظة واسط)
  {
    id: 'city-kut',
    nameAr: 'الكوت (مركز محافظة واسط)',
    nameEn: 'Al-Kut (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 32.5058,
    lng: 45.8347,
    zoom: 13,
    description: 'مدينة الكوت - مركز محافظة واسط وسدة الكوت',
    aliases: ['الكوت', 'كوت', 'واسط', 'محافظة واسط', 'محافظه واسط', 'kut', 'al-kut', 'wasit'],
  },
  {
    id: 'city-numaniyah',
    nameAr: 'قضاء النعمانية (واسط)',
    nameEn: 'Al-Numaniyah (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 32.5467,
    lng: 45.4194,
    zoom: 14,
    description: 'قضاء النعمانية - محافظة واسط (القريب من حقل الأحدب)',
    aliases: ['النعمانية', 'النعمانيه', 'نعمانية', 'نعمانيه', 'قضاء النعمانية', 'numaniyah'],
  },
  {
    id: 'city-ahrar',
    nameAr: 'ناحية الأحرار (واسط)',
    nameEn: 'Al-Ahrar (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 32.5200,
    lng: 45.5800,
    zoom: 14,
    description: 'ناحية الأحرار - نطاق حقل الأحدب النفطي في واسط',
    aliases: ['الاحرار', 'الأحرار', 'احرار', 'أحرار', 'ناحية الاحرار', 'ناحية الأحرار', 'ahrar'],
  },
  {
    id: 'city-suwaira',
    nameAr: 'قضاء الصويرة (واسط)',
    nameEn: 'Al-Suwaira (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 32.9256,
    lng: 44.7758,
    zoom: 14,
    description: 'قضاء الصويرة - شمال محافظة واسط',
    aliases: ['الصويرة', 'الصويره', 'صويرة', 'صويره', 'قضاء الصويرة', 'suwaira'],
  },
  {
    id: 'city-aziziyah',
    nameAr: 'قضاء العزيزية (واسط)',
    nameEn: 'Al-Aziziyah (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 32.9094,
    lng: 45.0628,
    zoom: 14,
    description: 'قضاء العزيزية - محافظة واسط',
    aliases: ['العزيزية', 'العزيزيه', 'عزيزية', 'عزيزيه', 'قضاء العزيزية', 'aziziyah'],
  },
  {
    id: 'city-hayy',
    nameAr: 'قضاء الحي (واسط)',
    nameEn: 'Al-Hayy (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 32.1706,
    lng: 46.0461,
    zoom: 14,
    description: 'قضاء الحي - جنوب محافظة واسط',
    aliases: ['الحي', 'حي', 'قضاء الحي', 'al-hayy', 'hayy'],
  },
  {
    id: 'city-badra',
    nameAr: 'قضاء بدرة (واسط)',
    nameEn: 'Badra District (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 33.1167,
    lng: 45.9667,
    zoom: 14,
    description: 'قضاء بدرة الحدودي - شرق محافظة واسط',
    aliases: ['قضاء بدرة', 'قضاء بدره', 'مدينة بدرة', 'بدرة واسط'],
  },
  {
    id: 'city-jassan',
    nameAr: 'ناحية جصان (واسط)',
    nameEn: 'Jassan (Wasit)',
    category: 'district',
    governorate: 'واسط',
    lat: 33.0033,
    lng: 46.0333,
    zoom: 14,
    description: 'ناحية جصان - محافظة واسط',
    aliases: ['جصان', 'ناحية جصان', 'jassan'],
  },
  {
    id: 'city-baghdad',
    nameAr: 'بغداد (العاصمة)',
    nameEn: 'Baghdad Capital',
    category: 'governorate',
    governorate: 'بغداد',
    lat: 33.3152,
    lng: 44.3661,
    zoom: 12,
    description: 'مدينة بغداد - عاصمة جمهورية العراق ومقر الوزارات',
    aliases: ['بغداد', 'محافظة بغداد', 'العاصمة بغداد', 'baghdad'],
  },
  {
    id: 'city-basra',
    nameAr: 'البصرة (الفيحاء)',
    nameEn: 'Basra',
    category: 'governorate',
    governorate: 'البصرة',
    lat: 30.5085,
    lng: 47.7804,
    zoom: 12,
    description: 'مدينة البصرة - عاصمة العراق الاقتصادية ومنفذ الخليج العربي',
    aliases: ['البصرة', 'البصره', 'بصرة', 'بصره', 'محافظة البصرة', 'basra'],
  },
  {
    id: 'city-erbil',
    nameAr: 'أربيل (هولير)',
    nameEn: 'Erbil',
    category: 'governorate',
    governorate: 'أربيل',
    lat: 36.1911,
    lng: 44.0092,
    zoom: 12,
    description: 'مدينة أربيل - قلعة أربيل وإقليم كوردستان',
    aliases: ['اربيل', 'أربيل', 'هولير', 'erbil', 'arbil'],
  },
  {
    id: 'city-najaf',
    nameAr: 'النجف الأشرف',
    nameEn: 'Al-Najaf Al-Ashraf',
    category: 'governorate',
    governorate: 'النجف',
    lat: 32.0006,
    lng: 44.3305,
    zoom: 13,
    description: 'مدينة النجف الأشرف',
    aliases: ['النجف', 'النجف الاشرف', 'النجف الأشرف', 'نجف', 'najaf'],
  },
  {
    id: 'city-karbala',
    nameAr: 'كربلاء المقدسة',
    nameEn: 'Karbala',
    category: 'governorate',
    governorate: 'كربلاء',
    lat: 32.6160,
    lng: 44.0249,
    zoom: 13,
    description: 'مدينة كربلاء المقدسة',
    aliases: ['كربلاء', 'كربلاء المقدسة', 'كربلاء المقدسه', 'karbala'],
  },
];

// Re-export for compatibility
export const IRAQ_OILFIELDS_PRESETS = IRAQ_GAZETTEER;

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

/**
 * Arabic String Normalizer for High-Precision Location Matching
 */
export function normalizeArabicSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Strip Tashkeel & Harakat
    .replace(/[ـ\-_/\\,،.:;()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent Gazetteer Finder with Weighted Scoring
 */
export function searchIraqGazetteer(query: string, maxResults: number = 8): IraqiLocationEntry[] {
  const rawClean = query.trim();
  if (!rawClean) return [];

  const normQuery = normalizeArabicSearchText(rawClean);
  if (!normQuery) return [];

  // Stopwords to ignore in token overlap calculation
  const stopwords = new Set([
    'في',
    'من',
    'الى',
    'علي',
    'على',
    'عن',
    'حقل',
    'موقع',
    'منطقة',
    'منطقه',
    'محافظة',
    'محافظه',
    'قضاء',
    'ناحية',
    'ناحيه',
    'مشروع',
    'شركة',
    'شركه',
    'مدينة',
    'مدينه',
    'شارع',
    'حي',
    'مجمع',
  ]);

  const queryTokens = normQuery
    .split(' ')
    .filter((t) => t.length > 1 && !stopwords.has(t));

  const scoredEntries: { entry: IraqiLocationEntry; score: number }[] = [];

  for (const entry of IRAQ_GAZETTEER) {
    let score = 0;
    const normName = normalizeArabicSearchText(entry.nameAr);
    const normGov = normalizeArabicSearchText(entry.governorate);
    const normDesc = normalizeArabicSearchText(entry.description);
    const normEn = (entry.nameEn || '').toLowerCase();
    const allAliases = entry.aliases.map(normalizeArabicSearchText);

    // 1. Exact alias match (Super high score)
    if (allAliases.includes(normQuery) || normName === normQuery) {
      score += 1000;
    }

    // 2. Direct full-phrase substring match
    if (normName.includes(normQuery)) {
      score += 500;
    } else if (allAliases.some((a) => a.includes(normQuery))) {
      score += 400;
    } else if (normQuery.includes(normName)) {
      score += 350;
    }

    // 3. Match in English name
    if (normEn && (normEn === rawClean.toLowerCase() || normEn.includes(rawClean.toLowerCase()))) {
      score += 300;
    }

    // 4. Token Overlap Scoring
    if (queryTokens.length > 0) {
      let matchedTokens = 0;
      for (const token of queryTokens) {
        if (
          normName.includes(token) ||
          allAliases.some((a) => a.includes(token)) ||
          normGov.includes(token) ||
          normDesc.includes(token)
        ) {
          matchedTokens++;
          score += 60;
        }
      }
      if (matchedTokens === queryTokens.length) {
        score += 150; // All meaningful tokens matched
      }
    }

    // 5. Governorate exact mention bonus if part of query
    if (normQuery.includes(normGov)) {
      score += 40;
    }

    if (score > 0) {
      scoredEntries.push({ entry, score });
    }
  }

  scoredEntries.sort((a, b) => b.score - a.score);
  return scoredEntries.slice(0, maxResults).map((s) => s.entry);
}

