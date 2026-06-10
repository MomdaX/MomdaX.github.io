var QZCWD_QVZ = {
    "id": "C1760C260201",
    "version": "C260201",
    "node": 1760,
    "fq": 1371,
    "lh": "QVZ",
    "line_index": 16515,
    "x": 152.3292,
    "y": 608.7664,
    "lng": 108.6103,
    "lat": 21.7527,
    "zm": "钦州港",
    "fqmc": "柳州",
    "ljjc": "宁",
    "province": 45,
    "provincejc": "桂",
    "railway": 16515,
    "railwaymc": "钦港线",
    "attribute": 109,
    "attributemc": "广西沿海铁路有限责任公司"
};

function PathFinder() {
    var nodes = [];
    var edges = [];
    var nodeIndex = {};
    var initialized = false;
    var customFjzStations = ["威舍", "牙屯堡", "麻尾", "永州", "茂名西"];

    this.init = function() {
        if (!window.getMapDndPoint || !window.getMapDlnPoint) {
            console.log('PathFinder init: Waiting for data to load...');
            initialized = false;
            return;
        }
        
        if (initialized && nodes.length > 0 && edges.length > 0) {
            return;
        }
        
        nodes = window.getMapDndPoint.map(function(node) {
            var zm = node.zm || node.lh || 'Unknown';
            
            if (window.getMapDftPoint && node.node) {
                var dftNode = window.getMapDftPoint.find(function(d) {
                    return d.node1 === node.node;
                });
                if (dftNode && dftNode.zm) {
                    zm = dftNode.zm;
                }
            }
            
            return {
                id: node.id,
                node: node.node,
                lh: node.lh,
                zm: zm,
                x: node.x,
                y: node.y,
                fq: node.fq
            };
        });
        
        nodeIndex = {};
        nodes.forEach(function(node, index) {
            if (node.lh) nodeIndex[node.lh] = index;
            if (node.id) nodeIndex[node.id] = index;
            if (node.node) nodeIndex[node.node] = index;
        });
        
        edges = window.getMapDlnPoint.map(function(line) {
            return {
                node1: line.node1,
                node2: line.node2,
                fq: line.fq,
                nnlc: line.nnlc,
                x1: line.x1,
                y1: line.y1,
                x2: line.x2,
                y2: line.y2,
                notPass: line.notPass
            };
        });
        
        initialized = true;
        console.log('PathFinder init completed: ' + nodes.length + ' nodes, ' + edges.length + ' edges');
    };

    this.calculatePathDistance = function(nodeIds) {
        var totalDistance = 0;
        for (var i = 0; i < nodeIds.length - 1; i++) {
            var edge = this.findEdge(nodeIds[i], nodeIds[i+1]);
            if (edge && edge.nnlc) {
                totalDistance += edge.nnlc;
            }
        }
        return totalDistance;
    };

    this.findNodeByNameOrCode = function(nameOrCode) {
        nameOrCode = nameOrCode.trim();
        
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.zm === nameOrCode || 
                node.lh === nameOrCode.toUpperCase() || 
                node.id === nameOrCode) {
                return node;
            }
        }
        
        if (window.getMapDftPoint) {
            for (var idx = 0; idx < window.getMapDftPoint.length; idx++) {
                var dftNode = window.getMapDftPoint[idx];
                if (dftNode.zm === nameOrCode || dftNode.lh === nameOrCode.toUpperCase()) {
                    var dndNode = nodes.find(function(n) {
                        return n.node === dftNode.node1 || n.lh === dftNode.lh;
                    });
                    if (dndNode) {
                        return {
                            id: dndNode.id,
                            node: dndNode.node,
                            node1: dndNode.node,
                            node2: 0,
                            zm: dftNode.zm,
                            lh: dndNode.lh,
                            x: dndNode.x,
                            y: dndNode.y,
                            fq: dndNode.fq,
                            isMidStation: false
                        };
                    }
                }
            }
        }
        
        if (window.中间站数据) {
            for (var key in window.中间站数据) {
                var midStations = window.中间站数据[key];
                if (!midStations || midStations.length === 0) continue;
                
                for (var j = 0; j < midStations.length; j++) {
                    var station = midStations[j];
                    if (!station || !station.zm) continue;
                    
                    if (station.zm === nameOrCode || 
                        station.lh === nameOrCode.toUpperCase()) {
                        return {
                            id: station.id,
                            node: station.node1,
                            node1: station.node1,
                            node2: station.node2,
                            zm: station.zm,
                            lh: station.lh,
                            x: station.x,
                            y: station.y,
                            fq: station.fq,
                            isMidStation: true
                        };
                    }
                }
            }
        }
        
        return null;
    };

    this.setCustomFjzStations = function(stations) {
        customFjzStations = stations || [];
        console.log('自定义分界站已设置:', customFjzStations);
    };

    this.getCustomFjzStations = function() {
        return customFjzStations;
    };

    this.isCustomFjzStation = function(zmOrLh) {
        if (!zmOrLh) return false;
        return customFjzStations.some(function(station) {
            return station === zmOrLh || 
                   (typeof station === 'object' && (station.zm === zmOrLh || station.lh === zmOrLh));
        });
    };

    this.dijkstra = function(startNodeId, endNodeId, ignoreNotPass) {
        var gScore = {};
        var cameFrom = {};
        var openSet = [];
        
        for (var i = 0; i < nodes.length; i++) {
            gScore[nodes[i].node] = Infinity;
        }
        gScore[startNodeId] = 0;
        
        openSet.push({ nodeId: startNodeId, cost: 0 });
        
        var maxIterations = 10000;
        var iteration = 0;
        
        while (openSet.length > 0 && iteration < maxIterations) {
            iteration++;
            openSet.sort(function(a, b) { return a.cost - b.cost; });
            var current = openSet.shift();
            var currentId = current.nodeId;
            
            if (currentId === endNodeId) {
                return this.reconstructPath(cameFrom, currentId);
            }
            
            var neighbors = ignoreNotPass ? this.getNeighborsIgnoreNotPass(currentId) : this.getNeighbors(currentId);
            
            for (var i = 0; i < neighbors.length; i++) {
                var neighbor = neighbors[i];
                
                var tentativeG = gScore[currentId] + neighbor.distance;
                
                if (tentativeG < gScore[neighbor.nodeId]) {
                    cameFrom[neighbor.nodeId] = currentId;
                    gScore[neighbor.nodeId] = tentativeG;
                    
                    var exists = openSet.some(function(item) { return item.nodeId === neighbor.nodeId; });
                    if (!exists) {
                        openSet.push({ nodeId: neighbor.nodeId, cost: tentativeG });
                    } else {
                        for (var j = 0; j < openSet.length; j++) {
                            if (openSet[j].nodeId === neighbor.nodeId) {
                                openSet[j].cost = tentativeG;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        return [];
    };
    
    this.aStar = function(startNodeId, endNodeId, ignoreNotPass) {
        if (nodes.length === 0 || edges.length === 0) {
            return [];
        }
        
        var startIndex = nodeIndex[startNodeId];
        var endIndex = nodeIndex[endNodeId];
        
        if (startIndex === undefined || endIndex === undefined) {
            return [];
        }
        
        var startNode = nodes[startIndex];
        var endNode = nodes[endIndex];
        
        var gScore = {};
        var fScore = {};
        var cameFrom = {};
        
        for (var i = 0; i < nodes.length; i++) {
            gScore[nodes[i].node] = Infinity;
            fScore[nodes[i].node] = Infinity;
        }
        
        gScore[startNodeId] = 0;
        fScore[startNodeId] = this.heuristic(startNode, endNode);
        
        var heap = new PF.Heap(function(a, b) {
            return a.f - b.f;
        });
        
        heap.push({ nodeId: startNodeId, f: fScore[startNodeId], g: 0 });
        
        var maxIterations = 10000;
        var iteration = 0;
        
        while (!heap.empty() && iteration < maxIterations) {
            iteration++;
            
            var current = heap.pop();
            var currentId = current.nodeId;
            var currentG = current.g;
            
            if (currentId === endNodeId) {
                return this.reconstructPath(cameFrom, currentId);
            }
            
            if (currentG > gScore[currentId]) {
                continue;
            }
            
            var neighbors = ignoreNotPass ? this.getNeighborsIgnoreNotPass(currentId) : this.getNeighbors(currentId);
            
            for (var i = 0; i < neighbors.length; i++) {
                var neighbor = neighbors[i];
                var neighborId = neighbor.nodeId;
                
                var tentativeG = gScore[currentId] + neighbor.distance;
                
                if (tentativeG < gScore[neighborId]) {
                    cameFrom[neighborId] = currentId;
                    gScore[neighborId] = tentativeG;
                    
                    var neighborIndex = nodeIndex[neighborId];
                    var neighborNode = neighborIndex !== undefined ? nodes[neighborIndex] : null;
                    
                    var h = neighborNode ? this.heuristic(neighborNode, endNode) : this.heuristic({x: 0, y: 0}, endNode);
                    fScore[neighborId] = tentativeG + h;
                    
                    heap.push({ nodeId: neighborId, f: fScore[neighborId], g: tentativeG });
                }
            }
        }
        
        return [];
    };
    
    this.bfs = function(startNodeId, ignoreNotPass) {
        var visited = new Set();
        var queue = [startNodeId];
        visited.add(startNodeId);
        
        while (queue.length > 0) {
            var current = queue.shift();
            var neighbors = ignoreNotPass ? this.getNeighborsIgnoreNotPass(current) : this.getNeighbors(current);
            
            for (var i = 0; i < neighbors.length; i++) {
                var neighborId = neighbors[i].nodeId;
                if (!visited.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push(neighborId);
                }
            }
        }
        
        return visited;
    };
    
    this.getNeighborsIgnoreNotPass = function(nodeId) {
        var neighbors = [];
        
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            
            if (edge.node2 < 0) continue;
            if (edge.node1 < 0) continue;
            
            if (edge.node1 === nodeId) {
                var neighborIndex = nodeIndex[edge.node2];
                if (neighborIndex !== undefined) {
                    neighbors.push({
                        nodeId: edge.node2,
                        distance: edge.nnlc || this.calculateDistance(edge.x1, edge.y1, edge.x2, edge.y2)
                    });
                }
            } else if (edge.node2 === nodeId) {
                var neighborIndex = nodeIndex[edge.node1];
                if (neighborIndex !== undefined) {
                    neighbors.push({
                        nodeId: edge.node1,
                        distance: edge.nnlc || this.calculateDistance(edge.x1, edge.y1, edge.x2, edge.y2)
                    });
                }
            }
        }
        
        return neighbors;
    };
    
    this.aStarIgnoreNotPass = function(startNodeId, endNodeId) {
        return this.dijkstra(startNodeId, endNodeId, true);
    };
    
    this.findBoundaryNodes = function(startNodeId, reachableSet) {
        var boundary = [];
        
        reachableSet.forEach(function(nodeId) {
            var neighbors = this.getNeighbors(nodeId);
            for (var i = 0; i < neighbors.length; i++) {
                if (!reachableSet.has(neighbors[i].nodeId)) {
                    if (boundary.indexOf(nodeId) === -1) {
                        boundary.push(nodeId);
                    }
                }
            }
        }.bind(this));
        
        return boundary;
    };

    this.heuristic = function(node1, node2) {
        var dx = node1.x - node2.x;
        var dy = node1.y - node2.y;
        return Math.sqrt(dx * dx + dy * dy) * 0.5;
    };
    
    this.findPath = function(fromStation, toStation) {
        this.init();
        
        var startNode = QZCWD_QVZ;
        var endNode = this.findNodeByNameOrCode(toStation);
        
        if (!endNode) {
            console.log("未找到终点站: " + toStation);
            return null;
        }
        
        var targetNodeId = endNode.node;
        var isMidStation = endNode.isMidStation || false;
        var midStationInfo = null;
        var path = [];
        
        if (isMidStation && endNode.node2 > 0) {
            midStationInfo = {
                zm: endNode.zm,
                lh: endNode.lh,
                x: endNode.x,
                y: endNode.y,
                node1: endNode.node1,
                node2: endNode.node2
            };
            
            var path1 = this.aStar(startNode.node, endNode.node1, false);
            var path2 = this.aStar(startNode.node, endNode.node2, false);
            var path1Ignore = this.aStar(startNode.node, endNode.node1, true);
            var path2Ignore = this.aStar(startNode.node, endNode.node2, true);
            
            var allPaths = [];
            if (path1.length > 0) allPaths.push({path: path1, dist: this.calculatePathDistance(path1), nodeId: endNode.node1});
            if (path2.length > 0) allPaths.push({path: path2, dist: this.calculatePathDistance(path2), nodeId: endNode.node2});
            if (path1Ignore.length > 0) allPaths.push({path: path1Ignore, dist: this.calculatePathDistance(path1Ignore), nodeId: endNode.node1});
            if (path2Ignore.length > 0) allPaths.push({path: path2Ignore, dist: this.calculatePathDistance(path2Ignore), nodeId: endNode.node2});
            
            if (allPaths.length === 0) {
                console.log("无法找到从 " + startNode.zm + " 到 " + toStation + " 的径路");
                return null;
            }
            
            allPaths.sort(function(a, b) { return a.dist - b.dist; });
            path = allPaths[0].path;
            targetNodeId = allPaths[0].nodeId;
        } else if (isMidStation && endNode.node2 <= 0) {
            midStationInfo = {
                zm: endNode.zm,
                lh: endNode.lh,
                x: endNode.x,
                y: endNode.y,
                node1: endNode.node1,
                node2: endNode.node2
            };
            
            var normalPath = this.aStar(startNode.node, targetNodeId, false);
            var ignorePath = this.aStar(startNode.node, targetNodeId, true);
            
            var paths = [];
            if (normalPath.length > 0) paths.push({path: normalPath, dist: this.calculatePathDistance(normalPath)});
            if (ignorePath.length > 0) paths.push({path: ignorePath, dist: this.calculatePathDistance(ignorePath)});
            
            if (paths.length === 0) {
                console.log("无法找到从 " + startNode.zm + " 到 " + toStation + " 的径路");
                return null;
            }
            
            paths.sort(function(a, b) { return a.dist - b.dist; });
            path = paths[0].path;
        } else {
            var normalPath = this.aStar(startNode.node, targetNodeId, false);
            var ignorePath = this.aStar(startNode.node, targetNodeId, true);
            
            var paths = [];
            if (normalPath.length > 0) paths.push({path: normalPath, dist: this.calculatePathDistance(normalPath)});
            if (ignorePath.length > 0) paths.push({path: ignorePath, dist: this.calculatePathDistance(ignorePath)});
            
            if (paths.length === 0) {
                console.log("无法找到从 " + startNode.zm + " 到 " + toStation + " 的径路");
                return null;
            }
            
            paths.sort(function(a, b) { return a.dist - b.dist; });
            path = paths[0].path;
        }
        
        return this.buildResult(path, startNode, endNode, midStationInfo);
    };

    this.getNeighbors = function(nodeId) {
        var neighbors = [];
        
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            
            if (edge.notPass !== "0") continue;
            if (edge.node2 < 0) continue;
            if (edge.node1 < 0) continue;
            
            if (edge.node1 === nodeId) {
                var neighborIndex = nodeIndex[edge.node2];
                if (neighborIndex !== undefined) {
                    neighbors.push({
                        nodeId: edge.node2,
                        distance: edge.nnlc || this.calculateDistance(edge.x1, edge.y1, edge.x2, edge.y2)
                    });
                } else {
                    console.log('getNeighbors: node ' + edge.node2 + ' not found in nodeIndex');
                }
            } else if (edge.node2 === nodeId) {
                var neighborIndex = nodeIndex[edge.node1];
                if (neighborIndex !== undefined) {
                    neighbors.push({
                        nodeId: edge.node1,
                        distance: edge.nnlc || this.calculateDistance(edge.x1, edge.y1, edge.x2, edge.y2)
                    });
                } else {
                    console.log('getNeighbors: node ' + edge.node1 + ' not found in nodeIndex');
                }
            }
        }
        
        return neighbors;
    };

    this.calculateDistance = function(x1, y1, x2, y2) {
        var dx = x1 - x2;
        var dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    };

    this.reconstructPath = function(cameFrom, current) {
        var path = [current];
        while (cameFrom[current] !== undefined) {
            current = cameFrom[current];
            path.unshift(current);
        }
        return path;
    };

    this.buildResult = function(nodeIds, startNode, endNode, midStationInfo) {
        var path = [];
        var totalDistance = 0;
        var fjz = [];
        var ljDistances = {};
        var previousLjdm = null;
        
        for (var i = 0; i < nodeIds.length; i++) {
            var nodeId = nodeIds[i];
            var index = nodeIndex[nodeId];
            if (index !== undefined) {
                var node = nodes[index];
                var ljdm = this.getLjdmFromFq(node.fq || 0);
                path.push({
                    id: node.id,
                    node: node.node,
                    lh: node.lh,
                    zm: node.zm,
                    x: node.x,
                    y: node.y,
                    ljdm: ljdm,
                    fq: node.fq || 0
                });
            }
        }
        
        if (midStationInfo) {
            var insertIndex = -1;
            
            for (var i = 0; i < path.length - 1; i++) {
                var currentNode = path[i];
                var nextNode = path[i+1];
                
                if ((currentNode.node === midStationInfo.node1 && nextNode.node === midStationInfo.node2) ||
                    (currentNode.node === midStationInfo.node2 && nextNode.node === midStationInfo.node1)) {
                    insertIndex = i + 1;
                    break;
                }
            }
            
            if (insertIndex !== -1) {
                path.splice(insertIndex, 0, {
                    id: null,
                    node: 0,
                    lh: null,
                    zm: null,
                    x: midStationInfo.x,
                    y: midStationInfo.y,
                    ljdm: 0,
                    fq: 0
                });
            } else {
                var lastNode = path[path.length - 1];
                if (lastNode.node === midStationInfo.node1 || lastNode.node === midStationInfo.node2) {
                    path.push({
                        id: null,
                        node: 0,
                        lh: null,
                        zm: null,
                        x: midStationInfo.x,
                        y: midStationInfo.y,
                        ljdm: 0,
                        fq: 0
                    });
                }
            }
        }
        
        for (var i = 0; i < path.length - 1; i++) {
            var edge = this.findEdge(path[i].node, path[i+1].node);
            if (edge && edge.nnlc) {
                totalDistance += edge.nnlc;
                
                var currentNodeFq = path[i].fq || 0;
                var currentLjdm = this.getLjdmFromFq(currentNodeFq);
                
                var currentNode = nodes[nodeIndex[path[i+1].node]];
                if (currentNode && this.isCustomFjzStation(currentNode.zm)) {
                    var isAlreadyFjz = fjz.some(function(f) { return f.id === currentNode.id; });
                    if (!isAlreadyFjz) {
                        fjz.push({
                            id: currentNode.id,
                            node1: 0,
                            node2: 0,
                            nnlc: 0,
                            lh: (currentNode.lh || "") + "\u0000",
                            zm: currentNode.zm || "",
                            ljdm: 0,
                            ljjc: null,
                            ljqc: null,
                            province: 0,
                            provincemc: null,
                            attribute: 0,
                            attributemc: null,
                            x: 0,
                            y: 0,
                            fq_dm: 0,
                            fq_jc: null,
                            sf_dm: 0,
                            sf_jc: null,
                            sf_qc: null,
                            pass: 1,
                            big_or_small: 1
                        });
                    }
                }
                
                if (currentLjdm && currentLjdm !== 0) {
                    ljDistances[currentLjdm] = (ljDistances[currentLjdm] || 0) + edge.nnlc;
                    previousLjdm = currentLjdm;
                }
            }
        }
        
        var ljArray = [];
        for (var ljdm in ljDistances) {
            if (ljDistances.hasOwnProperty(ljdm)) {
                ljArray.push({
                    lc: ljDistances[ljdm],
                    jc: this.getLjjcFromLjdm(parseInt(ljdm)) + "\u0000"
                });
            }
        }
        ljArray.sort(function(a, b) { return b.lc - a.lc; });
        
        var mainLjInfo = "";
        if (ljArray.length > 0) {
            mainLjInfo = ljArray[0].jc.replace("\u0000", "");
        }
        
        var startLjInfo = this.getFullLjInfo(startNode);
        var endLjInfo = this.getFullLjInfo(endNode);
        
        return {
            fz: {
                id: startNode.id,
                node1: startNode.node1 || startNode.node || 0,
                node2: 0,
                nnlc: 0,
                lh: startNode.lh,
                zm: startNode.zm,
                ljdm: startLjInfo.ljdm,
                ljjc: startLjInfo.ljjc,
                ljqc: startLjInfo.ljqc,
                province: 0,
                provincemc: null,
                attribute: 0,
                attributemc: null,
                x: startNode.x || 0,
                y: startNode.y || 0,
                fq_dm: startLjInfo.fq_dm,
                fq_jc: startLjInfo.fq_jc,
                sf_dm: 0,
                sf_jc: "",
                sf_qc: "",
                pass: 0,
                big_or_small: 0
            },
            dz: {
                id: midStationInfo ? (endNode.lh + endNode.node1 + (endNode.node2 || 0) + "C260201") : endNode.id,
                node1: endNode.node1 || endNode.node || 0,
                node2: endNode.node2 || 0,
                nnlc: 0,
                lh: endNode.lh,
                zm: endNode.zm,
                ljdm: endLjInfo.ljdm,
                ljjc: endLjInfo.ljjc,
                ljqc: endLjInfo.ljqc,
                province: 0,
                provincemc: null,
                attribute: 0,
                attributemc: null,
                x: endNode.x || 0,
                y: endNode.y || 0,
                fq_dm: endLjInfo.fq_dm,
                fq_jc: endLjInfo.fq_jc,
                sf_dm: 0,
                sf_jc: "",
                sf_qc: "",
                pass: 0,
                big_or_small: 0
            },
            lc: [totalDistance, totalDistance, totalDistance, totalDistance, 0, 0, 0],
            lj: ljArray.length > 0 ? ljArray : [{ lc: totalDistance, jc: mainLjInfo + "\u0000" }],
            path: path,
            fjz: fjz,
            zf: "",
            pos: 25372
        };
    };

    this.findEdge = function(node1, node2) {
        for (var i = 0; i < edges.length; i++) {
            var edge = edges[i];
            if ((edge.node1 === node1 && edge.node2 === node2) ||
                (edge.node1 === node2 && edge.node2 === node1)) {
                return edge;
            }
        }
        return null;
    };
    
    this.getMainLjInfo = function(path) {
        if (!path || path.length === 0) {
            return "";
        }
        
        var ljCounts = {};
        
        for (var i = 0; i < path.length - 1; i++) {
            var currentNode = path[i];
            var nextNode = path[i + 1];
            
            var edge = this.findEdge(currentNode.node, nextNode.node);
            if (edge && edge.nnlc > 0) {
                var ljdm = this.getLjdmFromNode(currentNode);
                if (ljdm && ljdm !== 0) {
                    ljCounts[ljdm] = (ljCounts[ljdm] || 0) + edge.nnlc;
                }
            }
        }
        
        var maxLjdm = 0;
        var maxCount = 0;
        for (var ljdm in ljCounts) {
            if (ljCounts.hasOwnProperty(ljdm)) {
                if (ljCounts[ljdm] > maxCount) {
                    maxCount = ljCounts[ljdm];
                    maxLjdm = ljdm;
                }
            }
        }
        
        return this.getLjjcFromLjdm(maxLjdm);
    };
    
    this.getLjdmFromNode = function(node) {
        var nodeData = nodes[nodeIndex[node.node]];
        if (nodeData && nodeData.ljdm) {
            return nodeData.ljdm;
        }
        return 0;
    };
    
    this.getLjdmFromFq = function(fq) {
        if (!fq || fq === 0) {
            return 0;
        }
        
        var ljdmMap = {
            1266: 12,
            1371: 13,
            1372: 13,
            1471: 22,
            1472: 22,
            1473: 22,
            1476: 20,
            1571: 14,
            1771: 18,
            1871: 19,
            1872: 13,
            1971: 24
        };
        
        for (var minFq in ljdmMap) {
            if (ljdmMap.hasOwnProperty(minFq)) {
                if (fq >= parseInt(minFq) && fq < parseInt(minFq) + 100) {
                    return ljdmMap[minFq];
                }
            }
        }
        
        if (fq >= 1200 && fq < 1300) return 12;
        if (fq >= 1300 && fq < 1400) return 13;
        if (fq >= 1400 && fq < 1500) return 22;
        if (fq >= 1500 && fq < 1600) return 14;
        if (fq >= 1600 && fq < 1700) return 26;
        if (fq >= 1700 && fq < 1800) return 18;
        if (fq >= 1800 && fq < 1900) return 19;
        if (fq >= 1900 && fq < 2000) return 24;
        
        return 0;
    };
    
    this.getLjjcFromLjdm = function(ljdm) {
        if (!ljdm || ljdm === 0) {
            return "";
        }
        
        var ljMap = {
            12: "广",
            13: "宁",
            14: "京",
            15: "沈",
            16: "哈",
            17: "济",
            18: "上",
            19: "广",
            20: "昆",
            21: "南",
            22: "成",
            23: "兰",
            24: "乌",
            25: "呼",
            26: "郑",
            27: "西"
        };
        
        return ljMap[ljdm] || "";
    };
    
    this.isMainStation = function(node) {
        if (!node) {
            return false;
        }
        
        if (node.big_or_small && node.big_or_small === 1) {
            return true;
        }
        
        var stationName = node.zm || "";
        var mainStationKeywords = ["东", "西", "南", "北", "站", "场", "口"];
        for (var i = 0; i < mainStationKeywords.length; i++) {
            if (stationName.indexOf(mainStationKeywords[i]) !== -1) {
                return true;
            }
        }
        
        return false;
    };
    
    this.getFullLjInfo = function(node) {
        if (!node) {
            return {
                ljdm: 0,
                ljjc: "",
                ljqc: "",
                fq_dm: 0,
                fq_jc: ""
            };
        }
        
        var fq = node.fq || 0;
        var ljdm = this.getLjdmFromFq(fq);
        var ljjc = this.getLjjcFromLjdm(ljdm);
        var ljqc = this.getLjqcFromLjdm(ljdm);
        var fq_jc = this.getFqjcFromFqdm(fq);
        
        return {
            ljdm: ljdm,
            ljjc: ljjc,
            ljqc: ljqc,
            fq_dm: fq,
            fq_jc: fq_jc
        };
    };
    
    this.getLjqcFromLjdm = function(ljdm) {
        if (!ljdm || ljdm === 0) {
            return "";
        }
        
        var ljqcMap = {
            12: "广州",
            13: "南宁",
            14: "北京",
            15: "沈阳",
            16: "哈尔滨",
            17: "济南",
            18: "上海",
            19: "广州",
            20: "昆明",
            21: "南昌",
            22: "成都",
            23: "兰州",
            24: "乌鲁木齐",
            25: "呼和浩特",
            26: "郑州",
            27: "西安"
        };
        
        return ljqcMap[ljdm] || "";
    };
    
    this.getFqjcFromFqdm = function(fq_dm) {
        if (!fq_dm || fq_dm === 0) {
            return "";
        }
        
        var fqMap = {
            1266: "广州",
            1371: "柳州",
            1372: "南宁",
            1471: "成都",
            1472: "重庆",
            1473: "贵阳",
            1476: "昆明",
            1571: "北京",
            1572: "太原",
            1671: "武汉",
            1771: "上海",
            1871: "广州",
            1872: "南宁",
            1971: "乌鲁木齐"
        };
        
        return fqMap[fq_dm] || "";
    };
}