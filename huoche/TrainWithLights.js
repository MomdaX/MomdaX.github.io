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

        // 风阻效果
        this.windLines = [];
        this.windTrails = [];
        this.windEffectEnabled = true;
        this.windLineCount = 80;
        this.trailCount = 40;
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

        this.trainGroup.add(this.trainModel);
        this.trainGroup.renderOrder = 10;
        this.trainGroup.position.z = this.currentZ;
        this.modelLoaded = true;

        this._createHeadlights();
        this._createWindEffect();
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
     * 创建风阻效果（空气动力学流线）
     */
    _createWindEffect() {
        if (!this.trainModel) return;

        const p = this.params;

        // 创建多层流线（近场/中场/远场）
        this._createFlowLines(p.trainScale);

        // 创建尾部湍流效果
        this._createTurbulenceTrails(p.trainScale);

        console.log('风阻效果创建完成');
    }

    /**
     * 创建流线型风线（符合空气动力学）
     * 靠近车头处风线密集，向后逐渐变稀疏并扩散
     */
    _createFlowLines(scale) {
        const layers = [
            { radius: 0.6, count: 25, color: 0xffffff, opacity: 0.7 },   // 近场：高亮度
            { radius: 1.0, count: 30, color: 0x88ddff, opacity: 0.5 },   // 中场：中亮度
            { radius: 1.5, count: 25, color: 0x4488cc, opacity: 0.3 }    // 远场：低亮度
        ];

        layers.forEach((layer, layerIndex) => {
            for (let i = 0; i < layer.count; i++) {
                const angle = (i / layer.count) * Math.PI * 1.2 - Math.PI * 0.6; // 半椭圆分布
                const radiusVariation = layer.radius * (0.8 + Math.random() * 0.4);

                const line = this._createFlowLine(scale, radiusVariation, angle, layer, layerIndex);

                // 合并 userData（不要覆盖 _createFlowLine 中设置的 basePoints）
                Object.assign(line.userData, {
                    layerIndex,
                    baseAngle: angle,
                    radius: radiusVariation,
                    speed: 0.15 + Math.random() * 0.1,
                    phase: Math.random() * Math.PI * 2,
                    age: Math.random() * 2.0
                });

                this.trainModel.add(line);
                this.windLines.push(line);
            }
        });
    }

    /**
     * 创建单条流线
     */
    _createFlowLine(scale, radius, angle, layerConfig, layerIndex) {
        const trainLength = 4 * scale;

        // 流线位置：火车后方（-X方向），火车移动的反方向
        // 火车绕 Y 轴旋转 90 度，原本的 +X 变成世界的 +Z，所以火车后方是 -X
        const startX = -trainLength * 0.5;  // 后方开始
        const startY = Math.cos(angle) * radius * scale * 0.4 + 0.3 * scale;
        const startZ = Math.sin(angle) * radius * scale;

        // 创建曲线路径（模拟气流）
        const points = [];
        const segments = 15;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;

            // x: 从后方（-X）向更后方（更小的-X）延伸
            const x = startX - t * trainLength * 1.5;

            // z: 横向扩散
            const zSpread = Math.sin(angle) * radius * scale * (1 + t * 0.5);

            // y: 垂直分布，略微上扬
            const ySpread = Math.cos(angle) * radius * scale * 0.3;

            // 添加波动
            const wave = Math.sin(t * Math.PI * 2 + layerIndex) * 0.05 * scale;

            points.push(new THREE.Vector3(x, startY + ySpread + wave, startZ + zSpread));
        }

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(points.length * 3);
        for (let i = 0; i < points.length; i++) {
            positions[i * 3] = points[i].x;
            positions[i * 3 + 1] = points[i].y;
            positions[i * 3 + 2] = points[i].z;
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: layerConfig.color,
            transparent: true,
            opacity: layerConfig.opacity,
            linewidth: 1
        });

        const line = new THREE.Line(geometry, material);
        line.userData.basePoints = points.slice();
        line.userData.layerIndex = layerIndex;

        return line;
    }

    /**
     * 创建尾部湍流效果
     */
    _createTurbulenceTrails(scale) {
        for (let i = 0; i < this.trailCount; i++) {
            const trail = this._createTrailParticle(scale);
            trail.userData = {
                offsetX: -2 * scale,  // 后方位置
                offsetY: (Math.random() - 0.5) * 0.8 * scale,
                offsetZ: (Math.random() - 0.5) * 1.5 * scale,
                speed: 0.2 + Math.random() * 0.3,
                turbulence: 0.1 + Math.random() * 0.2,
                phase: Math.random() * Math.PI * 2,
                size: 0.02 + Math.random() * 0.04
            };
            this.trainModel.add(trail);
            this.windTrails.push(trail);
        }
    }

    /**
     * 创建尾部湍流粒子
     */
    _createTrailParticle(scale) {
        const geometry = new THREE.SphereGeometry(0.03 * scale, 6, 6);
        const material = new THREE.MeshBasicMaterial({
            color: 0xaaddff,
            transparent: true,
            opacity: 0.4
        });
        const particle = new THREE.Mesh(geometry, material);
        particle.visible = false;
        return particle;
    }

    /**
     * 更新风阻效果（空气动力学模拟）
     * @param {number} speed - 列车速度
     */
    updateWindEffect(speed = 0.05) {
        if (!this.windLines.length || !this.trainModel) return;

        const time = performance.now() * 0.001;
        const intensity = Math.min(1, speed / 0.08); // 速度强度
        const isMoving = speed > 0.01;

        // 更新流线
        this._updateFlowLines(time, intensity, isMoving);

        // 更新尾部湍流
        this._updateTurbulenceTrails(time, intensity, isMoving);
    }

    /**
     * 更新流线
     */
    _updateFlowLines(time, intensity, isMoving) {
        if (!this.windLines || !this.windLines.length) return;

        this.windLines.forEach((line, index) => {
            if (!line || !line.userData || !line.userData.basePoints) return;

            const data = line.userData;

            // 生命值周期
            data.age = (data.age || 0) + 0.016 * (isMoving ? 1 : 0);
            if (data.age > 2.0) data.age = 0;

            const lifeFactor = 1 - (data.age / 2.0);

            // 基础透明度
            const baseOpacity = 0.6 * lifeFactor * intensity;

            // 呼吸效果
            const breathe = 0.8 + Math.sin(time * 3 + data.phase) * 0.2;
            line.material.opacity = baseOpacity * breathe;

            line.visible = this.windEffectEnabled && isMoving && intensity > 0.1;

            // 流线末端扩散效果
            const positions = line.geometry.attributes.position.array;
            const points = data.basePoints;

            for (let i = 0; i < points.length; i++) {
                const t = i / (points.length - 1);

                // 微小波动模拟湍流
                const wave = Math.sin(time * 4 + t * Math.PI * 3 + data.phase) * 0.05 * (1 - t * 0.5);

                // 位置：基于 basePoints，但添加波动
                positions[i * 3] = points[i].x + wave;
                positions[i * 3 + 1] = points[i].y + wave * 0.5;
                positions[i * 3 + 2] = points[i].z;
            }

            line.geometry.attributes.position.needsUpdate = true;
        });
    }

    /**
     * 更新尾部湍流
     */
    _updateTurbulenceTrails(time, intensity, isMoving) {
        if (!this.windTrails || !this.windTrails.length) return;

        this.windTrails.forEach((particle, index) => {
            if (!particle || !particle.userData) return;

            const data = particle.userData;

            // 更新相位
            data.phase += 0.02 * data.speed;

            // 湍流位置计算
            const turbulenceX = Math.sin(data.phase * 2) * data.turbulence * intensity;
            const turbulenceY = Math.cos(data.phase * 3) * data.turbulence * 0.5 * intensity;
            const turbulenceZ = Math.sin(data.phase * 1.5) * data.turbulence * 0.3 * intensity;

            // 位置：车尾后方（-X方向），火车移动的反方向
            particle.position.x = data.offsetX + turbulenceX;
            particle.position.y = data.offsetY + turbulenceY;
            particle.position.z = data.offsetZ + turbulenceZ;

            // 透明度随强度变化
            particle.material.opacity = 0.4 * intensity * (0.5 + Math.sin(time * 5 + index) * 0.5);

            // 缩放动画
            const scale = 0.8 + Math.sin(time * 3 + data.phase) * 0.3;
            particle.scale.setScalar(scale);

            particle.visible = this.windEffectEnabled && isMoving && intensity > 0.15;

            // 颜色渐变
            particle.material.color.setHSL(0.55, 0.6, 0.7);
        });
    }

    /**
     * 设置风阻效果开关
     */
    setWindEffectEnabled(enabled) {
        this.windEffectEnabled = enabled;
        this.windLines.forEach(line => line.visible = enabled);
        this.windTrails.forEach(particle => particle.visible = enabled);
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
        this.windLines = [];
        this.windTrails = [];
    }
}
