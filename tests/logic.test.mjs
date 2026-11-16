// اختبارات منطق الترميز ومواعيد الكشف (المهمة 3-ب). تُشغَّل عبر tsx لأنها تستورد ملفات TypeScript مباشرة.
// منطقة زمنية غرب غرينتش عمداً: تكشف أي حساب تاريخ يتأثر بالتوقيت.
process.env.TZ = 'America/Los_Angeles';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const codes = await import('../src/utils/unitAndRoomCodeUtils.ts');
const sched = await import('../src/utils/inspectionSchedule.ts');
const dates = await import('../src/utils/dateFormat.ts');
const sla = await import('../src/utils/maintenanceSla.ts');

describe('رمز الوحدة', () => {
  test('أربعة مقاطع: المحافظة-الحقل-النوع-أربعة حروف', () => {
    const code = codes.generateUnitCode('was', 'ahd', 'bld', []);
    assert.match(code, /^WAS-AHD-BLD-[A-Z]{4}$/);
    assert.equal(codes.validateUnitCodeFormat(code).isValid, true);
  });

  test('ينظّف المدخلات ويضع القيم الافتراضية عند الفراغ', () => {
    assert.match(codes.generateUnitCode(' w-s ', 'a h d', 'c.r.v'), /^WS-AHD-CRV-[A-Z]{4}$/);
    assert.match(codes.generateUnitCode('', '', ''), /^EBD-EBD-BLD-[A-Z]{4}$/);
    assert.match(codes.generateUnitCode('واسط', '!!', '--'), /^EBD-EBD-BLD-[A-Z]{4}$/);
  });

  test('المقطع الفريد لا يتكرر مع وحدة موجودة', () => {
    const original = Math.random;
    // أول أربع سحبات تعطي AAAA (موجود)، ثم سحبات تعطي BBBB
    let calls = 0;
    Math.random = () => (calls++ < 4 ? 0 : 1 / 26 + 0.001);
    try {
      const code = codes.generateUnitCode('WAS', 'AHD', 'BLD', [{ code: 'BGD-RML-CRV-AAAA' }]);
      assert.equal(code, 'WAS-AHD-BLD-BBBB');
    } finally {
      Math.random = original;
    }
  });

  test('ألف رمز متتالٍ كلها فريدة', () => {
    const units = [];
    for (let i = 0; i < 1000; i++) units.push({ code: codes.generateUnitCode('WAS', 'AHD', 'BLD', units) });
    assert.equal(new Set(units.map((u) => u.code.split('-')[3])).size, 1000);
  });

  test('التحقق من الصيغة', () => {
    assert.equal(codes.validateUnitCodeFormat('').isValid, false);
    assert.equal(codes.validateUnitCodeFormat('WAS-AHD-BLD').isValid, false);
    assert.equal(codes.validateUnitCodeFormat('WAS-AHD-BLD-AB').isValid, false);
    assert.equal(codes.validateUnitCodeFormat('WAS-AHD-BLD-AB$D').isValid, false);
    assert.equal(codes.validateUnitCodeFormat('WS-AHD-BLD-014').isValid, true, 'الصيغة الرقمية القديمة مقبولة');
  });

  test('استخراج المقطع الفريد من الرمز', () => {
    assert.equal(codes.extractUnitUniqueAlphaSuffix('EBD-EBD-BLD-ABCD'), 'ABCD');
    assert.equal(codes.extractUnitUniqueAlphaSuffix('WS-AHD-BLD-014'), 'A014');
    assert.equal(codes.extractUnitUniqueAlphaSuffix('WS-AHD-BLD-ABCDEF'), 'ABCD');
    assert.equal(codes.extractUnitUniqueAlphaSuffix('T-1'), 'T1XX');
    assert.equal(codes.extractUnitUniqueAlphaSuffix(''), 'BLDG');
  });
});

describe('رمز الغرفة وتسلسلها', () => {
  test('رقم الطابق من النص', () => {
    assert.equal(codes.extractFloorNumber('الطابق 2'), 2);
    assert.equal(codes.extractFloorNumber('الطابق ٣'), 3, 'أرقام عربية');
    assert.equal(codes.extractFloorNumber('F12'), 12);
    assert.equal(codes.extractFloorNumber(4), 4);
    assert.equal(codes.extractFloorNumber('الأرضي'), 1);
    assert.equal(codes.extractFloorNumber(undefined), 1);
    assert.equal(codes.extractFloorNumber(0), 1);
  });

  test('التسلسل: الطابق × 100 + الترتيب', () => {
    assert.equal(codes.calculateRoomSequenceNumber(1, 1), 101);
    assert.equal(codes.calculateRoomSequenceNumber(2, 14), 214);
    assert.equal(codes.calculateRoomSequenceNumber(0, 0), 101);
  });

  test('صيغة رمز الغرفة: المقطع الفريد-الطابق-النوع-التسلسل', () => {
    assert.match(codes.generateRoomCode('EBD-EBD-BLD-ABCD', 2, 'OFF', 3), /^ABCD-F2-[A-Z]{2,4}-203$/);
    assert.match(codes.generateRoomCode('EBD-EBD-BLD-ABCD', 2, 'OFF', 203, true), /^ABCD-F2-[A-Z]{2,4}-203$/);
  });

  test('إعادة التسلسل: عدّاد لكل طابق ورموز فريدة داخل الوحدة', () => {
    const rooms = [
      { id: 'a', name: 'أ', type: 'مكتب', floor: 'الطابق 1' },
      { id: 'b', name: 'ب', type: 'مكتب', floor: 'الطابق 2' },
      { id: 'c', name: 'ج', type: 'مكتب', floor: 'الطابق 1' },
      { id: 'd', name: 'د', type: 'مكتب', floor: 'الطابق ٢' },
      { id: 'e', name: 'هـ', type: 'مكتب' },
    ];
    const out = codes.normalizeUnitRoomsSequence('EBD-EBD-BLD-ABCD', rooms);
    assert.deepEqual(out.map((r) => r.sequenceNumber), [101, 201, 102, 202, 103]);
    assert.equal(new Set(out.map((r) => r.code)).size, rooms.length);
    assert.ok(out.every((r) => r.code.startsWith('ABCD-F')));
    assert.equal(out[4].floor, 'الطابق 1', 'غرفة بلا طابق تُنسب للأول');
    assert.deepEqual(codes.normalizeUnitRoomsSequence('X', []), []);
  });

  test('أكثر من 99 غرفة في طابق: الرموز تبقى فريدة بفضل مقطع الطابق', () => {
    const rooms = [];
    for (let i = 0; i < 120; i++) rooms.push({ id: `r${i}`, name: `غ${i}`, type: 'مكتب', floor: 'الطابق 1' });
    for (let i = 0; i < 5; i++) rooms.push({ id: `s${i}`, name: `ط${i}`, type: 'مكتب', floor: 'الطابق 2' });
    const out = codes.normalizeUnitRoomsSequence('EBD-EBD-BLD-ABCD', rooms);
    assert.equal(new Set(out.map((r) => r.code)).size, rooms.length);
  });

  test('الرمز القياسي لغرفة ضمن وحدتها يطابق إعادة التسلسل', () => {
    const rooms = codes.normalizeUnitRoomsSequence('EBD-EBD-BLD-ABCD', [
      { id: 'a', name: 'أ', type: 'مكتب', floor: 'الطابق 1' },
      { id: 'b', name: 'ب', type: 'مكتب', floor: 'الطابق 1' },
    ]);
    assert.equal(codes.getStandardRoomCode('EBD-EBD-BLD-ABCD', rooms[1], rooms), rooms[1].code);
  });
});

describe('مواعيد الكشف الدوري', () => {
  test('أيام الدورة لكل تكرار', () => {
    assert.equal(sched.frequencyDays('monthly'), 30);
    assert.equal(sched.frequencyDays('quarterly'), 90);
    assert.equal(sched.frequencyDays('semi_annual'), 180);
    assert.equal(sched.frequencyDays('annual'), 365);
    assert.equal(sched.frequencyDays('custom', 45), 45);
    assert.equal(sched.frequencyDays('custom', 0), 30);
    assert.equal(sched.frequencyDays('custom', undefined), 30);
    assert.equal(sched.frequencyDays('custom', -5), 30);
  });

  test('الموعد القادم عبر نهاية الشهر والسنة والسنة الكبيسة', () => {
    assert.equal(sched.calculateNextDueDate('2026-11-14', 'monthly'), '2026-12-14');
    assert.equal(sched.calculateNextDueDate('2026-12-15', 'monthly'), '2027-01-14');
    assert.equal(sched.calculateNextDueDate('2026-11-14', 'quarterly'), '2027-02-12');
    assert.equal(sched.calculateNextDueDate('2027-12-31', 'annual'), '2028-12-30', '2028 كبيسة');
    assert.equal(sched.calculateNextDueDate('2028-02-28', 'custom', 2), '2028-03-01');
    assert.equal(sched.calculateNextDueDate('2026-11-14T22:30:00.000Z', 'custom', 1), '2026-11-15', 'الوقت يُهمل');
  });

  test('تاريخ فارغ أو غير صالح يُحسب من اليوم', () => {
    assert.equal(sched.calculateNextDueDate('', 'monthly', undefined, '2026-01-01'), '2026-01-31');
    assert.equal(sched.calculateNextDueDate('2026-02-31', 'monthly', undefined, '2026-01-01'), '2026-01-31');
    assert.equal(sched.calculateNextDueDate('هراء', 'custom', 10, '2026-01-01'), '2026-01-11');
  });

  test('تاريخ اليوم محلي لا عالمي (بعد منتصف الليل لا يرجع يوماً)', () => {
    // 00:30 محلياً يوم 15 = يوم 15 حتى لو كان التوقيت العالمي مختلفاً
    assert.equal(sched.todayDateString(new Date(2026, 10, 15, 0, 30)), '2026-11-15');
    assert.equal(sched.todayDateString(new Date(2026, 10, 15, 23, 59)), '2026-11-15');
  });

  test('أيام التأخير', () => {
    assert.equal(sched.daysOverdue('2026-11-14', '2026-11-14'), 0, 'يوم الاستحقاق ليس تأخيراً');
    assert.equal(sched.daysOverdue('2026-11-14', '2026-11-15'), 1);
    assert.equal(sched.daysOverdue('2026-11-14', '2026-11-10'), 0);
    assert.equal(sched.daysOverdue('2025-11-14', '2026-11-14'), 365);
    assert.equal(sched.daysOverdue('', '2026-11-14'), 0);
  });

  test('الحالة الفعلية', () => {
    const today = '2026-11-14';
    const st = (status, nextDueDate) => sched.effectiveInspectionStatus({ status, nextDueDate }, today);
    assert.equal(st('scheduled', '2026-11-13'), 'overdue');
    assert.equal(st('in_progress', '2026-11-01'), 'overdue');
    assert.equal(st('scheduled', '2026-11-14'), 'scheduled');
    assert.equal(st('in_progress', '2026-12-01'), 'in_progress');
    assert.equal(st('overdue', '2026-12-01'), 'scheduled', 'أُجّل موعده');
    assert.equal(st('overdue', '2026-11-01'), 'overdue');
    assert.equal(st('completed', '2020-01-01'), 'completed');
    assert.equal(st('cancelled', '2020-01-01'), 'cancelled');
    assert.equal(st('scheduled', ''), 'scheduled', 'بلا موعد');
  });

  test('القائمة: السجل غير المتغير يبقى نفسه', () => {
    const a = { id: 1, status: 'scheduled', nextDueDate: '2026-12-01' };
    const b = { id: 2, status: 'scheduled', nextDueDate: '2026-01-01' };
    const out = sched.withEffectiveStatuses([a, b], '2026-11-14');
    assert.equal(out[0], a);
    assert.equal(out[1].status, 'overdue');
    assert.equal(b.status, 'scheduled', 'الأصل لا يُعدَّل');
  });
});

describe('توحيد صيغة التواريخ', () => {
  const norm = (v) => dates.normalizeDateValue(v, '2026-11-14');

  test('الصيغة الموحدة تُقبل كما هي', () => {
    assert.deepEqual(norm('2026-11-14'), { ok: true, value: '2026-11-14' });
    assert.deepEqual(norm('2026-11-14T08:30:00.000Z'), { ok: true, value: '2026-11-14T08:30:00.000Z' });
    assert.deepEqual(norm(''), { ok: true, value: '' });
    assert.deepEqual(norm(undefined), { ok: true, value: undefined });
    assert.deepEqual(norm(null), { ok: true, value: null });
  });

  test('الصيغ القديمة تُحوَّل', () => {
    assert.equal(norm('2026/11/4').value, '2026-11-04');
    assert.equal(norm('14-11-2026').value, '2026-11-14');
    assert.equal(norm('4/1/2026').value, '2026-01-04', 'يوم/شهر/سنة');
    assert.equal(norm('١٤-١١-٢٠٢٦').value, '2026-11-14');
    assert.equal(norm(' 2026-11-14 ').value, '2026-11-14');
    assert.equal(norm('الآن').value, '2026-11-14');
    assert.equal(norm('الآن (تحديث شامل)').value, '2026-11-14');
  });

  test('ما ليس تاريخاً يُرفض', () => {
    for (const bad of ['2026-02-31', '2026-13-01', '31/02/2026', 'غداً', '14 تشرين الثاني', '20261114', '1800-01-01', 20261114, {}]) {
      assert.equal(norm(bad).ok, false, String(bad));
    }
  });

  test('السجل: الحقل المرفوض يُسمّى، والقوائم الداخلية تُوحَّد دون رفض', () => {
    const bad = dates.normalizeRecordDates('inspections', { id: 'I', nextDueDate: 'قريباً' });
    assert.match(bad.error, /موعد الكشف القادم/);
    const unit = { code: 'U', lastUpdated: 'الآن', attachments: [{ id: 'a', uploadDate: '14/11/2026' }, { id: 'b', uploadDate: 'أمس' }], equipment: [{ id: 'e' }] };
    const res = dates.normalizeRecordDates('units', unit, { today: '2026-11-14' });
    assert.equal(res.error, null);
    assert.equal(res.record.lastUpdated, '2026-11-14');
    assert.equal(res.record.attachments[0].uploadDate, '2026-11-14');
    assert.equal(res.record.attachments[1].uploadDate, 'أمس', 'غير المفهوم داخل القوائم يبقى');
    assert.equal(unit.lastUpdated, 'الآن', 'الأصل لا يُعدَّل');
    const same = { id: 'M', createdAt: '2026-11-14' };
    assert.equal(dates.normalizeRecordDates('maintenance', same).record, same, 'سجل سليم يعود هو نفسه');
    assert.equal(dates.normalizeRecordDates('maintenance', { id: 'M', createdAt: 'x' }, { lenient: true }).error, null);
    assert.equal(dates.normalizeRecordDates('orgEntities', { id: 'o', createdAt: 'x' }).error, null, 'مجموعة بلا حقول تاريخ');
  });
});

describe('تأخير طلبات الصيانة (5-و)', () => {
  const req = (over) => ({ status: 'open', priority: 'normal', createdAt: '2026-11-01', ...over });

  test('موعد الإنجاز من الأولوية', () => {
    assert.equal(sla.maintenanceSlaDeadline('2026-11-01', 'critical'), '2026-11-02');
    assert.equal(sla.maintenanceSlaDeadline('2026-11-01', 'normal'), '2026-11-04');
    assert.equal(sla.maintenanceSlaDeadline('2026-11-01', 'low'), '2026-11-08');
    assert.equal(sla.maintenanceSlaDeadline('2026-11-01', undefined), '2026-11-04', 'بلا أولوية = عادي');
  });

  test('عدد أيام التأخير يُحسب من الموعد المخزّن', () => {
    const r = req({ slaDeadline: '2026-11-10' });
    assert.equal(sla.maintenanceDaysOverdue(r, '2026-11-10'), 0, 'يوم الاستحقاق ليس تأخيراً');
    assert.equal(sla.maintenanceDaysOverdue(r, '2026-11-13'), 3);
    assert.equal(sla.maintenanceDaysOverdue(r, '2026-11-01'), 0);
  });

  test('بلا موعد مخزّن يُحسب من تاريخ الطلب وأولويته', () => {
    assert.equal(sla.maintenanceDaysOverdue(req({ priority: 'critical' }), '2026-11-05'), 3);
    assert.equal(sla.maintenanceDaysOverdue(req({ slaDeadline: 'غداً' }), '2026-11-05'), 1, 'موعد غير صالح يُتجاهل');
  });

  test('الطلبات المغلقة بلا تأخير', () => {
    for (const status of ['completed', 'cancelled', 'rejected']) {
      assert.equal(sla.maintenanceDaysOverdue(req({ status, slaDeadline: '2026-01-01' }), '2026-11-13'), 0, status);
      assert.equal(sla.effectiveMaintenanceStatus(req({ status, slaDeadline: '2026-01-01' }), '2026-11-13'), status);
    }
  });

  test('الحالة الفعلية', () => {
    const late = { slaDeadline: '2026-11-10' };
    assert.equal(sla.effectiveMaintenanceStatus(req(late), '2026-11-13'), 'overdue');
    assert.equal(sla.effectiveMaintenanceStatus(req({ ...late, status: 'assigned' }), '2026-11-13'), 'overdue');
    assert.equal(sla.effectiveMaintenanceStatus(req({ ...late, status: 'in_progress' }), '2026-11-13'), 'in_progress', 'العمل الجاري لا تتغير حالته');
    assert.equal(sla.effectiveMaintenanceStatus(req({ ...late, status: 'overdue' }), '2026-11-01'), 'open', 'لم يعد متأخراً');
  });

  test('withMaintenanceOverdue يضيف الأيام ولا ينسخ السجل بلا داع', () => {
    const list = [req({ id: 'A', slaDeadline: '2026-11-10' }), req({ id: 'B', slaDeadline: '2026-12-30', daysOverdue: 0 })];
    const out = sla.withMaintenanceOverdue(list, '2026-11-13');
    assert.equal(out[0].daysOverdue, 3);
    assert.equal(out[0].status, 'overdue');
    assert.equal(out[1], list[1], 'ما لم يتغير يبقى هو نفسه');
    assert.equal(list[0].daysOverdue, undefined, 'الأصل لا يُعدَّل');
  });
});
