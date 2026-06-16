# 火车轨道 3D 场景组件

基于 Three.js 的 3D 火车轨道场景，包含列车模型、车灯光束、空气动力学流场效果、弹射动画等完整功能。

---

## 目录

- [文件结构](#文件结构)
- [坐标系结构](#坐标系结构)
- [轨道参数](#轨道参数)
- [列车模型参数](#列车模型参数)
- [车灯系统](#车灯系统)
- [弹射动画系统](#弹射动画系统)
- [空气动力学流场](#空气动力学流场)
- [灯光系统](#灯光系统)
- [相机参数](#相机参数)
- [API 接口](#api-接口)
- [状态持久化](#状态持久化)
- [使用示例](#使用示例)
- [注意事项](#注意事项)

---

## 文件结构

```
huoche/
├── TrackBuilder.js      # 场景管理器（轨道、相机、弹射动画）
├── TrainWithLights.js   # 列车封装类（模型、车灯、风阻效果）
├── three.module.js      # Three.js 模块版
├── three.core.js        # Three.js 核心
├── MTLLoader.js         # MTL 材质加载器
├── OBJLoader.js         # OBJ 模型加载器
├── OrbitControls.js     # 轨道控制器
├── huoche8.mtl          # 8节车厢列车材质
├── huoche8.obj          # 8节车厢列车模型
├── huoche16.mtl         # 16节车厢列车材质
├── huoche16.obj         # 16节车厢列车模型
├── 火车轨道.html        # 独立演示页面
└── README.md            # 本文档
```

---

## 坐标系结构

### 世界坐标系定义

| 轴 | 方向 | 说明 |
|----|------|------|
| **+X** | 列车前进方向 | 列车从 -X 向 +X 移动 |
| **-X** | 列车尾部方向 | 列车后方 |
| **+Y** | 垂直向上 | 高度方向 |
| **-Y** | 垂直向下 | 地面方向 |
| **+Z** | 右侧（观察者视角） | 轨道右侧 |
| **-Z** | 左侧（观察者视角） | 轨道左侧 |

### 关键位置坐标

| 位置名称 | X 坐标 | 说明 |
|----------|--------|------|
| START_X | -600 | 列车起点（远处入场） |
| BRAKE_X | -100 | 开始减速位置 |
| CENTER_X | 0 | 坐标系中心 |
| EXIT_X | 500 | 列车退出位置（循环边界） |

### 轨道坐标系

```
轨道沿 X 轴延伸，总长度 1660 单位

        -600        -100          0          500
    START_X      BRAKE_X      CENTER_X     EXIT_X
         |           |           |           |
    ─────┼───────────┼───────────┼───────────┼─────  X轴
         ↓           ↓           ↓           ↓
      列车起点    减速点      场景中心    退出点


钢轨位置（Z轴分布）：
         左轨 (-Z)          右轨 (+Z)
            │                  │
            │    轨距=2.0     │
            │←───── 1.0 ─────→│
         Z=-1.0              Z=+1.0
```

---

## 轨道参数

### 默认参数值

| 参数 | 默认值 | 说明 |
|------|--------|------|
| trackLength | 1660 | 轨道总长度（X轴方向） |
| gauge | 2.0 | 轨距（两条钢轨中心距离） |
| railHalfWidth | 0.12 | 钢轨半宽（实际宽度 0.24） |
| railHeight | 0.28 | 钢轨高度 |
| sleeperWidth | 3.2 | 枕木长度（Z轴方向） |
| sleeperHeight | 0.12 | 枕木厚度（Y轴方向） |
| sleeperDepth | 0.45 | 枕木宽度（X轴方向） |
| sleeperSpacing | 1.28 | 枕木间距（中心到中心） |
| railColor | 0xb8c8dc | 钢轨颜色（冷灰蓝） |
| sleeperColor | 0x9c6e3e | 枕木颜色（暖褐色） |

### 钢轨位置计算

```javascript
// 钢轨 Y 坐标：枕木上表面 + 钢轨半高 + 微小间隙
const railY = sleeperHeight + railHeight / 2 + 0.012;
// railY = 0.12 + 0.14 + 0.012 = 0.272

// 左轨位置
leftRail.position.set(0, railY, -gauge / 2);  // (0, 0.272, -1.0)

// 右轨位置
rightRail.position.set(0, railY, gauge / 2);  // (0, 0.272, +1.0)
```

### 枕木分布计算

```javascript
const halfLen = trackLength / 2;  // 830
const startX = -halfLen + sleeperSpacing / 2;  // -830 + 0.64 = -829.36
const endX = halfLen - sleeperSpacing / 2;     // 830 - 0.64 = 829.36
const count = Math.floor((endX - startX) / sleeperSpacing) + 1;
// count ≈ 1297 根枕木

// 每根枕木位置
sleeper.position.set(xPos, sleeperHeight / 2, 0);  // Y = 0.06
```

---

## 列车模型参数

### 模型加载参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| trainMtl | 'huoche/huoche8.mtl' | 8节车厢材质文件 |
| trainObj | 'huoche/huoche8.obj' | 8节车厢模型文件 |
| trainScale | 1.5 | 模型缩放比例 |
| trainRotationY | 0 | Y轴旋转角度（沿X轴运动无需旋转） |
| trainYOffset | 0.5 | Y轴高度偏移 |

### 列车边界框（加载后自动计算）

```javascript
trainDimensions = {
    length: size.x,    // 列车长度（沿运动方向 X）
    width: size.z,     // 列车宽度（Z方向）
    height: size.y,    // 列车高度（Y方向）
    rearX: min.x,      // 列车尾部 X 坐标（后方）
    frontX: max.x,     // 列车头部 X 坐标（前方）
    topY: max.y,       // 列车顶部 Y 坐标
    bottomY: min.y     // 列车底部 Y 坐标
}
```

### 列车组位置

```javascript
// 列车组初始位置
trainGroup.position.x = currentX;  // 默认 -48，弹射动画会更新

// 模型内部偏移（相对于 trainGroup）
trainModel.position.set(0, offsetY, 0);
// offsetY = trainYOffset - box.min.y（调整使底部对齐轨道）
```

---

## 车灯系统

### 车灯参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| headlightColor | 0xffffff | 车灯颜色（白色） |
| headlightIntensity | 30.0 | 车灯强度 |
| headlightDistance | 360 | 照射距离 |
| headlightAngle | Math.PI / 6 | 光束角度（30°） |
| headlightPenumbra | 0.12 | 边缘柔化 |
| headlightDecay | 1.5 | 光衰减 |

### 车灯位置计算

```javascript
// 两盏车灯在 Z 轴方向分布（左右）
const zOffset = (i === 0 ? -dims.width * 0.15 : dims.width * 0.15);

// 车灯高度
const lightY = dims.height * 0.2;

// 车灯 X 坐标（在列车前方）
const lightX = dims.frontX - 26;

// 车灯位置
headlight.position.set(lightX, lightY, zOffset);

// 目标位置（照射方向：+X）
headlight.target.position.set(lightX + 35 * trainScale, 0.2 * trainScale, zOffset);
```

### 光束几何

```javascript
// 多层锥形光束（沿 X 轴方向）
const beamLength = 66 * trainScale;  // 光束长度

// 光束层配置
const layers = [
    { startRadius: 0.08, endRadius: 0.5,  opacity: 0.9 },   // 核心层
    { startRadius: 0.15, endRadius: 0.75, opacity: 0.6 },   // 中层
    { startRadius: 0.22, endRadius: 1.0,  opacity: 0.4 },   // 外层
    { startRadius: 0.3,  endRadius: 1.3,  opacity: 0.25 }   // 边缘层
];

// 光束位置（从车灯开始，沿 +X 延伸）
beam.position.set(lightX + beamLength / 2, lightY - index * 0.005, zOffset);
```

### 车内灯光

```javascript
// 窗户材质名称
const windowMaterialNames = ['Material__1775', 'Object016_mso', 'Material__79'];

// 窗户发光强度
// 正常窗户：emissiveIntensity = 2.5
// 尾部中间窗户：emissiveIntensity = 0.6（微光）
// 尾部上方窗户：emissiveIntensity = 0（不发光）

// 内部点光源位置
const lightSpacing = bodyLength * 0.18;  // 灯光间距
const midY = (dims.topY + dims.bottomY) * 0.5 + bodyHeight * 0.15;
```

### 尾部停车灯

```javascript
// 尾部停车灯位置
const tailY = (dims.topY + dims.bottomY) * 0.5 - 0.35;
const tailX = dims.rearX + 22.3;  // 尾部端面内侧

// 左右两个红色停车灯
for (const side of [-1, 1]) {
    const z = side * dims.width * 0.2;
    light.position.set(tailX, tailY, z);  // 红色点光源
    bulb.position.set(tailX, tailY, z);   // 红色发光小球
}
```

---

## 弹射动画系统

### 速度参数

| 参数 | 值 | 说明 |
|------|-----|------|
| V_HIGH | 3500 km/h ≈ 97.2 m/s | 高速巡航速度 |
| V_LOW | 25 km/h ≈ 6.94 m/s | 低速滑行速度 |
| V_OVERSHOOT | 22 km/h ≈ 6.11 m/s | 过冲速度 |

### 时间参数

| 参数 | 值 | 说明 |
|------|-----|------|
| BRAKE_DURATION | 0.1 秒 | 骤降阶段持续时间 |
| OVERSHOOT_DURATION | 0.04 秒 | 过冲回稳时间 |
| SETTLE_DURATION | 10.0 秒 | 低速滑行稳定时间 |
| ACCEL_DURATION | 5 秒 | 加速阶段持续时间 |

### 曲线参数

| 参数 | 值 | 说明 |
|------|-----|------|
| BRAKE_EXPONENT | 3 | 骤降曲线锐度（越大越陡） |
| ACCEL_EXPONENT | 0.2 | 加速曲线锐度 |

### 动画阶段流程

```
阶段流程图：

1. waiting → cruise_in
   ─────────────────────────
   列车在 START_X (-600) 等待
   开始高速入场 (350 km/h)

2. cruise_in → brake
   ─────────────────────────
   到达 BRAKE_X (-100) 开始减速
   速度骤降曲线

3. brake → overshoot
   ─────────────────────────
   骤降完成后过冲回稳
   速度瞬间降到 V_OVERSHOOT

4. overshoot → settle
   ─────────────────────────
   低速稳定滑行 10 秒
   速度保持 V_LOW (25 km/h)

5. settle → accelerate
   ─────────────────────────
   开始加速离开
   从 V_LOW 加速到 V_HIGH

6. accelerate → cruise_out
   ─────────────────────────
   高速离开 (350 km/h)
   到达 EXIT_X (500) 循环

7. cruise_out → waiting
   ─────────────────────────
   超出边界后回到起点
   循环重新开始
```

### 速度曲线公式

```javascript
// 骤降阶段（指数曲线）
const progress = elapsed / BRAKE_DURATION;
const easedProgress = 1 - Math.pow(1 - progress, BRAKE_EXPONENT);
velocity = V_HIGH - (V_HIGH - V_LOW) * easedProgress;

// 加速阶段
const progress = elapsed / ACCEL_DURATION;
const easedProgress = 1 - Math.pow(1 - progress, ACCEL_EXPONENT);
velocity = V_LOW + (V_HIGH - V_LOW) * easedProgress;
```

---

## 空气动力学流场

### 流场物理模型

列车沿 +X 方向运动，空气在列车坐标系下沿 -X 方向流动（从前向后）。

```
流场结构：

    车头滞止区              车身边界层              车尾尾涡区
    ┌─────────┐          ┌─────────────┐          ┌─────────┐
    │  高压   │          │   贴附流    │          │  涡旋  │
    │  发光   │ ──────── │  侧/顶/底   │ ──────── │  发光  │
    └─────────┘          └─────────────┘          └─────────┘
     frontX                 车身范围                 rearX
```

### 流线分布

| 区域 | 流线数量 | 说明 |
|------|----------|------|
| 顶部 | 9 条 | 车顶上方气流分流 |
| 侧面（左） | 30 条 | 左侧车身贴附流 |
| 侧面（右） | 30 条 | 右侧车身贴附流 |
| 底部 | 3 条 | 车底气流 |

### 流场长度参数

```javascript
const lead = dims.length * 1.6;   // 车头前流场长度
const trail = dims.length * 2.2;  // 车尾后流场长度
const clearance = Math.max(0.25 * scale, halfW * 0.35); // 越流间隙
```

### 粒子系统

```javascript
const PCOUNT = 1100;  // 粒子总数

// 粒子大小
aSize = (0.3 + Math.random() * 1) * scale * 0.8;

// 流动速度
speed = 0.08 + fract(seed * 7.31) * 0.12;
flowSpeed = speed * (0.4 + intensity * 2.2);
```

### 车头滞止区发光

```javascript
// 位置
stagnationSprite.position.set(dims.frontX, midY, 0);

// 尺寸
const base = Math.max(1.2, halfH * 1.4);
sp.scale.set(base, base, 1);

// 脉冲效果
const pulse = 0.6 + 0.4 * Math.sin(time * 6.0);
opacity = intensity * 0.8 * pulse;
```

### 车尾尾涡发光

```javascript
// 位置
wakeSprite.position.set(dims.rearX, midY, 0);

// 尺寸
const base = Math.max(1.6, halfH * 1.8);
sp.scale.set(base * 1.3, base * 1.1, 1);

// 抖动效果
const wobble = 0.7 + 0.3 * Math.sin(time * 3.0 + 1.0);
opacity = intensity * 0.5 * wobble;
```

---

## 灯光系统

### 场景灯光配置

| 灯光类型 | 颜色 | 强度 | 位置 |
|----------|------|------|------|
| AmbientLight | 0x4a5c72 | 0.68 | 全局 |
| DirectionalLight (主) | 0xffffff | 1.15 | (4, 6, 3) |
| DirectionalLight (背) | 0xccaa88 | 0.45 | (-2.5, 2.2, -4) |
| PointLight (边缘) | 0x6c9ed9 | 0.5 | (2.8, 1.6, -3) |
| PointLight (填充) | 0xcbaa77 | 0.28 | (0, -0.9, 0) |
| PointLight (前填充) | 0xaaccff | 0.38 | (0, 1.0, 4.2) |
| HemisphereLight | 0x6c8eb0 / 0x3a2c22 | 0.42 | 天空/地面 |

---

## 相机参数

### 默认相机位置

```javascript
cameraPos: { x: 50, y: 10, z: 20 }   // 相机位置
cameraTarget: { x: 0, y: 0.3, z: 0 } // 观察目标点
```

### 相机配置

```javascript
// 透视相机
const camera = new THREE.PerspectiveCamera(66, aspect, 0.01, 1000);

// 控制器参数
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 1.2;
controls.zoomSpeed = 1.3;
controls.panSpeed = 0.8;
controls.enableZoom = true;
controls.enablePan = true;
```

---

## API 接口

### TrackBuilder API

```javascript
// 创建场景
const railway = new TrackBuilder('canvas-id');
railway.init();

// 车灯控制
railway.toggleHeadlights();  // 切换车灯（同时控制列车运行）
railway.headlightOn;         // 获取车灯状态

// 列车控制
railway.startTrain();        // 启动列车
railway.stopTrain();         // 停止列车
railway.trainRunning;        // 获取运行状态
railway.setTrainSpeed(0.08); // 设置速度

// 弹射动画
railway.getLaunchState();    // 获取动画状态
railway.configureLaunch({    // 配置参数
    V_HIGH: 500,
    BRAKE_DURATION: 0.08,
    SETTLE_DURATION: 8
});
railway.resetLaunch();       // 重置动画

// 风阻效果
railway.toggleWindEffect();  // 切换风阻效果

// 相机
railway.resetCamera();       // 重置相机位置

// 轨道
railway.rebuildTrack({       // 重建轨道
    trackLength: 2000,
    gauge: 2.5
});

// 状态
railway.clearSavedState();   // 清除保存的状态

// 清理
railway.dispose();           // 释放资源
```

### TrainWithLights API

```javascript
// 加载模型
train.loadTrain(onProgress);

// 位置控制
train.getPosition();         // 获取 X 位置
train.setPosition(x);        // 设置 X 位置

// 速度控制
train.getVelocity();         // 获取速度
train.setVelocity(v);        // 设置速度

// 车灯控制
train.toggle();              // 切换车灯
train.setHeadlightOn(true);  // 设置车灯状态
train.headlightOn;           // 获取车灯状态

// 风阻效果
train.updateWindEffect(speed);      // 更新风阻
train.setWindEffectEnabled(true);   // 设置风阻开关
train.windEffectEnabled;            // 获取风阻状态

// 获取组
train.getGroup();            // 获取列车组（添加到场景）

// 清理
train.dispose();             // 释放资源
```

---

## 状态持久化

### 保存的状态

```javascript
const state = {
    headlightOn: boolean,      // 车灯状态
    isRunning: boolean,        // 运行状态
    cameraPos: { x, y, z },    // 相机位置
    cameraTarget: { x, y, z }, // 观察目标
    launchPhase: string,       // 弹射动画阶段
    trainPosition: number,     // 列车位置
    timestamp: Date.now()      // 时间戳
};

// 存储位置
localStorage.setItem('trainState', JSON.stringify(state));
localStorage.setItem('trainCameraState', JSON.stringify(cameraState));
```

### 状态恢复

```javascript
// 自动恢复
railway._restoreState();

// 清除状态
railway.clearSavedState();
```

---

## 使用示例

### 基础使用

```javascript
import TrackBuilder from './huoche/TrackBuilder.js';

// 创建场景
const railway = new TrackBuilder('train-canvas');
railway.init();

// 列车自动运行，车灯自动开启
```

### 自定义配置

```javascript
import TrackBuilder from './huoche/TrackBuilder.js';

const railway = new TrackBuilder('train-canvas');
railway.init({
    trackLength: 2000,
    gauge: 2.5,
    cameraPos: { x: 80, y: 15, z: 30 }
});

// 配置弹射动画
railway.configureLaunch({
    V_HIGH: 400,           // 400 km/h
    V_LOW: 30,             // 30 km/h
    SETTLE_DURATION: 8,    // 8秒滑行
    BRAKE_X: -120          // 减速位置
});
```

### 独立演示页面

直接打开 `火车轨道.html` 文件，可查看独立的轨道演示（不含列车模型）。

---

## 注意事项

### 坐标系转换

1. **列车运动方向**：列车沿 +X 方向运动，从 START_X (-600) 向 EXIT_X (500) 移动
2. **轨道方向**：轨道沿 X 轴延伸，钢轨在 Z 轴方向分布
3. **车灯照射**：车灯沿 +X 方向照射（列车前进方向）
4. **风阻方向**：风阻效果在列车尾部（-X 方向）生成

### 模型定位

```javascript
// 列车组位置（整体移动）
trainGroup.position.x = currentX;

// 模型内部元素使用局部坐标（相对于 trainModel）
// 添加到 trainModel 的子对象会自动跟随列车移动

// 例如：车灯位置
headlight.position.set(lightX, lightY, zOffset);  // 局部坐标
// lightX 是相对于列车模型的位置，不是世界坐标
```

### 性能优化

1. **几何体复用**：枕木使用同一几何体，减少内存占用
2. **GPU 风阻**：流场粒子位置由 GPU 计算，无 CPU 端逐帧更新
3. **状态缓存**：相机状态频繁保存时使用轻量保存
4. **动画帧率**：delta 限制在 0.033 秒内，防止帧率过低时动画异常

### 模型文件

- `huoche8.mtl/obj`：8节车厢列车（默认使用）
- `huoche16.mtl/obj`：16节车厢列车（可选）

切换模型：
```javascript
const train = new TrainWithLights({
    trainMtl: 'huoche/huoche16.mtl',
    trainObj: 'huoche/huoche16.obj'
});
```

### 备用模型

如果模型加载失败，会自动创建简易示意火车模型：
```javascript
// 简易模型尺寸
bodyGeo = new THREE.BoxGeometry(1.4, 0.65, 3.2);
roofGeo = new THREE.BoxGeometry(1.2, 0.3, 2.8);
```

---

## 版本信息

- **Three.js 版本**: 0.128.0（独立演示）/ 本地模块版（主场景）
- **创建日期**: 2026-06-16
- **最后更新**: 2026-06-16

---

*用 ❤️ 与代码构建 | 铁路轨道 3D 场景*