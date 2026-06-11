/**
 * 粒子特效
 */
export function startParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    let points = [];
    const PARTICLE_COUNT = 65;
    const CONNECT_DIST = 5500;
    
    function resizeCanvas() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        points.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.4 + 0.2,
        });
    }
    
    function draw() {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        for (let p of points) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(210, 225, 255, 0.7)';
            ctx.fill();
        }
        for (let i = 0; i < points.length; i++) {
            for (let j = i+1; j < points.length; j++) {
                const dx = points[i].x - points[j].x;
                const dy = points[i].y - points[j].y;
                const dist = dx*dx + dy*dy;
                if (dist < CONNECT_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(points[i].x, points[i].y);
                    ctx.lineTo(points[j].x, points[j].y);
                    ctx.strokeStyle = `rgba(140, 180, 255, ${0.25 * (1 - dist/CONNECT_DIST)})`;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
}