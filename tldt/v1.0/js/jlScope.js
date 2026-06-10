function JlScope()
{
    var td;                                                //特定1，最短2
    var pmdm;                                              //7位品名代码
    var jsb;                                               //记事标
    var train_number  = 0;                                 //车次
    var ysfs          = 1;                                 //运输方式
    var cz_xx         = "C";                               //车种
    var cx_xl         = "C60";                             //车型
    var station       = {};                                //发到域径路所选发站或到站LH
    station.id        = "";
    station.lh        = "";
    station.zm        = "";
    var fd            = 0;                                 //到域：1，发域：2
    var ret_scope     = null;                              //返回结果
    var jy_node_array = Array(9);               //经由节点列表信息
    var prompt        = "";                                //提示信息
    var loading_index;                                     //转圈

    /*//右键清空参数
    d3.selectAll("svg").on("contextmenu", null);
    d3.selectAll("svg").on("contextmenu", function(){
        restoreScope();
    });*/

    //发到域径路回退
    this.undoJlScope = undoJlScope;
    function undoJlScope()
    {
        if (jy_node_array.length > 0)
        {
            var node = jy_node_array.pop();

            if ( node.flag == 1)
                d3.select("#" + node.id).classed("scope_jy", false);
            else
                d3.select("#" + node.id).classed("scope_no_jy", false);

            d3.select("#" + node.id).style("fill", "#FFF");

            getJlScopeInfo();
        }
    }

    //设置JlInput位置
    function setJlInputLocation()
    {
        var right_svg_width = parseInt( $(".right_svg").width() );
        var jl_width        = parseInt( $(".right_svg_jl").width() );
        $(".right_svg_jl").css("margin-left",right_svg_width - jl_width);
        $(".right_svg_jl").css("display", "block");
        $(".right_svg_jl").css("margin-top", "-157px");
        $(".jl_input_div ul li:last").css("display", "none");
        //$(".right_svg_jl").css("margin-top", "-120px");
        $(".ul_py_out").css("display", "none");
    }

    this.getJlScope = getJlScope;
    function getJlScope( flag ) {
        map.clear();
        setJlInputLocation();
        if ($(".right_svg_jl").children("div").attr("class") !== "jl_input_div" && fd === 0) {
            //加载Jl_INPUT
            $(".right_svg_jl").empty();
            $(".right_svg_jl").load("/getJlInputPage", function(responseTxt, statusTxt, xhr){
                if (statusTxt == "success")
                {
                    //获得品类字典
                    jl.getCategory();

                    //获得记事标、品名
                    jl.getJsb();

                    //获得运输方式
                    jl.getYsfs();

                    //获得整车字典
                    jl.getZcCzCx();

                    //获得集装箱箱型箱类
                    jl.getJzxXxXl();
                }
                else
                    setMsgInfo('getJlInputPage()失败');
            });
        }

        fd = flag;
        if (fd === 1)
        {
            prompt = "支点径路(到域)：";
            setPrompt(1);
        }
        else
        {
            prompt = "支点径路(发域)：";
            setPrompt(1);
        }
        //clear();
        d3.selectAll(".map_circle").on("click", jlScopeClickCircle);
        d3.selectAll(".map_line").on("click", jlScopeClickLine);
        d3.selectAll(".map_circle").on("contextmenu", jlScopeRightMouseCircle);
    }

    //还原初始
    this.clear = clear;
    function clear()
    {
        ret_scope            = null;
        station.id           = "";
        station.lh           = "";
        station.zm           = "";
        jy_node_array.length = 0;
        fd                   = 0;

        d3.selectAll(".map_circle").style("fill", "#FFF");
        d3.selectAll(".map_line").style("stroke", "#FFF");
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_line").on("click", null);
        d3.selectAll(".map_circle").on("contextmenu", null);

        //清范围类
        d3.selectAll(".scope_circle").classed("scope_circle", false);
        d3.selectAll(".scope_line").classed("scope_line", false);
        d3.selectAll(".scope_jy").classed("scope_jy", false);
        d3.selectAll(".scope_no_jy").classed("scope_no_jy", false);
        d3.selectAll(".station_circle").classed("station_circle", false);
        d3.selectAll(".station_line").classed("station_line", false);
        d3.selectAll(".scope_path_node").classed("scope_path_node", false);
        d3.selectAll(".scope_path_line").classed("scope_path_line", false);
        d3.selectAll(".map_path").remove();
        // d3.selectAll(".mid_station_node").remove();
        // d3.selectAll(".mid_station_text").remove();
    }

    function clearScope()
    {
        if (fd == 1)
        {
            d3.selectAll(".scope_circle").classed("scope_circle",false).style("fill","#FFF");
            d3.selectAll(".scope_line").classed("scope_line",false).style("stroke","#FFF");
            d3.select(".station_line").style("stroke", "#FE4B4B");
            d3.select(".station_circle").style("fill", "#FE4B4B");
        }
        else
        {
            d3.selectAll(".scope_circle").classed("scope_circle",false).style("fill","#FFF");
            d3.selectAll(".scope_line").classed("scope_line",false).style("stroke","#FFF");
            d3.select(".station_circle").style("fill", "#3462FB");
            d3.select(".station_line").style("stroke", "#3462FB");
        }
        d3.selectAll(".scope_path_node").classed("scope_path_node",false).style("fill","#FFF");
        d3.selectAll(".scope_path_line").classed("scope_path_line",false).style("stroke","#FFF");
        d3.selectAll(".scope_jy").style("fill", "#22CE65");
        d3.selectAll(".scope_no_jy").style("fill", "#9876AA");
    }

    function jlScopeRightMouseCircle()
    {
        if (station.id == "")
            return;

        if (jy_node_array.length == 0)
            return;

        var id = this.getAttribute("id");
        getCircleInfo( id ,2);
    }

    function jlScopeClickCircle()
    {
        var id = this.getAttribute("id");
        getCircleInfo( id ,1);
    }

    function getCircleInfo( id, flag )          //flag == 1：经由，flag == 2：不经由
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
                    if (flag == 1)
                        setStationOrNode( id, msg );
                    else
                        setNoNode( id, msg );
                }
            },
            error : function(errorMsg)
            {
                map.setMsgInfo(errorMsg+' -> getNode()失败');
            }
        });
    }

    function setStationOrNode( id, info )
    {
        if (station.id === "")
        {
            station.id = id;
            station.lh = info.lh;
            station.zm = info.zm;
            setPrompt(2);

            d3.select("#" + id).classed("station_circle", true);
            if (fd === 1)
            {
                d3.select("#" + id).style("fill", "#FE4B4B");
            }
            else
            {
                d3.select("#" + id).style("fill", "#3462FB");
            }
        }
        else
        {
            if (jy_node_array.length >= 9)
            {
                map.setMsgInfo("经由节点个数大于限制数");
                return;
            }
            d3.select("#" + id).classed("scope_jy", true);
            d3.select("#" + id).style("fill", "#22CE65");

            var jy_node  = {};
            jy_node.id   = id;
            jy_node.node = info.node;
            jy_node.lh   = info.lh;
            jy_node.zm   = info.zm;
            jy_node.flag = 1;
            jy_node_array.push(jy_node);
            getJlScopeInfo();
        }
    }

    function setNoNode( id, info )
    {
        if (jy_node_array.length >= 9)
        {
            map.setMsgInfo("经由节点个数大于限制数");
            return;
        }
        d3.select("#" + id).classed("scope_no_jy", true);
        d3.select("#" + id).style("fill", "#9876AA");
        var jy_node  = {};
        jy_node.id   = id;
        jy_node.node = info.node;
        jy_node.lh   = info.lh;
        jy_node.zm   = info.zm;
        jy_node.flag = 0;
        jy_node_array.push( jy_node );
        getJlScopeInfo();
    }

    function getJlScopeInfo()
    {
        loading_index = layer.load(1);

        td            = $("input:radio[name='tdid']:checked").val();
        pmdm          = $('#pm_select option:selected').val();
        jsb           = $('#jsb_select option:selected').val();
        ysfs          = parseInt($('#ysfs_select option:selected').val());
        cz_xx         = $('#cz_xx_select option:selected').val();
        cx_xl         = $('#cx_xl_select option:selected').val();
        train_number  = $('#train_number_input').val();
        if (ysfs === 0)
            ysfs = 1;

        $.ajax
        ({
            type : "GET",
            url : "/getJlScope",
            dataType : "",
            data : {map_version  : map_version,
                    station      : station.lh,
                    nodes        : getJyNodeString(1),
                    no_nodes     : getJyNodeString(0),
                    pmdm         : pmdm,
                    jsb          : jsb,
                    train_number : train_number,
                    ysfs         : ysfs,
                    cz_xx        : cz_xx,
                    cx_xl        : cx_xl,
                    td_id        : td,
                    fd           : fd},
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
                    ret_scope = msg;
                    drawMap();
                }
            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                map.setMsgInfo(errorMsg+' -> getJlScope()失败');
                return null;
            }
        });
    }

    function getJyNodeString( flag )
    {
        var str = "";
        for (var i = 0; i < jy_node_array.length; i++)
        {
            if ( jy_node_array[i].flag == flag )
            {
                str += jy_node_array[i].node + ".";
            }
        }
        return str.slice(0, str.length - 1);
    }

    function jlScopeClickLine()
    {
        if (station.id === "")
        {
            openModalForSelect( this );                         //选择发到站
        }
        else
        {
            if (ret_scope != null)
            {
                openModalShowSelect( this );                    //展示在范围内的车站
            }
        }
    }

    function openModalForSelect( dom )
    {
        var dist = map.getClickDistence( dom );
        var id   = dom.getAttribute("id");

        //删除模态框
        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/getMidStationPage", function(responseTxt, statusTxt, xhr){
            if (statusTxt == "success")
            {
                $("#midStationModal").modal("show");
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                $("#id_table").bootstrapTable({
                    url:"/getMidStation?map_version=" + map.getMapVersion() + "&id=" + id + "&flag=" + dist,
                    responseHandler: responseHandler,
                    clickToSelect : true,
                    singleSelect  : true,
                    striped : true,
                    height : 260,
                    columns:
                        [{ field:'checked', checkbox : true, align:'center', valign:'middle' },
                         { field:'zm',        title:'站名' },
                         { field:'lh',        title:'电报码' },
                         { field:'lc',        title:'里程' },
                         //{ field:'fqmc',      title:'分区' },
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
                    },
                    onCheck: function(row){
                        selectStationOfLine( id, row.lh, row.zm )
                    }
                });

                $(".fixed-table-border").css("display","none");
                $(".fixed-table-container").css("border-bottom","0px");
                //$("BODY").css("padding-right","0px");
            }
            else
                map.setMsgInfo('getMidStationPage()失败');
        });
    }

    function responseHandler( res )
    {
        $("#midStationModalTitle").text( res.title );
        return {
            "total"  : res.stations.length,
            "rows" : res.stations
        }
    }

    function selectStationOfLine( id, lh, zm)
    {
        $("#midStationModal").modal("hide");
        station.id = id;
        station.lh = lh;
        station.zm = zm;
        setPrompt(2);
        d3.select("#" + id).classed("station_line", true);
        if (fd == 1)
            d3.select("#" + id).style("stroke", "#FE4B4B");
        else
            d3.select("#" + id).style("stroke", "#3462FB");
    }

    function openModalShowSelect( dom )
    {
        var dist = map.getClickDistence( dom );
        var id   = dom.getAttribute("id");

        //删除模态框
        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/getMidStationPage", function(responseTxt, statusTxt, xhr){
            if (statusTxt == "success")
            {
                $("#midStationModal").modal("show");

                $("#id_table").bootstrapTable({
                    url : "/getMidStation?map_version=" + map.getMapVersion() + "&id=" + id + "&flag=" + dist,
                    responseHandler: responseMidStation,
                    clickToSelect : true,
                    singleSelect  : true,
                    striped : true,
                    height : 260,
                    columns:
                        [{ checkbox : true, align : 'center', valign : 'middle',
                            formatter : function(index, row)
                            {
                                if (checkMidStation( id, row.lh ) == true)
                                    return { disabled : true, checked : true };
                                else
                                    return { disabled : true, checked : false }
                            }
                         },
                         { field:'zm',        title:'站名' },
                         { field:'lh',        title:'电报码' },
                         //{ field:'fqmc',      title:'分区' },
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
                    }
                });

                $(".fixed-table-border").css("display","none");
                $(".fixed-table-container").css("border-bottom","0px");
                //$("BODY").css("padding-right","0px");
            }
            else
                map.setMsgInfo('getMidStationPage()失败');
        });
    }

    function responseMidStation( res )
    {
        $("#midStationModalTitle").text( res.title );
        return {
            "total" : res.stations.length,
            "rows"  : res.stations
        }
    }

    //检查中间站匹配情况
    function checkMidStation ( id, lh )
    {
        var result = false;

        $.each(ret_scope.lines, function( i, obj )
        {
            if ( id == obj.id )
            {
                if (obj.select_state == '0')
                {
                    result = false;
                    return false;
                }else if (obj.select_state == '1') {
                    result = true;
                    return false;
                }
                else if (obj.select_state == '2')
                {
                    for (var i = 0; i < obj.selected_station.length; i++)
                    {
                        if ( lh == obj.selected_station[i] )
                        {
                            result = true;
                            return false;
                        }
                    }
                }
            }
        });

        return result;
    }

    function drawMap( )
    {
        clearScope();
        if (fd === 1)
        {
            //铺画圆
            $.each(ret_scope.nodes, function( i, obj )
            {
                if (obj.charAt(0) == 'C') {
                    d3.select("#" + obj).classed("scope_circle", "true");
                    d3.select("#" + obj).style("fill", "#3462FB");
                }
            });

            //铺画线
            $.each(ret_scope.lines, function( i, obj )
            {
                if (obj.id.charAt(0) == 'L')
                {
                    if (obj.select_state == '1' )
                    {
                        d3.select("#" + obj.id).classed("scope_line","true");
                        d3.select("#" + obj.id).style("stroke", "#3462FB");
                    }
                    else if (obj.select_state == '2')
                    {
                        d3.select("#" + obj.id).classed("scope_line","true");
                        d3.select("#" + obj.id).style("stroke", "#22CEFF");
                    }
                }
            });
        }
        else
        {
            //铺画圆
            $.each(ret_scope.nodes, function( i, obj )
            {
                if (obj.charAt(0) == 'C')
                {
                    d3.select("#" + obj).classed("scope_circle","true");
                    d3.select("#" + obj).style("fill", "#FE4B4B");
                }
            });

            //铺画线
            $.each(ret_scope.lines, function( i, obj )
            {
                if (obj.id.charAt(0) == 'L')
                {
                    if (obj.select_state == '1')
                    {
                        d3.select("#" + obj.id).classed("scope_line","true");
                        d3.select("#" + obj.id).style("stroke", "#FE4B4B");
                    }
                    else if (obj.select_state == '2')
                    {
                        d3.select("#" + obj.id).classed("scope_line","true");
                        d3.select("#" + obj.id).style("stroke", "#FE974B");
                    }
                }
            });
        }

        //铺画经由node
        $.each(ret_scope.path_node, function( i, obj )
        {
            if (obj.charAt(0) === 'C')
            {
                d3.select("#" + obj).classed("scope_path_node","true");
                d3.select("#" + obj).style("fill", "#FFFF00");
            }
        });

        //铺画经由line
        $.each(ret_scope.path_line, function( i, obj )
        {
            if (obj.charAt(0) === 'L')
            {
                d3.select("#" + obj).classed("scope_path_line","true");
                d3.select("#" + obj).style("stroke", "#FFFF00");
            }
        });

        //重新渲染经由点
        d3.selectAll(".scope_jy").style("fill", "#22CE65");

        //重新渲染非经由点
        d3.selectAll(".scope_no_jy").style("fill", "#9876AA");

        //重新渲染发到站
        if(fd === 1)
        {
            d3.select(".station_circle").style("fill", "#FE4B4B");
            d3.select(".station_line").style("stroke", "#FE4B4B");
        }
        else
        {
            d3.select(".station_circle").style("fill", "#3462FB");
            d3.select(".station_line").style("stroke", "#3462FB");
        }
        setPrompt(3);
        layer.close(loading_index);
    }

    function getJyNodeZmPrompt( flag, chr, leng)
    {
        var str = "";
        if (fd === 1)
        {
            for (var i = 0; i < jy_node_array.length; i++)
            {
                if ( jy_node_array[i].flag === flag )
                {
                    str += jy_node_array[i].zm + chr;
                }
            }
        }
        else
        {
            for (var i = jy_node_array.length - 1; i >=0 ; i--)
            {
                if ( jy_node_array[i].flag === flag )
                {
                    str += jy_node_array[i].zm + chr;
                }
            }
        }
        return str.slice(0, str.length - leng);
    }

    function insertStr(str, index, insertStr) {
        const ary = str.split('');
        ary.splice(index, 0, insertStr);
        return ary.join('');
    }

    function setPrompt( flag )
    {
        if (flag == 1)
            $(".right_svg_prompt").html( prompt );
        else if (flag == 2)
        {
            $(".right_svg_prompt").html( prompt + station.zm + "站");
        }
        else if (flag == 3)
        {
            var jy_node_string     = "";
            var no_jy_node_string  = "";

            jy_node_string = getJyNodeZmPrompt(1, "->", 2);
            if (jy_node_string.length > 0)
            {
                jy_node_string = "经由" + jy_node_string + "支点";
                var jy_begin_index = jy_node_string.indexOf("经由", 0);
                if (jy_begin_index !== -1) {
                    jy_node_string = insertStr(jy_node_string, jy_begin_index + 2, "<span class=\"jyText\">");
                    var jy_end_index = jy_node_string.indexOf("支点", 0);
                    jy_node_string = insertStr(jy_node_string, jy_end_index, "</span>");
                }
            }

            no_jy_node_string = getJyNodeZmPrompt(0, " | ", 3);
            if (no_jy_node_string.length > 0)
            {
                no_jy_node_string = "，不经由" + no_jy_node_string + "支点";
                var not_jy_begin_index = no_jy_node_string.lastIndexOf("不经由");
                if (not_jy_begin_index !== -1) {
                    no_jy_node_string = insertStr(no_jy_node_string, not_jy_begin_index + 3, "<span class=\"notJyText\">");
                    var not_jy_end_index = no_jy_node_string.lastIndexOf("支点");
                    no_jy_node_string = insertStr(no_jy_node_string, not_jy_end_index, "</span>");
                }
            }
            var style_string = "<style>" +
                ".jyText {" +
                "color: #22CE65" +
                "}" +
                ".notJyText {" +
                "color: #9876AA" +
                "}" +
                "</style>";

            if (fd == 1)
                $(".right_svg_prompt").html( prompt + station.zm + "站" + jy_node_string + no_jy_node_string + "，到达" +
                    ret_scope.station_amount + "个车站" + style_string);
            else
                $(".right_svg_prompt").html( prompt + ret_scope.station_amount + "个车站" + jy_node_string + no_jy_node_string + "，到达" +
                    station.zm + "站" + style_string);
        }
        else
        {}
    }

    this.getJlScopeState = getJlScopeState;
    function getJlScopeState()
    {
        return station.id;
    }
}