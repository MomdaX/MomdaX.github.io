# 特效组件

背景装饰特效组件，包含粒子效果和爱心飘浮效果。

## 文件结构

```
effects/
├── particles.html   # 粒子特效 HTML
├── particles.css    # 粒子特效样式
├── particles.js     # 粒子特效逻辑
├── hearts.html      # 爱心特效 HTML
├── hearts.css       # 爱心特效样式
├── hearts.js        # 爱心特效逻辑
└── README.md        # 本文档
```

## 使用方式

在 `<head>` 中引入样式：

```html
<link rel="stylesheet" href="effects/particles.css">
<link rel="stylesheet" href="effects/hearts.css">
```

在页面中动态加载并启动特效：

```javascript
import { startParticles } from './effects/particles.js';
import { startHeartAnimation } from './effects/hearts.js';

// 加载粒子特效 HTML
const particlesRes = await fetch('effects/particles.html');
document.body.insertAdjacentHTML('afterbegin', await particlesRes.text());
startParticles();

// 加载爱心特效 HTML
const heartsRes = await fetch('effects/hearts.html');
document.body.insertAdjacentHTML('afterbegin', await heartsRes.text());
startHeartAnimation();
```

## 特效说明

### 粒子特效
- 65个随机运动的粒子
- 粒子间距离较近时自动连线
- 响应窗口大小变化

### 爱心特效
- 随机大小的飘浮爱心
- 从底部向上飘动并渐隐
- 随机颜色和动画时长
