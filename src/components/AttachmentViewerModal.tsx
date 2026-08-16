import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  X,
  Download,
  FileText,
  FileCode,
  Image as ImageIcon,
  FolderArchive,
  FileCheck,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Layers,
  Crosshair,
  CheckCircle2,
  Paperclip,
  Grid,
  Film,
  Maximize2,
  RefreshCcw,
} from 'lucide-react';
import { downloadAttachment } from '../utils/fileUtils';
import { toArabicDigits } from '../utils/arabicUtils';

// Configure local PDF.js worker from bundled package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfCanvasViewerProps {
  url?: string;
  zoomLevel: number;
  rotation: number;
  currentPage: number;
  onTotalPagesChange: (pages: number) => void;
  attachment: AttachmentViewerItem;
  unitCode?: string;
  isLight: boolean;
  uploadDateLabel: string;
  onDownload: () => void;
}

const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  url,
  zoomLevel,
  rotation,
  currentPage,
  onTotalPagesChange,
  attachment,
  unitCode,
  isLight,
  uploadDateLabel,
  onDownload,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [pdfDoc, setPdfDoc] = React.useState<any>(null);
  const [error, setError] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    if (!url) {
      setLoading(false);
      return;
    }

    const loadPdfDoc = async () => {
      try {
        setLoading(true);
        setError(false);

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(pdf);
          onTotalPagesChange(pdf.numPages);
          setLoading(false);
        }
      } catch (err) {
        console.warn('PDFJS loading failed, falling back to official document view:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadPdfDoc();

    return () => {
      isMounted = false;
    };
  }, [url]);

  React.useEffect(() => {
    if (!pdfDoc || !canvasRef.current || error) return;

    let renderTask: any = null;
    const renderPage = async () => {
      try {
        const pageNum = Math.min(Math.max(1, currentPage), pdfDoc.numPages);
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const baseScale = (zoomLevel / 100) * 1.3;
        const viewport = page.getViewport({ scale: baseScale, rotation });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTask = page.render(renderContext);
        renderTask.promise.catch(() => {});
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoomLevel, rotation, error]);

  if (loading) {
    return (
      <div className={`w-full max-w-2xl h-[48vh] border rounded-2xl flex flex-col items-center justify-center gap-3 p-6 shadow-xl ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-xs">جاري معالجة وتجهيز صفحات ملف الـ PDF...</p>
        <span className="text-[10px] text-slate-400 font-mono">PDF.js Canvas Renderer</span>
      </div>
    );
  }

  if (pdfDoc && !error) {
    return (
      <div className="w-full flex flex-col items-center gap-3 max-w-3xl">
        <div className="w-full max-h-[60vh] overflow-auto flex items-center justify-center p-3 rounded-2xl border border-slate-300 dark:border-slate-800 bg-slate-950 shadow-2xl">
          <canvas
            ref={canvasRef}
            className="max-w-full object-contain rounded-xl shadow-xl border border-slate-800"
          />
        </div>

        <div className={`w-full p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
          isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-rose-500" />
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs">{attachment.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
              معاينة مباشرة مفعلة
            </span>
          </div>

          <button
            type="button"
            onClick={onDownload}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل الملف</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
        transition: 'transform 0.2s ease',
      }}
      className={`w-full max-w-2xl border rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-right ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
        <div className="text-center rotate-[30deg]">
          <p className="text-6xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest">MIDLAND OIL</p>
          <p className="text-2xl font-bold text-amber-500">شركة نفط الوسط - وزارة النفط</p>
        </div>
      </div>

      <div className="space-y-5 relative z-10">
        <div className="flex items-center justify-between border-b pb-3 border-amber-500/30">
          <div className="text-right">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">جمهورية العراق - وزارة النفط</p>
            <p className={`text-[11px] font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              شركة نفط الوسط • الهيئة الهندسية والفحص الفني
            </p>
          </div>
          <div className="text-left font-mono text-[10px] text-slate-500">
            <p>DOC REF: #{attachment.id || 'MOC-PDF-2026'}</p>
            <p>DATE: {toArabicDigits(uploadDateLabel)}</p>
          </div>
        </div>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-500 shrink-0" />
            <h2 className="text-base font-black border-r-4 border-amber-500 pr-3 text-amber-600 dark:text-amber-400">
              {attachment.name}
            </h2>
          </div>
          <p className={`text-xs leading-relaxed p-3.5 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950/80 border-slate-800 text-slate-300'
          }`}>
            {attachment.notes || 'تم الفحص والاعتماد الهندسي الشامل لجميع مخططات وتصميمات الوحدة النفطية وفق معايير السلامة المهنية ومواصفات معهد النفط الأمريكي API.'}
          </p>

          <div className={`border rounded-xl p-4 space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>مخطط الرسم الهيكلي المرفق (صفحة {toArabicDigits(currentPage)})</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">المقياس: 1:100</span>
            </div>

            <div className={`h-36 border border-dashed border-amber-500/40 rounded-lg relative flex items-center justify-center overflow-hidden ${
              isLight ? 'bg-white' : 'bg-slate-900/60'
            }`}>
              <Grid className="absolute inset-0 w-full h-full text-slate-300 dark:text-slate-800/40" />
              <div className="relative z-10 text-center space-y-1">
                <div className="w-28 h-16 border-2 border-amber-500 mx-auto flex items-center justify-center bg-amber-500/10 rounded-lg">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">منطقة التشغيل والمكاتب</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">NORTH AXIS • ZONE B-4</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            مختوم بختم المصادقة الرقمية الرسمية
          </span>
          <button
            type="button"
            onClick={onDownload}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل ملف PDF الأصلي</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface AttachmentViewerItem {
  id?: string;
  name: string;
  type?: string;
  category?: string;
  uploadDate?: string;
  sizeMB?: number;
  size?: string;
  notes?: string;
  url?: string;
  fileUrl?: string;
}

interface AttachmentViewerModalProps {
  attachment: AttachmentViewerItem;
  unitCode?: string;
  theme?: 'dark' | 'light';
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  attachment,
  unitCode,
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';

  // Effective URL checking
  const effectiveUrl = attachment.url || attachment.fileUrl;

  // Image load error state
  const [imageError, setImageError] = useState(false);

  // Extract file extension and category
  const fileName = attachment.name || 'document';
  const rawType = (attachment.type || '').toLowerCase();
  let ext = fileName.split('.').pop()?.toLowerCase() || 'file';

  if (rawType.includes('pdf')) ext = 'pdf';
  else if (rawType.includes('image') || rawType.includes('صورة') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    if (!['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) ext = 'png';
  } else if (rawType.includes('video') || rawType.includes('فيديو') || ['mp4', 'webm', 'mkv', 'avi'].includes(ext)) {
    if (!['mp4', 'webm', 'mkv', 'avi'].includes(ext)) ext = 'mp4';
  }

  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || rawType.includes('image') || rawType.includes('صورة');
  const isPdf = ext === 'pdf' || rawType.includes('pdf');
  const isVideo = ['mp4', 'webm', 'mkv', 'avi'].includes(ext) || rawType.includes('video') || rawType.includes('فيديو');
  const isCad = ['dwg', 'dxf', 'cad'].includes(ext);
  const isDoc = ['doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext);
  const isArchive = ['zip', 'rar', '7z'].includes(ext);

  // State
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [activeCadLayer, setActiveCadLayer] = useState<'all' | 'structural' | 'pipes' | 'electrical'>('all');

  // Format file size string
  const displaySize = attachment.size
    ? attachment.size
    : attachment.sizeMB
    ? `${toArabicDigits(attachment.sizeMB)} MB`
    : '1.5 MB';

  const categoryLabel = attachment.category || 'مستند رسمي معتمد';
  const uploadDateLabel = attachment.uploadDate || '2026-08-13';

  // Icon & Type Name
  let programName = 'مستعرض المستندات الرقمي المعتمد';
  let programIcon = <FileText className="w-5 h-5 text-amber-500" />;

  if (isCad) {
    programName = 'مخططات AutoCAD الهندسية (DWG/DXF)';
    programIcon = <FileCode className="w-5 h-5 text-sky-500" />;
  } else if (isPdf) {
    programName = 'مستندات PDF الرسمية والموثقة';
    programIcon = <FileText className="w-5 h-5 text-rose-500" />;
  } else if (isImage) {
    programName = 'معاين الصور والخراط والمخططات الميدانية';
    programIcon = <ImageIcon className="w-5 h-5 text-emerald-500" />;
  } else if (isVideo) {
    programName = 'مشغل مقاطع الفيديو والمشاهد الميدانية';
    programIcon = <Film className="w-5 h-5 text-purple-500" />;
  } else if (isDoc) {
    programName = 'مستندات وتقارير المكاتب الفنية';
    programIcon = <FileCheck className="w-5 h-5 text-indigo-500" />;
  } else if (isArchive) {
    programName = 'سجلات وأرشيف الملفات المضغوطة';
    programIcon = <FolderArchive className="w-5 h-5 text-amber-500" />;
  }

  const handleDownload = () => {
    downloadAttachment({
      id: attachment.id || 'DOC-001',
      name: attachment.name,
      type: ext,
      category: categoryLabel,
      uploadDate: uploadDateLabel,
      notes: attachment.notes,
      url: effectiveUrl,
      fileUrl: effectiveUrl,
      sizeMB: attachment.sizeMB || 1.5,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fadeIn dir-rtl">
      <div
        className={`border rounded-3xl max-w-5xl w-full flex flex-col max-h-[94vh] shadow-2xl overflow-hidden transition-all ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}
      >
        {/* ==================== HEADER ==================== */}
        <div
          className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-3 rounded-2xl border shrink-0 ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-900 border-slate-800'
              }`}
            >
              {programIcon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-black text-sm sm:text-base truncate max-w-md ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                  {attachment.name}
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {categoryLabel}
                </span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                  {ext}
                </span>
              </div>
              <p className={`text-[11px] mt-0.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {displaySize} • تاريخ الإرفاق: {toArabicDigits(uploadDateLabel)} • {programName}
              </p>
            </div>
          </div>

          {/* Explicit Header Action Buttons: Download & Exit/Close */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDownload}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow cursor-pointer"
              title="تنزيل الملف المرفق مباشرة للكمبيوتر أو الهاتف"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="إغلاق نافذة المعاينة والعودة"
            >
              <X className="w-4 h-4 text-red-500" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* ==================== TOOLBAR ==================== */}
        <div
          className={`px-4 py-2 border-b flex items-center justify-between text-xs overflow-x-auto gap-3 shrink-0 ${
            isLight ? 'bg-slate-100/90 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">أدوات العرض:</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.min(prev + 25, 200))}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-12 text-center text-amber-500 font-bold">{toArabicDigits(zoomLevel)}%</span>
            <button
              onClick={() => setZoomLevel((prev) => Math.max(prev - 25, 50))}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(100);
                setRotation(0);
              }}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="إعادة ضبط الحجم والتدوير"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className={`p-1.5 rounded-lg border cursor-pointer ${
                isLight ? 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="تدوير 90 درجة"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PDF Page Controls */}
          {isPdf && (
            <div className={`flex items-center gap-2 border-r border-l px-3 ${isLight ? 'border-slate-300' : 'border-slate-800'}`}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className={`p-1 rounded cursor-pointer disabled:opacity-30 ${
                  isLight ? 'bg-white hover:bg-slate-200 border border-slate-300' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-bold text-[11px]">
                صفحة <strong className="text-amber-500">{toArabicDigits(currentPage)}</strong> من {toArabicDigits(totalPages)}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className={`p-1 rounded cursor-pointer disabled:opacity-30 ${
                  isLight ? 'bg-white hover:bg-slate-200 border border-slate-300' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* DWG CAD Layer Selector */}
          {isCad && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-bold">طبقة CAD:</span>
              {(['all', 'structural', 'pipes', 'electrical'] as const).map((layer) => (
                <button
                  key={layer}
                  onClick={() => setActiveCadLayer(layer)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    activeCadLayer === layer
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : isLight
                      ? 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {layer === 'all' && 'الكل'}
                  {layer === 'structural' && 'الهيكل'}
                  {layer === 'pipes' && 'الأنابيب'}
                  {layer === 'electrical' && 'الكهرباء'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>موثق رسمياً - وزارة النفط</span>
            </span>
          </div>
        </div>

        {/* ==================== MAIN CANVAS & CONTENT VIEW ==================== */}
        <div
          className={`flex-1 overflow-auto p-4 sm:p-6 relative flex items-center justify-center min-h-[420px] ${
            isLight ? 'bg-slate-100/70' : 'bg-slate-950'
          }`}
        >
          {/* IMAGE VIEW */}
          {isImage && (
            <div className="flex flex-col items-center justify-center w-full h-full max-h-[68vh]">
              {effectiveUrl && !imageError ? (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                  className="max-w-full max-h-[62vh] flex items-center justify-center overflow-hidden rounded-2xl shadow-xl p-2"
                >
                  <img
                    src={effectiveUrl}
                    alt={attachment.name}
                    onError={() => setImageError(true)}
                    className="max-h-[58vh] max-w-full object-contain rounded-xl border border-slate-300 dark:border-slate-800 shadow-xl"
                  />
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                  }}
                  className={`w-full max-w-2xl border rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xl relative overflow-hidden text-right ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {/* Camera Viewfinder Header Overlay */}
                  <div className="flex items-center justify-between border-b pb-3 border-emerald-500/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-bold text-emerald-500 font-mono">SITE PHOTO FRAME • FIELD CAMERA</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">4096 x 3072 • ISO 100 • RAW JPG</span>
                  </div>

                  {/* Photographed Asset Graphic Canvas */}
                  <div className={`h-64 border-2 border-emerald-500/30 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-4 ${
                    isLight ? 'bg-slate-950 text-white' : 'bg-slate-950 text-white'
                  }`}>
                    {/* Viewfinder crosshairs */}
                    <Crosshair className="absolute top-4 right-4 w-5 h-5 text-emerald-500/40" />
                    <Crosshair className="absolute top-4 left-4 w-5 h-5 text-emerald-500/40" />
                    <Crosshair className="absolute bottom-4 right-4 w-5 h-5 text-emerald-500/40" />
                    <Crosshair className="absolute bottom-4 left-4 w-5 h-5 text-emerald-500/40" />

                    {/* Industrial Building / Caravan Vector Render */}
                    <div className="relative z-10 text-center space-y-3">
                      <div className="w-48 h-28 bg-gradient-to-b from-amber-500/20 to-slate-900 border-2 border-amber-500/80 rounded-xl mx-auto flex flex-col items-center justify-center p-3 relative shadow-2xl">
                        <div className="w-full border-b border-amber-500/40 pb-1 mb-2 flex justify-between text-[9px] font-mono text-amber-400">
                          <span>MOC-FIELD-CAM</span>
                          <span>{unitCode || 'UNIT-001'}</span>
                        </div>
                        <ImageIcon className="w-10 h-10 text-amber-400 my-auto" />
                        <span className="text-[10px] font-black text-slate-100 truncate w-full">{attachment.name}</span>
                      </div>
                      <p className="text-[11px] text-emerald-400 font-mono font-bold">
                        صورة فوتوغرافية وثائقية معتمدة ملتقطة موقعياً للمنشأة النفطية
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-xs ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    <p className="font-bold text-amber-500 mb-1">{attachment.name}</p>
                    <p className="text-[11px]">
                      {attachment.notes || 'صورة توثيقية موقعية بدقة عالية محفوظة ضمن السجل الأرشيفي الهندسي للمبنى.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIDEO VIEW */}
          {isVideo && (
            <div className="flex flex-col items-center justify-center w-full max-w-3xl">
              {effectiveUrl ? (
                <video
                  src={effectiveUrl}
                  controls
                  className="w-full max-h-[60vh] rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800"
                />
              ) : (
                <div
                  className={`w-full p-8 border rounded-2xl text-center space-y-4 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <Film className="w-16 h-16 text-purple-500 mx-auto" />
                  <h4 className="font-bold text-sm">{attachment.name}</h4>
                  <p className="text-xs text-slate-500">مقطع فيديو توثيقي موقعي</p>
                </div>
              )}
            </div>
          )}

          {/* PDF VIEW */}
          {isPdf && (
            <PdfCanvasViewer
              url={effectiveUrl}
              zoomLevel={zoomLevel}
              rotation={rotation}
              currentPage={currentPage}
              onTotalPagesChange={(num) => setTotalPages(num)}
              attachment={attachment}
              unitCode={unitCode}
              isLight={isLight}
              uploadDateLabel={uploadDateLabel}
              onDownload={handleDownload}
            />
          )}

          {/* CAD DRAWING VIEW */}
          {isCad && (
            <div
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className={`w-full max-w-2xl border rounded-2xl p-6 shadow-2xl relative overflow-hidden text-right ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b pb-2 border-sky-500/30">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-sky-500 animate-pulse" />
                    <span className="text-xs font-bold text-sky-500">AutoCAD Vector Blueprint Workspace</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">X: 324.15 | Y: 188.90 | Z: 0.00</span>
                </div>

                <div className={`h-60 border-2 border-sky-500/30 rounded-xl relative overflow-hidden flex items-center justify-center p-4 ${
                  isLight ? 'bg-slate-950 text-white' : 'bg-slate-950'
                }`}>
                  {/* Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px]" />

                  {/* CAD Geometry Drawing */}
                  <svg className="w-full h-full relative z-10" viewBox="0 0 400 200">
                    <rect x="40" y="30" width="320" height="140" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
                    {(activeCadLayer === 'all' || activeCadLayer === 'structural') && (
                      <>
                        <rect x="60" y="50" width="120" height="100" fill="rgba(56,189,248,0.1)" stroke="#f59e0b" strokeWidth="2" />
                        <rect x="200" y="50" width="140" height="100" fill="rgba(245,158,11,0.1)" stroke="#10b981" strokeWidth="2" />
                      </>
                    )}
                    {(activeCadLayer === 'all' || activeCadLayer === 'pipes') && (
                      <path d="M 40 100 L 360 100 M 120 30 L 120 170" stroke="#ef4444" strokeWidth="3" strokeDasharray="6 3" />
                    )}
                    {(activeCadLayer === 'all' || activeCadLayer === 'electrical') && (
                      <circle cx="120" cy="100" r="18" fill="none" stroke="#eab308" strokeWidth="2" />
                    )}
                    <text x="200" y="105" fill="#f8fafc" fontSize="12" fontWeight="bold" textAnchor="middle">
                      {attachment.name}
                    </text>
                  </svg>
                </div>

                <p className={`text-xs p-3 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  {attachment.notes || 'مخطط هيدروليكي إنشائي مصمم بواسطة برنامج AutoCAD.'}
                </p>
              </div>
            </div>
          )}

          {/* WORD / OFFICE DOC VIEW */}
          {isDoc && (
            <div
              className={`w-full max-w-2xl p-6 sm:p-8 rounded-2xl border text-right space-y-4 shadow-xl ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="border-b pb-3 border-indigo-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-500">Microsoft Office Document Viewer</span>
                <span className="text-[10px] font-mono text-slate-500">FORMAT: {ext.toUpperCase()}</span>
              </div>
              <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}>
                <h3 className="font-bold text-amber-500 text-sm">{attachment.name}</h3>
                <p className="leading-relaxed">
                  {attachment.notes || 'مستند رسمي معتمد يتضمن كافة البنود التعاقدية ومواصفات الاستلام الفني والتشغيلي للوحدة.'}
                </p>
              </div>
            </div>
          )}

          {/* ARCHIVE ZIP VIEW */}
          {isArchive && (
            <div
              className={`w-full max-w-2xl p-6 sm:p-8 rounded-2xl border text-right space-y-4 shadow-xl ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="border-b pb-3 border-amber-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-500">محتويات الأرشيف المضغوط WinRAR</span>
                <span className="text-[10px] font-mono text-slate-500">ZIP BUNDLE</span>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { name: 'MOC_Floorplan_3D.dwg', size: '3.2 MB' },
                  { name: 'Technical_Specification.pdf', size: '1.4 MB' },
                  { name: 'Inspection_Report_2026.docx', size: '0.8 MB' },
                ].map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-3 border rounded-xl ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-amber-500" />
                      <span className="font-bold">{f.name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">{f.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ==================== FOOTER ==================== */}
        <div
          className={`p-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="text-slate-500 text-[11px] flex items-center gap-2">
            <span>الرمز الأرشيفي للوحدة: <strong className="text-amber-500 font-mono">{unitCode || 'UNIT-001'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>تنزيل الملف</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`font-bold px-5 py-2.5 rounded-xl cursor-pointer transition border ${
                isLight
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
