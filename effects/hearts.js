/**
 * 爱心特效
 */
export function startHeartAnimation() {
    const heartContainer = document.querySelector('.bg_heart');
    if (!heartContainer) return;
    setInterval(() => {
        const size = Math.floor(Math.random() * 45) + 18;
        const left = Math.random() * 95;
        const duration = Math.random() * 4 + 4;
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.style.width = size + 'px';
        heart.style.height = size + 'px';
        heart.style.left = left + '%';
        heart.style.backgroundColor = `rgba(255, ${120 + Math.random() * 80}, 150, 0.7)`;
        heart.style.animation = `love ${duration}s ease-in forwards`;
        heartContainer.appendChild(heart);
        setTimeout(() => heart.remove(), duration * 1000);
    }, 520);
}