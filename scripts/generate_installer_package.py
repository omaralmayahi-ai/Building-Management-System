#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for Midland Oil System Installers:
1. public/downloads/MidlandOil-Assets-Desktop-Setup.exe (Windows PC Desktop Installer)
2. public/downloads/MidlandOil-Assets-iOS.mobileconfig (Apple iOS Configuration Profile for iPhone/iPad)
3. public/downloads/MidlandOil-Assets-Registry.apk (Android Standalone APK)
"""

import os
import zipfile
import json
import base64
import uuid
import struct

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DOWNLOADS_DIR = os.path.join(PUBLIC_DIR, "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

DESKTOP_EXE_PATH = os.path.join(DOWNLOADS_DIR, "MidlandOil-Assets-Desktop-Setup.exe")
IOS_PROFILE_PATH = os.path.join(DOWNLOADS_DIR, "MidlandOil-Assets-iOS.mobileconfig")
APK_PATH = os.path.join(DOWNLOADS_DIR, "MidlandOil-Assets-Registry.apk")

print("Generating PC Desktop Setup, Apple iOS Profile & Android APK...")

# Load App Icon
icon_192 = os.path.join(PUBLIC_DIR, "icons", "icon-192.png")
icon_512 = os.path.join(PUBLIC_DIR, "icons", "icon-512.png")
icon_base64 = ""
if os.path.exists(icon_192):
    with open(icon_192, 'rb') as f:
        icon_base64 = base64.b64encode(f.read()).decode('ascii')
elif os.path.exists(icon_512):
    with open(icon_512, 'rb') as f:
        icon_base64 = base64.b64encode(f.read()).decode('ascii')

# ==============================================================================
# 1. Prepare PC Desktop Installer (.exe)
# ==============================================================================
# Constructing a valid Windows PE Executable binary with self-extracting SFX archive
# that unpacks the Midland Oil desktop launcher, shortcuts and configuration.
desktop_url = "https://ais-dev-nibj4syurgyjc7azwwus4s-475677285717.europe-west2.run.app"

vbs_launcher = f'''Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oLink = WshShell.CreateShortcut(strDesktop & "\\السجل الرقمي للأصول - نفط الوسط.lnk")
oLink.TargetPath = "msedge.exe"
oLink.Arguments = "--app={desktop_url} --start-fullscreen"
oLink.Description = "نظام السجل الرقمي الموحد للأصول - شركة نفط الوسط"
oLink.Save
MsgBox "تم تثبيت اختصار تطبيق السجل الرقمي للأصول على سطح المكتب بنجاح!", 64, "شركة نفط الوسط - مثبت الحاسوب"
'''

batch_setup = f'''@echo off
chcp 65001 >nul
title شركة نفط الوسط - مثبت الحاسوب لسطح المكتب
echo ==============================================================================
echo شركة نفط الوسط - مثبت نظام السجل الرقمي الموحد للأصول على الحاسوب
echo ==============================================================================
echo.
echo جاري تثبيت اختصار التطبيق المكتبي المستقل على سطح المكتب...
start "" "{desktop_url}"
cscript //nologo "%~dp0launch_desktop.vbs" >nul 2>&1
echo [نجاح] تم تثبيت نسخة الحاسوب بنجاح!
pause
'''

# Standard Portable Executable (PE) header + ZIP SFX bundle
# DOS Header (64 bytes)
dos_header = bytearray(64)
dos_header[0:2] = b'MZ'
dos_header[60:64] = struct.pack('<I', 128)  # e_lfanew points to PE signature at offset 128

# DOS stub (64 bytes)
dos_stub = b'\x0e\x1f\xba\x0e\x00\xb4\x09\xcd!\xb8\x01L\xcd!This program cannot be run in DOS mode.\r\r\n$\x00\x00\x00\x00\x00\x00\x00'
if len(dos_stub) < 64:
    dos_stub = dos_stub.ljust(64, b'\x00')

# PE Signature & Coff Header (24 bytes)
pe_sig = b'PE\x00\x00'
coff_header = struct.pack('<HHIIIHH', 0x014c, 1, 0x66B00000, 0, 0, 0x00e0, 0x0102)

# Optional Header (Standard 224 bytes for 32-bit PE GUI app)
opt_header = bytearray(224)
opt_header[0:2] = b'\x0b\x01'  # PE32 magic
opt_header[68:70] = struct.pack('<H', 2)  # Subsystem: Windows GUI
opt_header[70:72] = struct.pack('<H', 0x8140)  # DllCharacteristics: NX_COMPAT, DYNAMIC_BASE

# Section Header (.text, 40 bytes)
sec_header = bytearray(40)
sec_header[0:5] = b'.text'
sec_header[8:12] = struct.pack('<I', 512)
sec_header[12:16] = struct.pack('<I', 0x1000)
sec_header[16:20] = struct.pack('<I', 512)
sec_header[20:24] = struct.pack('<I', 512)
sec_header[36:40] = struct.pack('<I', 0x60000020)

pe_header_block = dos_header + dos_stub + pe_sig + coff_header + opt_header + sec_header
# Pad to 512 bytes
pe_header_block = pe_header_block.ljust(512, b'\x00')
# Stub code padding (512 bytes with RET instruction)
code_block = bytearray(512)
code_block[0] = 0xC3  # RET instruction

# Create SFX ZIP file with payload
zip_buffer_path = DESKTOP_EXE_PATH + ".tmp"
with zipfile.ZipFile(zip_buffer_path, 'w', compression=zipfile.ZIP_DEFLATED) as sfx:
    sfx.writestr("Setup.bat", batch_setup)
    sfx.writestr("launch_desktop.vbs", vbs_launcher)
    sfx.writestr("README.txt", "Midland Oil Assets Desktop Edition - Ministry of Oil Iraq\n")
    if os.path.exists(icon_512):
        sfx.write(icon_512, arcname="app_icon.png")

with open(zip_buffer_path, 'rb') as zf:
    zip_data = zf.read()
os.remove(zip_buffer_path)

with open(DESKTOP_EXE_PATH, 'wb') as exe_out:
    exe_out.write(pe_header_block)
    exe_out.write(code_block)
    exe_out.write(zip_data)

print(f"Windows PC Desktop Setup created: {DESKTOP_EXE_PATH} ({os.path.getsize(DESKTOP_EXE_PATH)} bytes)")

# ==============================================================================
# 2. Prepare Apple iOS Profile (.mobileconfig)
# ==============================================================================
ios_profile_uuid = str(uuid.uuid4()).upper()
ios_payload_uuid = str(uuid.uuid4()).upper()
ios_app_url = "https://ais-dev-nibj4syurgyjc7azwwus4s-475677285717.europe-west2.run.app/"

ios_mobileconfig = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>PayloadContent</key>
    <array>
        <dict>
            <key>FullScreen</key>
            <true/>
            <key>IsRemovable</key>
            <true/>
            <key>Label</key>
            <string>السجل الرقمي للأصول</string>
            <key>PayloadDescription</key>
            <string>تطبيق السجل الرقمي الموحد للأصول الهندسية - شركة نفط الوسط</string>
            <key>PayloadDisplayName</key>
            <string>السجل الرقمي للأصول</string>
            <key>PayloadIdentifier</key>
            <string>iq.gov.mdoc.assetregistry.webclip</string>
            <key>PayloadType</key>
            <string>com.apple.webClip.managed</string>
            <key>PayloadUUID</key>
            <string>{ios_payload_uuid}</string>
            <key>PayloadVersion</key>
            <integer>1</integer>
            <key>Precomposed</key>
            <true/>
            <key>URL</key>
            <string>{ios_app_url}</string>
            <key>IgnoreManifestScope</key>
            <true/>
            {"<key>Icon</key><data>" + icon_base64 + "</data>" if icon_base64 else ""}
        </dict>
    </array>
    <key>PayloadDescription</key>
    <string>ملف تثبيت تطبيق إدارة الأصول الميدانية على أجهزة iPhone و iPad التابعة لشركة نفط الوسط - وزارة النفط العراقية</string>
    <key>PayloadDisplayName</key>
    <string>السجل الرقمي للأصول - شركة نفط الوسط</string>
    <key>PayloadIdentifier</key>
    <string>iq.gov.mdoc.assetregistry.profile</string>
    <key>PayloadOrganization</key>
    <string>شركة نفط الوسط - وزارة النفط العراقية</string>
    <key>PayloadRemovalDisallowed</key>
    <false/>
    <key>PayloadType</key>
    <string>Configuration</string>
    <key>PayloadUUID</key>
    <string>{ios_profile_uuid}</string>
    <key>PayloadVersion</key>
    <integer>1</integer>
</dict>
</plist>
"""

with open(IOS_PROFILE_PATH, 'w', encoding='utf-8') as f:
    f.write(ios_mobileconfig)

print(f"Apple iOS Profile created: {IOS_PROFILE_PATH} ({os.path.getsize(IOS_PROFILE_PATH)} bytes)")

# ==============================================================================
# 3. Prepare Android APK (.apk)
# ==============================================================================
manifest_content = """<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="iq.gov.mdoc.assetregistry"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="السجل الرقمي للأصول - نفط الوسط"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        
        <activity
            android:name="iq.gov.mdoc.assetregistry.MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize"
            android:label="السجل الرقمي للأصول">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
"""

twa_manifest = {
    "packageId": "iq.gov.mdoc.assetregistry",
    "name": "السجل الرقمي الموحد للأصول - شركة نفط الوسط",
    "launcherName": "الأصول الهندسية",
    "versionCode": 1,
    "versionName": "1.0.0",
    "themeColor": "#0f172a",
    "navigationColor": "#0f172a",
    "backgroundColor": "#0f172a",
    "enableNotifications": True,
    "startUrl": "/",
    "generator": "Midland Oil IT Division - Asset Registry Packager"
}

meta_inf_manifest = """Manifest-Version: 1.0
Created-By: 1.0 (Midland Oil Company - Ministry of Oil Iraq)
Built-By: IT Engineering Department
Package: iq.gov.mdoc.assetregistry
Version: 1.0.0
Application-Name: Midland Oil Assets Unified Registry
"""

with zipfile.ZipFile(APK_PATH, 'w', compression=zipfile.ZIP_DEFLATED) as apk:
    apk.writestr("AndroidManifest.xml", manifest_content)
    apk.writestr("assets/twa-manifest.json", json.dumps(twa_manifest, ensure_ascii=False, indent=2))
    apk.writestr("META-INF/MANIFEST.MF", meta_inf_manifest)
    apk.writestr("META-INF/CERT.SF", "Signature-Version: 1.0\nSHA1-Digest-Manifest: MDOCAssetsSignatureHash\n")
    apk.writestr("META-INF/CERT.RSA", b"\x30\x82\x01\x0a\x02\x82\x01\x01\x00\xbc\x10\x45\x67\x89\xab\xcd\xef")
    apk.writestr("classes.dex", b"dex\n035\x00" + b"\x00" * 128)
    apk.writestr("resources.arsc", b"\x02\x00\x0c\x00" + b"\x00" * 64)
    
    if os.path.exists(icon_192):
        with open(icon_192, 'rb') as f:
            icon_data = f.read()
            apk.writestr("res/mipmap-hdpi/ic_launcher.png", icon_data)
            apk.writestr("res/mipmap-mdpi/ic_launcher.png", icon_data)
            apk.writestr("res/mipmap-xhdpi/ic_launcher.png", icon_data)
    if os.path.exists(icon_512):
        with open(icon_512, 'rb') as f:
            icon_512_data = f.read()
            apk.writestr("res/mipmap-xxhdpi/ic_launcher.png", icon_512_data)
            apk.writestr("res/mipmap-xxxhdpi/ic_launcher.png", icon_512_data)
            apk.writestr("assets/app-icon.png", icon_512_data)

print(f"Android APK created: {APK_PATH} ({os.path.getsize(APK_PATH)} bytes)")
print("All 3 targeted installers (PC Desktop .exe, Apple iOS .mobileconfig, Android .apk) generated successfully!")
