function Map(height, width)
{
    var map_nodes           = null;
    var zoom                = null;
    var group               = null;
    var transform           = {};
    var loading_index;                          //转圈
    var scale;                                  //比例
    var circle_r            = 2.0;              //初始圆半径
    var line_stroke_width   = 0.8;              //初始线宽
    var path_stroke_width   = 1.0;              //初始PATH线宽
    var font_size           = 1.2;              //初始字体大小
    var mid_font_size       = 0.9;              //中间站初始字体大小

    var current_circle_r;                       //当前圆半径
    var current_mid_circle_r;                   //当前中间站圆半径
    var current_line_stroke_width;              //当前线宽
    var current_path_stroke_width;              //当前线宽

    var transform_k_svg = 1;                    //svg当前缩放比例scale
    var mousedown_flag = false;                 //用于拖拽svg时鼠标手势的变化,检测鼠标是否为按下状态

    var current_ljh = 0;
    this.clear = clear;
    function clear()
    {
        jl.clear();
        jlRing.clear();
        jlScope.clear();
        flew.clear();
        d3.selectAll(".mid_station_node").remove();
        d3.selectAll(".mid_station_text").remove();
    }

    this.createMap = createMap;
    function createMap(e)
    {
        setPrompt("路局显示->");
        loading_index = layer.load(1);
        var svg = d3.select("svg")
                    .attr("width",  width)
                    .attr("height", height)
                    .attr("viewBox",  + "" + (-map_width/2) + " " + (-map_height/2) + " " + map_width + " " + map_height)

        //鼠标按下鼠标手势变为grabbing
        svg.on("mousedown", function () {
            mousedown_flag = true;
            d3.select('.svg_map').style('cursor','grabbing');
        })
        svg.on("mousemove", function () {
            if (mousedown_flag){
                d3.select('.svg_map').style('cursor','grab');
                mousedown_flag = false;
            }
        })
        svg.on("mouseup", function () {
            d3.select('.svg_map').style('cursor','grab');
        })

        scale = Math.sqrt(map_width * map_width + map_height * map_height) / Math.sqrt(width * width + height * height);
        zoom = d3.zoom()
                 .scaleExtent([1,100])							        //用于设置最小和最大的缩放比例
                 .on("zoom", zoomed)

        d3.select(".svg_map").call(zoom)
                        .on("dblclick.zoom", null)							//取消双击ZOOM
                        .on("dblclick", svgDbclick) 					    //改为图形还原

        //创建GROUP
        group = svg.append("g");
        group.attr("class", "mapGroup");

        //获得站名信息
        getMapFontPoint();

        //获得线信息
        getMapLinePoint();

        //获得节点信息
        getMapNodePoint();
    }

    //获得站名的坐标
    function getMapFontPoint( )
    {
        $.ajax
        ({
            type : "GET",
            url : "/getMapDftPoint",
            dataType : "",
            data : {map_version : map_version},
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
                    drawMapFont( msg );
                }

            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo(errorMsg + ' -> GetMapFont()失败');
            }
        });
    }
    //站名铺画
    function drawMapFont( fonts )
    {
        var text = d3.select("g").selectAll("text")
            .data(fonts)
            .enter()
            .append("text")
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; })
            .text(function(d) { return d.zm;})
            .attr("text-anchor", (d,i) => {
                if (d.angle == 90)
                    return "middle";
                else
                    return "middle";
            })
            .attr('transform', function(d, i) { return 'rotate(' + (d.angle) + ' ' + (d.x) + ',' + (d.y) + ')' })
            .attr('rotate', (d,i) => {
                if (d.angle == 90)
                    return -90;
                else
                    return 0;
            })
            .attr("id", function(d) { return d.id; })
            .attr("class", "map_text")
            .style("font-size", font_size * scale)
            .attr("dx", (d,i) => {
                if (d.angle == 90)
                    return "3";
                else
                    return 1.75;
            })
            .attr("dy", (d,i) => {
                if (d.angle == 90)
                    return "1.25";
                else
                    return 1.25;
            })
            .on("mouseover", function(){ d3.select(this).style("font-size", font_size * scale * 1.2); })
            .on("mouseout",  function(){ d3.select(this).style("font-size", font_size * scale); });
    }
    //获得线段的坐标
    function getMapLinePoint( )
    {
        $.ajax
        ({
            type : "GET",
            url : "/getMapDlnPoint",
            dataType : "",
            data : {map_version : map_version},
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
                    drawMapLine( msg );
                }

            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo(errorMsg + ' -> getMapLinePoint()失败');
            }
        });
    }

    function drawMapLine( lines )
    {
        //线段铺画
        current_line_stroke_width = line_stroke_width * scale;
        var line = d3.select("g").selectAll("line")
            .data(lines)
            .enter()
            .append("line")
            .attr("x1", function(d) { return d.x1; })
            .attr("y1", function(d) { return d.y1; })
            .attr("x2", function(d) { return d.x2; })
            .attr("y2", function(d) { return d.y2; })
            .attr("id", function(d) { return d.id; })
            .attr("lj", function(d){ return parseInt(d.fq/100); })
            .style("stroke", function(d){ return lj_color_list[parseInt(d.fq/100)]; })
            .style("stroke-width", function(){ return current_line_stroke_width; })
            .attr("class", "map_line")
            .on("click", getSegmentInfo)
            .on("mouseover", function(){ d3.select(this).style("stroke-width", current_line_stroke_width * 1.5); })
            .on("mouseout",  function(){ d3.select(this).style("stroke-width", current_line_stroke_width); });

        //铺画 NODE
        drawMapNode( map_nodes );

        //获得线路车站信息
        //GetMapLineStation( group );
    }
    //获得节点坐标
    function getMapNodePoint( )
    {
        $.ajax
        ({
            type : "GET",
            url : "/getMapDndPoint",
            dataType : "",
            data : {map_version : map_version},
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
                    map_nodes =  msg;
                }

            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo(errorMsg + ' -> GetMapNode()失败');
                map_nodes = null;
            }
        });
    }
    function drawMapNode( nodes )
    {
        //圆铺画
        current_circle_r = circle_r * scale;
        var circle = d3.select("g").selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("id", function(d) { return d.id; })
            .attr("lj", function(d){ return parseInt(d.fq/100); })
            .style("fill", function(d){ return lj_color_list[parseInt(d.fq/100)]; })
            .attr("class", "map_circle")
            .style("r", current_circle_r)
            .on("click", getNodeInfo)
            .on("mouseover", function(){ d3.select(this).style("r", current_circle_r * 1.3); })
            .on("mouseout",  function(){ d3.select(this).style("r", current_circle_r); });

        layer.close(loading_index);
    }

    //缩放
    this.zoomed = zoomed;
    function zoomed()
    {
        d3.selectAll("g").attr("transform",	d3.event.transform);
        transform.x = d3.event.transform.x;
        transform.y = d3.event.transform.y;
        transform.k = d3.event.transform.k;

        transform_x_svg = transform.x;
        transform_y_svg = transform.y;
        transform_k_svg = transform.k;

        //动态变化圆点大小
        if (transform.k <= 5)
        {
            current_circle_r = circle_r * scale;
            current_mid_circle_r = circle_r * scale * 0.65;
            d3.selectAll(".map_circle").style("r", current_circle_r );
            d3.selectAll(".mid_station_node").style("r", current_mid_circle_r );
        }
        else if (transform.k > 5 && transform.k < 10)
        {
            current_circle_r = circle_r * scale * 0.8;
            current_mid_circle_r = circle_r * scale * 0.52;
            d3.selectAll(".map_circle").style("r", current_circle_r );
            d3.selectAll(".mid_station_node").style("r", current_mid_circle_r );
        }
        else if (transform.k >= 10 && transform.k < 20)
        {
            current_circle_r = circle_r * scale * 0.65;
            current_mid_circle_r = circle_r * scale * 0.4225;
            d3.selectAll(".map_circle").style("r", current_circle_r );
            d3.selectAll(".mid_station_node").style("r", current_mid_circle_r );
        }
        else
        {
            current_circle_r = circle_r * scale * 0.4;
            current_mid_circle_r = circle_r * scale * 0.26;
            d3.selectAll(".map_circle").style("r", current_circle_r );
            d3.selectAll(".mid_station_node").style("r", current_mid_circle_r );
        }

        //动态变换线宽度
        if (transform.k <= 5)
        {
            current_line_stroke_width = line_stroke_width * scale;
            d3.selectAll(".map_line").style("stroke-width", current_line_stroke_width);

            current_path_stroke_width = path_stroke_width * scale;
            d3.selectAll(".map_path").style("stroke-width", current_path_stroke_width);
        }
        else if (transform.k > 5 && transform.k < 10)
        {
            current_line_stroke_width = line_stroke_width * scale * 0.8;
            d3.selectAll(".map_line").style("stroke-width", current_line_stroke_width);

            current_path_stroke_width = path_stroke_width * scale * 0.8;
            d3.selectAll(".map_path").style("stroke-width", current_path_stroke_width);
        }
        else if (transform.k >= 10 && transform.k < 20)
        {
            current_line_stroke_width = line_stroke_width * scale * 0.7;
            d3.selectAll(".map_line").style("stroke-width", current_line_stroke_width);

            current_path_stroke_width = path_stroke_width * scale * 0.7;
            d3.selectAll(".map_path").style("stroke-width", current_path_stroke_width);
        }
        else
        {
            current_line_stroke_width = line_stroke_width * scale * 0.6;
            d3.selectAll(".map_line").style("stroke-width", current_line_stroke_width);

            current_path_stroke_width = path_stroke_width * scale * 0.6;
            d3.selectAll(".map_path").style("stroke-width", current_path_stroke_width);
        }
    }
    //还原图形
    function svgDbclick()
    {
        var transform = d3.zoomIdentity;
        transform.x = 0;
        transform.y = 0;
        transform.k = 1;
        //d3.select("svg").transition().duration(500).call( zoom.transform, transform );
        d3.select("svg").call( zoom.transform, transform );
    }

    //坐标转换
    function corrdinateTransX(x)
    {
        return ( width/2 ) - ( ( map_width * height / map_height ) / 2) + (x * height / map_height );
    }

    //坐标转换
    function corrdinateTransY(y)
    {
        return y * height / map_height;
    }

    //获得点击距离远近
    this.getClickDistence = getClickDistence;
    function getClickDistence( dom )
    {
        var x1 = parseFloat( dom.getAttribute("x1") );
        var y1 = parseFloat( dom.getAttribute("y1") );
        var x2 = parseFloat( dom.getAttribute("x2") );
        var y2 = parseFloat( dom.getAttribute("y2") );
        var s_point = d3.mouse( dom );
        var x = parseFloat( s_point[0] );
        var y = parseFloat( s_point[1] );
        var d1 = Math.sqrt((x1 - x)*(x1 - x) + (y1 - y)*(y1 - y));
        var d2 = Math.sqrt((x2 - x)*(x2 - x) + (y2 - y)*(y2 - y));

        if (d1 > d2)
            return 2;
        else
            return 1;
    }

    this.getSegmentInfo = getSegmentInfo;
    function getSegmentInfo( )
    {
        loading_index = layer.load(1);
        //获得距离
        var flag = getClickDistence( this );
        var id   = this.getAttribute("id");

        //删除模态框
        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/getSegmentPage", function(responseTxt, statusTxt, xhr){
            if (statusTxt == "success")
            {
                $("#segmentModal").modal("show");
                $("#id_table").bootstrapTable('destroy');
                $("#id_table").bootstrapTable({
                    url:"/getSegment?map_version=" + getMapVersion() + "&id=" + id + "&flag="+ flag,
                    responseHandler: responseHandler,
                    clickToSelect : true,
                    striped : true,
                    height : 260,
                    columns:
                        [{ field:'zm',        title:'站名' },
                         { field:'lh',        title:'电报码' },
                         { field:'lc',        title:'里程' },
                         { field:'ljjc',      title:'路局' },
                         { field:'provincejc',title:'省份' }],
                    rowStyle: function (row, index) {
                        var style = {};
                        if (index % 2 === 0)
                        {//偶数行
                            style = {css:{'background-color':'#F0F0F0'}};
                        }
                        else
                        {//奇数行
                            style = {css:{'background-color':'#FFFFFF'}};
                        }
                        return style;
                    }//隔行变色
                });

                $(".fixed-table-border").css("display","none");
            }
            else
            {
                layer.close(loading_index);
                setMsgInfo('getSegmentPage()失败');
            }
        });

    }

    function responseHandler( res )
    {
        $("#segmentModalTitle").text( res.title );

        //设置线路信息
        $("#input_lc").val(res.line.nnlc + "公里");
        $("#input_xl").val(res.line.railwaymc + "(" + res.line.railway + ")");
        // $("#input_fq").val(res.line.fqmc + "(" + res.line.fq + ")");
        if (res.line.attribute == 0)
            $("#input_sx").val("");
        else
            $("#input_sx").val(res.line.attributemc + "(" + res.line.attribute + ")");
        // $("#input_lj").val(res.line.ljjc + "(" + parseInt(res.line.fq/100) + ")");
        // $("#input_sf").val(res.line.provincemc + "(" + res.line.province + ")");
        $("#input_qylx").val(res.line.tractionmc);
        $("#input_xldj").val(res.line.llevelmc);
        $("#input_dfx").val(res.line.singlemc);
        layer.close(loading_index);
        return {
            "total"  : res.stations.length,
            "rows" : res.stations
        }

    }

    this.getNodeInfo = getNodeInfo;
    function getNodeInfo()
    {
        loading_index = layer.load(1);
        var id   = this.getAttribute("id");

        //清空内容
        $("#input_zm").val("");
        $("#input_lh").val("");
        $("#input_fq").val("");
        $("#input_sx").val("");
        $("#input_lj").val("");
        $("#input_sf").val("");
        $("#input_xl").val("");
        $("#nodeModalTitle").text("");

        //删除模态框
        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/getNodePage", function(responseTxt, statusTxt, xhr)
        {
            if (statusTxt == "success")
            {
                $("#nodeModal").modal("show");
                $.ajax
                ({
                    type : "GET",
                    url : "/getNode",
                    dataType : "",
                    data : {map_version : map_version, id : id},
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
                            $("#input_zm").val(msg.zm);
                            $("#input_lh").val(msg.lh);
                            $("#input_fq").val(msg.fqmc + "(" + msg.fq + ")");
                            $("#input_sx").val(msg.attributemc + "(" + msg.attribute + ")");
                            $("#input_lj").val(msg.ljjc + "(" + parseInt(msg.fq/100) + ")");
                            $("#input_sf").val(msg.provincejc + "(" + msg.province + ")");
                            $("#input_xl").val(msg.railwaymc + "(" + msg.railway + ")");
                            $("#nodeModalTitle").text( "节点信息：" + msg.zm + "(" + msg.node +")" );
                            layer.close(loading_index);
                        }

                    },
                    error : function(errorMsg)
                    {
                        layer.close(loading_index);
                        setMsgInfo('getNode()失败:' + errorMsg);
                    }
                });
                $(".fixed-table-border").css("display","none");
            }
            else
                setMsgInfo('getNodePage()失败');
        });
    }

    //获得Map颜色
    this.getMapColor = getMapColor;
    function getMapColor( flag )
    {
        loading_index = layer.load(1);

        //隐藏径路输入框
        $(".right_svg_jl").css("display", "none");
        clear();

        if (flag == 1)
            setPrompt("路局显示->");
        else if (flag == 2)
            setPrompt("分区显示->");
        else if (flag == 3)
            setPrompt("省份显示->");
        else if (flag == 4)
            setPrompt("线路显示->");
        else if (flag == 5)
            setPrompt("合资地方铁路显示->");
        else if (flag == 9)
            setPrompt("线路等级显示->");
        else if (flag == 10)
            setPrompt("牵引类型显示->");
        else if (flag == 11)
            setPrompt("单复线显示->");
        else if (flag == 12)
            setPrompt("本线到发线路显示->");

        //节点挂函数
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_circle").on("click", getNodeInfo);

        //线段挂函数
        d3.selectAll(".map_line").on("click", null);
        d3.selectAll(".map_line").on("click", getSegmentInfo);

        $.ajax
        ({
            type : "GET",
            url : "/getMapColor",
            dataType : "",
            data : {map_version : map_version, flag : flag, layer : 0},
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
                    drawMapColor( msg );
                }

            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo('GetMapColor()失败' + errorMsg);
            }
        });
    }

    function drawMapColor( msg )
    {
        d3.selectAll(".map_circle").style("fill", "#FFF");
        d3.selectAll(".map_line").style("stroke", "#FFF");

        d3.selectAll(".map_circle").each(function( t )
        {
            var id = d3.select(this).attr("id");
            var node = d3.select(this);
            $.each(msg, function( i, obj )
            {
                if (id == obj.id)
                    node.style("fill", obj.color);
            });
        });

        d3.selectAll(".map_line").each(function( t )
        {
            var id = d3.select(this).attr("id");
            var node = d3.select(this);
            $.each(msg, function( i, obj )
            {
                if (id == obj.id)
                    node.style("stroke", obj.color);
            });
        });
        layer.close(loading_index);
    }

    //通过路局属性渲染节点线段
    this.drawMapColorByLj = drawMapColorByLj;
    function drawMapColorByLj()
    {
        d3.selectAll(".map_circle").each(function( )
        {
            var lj = d3.select(this).attr("lj");
            d3.select(this).style("fill", function(){ return lj_color_list[lj]; });
        });

        d3.selectAll(".map_line").each(function( )
        {
            var lj = d3.select(this).attr("lj");
            d3.select(this).style("stroke", function(){ return lj_color_list[lj]; });
        });
    }

    //获得数据版本
    this.getMapVersion = getMapVersion;
    function getMapVersion()
    {
        return map_version;
    }

    //获得ZOOM
    this.getMapZoom = getMapZoom;
    function getMapZoom()
    {
        return zoom;
    }

    //获得Group
    this.getGroup = getGroup;
    function getGroup()
    {
        return group;
    }

    //获得当前节点的r
    this.getCurrentCircleR = getCurrentCircleR;
    function getCurrentCircleR()
    {
        return current_circle_r;
    }

    //获得当前线路的stroke
    this.getCurrentLineStroke = getCurrentLineStroke;
    function getCurrentLineStroke()
    {
        return current_line_stroke_width;
    }

    //获得当前径路的stroke
    this.getCurrentPathStroke = getCurrentPathStroke;
    function getCurrentPathStroke()
    {
        return current_path_stroke_width;
    }

    this.transformDom = transformDom;
    function transformDom( t )
    {
        d3.select("svg").transition().duration(500).call( zoom.transform, t );
    }

    //重启服务
    this.restartService = restartService;
    function restartService()
    {
        loading_index = layer.load(1);
        $.ajax
        ({
            type : "POST",
            url : "/restartService",
            data : {},
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
                    layer.close(loading_index);
                    if (msg == "1")
                        setMsgInfo('restartService成功，3分钟后径路服务启动');
                    else if (msg == "0")
                        setMsgInfo('restartService无权限执行');
                    else
                        setMsgInfo('restartService失败，scoket异常');
                }

            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo('restartService()失败' + errorMsg);
            }
        });
    }

    //设置车站首字母
    this.setStationSzm = setStationSzm;
    function setStationSzm()
    {
        loading_index = layer.load(1);
        $.ajax
        ({
            type : "POST",
            url : "/setStationSzm",
            data : {map_version : map_version},
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
                    layer.close(loading_index);
                    if (msg == "1")
                        setMsgInfo('setStationSzm完成');
                    else if (msg == "0")
                        setMsgInfo('setStationSzm无权限执行');
                    else
                        setMsgInfo('setStationSzm失败');
                }
            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo('setStationSzm()失败' + errorMsg);
            }
        });
    }

    //信息提示
    this.setMsgInfo = setMsgInfo;
    function setMsgInfo(msg)
    {
        layer.msg(msg, {
            time: 2000 //20s后自动关闭
        });
    }

    function setPrompt( prompt ) {
        $(".right_svg_prompt").html(prompt);
    }

    //点击中间站显示菜单
    this.setMidStationShowModel = setMidStationShowModel;
    function setMidStationShowModel() {
        getMapColor(1);
        setPrompt("中间站显示->");

        var temp_lines = d3.selectAll("line");
        temp_lines.on("click", null);
        temp_lines.on("click", function(d) {
            return getMidStations(parseInt(d.fq/100));
        });
    }
    //获得对应路局中间站信息
    function getMidStations( lj )
    {
        $.ajax
        ({
            type : "GET",
            url : "/getMidStationByLj",
            dataType : "",
            data : {map_version : map_version, lj : lj},
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
                    if (current_ljh == lj)
                    {
                        d3.selectAll(".mid_station_node").remove();
                        d3.selectAll(".mid_station_text").remove();
                        current_ljh = 0;
                    }
                    else
                    {
                        current_ljh = lj;
                        drawMidStationFont(msg);
                        drawMidStationNode(msg);
                    }
                }

            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                setMsgInfo(errorMsg + ' -> getMidStations()失败');
            }
        });
    }

    //中间站站名铺画
    function drawMidStationFont( fonts )
    {
        d3.select("g").selectAll(".mid_station_text").remove();

        var text = d3.select("g").selectAll(".mid_station_text")
            .data(fonts)
            .enter()
            .append("text")
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; })
            .text( function(d) { return d.zm; })
            .attr("id", function(d) { return d.id; })
            .attr("class", "mid_station_text")
            .attr("text-anchor", (d,i) => {
                if (d.angle == 0)
                    return "start";
                else if (d.angle <= 90)
                    return "start";
                else if (d.angle > 90 && d.angle < 135)
                    return "start";
                else if (d.angle >= 135)
                    return "end";
                else
                    return "middle";
            })
            .style("font-size", mid_font_size * scale)
            .attr('transform', (d,i) => {
                if (d.angle == 90)
                    return 'rotate(' + (d.angle) + ',' + (d.x+1) + ',' + (d.y +1) + ')';
                else if (d.angle > 90 && d.angle < 135)
                    return 'rotate(' + (d.angle) + ',' + (d.x + 1) + ',' + (d.y + 1) + ')';
                else if (d.angle >= 135)
                    return 'rotate(' + (d.angle -180) + ',' + (d.x) + ',' + (d.y) + ')';
                else
                    return 'rotate(' + (d.angle) + ',' + (d.x) + ',' + (d.y) + ')';
            })
            .attr('rotate', (d,i) => {
                if (d.angle == 90)
                    return -90;
                else if (d.angle < 90 && d.angle >= 45)
                    return -90;
                else if (d.angle > 90 && d.angle < 135)
                    return -90;
                else
                    return 0;
            })
            .attr("dx", (d,i) => {
                if (d.angle == 0)
                    return "0.75";
                else if (d.angle >= 135)
                    return "-0.75";
                else if (d.angle > 90 && d.angle < 135)
                    return 2.25;
                else if (d.angle < 45)
                    return "-3.5";
                else if (d.angle < 90 && d.angle >= 45)
                    return "1.5";
                else if (d.angle == 90)
                    return "1.5";
                else
                    return 0;
            })
            .attr("dy", (d,i) => {
                if (d.angle <= 45)
                    return "0.40";
                else if (d.angle < 90 && d.angle > 45)
                    return "0.5";
                else if (d.angle == 90)
                    return "2.35";
                else if (d.angle > 90 && d.angle < 135)
                    return "2.75";
                else if (d.angle >= 135)
                    return "0.40";
                else
                    return 0;
            })
            .on("mouseover", function(){ d3.select(this).style("font-size", mid_font_size * scale * 1.2); })
            .on("mouseout",  function(){ d3.select(this).style("font-size", mid_font_size * scale); });
    }

    //中间站节点铺画
    function drawMidStationNode( nodes )
    {
        d3.select("g").selectAll(".mid_station_node").remove();

        //圆铺画
        var circle = d3.select("g").selectAll(".mid_station_node")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
            .attr("id", function(d) { return d.id; })
            .attr("lj", function(d) { return parseInt(d.fq/100); })
            .style("fill", function(d) { return lj_color_list[parseInt(d.fq/100)]; })
            .attr("class", "mid_station_node")
            .style("r", current_mid_circle_r)
            // .on("click", getNodeInfo)
            .on("mouseover", function() { d3.select(this).style("r", current_mid_circle_r * 1.3); })
            .on("mouseout",  function() { d3.select(this).style("r", current_mid_circle_r); });

    }
}



