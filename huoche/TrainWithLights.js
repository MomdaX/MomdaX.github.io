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
            trainRotationY: 0,  // 列车沿X轴运动，不需要旋转
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

        // 车内灯光（窗户发光）
        this.interiorLights = [];
        this.windowMaterials = [];

        // 动画状态（X轴运动）
        this.currentX = -48;
        this.moveDirection = 1;

        // 空气动力学流场效果（GPU 驱动）
        this.windEffectEnabled = true;
        this.aeroFlow = null;  // 空气动力学流场系统
        this._aeroClock = new THREE.Clock();
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

        // 计算并保存列车边界框信息（用于风阻线动态生成）
        const box = new THREE.Box3().setFromObject(this.trainModel);
        this.trainBoundingBox = {
            min: box.min.clone(),
            max: box.max.clone(),
            size: box.getSize(new THREE.Vector3()),
            center: box.getCenter(new THREE.Vector3())
        };
        
        // 边界框尺寸：length(X方向), width(Z方向), height(Y方向)
        // 列车沿X轴运动，长度在X方向
        this.trainDimensions = {
            length: this.trainBoundingBox.size.x,  // 列车长度（沿运动方向X）
            width: this.trainBoundingBox.size.z,   // 列车宽度（Z方向）
            height: this.trainBoundingBox.size.y,  // 列车高度（Y方向）
            rearX: this.trainBoundingBox.min.x,    // 列车尾部X坐标（后方）
            frontX: this.trainBoundingBox.max.x,   // 列车头部X坐标（前方）
            topY: this.trainBoundingBox.max.y,     // 列车顶部Y坐标
            bottomY: this.trainBoundingBox.min.y   // 列车底部Y坐标
        };
        
        console.log('列车尺寸:', this.trainDimensions);

        const offsetY = p.trainYOffset - box.min.y;
        this.trainModel.position.set(0, offsetY, 0);

        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.x = this.currentX;  // X轴位置
        this.modelLoaded = true;
        
        // 保存当前模型类型（从路径中提取）
        this.currentModelType = this.params.trainObj.includes('huoche16') ? '16' : '8';

        this._createHeadlights();
        this._createInteriorLights();
        this._createWindEffect();
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

        // 计算备用模型的边界框
        const box = new THREE.Box3().setFromObject(this.trainModel);
        this.trainBoundingBox = {
            min: box.min.clone(),
            max: box.max.clone(),
            size: box.getSize(new THREE.Vector3()),
            center: box.getCenter(new THREE.Vector3())
        };
        this.trainDimensions = {
            length: this.trainBoundingBox.size.x,
            width: this.trainBoundingBox.size.z,
            height: this.trainBoundingBox.size.y,
            rearX: this.trainBoundingBox.min.x,
            frontX: this.trainBoundingBox.max.x,
            topY: this.trainBoundingBox.max.y,
            bottomY: this.trainBoundingBox.min.y
        };

        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.x = this.currentX;  // X轴位置
        this.modelLoaded = true;
        
        // 保存当前模型类型（备用模型默认为8节）
        this.currentModelType = '8';

        this._createHeadlights();
        this._createInteriorLights();
        this._createWindEffect();
        console.log('使用简易示意火车模型，尺寸:', this.trainDimensions);
    }

    /**
     * 创建车灯及光束
     */
    _createHeadlights() {
        if (!this.trainModel) return;

        const p = this.params;
        const dims = this.trainDimensions || {
            frontX: 2 * p.trainScale,
            rearX: -2 * p.trainScale,
            height: 0.65 * p.trainScale,
            width: 1.4 * p.trainScale
        };

        // 车灯位置：在列车前方（frontX），照射沿X正方向
        for (let i = 0; i < 2; i++) {
            // 两盏车灯在Z轴方向分布（左右）
            const zOffset = (i === 0 ? -dims.width * 0.15 : dims.width * 0.15);
            const lightY = dims.height * 0.2;  // 车灯高度
            const lightX = dims.frontX -26;  // 车灯在前方

            // 聚光灯
            const headlight = new THREE.SpotLight(
                0xffffff,
                this.headlightOn ? p.headlightIntensity : 0
            );
            headlight.position.set(lightX, lightY, zOffset);
            // 目标在车灯前方（X正方向）
            headlight.target.position.set(lightX + 35 * p.trainScale, 0.2 * p.trainScale, zOffset);
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

            // 多层锥形光束（沿X轴方向）
            const beamLength = 66 * p.trainScale;
            const beams = [];
            
            const layers = [
                { startRadius: 0.08, endRadius: 0.5, opacity: 0.9 },
                { startRadius: 0.15, endRadius: 0.75, opacity: 0.6 },
                { startRadius: 0.22, endRadius: 1.0, opacity: 0.4 },
                { startRadius: 0.3, endRadius: 1.3, opacity: 0.25 }
            ];
            
            layers.forEach((layer, index) => {
                // 光束几何体：圆柱体，旋转使其沿X轴方向
                const beamGeo = new THREE.CylinderGeometry(layer.startRadius, layer.endRadius, beamLength, 16, 1, true);
                beamGeo.rotateZ(Math.PI / 2);  // 旋转90度使光束沿X轴
                
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
                // 光束位置：从车灯位置开始，沿X正方向延伸
                beam.position.set(lightX + beamLength / 2, lightY - index * 0.005, zOffset);
                
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
     * 创建车内灯光（窗户发光 + 内部点光源 + 尾部停车灯）
     * 识别窗户材质并设置 emissive 发光，同时在车厢内放置点光源
     * 尾部上方窗户不发光，中间窗户微光，其他窗户正常发光
     * 尾部两个停车灯为红色
     */
    _createInteriorLights() {
        if (!this.trainModel) return;

        const dims = this.trainDimensions;
        const s = this.params.trainScale;

        // 窗户材质名称（MTL中深蓝色的材质）
        const windowMaterialNames = ['Material__1775', 'Object016_mso', 'Material__79'];

        // 尾部区域阈值：最后 1/8 的车身为尾部区域
        const rearThreshold = dims.rearX + dims.length * 0.125;
        // 窗户高度分界：上半部分为上方窗户，下半部分为中间窗户
        const windowMidY = (dims.topY + dims.bottomY) * 0.5 + dims.height * 0.1;

        // 遍历模型，找到窗户材质并按位置设置不同发光
        this.trainModel.traverse((child) => {
            if (!child.isMesh) return;

            // 计算该 mesh 的中心位置
            const meshBox = new THREE.Box3().setFromObject(child);
            const meshCenter = meshBox.getCenter(new THREE.Vector3());
            const isRear = meshCenter.x <= rearThreshold;
            const isTop = meshCenter.y >= windowMidY;

            const materials = Array.isArray(child.material) ? child.material : [child.material];
            const newMats = [];

            materials.forEach((mat) => {
                if (!windowMaterialNames.includes(mat.name)) {
                    newMats.push(mat);
                    return;
                }

                // 克隆材质，避免影响其他 mesh
                const clonedMat = mat.clone();

                // 根据位置决定发光强度
                let emissiveIntensity;
                if (isRear && isTop) {
                    // 尾部上方窗户：不发光
                    emissiveIntensity = 0;
                    clonedMat.emissive = new THREE.Color(0x000000);
                } else if (isRear) {
                    // 尾部中间窗户：微光
                    emissiveIntensity = 0.6;
                    clonedMat.emissive = new THREE.Color(0xffe4b5);
                } else {
                    // 其他窗户：正常发光
                    emissiveIntensity = 2.5;
                    clonedMat.emissive = new THREE.Color(0xffe4b5);
                }

                clonedMat.emissiveIntensity = this.headlightOn ? emissiveIntensity : 0;
                clonedMat.transparent = true;
                clonedMat.opacity = 0.92;

                this.windowMaterials.push({
                    material: clonedMat,
                    zone: isRear ? (isTop ? 'rearTop' : 'rearMid') : 'normal',
                    normalIntensity: emissiveIntensity
                });

                newMats.push(clonedMat);
            });

            if (newMats.length !== materials.length) {
                // 没有 window 材质，不需要更新
            } else {
                child.material = newMats.length === 1 ? newMats[0] : newMats;
            }
        });

        // 在车厢内部放置点光源，增强窗户透光效果
        const bodyLength = dims.length;
        const bodyHeight = dims.height;
        const bodyWidth = dims.width;
        const midY = (dims.topY + dims.bottomY) * 0.5 + bodyHeight * 0.15;
        const lightSpacing = bodyLength * 0.18;
        const lightCount = Math.max(3, Math.floor(bodyLength / lightSpacing));

        for (let i = 0; i < lightCount; i++) {
            const x = dims.rearX + (i + 0.5) * (bodyLength / lightCount);
            // 尾部区域不放置白色灯光，只保留红色尾灯
            if (x <= rearThreshold) continue;
            for (const side of [-1, 1]) {
                const light = new THREE.PointLight(
                    0xffe8c8,
                    this.headlightOn ? 1.2 : 0,
                    bodyWidth * 1.5,
                    2.0
                );
                light.position.set(x, midY, side * bodyWidth * 0.2);
                this.trainModel.add(light);
                this.interiorLights.push(light);
            }
        }

        // 尾部两个红色停车灯
        this._createTailLights();

        console.log(`车内灯光创建完成: ${this.windowMaterials.length} 个窗户材质, ${this.interiorLights.length} 个内部光源`);
    }

    /**
     * 创建尾部两个红色停车灯
     */
    _createTailLights() {
        const dims = this.trainDimensions;
        const s = this.params.trainScale;
        const tailY = (dims.topY + dims.bottomY) * 0.5-0.35;
        const tailX = dims.rearX + 22.3;  // 尾部端面内侧

        for (const side of [-1, 1]) {
            const z = side * dims.width * 0.2;

            // 红色点光源
            const light = new THREE.PointLight(
                0xff2222,
                this.headlightOn ? 2.0 : 0,
                6 * s,
                2.0
            );
            light.position.set(tailX, tailY, z);
            this.trainModel.add(light);
            this.tailLights = this.tailLights || [];
            this.tailLights.push(light);

            // 红色发光小球（可见的停车灯）
            const bulbGeo = new THREE.SphereGeometry(0.06 * s, 12, 12);
            const bulbMat = new THREE.MeshBasicMaterial({
                color: 0xff1111,
                transparent: true,
                opacity: this.headlightOn ? 1.0 : 0.3
            });
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(tailX, tailY, z);
            this.trainModel.add(bulb);
            this.tailBulbs = this.tailBulbs || [];
            this.tailBulbs.push({ mesh: bulb, material: bulbMat });
        }

        console.log('尾部停车灯创建完成');
    }

    /**
     * 创建空气动力学流场效果（GPU 驱动）
     * 构建基于势流近似的可视化系统：
     *   - 流线粒子沿参数化流线流动（车头分流→贴附车身→车尾汇聚）
     *   - 骨架流线 + 沿线能量脉冲，体现连续流场
     *   - 车头滞止区高压发光、车尾尾涡发光
     */
    _createWindEffect() {
        if (!this.trainModel) return;
        this.aeroFlow = new AeroFlowField(this.trainDimensions, this.params.trainScale);
        this.aeroFlow.group.renderOrder = 5;
        this.trainModel.add(this.aeroFlow.group);
        console.log('空气动力学流场创建完成（GPU 粒子流）');
    }

    /**
     * 更新空气动力学流场
     * @param {number} speed - 列车速度（单位/秒）
     */
    updateWindEffect(speed = 0.05) {
        if (!this.aeroFlow || !this.trainModel) return;
        const intensity = Math.min(1, speed / 0.08); // 速度→强度
        const isMoving = speed > 0.01;
        this.aeroFlow.update(this._aeroClock.getElapsedTime(), intensity, isMoving);
    }

    /**
     * 设置空气动力学流场开关
     */
    setWindEffectEnabled(enabled) {
        this.windEffectEnabled = enabled;
        if (this.aeroFlow) this.aeroFlow.setVisible(enabled);
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

        // 车内灯光联动
        this.interiorLights.forEach((light) => {
            light.intensity = this.headlightOn ? 1.2 : 0;
        });

        this.windowMaterials.forEach(({ material, zone, normalIntensity }) => {
            material.emissiveIntensity = this.headlightOn ? normalIntensity : 0;
        });

        // 尾部停车灯：始终亮起，不受车灯开关影响
        if (this.tailLights) {
            this.tailLights.forEach((light) => {
                light.intensity = 2.0;
            });
        }
        if (this.tailBulbs) {
            this.tailBulbs.forEach(({ material }) => {
                material.opacity = 1.0;
            });
        }
    }

    /**
     * 获取列车组（用于添加到场景）
     */
    getGroup() {
        return this.trainGroup;
    }

    /**
     * 获取当前 X 位置
     */
    getPosition() {
        return this.currentX;
    }

    /**
     * 设置位置（X轴）
     */
    setPosition(x) {
        this.currentX = x;
        this.trainGroup.position.x = x;
    }

    /**
     * 获取当前速度 (单位/秒)
     * 注意：这个值需要由外部动画系统维护，这里返回存储的速度值
     */
    getVelocity() {
        return this._velocity || 0;
    }

    /**
     * 设置当前速度
     */
    setVelocity(v) {
        this._velocity = v;
    }

    /**
     * 清理资源
     */
    dispose() {
        this._clearTrainResources();
        if (this.aeroFlow) {
            this.aeroFlow.dispose();
            this.aeroFlow = null;
        }
    }
    
    /**
     * 清理列车相关资源（不清理风阻效果）
     */
    _clearTrainResources() {
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
            this.trainGroup.remove(this.trainModel);
            this.trainModel = null;
        }
        this.headlights = [];
        this.beamLayers = [];
        this.interiorLights = [];
        this.windowMaterials = [];
        this.tailLights = [];
        this.tailBulbs = [];
        this.modelLoaded = false;
    }
    
    /**
     * 切换列车模型（8节/16节）
     * @param {string} modelType - '8' 或 '16'
     * @returns {Promise} 模型加载完成后 resolve
     */
    async switchModel(modelType) {
        if (modelType !== '8' && modelType !== '16') {
            console.error('Invalid model type:', modelType);
            return;
        }
        
        console.log(`[列车切换] 开始切换到 ${modelType} 节车厢模型`);
        
        // 保存当前状态
        const currentX = this.currentX;
        const currentVelocity = this._velocity || 0;
        const headlightOn = this.headlightOn;
        const windEnabled = this.windEffectEnabled;
        
        // 清理旧资源
        this._clearTrainResources();
        
        // 更新模型路径
        this.params.trainMtl = `huoche/huoche${modelType}.mtl`;
        this.params.trainObj = `huoche/huoche${modelType}.obj`;
        
        // 加载新模型
        await this.loadTrain();
        
        // 恢复状态
        this.setPosition(currentX);
        this.setVelocity(currentVelocity);
        this.setHeadlightOn(headlightOn);
        this.setWindEffectEnabled(windEnabled);
        
        // 保存当前模型类型
        this.currentModelType = modelType;
        
        console.log(`[列车切换] 已切换到 ${modelType} 节车厢模型`);
        
        return modelType;
    }
    
    /**
     * 获取当前模型类型
     * @returns {string} '8' 或 '16'
     */
    getModelType() {
        return this.currentModelType || '8';
    }
}

/**
 * 空气动力学流场系统（GPU 驱动）
 *
 * 物理模型：列车沿 +X 方向运动，空气在列车坐标系下沿 -X 方向流动（从前向后）。
 * 采用势流近似构建参数化流线：
 *   1. 远场来流（-X 方向）
 *   2. 车头滞止分流：气流在 frontX 前绕过车体（上/下/左/右分流）
 *   3. 边界层贴附：气流沿车身侧/顶/底贴合流动
 *   4. 尾流汇聚：车尾 rearX 后形成汇聚尾涡
 *
 * 渲染：所有粒子位置由 GPU 顶点着色器根据 (uTime, uIntensity, 粒子参数) 计算，
 *       无 CPU 端逐帧几何更新，性能优异且效果连贯。
 */
class AeroFlowField {
    constructor(dims, scale = 1.5) {
        this.scale = scale;
        this.group = new THREE.Group();

        // 归一化列车几何（防止边界框异常值导致流场失真）
        const safe = (v, fallback) => (isFinite(v) && Math.abs(v) < 1e4) ? v : fallback;
        this.dim = {
            length: safe(dims.length, 4 * scale),
            width:  safe(dims.width, 1.4 * scale),
            height: safe(dims.height, 0.65 * scale),
            rearX:  safe(dims.rearX, -2 * scale),
            frontX: safe(dims.frontX, 2 * scale),
            topY:   safe(dims.topY, 0.5 * scale),
            bottomY: safe(dims.bottomY, 0)
        };

        // 流场半径参考（车体半宽、半高）
        this.halfW = this.dim.width * 0.5;
        this.halfH = this.dim.height * 0.5;
        this.midY = (this.dim.topY + this.dim.bottomY) * 0.5;

        // 生成参数化流线（多条），每条流线由若干采样点定义
        this.streamlines = this._buildStreamlines();

        // 1) 骨架流线（带沿线能量脉冲的 Line）
        this._buildStreamLineMeshes();

        // 2) 流线粒子（GPU Points，沿流线流动）
        this._buildFlowParticles();

        // 3) 车头滞止区高压发光（Sprite 脉冲）
        this._buildStagnationGlow();

        // 4) 车尾尾涡发光环（Sprite）
        this._buildWakeGlow();

        // 全局 uniform
        this._time = 0;
        this._intensity = 0;
        this._visible = true;
    }

    /**
     * 构建参数化流线集合
     * 每条流线返回采样点数组（Vector3），从远场前方(frontX+lead)流向车尾后方(rearX-trail)
     * region: 'top' | 'side+/- ' | 'bottom'
     */
    _buildStreamlines() {
        const d = this.dim;
        const s = this.scale;
        const lines = [];

        const lead = d.length * 1.6;   // 车头前流场长度
        const trail = d.length * 2.2;  // 车尾后流场长度
        const clearance = Math.max(0.25 * s, this.halfW * 0.35); // 越流间隙

        // 生成函数：给定目标横向偏移 zTarget 与高度 region，构造一条流线
        const make = (zTarget, yMode, yParam, label) => {
            const pts = [];
            const segs = 48;
            const xStart = d.frontX + lead;
            const xEnd = d.rearX - trail;
            for (let i = 0; i <= segs; i++) {
                const t = i / segs;
                const x = xStart + (xEnd - xStart) * t;

                // 沿 X 的“影响因子”：在车体范围内为1，向外衰减
                // nose 影响在 frontX 附近，tail 影响在 rearX 附近
                const noseInf = this._gauss(x - d.frontX, d.length * 0.25);
                const tailInf = this._gauss(x - d.rearX, d.length * 0.3);

                let y, z;
                if (yMode === 'top') {
                    // 顶部气流：在车头抬升越过车顶，车尾下沉汇入尾流
                    const top = d.topY + clearance * (0.6 + yParam);
                    const base = this.midY + d.height * 0.6;
                    y = base + (top - base) * noseInf;
                    y -= clearance * 0.5 * tailInf * yParam; // 尾部下沉
                } else if (yMode === 'bottom') {
                    const bot = d.bottomY - clearance * (0.4 + yParam * 0.5);
                    const base = this.midY - d.height * 0.6;
                    y = base + (bot - base) * noseInf;
                    y += clearance * 0.4 * tailInf;
                } else { // side
                    y = this.midY + yParam * d.height * 0.5;
                    // 侧向气流在车头处向外绕，车尾向内汇聚
                    y += Math.sin(t * Math.PI) * 0.02 * s * (1 - yParam);
                }

                if (yMode === 'side') {
                    const sideBase = zTarget;
                    const bowOut = clearance * (0.5 + Math.abs(zTarget) / (this.halfW + 1e-3));
                    // 车头向外扩张，车尾向中心汇聚
                    z = sideBase * (1 + bowOut * noseInf * 0.6) * (1 - 0.35 * tailInf);
                    z += Math.sin(t * Math.PI * 2) * 0.015 * s * tailInf; // 尾部轻微抖动
                } else {
                    z = zTarget + Math.sin(t * Math.PI * 3 + yParam * 5) * 0.01 * s * (noseInf + tailInf);
                }

                pts.push(new THREE.Vector3(x, y, z));
            }
            lines.push({ points: pts, label });
            return lines[lines.length - 1];
        };

        // 顶部多条（增加密度）
        make(0, 'top', 0.0, 'top0');
        make(this.halfW * 0.15, 'top', 0.08, 'topR1');
        make(-this.halfW * 0.15, 'top', 0.08, 'topL1');
        make(this.halfW * 0.25, 'top', 0.15, 'topR2');
        make(-this.halfW * 0.25, 'top', 0.15, 'topL2');
        make(this.halfW * 0.35, 'top', 0.22, 'topR3');
        make(-this.halfW * 0.35, 'top', 0.22, 'topL3');
        make(this.halfW * 0.45, 'top', 0.3, 'topRR');
        make(-this.halfW * 0.45, 'top', 0.3, 'topLL');

        // 侧面（左右对称，增加列数和层数）
        const sideCols = [0.45, 0.55, 0.65, 0.75, 0.85, 0.95];  // 6列
        const sideHeights = [0.4, 0.2, 0.0, -0.2, -0.4];  // 5层
        for (const c of sideCols) {
            for (const sign of [1, -1]) {
                const z = sign * (this.halfW + clearance * (c - 0.5) * 0.6);
                for (const h of sideHeights) {
                    make(z, 'side', h, `side${sign > 0 ? 'R' : 'L'}c${c}h${h}`);
                }
            }
        }

        // 底部
        make(0, 'bottom', 0.0, 'bot0');
        make(this.halfW * 0.3, 'bottom', 0.1, 'botR');
        make(-this.halfW * 0.3, 'bottom', 0.1, 'botL');

        return lines;
    }

    /** 高斯函数（用于影响因子） */
    _gauss(x, sigma) {
        return Math.exp(-(x * x) / (2 * sigma * sigma));
    }

    /**
     * 构建骨架流线网格：每条流线一条 Line，使用自定义着色器做沿线流动的能量脉冲
     */
    _buildStreamLineMeshes() {
        // 合并所有流线顶点到单一 BufferGeometry（性能优化）
        const allPts = [];
        this.streamlines.forEach((sl) => {
            sl.points.forEach((p) => allPts.push(p.x, p.y, p.z));
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(allPts, 3));
        // 每个顶点存储所属流线的 id 与沿线归一化位置，用于沿线脉冲着色
        const lineId = new Float32Array(allPts.length / 3);
        const along = new Float32Array(allPts.length / 3);
        let vi = 0;
        this.streamlines.forEach((sl, li) => {
            const n = sl.points.length;
            for (let i = 0; i < n; i++) {
                lineId[vi] = li;
                along[vi] = i / (n - 1);
                vi++;
            }
        });
        geo.setAttribute('aLineId', new THREE.Float32BufferAttribute(lineId, 1));
        geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));

        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0 },
                uVisible: { value: 1 },
                uLineCount: { value: this.streamlines.length },
                uColorA: { value: new THREE.Color(0xeeeeee) }, // 白灰（前段）
                uColorB: { value: new THREE.Color(0x888888) }  // 深灰（尾流）
            },
            vertexShader: /* glsl */`
                attribute float aLineId;
                attribute float aAlong;
                uniform float uTime;
                uniform float uIntensity;
                uniform float uLineCount;
                varying float vAlong;
                varying float vLineId;
                varying float vPulse;

                void main() {
                    vAlong = aAlong;
                    vLineId = aLineId / uLineCount;

                    // 沿线流动的能量脉冲：每条线不同相位/速度
                    float speed = 0.25 + fract(aLineId * 0.137) * 0.35;
                    float phase = fract(aLineId * 0.917) * 6.2831;
                    float pos = fract(aAlong * 1.0 - uTime * speed * (0.3 + uIntensity * 1.4) + phase);
                    // 脉冲峰：在 pos≈0.5 处最亮
                    float pulse = smoothstep(0.35, 0.5, pos) * smoothstep(0.65, 0.5, pos);
                    vPulse = pulse;

                    vec3 transformed = position;
                    // 轻微扰动模拟湍流（沿法线方向不易，这里用小幅位移）
                    float w = sin(uTime * 3.0 + aAlong * 12.0 + aLineId) * 0.01 * uIntensity;
                    transformed.y += w;
                    transformed.z += cos(uTime * 2.0 + aAlong * 9.0 + aLineId * 1.7) * 0.01 * uIntensity;

                    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
                }
            `,
            fragmentShader: /* glsl */`
                uniform float uTime;
                uniform float uIntensity;
                uniform float uVisible;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                varying float vAlong;
                varying float vLineId;
                varying float vPulse;

                void main() {
                    // 颜色：前段白亮，后段深灰
                    vec3 baseCol = mix(uColorA, uColorB, clamp(vAlong, 0.0, 1.0));
                    // 脉冲提亮（白灰烟雾）
                    vec3 col = baseCol + vPulse * 0.6 * vec3(1.0, 1.0, 1.0);
                    // 基础流线透明度 + 脉冲叠加
                    float alpha = (0.10 + 0.55 * vPulse) * uIntensity;
                    alpha *= uVisible;
                    // 首尾淡出，避免硬截断
                    alpha *= smoothstep(0.0, 0.06, vAlong) * smoothstep(1.0, 0.92, vAlong);
                    gl_FragColor = vec4(col, alpha);
                }
            `
        });

        this.streamlineLines = new THREE.LineSegments(geo, mat);
        // LineSegments 成对绘制顶点：把每条流线的相邻点构造成线段索引序列
        const idxGlobal = [];
        let base = 0;
        this.streamlines.forEach((sl) => {
            for (let i = 0; i < sl.points.length - 1; i++) {
                idxGlobal.push(base + i, base + i + 1);
            }
            base += sl.points.length;
        });
        geo.setIndex(idxGlobal);

        this.streamlineMat = mat;
        this.group.add(this.streamlineLines);
    }

    /**
     * 构建流线粒子系统：大量粒子在多条流线上流动
     * 每个粒子绑定一条流线（aLineId）与一个起始相位（aPhase），
     * 顶点着色器采样流线折线得到当前位置。
     */
    _buildFlowParticles() {
        const PCOUNT = 1100;
        const s = this.scale;
        const positions = new Float32Array(PCOUNT * 3); // 占位，实际由着色器计算
        const aLineId = new Float32Array(PCOUNT);
        const aPhase = new Float32Array(PCOUNT);
        const aSize = new Float32Array(PCOUNT);
        const aSeed = new Float32Array(PCOUNT);

        // 流线总点数与每条流线点数列表（供着色器采样）
        this._slCounts = this.streamlines.map(sl => sl.points.length);
        this._slTotal = this.streamlines.reduce((a, sl) => a + sl.points.length, 0);

        // 把所有流线点打包进 DataTexture 供顶点着色器采样（RGBA32F 风格：用多张纹理更复杂，
        // 这里改用一个统一的位置数组作为 attribute「每个粒子单独不能存整条线」，因此用纹理）
        // 构建 RGBA 数据：xy 存位置，z 存 y，w 存下一个点的索引提示——简化：用 RGB 三通道一张纹理
        const texData = new Float32Array(this._slTotal * 4);
        let p = 0;
        this.streamlines.forEach((sl) => {
            sl.points.forEach((pt) => {
                texData[p * 4 + 0] = pt.x;
                texData[p * 4 + 1] = pt.y;
                texData[p * 4 + 2] = pt.z;
                texData[p * 4 + 3] = 1.0;
                p++;
            }
            );
        });
        const tex = new THREE.DataTexture(texData, this._slTotal, 1, THREE.RGBAFormat, THREE.FloatType);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        this._streamTex = tex;

        // 每条流线起始偏移
        const slOffsets = [];
        let acc = 0;
        for (const c of this._slCounts) { slOffsets.push(acc); acc += c; }

        for (let i = 0; i < PCOUNT; i++) {
            const li = Math.floor(Math.random() * this.streamlines.length);
            aLineId[i] = li;
            aPhase[i] = Math.random();
            aSize[i] = (0.3 + Math.random() * 1) * s * 0.8;
            aSeed[i] = Math.random();
            positions[i * 3 + 0] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aLineId', new THREE.BufferAttribute(aLineId, 1));
        geo.setAttribute('aPhase', new THREE.BufferAttribute(aPhase, 1));
        geo.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
        geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));

        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0 },
                uVisible: { value: 1 },
                uTex: { value: tex },
                uTexSize: { value: this._slTotal },
                uPixelRatio: { value: window.devicePixelRatio || 1 },
                uColorHead: { value: new THREE.Color(0xf0f0f0) }, // 车头白色烟雾
                uColorMid: { value: new THREE.Color(0xcccccc) },  // 车身浅灰
                uColorTail: { value: new THREE.Color(0x777777) }  // 尾涡深灰
            }
        });

        // 流线条数
        const nLines = this.streamlines.length;

        // 查表纹理：根据 aLineId 得到该流线的 offset/count（GLSL 用 texture2D 采样，避免动态索引限制）
        // 这里用一个纹理辅助：把 (offset,count) 编码到一张小 DataTexture
        const ocData = new Float32Array(nLines * 4);
        slOffsets.forEach((v, i) => {
            ocData[i * 4 + 0] = v;            // offset
            ocData[i * 4 + 1] = this._slCounts[i]; // count
            ocData[i * 4 + 2] = 0;
            ocData[i * 4 + 3] = 0;
        });
        const ocTex = new THREE.DataTexture(ocData, nLines, 1, THREE.RGBAFormat, THREE.FloatType);
        ocTex.minFilter = THREE.NearestFilter;
        ocTex.magFilter = THREE.NearestFilter;
        ocTex.needsUpdate = true;
        this._ocTex = ocTex;
        mat.uniforms.uOC = { value: ocTex };
        mat.uniforms.uLineCount = { value: nLines };

        mat.vertexShader = /* glsl */`
            attribute float aLineId;
            attribute float aPhase;
            attribute float aSize;
            attribute float aSeed;
            uniform float uTime;
            uniform float uIntensity;
            uniform sampler2D uTex;
            uniform float uTexSize;
            uniform sampler2D uOC;
            uniform float uLineCount;
            uniform float uPixelRatio;
            varying float vAlong;
            varying float vSpeed;

            // 从 uTex 中按归一化坐标采样流线点（线性插值相邻点）
            vec3 sampleLine(float globalT, float offset, float count) {
                float local = clamp(globalT, 0.0, 1.0) * (count - 1.0);
                float u = (offset + local + 0.5) / uTexSize;
                vec3 p = texture2D(uTex, vec2(u, 0.5)).rgb;
                return p;
            }

            void main() {
                // 取该流线的 offset/count
                vec2 oc = texture2D(uOC, vec2((aLineId + 0.5) / uLineCount, 0.5)).rg;
                float offset = oc.x;
                float count = oc.y;

                // 粒子沿流线流动的归一化位置 [0,1]
                float speed = 0.08 + fract(aSeed * 7.31) * 0.12;
                float flowSpeed = speed * (0.4 + uIntensity * 2.2);
                float t = fract(aPhase + uTime * flowSpeed);
                vAlong = t;
                vSpeed = flowSpeed;

                vec3 p = sampleLine(t, offset, count);

                // 细微湍流抖动
                float jitter = 0.015 * uIntensity;
                p.x += sin(uTime * 4.0 + aSeed * 30.0) * jitter;
                p.y += cos(uTime * 3.5 + aSeed * 20.0) * jitter * 0.7;
                p.z += sin(uTime * 3.0 + aSeed * 25.0) * jitter * 0.7;

                vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
                // 尾部粒子（t 接近 1）放大，模拟尾涡扩散
                float sizeBoost = 1.0 + smoothstep(0.7, 1.0, t) * 1.5;
                gl_PointSize = aSize * sizeBoost * uPixelRatio * (260.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        mat.fragmentShader = /* glsl */`
            uniform float uIntensity;
            uniform float uVisible;
            uniform vec3 uColorHead;
            uniform vec3 uColorMid;
            uniform vec3 uColorTail;
            varying float vAlong;
            varying float vSpeed;

            void main() {
                // 圆形软粒子
                vec2 uv = gl_PointCoord - 0.5;
                float r = length(uv);
                if (r > 0.5) discard;
                float core = smoothstep(0.5, 0.0, r);
                float glow = pow(core, 2.2);

                // 颜色：前段白 → 中段浅灰 → 尾段深灰
                vec3 col;
                if (vAlong < 0.5) {
                    col = mix(uColorHead, uColorMid, vAlong / 0.5);
                } else {
                    col = mix(uColorMid, uColorTail, (vAlong - 0.5) / 0.5);
                }
                // 流速越快越亮
                col += glow * 0.3 * vSpeed;

                // 首尾淡入淡出，避免突兀
                float edge = smoothstep(0.0, 0.08, vAlong) * smoothstep(1.0, 0.9, vAlong);
                float alpha = glow * (0.45 + 0.55 * uIntensity) * edge * uVisible;
                gl_FragColor = vec4(col, alpha);
            }
        `;

        this.particlePoints = new THREE.Points(geo, mat);
        this.particleMat = mat;
        this.group.add(this.particlePoints);
    }

    /**
     * 车头滞止区高压发光（Sprite，随强度脉冲）
     */
    _buildStagnationGlow() {
        const s = this.scale;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(240,240,240,0.95)');
        g.addColorStop(0.3, 'rgba(200,200,200,0.55)');
        g.addColorStop(0.7, 'rgba(140,140,140,0.18)');
        g.addColorStop(1, 'rgba(80,80,80,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(canvas);

        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0
        });
        const sp = new THREE.Sprite(mat);
        sp.position.set(this.dim.frontX, this.midY, 0);
        const base = Math.max(1.2, this.halfH * 1.4);
        sp.scale.set(base, base, 1);
        this.stagnationSprite = sp;
        this.stagnationMat = mat;
        this.group.add(sp);
    }

    /**
     * 车尾尾涡发光（Sprite，柔光）
     */
    _buildWakeGlow() {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(180,180,180,0.6)');
        g.addColorStop(0.5, 'rgba(110,110,110,0.25)');
        g.addColorStop(1, 'rgba(60,60,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        const tex = new THREE.CanvasTexture(canvas);

        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            opacity: 0
        });
        const sp = new THREE.Sprite(mat);
        sp.position.set(this.dim.rearX, this.midY, 0);
        const base = Math.max(1.6, this.halfH * 1.8);
        sp.scale.set(base * 1.3, base * 1.1, 1);
        this.wakeSprite = sp;
        this.wakeMat = mat;
        this.group.add(sp);
    }

    /**
     * 每帧更新（由 TrainWithLights.updateWindEffect 调用）
     * @param {number} time - 已运行时间（秒）
     * @param {number} intensity - 0~1 速度强度
     * @param {boolean} isMoving - 是否在运动
     */
    update(time, intensity, isMoving) {
        this._time = time;
        this._intensity = isMoving ? intensity : Math.max(0, this._intensity - 0.02);
        const vis = this._visible ? 1 : 0;

        // 流线
        if (this.streamlineMat) {
            this.streamlineMat.uniforms.uTime.value = time;
            this.streamlineMat.uniforms.uIntensity.value = this._intensity;
            this.streamlineMat.uniforms.uVisible.value = vis;
        }
        // 粒子
        if (this.particleMat) {
            this.particleMat.uniforms.uTime.value = time;
            this.particleMat.uniforms.uIntensity.value = this._intensity;
            this.particleMat.uniforms.uVisible.value = vis;
        }
        // 车头脉冲：强度越高越亮，叠加呼吸
        if (this.stagnationMat) {
            const pulse = 0.6 + 0.4 * Math.sin(time * 6.0);
            this.stagnationMat.opacity = this._intensity * 0.8 * pulse * vis;
            const sc = (1 + 0.08 * pulse) * Math.max(1.2, this.halfH * 1.4);
            this.stagnationSprite.scale.set(sc, sc, 1);
        }
        // 车尾
        if (this.wakeMat) {
            const wobble = 0.7 + 0.3 * Math.sin(time * 3.0 + 1.0);
            this.wakeMat.opacity = this._intensity * 0.5 * wobble * vis;
        }
    }

    setVisible(v) {
        this._visible = v;
        this.group.visible = v;
    }

    dispose() {
        this.group.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
        if (this._streamTex) this._streamTex.dispose();
        if (this._ocTex) this._ocTex.dispose();
    }
}
