import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  X,
  CheckCircle2,
  Sparkles,
  PackageCheck,
  Send,
  FileArchive,
  ChevronDown,
  Info,
  ShieldCheck,
  HardDrive,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DownloadOptionsModal } from './DownloadOptionsModal';

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner';
  theme?: 'dark' | 'light';
  className?: string;
}

export function PWAInstallPrompt({
  variant = 'button',
  theme = 'light',
  className = '',
}: PWAInstallPromptProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isDismissed,
    installApp,
    dismissPrompt,
    hasPrompt,
  } = usePWAInstall();

  const [showModal, setShowModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'apk' | 'direct' | 'guide'>('apk');
  const [installSuccessToast, setInstallSuccessToast] = useState<boolean>(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // If already installed, don't show the floating banner
  if (variant === 'banner' && (isInstalled || isDismissed)) {
    return null;
  }

  const handleDirectInstall = async () => {
    if (hasPrompt) {
      const result = await installApp();
      if (result.success) {
        setInstallSuccessToast(true);
        setShowModal(false);
        setTimeout(() => setInstallSuccessToast(false), 5000);
      }
    } else {
      setActiveTab('guide');
    }
  };

  const handleDownloadApk = () => {
    setDownloadSuccessToast('جاري تنزيل ملف التثبيت أندرويد (MidlandOil-Assets-Registry.apk)...');
    const link = document.createElement('a');
    link.href = '/api/download/apk';
    link.download = 'MidlandOil-Assets-Registry.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadSuccessToast(null), 6000);
  };

  const handleDownloadZipPackage = () => {
    setDownloadSuccessToast('جاري تنزيل حزمة التثبيت الشاملة (MidlandOil-Assets-Installation-Package.zip)...');
    const link = document.createElement('a');
    link.href = '/api/download/package';
    link.download = 'MidlandOil-Assets-Installation-Package.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadSuccessToast(null), 6000);
  };

  // -------------------------------------------------------------
  // Render: Variant "button" (Top Header Action Bar)
  // -------------------------------------------------------------
  if (variant === 'button') {
    return (
      <>
        <div className="relative inline-flex items-center">
          <button
            onClick={() => setShowModal(true)}
            type="button"
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer ${
              theme === 'dark'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-900/30'
                : 'bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white shadow-cyan-200/50'
            } ${className}`}
            title="تثبيت التطبيق أو تنزيل ملف التثبيت APK للإرسال"
          >
            <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-200 shrink-0" />
            <span className="font-semibold whitespace-nowrap">
              {isInstalled ? 'إدارة التطبيق والتنزيل' : 'تثبيت / تنزيل التطبيق'}
            </span>
            <ChevronDown className="w-3 h-3 text-cyan-200/80" />
            {isInstallable && !isInstalled && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </button>
        </div>

        {/* Full Install & Download Hub Modal */}
        <DownloadOptionsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          theme={theme}
        />

        {/* Success / Notification Toasts */}
        {installSuccessToast && (
          <div className="fixed bottom-6 start-6 z-50 p-4 rounded-xl shadow-2xl bg-emerald-600 text-white flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-sm">
              <div className="font-bold">تم تثبيت التطبيق بنجاح!</div>
              <div className="text-xs text-emerald-100">
                يمكنك الآن تشغيله مباشرة من شاشة جهازك الرئيسية دون متصفح.
              </div>
            </div>
          </div>
        )}

        {downloadSuccessToast && (
          <div className="fixed bottom-6 start-6 z-50 p-4 rounded-xl shadow-2xl bg-cyan-700 text-white flex items-center gap-3 animate-fade-in">
            <Download className="w-5 h-5 shrink-0 animate-bounce" />
            <div className="text-sm">
              <div className="font-bold">تم بدء التحميل!</div>
              <div className="text-xs text-cyan-100">{downloadSuccessToast}</div>
            </div>
          </div>
        )}
      </>
    );
  }

  // -------------------------------------------------------------
  // Render: Variant "banner" (Floating Bottom Banner on Mobile)
  // -------------------------------------------------------------
  return (
    <>
      <div
        className={`fixed bottom-4 inset-x-4 md:inset-x-auto md:end-6 md:w-96 z-40 p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all animate-slide-up ${
          theme === 'dark'
            ? 'bg-slate-900/95 border-slate-700/80 text-white shadow-black/60'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-400/30'
        } ${className}`}
        dir="rtl"
      >
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-cyan-600/30 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1.5">
                تطبيق السجل الرقمي للهاتف
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div
                className={`text-xs ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                تثبيت مباشر أو تنزيل ملف التنصيب APK
              </div>
            </div>
          </div>
          <button
            onClick={dismissPrompt}
            type="button"
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p
          className={`text-xs mb-3 leading-relaxed ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          يمكنك تثبيت النظام مباشرة على شاشة الهاتف، أو تنزيل ملف التنصيب (APK) لإرساله ومشاركته عبر واتساب مع الزملاء في الحقول النفطية.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('direct');
              setShowModal(true);
            }}
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-700/20 transition-transform active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5" />
            تثبيت مباشر
          </button>
          <button
            onClick={() => {
              setActiveTab('apk');
              setShowModal(true);
            }}
            type="button"
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-cyan-300 hover:bg-slate-700'
                : 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            تنزيل ملف APK
          </button>
        </div>
      </div>

      <DownloadOptionsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        theme={theme}
      />
    </>
  );
}

// -------------------------------------------------------------
// Comprehensive Install & Download Hub Modal
// -------------------------------------------------------------
interface InstallAndDownloadModalProps {
  theme: 'dark' | 'light';
  isIOS: boolean;
  isInstalled: boolean;
  hasPrompt: boolean;
  activeTab: 'apk' | 'direct' | 'guide';
  setActiveTab: (tab: 'apk' | 'direct' | 'guide') => void;
  onDirectInstall: () => void;
  onDownloadApk: () => void;
  onDownloadZip: () => void;
  onClose: () => void;
}

function InstallAndDownloadModal({
  theme,
  isIOS,
  isInstalled,
  hasPrompt,
  activeTab,
  setActiveTab,
  onDirectInstall,
  onDownloadApk,
  onDownloadZip,
  onClose,
}: InstallAndDownloadModalProps) {
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl my-auto rounded-2xl sm:rounded-3xl shadow-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-700/80 text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-5 sm:p-6 border-b flex items-start justify-between gap-4 ${
            isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-cyan-600/30 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg sm:text-xl">خيارات تثبيت وتنزيل التطبيق</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  شركة نفط الوسط
                </span>
              </div>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                اختر بين التثبيت المباشر على هذا الجهاز أو تنزيل ملف التنصيب (APK) لإرساله
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex border-b px-4 sm:px-6 gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-100/40'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'apk'
                ? 'border-cyan-500 text-cyan-500 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>تنزيل ملف التنصيب (APK للإرسال)</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold">
              موصى به للمشاركة
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'direct'
                ? 'border-cyan-500 text-cyan-500 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>التثبيت المباشر (PWA)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'border-cyan-500 text-cyan-500 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>دليل التثبيت والمشاركة</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* TAB 1: DOWNLOAD APK / PACKAGE */}
          {activeTab === 'apk' && (
            <div className="space-y-4 animate-fade-in">
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-cyan-500/30'
                    : 'bg-gradient-to-br from-cyan-50/70 to-blue-50/70 border-cyan-200'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-600/30 shrink-0">
                    <PackageCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      ملف تثبيت أندرويد المستقل (APK File)
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                        جاهز للإرسال
                      </span>
                    </h4>
                    <p
                      className={`text-xs mt-1 leading-relaxed ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      نزّل ملف التنصيب بصيغة <strong>.apk</strong> لتتمكن من إرساله كملف مستقل عبر <strong>واتساب</strong> أو <strong>تليغرام</strong> أو <strong>بلوتوث</strong> أو ذاكرة فلاش، ليقوم الموظفون بتثبيته مباشرة على هواتفهم دون الحاجة لفتح المتصفح أو إرسال رابط.
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                        حجم الملف: ~80 KB (سريع الإرسال)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        الإصدار: v1.0.0 (نظام السجل الرقمي)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDownloadApk}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-700/30 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف الـ APK الآن</span>
                </button>
              </div>

              {/* Secondary Option: ZIP Package */}
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isDark
                    ? 'bg-slate-800/40 border-slate-700/60'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                    <FileArchive className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      حزمة التثبيت الشاملة للمهندسين وفِرق الـ IT (.ZIP)
                    </h5>
                    <p
                      className={`text-xs mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      تحتوي على ملف الـ APK + أيقونات الدقة العالية + دليل التثبيت بالصور + سكربتات التثبيت السريع عبر الكمبيوتر (ADB).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDownloadZip}
                  className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer shrink-0 ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل الحزمة الكاملة (.zip)</span>
                </button>
              </div>

              {/* Quick instructions on how to send and install */}
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                  isDark
                    ? 'bg-slate-950/40 border-slate-800 text-slate-300'
                    : 'bg-amber-50/50 border-amber-200 text-amber-900'
                }`}
              >
                <div className="font-bold flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Send className="w-4 h-4" />
                  <span>خطوات إرسال وتثبيت ملف الـ APK للهواتف:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-1">
                      1. التنزيل والإرسال
                    </span>
                    نزّل الملف وأرسله عبر واتساب أو تليغرام أو بلوتوث أو فلاش إلى هاتف الموظف.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-1">
                      2. الضغط والتثبيت
                    </span>
                    يضغط المستلم على الملف في الهاتف ويختار "تثبيت" (Install) على أندرويد.
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="font-bold text-cyan-600 dark:text-cyan-400 block mb-1">
                      3. التشغيل المستقل
                    </span>
                    يظهر التطبيق فوراً في قائمة تطبيقات الهاتف ويعمل مباشرة بدون متصفح.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT INSTALL (PWA) */}
          {activeTab === 'direct' && (
            <div className="space-y-4 animate-fade-in">
              <div
                className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700'
                    : 'bg-emerald-50/60 border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                      التثبيت المباشر على هذا الجهاز (PWA)
                      {isInstalled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                          مثبت حالياً
                        </span>
                      )}
                    </h4>
                    <p
                      className={`text-xs mt-1 leading-relaxed ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      تثبيت النظام فوراً على شاشة هاتفك الرئيسية أو حاسوبك دون الحاجة لتنزيل أي ملفات. يعمل بكامل ميزات التطبيقات الأصلية، سرعة عالية، وملء الشاشة.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onDirectInstall}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-700/30 transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'إعادة تثبيت / تحديث' : 'تثبيت فوري الآن'}</span>
                </button>
              </div>

              {/* Guide if manual install is needed */}
              <div
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-500" />
                  <span>طريقة التثبيت المباشر من المتصفح:</span>
                </div>
                <p>
                  إذا لم تظهر نافذة التثبيت التلقائية، يمكنك الضغط على قائمة المتصفح (⋮) ثم اختيار <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                </p>
                {isIOS && (
                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                    على أجهزة آيفون (Safari): اضغط زر المشاركة (مربع بسهم لأعلى) ثم اختر <strong>"إضافة إلى الصفحة الرئيسية"</strong>.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE & FAQ */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs animate-fade-in">
              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-cyan-500" />
                  ما الفرق بين تنزيل ملف الـ APK والتثبيت المباشر؟
                </h4>
                <div className="space-y-2 leading-relaxed text-slate-600 dark:text-slate-300">
                  <p>
                    <strong>1. ملف الـ APK:</strong> هو ملف تثبيت أندرويد حقيقي يمكنك حفظه على جهازك وإرساله عبر واتساب، تليغرام، البريد، أو البلوتوث لأي شخص ليقوم بتثبيته كملف، دون الحاجة لأن يفتح متصفح الإنترنت أو يحتاج رابطاً.
                  </p>
                  <p>
                    <strong>2. التثبيت المباشر (PWA):</strong> يقوم بتثبيت التطبيق مباشرة على جهازك الحالي بضغطة زر دون تنزيل ملفات، وهو ممتاز للاستخدام الشخصي السريع على هاتفك أو حاسوبك.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  ماذا أفعل إذا ظهرت رسالة "تثبيت تطبيقات غير معروفة" على أندرويد؟
                </h4>
                <p className="leading-relaxed text-slate-600 dark:text-slate-300">
                  هذا إجراء أمني اعتيادي في نظام أندرويد عند تثبيت أي ملف APK يتم إرساله عبر واتساب أو تليغرام. كل ما عليك هو الضغط على <strong>"الإعدادات"</strong> ثم تفعيل خيار <strong>"السماح بالتثبيت من هذا المصدر" (Allow from this source)</strong>، ثم الرجوع والضغط على "تثبيت".
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/60'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>شركة نفط الوسط - وزارة النفط العراقية</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={onDownloadApk}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تنزيل APK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
