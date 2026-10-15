import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share2,
  PackageCheck,
  FileArchive,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
  Info,
} from 'lucide-react';

interface MobileAppDistributionCardProps {
  theme?: 'dark' | 'light' | string;
}

export function MobileAppDistributionCard({
  theme = 'light',
}: MobileAppDistributionCardProps) {
  const isDark = theme === 'dark';
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleDownloadApk = () => {
    setDownloadMsg('جاري تنزيل ملف التثبيت أندرويد (MidlandOil-Assets-Registry.apk)...');
    const link = document.createElement('a');
    link.href = '/api/download/apk';
    link.download = 'MidlandOil-Assets-Registry.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadMsg(null), 5000);
  };

  const handleDownloadZip = () => {
    setDownloadMsg('جاري تنزيل حزمة التثبيت الشاملة (MidlandOil-Assets-Installation-Package.zip)...');
    const link = document.createElement('a');
    link.href = '/api/download/package';
    link.download = 'MidlandOil-Assets-Installation-Package.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadMsg(null), 5000);
  };

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border transition-all ${
        isDark
          ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl shadow-black/40'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/30 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg">
                تنزيل وتوزيع حزم تثبيت التطبيق للهواتف الذكية (APK)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                ملفات تنصيب مستقلة
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              تنزيل ملفات التثبيت وإرسالها مباشرة كملفات تنصيب للكوادر الميدانية دون الحاجة لمتصفح
            </p>
          </div>
        </div>
      </div>

      {downloadMsg && (
        <div className="mt-4 p-3 rounded-xl bg-cyan-600 text-white text-xs flex items-center gap-2 animate-fade-in">
          <Download className="w-4 h-4 animate-bounce shrink-0" />
          <span>{downloadMsg}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: APK File */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
            isDark
              ? 'bg-slate-800/60 border-slate-700/80 hover:border-cyan-500/50'
              : 'bg-gradient-to-br from-cyan-50/50 to-blue-50/50 border-cyan-200/80 hover:border-cyan-300'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-600 text-white shrink-0 shadow-sm">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    ملف تثبيت أندرويد (APK)
                  </h4>
                  <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono">
                    MidlandOil-Assets-Registry.apk
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white">
                جاهز للإرسال
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              ملف تنصيب مستقل لهواتف أندرويد يمكن إرساله عبر تطبيق <strong>واتساب</strong> أو <strong>تليغرام</strong> أو <strong>بلوتوث</strong> أو نقله بفلاش ميموري إلى هواتف المهندسين والمفتشين لتثبيته مباشرة بضغطة زر.
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                الحجم: ~80 KB
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                الإصدار: v1.0.0
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadApk}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-700/20 transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تنزيل ملف التنصيب أندرويد (APK)</span>
          </button>
        </div>

        {/* Card 2: Full ZIP Package */}
        <div
          className={`p-4 rounded-2xl border flex flex-col justify-between gap-4 transition-all ${
            isDark
              ? 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
              : 'bg-slate-50 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-700 text-white shrink-0 shadow-sm">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    حزمة التثبيت الشاملة (.ZIP)
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    MidlandOil-Assets-Package.zip
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                حزمة فنية
              </span>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              ملف مضغوط موجه لمهندسي تقنية المعلومات وشُعب الحاسبة، يتضمن ملف الـ APK وأيقونات النظام، دليل التثبيت المصور، وسكربتات التثبيت السريع عبر الكمبيوتر (ADB).
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                الحجم: ~56 KB
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-blue-500" />
                تشمل الأدلة والسكربتات
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تنزيل حزمة التثبيت الكاملة (ZIP)</span>
          </button>
        </div>
      </div>

      {/* Sharing & Installation Steps Banner */}
      <div
        className={`mt-4 p-4 rounded-xl border text-xs space-y-2 ${
          isDark
            ? 'bg-slate-950/40 border-slate-800 text-slate-300'
            : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
        }`}
      >
        <div className="font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
          <Send className="w-4 h-4" />
          <span>طريقة إرسال وتثبيت ملف الـ APK للهواتف الميدانية:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 leading-relaxed pr-1">
          <li>
            اضغط على <strong>"تنزيل ملف التنصيب أندرويد (APK)"</strong> لحفظ الملف على جهازك.
          </li>
          <li>
            أرسل الملف عبر تطبيق <strong>واتساب (WhatsApp)</strong> أو تليغرام إلى أي مهندس أو موظف ترغب بتثبيت التطبيق على هاتفه.
          </li>
          <li>
            يقوم المستلم بفتح الملف من محادثة الواتساب والضغط على <strong>"تثبيت" (Install)</strong>.
          </li>
          <li>
            إذا ظهر تنبيه أمان أندرويد للمصادر غير المعروفة، يتم الضغط على "الإعدادات" وتفعيل خيار <strong>"السماح بالتثبيت من هذا المصدر"</strong> لمرة واحدة.
          </li>
          <li>
            يظهر التطبيق في شاشة التطبيقات الرئيسية ويعمل كبرنامج مثبت بالكامل دون الحاجة لمتصفح.
          </li>
        </ol>
      </div>
    </div>
  );
}
