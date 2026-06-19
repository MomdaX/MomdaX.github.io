// TrainWithLights.js
import * as THREE from './three.module.js';
import { MTLLoader } from './MTLLoader.js';
import { OBJLoader } from './OBJLoader.js';

/**
 * 列车模型 + 模型自发光车灯封装类
 * 将列车模型、车头灯、尾灯封装为一个整体对象
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
            // 车灯参数（白色车灯）
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
        this.tailLights = [];
        this.modelLightSurfaces = [];
        this.headlightOn = true;
        this.beamLayers = [];
        this._loadToken = 0;
        this._switchQueue = Promise.resolve();

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
        this._windIntensity = 1.0;  // 风阻强度倍率
    }

    /**
     * 加载列车模型
     * @param {Function} onProgress - 进度回调 (percent: number) => void
     * @returns {Promise} 模型加载完成后 resolve
     */
    loadTrain(onProgress = null) {
        return new Promise((resolve, reject) => {
            const loadToken = ++this._loadToken;
            this.modelLoaded = false;
            const isCurrentLoad = () => loadToken === this._loadToken;
            const mtlLoader = new MTLLoader();
            
            mtlLoader.load(
                this.params.trainMtl,
                (materials) => {
                    if (!isCurrentLoad()) {
                        resolve(false);
                        return;
                    }
                    materials.preload();
                    const objLoader = new OBJLoader();
                    objLoader.setMaterials(materials);
                    objLoader.load(
                        this.params.trainObj,
                        (object) => {
                            if (!isCurrentLoad()) {
                                this._disposeObject(object);
                                resolve(false);
                                return;
                            }
                            this._setupTrainModel(object);
                            resolve(true);
                        },
                        (xhr) => {
                            if (!isCurrentLoad()) return;
                            const percent = (xhr.loaded / xhr.total * 100);
                            onProgress?.(percent);
                        },
                        (error) => {
                            if (!isCurrentLoad()) {
                                resolve(false);
                                return;
                            }
                            this._createFallbackTrain();
                            resolve(true);
                        }
                    );
                },
                (xhr) => {
                    if (!isCurrentLoad()) return;
                    const percent = (xhr.loaded / xhr.total * 100);
                    onProgress?.(percent);
                },
                (error) => {
                    if (!isCurrentLoad()) {
                        resolve(false);
                        return;
                    }
                    this._createFallbackTrain();
                    resolve(true);
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
    }

    /**
     * 创建车头灯自发光表面
     */
    _createHeadlights() {
        if (!this.trainModel) return;

        const dims = this._getLocalDimensions();
        const frontX = dims.frontX;
        const zLimit = dims.width * 0.18;
        const minY = dims.bottomY + dims.height * 0.28;
        const maxY = dims.bottomY + dims.height * 0.56;

        const surfaces = this._createLampSurfaceMeshes({
            name: 'headlight',
            materialNames: ['Material__79'],
            color: 0xffffff,
            emissiveIntensity: this.headlightOn ? 4.5 : 0,
            opacity: this.headlightOn ? 1.0 : 0.18,
            triangleMatches: (center) => (
                center.x >= frontX - dims.width * 0.78 &&
                center.y >= minY &&
                center.y <= maxY &&
                Math.abs(center.z) >= zLimit
            )
        });

        this.headlights.push(...surfaces);

        // 创建两条自发光光束照向前方（不创建 Three.js 光源）
        this._createForwardBeams(dims, zLimit);
    }

    /**
     * 创建两条自发光光束照向前方（不创建 Three.js 光源）
     * 使用渐变透明的锥形 mesh，从车灯位置延伸向前方
     * @param {Object} dims - _getLocalDimensions() 返回的局部空间尺寸
     * @param {number} zLimit - 左右车灯 Z 阈值
     */
    _createForwardBeams(dims, zLimit) {
        if (!this.trainModel) return;

        const frontX = dims.frontX;
        const minY = dims.bottomY + dims.height * 0.28;
        const maxY = dims.bottomY + dims.height * 0.56;
        const beamLength = dims.length * 2.2;
        const beamStartX = frontX + dims.width * 0.25;
        const centerY = (minY + maxY) / 2;

        // 左右两条光束的 Z 位置（对应左右车灯）
        const zPositions = [
            zLimit + dims.width * 0.02,   // 左灯
            -(zLimit + dims.width * 0.02)  // 右灯
        ];

        zPositions.forEach((zPos, index) => {
            const beamRadiusStart = dims.width * 0.06;
            const beamRadiusMid = dims.width * 0.13;
            const beamRadiusEnd = 0;  // 尖端收拢，无底面

            const segments = 24;
            const ringCount = 30;
            const vertices = [];
            const indices = [];
            const uvs = [];

            for (let i = 0; i <= ringCount; i++) {
                const t = i / ringCount;
                const x = beamStartX + t * beamLength;

                // 半径：近端收窄 → 中段扩散 → 远端收窄
                let radius;
                if (t < 0.15) {
                    radius = beamRadiusStart + (beamRadiusMid - beamRadiusStart) * (t / 0.15);
                } else if (t < 0.7) {
                    radius = beamRadiusMid;
                } else {
                    radius = beamRadiusMid + (beamRadiusEnd - beamRadiusMid) * ((t - 0.7) / 0.3);
                }

                for (let j = 0; j <= segments; j++) {
                    const angle = (j / segments) * Math.PI * 2;
                    const y = centerY + Math.cos(angle) * radius;
                    const z = zPos + Math.sin(angle) * radius;
                    vertices.push(x, y, z);
                    uvs.push(t, j / segments);
                }
            }

            // 构建索引
            const vertsPerRing = segments + 1;
            for (let i = 0; i < ringCount; i++) {
                for (let j = 0; j < segments; j++) {
                    const a = i * vertsPerRing + j;
                    const b = a + vertsPerRing;
                    const c = a + 1;
                    const d = b + 1;
                    indices.push(a, b, c);
                    indices.push(c, b, d);
                }
            }

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            geo.setIndex(indices);
            geo.computeVertexNormals();

            // 使用自定义着色器实现光束渐变效果
            const mat = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                uniforms: {
                    uColor: { value: new THREE.Color(0xffffff) },
                    uIntensity: { value: this.headlightOn ? 1.0 : 0 },
                    uVisible: { value: this.headlightOn ? 1 : 0 }
                },
                vertexShader: /* glsl */`
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    void main() {
                        vUv = uv;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: /* glsl */`
                    uniform vec3 uColor;
                    uniform float uIntensity;
                    uniform float uVisible;
                    varying vec2 vUv;
                    varying vec3 vNormal;
                    void main() {
                        // 沿光束长度方向 (x=uv.x) 的渐变：近端亮 → 远端淡出
                        float alongFade = 1.0 - smoothstep(0.0, 1.0, vUv.x);
                        // 径向渐变：中心亮，边缘透明
                        float radialFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
                        radialFade = pow(radialFade, 2.5);
                        // 前端也有一个快速衰减（避免灯口处太突兀）
                        float frontFade = smoothstep(0.0, 0.05, vUv.x);
                        float alpha = alongFade * radialFade * frontFade * uIntensity * 0.7;
                        alpha *= uVisible;
                        vec3 col = uColor * (1.0 + 0.3 * radialFade);
                        gl_FragColor = vec4(col, alpha);
                    }
                `
            });
            mat.toneMapped = false;

            const beamMesh = new THREE.Mesh(geo, mat);
            beamMesh.name = `headlight-beam-${index}`;
            beamMesh.renderOrder = 25;
            this.trainModel.add(beamMesh);
            this.beamLayers.push({ mesh: beamMesh, material: mat, type: 'forward' });
        });
    }

    /**
     * 使用模型本身的灯面三角面片创建自发光表面，不再额外创建 Three.js 光源。
     */
    _createLampSurfaceMeshes({ name, materialNames, color, emissiveIntensity, opacity, triangleMatches }) {
        if (!this.trainModel) return [];

        const created = [];
        const rootInverse = new THREE.Matrix4();
        this.trainModel.updateWorldMatrix(true, true);
        rootInverse.copy(this.trainModel.matrixWorld).invert();

        this.trainModel.traverse((child) => {
            if (!child.isMesh || child.userData?.isModelLampSurface || !child.geometry?.attributes?.position) return;

            const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material];
            if (!sourceMaterials.some((mat) => materialNames.includes(mat?.name))) return;

            const position = child.geometry.attributes.position;
            const index = child.geometry.index;
            const groups = child.geometry.groups?.length
                ? child.geometry.groups
                : [{ start: 0, count: index ? index.count : position.count, materialIndex: 0 }];
            const localToRoot = new THREE.Matrix4().multiplyMatrices(rootInverse, child.matrixWorld);
            const vertices = [];
            const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
            const center = new THREE.Vector3();

            const pushTriangle = (a, b, c) => {
                v[0].fromBufferAttribute(position, a).applyMatrix4(localToRoot);
                v[1].fromBufferAttribute(position, b).applyMatrix4(localToRoot);
                v[2].fromBufferAttribute(position, c).applyMatrix4(localToRoot);
                center.copy(v[0]).add(v[1]).add(v[2]).multiplyScalar(1 / 3);
                if (!triangleMatches(center)) return;
                vertices.push(
                    v[0].x, v[0].y, v[0].z,
                    v[1].x, v[1].y, v[1].z,
                    v[2].x, v[2].y, v[2].z
                );
            };

            groups.forEach((group) => {
                const sourceMaterial = sourceMaterials[group.materialIndex] || sourceMaterials[0];
                if (!materialNames.includes(sourceMaterial?.name)) return;

                const end = group.start + group.count;
                for (let i = group.start; i < end; i += 3) {
                    const a = index ? index.getX(i) : i;
                    const b = index ? index.getX(i + 1) : i + 1;
                    const c = index ? index.getX(i + 2) : i + 2;
                    pushTriangle(a, b, c);
                }
            });

            if (!vertices.length) return;

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
                name: `model-${name}-emissive`,
                color,
                emissive: new THREE.Color(color),
                emissiveIntensity,
                metalness: 0,
                roughness: 0.18,
                transparent: true,
                opacity,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2
            });
            material.toneMapped = false;

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `model-${name}-surface`;
            mesh.userData.isModelLampSurface = true;
            mesh.renderOrder = 30;
            this.trainModel.add(mesh);

            const surface = { mesh, material, type: name };
            this.modelLightSurfaces.push(surface);
            created.push(surface);
        });

        return created;
    }

    _getLocalDimensions() {
        const scale = this.params.trainScale || 1;
        const dims = this.trainDimensions || {
            frontX: 2 * scale,
            rearX: -2 * scale,
            length: 4 * scale,
            height: 0.65 * scale,
            width: 1.4 * scale,
            topY: 0.5 * scale,
            bottomY: 0
        };

        return {
            length: dims.length / scale,
            width: dims.width / scale,
            height: dims.height / scale,
            rearX: dims.rearX / scale,
            frontX: dims.frontX / scale,
            topY: dims.topY / scale,
            bottomY: dims.bottomY / scale
        };
    }

    /**
     * 创建车内灯光（窗户发光 + 尾部停车灯）
     * 识别窗户材质并设置 emissive 发光
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

        // 尾部两个红色停车灯
        this._createTailLights();
    }

    /**
     * 创建尾部两个红色停车灯（仅自发光表面，无光束）
     * 使用和车头灯相同的材质 Material__79，但位置在列车尾部
     */
    _createTailLights() {
        if (!this.trainModel) return;

        const dims = this._getLocalDimensions();
        const rearX = dims.rearX;
        const zLimit = dims.width * 0.18;
        const minY = dims.bottomY + dims.height * 0.28;
        const maxY = dims.bottomY + dims.height * 0.56;

        const surfaces = this._createLampSurfaceMeshes({
            name: 'tail-light',
            materialNames: ['Material__79'],
            color: 0xff2222,
            emissiveIntensity: 3.5,
            opacity: 1.0,
            triangleMatches: (center) => (
                center.x <= rearX + dims.width * 0.78 &&
                center.y >= minY &&
                center.y <= maxY &&
                Math.abs(center.z) >= zLimit
            )
        });

        this.tailLights.push(...surfaces);
        // 尾灯无光束
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
    }

    /**
     * 更新空气动力学流场
     * @param {number} speed - 列车实际速度 (m/s)
     */
    updateWindEffect(speed = 0) {
        if (!this.aeroFlow || !this.trainModel) return;
        // 速度线性映射到强度：speed 0→intensity 0, speed ~0.08(m/s)≈max→intensity 1
        // 但乘以 windIntensity 倍率系数
        const maxSpeed = 0.08 * (this._windIntensity || 1.0);
        const rawIntensity = maxSpeed > 0 ? Math.min(1, speed / maxSpeed) : 0;
        const intensity = rawIntensity;
        const isMoving = speed > 0.001;
        const delta = this._aeroClock.getDelta();
        this.aeroFlow.update(this._aeroClock.getElapsedTime(), intensity, isMoving, delta);
    }

    /**
     * 设置空气动力学流场开关
     */
    setWindEffectEnabled(enabled) {
        this.windEffectEnabled = enabled;
        if (this.aeroFlow) this.aeroFlow.setVisible(enabled);
    }

    /**
     * 配置风阻效果参数
     * @param {Object} cfg - { intensity: 0~2, density: 0~1, particleCount: 2~20 }
     */
    configureWindEffect(cfg = {}) {
        if (cfg.intensity !== undefined) {
            this._windIntensity = Math.max(0, Math.min(2, cfg.intensity));
        }
        // density 和 particleCount 需要重建流线，仅在 AeroFlowField 支持时应用
        if (this.aeroFlow) {
            if (cfg.density !== undefined && this.aeroFlow.setDensity) {
                this.aeroFlow.setDensity(Math.max(0, Math.min(1, cfg.density)));
            }
            if (cfg.particleCount !== undefined && this.aeroFlow.setParticleCount) {
                this.aeroFlow.setParticleCount(Math.max(2, Math.min(20, cfg.particleCount | 0)));
            }
        }
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
     * 更新车灯显示（包括自发光表面、前向光束、尾灯）
     */
    _updateHeadlights() {
        const targetIntensity = this.headlightOn ? 4.5 : 0;
        const targetOpacity = this.headlightOn ? 1.0 : 0.18;

        this.headlights.forEach((hl) => {
            hl.material.emissiveIntensity = targetIntensity;
            hl.material.opacity = targetOpacity;
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
            this.tailLights.forEach((tailLight) => {
                tailLight.material.emissiveIntensity = 3.5;
                tailLight.material.opacity = 1.0;
            });
        }

        // 光束层：前向光束跟随车灯开关
        this.beamLayers.forEach((beam) => {
            if (beam.material.isShaderMaterial) {
                beam.material.uniforms.uIntensity.value = this.headlightOn ? 1.0 : 0;
                beam.material.uniforms.uVisible.value = this.headlightOn ? 1 : 0;
            }
            beam.material.opacity = this.headlightOn ? 0.6 : 0;
        });
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
        this._loadToken++;
        this._clearTrainResources();
        if (this.aeroFlow) {
            this.aeroFlow.dispose();
            this.aeroFlow = null;
        }
    }

    _disposeObject(object) {
        object?.traverse?.((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    
    /**
     * 清理列车相关资源（不清理风阻效果）
     */
    _clearTrainResources() {
        if (this.trainModel) {
            // 先清理光束层
            this.beamLayers.forEach((beam) => {
                if (beam.mesh) {
                    if (beam.mesh.geometry) beam.mesh.geometry.dispose();
                    if (beam.mesh.material) {
                        if (beam.mesh.material.map) beam.mesh.material.map.dispose();
                        beam.mesh.material.dispose();
                    }
                }
            });
            this.beamLayers = [];

            // 先清理风阻效果（它是 trainModel 的子节点，必须在 trainModel 清理前处理）
            if (this.aeroFlow) {
                this.aeroFlow.dispose();
                this.aeroFlow = null;
            }

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
        // 如果 aeroFlow 还未被清理
        if (this.aeroFlow) {
            this.aeroFlow.dispose();
            this.aeroFlow = null;
        }
        this.headlights = [];
        this.interiorLights = [];
        this.windowMaterials = [];
        this.tailLights = [];
        this.modelLightSurfaces = [];
        this.modelLoaded = false;
        this.currentModelType = null;
    }
    
    /**
     * 切换列车模型（8节/16节）
     * @param {string} modelType - '8' 或 '16'
     * @returns {Promise} 模型加载完成后 resolve
     */
    async switchModel(modelType) {
        this._switchQueue = this._switchQueue
            .catch(() => {})
            .then(() => this._switchModelNow(modelType));
        return this._switchQueue;
    }

    async _switchModelNow(modelType) {
        if (modelType !== '8' && modelType !== '16') {
            return;
        }
        
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
        const loaded = await this.loadTrain();
        if (!loaded) {
            return this.currentModelType;
        }
        
        // 恢复状态
        this.setPosition(currentX);
        this.setVelocity(currentVelocity);
        this.setHeadlightOn(headlightOn);
        this.setWindEffectEnabled(windEnabled);
        
        // 保存当前模型类型
        this.currentModelType = modelType;
        
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
 * 空气动力学流场系统 — 风洞流线可视化
 *
 * 模拟汽车风洞测试中烟流线（smoke streamline）效果：
 *   - 密集的发光流线紧贴车身，从前向后绕过车体
 *   - 使用 TubeGeometry 构建管状流线，蓝色色自发光材质
 *   - 车头滞止区抬升绕流 → 车身边界层附着 → 尾部涡流扩散
 *   - 流线均匀分布：顶部、侧面、底部全面覆盖
 */
class AeroFlowField {
    constructor(dims, scale = 1.5) {
        this.scale = scale;
        this.group = new THREE.Group();

        const safe = (v, fallback) => (isFinite(v) && Math.abs(v) < 1e4) ? v : fallback;
        this.dim = {
            length:  safe(dims.length, 4 * scale),
            width:   safe(dims.width, 1.4 * scale),
            height:  safe(dims.height, 0.65 * scale),
            rearX:   safe(dims.rearX, -2 * scale),
            frontX:  safe(dims.frontX, 2 * scale),
            topY:    safe(dims.topY, 0.5 * scale),
            bottomY: safe(dims.bottomY, 0)
        };

        this.halfW = this.dim.width * 0.5;
        this.halfH = this.dim.height * 0.5;
        this.midY = (this.dim.topY + this.dim.bottomY) * 0.5;

        // 曲线存储（用于粒子动画）
        this._curves = [];
        this._brightCurveIndices = new Set();

        // 构建流线（使用4段式控制点法：远场→绕流→附着→尾涡）
        this._buildStreamlineTubes();

        // 构建沿流线运动的发光粒子
        this._buildFlowParticles();

        this._time = 0;
        this._intensity = 0;
        this._visible = true;

        // 预分配粒子位置更新用的临时向量
        this._tmpVec = new THREE.Vector3();
    }

    /**
     * 构建紧贴车身的管状流线网格
     *
     * 真实风洞空气动力学行为：
     *   1. 远场来流平行于 X 轴，从前方均匀流入
     *   2. 到达车头滞止区时，气流分叉：上方抬升、两侧绕流、下方下潜
     *   3. 车身中段：气流紧贴表面流动（边界层附着）
     *   4. 车尾：气流分离，形成下沉汇聚尾涡
     *
     * SU7 风格：使用自定义 ShaderMaterial 创建沿流线方向流动的条纹脉冲效果
     */
    _buildStreamlineTubes() {
        const d = this.dim;
        const s = this.scale;

        // 车头前来流长度（车长的 5%）
        const lead = d.length * 0.05;
        // 尾流长度（车长的 5%）
        const trail = d.length * 0.05;
        // 流线半径
        const tubeRadius = s * 0.018;
        const tubeSegments = 6;
        const curveSegments = 120;

        // ---- 自定义 Shader 材质：沿流线方向 UV.x 驱动流动条纹+脉冲 ----
        const flowVertexShader = /* glsl */`
            varying vec2 vUv;
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            void main() {
                vUv = uv;
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                vNormal = normalize(mat3(modelMatrix) * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        // fragment shader：UV.x 沿流线方向，配合时间形成流动脉冲
        const flowFragmentShader = /* glsl */`
            varying vec2 vUv;
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            uniform float uTime;
            uniform float uIntensity;
            uniform float uFlowSpeed;
            uniform vec3 uColorBase;
            uniform vec3 uColorBright;
            void main() {
                // 沿流线的流动相位移
                float wave = sin(vUv.x * 18.0 - uTime * uFlowSpeed * 3.0) * 0.5 + 0.5;
                // 第二组波，不同频率
                float wave2 = sin(vUv.x * 8.0 - uTime * uFlowSpeed * 1.7 + 1.8) * 0.5 + 0.5;
                // 脉冲群（局部亮斑沿流线移动）
                float pulse = sin(vUv.x * 5.0 - uTime * uFlowSpeed * 2.2) * 0.5 + 0.5;
                pulse = pow(pulse, 4.0);  // 锐化为亮斑
                // 径向衰减：管边缘透明，中心亮
                float radial = 1.0 - abs(vUv.y - 0.5) * 2.0;
                radial = pow(radial, 1.5);
                // 沿流线渐变：近端稍亮，远端淡出
                float alongFade = 1.0 - smoothstep(0.7, 1.0, vUv.x);
                // 前端入口淡入
                float frontFade = smoothstep(0.0, 0.05, vUv.x);
                // 合成
                float brightness = (0.3 + 0.7 * wave * 0.6 + wave2 * 0.3 + pulse * 0.8)
                                    * radial * alongFade * frontFade;
                // 脉冲尖峰使颜色偏亮
                vec3 col = mix(uColorBase, uColorBright, pulse * 0.9 + wave * 0.35);
                // 尾部区域微蓝
                col = mix(col, uColorBase, vUv.x * 0.45);
                float alpha = brightness * uIntensity * 0.75;
                gl_FragColor = vec4(col, alpha);
            }
        `;

        // 创建两种材质：常规和亮色
        const makeShaderMat = () => new THREE.ShaderMaterial({
            uniforms: {
                uTime:      { value: 0 },
                uIntensity: { value: 0 },
                uFlowSpeed: { value: 0.6 },
                uColorBase: { value: new THREE.Color(0x4488cc) },
                uColorBright: { value: new THREE.Color(0xaaddff) },
            },
            vertexShader: flowVertexShader,
            fragmentShader: flowFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false
        });

        const tubeShaderMat = makeShaderMat();
        const brightShaderMat = makeShaderMat();

        // 存储所有 ShaderMaterial 用于 update
        this._shaderMaterials = [tubeShaderMat, brightShaderMat];
        this.tubeMaterials = [tubeShaderMat, brightShaderMat];
        this.tubeMeshes = [];

        /**
         * 气动影响函数
         */
        const noseRamp = (x) => {
            const stagDist = d.length * 0.25 * 0.25;
            const noseFieldLen = d.length * 0.55;
            const dx = d.frontX - x;
            return this._sigmoid(dx, stagDist, noseFieldLen * 0.12);
        };

        const tailRamp = (x) => {
            const tailFieldLen = d.length * 0.7;
            const dx = x - d.rearX;
            return this._sigmoid(dx, 0, tailFieldLen * 0.2);
        };

        /**
         * 生成一条管状流线
         */
        const makeTube = (zBase, region, layerDist, yFrac, bright) => {
            const pts = [];
            const blThick = s * (0.04 + layerDist * 0.2);

            const xStart = d.frontX + lead;
            const xEnd = d.rearX - trail;
            const bodyHalfH = d.height * 0.5;
            const bodyHalfW = this.halfW;
            const bodyTop = d.topY;
            const bodyBot = d.bottomY;
            const stagDist = d.length * 0.25 * 0.25;
            const noseFieldLen = d.length * 0.55;

            for (let i = 0; i <= curveSegments; i++) {
                const t = i / curveSegments;
                const x = xStart + (xEnd - xStart) * t;

                const nInf = noseRamp(x);
                const tInf = tailRamp(x);

                let y, z;

                if (region === 'top') {
                    const freestreamY = bodyTop + blThick * 2.5;
                    const noseLift = blThick * 3.5;
                    const bodyY = bodyTop + blThick * 0.25;

                    y = freestreamY;
                    y += noseLift * nInf;
                    y = y + (bodyY - y) * this._sigmoid(nInf, 0.5, 0.08);
                    y -= blThick * 2.0 * tInf * (1.0 - layerDist * 0.5);

                    z = zBase;
                    if (Math.abs(zBase) > bodyHalfW * 0.3) {
                        const sideDeflect = Math.sign(zBase) * blThick * 0.6 * nInf * (1 - tInf);
                        z += sideDeflect * (1.0 - this._sigmoid(nInf, 0.7, 0.1));
                    }
                } else if (region === 'side') {
                    const fsY = this.midY + yFrac * bodyHalfH * 1.1;
                    const bodyY = this.midY + yFrac * bodyHalfH * 0.95;

                    y = fsY;
                    y += (bodyY - fsY) * nInf * 0.6;
                    y += (fsY - bodyY) * tInf * 0.3;

                    const fsZ = zBase;
                    const bodyZ = Math.sign(zBase) * (bodyHalfW + blThick * 0.08);
                    const noseBow = Math.sign(zBase) * (bodyHalfW + blThick * 2.8);

                    z = fsZ;
                    z += (noseBow - fsZ) * nInf;
                    z += (bodyZ - z) * this._sigmoid(nInf, 0.5, 0.06);
                    const wakeInward = -Math.sign(zBase) * blThick * 1.5 * tInf;
                    z += wakeInward;
                } else {
                    const fsY = bodyBot - blThick * 2.0;
                    const bodyY = bodyBot - blThick * 0.25;

                    y = fsY;
                    y += (bodyY - fsY) * nInf;
                    y += blThick * 1.2 * tInf * (1.0 - layerDist * 0.4);
                    z = zBase;
                }

                pts.push(new THREE.Vector3(x, y, z));
            }

            const curve = new THREE.CatmullRomCurve3(pts);
            // 复制一份用于粒子：粒子版本需要更长的尾流
            const particlePts = [];
            for (let i = 0; i <= curveSegments; i++) {
                const t = i / curveSegments;
                const x = xStart + (xEnd - trail * 0.4 - xStart) * t;
                const nInf = noseRamp(x);
                const tInf = tailRamp(x);
                let y, z;

                if (region === 'top') {
                    const freestreamY = bodyTop + blThick * 2.5;
                    const noseLift = blThick * 3.5;
                    const bodyY = bodyTop + blThick * 0.25;
                    y = freestreamY;
                    y += noseLift * nInf;
                    y = y + (bodyY - y) * this._sigmoid(nInf, 0.5, 0.08);
                    y -= blThick * 2.0 * tInf * (1.0 - layerDist * 0.5);
                    z = zBase;
                    if (Math.abs(zBase) > bodyHalfW * 0.3) {
                        const sideDeflect = Math.sign(zBase) * blThick * 0.6 * nInf * (1 - tInf);
                        z += sideDeflect * (1.0 - this._sigmoid(nInf, 0.7, 0.1));
                    }
                } else if (region === 'side') {
                    const fsY = this.midY + yFrac * bodyHalfH * 1.1;
                    const bodyY = this.midY + yFrac * bodyHalfH * 0.95;
                    y = fsY;
                    y += (bodyY - fsY) * nInf * 0.6;
                    y += (fsY - bodyY) * tInf * 0.3;
                    const fsZ = zBase;
                    const bodyZ = Math.sign(zBase) * (bodyHalfW + blThick * 0.08);
                    const noseBow = Math.sign(zBase) * (bodyHalfW + blThick * 2.8);
                    z = fsZ;
                    z += (noseBow - fsZ) * nInf;
                    z += (bodyZ - z) * this._sigmoid(nInf, 0.5, 0.06);
                    const wakeInward = -Math.sign(zBase) * blThick * 1.5 * tInf;
                    z += wakeInward;
                } else {
                    const fsY = bodyBot - blThick * 2.0;
                    const bodyY = bodyBot - blThick * 0.25;
                    y = fsY;
                    y += (bodyY - fsY) * nInf;
                    y += blThick * 1.2 * tInf * (1.0 - layerDist * 0.4);
                    z = zBase;
                }
                particlePts.push(new THREE.Vector3(x, y, z));
            }

            const particleCurve = new THREE.CatmullRomCurve3(particlePts);
            this._curves.push(particleCurve);
            if (bright) this._brightCurveIndices.add(this._curves.length - 1);

            const tubeGeo = new THREE.TubeGeometry(curve, curveSegments * 2, tubeRadius, tubeSegments, false);
            const mat = bright ? brightShaderMat : tubeShaderMat;
            const tubeMesh = new THREE.Mesh(tubeGeo, mat);
            tubeMesh.renderOrder = 6;
            tubeMesh.name = `flow-${region}-${layerDist.toFixed(2)}`;
            this.group.add(tubeMesh);
            this.tubeMeshes.push(tubeMesh);
        };

        // ---- 流线布局 ----

        // 顶部：水平分层流线
        const topCols = 7;
        const topLayers = 4;
        for (let layer = 0; layer < topLayers; layer++) {
            const lDist = layer / (topLayers - 1 + 0.01);
            for (let ci = 0; ci < topCols; ci++) {
                const z = (ci / (topCols - 1) - 0.5) * this.halfW * 1.8;
                makeTube(z, 'top', lDist, 0, layer === 0);
            }
        }

        // 侧面：左右对称的垂向分层流线
        const sideCols = 8;
        const sideHeights = 6;
        const sideLayers = 3;
        for (let layer = 0; layer < sideLayers; layer++) {
            const lDist = layer / (sideLayers - 1 + 0.01);
            for (let ci = 0; ci < sideCols; ci++) {
                const zDist = 0.03 + (ci / (sideCols - 1)) * 0.8;
                for (const sign of [1, -1]) {
                    const zb = sign * (this.halfW + zDist * s * 0.35);
                    for (let hi = 0; hi < sideHeights; hi++) {
                        const yFrac = (hi / (sideHeights - 1) - 0.5) * 2.0;
                        makeTube(zb, 'side', lDist, yFrac, layer === 0 && ci < 2);
                    }
                }
            }
        }

        // 底部
        const botCols = 5;
        for (let ci = 0; ci < botCols; ci++) {
            const z = (ci / (botCols - 1) - 0.5) * this.halfW * 1.4;
            makeTube(z, 'bottom', 0.3, 0, false);
            makeTube(z, 'bottom', 0.7, 0, false);
        }
    }

    _gauss(x, sigma) {
        return Math.exp(-(x * x) / (2 * sigma * sigma));
    }

    /**
     * S 形平滑过渡函数
     */
    _sigmoid(x, center, width) {
        return 1.0 / (1.0 + Math.exp(-(x - center) / (width + 0.0001)));
    }

    /**
     * 构建沿流线运动的发光粒子系统
     *
     * 每一条流线分配 N 个粒子，粒子沿曲线前进，
     * 速度略快于管状流的流动条纹，模拟风洞烟线中的亮点
     */
    _buildFlowParticles() {
        if (this._curves.length === 0) return;

        // 每条曲线分配粒子数
        const particlesPerCurve = 8;
        const totalParticles = this._curves.length * particlesPerCurve;

        const positions = new Float32Array(totalParticles * 3);
        // 每个粒子存储 (curveIndex, paramT, speed, seed) 用于更新
        this._particleData = new Float32Array(totalParticles * 4);
        const sizes = new Float32Array(totalParticles);
        const colors = new Float32Array(totalParticles * 3);

        const colorBright = new THREE.Color(0xddeeff);
        const colorDim = new THREE.Color(0x5599cc);

        for (let i = 0; i < totalParticles; i++) {
            const curveIdx = i % this._curves.length;
            const curve = this._curves[curveIdx];
            // 随机初始位置（沿曲线均匀分布）
            const t = Math.random();
            const pt = curve.getPointAt(t);

            positions[i * 3] = pt.x;
            positions[i * 3 + 1] = pt.y;
            positions[i * 3 + 2] = pt.z;

            // 粒子数据：(curveIndex, paramT, speedMultiplier, phase)
            this._particleData[i * 4] = curveIdx;
            this._particleData[i * 4 + 1] = t;
            this._particleData[i * 4 + 2] = 0.6 + Math.random() * 1.4;  // 速度差异
            this._particleData[i * 4 + 3] = Math.random() * Math.PI * 2; // 相位

            // 粒子大小：亮色曲线的大粒子
            const isBright = this._brightCurveIndices.has(curveIdx);
            sizes[i] = isBright ? (0.015 + Math.random() * 0.025) : (0.008 + Math.random() * 0.014);

            // 颜色
            const col = isBright ? colorBright : colorDim;
            colors[i * 3] = col.r * (0.7 + Math.random() * 0.3);
            colors[i * 3 + 1] = col.g * (0.7 + Math.random() * 0.3);
            colors[i * 3 + 2] = col.b * (0.7 + Math.random() * 0.3);
        }

        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // 圆形发光粒子贴图
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.15, 'rgba(200,230,255,0.9)');
        gradient.addColorStop(0.4, 'rgba(100,180,255,0.5)');
        gradient.addColorStop(0.7, 'rgba(30,80,180,0.1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);

        const particleTex = new THREE.CanvasTexture(canvas);
        particleTex.needsUpdate = true;

        const particleMat = new THREE.PointsMaterial({
            size: this.scale * 0.06,
            map: particleTex,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            transparent: true,
            vertexColors: true,
            sizeAttenuation: true,
            toneMapped: false
        });
        this._particleTexture = particleTex;
        this._particleMaterial = particleMat;

        this._particleSystem = new THREE.Points(particleGeo, particleMat);
        this._particleSystem.renderOrder = 7;
        this._particleSystem.name = 'flow-particles';
        this.group.add(this._particleSystem);
    }

    /**
     * 每帧更新
     * @param {number} time - 时钟经过时间 (秒)
     * @param {number} intensity - 0~1 强度
     * @param {boolean} isMoving - 是否运动中
     * @param {number} delta - 帧间隔 (秒)，用于粒子移动
     */
    update(time, intensity, isMoving, delta = 0.016) {
        this._time = time;
        this._intensity = isMoving ? intensity : Math.max(0, this._intensity - 0.015);
        const vis = this._visible ? 1 : 0;
        const alpha = this._intensity * vis;

        // ---- 更新 Shader 管状流线 ----
        const flowSpeed = 0.35 + alpha * 0.65;  // 慢速→快速
        this._shaderMaterials.forEach(mat => {
            mat.uniforms.uTime.value = time;
            mat.uniforms.uIntensity.value = alpha;
            mat.uniforms.uFlowSpeed.value = flowSpeed;
        });

        // ---- 更新沿流线运动的粒子 ----
        if (this._particleSystem && this._particleData) {
            const pos = this._particleSystem.geometry.attributes.position.array;
            const dt = delta * flowSpeed * 0.25;  // 粒子沿曲线移动步长
            const numParticles = this._particleData.length / 4;
            const v = this._tmpVec;

            for (let i = 0; i < numParticles; i++) {
                const curveIdx = Math.floor(this._particleData[i * 4]);
                const curve = this._curves[curveIdx];
                if (!curve) continue;

                // 更新参数 t，超出范围则循环
                let t = this._particleData[i * 4 + 1] + dt * this._particleData[i * 4 + 2];
                if (t > 1.0) t -= 1.0;
                if (t < 0) t += 1.0;

                this._particleData[i * 4 + 1] = t;
                curve.getPointAt(t, v);

                pos[i * 3] = v.x;
                pos[i * 3 + 1] = v.y;
                pos[i * 3 + 2] = v.z;
            }

            this._particleSystem.geometry.attributes.position.needsUpdate = true;
            this._particleMaterial.opacity = alpha * 0.85;
        }
    }

    setVisible(v) {
        this._visible = v;
        this.group.visible = v;
    }

    /**
     * 动态设置风阻线密度（0~1），重建流线来改变数量
     */
    setDensity(density) {
        const clamped = Math.max(0, Math.min(1, density));
        this._density = clamped;
        // 重建流线几何体
        this._rebuildAllStreamlines();
    }

    /**
     * 动态设置每条流线的粒子数
     */
    setParticleCount(count) {
        const clamped = Math.max(2, Math.min(20, count | 0));
        this._particleCount = clamped;
        // 重建粒子系统
        this._rebuildParticles();
    }

    /**
     * 重建所有流线（用于 density 变化时）
     */
    _rebuildAllStreamlines() {
        // 清理旧的管状网格
        this.tubeMeshes.forEach(tm => {
            if (tm.geometry) tm.geometry.dispose();
            if (tm.material) {
                if (tm.material.uniforms) {
                    Object.values(tm.material.uniforms).forEach(u => {
                        if (u.value && u.value.isTexture) u.value.dispose();
                    });
                }
                tm.material.dispose();
            }
            if (tm.parent) tm.parent.remove(tm);
        });
        this.tubeMeshes = [];
        // 清理旧的曲线
        this._curves = [];
        this._brightCurveIndices.clear();
        // 清理旧的粒子
        if (this._particleSystem) {
            this._particleSystem.geometry.dispose();
            if (this._particleSystem.parent) this._particleSystem.parent.remove(this._particleSystem);
            this._particleSystem = null;
        }
        if (this._particleMaterial) { this._particleMaterial.dispose(); this._particleMaterial = null; }
        if (this._particleTexture) { this._particleTexture.dispose(); this._particleTexture = null; }
        this._particleData = null;

        // 重建
        this._buildStreamlineTubes();
        this._buildFlowParticles();
    }

    /**
     * 重建粒子系统（用于 particleCount 变化时）
     */
    _rebuildParticles() {
        if (this._particleSystem) {
            this._particleSystem.geometry.dispose();
            if (this._particleSystem.parent) this._particleSystem.parent.remove(this._particleSystem);
            this._particleSystem = null;
        }
        if (this._particleMaterial) { this._particleMaterial.dispose(); this._particleMaterial = null; }
        if (this._particleTexture) { this._particleTexture.dispose(); this._particleTexture = null; }
        this._particleData = null;
        this._buildFlowParticles();
    }

    /**
     * 动态设置每条流线的粒子数（旧实现，仅做备用）
     */
    _oldSetParticleCount(count) {
        if (!this._particleSystem) return;
        const numCurves = this._curves.length;
        if (numCurves === 0) return;
        const totalParticles = numCurves * count;
        if (totalParticles <= 0) return;

        // 重建粒子数据
        const positions = new Float32Array(totalParticles * 3);
        this._particleData = new Float32Array(totalParticles * 4);
        const sizes = new Float32Array(totalParticles);
        const colors = new Float32Array(totalParticles * 3);

        const colorBright = new THREE.Color(0xddeeff);
        const colorDim = new THREE.Color(0x5599cc);

        for (let i = 0; i < totalParticles; i++) {
            const curveIdx = i % numCurves;
            const curve = this._curves[curveIdx];
            const t = Math.random();
            const pt = curve.getPointAt(t);
            positions[i * 3] = pt.x;
            positions[i * 3 + 1] = pt.y;
            positions[i * 3 + 2] = pt.z;
            this._particleData[i * 4] = curveIdx;
            this._particleData[i * 4 + 1] = t;
            this._particleData[i * 4 + 2] = 0.6 + Math.random() * 1.4;
            this._particleData[i * 4 + 3] = Math.random() * Math.PI * 2;
            const isBright = this._brightCurveIndices.has(curveIdx);
            sizes[i] = isBright ? (0.015 + Math.random() * 0.025) : (0.008 + Math.random() * 0.014);
            const col = isBright ? colorBright : colorDim;
            colors[i * 3] = col.r * (0.7 + Math.random() * 0.3);
            colors[i * 3 + 1] = col.g * (0.7 + Math.random() * 0.3);
            colors[i * 3 + 2] = col.b * (0.7 + Math.random() * 0.3);
        }

        this._particleSystem.geometry.dispose();
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this._particleSystem.geometry = geo;
    }

    dispose() {
        // 清理管状流线
        this.tubeMeshes.forEach(tm => {
            if (tm.geometry) tm.geometry.dispose();
            if (tm.material) {
                if (tm.material.uniforms) {
                    Object.values(tm.material.uniforms).forEach(u => {
                        if (u.value && u.value.isTexture) u.value.dispose();
                    });
                }
                tm.material.dispose();
            }
        });
        this.tubeMeshes = [];
        this.tubeMaterials = [];
        this._shaderMaterials = [];
        this._curves = [];
        this._brightCurveIndices.clear();

        // 清理粒子系统
        if (this._particleSystem) {
            if (this._particleSystem.geometry) this._particleSystem.geometry.dispose();
            if (this._particleMaterial) this._particleMaterial.dispose();
            this._particleSystem = null;
            this._particleMaterial = null;
        }
        if (this._particleTexture) {
            this._particleTexture.dispose();
            this._particleTexture = null;
        }
        this._particleData = null;
    }
}
