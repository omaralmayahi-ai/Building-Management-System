import React from 'react';
import { UnitAsset, SystemBranding } from '../types';
import { toArabicDigits, getServerDateFormatted } from '../utils/arabicUtils';
import { Printer, ShieldCheck } from 'lucide-react';

interface ExportDossierModalProps {
  unit: UnitAsset;
  branding?: SystemBranding;
  onClose: () => void;
}

export const ExportDossierModal: React.FC<ExportDossierModalProps> = ({ unit, branding, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-6 text-xs text-slate-200 my-auto max-h-[95vh] overflow-y-auto">
        {/* Top Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-5 h-5 object-contain shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span className="font-bold text-slate-100 text-xs sm:text-sm truncate">الاضبارة الفنية الرسمية للمنشأة</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الاضبارة</span>
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        {/* Printable Official Document Sheet */}
        <div className="bg-white text-slate-950 p-6 rounded-xl space-y-5 border shadow-2xl font-sans print:p-0 print:border-none relative">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-950 pb-4 space-y-1 relative">
            {branding?.logoUrl && (
              <img
                src={branding.logoUrl}
                alt="System Logo"
                className="w-16 h-16 object-contain absolute right-2 top-0 print:block"
              />
            )}
            <div className="text-xs font-bold text-slate-600">
              {branding?.countryName || 'جمهورية العراق'} - {branding?.ministryName || 'وزارة النفط'}
            </div>
            <h1 className="text-lg font-black tracking-wide text-slate-950">
              {branding?.companyName || 'شركة نفط الوسط (Midland Oil Company)'}
            </h1>
            <h2 className="text-sm font-bold text-amber-700">
              {branding?.systemName || 'هيئة التفتيش والسلامة الهندسية - الاضبارة الفنية للأصول'}
            </h2>
            <div className="text-[10px] text-slate-500 font-mono mt-1">تاريخ الإصدار: {getServerDateFormatted()}</div>
          </div>

          {/* Key Identifiers Grid */}
          <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-slate-50 font-mono text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">رمز الأصل الموحد:</span>
              <span className="font-bold text-amber-800 text-sm">{unit.code}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">درجة السلامة العامة:</span>
              <span className="font-bold text-emerald-700 text-sm">Grade {unit.conditionGrade}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">اسم المنشأة:</span>
              <span className="font-bold text-slate-900">{unit.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">الحقل والموقع:</span>
              <span className="font-bold text-slate-900">{unit.field} - {unit.siteName}</span>
            </div>
          </div>

          {/* Attributes List */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 border-b pb-1">1. المواصفات الهندسية والجغرافية</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>المساحة البنائية: <strong className="font-bold">{unit.totalAreaSqM} م²</strong></div>
              <div>سنة الإنشاء: <strong className="font-bold">{unit.constructionYear}</strong></div>
              <div>عدد الطوابق: <strong className="font-bold">{unit.floorsCount}</strong></div>
              <div>الجهة الشاغلة: <strong className="font-bold">{unit.department}</strong></div>
              {unit.buildingShape && (
                <div className="col-span-2">شكل وتصميم المبنى: <strong className="font-bold text-amber-800">{unit.buildingShape}</strong></div>
              )}
              <div className="col-span-2">الإحداثيات (GPS): <strong className="font-mono">{unit.coordinates.lat}° N, {unit.coordinates.lng}° E</strong></div>
              <div className="col-span-2">العنوان الميداني: <strong>{unit.sectorAddress}</strong></div>
            </div>
          </div>

          {/* Rooms Summary */}
          <div className="space-y-2 text-xs">
            <h3 className="font-bold text-slate-900 border-b pb-1">2. بيان الغرف والتقسيمات الداخلية</h3>
            <table className="w-full text-right border text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b">
                  <th className="p-1.5">الرمز</th>
                  <th className="p-1.5">اسم الغرفة</th>
                  <th className="p-1.5">الاستخدام</th>
                  <th className="p-1.5">المساحة</th>
                </tr>
              </thead>
              <tbody>
                {unit.rooms.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="p-1.5 font-mono">{r.id}</td>
                    <td className="p-1.5 font-bold">{r.name}</td>
                    <td className="p-1.5">{r.type}</td>
                    <td className="p-1.5">{r.areaSqM} م²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-[11px] border-t border-slate-300 mt-6">
            <div>
              <p className="font-bold text-slate-900">مهندس المعاينة والتدقيق</p>
              <p className="text-slate-500 mt-6">التوقيع: ...........................</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">مصادقة رئيس هيئة التفتيش الهندسي</p>
              <p className="text-slate-500 mt-6">الختم والتوقيع: ...........................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
