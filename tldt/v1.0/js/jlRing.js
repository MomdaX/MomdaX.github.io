function JlRing()
{
    var jl_state = 0;                                               //径路状态
    var fz       = {};                                              //fa zhan
    var loading_index;                                              //转圈

    //环状径路回退
    this.undoJlRing = undoJlRing;
    function undoJlRing()
    {
        d3.select(".map_ring_path1").remove();
        d3.select(".map_ring_path2").remove();
        jl_state = 2;
        setPrompt("环状径路 : " + fz.zm);
        getRingSegment();
    }

    this.clear = clear;
    function clear()
    {
        jl_state = 0;
        fz.id = "";
        fz.lh = "";
        fz.zm = "";
        d3.selectAll(".map_ring_path1").remove();
        d3.selectAll(".map_ring_path2").remove();
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_line").on("click", null);
        // d3.selectAll(".mid_station_node").remove();
        // d3.selectAll(".mid_station_text").remove();
    }

    this.start = start;
    function start()
    {
        map.clear();
        d3.selectAll(".map_ring_path1").remove();
        d3.selectAll(".map_ring_path2").remove();

        setPrompt("环状径路 : ");
        $(".right_svg_jl").css("display", "none");
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_circle").on("click", getCircleInfo);
        d3.selectAll(".map_line").on("click", null);
        jl_state = 1;
    }

    function getCircleInfo( )
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

        var id = this.getAttribute("id");
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
                    setFz( id, msg.lh, msg.zm, 1);
                }
            },
            error : function(errorMsg)
            {
                map.setMsgInfo(errorMsg + ' -> getNode()失败');
            }
        });
    }

    function responseHandler( res )
    {
        $("#midStationModalTitle").text( res.title );
        return {
            "total" : res.stations.length,
            "rows"  : res.stations
        }
    }

    function setFz(id, lh, zm, if_circle)
    {
        fz.lh = lh;
        fz.zm = zm;
        fz.id = id;
        setPrompt("环状径路 : " + zm);

        if (if_circle == 0)
            d3.select("#" + id).style("stroke", "#FE4B4B");
        else
            d3.select("#" + id).style("fill", "#FE4B4B");

        jl_state = 2;
        //huo de huan zhuang jing lu xian duan
        getRingSegment();
    }

    function getRingSegment()
    {
        loading_index = layer.load(1);

        $.ajax
        ({
            type : "GET",
            url : "/getRingSegment",
            dataType : "",
            data : {map_version : map_version,
                    fz          : fz.lh,
                    id          : fz.id},
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
                    drawRingSegment( msg );
                }
            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                map.setMsgInfo(errorMsg + ' -> getRingSegment()失败');
            }
        });
    }

    function drawRingSegment( info )
    {
        d3.selectAll(".map_circle").on("click", null);
        d3.selectAll(".map_line").on("click", null);

        $.each(info, function(i , obj){
            if (fz.id != obj)
            {
                d3.select("#" + obj).style("stroke", "#FE974B");
                d3.select("#" + obj).on("click", getJlRing);
            }
        });
        layer.close(loading_index);
    }

    function getJlRing()
    {
        loading_index = layer.load(1);
        var id   = this.getAttribute("id");
        $.ajax
        ({
            type : "GET",
            url : "/getJlRing",
            dataType : "",
            data : {map_version : map_version,
                    fz          : fz.lh,
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
                    drawRingPath( msg );
                }
            },
            error : function(errorMsg)
            {
                layer.close(loading_index);
                map.setMsgInfo(errorMsg + ' -> getJlRing()失败');
            }
        });
    }

    function drawRingPath( info )
    {
        d3.selectAll(".map_line").on("click", null);
        d3.selectAll(".map_line").style("stroke","#FFF");
        d3.selectAll(".map_path").remove();

        var lineFunction = d3.line()
            .x(function(d){ return d.x; })
            .y(function(d){ return d.y; });

        map.getGroup().append("path")
                      .attr("class",         "map_ring_path1")
                      .attr("d",             lineFunction(info.jl1.path))
                      .style("stroke-width", map.getCurrentPathStroke())
                      .on("mouseover",       function(){ d3.select(this).style("stroke-width", map.getCurrentPathStroke() * 1.5); })
                      .on("mouseout",        function(){ d3.select(this).style("stroke-width", map.getCurrentPathStroke()); });

        map.getGroup().append("path")
                      .attr("class",         "map_ring_path2")
                      .attr("d",             lineFunction(info.jl2.path))
                      .style("stroke-width", map.getCurrentPathStroke())
                      .on("mouseover",       function(){ d3.select(this).style("stroke-width", map.getCurrentPathStroke() * 1.5); })
                      .on("mouseout",        function(){ d3.select(this).style("stroke-width", map.getCurrentPathStroke()); });

        //径路1节点站
        for (var i in info.jl1.path)
        {
            if(i != 0 && i != info.jl1.path.length - 1)
                d3.select("#" + info.jl1.path[i].id).style("fill", "#FFFF00");
            else if (i == 0)
                d3.select("#" + info.jl1.path[i].id).style("fill", "#FE4B4B");
            else if (i == info.jl1.path.length - 1)
                d3.select("#" + info.jl1.path[i].id).style("fill", "#3462FB");
            else {}
        }

        //径路2节点站
        for (var i in info.jl2.path)
        {
            if(i != 0 && i != info.jl2.path.length - 1)
                d3.select("#" + info.jl2.path[i].id).style("fill", "#22CE65");
            else if (i == 0)
                d3.select("#" + info.jl2.path[i].id).style("fill", "#FE4B4B");
            else if (i == info.jl2.path.length - 1)
                d3.select("#" + info.jl2.path[i].id).style("fill", "#3462FB");
            else {}
        }

        //分界站1
        if (info.jl1.fjz !== null)
        {
            for (var j = 0; j < info.jl1.fjz.length; j++)
            {
                if (info.jl1.fjz[j].big_or_small === 1)
                    d3.select("#" + info.jl1.fjz[j].id).style("fill", "#FF9900");
            }
        }

        //分界站2
        if (info.jl2.fjz !== null)
        {
            for (var j = 0; j < info.jl2.fjz.length; j++)
            {
                if (info.jl2.fjz[j].big_or_small === 1)
                    d3.select("#" + info.jl2.fjz[j].id).style("fill", "#FF9900");
            }
        }

        var vsetInfo = "环状径路 : "+info.jl1.fz.zm + " -> " +"["+info.jl1.dz.zm + "("+info.jl1.lc[0]+"公里)" +" | "+ "("+info.jl2.lc[0]+"公里)" + info.jl2.dz.zm +"]";

        setPrompt(vsetInfo);
        jl_state = 3;
        layer.close(loading_index);
    }

    this.getJlState = getJlState;
    function getJlState()
    {
        return jl_state;
    }

    function insertStr(str, index, insertStr) {
        const ary = str.split('');
        ary.splice(index, 0, insertStr);
        return ary.join('');
    }

    function setPrompt( prompt ) {
        var jl1_begin_index = prompt.indexOf("[", 0);
        if (jl1_begin_index !== -1) {
            prompt = insertStr(prompt, jl1_begin_index + 1, "<span class=\"jl1Text\">");
            var jl1_end_index = prompt.indexOf("(", 0);
            prompt = insertStr(prompt, jl1_end_index, "</span>");
        }
        var jl2_begin_index = prompt.lastIndexOf(")");
        if (jl2_begin_index !== -1) {
            prompt = insertStr(prompt, jl2_begin_index + 1, "<span class=\"jl2Text\">");
            var jl2_end_index = prompt.lastIndexOf("]");
            prompt = insertStr(prompt, jl2_end_index, "</span>");
        }
        $(".right_svg_prompt").html(prompt +
            "<style>" +
            ".jl1Text {" +
            "color: yellow" +
            "}" +
            ".jl2Text {" +
            "color: #22CE65" +
            "}" +
            "</style>");
    }

}