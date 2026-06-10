// ========================================
// DOM Ready
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有模块
    initNavigation();
    initParticleAnimation();
    initScrollAnimations();
    initCounterAnimation();
    initFeatureCards();
    initAlgorithmSteps();
    initSmoothScroll();
    initCustomTable();
    initStationButtons();
});


// ========================================
// Navigation
// ========================================
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    updateActiveNavLink();
    window.addEventListener('scroll', updateActiveNavLink);
    
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }
}

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 200;
        const sectionHeight = section.clientHeight;
        
        if (window.scrollY >= sectionTop && 
            window.scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
        }
    });
}


// ========================================
// Particle Animation
// ========================================
function initParticleAnimation() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 1 - 0.5;
            this.speedY = Math.random() * 1 - 0.5;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }
        
        draw() {
            ctx.fillStyle = `rgba(56, 178, 172, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    function initParticles() {
        particles = [];
        const numberOfParticles = Math.min(100, Math.floor(canvas.width * canvas.height / 10000));
        
        for (let i = 0; i < numberOfParticles; i++) {
            particles.push(new Particle());
        }
    }
    
    function connectParticles() {
        const maxDistance = 150;
        
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    const opacity = (1 - distance / maxDistance) * 0.2;
                    ctx.strokeStyle = `rgba(56, 178, 172, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }
    
    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        connectParticles();
        animationId = requestAnimationFrame(animateParticles);
    }
    
    initParticles();
    animateParticles();
}


// ========================================
// Scroll Animations
// ========================================
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.fade-in, .slide-up, .slide-left, .slide-right').forEach(el => {
        observer.observe(el);
    });
}


// ========================================
// Counter Animation
// ========================================
function initCounterAnimation() {
    const counters = document.querySelectorAll('.stat-number');
    
    const observerOptions = {
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = parseInt(counter.getAttribute('data-target'));
                const duration = 2000;
                const step = target / (duration / 16);
                let current = 0;
                
                const updateCounter = () => {
                    current += step;
                    if (current < target) {
                        counter.textContent = Math.floor(current);
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target;
                    }
                };
                
                updateCounter();
                observer.unobserve(counter);
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => observer.observe(counter));
}


// ========================================
// Feature Cards
// ========================================
function initFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');
    
    cards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 100}ms`;
    });
}


// ========================================
// Algorithm Steps
// ========================================
function initAlgorithmSteps() {
    const steps = document.querySelectorAll('.algorithm-step');
    
    steps.forEach((step, index) => {
        step.addEventListener('click', () => {
            steps.forEach(s => s.classList.remove('active'));
            step.classList.add('active');
        });
    });
}


// ========================================
// Smooth Scroll
// ========================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}


// ========================================
// 车站快捷按钮配置
// ========================================
// 在此配置快捷车站按钮列表
const quickStations = [
    '崇左',
    '柏果',
    '秀山',
    '常平',
    '改貌',
    '江村',
    '昆明东',
    '南宁南',
    '成都东',
    '久长',
    '全州',
    '兴安',
    '贵阳南'
    // 在此添加更多车站...
];

// ========================================
// 初始化快捷按钮
// ========================================
function initStationButtons() {
    const container = document.getElementById('station-buttons');
    if (!container) return;
    
    // 清空容器并添加提示注释
    container.innerHTML = '';
    
    // 动态生成车站按钮
    quickStations.forEach((station, index) => {
        const btn = document.createElement('button');
        btn.className = 'station-btn';
        btn.textContent = station;
        btn.setAttribute('data-station', station);
        btn.style.animationDelay = `${index * 50}ms`;
        
        btn.addEventListener('click', function() {
            generatePathInIframe(station);
        });
        
        container.appendChild(btn);
    });
    
    // 检查iframe加载
    checkIframeLoad();
}

function checkIframeLoad() {
    const iframe = document.getElementById('map-iframe');
    const fallback = document.getElementById('map-fallback');
    if (!iframe || !fallback) return;
    
    // 设置超时检测
    const timeout = setTimeout(() => {
        // 如果iframe没有内容，显示fallback
        try {
            if (!iframe.contentDocument || !iframe.contentDocument.body || 
                iframe.contentDocument.body.innerHTML.trim().length < 50) {
                iframe.style.display = 'none';
                fallback.style.display = 'flex';
            }
        } catch (e) {
            // 跨域错误，显示fallback
            iframe.style.display = 'none';
            fallback.style.display = 'flex';
        }
    }, 5000);
    
    // iframe加载成功后清除超时
    iframe.addEventListener('load', () => {
        clearTimeout(timeout);
        console.log('地图iframe加载成功');
    });
}

function generatePathInIframe(stationName) {
    const iframe = document.getElementById('map-iframe');
    if (!iframe) {
        console.log('地图iframe未找到');
        return;
    }
    
    try {
        // 直接尝试调用iframe内的函数
        if (iframe.contentWindow && iframe.contentWindow.generatePath) {
            iframe.contentWindow.generatePath(stationName);
            console.log('已生成到 ' + stationName + ' 的径路');
            return;
        }
        
        // 如果上面的方法失败，尝试延迟调用（等iframe完全加载）
        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            // iframe已加载，尝试调用
            if (iframe.contentWindow && iframe.contentWindow.generatePath) {
                iframe.contentWindow.generatePath(stationName);
                console.log('已生成到 ' + stationName + ' 的径路');
            } else {
                // 最后尝试：直接操作输入框
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const input = iframeDoc.getElementById('stationSearchInput');
                if (input) {
                    input.value = stationName;
                    // 触发输入事件
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                    console.log('已在地图中输入: ' + stationName);
                    
                    // 延迟触发搜索
                    setTimeout(() => {
                        const btn = iframeDoc.querySelector('button[title="生成径路"]');
                        if (btn) {
                            btn.click();
                            console.log('已点击生成径路按钮');
                        }
                    }, 100);
                }
            }
        } else {
            // iframe未加载完成，延迟调用
            console.log('等待iframe加载...');
            setTimeout(() => {
                if (iframe.contentWindow && iframe.contentWindow.generatePath) {
                    iframe.contentWindow.generatePath(stationName);
                    console.log(`(延迟调用) 已生成到 ${stationName} 的径路`);
                }
            }, 2000);
        }
    } catch (error) {
        console.warn('由于安全限制，无法自动操作地图。');
    }
}

// ========================================
// 自定义表格
// ========================================

function initCustomTable() {
    const tableBody = document.getElementById('custom-table-body');
    if (!tableBody) {
        console.log('表格容器不存在');
        return;
    }
    
    // 加载CSV数据
    loadCSVData().then(data => {
        if (data && data.length > 1) { // 至少需要表头+一行数据
            // 跳过表头（第一行）
            const rows = data.slice(1);
            
            // 清空表格
            tableBody.innerHTML = '';
            
            // 生成表格行
            rows.forEach((rowData, index) => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-row', index + 1);
                
                // 添加行索引
                const indexCell = document.createElement('td');
                indexCell.className = 'row-index';
                indexCell.textContent = index + 1;
                tr.appendChild(indexCell);
                
                // 添加数据单元格
                rowData.forEach((cellValue, colIndex) => {
                    const td = document.createElement('td');
                    
                    // 到站列（索引7）添加特殊样式
                    if (colIndex === 7) {
                        td.className = 'station-cell';
                    }
                    
                    // 空单元格添加样式
                    if (!cellValue || cellValue.trim() === '') {
                        td.className += ' empty-cell';
                        td.textContent = '-';
                    } else {
                        td.textContent = cellValue;
                    }
                    
                    // 到站列绑定双击事件
                    if (colIndex === 7) {
                        td.addEventListener('dblclick', function() {
                            const stationValue = cellValue && cellValue.trim();
                            const productValue = rowData[10] && rowData[10].trim(); // K列是索引10
                            
                            if (stationValue && productValue) {
                                console.log('双击到站:', stationValue, '品名:', productValue);
                                generatePathInIframe(stationValue);
                            } else {
                                console.log('条件不满足：到站或品名为空');
                            }
                        });
                    }
                    
                    tr.appendChild(td);
                });
                
                tableBody.appendChild(tr);
            });
            
            console.log('自定义表格初始化完成，共加载', rows.length, '行数据');
        }
    }).catch(error => {
        console.error('加载CSV数据失败:', error);
    });
}



// 加载CSV数据
async function loadCSVData() {
    try {
        const response = await fetch('js/车站演示数据.csv');
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error('加载CSV文件失败:', error);
        // 返回备用示例数据
        return [
            ['股道', '顺', '车种', '车号', '自重', '换长', '载重', '到站', '方向', '品名', '发站', '备注'],
            ['10', '1', 'C70', '1639156', '22.6', '1.3', '', '', '', '空', '鹧鸪江', ''],
            ['10', '2', 'P64AK', '3450003', '24.7', '1.5', '58', '怀化西', '1', '豆粕', '钦州港', ''],
            ['10', '3', 'P64AK', '3501652', '25.8', '1.5', '58', '吉首', '1', '豆粕', '钦州港', ''],
            ['10', '4', 'P70', '3829637', '25.4', '1.6', '70', '阁老坝', '1', '豆粕', '钦州港', ''],
            ['10', '5', 'P70', '3802275', '25', '1.6', '70', '久长', '1', '豆粕', '钦州港', ''],
            ['10', '6', 'P70', '3813672', '24.5', '1.6', '70', '久长', '1', '豆粕', '钦州港', ''],
            ['10', '7', 'P64K', '3407457', '25.4', '1.5', '58', '改貌', '1', '豆粕', '钦州港', ''],
            ['10', '8', 'C64K', '4826899', '21.6', '1.2', '36', '羊坪', '1', '铬矿石', '钦州港', ''],
            ['10', '9', 'NX70AF', '5742054', '23.8', '1.3', '', '', '', '空', '钦州港', '']
        ];
    }
}

// 解析CSV
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    return lines.map(line => {
        // 处理带引号的CSV格式
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // 处理双引号转义
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        
        return result;
    });
}
