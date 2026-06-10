function Search( ) {

    var loading_index;                          //转圈

    //查询车站
    this.findStation = findStation;
    function findStation()
    {
        //隐藏径路输入框
        $(".right_svg_jl").css("display", "none");
        setTimeout(function() {
            $("#station_input").focus();
        }, 500);
        map.clear();

        setPrompt("车站检索：");

        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/findStationPage", function(responseTxt, statusTxt, xhr){
            if (statusTxt == "success")
            {
                $("#searchModal").modal("show");
                renderStationTable();
                $("#find_station_button").click(function () {
                    if ($("#station_input").val() == "")
                    {
                        $("#station_input").focus();
                        return;
                    }
                    loading_index = layer.load(1);
                    var flag = $("input[type='radio'][name='optionradios']:checked").val();             //输入方式
                    $.ajax
                    ({
                        type : "GET",
                        url : "/findStation",
                        dataType : "",
                        data : {map_version : map_version,
                                flag        : flag,
                                input       : $("#station_input").val()},
                        beforeSend: function(request) {
                            request.setRequestHeader("Authorization", window.sessionStorage.token);
                        },
                        success : function(msg)
                        {
                            if (!msg)
                            {
                                map.setMsgInfo("登录超时，将返回主界面重新登录!");
                                setTimeout(function () {
                                    window.location.href = "/cljl";
                                }, 3000);
                            }
                            else
                                fillStationTable(msg);
                        },
                        error : function(errorMsg)
                        {
                            layer.close(loading_index);
                            map.setMsgInfo(errorMsg + '->findStation()失败');
                        }
                    });
                });

                $(".fixed-table-border").css("display","none");
                $("BODY").css("padding-right","0px");
            }
            else
                map.setMsgInfo('GetMidStationPage()失败');
        });

    }
    function  renderStationTable() {

        $("#id_table").bootstrapTable('destroy');
        $("#id_table").bootstrapTable({
            data:[],
            clickToSelect : true,
            striped : true,
            height : 280,
            columns:
                [{ field:'zm',           title:'站名' },
                 { field:'lh',           title:'电报码' },
                 { field:'id',           title:'id',    visible : false },
                 { field:'node2',        title:'node2', visible : false },
                 { field:'ljjc',         title:'路局' },
                 { field:'provincejc',   title:'省份' }],
        });
    }

    function fillStationTable (data) {

        $("#id_table").bootstrapTable('destroy');
        $("#id_table").bootstrapTable({
            data:data,
            clickToSelect : true,
            striped : true,
            height : 280,
            columns:
                [{ field:'zm',           title:'站名' },
                 { field:'lh',           title:'电报码' },
                 { field:'id',           title:'id', visible : false },
                 { field:'node2',        title:'node2', visible : false },
                 { field:'ljjc',         title:'路局' },
                 { field:'provincejc',   title:'省份' },
                 { field:'line_name',    title:'所在线路' }],
            onDblClickRow:function( row )
            {
                //图形定位
                locationStation( row.id, row.node2 )
            }
        });

        $(".fixed-table-border").css("display","none");
        $("#station_input").focus();
        layer.close(loading_index);

        setPrompt("双击条目可在图中定位->");
    }

    this.findLine = findLine;
    function findLine()
    {
        //隐藏径路输入框
        $(".right_svg_jl").css("display", "none");
        setTimeout(function() {
            $("#line_input").focus();
            }, 500);
        map.clear();

        setPrompt("查看路网数据：");

        $(".addparent-modal-panel").empty();
        //一定要回调
        $(".addparent-modal-panel").load("/findLinePage", function(responseTxt, statusTxt, xhr){
            if (statusTxt == "success")
            {
                $("#searchModal").modal("show");
                renderLineTable();
                $("#find_line_button").click(function () {
                    if ($("#line_input").val() == "")
                    {
                        $("#line_input").focus();
                        return;
                    }
                    loading_index = layer.load(1);
                    var flag = $("input[type='radio'][name='optionradios']:checked").val();             //输入方式
                    $.ajax
                    ({
                        type : "GET",
                        url : "/findLine",
                        dataType : "",
                        data : { map_version : map_version,
                                 flag        : flag,
                                 input       : $("#line_input").val()},
                        beforeSend: function(request) {
                            request.setRequestHeader("Authorization", window.sessionStorage.token);
                        },
                        success : function(msg)
                        {
                            if (!msg)
                            {
                                map.setMsgInfo("登录超时，将返回主界面重新登录!");
                                setTimeout(function () {
                                    window.location.href = "/cljl";
                                }, 3000);
                            }
                            else
                                fillLineTable(msg);
                        },
                        error : function(errorMsg)
                        {
                            layer.close(loading_index);
                            map.setMsgInfo(errorMsg + '->findLine()失败');
                        }
                    });
                });

                $(".fixed-table-border").css("display","none");
            }
            else
                map.setMsgInfo('GetMidStationPage()失败');
        });

    }

    function  renderLineTable() {

        $("#id_table").bootstrapTable('destroy');
        $("#id_table").bootstrapTable({
            data:[],
            clickToSelect : true,
            striped : true,
            height : 260,
            columns:
                [{ field:'zm',           title:'站名' },
                    { field:'lh',           title:'电报码' },
                    { field:'id',           title:'id',    visible : false },
                    { field:'node2',        title:'node2', visible : false },
                    { field:'ljjc',         title:'路局' },
                    { field:'provincejc',   title:'省份' }],
            striped : true
        });
    }

    function fillLineTable (data) {

        $("#id_table").bootstrapTable('destroy');
        $("#id_table").bootstrapTable({
            data:data,
            clickToSelect : true,
            striped : true,
            height : 260,
            columns:
                [{ field:'seq',           title:'线号' },
                    { field:'mc',           title:'名称' },
                    { field:'id',           title:'id', visible : false }],
            striped : true,
            onDblClickRow:function( row )
            {
                //渲染及图形定位
                RenderLine( row.seq );
            }
        });

        $(".fixed-table-border").css("display","none");
        layer.close(loading_index);
        setPrompt("双击条目可在图中定位->");
    }

    function locationStation( id, node2 )
    {
        try {
            $("#searchModal").modal('hide');
        } catch(e) {
            // 忽略模态框隐藏错误（没有引入 Bootstrap）
        }
        
        var dom = d3.select("#" + id);
        
        if (dom.empty() && node2 > 0) {
            var parts = id.split("C");
            if (parts.length == 2) {
                var nodePart = parts[1];
                var version = nodePart.slice(-7);
                var nodes = nodePart.slice(0, -7);
                var node1 = nodes.slice(0, -4);
                var node2val = nodes.slice(-4);
                
                var reverseId = "C" + node2val + node1 + version;
                dom = d3.select("#" + reverseId);
            }
        }
        
        if (dom.empty()) {
            return;
        }
        
        var px = 0;
        var py = 0;

        //定位
        if (node2 == 0 || node2 == -1)
        {
            px = parseInt(dom.attr("cx"));
            py = parseInt(dom.attr("cy"));
        }
        else
        {
            px = ( parseInt(dom.attr("x1")) + parseInt(dom.attr("x2")) )/2;
            py = ( parseInt(dom.attr("y1")) + parseInt(dom.attr("y2")) )/2;
        }

        var transform = d3.zoomTransform('svg');
        transform.k = 8;
        transform.x = -px*transform.k;
        transform.y = -py*transform.k;

        //定位
        map.transformDom( transform );

        if (node2 == 0)
        {
            d3.select(".mapGroup").append("circle")
                .attr("class", "ripple1")
                .attr("cx", px)
                .attr("cy", py)
                .style("r", 0.5)
                .style("fill", "#f37b1d");
            d3.select(".mapGroup").append("circle")
                .attr("class", "ripple2")
                .attr("cx", px)
                .attr("cy", py)
                .style("r", 0.5)
                .style("fill", "#fbbd08");
            d3.select(".mapGroup").append("circle")
                .attr("class", "ripple3")
                .attr("cx", px)
                .attr("cy", py)
                .style("r", 0.5)
                .style("fill", "#ffff00");

            d3.select(".ripple1")
                .style("animation",`ripple-effect2  0.5s linear`)
                .style("animationend", removeElements);
            d3.select(".ripple2")
                .style("animation",`ripple-effect2  1.0s linear`)
                .style("animationend", removeElements);
            d3.select(".ripple3")
                .style("animation",`ripple-effect2  1.5s linear`)
                .style("animationend", removeElements);

            function removeElements() {
                d3.select(".svg_map").selectAll(".ripple1")
                    .transition()
                    .duration(500)
                    .remove();
                d3.select(".svg_map").selectAll(".ripple2")
                    .transition()
                    .duration(1000)
                    .remove();
                d3.select(".svg_map").selectAll(".ripple3")
                    .transition()
                    .duration(1500)
                    .remove();
            }
        }
        else
        {
            //涟漪
            var x1 = parseFloat(dom.attr("x1"));
            var y1 = parseFloat(dom.attr("y1"));
            var x2 = parseFloat(dom.attr("x2"));
            var y2 = parseFloat(dom.attr("y2"));
            var mid_x = (x1 + x2)/2;
            var mid_y = (y1 + y2)/2;

            d3.select(".mapGroup").append("circle")
                .attr("class", "ripple1")
                .attr("cx", mid_x)
                .attr("cy", mid_y)
                .style("r", 0.5)
                .style("fill", "#f37b1d");
            d3.select(".mapGroup").append("circle")
                .attr("class", "ripple2")
                .attr("cx", mid_x)
                .attr("cy", mid_y)
                .style("r", 0.5)
                .style("fill", "#fbbd08");
            d3.select(".mapGroup").append("circle")
                .attr("class", "ripple3")
                .attr("cx", mid_x)
                .attr("cy", mid_y)
                .style("r", 0.5)
                .style("fill", "#ffff00");

            d3.select(".ripple1")
                .style("animation",`ripple-effect2  0.5s linear`)
                .style("animationend", removeElements);
            d3.select(".ripple2")
                .style("animation",`ripple-effect2  1.0s linear`)
                .style("animationend", removeElements);
            d3.select(".ripple3")
                .style("animation",`ripple-effect2  1.5s linear`)
                .style("animationend", removeElements);

            function removeElements() {
                d3.select(".svg_map").selectAll(".ripple1")
                    .transition()
                    .duration(500)
                    .remove();
                d3.select(".svg_map").selectAll(".ripple2")
                    .transition()
                    .duration(1000)
                    .remove();
                d3.select(".svg_map").selectAll(".ripple3")
                    .transition()
                    .duration(1500)
                    .remove();
            }
        }
        setPrompt("车站检索：");
    }

    function RenderLine( seq )
    {
        $("#searchModal").modal('hide');
        $.ajax
        ({
            type : "GET",
            url : "/findLineInfo",
            dataType : "",
            data : { map_version : map_version,
                     flag        : $("input[type='radio'][name='optionradios']:checked").val(),
                     seq         : seq},
            beforeSend: function(request) {
                request.setRequestHeader("Authorization", window.sessionStorage.token);
            },
            success : function(msg)
            {
                if (!msg)
                {
                    map.setMsgInfo("登录超时，将返回主界面重新登录!");
                    setTimeout(function () {
                        window.location.href = "/cljl";
                    }, 3000);
                }
                else
                {
                    var x_array = [];
                    var y_array = [];

                    d3.selectAll(".map_circle").style("fill", "#FFF");
                    d3.selectAll(".map_line").style("stroke", "#FFF");

                    d3.selectAll(".map_circle").each(function( t )
                    {
                        var id = d3.select(this).attr("id");
                        var node = d3.select(this);
                        $.each(msg, function( i, obj )
                        {
                            if (id == obj)
                            {
                                node.style("fill", "#FE4B4B");
                                x_array.push( parseInt(node.attr("cx")) );
                                y_array.push( parseInt(node.attr("cy")) );
                            }
                        });
                    });

                    d3.selectAll(".map_line").each(function( t )
                    {
                        var id = d3.select(this).attr("id");
                        var line = d3.select(this);
                        $.each(msg, function( i, obj )
                        {
                            if (id == obj)
                            {
                                line.style("stroke", "#FE4B4B");
                                x_array.push( parseInt(line.attr("x1")) );
                                x_array.push( parseInt(line.attr("x2")) );
                                y_array.push( parseInt(line.attr("y1")) );
                                y_array.push( parseInt(line.attr("y2")) );
                            }
                        });
                    });

                    //定位
                    locationLine(d3.min(x_array),
                        d3.min(y_array),
                        d3.max(x_array),
                        d3.max(y_array));

                    setPrompt("线路检索：");
                }
            },
            error : function(errorMsg)
            {
                setPrompt("线路检索：");
                map.setMsgInfo(errorMsg+'->findLineInfo()失败');
            }
        });
    }

    function locationLine(minx, miny, maxx, maxy)
    {
        var px = (minx + maxx)/2;
        var py = (miny + maxy)/2;
        var transform = d3.zoomTransform('svg');
        transform.k = Math.min(map_width*0.7/(maxx - minx), map_height*0.7/(maxy - miny));
        if (transform.k > 18)               //缩放最大比列
            transform.k = 18;
        transform.x = -px*transform.k;
        transform.y = -py*transform.k;

        //定位
        map.transformDom( transform );
    }

    function setPrompt( prompt ) {
        $(".right_svg_prompt").html(prompt);
    }

    this.searchStationByName = searchStationByName;
    this.drawMidStation = drawMidStation;
    this.locationStationByCoord = locationStationByCoord;
    
    function drawMidStation(station) {
        d3.selectAll(".search_mid_station").remove();
        
        if (typeof map.drawSingleMidStation === 'function') {
            map.drawSingleMidStation(station);
        } else {
            d3.select(".mapGroup").append("circle")
                .attr("class", "mid_station_node search_mid_station")
                .attr("id", station.id)
                .attr("cx", station.x)
                .attr("cy", station.y)
                .attr("lj", parseInt(station.fq/100))
                .style("fill", lj_color_list[parseInt(station.fq/100)])
                .style("r", 4);
            
            d3.select(".mapGroup").append("text")
                .attr("class", "mid_station_text search_mid_station")
                .attr("x", station.x)
                .attr("y", station.y)
                .attr("id", station.id)
                .text(station.zm);
        }
    }
    
    function locationStationByCoord(x, y) {
        var transform = d3.zoomTransform('svg');
        transform.k = 8;
        transform.x = -x * transform.k;
        transform.y = -y * transform.k;
        
        map.transformDom(transform);
        
        d3.select(".mapGroup").append("circle")
            .attr("class", "ripple1")
            .attr("cx", x)
            .attr("cy", y)
            .style("r", 0.5)
            .style("fill", "#f37b1d");
        d3.select(".mapGroup").append("circle")
            .attr("class", "ripple2")
            .attr("cx", x)
            .attr("cy", y)
            .style("r", 0.5)
            .style("fill", "#fbbd08");
        d3.select(".mapGroup").append("circle")
            .attr("class", "ripple3")
            .attr("cx", x)
            .attr("cy", y)
            .style("r", 0.5)
            .style("fill", "#ffff00");

        d3.select(".ripple1")
            .style("animation",`ripple-effect2  0.5s linear`)
            .style("animationend", removeElements);
        d3.select(".ripple2")
            .style("animation",`ripple-effect2  1.0s linear`)
            .style("animationend", removeElements);
        d3.select(".ripple3")
            .style("animation",`ripple-effect2  1.5s linear`)
            .style("animationend", removeElements);

        function removeElements() {
            d3.select(".svg_map").selectAll(".ripple1")
                .transition()
                .duration(500)
                .remove();
            d3.select(".svg_map").selectAll(".ripple2")
                .transition()
                .duration(1000)
                .remove();
            d3.select(".svg_map").selectAll(".ripple3")
                .transition()
                .duration(1500)
                .remove();
        }
    }
    function searchStationByName(stationName) {
        if (!stationName || stationName.trim() === "") {
            return null;
        }
        
        var searchName = stationName.trim();
        var searchNameLower = searchName.toLowerCase();
        var found = false;
        var results = [];
        var foundStation = null;
        
        if (window.getMapDftPoint) {
            for (var idx = 0; idx < window.getMapDftPoint.length; idx++) {
                var node = window.getMapDftPoint[idx];
                if (node.zm === searchName || node.lh === searchName.toUpperCase()) {
                    var dndNode = null;
                    if (window.getMapDndPoint) {
                        dndNode = window.getMapDndPoint.find(function(n) {
                            return n.node === node.node1 || n.lh === node.lh;
                        });
                    }
                    var stationId = dndNode ? dndNode.id : node.id;
                    var stationX = dndNode ? dndNode.x : node.x;
                    var stationY = dndNode ? dndNode.y : node.y;
                    var stationFq = dndNode ? dndNode.fq : 0;
                    
                    locationStation(stationId, node.node2);
                    setPrompt("定位到: " + node.zm + " (" + node.lh + ")");
                    found = true;
                    foundStation = {
                        id: stationId,
                        node: node.node1,
                        node1: node.node1,
                        node2: node.node2,
                        zm: node.zm,
                        lh: node.lh,
                        x: stationX,
                        y: stationY,
                        fq: stationFq,
                        isMidStation: false
                    };
                    return foundStation;
                }
            }
        }
        
        if (window.getMapDndPoint) {
            for (var idx = 0; idx < window.getMapDndPoint.length; idx++) {
                var node = window.getMapDndPoint[idx];
                if (node.lh === searchName.toUpperCase()) {
                    locationStation(node.id, 0);
                    setPrompt("定位到: " + (node.zm || node.lh) + " (" + node.lh + ")");
                    found = true;
                    foundStation = {
                        id: node.id,
                        node: node.node,
                        node1: node.node,
                        node2: 0,
                        zm: node.zm || node.lh,
                        lh: node.lh,
                        x: node.x,
                        y: node.y,
                        fq: node.fq,
                        isMidStation: false
                    };
                    return foundStation;
                }
            }
        }
        
        if (!window.中间站数据) {
            return null;
        }
        
        for (var key in window.中间站数据) {
            var stations = window.中间站数据[key];
            if (!stations || stations.length === 0) continue;
            
            for (var i = 0; i < stations.length; i++) {
                var station = stations[i];
                if (!station || !station.zm) continue;
                
                var zmLower = station.zm.toLowerCase();
                var lhLower = station.lh ? station.lh.toLowerCase() : "";
                
                if (zmLower === searchNameLower || lhLower === searchNameLower) {
                    var mapId = "C" + station.node1 + map_version;
                    if (station.node2 >= 0) {
                        mapId = "C" + station.node1 + station.node2 + map_version;
                    }
                    
                    var testDom = d3.select("#" + mapId);
                    if (!testDom.empty()) {
                        var cx = testDom.attr("cx");
                        if (cx !== null && cx !== "NaN") {
                            if (!found) {
                                locationStation(mapId, station.node2);
                                setPrompt("定位到中间站: " + station.zm + " (" + station.lh + ")");
                                found = true;
                                foundStation = {
                                    id: mapId,
                                    node: station.node1,
                                    node1: station.node1,
                                    node2: station.node2,
                                    zm: station.zm,
                                    lh: station.lh,
                                    x: parseFloat(cx),
                                    y: parseFloat(testDom.attr("cy")),
                                    fq: station.fq,
                                    isMidStation: true
                                };
                            }
                        }
                    } else if (station.node2 > 0) {
                        var reverseId = "C" + station.node2 + station.node1 + map_version;
                        testDom = d3.select("#" + reverseId);
                        if (!testDom.empty()) {
                            if (!found) {
                                locationStation(reverseId, station.node2);
                                setPrompt("定位到中间站: " + station.zm + " (" + station.lh + ")");
                                found = true;
                                foundStation = {
                                    id: reverseId,
                                    node: station.node2,
                                    node1: station.node1,
                                    node2: station.node2,
                                    zm: station.zm,
                                    lh: station.lh,
                                    x: parseFloat(testDom.attr("cx")),
                                    y: parseFloat(testDom.attr("cy")),
                                    fq: station.fq,
                                    isMidStation: true
                                };
                            }
                        }
                    }
                    
                    if (!found && station.x !== undefined && station.y !== undefined) {
                        drawMidStation(station);
                        locationStationByCoord(station.x, station.y);
                        setPrompt("定位到中间站: " + station.zm + " (" + station.lh + ")");
                        found = true;
                        foundStation = {
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
                    
                    results.push(station.zm + " (" + station.lh + ")");
                }
            }
        }
        
        if (!found) {
            setPrompt("未找到车站: " + searchName + ", 请尝试使用电报码或检查车站名称是否正确");
        } else if (results.length > 1) {
            setPrompt("找到多个匹配结果: " + results.join(", "));
        }
        
        return foundStation;
    }
}