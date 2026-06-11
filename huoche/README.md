# 火车轨道场景组件

基于 Three.js 的 3D 火车轨道场景，包含列车模型、车灯光束、风阻效果等。

## 文件结构

```
huoche/
├── TrackBuilder.js      # 场景管理器（轨道、相机、动画）
├── TrainWithLights.js   # 列车封装类（模型、车灯、风阻）
├── three.module.js      # Three.js 模块版
├── three.core.js        # Three.js 核心
├── MTLLoader.js         # MTL 材质加载器
├── OBJLoader.js         # OBJ 模型加载器
├── OrbitControls.js     # 轨道控制器
├── huoche8.mtl/obj      # 8节车厢列车模型
├── huoche16.mtl/obj     # 16节车厢列车模型
└── README.md            # 本文档
```

## 火车模型方向参数

### 原始模型坐标系
- **车头方向**：+X（模型原始朝向）
- **车尾方向**：-X
- **车顶方向**：+Y
- **车身侧面**：±Z

### 旋转后世界坐标系
火车模型绕 Y 轴旋转 `Math.PI / 2`（90度）后：

| 局部坐标 | 世界坐标 | 说明 |
|---------|---------|------|
| +X | +Z | 车头朝向 |
| -X | -Z | 轥尾方向 |
| +Z | -X | 车身右侧 |
| -Z | +X | 车身左侧 |
| +Y | +Y | 车顶（不变） |

### 运动方向
- **行驶方向**：+Z（从 -Z 向 +Z 移动）
- **初始位置**：Z = -48（远处进入）
- **暂停位置**：Z = 0（场景中心）
- **边界范围**：Z ∈ [-100, +100]

### 车灯方向
- **光源位置**：局部坐标 (-26.5, 0.52, ±0.13) → 世界坐标约 (-Z方向, 高处, ±X偏移)
- **照射方向**：局部 +X → 世界 +Z（车头前方）
- **光束延伸**：沿行驶方向向前照射

### 风阻效果方向
- **流线起点**：局部坐标 -X 方向 → 世界坐标 -Z 方向（车尾后方）
- **流线延伸**：从车尾向后方扩散
- **湍流粒子**：车尾后方随机分布

## 关键参数

### TrainWithLights 参数
```javascript
{
    trainMtl: 'huoche/huoche8.mtl',
    trainObj: 'huoche/huoche8.obj',
    trainScale: 1.5,           // 模型缩放
    trainRotationY: Math.PI/2, // Y轴旋转（使车头朝向+Z）
    trainYOffset: 0.5,         // Y轴偏移（调整高度）
    
    // 车灯参数
    headlightIntensity: 30.0,
    headlightDistance: 360,
    headlightAngle: Math.PI/6,
    headlightPenumbra: 0.12,
    headlightDecay: 1.5,
}
```

### TrackBuilder 参数
```javascript
{
    trackLength: 300,      // 轨道长度
    gauge: 2.0,            // 轨距
    trainSpeed: 0.05,      // 列车速度
    boundsMinZ: -100,      // Z轴最小边界
    boundsMaxZ: 100,       // Z轴最大边界
    cameraPos: {x:20, y:10, z:50},  // 相机位置
    cameraTarget: {x:0, y:0.3, z:0} // 相机目标
}
```

## 使用方式

```javascript
import TrackBuilder from './huoche/TrackBuilder.js';

// 创建场景
const railTrackSystem = new TrackBuilder(document.getElementById('canvas'));
railTrackSystem.init();

// API
railTrackSystem.toggleHeadlights();    // 切换车灯
railTrackSystem.toggleWindEffect();    // 切换风阻效果
railTrackSystem.setTrainSpeed(0.08);   // 设置速度
railTrackSystem.resetCamera();         // 重置相机
railTrackSystem.dispose();             // 清理资源
```

## 动画状态

列车动画分为三个阶段：

1. **entering**：从 Z=-48 进入，向 +Z 移动
2. **paused**：到达 Z=0 后暂停 5 秒
3. **exiting**：继续向 +Z 移动，超出边界后循环

## 风阻效果说明

### 三层流线系统
- **近场**（25条）：白色，半径 0.6，紧贴车身
- **中场**（30条）：淡蓝色，半径 1.0，中层扩散
- **远场**（25条）：深蓝色，半径 1.5，大范围延伸

### 尾部湍流
- 40个粒子在车尾后方随机分布
- 模拟气流分离涡旋效果
- 随速度动态调整透明度和大小

## 注意事项

1. **坐标系转换**：所有添加到 `trainModel` 的子对象使用局部坐标，会随模型旋转自动转换到世界坐标
2. **风阻方向**：风阻效果沿局部 -X 方向创建，旋转后自动变成世界 -Z 方向（车尾后方）
3. **车灯方向**：车灯沿局部 +X 方向照射，旋转后自动变成世界 +Z 方向（车头前方）
4. **性能**：风阻效果在列车静止时自动隐藏，避免不必要的渲染