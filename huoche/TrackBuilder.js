// TrackBuilder.js
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { TrainWithLights } from './TrainWithLights.js';

class TrackBuilder {
    constructor(container) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) throw new Error('TrackBuilder: 容器元素未找到');

        // 场景组件
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // 轨道
        this.trackGroup = null;

        // 列车（含车灯）
        this.train = null;
        this.animationId = null;
        this.lastTimestamp = 0;

        // 弹射动画参数（电磁弹射效果）
        this.launchParams = {
            // 速度设置 (km/h 转 单位/秒，1单位=1米)
            V_HIGH: 3500 * 1000 / 3600,  // 350 km/h ≈ 97.2 m/s
            V_LOW: 25 * 1000 / 3600,    // 25 km/h ≈ 6.94 m/s
            V_OVERSHOOT: 22 * 1000 / 3600, // 过冲速度 ≈ 6.11 m/s
            
            // 时间参数 (秒)
            BRAKE_DURATION: 0.1,        // 骤降阶段持续时间
            OVERSHOOT_DURATION: 0.04,   // 过冲回稳时间
            SETTLE_DURATION: 10.0,        // 低速滑行稳定时间
            ACCEL_DURATION: 5,        // 加速阶段持续时间
            
            // 曲线锐度 (p 值，p越大曲线越陡)
            BRAKE_EXPONENT: 3,          // 指数曲线，接近垂直骤降
            ACCEL_EXPONENT: 0.2,          // 加速曲线指数
            
            // 位置参数（X轴方向）
            START_X: -600,              // 起点位置（远处）
            BRAKE_X: -100,              // 开始减速位置（距离中心前100m）
            CENTER_X: 0,                // 坐标系中心位置
            EXIT_X: 500,                // 退出位置
            
            // 滑行距离（低速阶段行驶的距离）
            CRUISE_DISTANCE: 66,        // 低速滑行距离
        };
        
        // 弹射动画状态
        this.launchState = {
            phase: 'waiting',  // waiting, cruise, brake, overshoot, settle, cruising
            phaseStartTime: 0,
            totalElapsed: 0,
            lastPosition: -150,// 上一个位置
        };
        
        // 动画状态
        this.animationState = 'launching';
        this.pauseStartTime = 0;
        this.pauseDuration = 5000;// 暂停时间
        
        // 列车运行控制（与车灯联动）
        this.isRunning = true;  // 默认运行
        this._savedHeadlightOn = true;
        this._trainLoadPromise = null;

        // 默认参数
        this.params = {
            trackLength: 1500,
            gauge: 2.0,
            railHalfWidth: 0.12,
            railHeight: 0.28,
            sleeperWidth: 3.2,
            sleeperHeight: 0.12,
            sleeperDepth: 0.45,
            sleeperSpacing: 1.28,
            railColor: 0xb8c8dc,
            sleeperColor: 0x9c6e3e,
            trainSpeed: 0.05,
            boundsMinX: -100,
            boundsMaxX: 100,
            cameraPos: { x: 50, y: 10, z: 20 },  // 相机位置调整：X轴运动，相机在Z侧
            cameraTarget: { x: 0, y: 0.3, z: 0 }
        };
    }

    init(options = {}) {
        Object.assign(this.params, options);

        // 恢复保存的状态（相机视角、车灯状态等）
        this._restoreState();

        // 初始化场景
        this._initScene();

        // 初始化列车（含车灯）
        this._initTrain();

        // 开始动画循环
        this._animate();

        window.addEventListener('resize', () => this._onResize());
        
        // 监听相机变化，保存状态
        this._setupCameraStateListener();

        return this;
    }
    
    /**
     * 设置相机状态监听器（当用户交互改变相机时保存状态）
     */
    _setupCameraStateListener() {
        if (!this.controls) return;
        
        // 监听控制器变化事件
        this.controls.addEventListener('change', () => {
            this._saveCameraState();
        });
        
        // 监听窗口关闭前保存状态
        window.addEventListener('beforeunload', () => {
            this._saveState();
        });
    }
    
    /**
     * 保存所有状态到 localStorage
     */
    _saveState() {
        const state = {
            // 车灯状态
            headlightOn: this.headlightOn,
            isRunning: this.isRunning,
            
            // 相机状态
            cameraPos: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            cameraTarget: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            },
            
            // 弹射动画状态
            launchPhase: this.launchState.phase,
            trainPosition: this.train ? this.train.getPosition() : this.launchParams.START_X,
            
            // 时间戳
            timestamp: Date.now()
        };
        
        localStorage.setItem('trainState', JSON.stringify(state));
    }
    
    /**
     * 保存相机状态（频繁调用时使用轻量保存）
     */
    _saveCameraState() {
        const cameraState = {
            cameraPos: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            cameraTarget: {
                x: this.controls.target.x,
                y: this.controls.target.y,
                z: this.controls.target.z
            }
        };
        
        // 只在位置变化时输出
        const lastPos = this._lastCameraPos;
        const hasChanged = !lastPos || 
            cameraState.cameraPos.x !== lastPos.x ||
            cameraState.cameraPos.y !== lastPos.y ||
            cameraState.cameraPos.z !== lastPos.z ||
            cameraState.cameraTarget.x !== this._lastCameraTarget?.x ||
            cameraState.cameraTarget.y !== this._lastCameraTarget?.y ||
            cameraState.cameraTarget.z !== this._lastCameraTarget?.z;
        
        if (hasChanged) {
            console.log('[相机状态] 位置:', cameraState.cameraPos);
            console.log('[相机状态] 目标点:', cameraState.cameraTarget);
            this._lastCameraPos = { ...cameraState.cameraPos };
            this._lastCameraTarget = { ...cameraState.cameraTarget };
        }
        
        localStorage.setItem('trainCameraState', JSON.stringify(cameraState));
    }
    
    /**
     * 从 localStorage 恢复状态
     */
    _restoreState() {
        try {
            // 恢复完整状态
            const savedState = localStorage.getItem('trainState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // 恢复车灯和运行状态
                this._savedHeadlightOn = state.headlightOn !== false;
                this.isRunning = state.isRunning !== undefined ? state.isRunning : true;
                
                // 恢复相机参数
                if (state.cameraPos) {
                    this.params.cameraPos = state.cameraPos;
                }
                if (state.cameraTarget) {
                    this.params.cameraTarget = state.cameraTarget;
                }
                
                // 恢复弹射动画状态
                if (state.launchPhase) {
                    this.launchState.phase = state.launchPhase;
                }
                if (state.trainPosition) {
                    this.launchState.lastPosition = state.trainPosition;
                }
            }
            
            // 恢复相机状态（优先使用最新的相机状态）
            const savedCameraState = localStorage.getItem('trainCameraState');
            if (savedCameraState) {
                const cameraState = JSON.parse(savedCameraState);
                if (cameraState.cameraPos) {
                    this.params.cameraPos = cameraState.cameraPos;
                }
                if (cameraState.cameraTarget) {
                    this.params.cameraTarget = cameraState.cameraTarget;
                }
            }
        } catch (e) {
        }
    }
    
    /**
     * 清除保存的状态
     */
    clearSavedState() {
        localStorage.removeItem('trainState');
        localStorage.removeItem('trainCameraState');
    }

    _initScene() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = null;

        // 相机
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(66, aspect, 0.01, 1000);
        this.camera.position.set(
            this.params.cameraPos.x,
            this.params.cameraPos.y,
            this.params.cameraPos.z
        );
        this.camera.lookAt(
            this.params.cameraTarget.x,
            this.params.cameraTarget.y,
            this.params.cameraTarget.z
        );
        
        console.log('[相机初始化] 位置:', {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        });
        console.log('[相机初始化] 目标点:', {
            x: this.params.cameraTarget.x,
            y: this.params.cameraTarget.y,
            z: this.params.cameraTarget.z
        });

        // 渲染器
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.container,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);

        // 控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 1.2;
        this.controls.zoomSpeed = 1.3;
        this.controls.panSpeed = 0.8;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.target.set(
            this.params.cameraTarget.x,
            this.params.cameraTarget.y,
            this.params.cameraTarget.z
        );

        // 灯光
        this._setupLighting();

        // 辅助元素
        this._addAuxiliaries();

        // 轨道
        this._buildTrack();
    }

    _initTrain() {
        this.train = new TrainWithLights();
        this.train.setHeadlightOn(this._savedHeadlightOn);
        this.scene.add(this.train.getGroup());
        this._trainLoadPromise = this.train.loadTrain().then((loaded) => {
            if (!loaded) return;
            
            // 恢复车灯状态（如果之前保存的是关闭状态）
            this._restoreHeadlightState();
        });
    }
    
    /**
     * 恢复车灯状态
     */
    _restoreHeadlightState() {
        try {
            const savedState = localStorage.getItem('trainState');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                if (this.train) {
                    this.train.setHeadlightOn(state.headlightOn !== false);
                }
                
                // 恢复列车位置
                if (state.trainPosition && this.train) {
                    this.train.setPosition(state.trainPosition);
                }
            }
        } catch (e) {
        }
    }

    _setupLighting() {
        const ambient = new THREE.AmbientLight(0x4a5c72, 0.68);
        this.scene.add(ambient);

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.15);
        mainLight.position.set(4, 6, 3);
        this.scene.add(mainLight);

        const backLight = new THREE.DirectionalLight(0xccaa88, 0.45);
        backLight.position.set(-2.5, 2.2, -4);
        this.scene.add(backLight);

        const rimLight = new THREE.PointLight(0x6c9ed9, 0.5);
        rimLight.position.set(2.8, 1.6, -3);
        this.scene.add(rimLight);

        const fillLight = new THREE.PointLight(0xcbaa77, 0.28);
        fillLight.position.set(0, -0.9, 0);
        this.scene.add(fillLight);

        const frontFill = new THREE.PointLight(0xaaccff, 0.38);
        frontFill.position.set(0, 1.0, 4.2);
        this.scene.add(frontFill);

        const hemiLight = new THREE.HemisphereLight(0x6c8eb0, 0x3a2c22, 0.42);
        this.scene.add(hemiLight);
    }

    _addAuxiliaries() {
        const gridSize = this.params.trackLength + 20;
        const grid = new THREE.GridHelper(gridSize, Math.floor(gridSize / 2), 0x88aaff, 0x446688);
        grid.position.y = -0.28;
        grid.material.transparent = true;
        grid.material.opacity = 0.22;
        this.scene.add(grid);

        const lineMat = new THREE.LineBasicMaterial({ color: 0x5a7d9a, transparent: true, opacity: 0.25 });
        const halfLen = this.params.trackLength / 2;
        const gauge = this.params.gauge;

        // 参考线（沿X轴方向，Z轴分布）
        const leftPoints = [
            new THREE.Vector3(-halfLen - 0.4, -0.2, -gauge/2 - 0.55),
            new THREE.Vector3(halfLen + 0.4, -0.2, -gauge/2 - 0.55)
        ];
        const rightPoints = [
            new THREE.Vector3(-halfLen - 0.4, -0.2, gauge/2 + 0.55),
            new THREE.Vector3(halfLen + 0.4, -0.2, gauge/2 + 0.55)
        ];

        this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftPoints), lineMat));
        this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightPoints), lineMat));
    }

    _buildTrack() {
        this.trackGroup = new THREE.Group();
        const p = this.params;
        const halfLen = p.trackLength / 2;

        const railMat = new THREE.MeshStandardMaterial({
            color: p.railColor,
            metalness: 0.87,
            roughness: 0.32
        });

        const sleeperMat = new THREE.MeshStandardMaterial({
            color: p.sleeperColor,
            metalness: 0.09,
            roughness: 0.72
        });

        // 铁轨（X轴方向延伸）
        // 几何体：长度在X方向，高度在Y方向，宽度在Z方向
        const railGeo = new THREE.BoxGeometry(p.trackLength, p.railHeight, p.railHalfWidth * 2);
        const railY = p.sleeperHeight + p.railHeight / 2 + 0.012;

        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(0, railY, -p.gauge / 2);  // Z轴方向分布
        this.trackGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set(0, railY, p.gauge / 2);  // Z轴方向分布
        this.trackGroup.add(rightRail);

        // 枕木（沿X轴分布）
        // 几何体：宽度在X方向(sleeperDepth)，高度在Y方向，长度在Z方向(sleeperWidth)
        const sleeperGeo = new THREE.BoxGeometry(p.sleeperDepth, p.sleeperHeight, p.sleeperWidth);
        const startX = -halfLen + (p.sleeperSpacing / 2);
        const endX = halfLen - (p.sleeperSpacing / 2);
        const count = Math.floor((endX - startX) / p.sleeperSpacing) + 1;

        for (let i = 0; i < count; i++) {
            const xPos = startX + i * p.sleeperSpacing;
            if (Math.abs(xPos) > halfLen + 0.15) continue;
            const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
            sleeper.position.set(xPos, p.sleeperHeight / 2, 0);  // X轴方向分布
            this.trackGroup.add(sleeper);
        }

        this.scene.add(this.trackGroup);
    }

    _animate() {
        const now = performance.now();
        let delta = Math.min(0.033, (now - (this.lastTimestamp || now)) / 1000);
        this.lastTimestamp = now;
        if (delta < 0.005) delta = 0.016;

        if (this.train?.modelLoaded) {
            // 只有在运行状态下才更新列车动画
            if (this.isRunning) {
                this._updateLaunchAnimation(delta, now);
            }
            
            // 风阻效果强度根据速度变化
            // updateWindEffect 内部用 intensity = Math.min(1, speed / 0.08)
            // 所以 speed=0.08 时 intensity=1, speed=0.012 时 intensity≈0.15
            const lp = this.launchParams;
            const state = this.launchState;
            let windSpeed = 0;
            
            // 如果列车停止，风阻效果也停止
            if (!this.isRunning) {
                windSpeed = 0;
            } else if (state.phase === 'cruise_in' || state.phase === 'cruise_out') {
                windSpeed = 0.08; // 满强度风阻
            } else if (state.phase === 'brake') {
                // 骤降时，风阻急剧减弱
                const brakeProgress = (now - state.phaseStartTime) / lp.BRAKE_DURATION;
                windSpeed = 0.08 * (1.0 - Math.pow(brakeProgress, 2));
            } else if (state.phase === 'accelerate') {
                // 加速时，风阻急剧增强
                const accelProgress = (now - state.phaseStartTime) / lp.ACCEL_DURATION;
                windSpeed = 0.012 + (0.08 - 0.012) * Math.pow(accelProgress, 2);
            } else if (state.phase === 'overshoot' || state.phase === 'settle') {
                windSpeed = 0.012; // 低速时弱风阻
            }
            this.train.updateWindEffect(windSpeed);
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this._animate());        
    }

    /**
     * 弹射动画核心：速度曲线驱动的位移计算
     * 3段式流程：高速入场 -> 减速滑行 -> 加速离开 -> 循环
     * 列车沿X轴运动
     */
    _updateLaunchAnimation(delta, now) {
        const lp = this.launchParams;
        const state = this.launchState;
        
        // 初始化：设置起始位置（X轴）
        if (state.phase === 'waiting') {
            this.train.setPosition(lp.START_X);
            state.phase = 'cruise_in';
            state.phaseStartTime = now;
            return;
        }
        
        let velocity = 0;
        let position = this.train.getPosition();
        
        switch (state.phase) {
            case 'cruise_in': {
                // 阶段1：高速入场，到达 BRAKE_X 位置开始减速
                velocity = lp.V_HIGH;
                
                if (position >= lp.BRAKE_X) {
                    // 到达减速位置，进入骤降阶段
                    state.phase = 'brake';
                    state.phaseStartTime = now;
                }
                break;
            }
            case 'brake': {
                // 阶段2：骤降阶段 - 使用指数曲线实现近乎垂直的速度下降
                const elapsed = (now - state.phaseStartTime) / 1000;
                const progress = Math.min(1, elapsed / lp.BRAKE_DURATION);
                const easedProgress = 1 - Math.pow(1 - progress, lp.BRAKE_EXPONENT);
                velocity = lp.V_HIGH - (lp.V_HIGH - lp.V_LOW) * easedProgress;
                
                if (elapsed >= lp.BRAKE_DURATION) {
                    velocity = lp.V_LOW;
                    state.phase = 'overshoot';
                    state.phaseStartTime = now;
                }
                break;
            }
            case 'overshoot': {
                // 阶段3：过冲瞬间降速然后回稳
                const elapsed = (now - state.phaseStartTime) / 1000;
                const progress = elapsed / lp.OVERSHOOT_DURATION;
                if (progress < 1) {
                    if (progress < 0.4) {
                        const p = progress / 0.4;
                        velocity = lp.V_LOW - (lp.V_LOW - lp.V_OVERSHOOT) * p;
                    } else {
                        const p = (progress - 0.4) / 0.6;
                        const easeOut = 1 - Math.pow(1 - p, 2);
                        velocity = lp.V_OVERSHOOT + (lp.V_LOW - lp.V_OVERSHOOT) * easeOut;
                    }
                } else {
                    velocity = lp.V_LOW;
                    state.phase = 'settle';
                    state.phaseStartTime = now;
                }
                break;
            }
            case 'settle': {
                // 阶段4：低速稳定滑行10秒
                velocity = lp.V_LOW;
                
                const elapsed = (now - state.phaseStartTime) / 1000;
                if (elapsed >= lp.SETTLE_DURATION) {
                    state.phase = 'accelerate';
                    state.phaseStartTime = now;
                }
                break;
            }
            case 'accelerate': {
                // 阶段5：加速离开，从 V_LOW 加速到 V_HIGH
                const elapsed = (now - state.phaseStartTime) / 1000;
                const progress = Math.min(1, elapsed / lp.ACCEL_DURATION);
                const easedProgress = 1 - Math.pow(1 - progress, lp.ACCEL_EXPONENT);
                velocity = lp.V_LOW + (lp.V_HIGH - lp.V_LOW) * easedProgress;
                
                if (elapsed >= lp.ACCEL_DURATION) {
                    velocity = lp.V_HIGH;
                    state.phase = 'cruise_out';
                    state.phaseStartTime = now;
                }
                break;
            }
            case 'cruise_out': {
                // 阶段6：高速离开，直到完全离开场景
                velocity = lp.V_HIGH;
                
                if (position >= lp.EXIT_X) {
                    state.phase = 'waiting';
                    this.train.setPosition(lp.START_X);
                    return;
                }
                break;
            }
        }
        
        position += velocity * delta;
        this.train.setPosition(position);
        this.train.setVelocity(velocity);
    }

    _onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    // ============ 对外 API ============

    /** 车灯是否开启 */
    get headlightOn() {
        return this.train?.headlightOn ?? true;
    }

    /** 设置车灯开关（不影响列车运行） */
    setHeadlightOn(on) {
        if (this.train) {
            this.train.setHeadlightOn(on);
            this._savedHeadlightOn = on;
            this._saveState();
        }
    }

    /** 设置列车运行开关 */
    setRun(run) {
        this.isRunning = !!run;
        this._saveState();
    }
    
    /** 启动列车 */
    startTrain() {
        this.isRunning = true;
        this._saveState();
    }
    
    /** 停止列车 */
    stopTrain() {
        this.isRunning = false;
        this._saveState();
    }
    
    /** 获取列车运行状态 */
    get trainRunning() {
        return this.isRunning;
    }

    /** 设置列车速度 */
    setTrainSpeed(speed) {
        this.params.trainSpeed = Math.max(0.015, Math.min(0.12, speed));
    }

    /** 重置相机到默认视角 */
    resetCamera() {
        this.camera.position.set(50, 10, 20);
        this.controls.target.set(0, 0.3, 0);
        this.controls.update();
        this._saveCameraState();
    }

    /** 重建轨道 */
    rebuildTrack(newParams = {}) {
        Object.assign(this.params, newParams);
        if (this.trackGroup) {
            this.scene.remove(this.trackGroup);
            while (this.trackGroup.children.length) {
                this.trackGroup.remove(this.trackGroup.children[0]);
            }
        }
        this._buildTrack();
    }

    /** 释放资源 */
    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.train) this.train.dispose();
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        window.removeEventListener('resize', () => this._onResize());
        this.scene = null;
        this.controls = null;
    }

    /** 切换风阻效果 */
    toggleWindEffect() {
        if (this.train) {
            this.train.setWindEffectEnabled(!this.train.windEffectEnabled);
        }
    }

    /** 切换列车模型（8节/16节） */
    async switchTrainModel(modelType) {
        if (!this.train) {
            return;
        }
        
        const currentType = this.train.getModelType();
        if (currentType === modelType) {
            return modelType;
        }
        
        // 暂停动画
        const wasRunning = this.isRunning;
        this.isRunning = false;
        
        try {
            const result = await this.train.switchModel(modelType);
            
            if (result === modelType) {
                // 保存状态
                this._saveState();
                return modelType;
            } else {
                return currentType;
            }
        } catch (e) {
            return currentType;
        } finally {
            // 恢复运行状态
            this.isRunning = wasRunning;
        }
    }
    
    /** 获取当前列车模型类型 */
    getTrainModelType() {
        return this.train ? this.train.getModelType() : '8';
    }

    // ============ 弹射动画 API ============

    /**
     * 获取当前弹射动画状态
     * @returns {Object} 包含 phase, velocity, position 等信息
     */
    getLaunchState() {
        const lp = this.launchParams;
        const state = this.launchState;
        return {
            phase: state.phase,
            velocity: this.train ? this.train.getVelocity?.() ?? 0 : 0,
            position: this.train ? this.train.getPosition() : lp.START_Z,
            // 转换显示 km/h
            velocityKmh: this.train ? (this.train.getVelocity?.() ?? 0) * 3.6 : 0
        };
    }

    /**
     * 设置弹射动画参数
     * @param {Object} launchConfig 配置对象，可选字段：
     *   - V_HIGH: 高速巡航速度 (km/h)
     *   - V_LOW: 低速滑行速度 (km/h)
     *   - BRAKE_DURATION: 骤降阶段持续时间 (秒)
     *   - OVERSHOOT_DURATION: 过冲回稳时间 (秒)
     *   - SETTLE_DURATION: 低速滑行持续时间 (秒)
     *   - ACCEL_DURATION: 加速阶段持续时间 (秒)
     *   - BRAKE_EXPONENT: 骤降曲线锐度 (越大越陡)
     *   - ACCEL_EXPONENT: 加速曲线锐度 (越大越陡)
     *   - START_X: 起点位置（X轴）
     *   - BRAKE_X: 开始减速位置（X轴）
     *   - EXIT_X: 退出位置（X轴）
     * @example
     *   builder.configureLaunch({
     *     V_HIGH: 500,
     *     BRAKE_DURATION: 0.08,
     *     BRAKE_X: -80,
     *     SETTLE_DURATION: 8
     *   });
     */
    configureLaunch(launchConfig = {}) {
        const lp = this.launchParams;
        if (launchConfig.V_HIGH !== undefined) {
            lp.V_HIGH = launchConfig.V_HIGH * 1000 / 3600;
        }
        if (launchConfig.V_LOW !== undefined) {
            lp.V_LOW = launchConfig.V_LOW * 1000 / 3600;
            lp.V_OVERSHOOT = launchConfig.V_LOW * 0.88 * 1000 / 3600;
        }
        if (launchConfig.BRAKE_DURATION !== undefined) {
            lp.BRAKE_DURATION = launchConfig.BRAKE_DURATION;
        }
        if (launchConfig.OVERSHOOT_DURATION !== undefined) {
            lp.OVERSHOOT_DURATION = launchConfig.OVERSHOOT_DURATION;
        }
        if (launchConfig.SETTLE_DURATION !== undefined) {
            lp.SETTLE_DURATION = launchConfig.SETTLE_DURATION;
        }
        if (launchConfig.ACCEL_DURATION !== undefined) {
            lp.ACCEL_DURATION = launchConfig.ACCEL_DURATION;
        }
        if (launchConfig.BRAKE_EXPONENT !== undefined) {
            lp.BRAKE_EXPONENT = launchConfig.BRAKE_EXPONENT;
        }
        if (launchConfig.ACCEL_EXPONENT !== undefined) {
            lp.ACCEL_EXPONENT = launchConfig.ACCEL_EXPONENT;
        }
        if (launchConfig.START_X !== undefined) {
            lp.START_X = launchConfig.START_X;
        }
        if (launchConfig.BRAKE_X !== undefined) {
            lp.BRAKE_X = launchConfig.BRAKE_X;
        }
        if (launchConfig.EXIT_X !== undefined) {
            lp.EXIT_X = launchConfig.EXIT_X;
        }
        return this;
    }

    /**
     * 重置弹射动画到初始状态
     */
    resetLaunch() {
        this.launchState.phase = 'waiting';
        this.launchState.phaseStartTime = 0;
        this.launchState.totalElapsed = 0;
        if (this.train) {
            this.train.setPosition(this.launchParams.START_X);
        }
    }
}

export default TrackBuilder;
