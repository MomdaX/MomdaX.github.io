# Momda_X 网站导航

一个现代化的个人导航主页，集成多种视觉特效和常用网站链接。

## 功能特性

- 🎨 **粒子线条特效** - 交互式粒子背景，支持鼠标跟随
- ❤️ **心形漂浮特效** - 浪漫的心形动画效果
- 📁 **项目导航** - 快速访问调车计划和铁路地图项目
- 🔗 **常用网站导航墙** - 收藏的常用网站快捷访问

## 项目结构

```
MomdaX.github.io/
├── index.html          # 主页（导航页面）
├── dcjh/               # 调车计划网站
│   └── index.html
└── tldt/               # 铁路地图网站
    ├── index.html
    ├── v1.0/           # 版本1.0资源
    ├── js/             # JavaScript文件
    └── css/            # 样式文件
```

## 在线访问

- **主页**: https://momdax.github.io
- **调车计划**: https://momdax.github.io/dcjh/
- **铁路地图**: https://momdax.github.io/tldt/

## 常用网站导航

| 分类 | 网站 |
|------|------|
| 个人 | MomdaX GitHub, Canvas 演示合集 |
| 工具 | 工具软件, 爬虫工具库, VBMAN/2 |
| 可视化 | 可视化平台, 车站可视化, 中国铁路地图 |

## 技术栈

- HTML5
- CSS3 (动画、渐变、响应式)
- JavaScript (粒子系统、动画)
- jQuery (心形特效)

## 特效说明

1. **粒子线条特效**：白色粒子在背景中随机移动，粒子之间根据距离自动连接形成线条，鼠标移动时粒子会被吸引跟随

2. **心形漂浮特效**：粉红色爱心从页面底部不断向上飘动，大小、位置、颜色随机变化

## 开发

```bash
# 克隆仓库
git clone https://github.com/MomdaX/MomdaX.github.io.git

# 本地预览
# 使用浏览器直接打开 index.html
```

## 部署

项目已配置 GitHub Pages，每次提交到 `main` 分支后自动部署。

## 许可证

MIT License