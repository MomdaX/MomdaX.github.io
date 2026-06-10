function Flew()
{
    var jy_node_array = Array(9);                              //经由节点列表信息
    var prompt = "";
    var loading_index;                                                      //转圈
    var flew_out     = null;                                                //流量结果
    var station_dock = null;                                                //车站装卸
    let circle_scale = 60;
    let line_scale   = 20;

    //设置FlewInput位置
    this.setFlewInputLocation = setFlewInputLocation;
    function setFlewInputLocation()
    {
        var right_svg_width = parseInt( $(".right_svg").width() );
        var jl_width        = parseInt( $(".flew_input_div").width() );
        $(".right_svg_jl").css("margin-left",right_svg_width - jl_width);
        $(".right_svg_jl").css("display", "block");
        $(".right_svg_jl").css("margin-top", "-246px");
    }

    this.clear = clear;
    function clear()
    {
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_line").on("click",   null);
        d3.selectAll(".map_circle").on("contextmenu", null);

        $(".select_jy_circle").removeClass("select_jy_circle");
        $(".select_no_jy_circle").removeClass("select_no_jy_circle");
        $(".select_jy_line").removeClass("select_jy_line");

        d3.selectAll(".map_circle").style("fill", "#FFF");
        d3.selectAll(".map_line").style("stroke", "#FFF");

        d3.select(".flew_group").remove();
        // d3.selectAll(".mid_station_node").remove();
        // d3.selectAll(".mid_station_text").remove();
        flew_out             = null;
        station_dock         = null;
        jy_node_array.length = 0;
    }

    //获得经由点流量
    this.getJydFlew = getJydFlew;
    function getJydFlew( ) {

        //加载FLEW_INPUT
        if ($(".right_svg_jl").children("div").attr("class") != "flew_input_div")
        {
            $(".right_svg_jl").empty();
            $(".right_svg_jl").load("/getFlewPage", function(responseTxt, statusTxt, xhr){
                if (statusTxt == "success")
                    setFlewInputLocation();
                else
                    setMsgInfo('getFlewPage()失败');
            });
        }

        map.clear();
        prompt = "经由点流量：";
        setPrompt(1);

        d3.selectAll(".map_circle").on("click",       jydFlewClickCircle);
        d3.selectAll(".map_line").on("click",         jydFlewClickLine);
        d3.selectAll(".map_circle").on("contextmenu", jydFlewRightMouseCircle);

    }

    //流量缩放
    function flew_zoomed()
    {
        d3.select(".flew_group").selectAll("circle").each(function(d)
        {
            var r = d3.select(this).attr("or");
            d3.select(this).style("r", getMinCircleR(r * d3.event.transform.k));
        });

        d3.select(".flew_group").selectAll("line").each(function(d)
        {
            var sw = d3.select(this).attr("sw");
            d3.select(this).style("stroke-width", getMinStrokeWidth(sw * d3.event.transform.k));
        });
    }

    //装卸缩放
    function dock_zoomed()
    {
        d3.select(".flew_group").selectAll(".flew1_circle").each(function(d)
        {
            var r = d3.select(this).attr("or");
            d3.select(this).style("r", getMinCircleR(r * d3.event.transform.k));
        });

        d3.select(".flew_group").selectAll(".flew2_circle").each(function(d)
        {
            var r = d3.select(this).attr("or");
            d3.select(this).style("r", getMinCircleR(r * d3.event.transform.k));
        });

        d3.select(".flew_group").selectAll(".flew1_line").each(function(d)
        {
            var sw = d3.select(this).attr("sw");
            d3.select(this).style("stroke-width", getMinStrokeWidth(sw * d3.event.transform.k));
        });

        d3.select(".flew_group").selectAll(".flew2_line").each(function(d)
        {
            var sw = d3.select(this).attr("sw");
            d3.select(this).style("stroke-width", getMinStrokeWidth(sw * d3.event.transform.k));
        });
    }

    //最小宽度不能小于底图
    function getMinStrokeWidth( param )
    {
        if (map.getCurrentLineStroke() > param)
            return map.getCurrentLineStroke() * 1.05;
        else
            return param;
    }

    //最小半径不能小于底图
    function getMinCircleR( param )
    {
        if (map.getCurrentCircleR() > param)
            return map.getCurrentCircleR() * 1.05;
        else
            return param;
    }

    //单击圆
    function jydFlewClickCircle()
    {
        var id = this.getAttribute("id");
        //经由点
        getCircleInfo(id, 1);
    }

    //右键圆
    function jydFlewRightMouseCircle()
    {
        if( checkJydNode() == 0)            //没有经由点，就不能选择非经由点
        {
            map.setMsgInfo("请首先选择经由点");
            return;
        }

        var id = this.getAttribute("id");
        //非经由点
        getCircleInfo(id, 2);
    }

    //单击线
    function jydFlewClickLine()
    {}

    //获得圆信息
    function getCircleInfo( id, flag )
    {
        //涟漪
        const ripple0 = document.createElement("div");
        ripple0.className = "ripple1";
        document.body.appendChild(ripple0);
        ripple0.style.left = `${d3.event.clientX}px`;
        ripple0.style.top = `${d3.event.clientY}px`;
        ripple0.style.animation = `ripple-effect1 .4s  linear`;
        // ripple0.onanimationend = () => {
        //     document.body.removeChild(ripple0);
        // }
        ripple0.addEventListener('animationend', function () {
            document.body.removeChild(ripple0);
        })

        const ripple1 = document.createElement("div");
        ripple1.className = "ripple2";
        document.body.appendChild(ripple1);
        ripple1.style.left = `${d3.event.clientX}px`;
        ripple1.style.top = `${d3.event.clientY}px`;
        ripple1.style.animation = `ripple-effect1 .8s  linear`;
        // ripple1.onanimationend = () => {
        //     document.body.removeChild(ripple1);
        // }
        ripple1.addEventListener('animationend', function () {
            document.body.removeChild(ripple1);
        })

        const ripple2 = document.createElement("div");
        ripple2.className = "ripple3";
        document.body.appendChild(ripple2);
        ripple2.style.left = `${d3.event.clientX}px`;
        ripple2.style.top = `${d3.event.clientY}px`;
        ripple2.style.animation = `ripple-effect1 1.2s  linear`;
        // ripple2.onanimationend = () => {
        //     document.body.removeChild(ripple2);
        // }
        ripple2.addEventListener('animationend', function () {
            document.body.removeChild(ripple2);
        })

        d3.selectAll(".ripple1").remove();
        d3.selectAll(".ripple2").remove();
        d3.selectAll(".ripple3").remove();

        loading_index = layer.load(1);
        $.ajax
        ({
            type : "GET",
            url : "/getNode",
            dataType : "",
            data : {map_version : map_version,
                    id          : id},
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
                    var jy_node  = {};
                    jy_node.id   = id;
                    jy_node.node = msg.node;
                    jy_node.lh   = msg.lh;
                    jy_node.zm   = msg.zm;
                    jy_node.flag = flag;
                    jy_node_array.push( jy_node );

                    if (flag == 1)
                    {
                        $("#" + id).css("fill", "#00FF00");
                        $("#" + id).addClass("select_jy_circle");
                    }
                    else
                    {
                        $("#" + id).css("fill","#9876AA");
                        $("#" + id).addClass("select_no_jy_circle");
                    }

                    setPrompt(2);
                    layer.close(loading_index);
                }
            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                map.setMsgInfo(errorMsg + ' -> getNode()失败');
            }
        });
    }

    //获得选择的精密统计数据源
    function getSelectedJmtj()
    {
        var str = "";
        var jmtjs = $(".flew_input_jmtj_div").children(".col-lg-6").find("input");
        $.each(jmtjs, function(i, obj)
        {
            if (obj.checked)
            {
                str += $(obj).attr("val") + ".";
            }
        });


        if (str.length > 0)
            return str.slice(0, str.length - 1);
        else
            return "";
    }

    //获得选择的品类
    function getSelectedCategory()
    {
        //var str   = $(".all_select_pl_input").attr("val") + ".";
        var str   = "";
        var cates = $(".flew_input_cate_div").children(".col-lg-6").find("input");

        $.each(cates, function(i, obj)
        {
            if (obj.checked)
                str += $(obj).attr("val") + ".";
        });
        return str.slice(0, str.length - 1);
    }

    //获得选择的发路局
    function getSelectedLj(flag)
    {
        var  str = "";
        var  ljs = null;

        if (flag == 1)
        {
            //str = $(".all_select_flj_input").attr("val") + ".";
            ljs = $(".flew_input_farea_div").children(".col-lg-6").find("input");
        }
        else
        {
            //str = $(".all_select_dlj_input").attr("val") + ".";
            ljs = $(".flew_input_darea_div").children(".col-lg-6").find("input");
        }
        $.each(ljs, function(i, obj)
        {
            if (obj.checked)
                str += $(obj).attr("val") + ".";
        });
        return str.slice(0, str.length - 1);
    }

    //流量运算
    this.flewCalc = flewCalc;
    function flewCalc()
    {
        loading_index = layer.load(1);

        var jmtjs     = getSelectedJmtj();
        var categorys = getSelectedCategory();
        var car_kinds = "C.P.N";
        var fljs      = getSelectedLj(1);
        var dljs      = getSelectedLj(2);
        var tons      = 60;
        var nodes     = getJydNodes(1);
        var days      = parseInt($("#jmtj_days").val());

        if (jmtjs == "")
        {
            layer.close(loading_index);
            map.setMsgInfo("请选择精密统计数据源");
            return;
        }

        if (categorys == "")
        {
            layer.close(loading_index);
            map.setMsgInfo("请选择品类");
            return;
        }

        if (d3.selectAll(".select_jy_circle").size() < 2)
        {
            layer.close(loading_index);
            map.setMsgInfo("请至少选择2个经由点");
            return;
        }

        $("#flew_calc_input").prop("disabled", true);
        $("#flew_show").prop("disabled", true);
        $("#flew_statistics").prop("disabled", true);
        $("#flew_clear").prop("disabled", true);

        $.ajax
        ({
            type : "GET",
            url : "/getJydFlew",
            dataType : "",
            data : {map_version    : map_version,
                    nodes          : nodes,
                    direction_node : "0",
                    no_nodes       : getJydNodes(2),
                    car_kinds      : car_kinds,
                    categorys      : categorys,
                    fljs           : fljs,
                    dljs           : dljs,
                    jmtjs          : jmtjs,
                    days           : days,
                    tons           : tons},
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
                    //删除经由
                    $(".select_jy_circle").css("fill","#fff");
                    $(".select_jy_line").css("stroke","#fff");
                    $(".select_no_jy_circle").css("fill","#fff");
                    $(".select_jy_circle").removeClass("select_jy_circle");
                    $(".select_no_jy_circle").removeClass("select_no_jy_circle");
                    $(".select_jy_line").removeClass("select_jy_line");

                    $("#flew_show").attr("val", 2);
                    $("#flew_show").html("装卸分布");
                    $("#flew_calc_input").prop("disabled", false);
                    $("#flew_show").prop("disabled", false);
                    $("#flew_statistics").prop("disabled", false);
                    $("#flew_clear").prop("disabled",      false);

                    flew_out             = msg;
                    //铺画流量
                    setPromptFlew(dealFloatData(flew_out.average_daily_flew, days));
                    jy_node_array.length = 0;
                    layer.close(loading_index);

                    //获得车站装卸
                    if (flew_out.average_daily_flew >= 0)
                    {
                        getStationDock(flew_out.dock_list);
                        DrawFlew();
                    }
                }
            },
            error : function(errorMsg)
            {
                $("#flew_calc_input").prop("disabled", false);
                $("#flew_show").prop("disabled", false);
                $("#flew_statistics").prop("disabled", false);
                $("#flew_clear").prop("disabled",      false);
                flew_out = null;
                layer.close(loading_index);
                map.setMsgInfo(errorMsg + ' -> getJydFlew()失败');
            }
        });
    }

    //处理天数
    this.dealFloatData = dealFloatData;
    function dealFloatData( data, days )
    {
        if (data <= 0 || days <= 0)
            return data;

        let f = data/days;
        return Math.round(f * Math.pow(10, 2))/Math.pow(10, 2);
    }

    //铺画流量
    function DrawFlew( )
    {
        //新建group
        var flew_group = d3.select("svg").append("g");
        flew_group.attr("class", "flew_group");
        let transform = d3.select("svg").select("g").attr("transform");
        flew_group.attr("transform", transform);

        var flew_zoom = d3.zoom()
                          .scaleExtent([0.01, 100])				//用于设置最小和最大的缩放比例
                          .on("zoom", flew_zoomed);

        flew_group.call(flew_zoom).on("dblclick.zoom", null);	//取消双击ZOOM

        //加入
        var group = map.getGroup();
        var days  = parseInt($("#jmtj_days").val());
        //铺画线段
        $.each(flew_out.flew_line_list, function( i, obj )
        {
            var line = group.select("#" + obj.id);
            d3.select(".flew_group").append("line")
              .attr("x1",    line.attr("x1"))
              .attr("y1",    line.attr("y1"))
              .attr("x2",    line.attr("x2"))
              .attr("y2",    line.attr("y2"))
              .attr("class", function(){
                    if (obj.flew[1] != 0 && obj.flew[2] != 0)
                        return "flew0_line";
                    else if (obj.flew[1] != 0)
                        return "flew1_line";
                    else if (obj.flew[2] != 0)
                        return "flew2_line";
                    else if (obj.flew[3] != 0)
                        return "flew3_line";
                    else
                        return "flew4_line";
              })
              .style("stroke-width", getMinStrokeWidth(map.getCurrentLineStroke() * dealFloatData(obj.flew[0], days) / line_scale))
              .attr("sw",            getMinStrokeWidth(map.getCurrentLineStroke() * dealFloatData(obj.flew[0], days) / line_scale))
              .attr("id", obj.id)
              .on("click", getLineFlew);

        });

        //铺画节点
        $.each(flew_out.flew_node_list, function( i, obj )
        {
            var node = group.select("#" + obj.id);
            d3.select(".flew_group").append("circle")
              .attr("cx",    node.attr("cx"))
              .attr("cy",    node.attr("cy"))
              .style("r",    getMinStrokeWidth(map.getCurrentCircleR() * dealFloatData(obj.flew[0], days) / circle_scale))
              .attr("or",    getMinStrokeWidth(map.getCurrentCircleR() * dealFloatData(obj.flew[0], days) / circle_scale))
              .attr("class", function(){
                  if (obj.flew[1] != 0 && obj.flew[2] != 0)
                    return "flew0_circle";
                  else if (obj.flew[1] != 0)
                    return "flew1_circle";
                  else if (obj.flew[2] != 0)
                    return "flew2_circle";
                  else if (obj.flew[3] != 0)
                    return "flew3_circle";
                  else
                    return "flew4_circle";
              })
              .attr("id", obj.id)
              .on("click", getNodeFlew);
        });

    }

    //突出装卸
    function DrawDock()
    {
        //新建group
        var flew_group = d3.select("svg").append("g");
        flew_group.attr("class", "flew_group");
        let transform = d3.select("svg").select("g").attr("transform");
        flew_group.attr("transform", transform);

        var flew_zoom = d3.zoom()
                          .scaleExtent([0.01, 100])				//用于设置最小和最大的缩放比例
                          .on("zoom", dock_zoomed);

        flew_group.call(flew_zoom).on("dblclick.zoom", null);	//取消双击ZOOM

        var group = map.getGroup();
        var days  = parseInt($("#jmtj_days").val());
        //铺画线段
        $.each(flew_out.flew_line_list, function( i, obj )
        {
            var line = group.select("#" + obj.id);
            d3.select(".flew_group").append("line")
              .attr("x1",    line.attr("x1"))
              .attr("y1",    line.attr("y1"))
              .attr("x2",    line.attr("x2"))
              .attr("y2",    line.attr("y2"))
              .attr("class", function(){
                if (obj.flew[1] != 0 && obj.flew[2] != 0)
                    return "flew0_line";
                else if (obj.flew[1] != 0)
                    return "flew1_line";
                else if (obj.flew[2] != 0)
                    return "flew2_line";
                else if (obj.flew[3] != 0)
                    return "flew3_line";
                else
                    return "flew4_line";
              })
              .style("stroke-width", function() {
                if (obj.flew[1] != 0 && obj.flew[2] != 0)
                    return map.getCurrentLineStroke();
                else if (obj.flew[1] != 0)
                    return map.getCurrentLineStroke() * dealFloatData(obj.flew[1], days) / line_scale;
                else if (obj.flew[2] != 0)
                    return map.getCurrentLineStroke() * dealFloatData(obj.flew[2], days) / line_scale;
                else
                    return map.getCurrentLineStroke();
              })
              .attr("sw", function() {
                if (obj.flew[1] != 0 && obj.flew[2] != 0)
                    return map.getCurrentLineStroke();
                else if (obj.flew[1] != 0)
                    return map.getCurrentLineStroke() * dealFloatData(obj.flew[1], days) / line_scale;
                else if (obj.flew[2] != 0)
                    return map.getCurrentLineStroke() * dealFloatData(obj.flew[2], days) / line_scale;
                else
                    return map.getCurrentLineStroke();
              })
              .attr("id", obj.id)
              .on("click", getLineFlew);
        });

        //铺画节点
        $.each(flew_out.flew_node_list, function( i, obj )
        {
            var node = group.select("#" + obj.id);
            d3.select(".flew_group").append("circle")
                .attr("cx",    node.attr("cx"))
                .attr("cy",    node.attr("cy"))
                .style("r",    function(){
                    if (obj.flew[1] != 0 && obj.flew[2] != 0)
                        return map.getCurrentCircleR();
                    else if (obj.flew[1] != 0)
                        return map.getCurrentCircleR() * dealFloatData(obj.flew[1], days) / circle_scale;
                    else if (obj.flew[2] != 0)
                        return map.getCurrentCircleR() * dealFloatData(obj.flew[2], days) / circle_scale;
                    else
                        return map.getCurrentCircleR();
                })
                .attr("or",    function(){
                    if (obj.flew[1] != 0 && obj.flew[2] != 0)
                        return map.getCurrentCircleR();
                    else if (obj.flew[1] != 0)
                        return map.getCurrentCircleR() * dealFloatData(obj.flew[1], days) / circle_scale;
                    else if (obj.flew[2] != 0)
                        return map.getCurrentCircleR() * dealFloatData(obj.flew[2], days) / circle_scale;
                    else
                        return map.getCurrentCircleR();
                })
                .attr("class", function(){
                    if (obj.flew[1] != 0 && obj.flew[2] != 0)
                        return "flew0_circle";
                    else if (obj.flew[1] != 0)
                        return "flew1_circle";
                    else if (obj.flew[2] != 0)
                        return "flew2_circle";
                    else if (obj.flew[3] != 0)
                        return "flew3_circle";
                    else
                        return "flew4_circle";
                })
                .attr("id", obj.id)
                .on("click", getNodeFlew);
        });
    }

    //获得车站装卸
    function getStationDock(data)
    {
        console.log(data)
        station_dock = data
        // $("#flew_statistics").prop("disabled", true);
        // $.ajax
        // ({
        //     type : "GET",
        //     url : "/getStationDock",
        //     dataType : "",
        //     data : {map_version : map_version},
        //     beforeSend: function(request) {
        //         request.setRequestHeader("Authorization", window.sessionStorage.token);
        //     },
        //     success : function(msg)
        //     {
        //         if (!msg)
        //         {
        //             map.setMsgInfo("登录超时，将返回主界面重新登录!");
        //             setTimeout(function () {
        //                 window.location.href = "/cljl";
        //             }, 3000);
        //         }
        //         else
        //         {
        //             station_dock = msg;
        //             $("#flew_statistics").prop("disabled", false);
        //         }
        //     },
        //     error : function(errorMsg)
        //     {
        //         station_dock = null;
        //         $("#flew_statistics").prop("disabled", false);
        //         map.setMsgInfo(errorMsg + ' -> getStationDock()失败');
        //     }
        // });
    }

    //获得节点流量
    function getNodeFlew()
    {
        let id = $(this).attr("id");
        getNodeDock(id);
    }

    //获得线段流量
    function getLineFlew()
    {
        let id = $(this).attr("id");
        getLineDock(id);
    }

    //获得流量信息
    this.retFlewOut = retFlewOut;
    function retFlewOut()
    {
        return flew_out;
    }

    //获得流量信息
    this.retStationDock = retStationDock;
    function retStationDock()
    {
        return station_dock;
    }

    //流量展示方式
    this.flewOrDockShow = flewOrDockShow;
    function flewOrDockShow()
    {
        if (flew_out == null || station_dock == null)
        {
            map.setMsgInfo("流量数据为空");
            return;
        }

        d3.selectAll(".map_circle").style("fill", "#FFF");
        d3.selectAll(".map_line").style("stroke", "#FFF");
        $(".flew_group").remove();

        let val = $("#flew_show").attr("val");
        if (val == 1)
        {
            $("#flew_show").attr("val", 2);
            $("#flew_show").html("装卸分布")
            DrawFlew();
        }
        else
        {
            $("#flew_show").attr("val", 1);
            $("#flew_show").html("流量分布")
            DrawDock();
        }
    }

    //设置提示信息
    function setPrompt( flag )
    {
        if (flag == 1)
            $(".right_svg_prompt").html( prompt );
        else if (flag == 2)
        {
            $(".right_svg_prompt").html( prompt + getJyNodeZmPrompt());
        }
        else if (flag == 3)
        {}
        else
        {}
    }

    //设置提示信息流量
    function setPromptFlew( flew )
    {
        if (flew == -1)
            $(".right_svg_prompt").html( prompt + getJyNodeZmPrompt() + "，请稍等几秒，进程占用中。");
        else if (flew == -2)
            $(".right_svg_prompt").html( prompt + getJyNodeZmPrompt() + "，精密统计数据源不存在。");
        else
            $(".right_svg_prompt").html( prompt + getJyNodeZmPrompt() + "，日均流量：" + flew + "车");
    }

    //检测是否有经由点
    function checkJydNode()
    {
        if (jy_node_array.length == 0)
            return 0;
        else
        {
            for (var i = 0; i < jy_node_array.length; i++)
            {
                if ( jy_node_array[i].flag == 1 )
                    return 1;
            }
            return 0;
        }
    }

    //获得站名提示
    function getJyNodeZmPrompt( )
    {
        var str = "";
        for (var i = 0; i < jy_node_array.length; i++)
        {
            if ( jy_node_array[i].flag == 1 )
            {
                str += jy_node_array[i].zm + "->";
            }
        }
        str = str.slice(0, str.length - 2);

        var fstr = "";
        for (var i = 0; i < jy_node_array.length; i++)
        {
            if ( jy_node_array[i].flag == 2 )
            {
                fstr += jy_node_array[i].zm + " | ";
            }
        }

        if (fstr == "")                            //是否需要截取
            return str;
        else
            return str + "，不经由" + fstr.slice(0, fstr.length - 3)
    }

    //获得经由节点号
    function getJydNodes( flag )
    {
        var str = "";
        var str_tmp = "";
        var cnt = 0;

        for (var i = 0; i < jy_node_array.length; i++)
        {
            if ( jy_node_array[i].flag == flag )
            {
                str_tmp += jy_node_array[i].node + ".";
                cnt++;
            }
        }

        str = cnt + "." + str_tmp;
        return str.slice(0, str.length - 1);
    }

}





