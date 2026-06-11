// TrackBuilder.js
import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import { MTLLoader } from './MTLLoader.js';
import { OBJLoader } from './OBJLoader.js';

class TrackBuilder {
    constructor(container) {
        this.container = typeof container === 'string' ? document.getElementById(container) : container;
        if (!this.container) throw new Error('TrackBuilder: 容器元素未找到');

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.animationId = null;

        this.trackGroup = null;

        this.trainModel = null;
        this.trainGroup = null;
        this.modelLoaded = false;
        this.currentZ = -48;
        this.moveDirection = 1;
        this.lastTimestamp = 0;
        this.animationState = 'entering';
        this.pauseStartTime = 0;
        this.pauseDuration = 5000;

        // 车灯
        this.headlights = [];
        this.headlightOn = true;
        this.headlightUserControl = false;

        this.params = {
            trackLength: 300,          // 轨道总长度
            gauge: 2.0,               // 轨距（两轨间距）
            railHalfWidth: 0.12,      // 铁轨半宽
            railHeight: 0.28,         // 铁轨高度
            sleeperWidth: 3.2,        // 枕木宽度
            sleeperHeight: 0.12,      // 枕木高度
            sleeperDepth: 0.45,       // 枕木深度
            sleeperSpacing: 1.28,     // 枕木间距
            railColor: 0xb8c8dc,      // 铁轨颜色
            sleeperColor: 0x9c6e3e,   // 枕木颜色
            trainMtl: 'huoche/huoche8.mtl',  // 火车材质文件
            trainObj: 'huoche/huoche8.obj',  // 火车模型文件
            trainScale: 1.5,          // 火车缩放比例
            trainRotationY: Math.PI / 2,      // 火车Y轴旋转角度
            trainYOffset: 0.5,        // 火车底部距地面高度
            trainSpeed: 0.05,        // 火车速度
            boundsMinZ: -100,         // Z轴运动边界最小值
            boundsMaxZ: 100,          // Z轴运动边界最大值
            cameraPos: { x: 20, y: 10, z: 50 },       // 相机位置
            cameraTarget: { x: 0, y: 0.3, z: 0 },      // 相机瞄准点
            // 车灯参数
            headlightColor: 0xffffff,     // 车灯颜色（纯白色）
            headlightIntensity: 8.0,      // 车灯强度
            headlightDistance: 100,       // 车灯照射距离
            headlightAngle: Math.PI / 4,  // 车灯角度
            headlightPenumbra: 0.2        // 车灯半影
        };
    }

    init(options = {}) {
        console.log('TrackBuilder init called');
        Object.assign(this.params, options);

        this.scene = new THREE.Scene();
        this.scene.background = null;

        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(66, aspect, 0.01, 1000); // 视场角, 宽高比, 近裁剪面, 远裁剪面
        this.camera.position.set(this.params.cameraPos.x, this.params.cameraPos.y, this.params.cameraPos.z);
        this.camera.lookAt(this.params.cameraTarget.x, this.params.cameraTarget.y, this.params.cameraTarget.z);

        console.log('Container size:', this.container.clientWidth, 'x', this.container.clientHeight);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.container, antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x000000, 0);
        console.log('Camera position:', this.camera.position);
        console.log('Camera target:', this.params.cameraTarget);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 1.2;
        this.controls.zoomSpeed = 1.3;
        this.controls.panSpeed = 0.8;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.target.set(this.params.cameraTarget.x, this.params.cameraTarget.y, this.params.cameraTarget.z);

        this._setupLighting();
        this._addAuxiliaries();
        this._buildTrack();
        this._loadTrainModel();
        this._animate();

        window.addEventListener('resize', () => this._onResize());

        return this;
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
            new THREE.Vector3(-gauge/2 - 0.55, -0.2,  halfLen + 0.4)
        ];
        const rightPoints = [
            new THREE.Vector3( gauge/2 + 0.55, -0.2, -halfLen - 0.4),
            new THREE.Vector3( gauge/2 + 0.55, -0.2,  halfLen + 0.4)
        ];
        const leftLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(leftPoints), lineMat);
        const rightLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(rightPoints), lineMat);
        this.scene.add(leftLine, rightLine);
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

        const railGeo = new THREE.BoxGeometry(p.railHalfWidth * 2, p.railHeight, p.trackLength);
        const railY = p.sleeperHeight + p.railHeight / 2 + 0.012;

        const leftRail = new THREE.Mesh(railGeo, railMat);
        leftRail.position.set(-p.gauge / 2, railY, 0);
        this.trackGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeo, railMat);
        rightRail.position.set(p.gauge / 2, railY, 0);
        this.trackGroup.add(rightRail);

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

    _loadTrainModel() {
        this.trainGroup = new THREE.Group();
        this.scene.add(this.trainGroup);

        const mtlLoader = new MTLLoader();
        mtlLoader.load('huoche/huoche8.mtl', (materials) => {
            console.log('MTL loaded successfully');
            materials.preload();
            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.load('huoche/huoche8.obj', (object) => {
                console.log('OBJ loaded successfully');
                this._setupTrainModel(object);
            }, (xhr) => {
                console.log('OBJ loading:', (xhr.loaded / xhr.total * 100) + '%');
            }, (error) => {
                console.error('OBJ load error:', error);
                this._createFallbackTrain();
            });
        }, (xhr) => {
            console.log('MTL loading:', (xhr.loaded / xhr.total * 100) + '%');
        }, (error) => {
            console.error('MTL load error:', error);
            this._createFallbackTrain();
        });
    }

    _setupTrainModel(object) {
        this.trainModel = object;
        const p = this.params;

        this.trainModel.scale.set(p.trainScale, p.trainScale, p.trainScale);
        this.trainModel.rotation.y = p.trainRotationY;

        const box = new THREE.Box3().setFromObject(this.trainModel);
        const modelHeight = box.max.y - box.min.y;
        const offsetY = p.trainYOffset - box.min.y;
        this.trainModel.position.y = offsetY;
        this.trainModel.position.x = 0;
        this.trainModel.position.z = 0;

        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.z = this.currentZ;
        this.modelLoaded = true;

        this._createHeadlights();

        console.log('火车模型加载完成，包围盒:', box.min, box.max, '高度:', modelHeight);
    }

    _createFallbackTrain() {
        if (this.trainModel) return;
        const fallback = new THREE.Group();

        const bodyGeo = new THREE.BoxGeometry(1.4, 0.65, 3.2);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcc5533, metalness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.2;
        fallback.add(body);

        const roofGeo = new THREE.BoxGeometry(1.2, 0.3, 2.8);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xaa8866 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 0.55;
        fallback.add(roof);

        this.trainModel = fallback;
        const p = this.params;
        this.trainModel.scale.set(p.trainScale * 0.95, p.trainScale * 0.95, p.trainScale * 0.95);
        this.trainModel.rotation.y = p.trainRotationY;
        this.trainModel.position.y = p.trainYOffset;
        this.trainModel.position.x = 0;
        this.trainModel.position.z = 0;
        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.z = this.currentZ;
        this.modelLoaded = true;

        // 创建车灯
        this._createHeadlights();

        console.log('使用简易示意火车模型');
    }

    _createHeadlights() {
        const p = this.params;

        for (let i = 0; i < 2; i++) {
            const zOffset = (i === 0 ? -0.13 : 0.13) * p.trainScale;  // Z轴偏移（左右车灯间距）
            const lightY = 0.52 * p.trainScale;                        // Y轴高度（车灯离地高度）
            const lightX = 0;                                          // X轴位置（沿列车长度方向）
            
            const beamForwardOffset = -26.5 * p.trainScale;             // 光束起点（车灯位置）

            // 1. 聚光灯（照亮场景，方向略微向上前方）
            const headlight = new THREE.SpotLight(0xffffff, this.headlightOn ? 30.0 : 0);
            headlight.position.set(lightX + beamForwardOffset, lightY, zOffset);
            headlight.target.position.set(35 * p.trainScale + beamForwardOffset, 0.2 * p.trainScale, zOffset);
            headlight.distance = 360;
            headlight.angle = Math.PI / 6;
            headlight.penumbra = 0.12;
            headlight.decay = 1.5;
            headlight.castShadow = true;
            headlight.shadow.mapSize.width = 1024;
            headlight.shadow.mapSize.height = 1024;
            headlight.shadow.camera.near = 0.1;
            headlight.shadow.camera.far = 200;
            headlight.shadow.camera.fov = 18;

            // 多层锥形光束（视觉特效，从车灯向前伸展，带渐变纹理）
            const beamLength = 66 * p.trainScale;
            const beams = [];
            
            const beamLayers = [
                { startRadius: 0.08, endRadius: 0.5, opacity: 0.9 },
                { startRadius: 0.15, endRadius: 0.75, opacity: 0.6 },
                { startRadius: 0.22, endRadius: 1.0, opacity: 0.4 },
                { startRadius: 0.3, endRadius: 1.3, opacity: 0.25 }
            ];
            
            beamLayers.forEach((layer, index) => {
                const beamGeo = new THREE.CylinderGeometry(layer.startRadius, layer.endRadius, beamLength, 16, 1, true);
                
                const beamCanvas = document.createElement('canvas');
                beamCanvas.width = 64;
                beamCanvas.height = 256;
                const ctx = beamCanvas.getContext('2d');
                
                const gradient = ctx.createLinearGradient(0, 0, 0, beamCanvas.height);
                const alphaStart = layer.opacity;
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alphaStart})`);
                gradient.addColorStop(0.25, `rgba(255, 255, 252, ${alphaStart * 0.7})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 245, ${alphaStart * 0.4})`);
                gradient.addColorStop(0.75, `rgba(255, 255, 230, ${alphaStart * 0.15})`);
                gradient.addColorStop(1, 'rgba(255, 255, 220, 0)');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, beamCanvas.width, beamCanvas.height);
                
                const beamTexture = new THREE.CanvasTexture(beamCanvas);
                beamTexture.wrapS = THREE.ClampToEdgeWrapping;
                beamTexture.wrapT = THREE.ClampToEdgeWrapping;
                
                const beamMat = new THREE.MeshBasicMaterial({
                    map: beamTexture,
                    transparent: true,
                    opacity: this.headlightOn ? 0.85 : 0,
                    side: THREE.FrontSide,
                    depthWrite: false
                });
                const beam = new THREE.Mesh(beamGeo, beamMat);
                
                beam.rotation.z = -Math.PI / 2;
                beam.position.set(lightX + beamForwardOffset - beamLength / 2, lightY - index * 0.005, zOffset);
                
                this.trainModel.add(beam);
                beams.push(beam);
            });

            this.trainModel.add(headlight);
            this.trainModel.add(headlight.target);

            this.headlights.push({
                light: headlight,
                beams: beams
            });
        }

        console.log('车灯及自然光束创建完成');
    }

    _updateHeadlights() {
        if (this.headlights.length === 0) return;

        const targetIntensity = this.headlightOn ? 30.0 : 0;
        const targetBeamOpacity = this.headlightOn ? 0.85 : 0;

        this.headlights.forEach((hl) => {
            hl.light.intensity = targetIntensity;
            if (hl.beams) {
                hl.beams.forEach(beam => {
                    beam.material.opacity = targetBeamOpacity;
                });
            }
        });
    }

    toggleHeadlights() {
        this.headlightUserControl = true;
        this.headlightOn = !this.headlightOn;
        this._updateHeadlights();
        console.log('车灯状态:', this.headlightOn ? '开启' : '关闭');
    }

    _animate() {
        const now = performance.now();
        let delta = Math.min(0.033, (now - (this.lastTimestamp || now)) / 1000);
        this.lastTimestamp = now;
        if (delta < 0.005) delta = 0.016;
        
        if (!this.animateLogged) {
            console.log('Animation loop started');
            console.log('Scene objects:', this.scene.children.length);
            console.log('Track group children:', this.trackGroup ? this.trackGroup.children.length : 'null');
            console.log('Train group children:', this.trainGroup ? this.trainGroup.children.length : 'null');
            console.log('Train model:', this.trainModel);
            this.animateLogged = true;
        }

        if (this.modelLoaded && this.trainModel) {
            const trackCenter = 0;
            const now = performance.now();

            if (this.animationState === 'entering') {
                const step = this.params.trainSpeed * delta * 60;
                this.currentZ += step;
                if (!this.headlightUserControl) {
                    this.headlightOn = true;
                    this._updateHeadlights();
                }

                if (this.currentZ >= trackCenter) {
                    this.currentZ = trackCenter;
                    this.animationState = 'paused';
                    this.pauseStartTime = now;
                    console.log('火车到达轨道中间，开始停留');
                }
            } else if (this.animationState === 'paused') {
                if (now - this.pauseStartTime >= this.pauseDuration) {
                    this.animationState = 'exiting';
                    console.log('停留结束，开始开出');
                }
            } else if (this.animationState === 'exiting') {
                const step = this.params.trainSpeed * delta * 60;
                this.currentZ += step;
                if (!this.headlightUserControl) {
                    this.headlightOn = true;
                    this._updateHeadlights();
                }

                if (this.currentZ >= this.params.boundsMaxZ + 10) {
                    this.currentZ = this.params.boundsMinZ - 10;
                    this.animationState = 'entering';
                    console.log('火车开出轨道，重新进入');
                }
            }

            this.trainGroup.position.z = this.currentZ;
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

    setTrainSpeed(speed) {
        this.params.trainSpeed = Math.max(0.015, Math.min(0.12, speed));
    }

    resetCamera() {
        const p = this.params;
        this.camera.position.set(p.cameraPos.x, p.cameraPos.y, p.cameraPos.z);
        this.controls.target.set(p.cameraTarget.x, p.cameraTarget.y, p.cameraTarget.z);
        this.controls.update();
    }

    rebuildTrack(newParams = {}) {
        Object.assign(this.params, newParams);
        if (this.trackGroup) {
            this.scene.remove(this.trackGroup);
            while(this.trackGroup.children.length) {
                this.trackGroup.remove(this.trackGroup.children[0]);
            }
        }
        this._buildTrack();
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
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