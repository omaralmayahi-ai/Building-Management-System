// نافذة تعديل الوحدة: غلاف رقيق فوق النموذج الموحد UnitForm (4-ك)
import React from 'react';
import { UnitForm } from './UnitForm';

type UnitFormProps = React.ComponentProps<typeof UnitForm>;

export const EditUnitModal: React.FC<Omit<UnitFormProps, 'mode' | 'layout'>> = (props) => <UnitForm {...props} mode="edit" layout="modal" />;
