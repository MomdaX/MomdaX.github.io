// TrainWithLights.js
import * as THREE from './three.module.js';
import { MTLLoader } from './MTLLoader.js';
import { OBJLoader } from './OBJLoader.js';

/**
 * 列车模型 + 车灯光束封装类
 * 将列车模型、车灯、光束封装为一个整体对象
 */
export class TrainWithLights {
    constructor(params = {}) {
        // 默认参数
        this.params = {
            trainMtl: 'huoche/huoche8.mtl',
            trainObj: 'huoche/huoche8.obj',
            trainScale: 1.5,
            trainRotationY: Math.PI / 2,
            trainYOffset: 0.5,
            // 车灯参数
            headlightColor: 0xffffff,
            headlightIntensity: 30.0,
            headlightDistance: 360,
            headlightAngle: Math.PI / 6,
            headlightPenumbra: 0.12,
            headlightDecay: 1.5,
            ...params
        };

        // 状态
        this.trainModel = null;
        this.trainGroup = new THREE.Group();
        this.modelLoaded = false;
        this.headlights = [];
        this.headlightOn = true;
        this.beamLayers = [];

        // 动画状态
        this.currentZ = -48;
        this.moveDirection = 1;
    }

    /**
     * 加载列车模型
     * @param {Function} onProgress - 进度回调 (percent: number) => void
     * @returns {Promise} 模型加载完成后 resolve
     */
    loadTrain(onProgress = null) {
        return new Promise((resolve, reject) => {
            const mtlLoader = new MTLLoader();
            
            mtlLoader.load(
                this.params.trainMtl,
                (materials) => {
                    materials.preload();
                    const objLoader = new OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.load(
                        this.params.trainObj,
                        (object) => {
                            this._setupTrainModel(object);
                            resolve();
                        },
                        (xhr) => {
                            const percent = (xhr.loaded / xhr.total * 100);
                            onProgress?.(percent);
                        },
                        (error) => {
                            console.error('OBJ load error:', error);
                            this._createFallbackTrain();
                            resolve();
                        }
                    );
                },
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100);
                    onProgress?.(percent);
                },
                (error) => {
                    console.error('MTL load error:', error);
                    this._createFallbackTrain();
                    resolve();
                }
            );
        });
    }

    /**
     * 设置列车模型
     */
    _setupTrainModel(object) {
        this.trainModel = object;
        const p = this.params;

        this.trainModel.scale.set(p.trainScale, p.trainScale, p.trainScale);
        this.trainModel.rotation.y = p.trainRotationY;

        const box = new THREE.Box3().setFromObject(this.trainModel);
        const offsetY = p.trainYOffset - box.min.y;
        this.trainModel.position.set(0, offsetY, 0);

        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.z = this.currentZ;
        this.modelLoaded = true;

        this._createHeadlights();
        console.log('列车模型加载完成');
    }

    /**
     * 创建备用列车模型
     */
    _createFallbackTrain() {
        const fallback = new THREE.Group();
        const p = this.params;

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
        this.trainModel.scale.set(p.trainScale * 0.95, p.trainScale * 0.95, p.trainScale * 0.95);
        this.trainModel.rotation.y = p.trainRotationY;
        this.trainModel.position.set(0, p.trainYOffset, 0);

        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.z = this.currentZ;
        this.modelLoaded = true;

        this._createHeadlights();
        console.log('使用简易示意火车模型');
    }

    /**
     * 创建车灯及光束
     */
    _createHeadlights() {
        if (!this.trainModel) return;

        const p = this.params;

        for (let i = 0; i < 2; i++) {
            const zOffset = (i === 0 ? -0.13 : 0.13) * p.trainScale;
            const lightY = 0.52 * p.trainScale;
            const lightX = 0;
            const beamForwardOffset = -26.5 * p.trainScale;

            // 聚光灯
            const headlight = new THREE.SpotLight(
                0xffffff,
                this.headlightOn ? p.headlightIntensity : 0
            );
            headlight.position.set(lightX + beamForwardOffset, lightY, zOffset);
            headlight.target.position.set(35 * p.trainScale + beamForwardOffset, 0.2 * p.trainScale, zOffset);
            headlight.distance = p.headlightDistance;
            headlight.angle = p.headlightAngle;
            headlight.penumbra = p.headlightPenumbra;
            headlight.decay = p.headlightDecay;
            headlight.castShadow = true;
            headlight.shadow.mapSize.width = 1024;
            headlight.shadow.mapSize.height = 1024;
            headlight.shadow.camera.near = 0.1;
            headlight.shadow.camera.far = 200;
            headlight.shadow.camera.fov = 18;

            // 多层锥形光束
            const beamLength = 66 * p.trainScale;
            const beams = [];
            
            const layers = [
                { startRadius: 0.08, endRadius: 0.5, opacity: 0.9 },
                { startRadius: 0.15, endRadius: 0.75, opacity: 0.6 },
                { startRadius: 0.22, endRadius: 1.0, opacity: 0.4 },
                { startRadius: 0.3, endRadius: 1.3, opacity: 0.25 }
            ];
            
            layers.forEach((layer, index) => {
                const beamGeo = new THREE.CylinderGeometry(layer.startRadius, layer.endRadius, beamLength, 16, 1, true);
                const beamCanvas = document.createElement('canvas');
                beamCanvas.width = 64;
                beamCanvas.height = 256;
                const ctx = beamCanvas.getContext('2d');
                
                const gradient = ctx.createLinearGradient(0, 0, 0, beamCanvas.height);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${layer.opacity})`);
                gradient.addColorStop(0.25, `rgba(255, 255, 252, ${layer.opacity * 0.7})`);
                gradient.addColorStop(0.5, `rgba(255, 255, 245, ${layer.opacity * 0.4})`);
                gradient.addColorStop(0.75, `rgba(255, 255, 230, ${layer.opacity * 0.15})`);
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

            this.headlights.push({ light: headlight, beams });
        }

        console.log('车灯及光束创建完成');
    }

    /**
     * 切换车灯开关
     */
    toggle() {
        this.headlightOn = !this.headlightOn;
        this._updateHeadlights();
        return this.headlightOn;
    }

    /**
     * 设置车灯状态
     */
    setHeadlightOn(on) {
        this.headlightOn = on;
        this._updateHeadlights();
    }

    /**
     * 更新车灯显示
     */
    _updateHeadlights() {
        const targetIntensity = this.headlightOn ? this.params.headlightIntensity : 0;
        const targetBeamOpacity = this.headlightOn ? 0.85 : 0;

        this.headlights.forEach((hl) => {
            hl.light.intensity = targetIntensity;
            hl.beams.forEach(beam => {
                beam.material.opacity = targetBeamOpacity;
            });
        });
    }

    /**
     * 获取列车组（用于添加到场景）
     */
    getGroup() {
        return this.trainGroup;
    }

    /**
     * 获取当前 Z 位置
     */
    getPosition() {
        return this.currentZ;
    }

    /**
     * 设置位置
     */
    setPosition(z) {
        this.currentZ = z;
        this.trainGroup.position.z = z;
    }

    /**
     * 清理资源
     */
    dispose() {
        if (this.trainModel) {
            this.trainModel.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.headlights = [];
        this.beamLayers = [];
    }
}
