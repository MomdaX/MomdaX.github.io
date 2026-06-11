# 音乐播放器组件

独立音乐播放器组件，支持播放控制、音频可视化和进度显示。

## 文件结构

```
music/
├── music.html   # HTML 模板
├── music.css    # 样式表
├── music.js     # 功能逻辑
└── README.md    # 本文档
```

## 使用方式

在主页面中通过动态加载方式引入：

```javascript
(async () => {
    const htmlRes = await fetch('music/music.html');
    const html = await htmlRes.text();
    document.body.insertAdjacentHTML('beforeend', html);
    const { initMusicPlayer } = await import('./music/music.js');
    initMusicPlayer();
})();
```

同时需要在 `<head>` 中引入样式：

```html
<link rel="stylesheet" href="music/music.css">
```

## 功能特性

- 播放/暂停
- 上一曲/下一曲
- 进度条拖动跳转
- 音频可视化波形
- 歌曲信息显示（标题/艺术家）
- 时间显示

## 依赖

- 音频文件列表：`../assets/audio/music.json`
- 音频文件目录：`../assets/audio/`

## 兼容性

需要浏览器支持 Web Audio API。
