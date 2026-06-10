# 🚂 中图铁路地图 - 技术介绍网站

> 一个精美、易懂的技术揭秘网站，展示铁路地图最短径路生成系统的技术架构与核心算法实现。

## 🌟 特性

- **震撼视觉效果** - Canvas粒子动画 + 流畅滚动动画
- **直观算法演示** - A*与Dijkstra算法的图文并茂解释
- **清晰架构展示** - 三层架构图解，模块关系一目了然
- **响应式设计** - 完美适配桌面、平板、手机各种设备
- **流畅交互动画** - GSAP动画引擎驱动，带来极致体验

## 🎯 核心技术

| 技术 | 说明 |
|------|------|
| **A\*算法** | 启发式搜索，高效定位最短路径 |
| **Dijkstra算法** | 贪心策略，保证全局最优解 |
| **D3.js** | SVG地图渲染与数据可视化 |
| **GSAP** | 专业级动画引擎 |
| **Canvas API** | 粒子系统与动态背景 |

## 📦 快速开始

### 方式一：直接打开

双击 `index.html` 文件，即可在浏览器中查看网站。

### 方式二：本地服务器

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# 然后访问 http://localhost:8000
```

## 🎨 网站内容

### 1. 首页 (Hero)
- 动态粒子背景效果
- 数据统计动画
- 快速导航入口

### 2. 核心功能
- 铁路网络展示
- 智能站点搜索
- 最短径路生成
- 动态可视化
- 性能优化

### 3. 技术架构
- 表现层 (HTML/CSS/JS)
- 业务逻辑层 (Map.js, PathFinder.js, Search.js)
- 数据层 (节点数据, 线路数据, 中间站数据)

### 4. 算法原理
- A\*算法详解 (f(n) = g(n) + h(n))
- Dijkstra算法详解
- 算法对比与选择策略

### 5. 技术亮点
- O(1)节点索引优化
- 图数据结构设计
- 批量DOM操作
- 路径动画效果
- 颜色编码系统
- 智能缩放适配

### 6. 数据流程
- 用户输入
- 站点匹配
- 路径计算
- 可视化渲染
- 结果显示

## 🔧 技术栈

- **HTML5** - 语义化页面结构
- **CSS3** - 现代CSS特性（变量、Grid、Flexbox）
- **JavaScript (ES6+)** - 原生JavaScript，无框架依赖
- **FontAwesome 6** - 专业图标库
- **Google Fonts** - 思源黑体 + 思源宋体
- **GSAP** - 动画引擎
- **Canvas API** - 粒子效果

## 📁 项目结构

```
铁路地图SVG版/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   └── main.js         # 交互逻辑
├── v1.0/              # 原铁路地图系统
├── .trae/
│   └── documents/     # PRD与技术文档
├── 技术文档.md         # 详细技术说明
└── README.md          # 本文件
```

## 🎓 学习资源

- [MDN Web Docs - Canvas API](https://developer.mozilla.org/zh-CN/docs/Web/API/Canvas_API)
- [GSAP Animation Library](https://greensock.com/gsap/)
- [A* Pathfinding Algorithm](https://en.wikipedia.org/wiki/A*_search_algorithm)
- [Dijkstra's Algorithm](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)
- [D3.js Documentation](https://d3js.org/)

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

*用 ❤️ 与代码构建 | 2026*
