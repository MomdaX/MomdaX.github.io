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

        // 动画状态
        this.animationState = 'entering';
        this.pauseStartTime = 0;
        this.pauseDuration = 5000;

        // 默认参数
        this.params = {
            trackLength: 300,
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
            boundsMinZ: -100,
            boundsMaxZ: 100,
            cameraPos: { x: 20, y: 10, z: 50 },
            cameraTarget: { x: 0, y: 0.3, z: 0 }
        };
    }

    init(options = {}) {
        console.log('TrackBuilder init called');
        Object.assign(this.params, options);

        // 初始化场景
        this._initScene();

        // 初始化列车（含车灯）
        this._initTrain();

        // 开始动画循环
        this._animate();

        window.addEventListener('resize', () => this._onResize());

        return this;
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
        this.train.loadTrain().then(() => {
            this.scene.add(this.train.getGroup());
        });
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

        const leftPoints = [
            new THREE.Vector3(-gauge/2 - 0.55, -0.2, -halfLen - 0.4),
            new THREE.Vector3(-gauge/2 - 0.55, -0.2, halfLen + 0.4)
        ];
        const rightPoints = [
            new THREE.Vector3(gauge/2 + 0.55, -0.2, -halfLen - 0.4),
            new THREE.Vector3(gauge/2 + 0.55, -0.2, halfLen + 0.4)
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

        // 铁轨
        const railGeo = new THREE.BoxGeometry(p.railHalfWidth * 2, p.railHeight, p.trackLength);
        const railY = p.sleeperHeight + p.railHeight / 2 + 0.012;

        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-p.gauge / 2, railY, 0);
        this.trackGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set(p.gauge / 2, railY, 0);
        this.trackGroup.add(rightRail);

        // 枕木
        const sleeperGeo = new THREE.BoxGeometry(p.sleeperWidth, p.sleeperHeight, p.sleeperDepth);
        const startZ = -halfLen + (p.sleeperSpacing / 2);
        const endZ = halfLen - (p.sleeperSpacing / 2);
        const count = Math.floor((endZ - startZ) / p.sleeperSpacing) + 1;

        for (let i = 0; i < count; i++) {
            const zPos = startZ + i * p.sleeperSpacing;
            if (Math.abs(zPos) > halfLen + 0.15) continue;
            const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
            sleeper.position.set(0, p.sleeperHeight / 2, zPos);
            this.trackGroup.add(sleeper);
        }

        this.scene.add(this.trackGroup);
    }

    _animate() {
        const now = performance.now();
        let delta = Math.min(0.033, (now - (this.lastTimestamp || now)) / 1000);
        this.lastTimestamp = now;
        if (delta < 0.005) delta = 0.016;

        // 列车动画
        if (this.train?.modelLoaded) {
            const currentZ = this.train.getPosition();

            if (this.animationState === 'entering') {
                const step = this.params.trainSpeed * delta * 60;
                this.train.setPosition(currentZ + step);

                if (currentZ >= 0) {
                    this.train.setPosition(0);
                    this.animationState = 'paused';
                    this.pauseStartTime = now;
                }
            } else if (this.animationState === 'paused') {
                if (now - this.pauseStartTime >= this.pauseDuration) {
                    this.animationState = 'exiting';
                }
            } else if (this.animationState === 'exiting') {
                const step = this.params.trainSpeed * delta * 60;
                this.train.setPosition(currentZ + step);

                if (currentZ >= this.params.boundsMaxZ + 10) {
                    this.train.setPosition(this.params.boundsMinZ - 10);
                    this.animationState = 'entering';
                }
            }
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this._animate());
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

    /** 切换车灯 */
    toggleHeadlights() {
        if (this.train) {
            const newState = this.train.toggle();
            console.log('车灯状态:', newState ? '开启' : '关闭');
        }
    }

    /** 设置列车速度 */
    setTrainSpeed(speed) {
        this.params.trainSpeed = Math.max(0.015, Math.min(0.12, speed));
    }

    /** 重置相机 */
    resetCamera() {
        const p = this.params;
        this.camera.position.set(p.cameraPos.x, p.cameraPos.y, p.cameraPos.z);
        this.controls.target.set(p.cameraTarget.x, p.cameraTarget.y, p.cameraTarget.z);
        this.controls.update();
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
}

export default TrackBuilder;
