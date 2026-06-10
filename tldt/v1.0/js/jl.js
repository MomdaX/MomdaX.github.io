//点点径路
function Jl( )
{
    var td;                                                 //特定1，最短2
    var pmdm;                                               //7为品名代码
    var jsb;                                                //记事标
    var train_number = 0;                                   //车次
    var ysfs = 1;
    var cz_xx = "C";                                           //车种
    var cx_xl = "C60"
    var fz_dz_array    = [];                                //发到站列表
    var jlout = null;                                       //径路返回结果
    var loading_index;                                      //转圈
    var jl_state = 0;                                       //1:点点径路;2:输入
    var userToken;
    var cz_dic;
    var cx_dic;
    var xx_dic;
    var xl_dic;

    //点点径路回退
    this.undoJl = undoJl;
    function undoJl()
    {
        if (fz_dz_array.length > 1)
        {
            if (fz_dz_array.length > 2)
            {
                fz_dz_array.pop();
                d3.selectAll(".map_circle").style("fill", "#FFF");
                getJl();
            }
            else
            {
                fz_dz_array.pop();
                setPrompt("点点径路 : " + fz_dz_array[0].zm);

                d3.selectAll(".map_circle").style("fill","#FFF");
                d3.selectAll(".map_line").style("stroke","#FFF");
                d3.selectAll(".map_circle").on("click", null);
                d3.selectAll(".map_circle").on("click", getCircleInfo);
                d3.selectAll(".map_line").on("click", null);
                d3.selectAll(".map_path").remove();

                //回退时绘制发站的颜色
                if (fz_dz_array[0].id.length < 13)
                    d3.select("#" + fz_dz_array[0].id).style("fill", "#FE4B4B");
                else
                    d3.select("#" + fz_dz_array[0].id).style("stroke", "#FE4B4B");
            }
        }
    }

    //获得品名
    this.getCategory = getCategory;
    function getCategory()
    {
        $.getJSON("mapData/getCategory.js", function(msg)
        {
            $.each(msg, function(i, obj)
            {
                document.getElementById("pm_select").options.add(new Option(obj.name, obj.id));
            });
        })
        .fail(function(errorMsg) {
            map.setMsgInfo(errorMsg + ' -> getCategory()失败');
        });
    }

    //获得记事标
    this.getJsb = getJsb;
    function getJsb()
    {
        $.getJSON("mapData/getJsbPm.js", function(msg)
        {
            $.each(msg, function(i, obj)
            {
                if (obj.dig < 100000)
                    document.getElementById("jsb_select").options.add(new Option(obj.mc, obj.dig));
            });
        })
        .fail(function(errorMsg) {
            map.setMsgInfo(errorMsg + ' -> getJsb()失败');
        });
    }

    //获得运输方式
    this.getYsfs = getYsfs;
    function getYsfs()
    {
        document.getElementById("ysfs_select").options.add(new Option('整车', 1));
        document.getElementById("ysfs_select").options.add(new Option('集装箱', 2));
    }

    this.getZcCzCx = getZcCzCx;
    function getZcCzCx() {
        //整车字典
        $.getJSON("mapData/getCzDic.js", function(msg)
        {
            cz_dic = msg;
        })
        .fail(function(errorMsg) {
            map.setMsgInfo(errorMsg + ' -> getCzDic()失败');
        });
        
        $.getJSON("mapData/getCxDic.js", function(msg)
        {
            cx_dic = msg;
        })
        .fail(function(errorMsg) {
            map.setMsgInfo(errorMsg + ' -> getCxDic()失败');
        });
    }

    this.getJzxXxXl = getJzxXxXl;
    function getJzxXxXl() {
        //集装箱字典
        $.getJSON("mapData/getXxDic.js", function(msg)
        {
            xx_dic = msg;
        })
        .fail(function(errorMsg) {
            map.setMsgInfo(errorMsg + ' -> getXxDic()失败');
        });
        
        $.getJSON("mapData/getXlDic.js", function(msg)
        {
            xl_dic = msg;
        })
        .fail(function(errorMsg) {
            map.setMsgInfo(errorMsg + ' -> getXlDic()失败');
        });
    }
    //设置JlInput位置
    function setJlInputLocation()
    {
        var right_svg_width = parseInt( $(".right_svg").width() );
        var jl_width        = parseInt( $(".right_svg_jl").width() );
        $(".right_svg_jl").css("margin-left", right_svg_width - jl_width);
        $(".right_svg_jl").css("display", "block");
        if (jl_state == 1)                                              //点点径路
        {
            $(".right_svg_jl").css("margin-top", "-200px");
            $(".jl_input_div ul li:last").css("display", "block");
            $(".ul_py_out").css("display", "none");
            $("#fz_input").focus();
        }
    }

    this.clear = clear;
    function clear()
    {
        //jlRing.clear();
        //jlScope.clear();

        d3.selectAll(".map_path").remove();
        d3.selectAll(".path_end_station").remove();
        d3.selectAll(".mid_station_text.path_end_station").remove();
        // d3.selectAll(".mid_station_node").remove();
        // d3.selectAll(".mid_station_text").remove();
        jl_state           = 0;
        fz_dz_array.length = 0;
        jlout              = null;
    }

    this.clearParameters = clearParameters;
    function clearParameters( )
    {
        if (jl_state = 1)
            setPrompt("点点径路 : ");

        d3.selectAll(".map_circle").style("fill","#FFF");
        d3.selectAll(".map_line").style("stroke","#FFF");
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_circle").on("click", getCircleInfo);
        d3.selectAll(".map_line").on("click", null);
        d3.selectAll(".map_path").remove();
        // d3.selectAll(".mid_station_node").remove();
        // d3.selectAll(".mid_station_text").remove();

        fz_dz_array.length    = 0;
        jlout                 = null;
    }

    this.pointPointJl = pointPointJl;
    function pointPointJl()
    {
        map.clear();
        jl_state = 1;
        clearParameters();

        //加载JL_INPUT
        if ($(".right_svg_jl").children("div").attr("class") != "jl_input_div")
        {
            //加载Jl_INPUT
            $(".right_svg_jl").empty();
            $(".right_svg_jl").load("/getJlInputPage", function(responseTxt, statusTxt, xhr){
                if (statusTxt == "success")
                {
                    setJlInputLocation();
                    //获得品类
                    getCategory();
                    //获得记事标
                    getJsb();
                    //获得运输方式
                    getYsfs();
                    //获得整车字典
                    getZcCzCx();
                    //获得集装箱箱型箱类
                    getJzxXxXl();
                }
                else
                    setMsgInfo('getJlInputPage()失败');
            });
        }
        else
        {
            setJlInputLocation();
        }
    }

    function getCircleInfo()
    {
        $("#fz_input").val("");
        $("#dz_input").val("");
        var id = this.getAttribute("id");

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

        setFzDzArray(id, "", "", 1);
    }

    function selectStationOfSegment( id, lh, zm)
    {
        $("#midStationModal").modal("hide");
        setFzDzArray(id, lh, zm, 0);
    }

    this.requestJl = requestJl;
    function requestJl(startLh, endLh, callback) {
        $.ajax({
            type: "GET",
            url: "/getJl",
            dataType: "",
            data: {
                map_version: map_version,
                td_id: 1,
                zmdm: startLh + "." + endLh,
                pmdm: 0,
                jsb: 0,
                train_number: 0,
                ysfs: 1,
                cz_xx: "0",
                cx_xl: "0"
            },
            beforeSend: function(request) {
                if (window.sessionStorage.token) {
                    request.setRequestHeader("Authorization", window.sessionStorage.token);
                }
            },
            success: function(msg) {
                if (callback && typeof callback === 'function') {
                    callback(msg);
                }
            },
            error: function(xhr, status, error) {
                var errorMsg = error || status || '网络错误';
                if (callback && typeof callback === 'function') {
                    callback(null, errorMsg);
                }
            }
        });
    }

    this.setFzDzArray = setFzDzArray;
    function setFzDzArray( id, lh, zm, if_circle )
    {
        if (fz_dz_array.length == 0)
        {
            clearParameters();
            if (jl_state == 1)
            {
                setPrompt("点点径路 : " + zm);
            }

            //渲染
            if (if_circle == 0)
                d3.select("#" + id).style("stroke", "#FE4B4B");
            else
                d3.select("#" + id).style("fill", "#FE4B4B");
        }
        else if (fz_dz_array.length == 1)
        {
            //渲染
            if (if_circle == 0)
                d3.select("#" + id).style("stroke", "#3462FB");
            else
                d3.select("#" + id).style("fill", "#3462FB");
        }
        else if (fz_dz_array.length > 1 && fz_dz_array.length <= 10)                  //多点经由
        {
            d3.selectAll(".map_circle").style("fill", "#FFFFFF");
            d3.select("#" + id).style("fill", "#22CE65");
            // setPrompt("点点径路 : " + fz_dz_array[0].zm + " -> " + fz_dz_array[1].zm);
        }
        else
            map.setMsgInfo('指定经由个数超限');

        var station = {};
        station.id = id;
        station.lh = lh;
        station.zm = zm;
        fz_dz_array.push( station );
        if (fz_dz_array.length > 1)
            getJl();
    }

    function getJl()
    {
        loading_index = layer.load(1);

        td = $("input:radio[name='tdid']:checked").val();
        pmdm = $('#pm_select option:selected').val();
        jsb = $('#jsb_select option:selected').val();
        ysfs = parseInt($('#ysfs_select option:selected').val());
        cz_xx   = $('#cz_xx_select option:selected').val();
        cx_xl   = $('#cx_xl_select option:selected').val();
        if (ysfs === 0)
            ysfs = 1;
        train_number = $('#train_number_input').val();
        if (train_number === '')
            train_number = 0;
        $.ajax
        ({
            type : "GET",
            url : "/getJl",
            dataType : "",
            data : {map_version  : map_version,
                    td_id        : td,
                    zmdm         : getFzDzArrayLh(),
                    pmdm         : pmdm,
                    jsb          : jsb,
                    train_number : train_number,
                    ysfs         : ysfs,
                    cz_xx        : cz_xx,
                    cx_xl        : cx_xl
                    },
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
                    jlout = msg;
                    DrawJl();

                    if (jl_state == 1)                          //点点径路
                    {
                        var jyz = "";
                        if (fz_dz_array.length > 2)
                        {
                            jyz = " 经由( ";
                            $.each(fz_dz_array, function(i, obj)
                            {
                                if (i > 1)
                                    jyz += obj.zm + " | ";
                            });
                            jyz = jyz.slice(0, jyz.length - 2);
                            jyz += ") ";
                        }
                        var fjz_list = " 分界站( ";
                        if (jlout.fjz.length != 0)
                        {
                            $.each(jlout.fjz, function(i, obj)
                            {
                                if (obj.big_or_small == 1)
                                    fjz_list += obj.zm + " | ";
                            });
                            if (fjz_list.charAt(fjz_list.length - 2) != '(')
                                fjz_list = fjz_list.slice(0, fjz_list.length - 2);
                            else
                                fjz_list = fjz_list.slice(0, fjz_list.length - 1);
                            fjz_list += " )";
                        }
                        else
                            fjz_list = " 分界站( )";
                        var zf_info = " ";
                        if (jlout.zf != "")
                        {
                            zf_info += jlout.zf;
                        }
                        else
                            zf_info = "";
                        var jl_info1 = "点点径路 : " + fz_dz_array[0].zm + " -> " + fz_dz_array[1].zm + " " +jyz + jlout.lc[0] + "公里";
                        var jl_info2 = fjz_list + zf_info;
                        setPrompt(jl_info1 + jl_info2);
                    }
                }
            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                map.setMsgInfo(errorMsg + ' -> getJl()失败');
                setPrompt("点点径路 : " + fz_dz_array[0].zm + " -> " + fz_dz_array[1].zm + " 计算有误");
                clearParameters();
            }
        });
    }

    function getFzDzArrayLh()
    {
        var zmdm = "";
        $.each(fz_dz_array, function(i, obj)
        {
            zmdm += obj.lh + ".";
        });

        return zmdm.slice(0, zmdm.length - 1);
    }

    function DrawJl( )
    {
        d3.selectAll(".map_path").remove();
        var lineFunction = d3.line()
                             .x(function(d){ return d.x; })
                             .y(function(d){ return d.y; });

        map.getGroup().insert("path", ".map_circle")
                      .attr("class",         "map_path")
                      .attr("d",             lineFunction(jlout.path))
                      .style("stroke-width", map.getCurrentPathStroke())
                      .on("click",           clickJlPath)
                      .on("mouseover",       function(){ d3.select(this).style("stroke-width", map.getCurrentPathStroke() * 1.5); })
                      .on("mouseout",        function(){ d3.select(this).style("stroke-width", map.getCurrentPathStroke()); });

        for (var i in jlout.path)
        {
            if(i != 0 && i != jlout.path.length - 1)
                d3.select("#" + jlout.path[i].id).transition().delay(1000).style("fill", "#FFFF00");
            else if (i == 0)
                d3.select("#" + jlout.path[i].id).style("fill", "#FE4B4B");
            else if (i == jlout.path.length - 1)
                d3.select("#" + jlout.path[i].id).style("fill", "#3462FB");
            else {}
        }

        var len = fz_dz_array.length;
        if (len > 2)
        {
            for(var j = len - 1; j >= 2; j--)
            {
                d3.select("#" + fz_dz_array[j].id).transition().delay(1000).style("fill", "#22CE65");
            }
        }

        if (jlout !== null && jlout.fjz !== null)
        {
            for (var j = 0; j < jlout.fjz.length; j++)
            {
                if (jlout.fjz[j].big_or_small === 1)
                    d3.select("#" + jlout.fjz[j].id).transition().delay(1000).style("fill", "#FF9900");
            }
        }

        if (fz_dz_array[0].id.charAt(0) == "Z" || fz_dz_array[1].id.charAt(0) == "Z")
        {
            var minx = d3.min(jlout.path, function(d){return d.x;});
            var miny = d3.min(jlout.path, function(d){return d.y;});
            var maxx = d3.max(jlout.path, function(d){return d.x;});
            var maxy = d3.max(jlout.path, function(d){return d.y;});
            setJlCenter( minx, miny, maxx, maxy );
        }
        layer.close(loading_index);
    }

    function clickJlPath()
    {
        //删除模态框
        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/getJloutputPage", function(responseTxt, statusTxt, xhr){
            if (statusTxt == "success")
            {
                $("#jloutputModal").modal("show");
                $("#jloutputTable").empty();
                $("#jloutputTable").append($(getJloutMessage()));
            }
            else
            {
                map.setMsgInfo('getJloutputPage()失败');
            }
        });
    }
    function getJloutMessage()
    {
        var jl_out_message;
        jl_out_message   = "<tr><td style='font-weight:bold;'>发站</td><td width='100px' >" + jlout.fz.zm + "</td><td style='text-align:center;'>" + jlout.fz.lh + "</td><td style='text-align:center;'>" + jlout.fz.ljjc + "局</td></tr>";
        jl_out_message += "<tr><td style='font-weight:bold;'>到站</td><td width='100px' >" + jlout.dz.zm + "</td><td style='text-align:center;'>" + jlout.dz.lh + "</td><td style='text-align:center;'>" + jlout.dz.ljjc + "局</td></tr>";

        jl_out_message += "<tr><td style='font-weight:bold;'>全程里程</td><td style='text-align:center;'>" + jlout.lc[0] + "公里</td><td style='text-align:center;font-weight:bold;'>备注</td><td style='text-align:center;color: #FE4B4B'>" + jlout.zf + "</td></tr>";

        var index;
        jl_out_message += "<tr><td style='text-align:center;font-weight:bold;' colspan='4'>路局里程</td></tr>";
        $.each(jlout.lj, function(i, obj)
        {
            index = i+1;
            jl_out_message += "<tr><td style='text-align:center;'>" + index + "</td><td style='text-align:center;'>" + obj.jc + "局</td><td style='text-align:right;' colspan='2'>" + obj.lc + "公里</td></tr>";
        });

        if (jlout.fjz.length != 0)
        {
            index = 0;
            jl_out_message += "<tr><td style='text-align:center;font-weight:bold;' colspan='4'>分界站</td></tr>";
            $.each(jlout.fjz, function(i, obj)
            {
                index = i+1;
                var c_or_r;
                if (obj.pass == 1)
                    c_or_r = "出";
                else
                    c_or_r = "入";

                var b_or_s;
                if (obj.big_or_small == 1) {
                    b_or_s = "大口";
                    jl_out_message += "<tr><td style='text-align:center;'>" + index + "</td><td style='text-align:left;'>" + obj.zm + "</td><td style='text-align:center;'>" + b_or_s + "</td>><td style='text-align:center;'>" + c_or_r + "</td></tr>";
                }
                });
        }
        return jl_out_message;
    }

    //径路居中
    this.setJlCenter = setJlCenter;
    function setJlCenter( minx, miny, maxx, maxy )
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

    this.getJlState = getJlState;
    function getJlState()
    {
        return jl_state;
    }

    this.getCz = getCz;
    function getCz() {
        return cz_dic;
    }

    this.getCx = getCx;
    function getCx() {
        return cx_dic;
    }

    this.getXx = getXx;
    function getXx() {
        return xx_dic;
    }

    this.getXl = getXl;
    function getXl() {
        return xl_dic;
    }

    function insertStr(str, index, insertStr) {
        const ary = str.split('');
        ary.splice(index, 0, insertStr);
        return ary.join('');
    }

    function setPrompt( prompt ) {
        var jy_begin_index = prompt.indexOf("经由(", 0);
        if (jy_begin_index !== -1) {
            prompt = insertStr(prompt, jy_begin_index + 3, "<span class=\"jyzText\">");
            var jy_end_index = prompt.indexOf(")", 0);
            prompt = insertStr(prompt, jy_end_index, "</span>");
        }

        var fjz_begin_index = prompt.lastIndexOf("分界站(");
        if (fjz_begin_index !== -1) {
            prompt = insertStr(prompt, fjz_begin_index + 4, "<span class=\"fjzText\">");
            var fjz_end_index = prompt.lastIndexOf(")");
            prompt = insertStr(prompt, fjz_end_index, "</span>");
        }

        var zf_begin_index = prompt.lastIndexOf("有折返");
        if (zf_begin_index !== -1) {
            prompt = insertStr(prompt, zf_begin_index, "<span class=\"zfText\">");
            var zf_end_index = prompt.lastIndexOf("返");
            prompt = insertStr(prompt, zf_end_index + 1, "</span>");
            console.log("请注意：\n" +
                "当前径路存在折返，您所选经由站顺序必须和径路顺序一致！\n" +
                "（可同时按住Ctrl+Z，使用回退功能删除上一个选择的车站。）")
        }
        $(".right_svg_prompt").html(prompt +
            "<style>" +
            ".jyzText {" +
            "color: #22CE65" +
            "}" +
            ".fjzText {" +
            "color: #FF9900" +
            "}" +
            ".zfText {" +
            "color: #FF0033" +
            "}" +
            "</style>");
    }

    this.getNostalgicJl = getNostalgicJl;
    function getNostalgicJl()
    {
        //隐藏径路输入框
        $(".right_svg_jl").css("display", "none");
        setTimeout(function() {
            $("#fz_input").focus();
        },500);
        map.clear();
        setPrompt("怀旧径路：");
        //
        $(".addparent-modal-panel").empty();

        //一定要回调
        $(".addparent-modal-panel").load("/getNostalgicJlPage", function(responseTxt, statusTxt, xhr) {
            if (statusTxt == "success") {
                $("#NostalgicJlModal").modal("show");
             }
             else
                 map.setMsgInfo('GetMidStationPage()失败');
         });
        getJsb();
        getCategory();
    }
}
