import React, { useState } from 'react';
import { Building2, X, Plus, AlertCircle, Users, GitFork } from 'lucide-react';
import { OrgEntity, OrgLevel } from '../types';

interface QuickAddOrgEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
  orgEntities: OrgEntity[];
  onAddOrgEntity: (newEntity: OrgEntity) => void;
  onSelectNewlyCreated?: (entityName: string, entityId: string) => void;
}

export const QuickAddOrgEntityModal: React.FC<QuickAddOrgEntityModalProps> = ({
  isOpen,
  onClose,
  isLight = false,
  orgEntities,
  onAddOrgEntity,
  onSelectNewlyCreated,
}) => {
  const [nameAr, setNameAr] = useState('');
  const [parentId, setParentId] = useState<string>(orgEntities[0]?.id || '');
  const [code, setCode] = useState('');
  const [level, setLevel] = useState<OrgLevel>('department');
  const [employeeCount, setEmployeeCount] = useState<number>(15);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const activeEntities = orgEntities.filter((e) => e.status === 'active');

  const levelLabels: Record<OrgLevel, string> = {
    company: 'الشركة / المؤسسة',
    director_general: 'المدير العام',
    deputy_director: 'معاون المدير العام',
    central_dept: 'هيئة / قسم مركزي',
    department: 'قسم',
    section: 'شعبة',
    unit: 'وحدة',
  };

  const getEntityPath = (entity: OrgEntity): string => {
    let path = entity.nameAr;
    let currParentId = entity.parentId;
    let depth = 0;
    while (currParentId && depth < 5) {
      const parent = orgEntities.find((e) => e.id === currParentId);
      if (parent) {
        path = `${parent.nameAr} ➔ ${path}`;
        currParentId = parent.parentId;
      } else {
        break;
      }
      depth++;
    }
    return path;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setErrorMsg('يرجى إدخال اسم الجهة / التشكيل التنظيمي');
      return;
    }
    if (!parentId && activeEntities.length > 0) {
      setErrorMsg('يرجى اختيار الجهة الأم لربط التشكيل بالهيكل التنظيمي للمؤسسة');
      return;
    }

    const generatedCode =
      code.trim() ||
      `ORG-${Date.now().toString().slice(-4)}`;

    const newOrgNode: OrgEntity = {
      id: `ORG-${Date.now()}`,
      code: generatedCode,
      nameAr: nameAr.trim(),
      parentId: parentId || null,
      level,
      employeeCount: Number(employeeCount) || 0,
      status: 'active',
    };

    onAddOrgEntity(newOrgNode);

    if (onSelectNewlyCreated) {
      onSelectNewlyCreated(newOrgNode.nameAr, newOrgNode.id);
    }

    // Reset Form
    setNameAr('');
    setCode('');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[110] overflow-y-auto">
      <div
        className={`max-w-lg w-full p-4 sm:p-6 rounded-2xl border shadow-2xl transition-all max-h-[92vh] flex flex-col ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b mb-3 shrink-0 ${
          isLight ? 'border-slate-200' : 'border-slate-800/30'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">إضافة جهة شاغلة جديدة وربطها بالهيكل التنظيمي</h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                ربط التشكيل مباشرة في شجرة المؤسسة وتحديث القوة البشرية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 font-bold shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto flex-1 pr-1">
          {/* Entity Name */}
          <div>
            <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              اسم الجهة / التشكيل الجديد <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nameAr}
              onChange={(e) => {
                setNameAr(e.target.value);
                setErrorMsg('');
              }}
              placeholder="مثال: قسم صيانة الآبار والمعدات / شعبة الأبنية"
              className={`w-full border rounded-xl p-3 font-bold focus:border-amber-500 outline-none transition ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
              autoFocus
            />
          </div>

          {/* Parent Entity Selection (Mandatory for Org Structure Linking) */}
          <div>
            <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              الجهة الأم (الارتباط في الهيكل التنظيمي) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={parentId}
                onChange={(e) => {
                  setParentId(e.target.value);
                  setErrorMsg('');
                }}
                className={`w-full border rounded-xl p-3 font-bold focus:border-amber-500 outline-none transition cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              >
                {activeEntities.map((ent) => (
                  <option key={ent.id} value={ent.id}>
                    {getEntityPath(ent)}
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-[11px] mt-1 flex items-center gap-1 ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
              <GitFork className="w-3 h-3 shrink-0" />
              <span>شرط ربط التشكيل بالهيكل التنظيمي لتوثيق التبعية وسلسلة المراجع الرسمية.</span>
            </p>
          </div>

          {/* Grid Level & Employee Count */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                المستوى التنظيمي:
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as OrgLevel)}
                className={`w-full border rounded-xl p-2.5 font-bold focus:border-amber-500 outline-none transition cursor-pointer ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                }`}
              >
                {Object.entries(levelLabels).map(([lvlKey, lvlName]) => (
                  <option key={lvlKey} value={lvlKey}>
                    {lvlName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                عدد موظفي/كادر التشكيل:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Math.max(0, parseInt(e.target.value) || 0))}
                  className={`w-full border rounded-xl p-2.5 font-bold focus:border-amber-500 outline-none transition ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">
                  <Users className="w-4 h-4 inline" />
                </span>
              </div>
            </div>
          </div>

          {/* Code */}
          <div>
            <label className={`block font-bold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              رمز التشكيل (اختياري):
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: DEP-AHD-01"
              className={`w-full border rounded-xl p-2.5 font-mono font-bold focus:border-amber-500 outline-none transition ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
              }`}
            />
          </div>

          {/* Footer Actions */}
          <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
            isLight ? 'border-slate-200' : 'border-slate-800/30'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl font-bold transition cursor-pointer ${
                isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>حفظ التشكيل بالهيكل التنظيمي</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
