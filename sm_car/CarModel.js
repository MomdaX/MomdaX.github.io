// CarModel.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * 汽车模型封装类
 * 加载 GLTF 格式的汽车模型（支持 meshopt 压缩）
 */
export class CarModel {
    constructor(params = {}) {
        // 默认参数
        this.params = {
            modelPath: 'sm_car/sm_car.gltf',
            scale: 0.5,
            position: { x: -15, y: 0.5, z: 0 },
            rotation: { x: 0, y: Math.PI / 2, z: 0 },
            bodyColor: '#26d6e9',
            ...params
        };

        // 状态
        this.model = null;
        this.modelGroup = new THREE.Group();
        this.modelLoaded = false;
        this.loader = null;
        this.bodyMat = null;
        this.textureLoader = new THREE.TextureLoader();
        this.aoMap = null;
    }

    /**
     * 初始化加载器（支持 meshopt 压缩）
     */
    async _initLoader() {
        if (this.loader) return;
        
        this.loader = new GLTFLoader();
        
        // 等待 meshopt 解码器加载
        await MeshoptDecoder.ready;
        
        // 设置 meshopt 解码器
        this.loader.setMeshoptDecoder(MeshoptDecoder);
        
        console.log('CarModel loader initialized with meshopt support');
    }

    /**
     * 加载额外纹理
     */
    async _loadTextures() {
        return new Promise((resolve) => {
            this.textureLoader.load('sm_car/t_car_body_ao.jpg', (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                this.aoMap = texture;
                resolve();
            }, undefined, () => {
                // 加载失败时跳过
                console.log('AO map not found, skipping');
                resolve();
            });
        });
    }

    /**
     * 加载汽车模型
     * @param {Function} onProgress - 进度回调
     * @returns {Promise} 模型加载完成后 resolve
     */
    async loadModel(onProgress = null) {
        await this._initLoader();
        await this._loadTextures();
        
        return new Promise((resolve, reject) => {
            this.loader.load(
                this.params.modelPath,
                (gltf) => {
                    this._setupModel(gltf);
                    resolve(gltf);
                },
                (xhr) => {
                    const percent = (xhr.loaded / xhr.total * 100);
                    onProgress?.(percent);
                    console.log(`汽车模型加载进度: ${percent.toFixed(1)}%`);
                },
                (error) => {
                    console.error('汽车模型加载失败:', error);
                    console.error('Error details:', error.message);
                    this._createFallbackModel();
                    resolve();
                }
            );
        });
    }

    /**
     * 设置模型
     */
    _setupModel(gltf) {
        this.model = gltf.scene;
        const p = this.params;

        // 缩放
        this.model.scale.set(p.scale, p.scale, p.scale);

        // 旋转（使车头朝向 +Z）
        this.model.rotation.set(p.rotation.x, p.rotation.y, p.rotation.z);

        // 位置
        this.model.position.set(p.position.x, p.position.y, p.position.z);

        // 添加到组
        this.modelGroup.add(this.model);
        this.modelLoaded = true;

        // 设置材质
        this._setupMaterials();

        console.log('汽车模型加载完成');
    }

    /**
     * 设置材质（使用原项目配置）
     */
    _setupMaterials() {
        if (!this.model) return;

        const modelParts = [];
        this.model.traverse((child) => {
            if (child.isMesh) {
                modelParts.push(child);
            }
        });

        if (modelParts.length >= 3) {
            const body = modelParts[2];
            if (body.material) {
                const bodyMat = body.material;
                this.bodyMat = bodyMat;
                if (bodyMat.isMeshStandardMaterial) {
                    bodyMat.color = new THREE.Color(this.params.bodyColor);
                    bodyMat.metalness = 0.8;
                    bodyMat.roughness = 0.15;
                    if (this.aoMap) {
                        bodyMat.aoMap = this.aoMap;
                        bodyMat.aoMapIntensity = 1.0;
                    }
                    bodyMat.needsUpdate = true;
                }
            }
        }

        modelParts.forEach((item) => {
            if (item.isMesh && item.material) {
                const materials = Array.isArray(item.material) ? item.material : [item.material];
                
                materials.forEach((mat) => {
                    if (mat.isMeshStandardMaterial) {
                        if (this.aoMap) {
                            mat.aoMap = this.aoMap;
                            mat.aoMapIntensity = 0.8;
                        }
                        
                        if (!mat.metalness) mat.metalness = 0.3;
                        if (!mat.roughness) mat.roughness = 0.7;
                        
                        mat.castShadow = true;
                        mat.receiveShadow = true;
                        mat.needsUpdate = true;
                    }
                });
                
                item.castShadow = true;
                item.receiveShadow = true;
            }
        });
        
        console.log('材质设置完成（使用原项目配置）');
    }

    /**
     * 创建备用模型（加载失败时）
     */
    _createFallbackModel() {
        const p = this.params;
        const fallback = new THREE.Group();

        // 简易车身
        const bodyGeo = new THREE.BoxGeometry(4 * p.scale, 1.2 * p.scale, 2 * p.scale);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2255aa,
            metalness: 0.8,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6 * p.scale;
        fallback.add(body);

        // 车顶
        const roofGeo = new THREE.BoxGeometry(2.5 * p.scale, 0.8 * p.scale, 1.8 * p.scale);
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0x334488,
            metalness: 0.6,
            roughness: 0.4
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 1.4 * p.scale;
        fallback.add(roof);

        // 车轮
        const wheelGeo = new THREE.CylinderGeometry(0.3 * p.scale, 0.3 * p.scale, 0.2 * p.scale, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const wheelPositions = [
            { x: -1.5, y: 0.3, z: -0.9 },
            { x: -1.5, y: 0.3, z: 0.9 },
            { x: 1.5, y: 0.3, z: -0.9 },
            { x: 1.5, y: 0.3, z: 0.9 }
        ];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.x = Math.PI / 2;
            wheel.position.set(pos.x * p.scale, pos.y * p.scale, pos.z * p.scale);
            fallback.add(wheel);
        });

        this.model = fallback;
        this.model.rotation.set(p.rotation.x, p.rotation.y, p.rotation.z);
        this.model.position.set(p.position.x, p.position.y, p.position.z);

        this.modelGroup.add(this.model);
        this.modelLoaded = true;

        console.log('使用简易汽车模型');
    }

    /**
     * 获取模型组（用于添加到场景）
     */
    getGroup() {
        return this.modelGroup;
    }

    /**
     * 设置位置
     */
    setPosition(x, y, z) {
        if (this.model) {
            this.model.position.set(x, y, z);
        }
    }

    /**
     * 设置旋转
     */
    setRotation(x, y, z) {
        if (this.model) {
            this.model.rotation.set(x, y, z);
        }
    }

    /**
     * 设置缩放
     */
    setScale(scale) {
        if (this.model) {
            this.model.scale.set(scale, scale, scale);
        }
    }

    /**
     * 清理资源
     */
    dispose() {
        if (this.model) {
            this.model.traverse((child) => {
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
        this.model = null;
        this.modelLoaded = false;
    }
}

export default CarModel;