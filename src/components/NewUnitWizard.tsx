// تسجيل وحدة جديدة: غلاف فوق النموذج الموحد UnitForm (4-ك). هنا المسودة الفارغة فقط؛
// بعد الحفظ ينقل App.tsx المستخدم إلى صفحة الوحدة الجديدة (رمزها وبطاقة QR هناك).
import React, { useMemo } from 'react';
import { UnitAsset, ConditionGrade, GovernorateRef, OilfieldRef, ReferenceUnitType, EquipmentTypeRef, OrgEntity } from '../types';
import { UnitForm } from './UnitForm';
import { getServerIsoDateOnly } from '../utils/arabicUtils';

interface NewUnitWizardProps {
  governorates: GovernorateRef[];
  oilfields: OilfieldRef[];
  unitTypes: ReferenceUnitType[];
  equipmentTypes?: EquipmentTypeRef[];
  existingUnits?: UnitAsset[];
  orgEntities?: OrgEntity[];
  onAddOrgEntity?: (newEntity: OrgEntity) => void;
  onAddUnit: (unit: UnitAsset) => void;
  onAddGovernorate?: (gov: GovernorateRef) => void;
  onAddOilfield?: (field: OilfieldRef) => void;
  onAddUnitType?: (type: ReferenceUnitType) => void;
  onAddEquipmentType?: (eq: EquipmentTypeRef) => void;
  onCancel: () => void;
  theme?: 'dark' | 'light';
}

export const NewUnitWizard: React.FC<NewUnitWizardProps> = ({
  governorates,
  oilfields,
  unitTypes,
  existingUnits = [],
  orgEntities = [],
  onAddOrgEntity,
  onAddUnit,
  onAddGovernorate,
  onAddOilfield,
  onAddUnitType,
  onCancel,
  theme = 'dark',
}) => {
  // مسودة فارغة: أول محافظة وحقل ونوع فعّالة، وأبعاد ابتدائية يعدّلها المستخدم
  const draft = useMemo<UnitAsset>(() => {
    const gov = governorates.find((g) => g.status !== 'disabled');
    const fld = oilfields.find((f) => f.status !== 'disabled' && (!gov || f.governorateId === gov.id));
    const ut = unitTypes.find((t) => t.status !== 'disabled');
    const utCode = ut?.code || 'BLD';
    return {
      id: '',
      code: '',
      name: '',
      type: (utCode === 'CRV' ? 'caravan' : utCode === 'BLD' ? 'building' : utCode === 'WHS' ? 'warehouse' : utCode) as UnitAsset['type'],
      unitTypeCode: utCode,
      siteId: '',
      siteName: '',
      field: fld?.nameAr || '',
      governorate: gov?.nameAr || '',
      conditionGrade: '' as unknown as ConditionGrade,
      constructionYear: Number(getServerIsoDateOnly().slice(0, 4)),
      department: '',
      departments: [],
      coordinates: { lat: 32.6189, lng: 45.7531 },
      sectorAddress: '',
      totalAreaSqM: 96,
      lengthM: 12,
      widthM: 8,
      heightM: 3,
      floorsCount: 1,
      rooms: [],
      equipment: [],
      attachments: [],
      attachmentsCount: 0,
      lastUpdated: getServerIsoDateOnly(),
    } as UnitAsset;
    // المسودة تُبنى مرة واحدة عند فتح الشاشة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UnitForm
      mode="create"
      layout="page"
      unit={draft}
      governorates={governorates}
      oilfields={oilfields}
      unitTypes={unitTypes}
      existingUnits={existingUnits}
      orgEntities={orgEntities}
      onAddOrgEntity={onAddOrgEntity}
      onAddGovernorate={onAddGovernorate}
      onAddOilfield={onAddOilfield}
      onAddUnitType={onAddUnitType}
      theme={theme}
      onSave={onAddUnit}
      onClose={onCancel}
    />
  );
};
