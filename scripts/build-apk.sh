#!/bin/bash
# ==============================================================================
# سكربت توليد حزمة تثبيت أندرويد (APK) لنظام السجل الرقمي الموحد للأصول
# شركة نفط الوسط - وزارة النفط العراقية
# ==============================================================================

set -e

OUTPUT_DIR="dist-mobile"
mkdir -p "$OUTPUT_DIR"

echo "=========================================================="
echo "  بدء إعداد حزمة تثبيت أندرويد (Android APK Generation)"
echo "  نظام السجل الرقمي الموحد للأصول - شركة نفط الوسط"
echo "=========================================================="

# 1. التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "❌ خطأ: Node.js غير مثبت في البيئة."
    exit 1
fi

echo "📦 1. تجهيز الأيقونات والملفات الثابتة الخاصة بالهواتف..."
node scripts/pwa-asset-generator.cjs

echo "📱 2. فحص أدوات Bubblewrap / Android CLI..."
if command -v bubblewrap &> /dev/null; then
    echo "✅ Bubblewrap CLI متوفر، يتم بناء حزمة APK..."
    cd "$OUTPUT_DIR"
    bubblewrap build --manifest="../scripts/twa-manifest.json" || true
    cd ..
else
    echo "ℹ️ أداة bubblewrap غير مثبتة عالمياً."
    echo "لتثبيتها وبناء الحزمة محلياً شغّل:"
    echo "  npm install -g @bubblewrap/cli"
    echo "  bubblewrap init --manifest=scripts/twa-manifest.json"
    echo "  bubblewrap build"
fi

echo "=========================================================="
echo "✅ تم إعداد ملفات وبيانات حزمة الهاتف بنجاح في: $OUTPUT_DIR"
echo "راجع الدليل التفصيلي في: docs/MOBILE_APP_INSTALLATION_GUIDE.md"
echo "=========================================================="
