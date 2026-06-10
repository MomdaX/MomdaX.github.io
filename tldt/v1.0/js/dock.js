
//获得节点站装车信息
function getNodeDock( id )
{
    var days = parseInt($("#jmtj_days").val());

    var flew_array   = Array(4);                  //1：装，2：卸，3：通过
    $.each(flew.retFlewOut().flew_node_list, function( i, obj )
    {
        if (id == obj.id)
        {
            flew_array[0] = flew.dealFloatData(obj.flew[0], days);
            flew_array[1] = flew.dealFloatData(obj.flew[1], days);
            flew_array[2] = flew.dealFloatData(obj.flew[2], days);
            flew_array[3] = flew.dealFloatData(obj.flew[3], days);
        }
    });

    var load_array = Array();                //装车品类信息
    $.each(flew.retStationDock(), function( i, obj )
    {
        if (id == obj.id)
        {
            for (var i = 1; i < obj.load_cars.length; i++)
            {
                if (obj.load_cars[i] > 0)
                {
                    var load_cars = {};
                    load_cars.key   = getPlMc(i);
                    load_cars.value = flew.dealFloatData(obj.load_cars[i], days);
                    load_array.push( load_cars );
                }
            }
        }
    });

    var unload_array = Array();                //卸车品类信息
    $.each(flew.retStationDock(), function( i, obj )
    {
        if (id == obj.id)
        {
            for (var i = 1; i < obj.unload_cars.length; i++)
            {
                if (obj.unload_cars[i] > 0) {
                    var unload_cars = {};
                    unload_cars.key   = getPlMc(i);
                    unload_cars.value = flew.dealFloatData(obj.unload_cars[i], days);
                    unload_array.push(unload_cars);
                }
            }
        }
    });

    //删除模态框
    $(".addparent-modal-panel").empty();
    //一定要回调
    $(".addparent-modal-panel").load("/getDockPage", function(responseTxt, statusTxt, xhr){
        if (statusTxt == "success")
        {
            $.ajax
            ({
                type : "GET",
                url : "/getNode",
                dataType : "",
                data : {map_version    : map_version,
                        id             : id},
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
                        $("#DockModal").modal("show");
                        $(".modal-content").css("height","400px");
                        $("#DockModalLabel").text("[" + msg.zm  + "]节点日均流量");
                        $(".div_dock_station").css("display", "none");

                        $("#flew1").val(flew_array[1]);
                        $("#flew2").val(flew_array[2]);
                        $("#flew3").val(flew_array[3]);

                        //判断展开tab
                        if( flew_array[1] > 0)
                        {
                            $("#dockTab").children("li:last-child").removeClass("active");
                            $("#dockTab").children("li:first-child").addClass("active");
                            $("#dockTabContent").children("div:last-child").removeClass("active");
                            $("#dockTabContent").children("div:first-child").addClass("active");
                        }
                        else
                        {
                            $("#dockTab").children("li:first-child").removeClass("active");
                            $("#dockTab").children("li:last-child").addClass("active");
                            $("#dockTabContent").children("div:first-child").removeClass("active");
                            $("#dockTabContent").children("div:last-child").addClass("active");
                        }

                        //铺画节点站装卸车
                        drawElementDock( ".load_svg",   load_array , 1);
                        drawElementDock( ".unload_svg", unload_array, 2);
                    }
                },
                error : function(errorMsg)
                {
                    map.setMsgInfo(errorMsg + ' -> getNode()失败');
                }
            });
        }
        else
            map.setMsgInfo('getDockPage()失败');
    });
}

function getPlMc( pl )
{
    let ret = "";
    let cates = $(".flew_input_cate_div").children(".col-lg-6").find("input");
    $.each(cates, function(i, obj)
    {
        if (pl == $(obj).attr("val"))
        {
            ret = $(obj).attr("mc");
            return false;
        }
    });
    return ret;
}

function getLjMc( lj )
{
    let ret = "";
    let ljs = $(".flew_input_farea_div").children(".col-lg-6").find("input");
    $.each(ljs, function(i, obj)
    {
        if (lj == $(obj).attr("val"))
        {
            ret = $(obj).attr("mc");
            return false;
        }
    });
    return ret;
}

function drawElementDock( dom, datas, dock)
{
    $(dom).empty();
    if(datas.length > 0)
    {
        let width = 700,height = 250,padding = 40;

        let svg = d3.select(dom).style("width",  width)
                                .style("height", height);

        let xScale = d3.scaleBand()
            .domain(datas.map( d=>d.key ))
            .range([padding, width - 2 * padding])
            .padding(0.5);

        let yScale = d3.scaleLinear()
            .domain([0, d3.max(datas, (d)=>d.value)])
            .range([height - padding * 2, 0]);

        let xAxis = d3.axisBottom(xScale)
        let yAxis = d3.axisLeft(yScale)

        // 绘制坐标轴
        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(0,' + ( height - padding ) +')')
            .call(xAxis)

        svg.append('g')
            .attr('class', 'axis')
            .attr('transform', 'translate(' + padding + ',' + padding + ')')
            .call(yAxis);

        let rect = svg.selectAll("rect")
            .data(datas)
            .enter()
            .append("rect")
            .attr("x",d=>xScale(d.key))
            .attr("y",d=>yScale(d.value) + padding)
            .attr("width", xScale.bandwidth())
            .attr("height",d=>height - padding * 2 - yScale(d.value))
            .attr("class",function(){
                if (dock == 1)
                    return "dock1rect";
                else
                    return "dock2rect";});

        rect.append("title").text(function(d){ return d.value;});
    }
}


//获得线段流量通过ID
function getLineDock( id )
{
    let days = parseInt($("#jmtj_days").val());

    var flew_array   = Array(4);                  //1：装，2：卸，3：通过
    $.each(flew.retFlewOut().flew_line_list, function( i, obj )
    {
        if (id == obj.id)
        {
            flew_array[0] = flew.dealFloatData(obj.flew[0], days);
            flew_array[1] = flew.dealFloatData(obj.flew[1], days);
            flew_array[2] = flew.dealFloatData(obj.flew[2], days);
            flew_array[3] = flew.dealFloatData(obj.flew[3], days);
        }
    });

    //删除模态框
    $(".addparent-modal-panel").empty();
    //一定要回调
    $(".addparent-modal-panel").load("/getDockPage", function(responseTxt, statusTxt, xhr){
        if (statusTxt == "success")
        {
            $.ajax
            ({
                type : "GET",
                url : "/getSegmentSimple",
                dataType : "",
                data : {map_version    : map_version,
                        id             : id},
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
                        $("#DockModal").modal("show");
                        $(".modal-content").css("height","600px");
                        $("#DockModalLabel").text("[" + msg[0] + "—" + msg[1]  + "]区段日均流量");

                        $("#flew1").val(flew_array[1]);
                        $("#flew2").val(flew_array[2]);
                        $("#flew3").val(flew_array[3]);

                        $(".div_dock_station").css("display", "block");
                        //增加装卸车站到table
                        addDockStationToTable( id );
                    }
                },
                error : function(errorMsg)
                {
                    map.setMsgInfo(errorMsg + ' -> getNode()失败');
                }
            });
        }
        else
            map.setMsgInfo('getDockPage()失败');
    });
    return flew;
}

function addDockStationToTable( id )
{
    let days  = parseInt($("#jmtj_days").val());
    let docks = Array();

    $.each(flew.retStationDock(), function( i, obj )
    {
        if (id == obj.id)
        {
            if (obj.load_cars[0] > 0 || obj.unload_cars[0] > 0)
            {
                let dock = {};
                dock.zm          =   obj.zm;
                dock.lh          =   obj.lh;
                dock.lj          =   getLjMc(obj.lj);
                dock.load_cars   = flew.dealFloatData(obj.load_cars[0], days);
                dock.unload_cars = flew.dealFloatData(obj.unload_cars[0], days);
                docks.push(dock);
            }
        }
    });

    $("#id_dock_station_table").bootstrapTable('destroy');
    $("#id_dock_station_table").bootstrapTable({
        data : docks,
        responseHandler : responseHandler,
        singleSelect : true,
        striped : true,
        columns:
            [{ field:'zm',          title:'站名' },
             { field:'lh',          title:'电报码',  align : "center" },
             { field:'lj',          title:'所属路局', align : "center" },
             { field:'load_cars',   title:'装车数', align : "right", sortable : true },
             { field:'unload_cars', title:'卸车数', align : "right", sortable : true }],
        onClickRow: function (row, $element)
        {
            $(".info").removeClass("info");
            $($element).addClass("info");
            showStationDock( row.lh );
        }/*,
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
        }//隔行变色*/
    });

    $(".fixed-table-border").css("display","none");
}

//数据填充之后调用
function responseHandler()
{}

function showStationDock( lh )
{
    let days = parseInt($("#jmtj_days").val());

    let load_array   = Array();                //装车品类信息
    let unload_array = Array();                //卸车品类信息
    let load_sum     = 0;

    $.each(flew.retStationDock(), function( i, obj )
    {
        if (lh == obj.lh)
        {
            for (let i = 1; i < obj.load_cars.length; i++)
            {
                if (obj.load_cars[i] > 0) {
                    var load_cars = {};
                    load_cars.key   = getPlMc(i);
                    load_cars.value = flew.dealFloatData(obj.load_cars[i], days);
                    load_array.push(load_cars);
                    load_sum += load_cars.value;
                }
            }

            for (let i = 1; i < obj.unload_cars.length; i++)
            {
                if (obj.unload_cars[i] > 0) {
                    var unload_cars = {};
                    unload_cars.key   = getPlMc(i);
                    unload_cars.value = flew.dealFloatData(obj.unload_cars[i], days);
                    unload_array.push(unload_cars);
                }
            }
        }
    });

    //判断展开tab
    if( load_sum > 0)
    {
        $("#dockTab").children("li:last-child").removeClass("active");
        $("#dockTab").children("li:first-child").addClass("active");
        $("#dockTabContent").children("div:last-child").removeClass("active");
        $("#dockTabContent").children("div:first-child").addClass("active");
    }
    else
    {
        $("#dockTab").children("li:first-child").removeClass("active");
        $("#dockTab").children("li:last-child").addClass("active");
        $("#dockTabContent").children("div:first-child").removeClass("active");
        $("#dockTabContent").children("div:last-child").addClass("active");
    }

    //铺画节点站装卸车
    drawElementDock( ".load_svg",   load_array , 1);
    drawElementDock( ".unload_svg", unload_array, 2);
}

//列表统计
function dockStatisticsShow()
{
    if (flew.retFlewOut() == null || flew.retStationDock() == null)
    {
        map.setMsgInfo("流量数据为空");
        return;
    }

    let days = parseInt($("#jmtj_days").val());

    //删除模态框
    $(".addparent-modal-panel").empty();
    //一定要回调
    $(".addparent-modal-panel").load("/login/getDockSumPage", function(responseTxt, statusTxt, xhr){
        if (statusTxt == "success")
        {
            $("#DockSumModal").modal("show");

            //装车
            let docks_lj_load_array   = Array();
            for (let i = 0; i < 20; i++)
            {
                let dock = {};
                dock.index = i;
                dock.lj    = getLjMc(i);
                dock.cars  = getLjCars(1, i);
                if (dock.cars != 0)
                {
                    dock.cars = flew.dealFloatData(dock.cars, days);
                    docks_lj_load_array.push(dock);
                }
            }

            $("#id_load_table").bootstrapTable('destroy');
            $("#id_load_table").bootstrapTable({
                data : docks_lj_load_array,
                striped : true,
                columns:
                    [{ field:'index',title:'局码',     align : "center" },
                     { field:'lj',   title:'局名',     align : "center" },
                     { field:'cars', title:'日均装车数',align : "right"}],
                rowStyle: function (row, index)                         //隔行变色*/
                {
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

            //卸车
            let docks_lj_unload_array = Array();
            for (let i = 0; i < 20; i++)
            {
                let dock  = {};
                dock.index = i;
                dock.lj    = getLjMc(i);
                dock.cars  = getLjCars(2, i);
                if (dock.cars != 0)
                {
                    dock.cars = flew.dealFloatData(dock.cars, days);
                    docks_lj_unload_array.push(dock);
                }
            }

            $("#id_unload_table").bootstrapTable('destroy');
            $("#id_unload_table").bootstrapTable({
                data : docks_lj_unload_array,
                striped : true,
                columns:
                    [{ field:'index', title:'局码',      align : "center"},
                     { field:'lj',    title:'局名',      align : "center"},
                     { field:'cars',  title:'日均卸车数', align : "right"}],
                rowStyle: function (row, index)                         //隔行变色*/
                {
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
        }
        else
            map.setMsgInfo('getDockSumPage()失败');
    });
}

function getLjCars(flag, lj)
{
    let dock_sum = 0;
    $.each(flew.retStationDock(), function( i, obj )
    {
        if (obj.lj == lj)
        {
            if (flag == 1)
                dock_sum += obj.load_cars[0];
            else
                dock_sum += obj.unload_cars[0];
        }
    });
    return dock_sum;
}
