import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Monitor,
  Apple,
  Bot,
  X,
  HardDrive,
  ShieldCheck,
  ArrowDownToLine,
  HelpCircle,
  Laptop,
  Check,
  Share2,
  FileCode,
} from 'lucide-react';
import {
  downloadIosMobileConfigFile,
  downloadVerifiedBinaryFile,
  downloadWindowsDesktopShortcut,
  copyPlatformDirectInstallLink,
} from '../utils/mobileInstaller';

interface DownloadOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | string;
}

export const DownloadOptionsModal: React.FC<DownloadOptionsModalProps> = ({
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const [downloadToast, setDownloadToast] = useState<{
    title: string;
    description: string;
    type: 'desktop' | 'ios' | 'apk' | 'link';
  } | null>(null);

  const [activeInstructionTab, setActiveInstructionTab] = useState<'desktop' | 'ios' | 'android' | null>('android');
  const [copiedPlatform, setCopiedPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleInstruction = (tab: 'desktop' | 'ios' | 'android') => {
    setActiveInstructionTab((prev) => (prev === tab ? null : tab));
  };

  const handleCopyLink = async (platform: 'ios' | 'android' | 'desktop') => {
    const success = await copyPlatformDirectInstallLink(platform);
    if (success) {
      setCopiedPlatform(platform);
      const platformNames = {
        ios: 'للآيفون (Safari)',
        android: 'للأندرويد (Chrome)',
        desktop: 'للحاسوب (Edge/Chrome)',
      };
      setDownloadToast({
        title: `تم نسخ رابط التثبيت المباشر ${platformNames[platform]}!`,
        description: 'يمكنك إرسال الرابط فوراً عبر واتساب ليقوم الموظف بتثبيت التطبيق على شاشة جهازه خلال ثوانٍ معدودة.',
        type: 'link',
      });
      setTimeout(() => setCopiedPlatform(null), 3000);
      setTimeout(() => setDownloadToast(null), 6000);
    }
  };

  // =========================================================================
  // Desktop Setup Handlers
  // =========================================================================
  const handleDownloadDesktop = async () => {
    setDownloadToast({
      title: 'بدء تنزيل مثبت الحاسوب (.exe)',
      description: 'جاري جلب مثبت MidlandOil-Assets-Desktop-Setup.exe لأجهزة الكمبيوتر...',
      type: 'desktop',
    });

    const result = await downloadVerifiedBinaryFile(
      '/api/download/desktop',
      'MidlandOil-Assets-Desktop-Setup.exe',
      'application/vnd.microsoft.portable-executable'
    );

    if (result.success) {
      setDownloadToast({
        title: 'اكتمل تنزيل مثبت الحاسوب بنجاح!',
        description: 'تم حفظ الملف MidlandOil-Assets-Desktop-Setup.exe جاهزاً للتشغيل على أجهزة الكمبيوتر.',
        type: 'desktop',
      });
    } else {
      // Fallback
      const link = document.createElement('a');
      link.href = '/api/download/desktop';
      link.download = 'MidlandOil-Assets-Desktop-Setup.exe';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const handleDownloadDesktopShortcut = () => {
    downloadWindowsDesktopShortcut();
    setDownloadToast({
      title: 'تم تنزيل اختصار سطح المكتب (.url)',
      description: 'تم إنشاء اختصار رسمي للكمبيوتر؛ انقله إلى سطح المكتب لتشغيل النظام بضغطة زر واحدة!',
      type: 'desktop',
    });
    setTimeout(() => setDownloadToast(null), 5000);
  };

  // =========================================================================
  // iOS Handlers
  // =========================================================================
  const handleDownloadIosProfile = () => {
    setDownloadToast({
      title: 'تنزيل ملف الآيفون المعتمد (.mobileconfig)',
      description: 'تم إنشاء ملف التثبيت المعتمد وحفظه. جاهز للإرسال والتثبيت على أجهزة iPhone & iPad!',
      type: 'ios',
    });

    // Uses purely client-side blob generation: 100% immune to proxy/cookie-check interruptions
    downloadIosMobileConfigFile();

    setTimeout(() => {
      setDownloadToast(null);
    }, 6000);
  };

  // =========================================================================
  // Android Handlers
  // =========================================================================
  const handleDownloadApk = async () => {
    setDownloadToast({
      title: 'بدء تنزيل نسخة الأندرويد (APK)',
      description: 'جاري تنزيل ملف MidlandOil-Assets-Registry.apk لهواتف الأندرويد...',
      type: 'apk',
    });

    const result = await downloadVerifiedBinaryFile(
      '/api/download/apk',
      'MidlandOil-Assets-Registry.apk',
      'application/vnd.android.package-archive'
    );

    if (result.success) {
      setDownloadToast({
        title: 'اكتمل تنزيل ملف الـ APK بنجاح!',
        description: 'الملف MidlandOil-Assets-Registry.apk جاهز الآن للإرسال والتثبيت الميداني على هواتف الأندرويد.',
        type: 'apk',
      });
    } else {
      // Fallback
      const link = document.createElement('a');
      link.href = '/api/download/apk';
      link.download = 'MidlandOil-Assets-Registry.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setTimeout(() => setDownloadToast(null), 5000);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in select-none"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all max-h-[92vh] flex flex-col ${
          isDark
            ? 'bg-slate-900 border-slate-700/80 text-white shadow-black/90'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl ring-1 ring-slate-900/10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar / Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 shrink-0 ${
            isDark
              ? 'bg-slate-900/95 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 font-bold">
              <ArrowDownToLine className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`font-bold text-base sm:text-lg tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  خيارات التنزيل والتثبيت المعتمدة
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isDark
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  شركة نفط الوسط
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 leading-relaxed font-normal ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                تنزيل ملفات التثبيت وروابط التنصيب المباشر لهواتف الآيفون، أجهزة الأندرويد، وأجهزة الحاسوب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
            }`}
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: The 3 Dedicated Options */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto">
          {/* ========================================================================= */}
          {/* OPTION 1: Android APK (.apk) */}
          {/* ========================================================================= */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 shadow-sm ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/40'
                : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    isDark
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-xs'
                  }`}
                >
                  <Bot className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`font-bold text-sm sm:text-base ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      نسخة الأندرويد (Android APK)
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isDark
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold'
                      }`}
                    >
                      هواتف وأجهزة أندرويد
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    حزمة تثبيت بصيغة <strong className="font-bold text-slate-900 dark:text-white">.apk</strong> للإرسال الميداني المباشر، أو التثبيت الفوري بضغطة زر واحدة على شاشة هاتف الأندرويد عبر متصفح Chrome.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                    <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      الحجم: ~80 KB
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-700 text-slate-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      MidlandOil-Assets-Registry.apk
                    </span>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => toggleInstruction('android')}
                      className={`font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                        isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-800 hover:text-emerald-950 underline underline-offset-2'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                      {activeInstructionTab === 'android' ? 'إخفاء طريقة التثبيت على الأندرويد' : 'طريقة تثبيته على الأندرويد'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Download File + Copy Direct Link */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadApk}
                  style={{ backgroundColor: '#047857', color: '#ffffff' }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:opacity-95 hover:shadow-lg transition-all active:scale-95 cursor-pointer border-2 border-emerald-700 select-none"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }} className="font-extrabold text-white tracking-wide">
                    تنزيل ملف الأندرويد (.apk)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink('android')}
                  style={{ backgroundColor: '#f59e0b', color: '#0f172a' }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:bg-amber-400 transition-all active:scale-95 cursor-pointer border-2 border-amber-600 select-none"
                  title="نسخ رابط سريع لإرساله عبر واتساب والتثبيت في ثوانٍ"
                >
                  {copiedPlatform === 'android' ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>تم نسخ الرابط المباشر!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                      <span>نسخ رابط التثبيت للأندرويد</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Android Installation Detailed Guide */}
            {activeInstructionTab === 'android' && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed space-y-3 animate-fade-in ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-slate-300'
                    : 'bg-emerald-50/90 border-emerald-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="font-bold flex items-center justify-between text-emerald-800 dark:text-emerald-400 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Bot className="w-4 h-4" />
                    <span>كيفية تثبيت التطبيق على شاشة هواتف الأندرويد (طريقتان معتمدتان):</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Method A: Direct via Chrome (Fastest) */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-emerald-300'
                  }`}>
                    <div className="font-bold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>الطريقة الأسرع والأسهل (عبر متصفح Google Chrome):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>اضغط على زر <strong>«نسخ رابط التثبيت للأندرويد»</strong> أعلاه وأرسله للموظف عبر واتساب.</li>
                      <li>يفتح الموظف الرابط في متصفح <strong>Google Chrome</strong> على هاتف الأندرويد.</li>
                      <li>يضغط على قائمة الخيارات <strong>(الثلاث نقاط ⋮)</strong> في أعلى يسار الشاشة.</li>
                      <li>يختار <strong>«تثبيت التطبيق (Install App)»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong> ثم يضغط <strong>«تثبيت»</strong>.</li>
                      <li>يتثبت التطبيق فوراً كأيقونة كاملة على الشاشة الرئيسية ويعمل بدون إنترنت وبملء الشاشة!</li>
                    </ol>
                  </div>

                  {/* Method B: Via APK File */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      <span>طريقة تثبيت ملف التنصيب (.apk) المرسل عبر واتساب:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>أرسل ملف <code>MidlandOil-Assets-Registry.apk</code> للموظف عبر واتساب أو تليغرام أو بلوتوث.</li>
                      <li>يضغط الموظف على الملف المستلم في واتساب لفتحه.</li>
                      <li>يختار <strong>«تثبيت (Install)»</strong>.</li>
                      <li>إذا طلب الهاتف إذن تثبيت التطبيقات لأول مرة، يفعّل خيار: <strong>«السماح بالتثبيت من هذا المصدر (Allow from this source)»</strong>.</li>
                      <li>يكتمل التثبيت وتظهر أيقونة التطبيق الرسمية فوراً على شاشة هاتفه!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* OPTION 2: PC Desktop Setup (الحاسوب) */}
          {/* ========================================================================= */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 shadow-sm ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:border-blue-500/40'
                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/20'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    isDark
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-blue-100 text-blue-800 border border-blue-200 shadow-xs'
                  }`}
                >
                  <Monitor className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`font-bold text-sm sm:text-base ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      نسخة الحاسوب (Windows PC)
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isDark
                          ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                          : 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
                      }`}
                    >
                      كمبيوتر مكتبي / لابتوب
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    مثبت مكتبي بصيغة <strong className="font-bold text-slate-900 dark:text-white">.exe</strong>، أو تثبيت فوري كتطبيق ويندوز رسمي مستقل عبر Microsoft Edge / Google Chrome بملء الشاشة مع كافة الصلاحيات.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                    <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <HardDrive className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      الحجم: ~21 KB
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-700 text-slate-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      MidlandOil-Assets-Desktop-Setup.exe
                    </span>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => toggleInstruction('desktop')}
                      className={`font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                        isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-700 hover:text-blue-900 underline underline-offset-2'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      {activeInstructionTab === 'desktop' ? 'إخفاء طريقة التثبيت على الحاسوب' : 'طريقة تثبيته على الحاسوب'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Download EXE + Copy Direct Link + Download .URL shortcut */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadDesktop}
                  style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:opacity-95 hover:shadow-lg transition-all active:scale-95 cursor-pointer border-2 border-blue-600 select-none"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }} className="font-extrabold text-white tracking-wide">
                    تنزيل مثبت الحاسوب (.exe)
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyLink('desktop')}
                    style={{ backgroundColor: '#f59e0b', color: '#0f172a' }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold shadow-md hover:bg-amber-400 transition-all active:scale-95 cursor-pointer border-2 border-amber-600 select-none"
                    title="نسخ رابط سريع لإرساله للموظفين للتثبيت المباشر على الكمبيوتر"
                  >
                    {copiedPlatform === 'desktop' ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>تم نسخ الرابط!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>نسخ رابط الحاسوب</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadDesktopShortcut}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                    title="تنزيل اختصار سريع لسطح المكتب (.url)"
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-500" />
                    <span>اختصار (.url)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Installation Detailed Guide */}
            {activeInstructionTab === 'desktop' && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed space-y-3 animate-fade-in ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-slate-300'
                    : 'bg-blue-50/90 border-blue-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="font-bold flex items-center justify-between text-blue-800 dark:text-blue-400 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    <span>كيفية تثبيت التطبيق على جهاز الكمبيوتر وسطح المكتب (طريقتان معتمدتان):</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Method A: Direct via Edge / Chrome as Native App */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-blue-300'
                  }`}>
                    <div className="font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>التثبيت المكتبي الفوري (عبر Microsoft Edge أو Chrome):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>افتح رابط النظام في متصفح <strong>Edge</strong> أو <strong>Chrome</strong> على جهاز الكمبيوتر.</li>
                      <li>ستظهر أيقونة تثبيت صغيرة في شريط العنوان أعلى المتصفح، أو اضغط قائمة المتصفح <strong>(⋯ أو ⋮)</strong>.</li>
                      <li>اختر <strong>«تطبيقات (Apps)»</strong> ثم اضغط <strong>«تثبيت هذا الموقع كتطبيق (Install site as app)»</strong>.</li>
                      <li>اضغط <strong>«تثبيت (Install)»</strong>.</li>
                      <li>سينشئ ويندوز فوراً أيقونة على سطح المكتب وشريط المهام (Taskbar) ليفتح النظام كنافذة مستقلة بملء الشاشة كأي برنامج كمبيوتر!</li>
                    </ol>
                  </div>

                  {/* Method B: Via Desktop Setup EXE */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      <span>عبر تشغيل مثبت الحاسوب (.exe) أو ملف الاختصار (.url):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>اضغط على زر <strong>«تنزيل مثبت الحاسوب (.exe)»</strong> أعلاه لحفظ ملف التثبيت.</li>
                      <li>انقر مرتين على الملف المحمل: <code>MidlandOil-Assets-Desktop-Setup.exe</code>.</li>
                      <li>إذا ظهرت نافذة حماية ويندوز SmartScreen، اضغط <strong>«المزيد من المعلومات»</strong> ثم <strong>«تشغيل على أية حال»</strong>.</li>
                      <li>يقوم المثبت تلقائياً بإنشاء اختصار رسمي لـ <strong>«السجل الرقمي للأصول - نفط الوسط»</strong> على سطح المكتب ليعمل بملء الشاشة فوراً.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* OPTION 3: Apple iOS iPhone & iPad (.mobileconfig) */}
          {/* ========================================================================= */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 shadow-sm ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    isDark
                      ? 'bg-slate-700 text-white border border-slate-600 shadow-xs'
                      : 'bg-slate-900 text-white shadow-xs'
                  }`}
                >
                  <Apple className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4
                      className={`font-bold text-sm sm:text-base ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      نسخة الآيفون (Apple iOS)
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isDark
                          ? 'bg-slate-800 text-slate-200 border-slate-700'
                          : 'bg-slate-200 text-slate-900 border-slate-300 font-extrabold'
                      }`}
                    >
                      iPhone & iPad
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-1 leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    ملف تعريف رسمي بصيغة <strong className="font-bold text-slate-900 dark:text-white">.mobileconfig</strong> يمكن إرساله عبر واتساب أو تثبيته مباشرة كأيقونة على شاشة الآيفون لتعمل بملء الشاشة وبشكل مستقل.
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-medium">
                    <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                      الحجم: ~11 KB
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-700 text-slate-300'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}>
                      MidlandOil-Assets-iOS.mobileconfig
                    </span>
                    <span className="text-slate-400">•</span>
                    <button
                      type="button"
                      onClick={() => toggleInstruction('ios')}
                      className={`font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors ${
                        isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-800 hover:text-amber-950 underline underline-offset-2'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      {activeInstructionTab === 'ios' ? 'إخفاء طريقة التثبيت على الآيفون' : 'طريقة تثبيته على الآيفون'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Download File + Copy Direct Link */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadIosProfile}
                  style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:opacity-90 hover:shadow-lg transition-all active:scale-95 cursor-pointer border-2 border-slate-800 select-none"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }} className="font-extrabold text-white tracking-wide">
                    تنزيل ملف الآيفون (.mobileconfig)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyLink('ios')}
                  style={{ backgroundColor: '#f59e0b', color: '#0f172a' }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:bg-amber-400 transition-all active:scale-95 cursor-pointer border-2 border-amber-600 select-none"
                  title="نسخ رابط سريع لإرساله عبر واتساب والتثبيت في ثوانٍ"
                >
                  {copiedPlatform === 'ios' ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>تم نسخ الرابط المباشر!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                      <span>نسخ رابط التثبيت للآيفون</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* iOS Installation Detailed Guide */}
            {activeInstructionTab === 'ios' && (
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed space-y-3 animate-fade-in ${
                  isDark
                    ? 'bg-slate-950/90 border-slate-800 text-slate-300'
                    : 'bg-amber-50/90 border-amber-200 text-slate-900 shadow-xs'
                }`}
              >
                <div className="font-bold flex items-center justify-between text-amber-800 dark:text-amber-400 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Apple className="w-4 h-4" />
                    <span>كيفية تثبيت التطبيق على شاشة الآيفون (طريقتان معتمدتان):</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Method A: Direct via Safari (Fastest) */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-amber-300'
                  }`}>
                    <div className="font-bold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>الطريقة الأسرع والأسهل (عبر متصفح Safari):</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>اضغط على زر <strong>«نسخ رابط التثبيت للآيفون»</strong> أعلاه وأرسله للموظف عبر واتساب.</li>
                      <li>يفتح الموظف الرابط في متصفح <strong>Safari</strong> على هاتفه.</li>
                      <li>يضغط على زر المشاركة <strong>(مشاركة ⬆️)</strong> في أسفل شاشة سفاري.</li>
                      <li>يختار <strong>«إضافة إلى الصفحة الرئيسية (Add to Home Screen)»</strong> ثم <strong>«إضافة»</strong>.</li>
                      <li>يتثبت التطبيق فوراً بأيقونته الرسمية على شاشة الهاتف الرئيسية!</li>
                    </ol>
                  </div>

                  {/* Method B: Via .mobileconfig profile */}
                  <div className={`p-3 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                      <span>طريقة تثبيت الملف (.mobileconfig) المرسل عبر واتساب:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>في واتساب عند الضغط على الملف وظهور نافذة المعاينة: اضغط زر <strong>«المشاركة ⬆️»</strong> في الأسفل.</li>
                      <li>اختر <strong>«حفظ في الملفات (Save to Files)»</strong> ثم افتح تطبيق <strong>«الملفات Files»</strong> واضغط على الملف.</li>
                      <li>ستظهر رسالة نظام أبل: <em>«تم تنزيل ملف التعريف»</em>.</li>
                      <li>ادخل <strong>«الإعدادات Settings»</strong> في الآيفون ثم اضغط الخيار البارز في الأعلى: <strong>«تم تنزيل ملف التعريف»</strong>.</li>
                      <li>اضغط <strong>«تثبيت (Install)»</strong> وأدخل رمز قفل الهاتف للتأكيد. سيتثبت التطبيق فوراً على شاشة هاتفك!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3.5 sm:p-4 border-t flex items-center justify-between gap-3 text-xs shrink-0 ${
            isDark
              ? 'bg-slate-950/70 border-slate-800 text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[11px] font-medium">
              حزم معتمدة رسمياً وآمنة لأجهزة الحاسوب وهواتف Android و iOS التابعة لشركة نفط الوسط
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-2xs'
            }`}
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* Floating Download Notification Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 start-6 z-[10000] p-4 rounded-2xl shadow-2xl bg-slate-900 border border-amber-500/40 text-white flex items-center gap-3 animate-fade-in max-w-sm">
          <Download className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <div className="text-xs">
            <div className="font-bold text-amber-300">{downloadToast.title}</div>
            <div className="text-slate-300 mt-0.5 leading-relaxed">{downloadToast.description}</div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
