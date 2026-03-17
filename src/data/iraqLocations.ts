/**
 * Iraq geographic data — Country → Governorate → Districts/Neighborhoods
 */

export interface District {
  label: string;
  city: string; // value stored in DB (English, for geocode matching)
}

export interface Governorate {
  label: string;       // Arabic display
  city: string;        // English city value (for geocode)
  districts: District[];
}

export const IRAQ_GOVERNORATES: Governorate[] = [
  {
    label: 'بغداد',
    city: 'Baghdad',
    districts: [
      { label: 'الكرخ', city: 'Baghdad' },
      { label: 'الرصافة', city: 'Baghdad' },
      { label: 'المنصور', city: 'Baghdad' },
      { label: 'الكرادة', city: 'Baghdad' },
      { label: 'المدينة', city: 'Baghdad' },
      { label: 'الزعفرانية', city: 'Baghdad' },
      { label: 'الدورة', city: 'Baghdad' },
      { label: 'الأعظمية', city: 'Baghdad' },
      { label: 'الكاظمية', city: 'Baghdad' },
      { label: 'الشعلة', city: 'Baghdad' },
      { label: 'الشعب', city: 'Baghdad' },
      { label: 'بغداد الجديدة', city: 'Baghdad' },
      { label: 'الجادرية', city: 'Baghdad' },
      { label: 'فلسطين', city: 'Baghdad' },
      { label: 'النهروان', city: 'Baghdad' },
    ],
  },
  {
    label: 'البصرة',
    city: 'Basra',
    districts: [
      { label: 'مركز البصرة', city: 'Basra' },
      { label: 'الزبير', city: 'Basra' },
      { label: 'أبو الخصيب', city: 'Basra' },
      { label: 'القرنة', city: 'Basra' },
      { label: 'المدينة', city: 'Basra' },
      { label: 'شط العرب', city: 'Basra' },
    ],
  },
  {
    label: 'أربيل',
    city: 'Erbil',
    districts: [
      { label: 'مركز أربيل', city: 'Erbil' },
      { label: 'كوية', city: 'Erbil' },
      { label: 'شقلاوة', city: 'Erbil' },
      { label: 'سوران', city: 'Erbil' },
    ],
  },
  {
    label: 'نينوى',
    city: 'Mosul',
    districts: [
      { label: 'الموصل الأيمن', city: 'Mosul' },
      { label: 'الموصل الأيسر', city: 'Mosul' },
      { label: 'تلعفر', city: 'Mosul' },
      { label: 'سنجار', city: 'Mosul' },
    ],
  },
  {
    label: 'النجف',
    city: 'Najaf',
    districts: [
      { label: 'مركز النجف', city: 'Najaf' },
      { label: 'الكوفة', city: 'Najaf' },
      { label: 'المناذرة', city: 'Najaf' },
    ],
  },
  {
    label: 'كربلاء',
    city: 'Karbala',
    districts: [
      { label: 'مركز كربلاء', city: 'Karbala' },
      { label: 'عين التمر', city: 'Karbala' },
    ],
  },
  {
    label: 'كركوك',
    city: 'Kirkuk',
    districts: [
      { label: 'مركز كركوك', city: 'Kirkuk' },
      { label: 'الحويجة', city: 'Kirkuk' },
      { label: 'دبس', city: 'Kirkuk' },
    ],
  },
  {
    label: 'الأنبار',
    city: 'Anbar',
    districts: [
      { label: 'الرمادي', city: 'Anbar' },
      { label: 'الفلوجة', city: 'Anbar' },
      { label: 'هيت', city: 'Anbar' },
    ],
  },
  {
    label: 'ديالى',
    city: 'Diyala',
    districts: [
      { label: 'بعقوبة', city: 'Diyala' },
      { label: 'الخالص', city: 'Diyala' },
      { label: 'المقدادية', city: 'Diyala' },
    ],
  },
  {
    label: 'بابل',
    city: 'Babylon',
    districts: [
      { label: 'الحلة', city: 'Babylon' },
      { label: 'المحاويل', city: 'Babylon' },
      { label: 'المسيب', city: 'Babylon' },
    ],
  },
  {
    label: 'ذي قار',
    city: 'Dhi Qar',
    districts: [
      { label: 'الناصرية', city: 'Dhi Qar' },
      { label: 'الرفاعي', city: 'Dhi Qar' },
    ],
  },
  {
    label: 'ميسان',
    city: 'Maysan',
    districts: [
      { label: 'العمارة', city: 'Maysan' },
      { label: 'قلعة صالح', city: 'Maysan' },
    ],
  },
  {
    label: 'المثنى',
    city: 'Muthanna',
    districts: [
      { label: 'السماوة', city: 'Muthanna' },
      { label: 'الرميثة', city: 'Muthanna' },
    ],
  },
  {
    label: 'القادسية',
    city: 'Diwaniyah',
    districts: [
      { label: 'الديوانية', city: 'Diwaniyah' },
      { label: 'الشامية', city: 'Diwaniyah' },
    ],
  },
  {
    label: 'واسط',
    city: 'Wasit',
    districts: [
      { label: 'الكوت', city: 'Wasit' },
      { label: 'الحي', city: 'Wasit' },
    ],
  },
  {
    label: 'صلاح الدين',
    city: 'Saladin',
    districts: [
      { label: 'تكريت', city: 'Saladin' },
      { label: 'بيجي', city: 'Saladin' },
      { label: 'سامراء', city: 'Saladin' },
    ],
  },
  {
    label: 'السليمانية',
    city: 'Sulaymaniyah',
    districts: [
      { label: 'مركز السليمانية', city: 'Sulaymaniyah' },
      { label: 'حلبجة', city: 'Sulaymaniyah' },
    ],
  },
  {
    label: 'دهوك',
    city: 'Duhok',
    districts: [
      { label: 'مركز دهوك', city: 'Duhok' },
      { label: 'زاخو', city: 'Duhok' },
    ],
  },
];
