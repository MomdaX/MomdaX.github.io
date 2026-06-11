# 汽车模型组件 (sm_car)

小米SU7风格的3D汽车模型，使用 GLTF 格式。

## 文件结构

```
sm_car/
├── sm_car.gltf       # GLTF 模型描述文件
├── sm_car_data.bin   # 模型几何数据
├── sm_car_img0-8.webp # 模型纹理贴图（9张）
├── CarModel.js       # 模型封装类
└── README.md         # 本文档
```

## 使用方式

```javascript
import CarModel from './sm_car/CarModel.js';

// 创建汽车模型
const car = new CarModel({
    scale: 0.4,
    position: { x: -20, y: 0.3, z: 15 },
    rotation: { x: 0, y: Math.PI * 0.8, z: 0 }
});

// 加载模型
await car.loadModel();

// 添加到场景
scene.add(car.getGroup());

// API
car.setPosition(x, y, z);   // 设置位置
car.setRotation(x, y, z);   // 设置旋转
car.setScale(scale);        // 设置缩放
car.dispose();              // 清理资源
```

## 模型参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| modelPath | 'sm_car/sm_car.gltf' | 模型路径 |
| scale | 0.5 | 缩放比例 |
| position | {x:-15, y:0.5, z:0} | 位置 |
| rotation | {x:0, y:π/2, z:0} | 旋转（车头朝向+Z） |

## 依赖

- Three.js（通过 CDN 导入 GLTFLoader）
- importmap 配置：
```html
<script type="importmap">
{
    "imports": {
        "three": "./huoche/three.module.js",
        "three/addons/loaders/GLTFLoader.js": "https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/loaders/GLTFLoader.js"
    }
}
</script>
```

## 来源

模型来自 [su7-replica-master](https://github.com/su7-replica) 项目，小米SU7网站特效复刻。