function runScript( script ){
    if (script == null)
        return;
    eval(script);
}

//菜单单击
function itemOnClick( target )
{
    var nodeid = $(target).attr("data-nodeid");
    var tree   = $(".left_menu");
    var node   = tree.treeview("getNode", nodeid);
    node.state.selected = false;

    /*if (node.state.expanded)
    {
        tree.treeview("expandNode", node.nodeId);
    }
    else
    {
        tree.treeview("collapseNode", node.nodeId);
    }*/
    runScript( node.href );
}

function Menu( )
{
    //左侧menu的初始显示状态
    var isShow         = true;

    this.DrawMenu = DrawMenu;
    function DrawMenu( menu_list ) {
        $(".left_menu").treeview({
            color :             "#FFFFFF",
            backColor :         "#313335",
            borderColor :       "#3C3F41",
            levels :            3,
            highlightSelected : true,
            onhoverColor :      "#3C3F41",
            selectedBackColor : "#3C3F41",
            unSelectedBackColor : "#3C3F41",
            preventUnselect:true,
            preventUnselectBooleanfalse:true,
            expandIcon :        "",
            collapseIcon :      "",
            emptyIcon :         "",
            data :              menu_list,
            onNodeSelected:function(event, data){
                var sels = $('.left_menu').treeview('getSelected');
                 for (var i = 0; i < sels.length; i++) {
                    if (sels[i].nodeId == data.nodeId) {
                        continue;
                    }
                  $('.left_menu').treeview('unselectNode', [sels[i].nodeId, { silent: true }]);
                }
                $(".left_menu").treeview('selectNode', [data.nodeId, { silent: true }]);
            },
            onNodeUnselected:function(event, data){
               var sels = $('.left_menu').treeview('getSelected');
               for (var i = 0; i < sels.length; i++) {
                    if (sels[i].nodeId == data.nodeId) {
                        $(".left_menu").treeview('selectNode', [data.nodeId, { silent: true }]);
                        continue;
                    }

                    $('.left_menu').treeview('unselectNode', [sels[i].nodeId, { silent: true }]);

                }

            }
        });
    }

    this.showLeftMenu = showLeftMenu;
    function showLeftMenu(){
        if(isShow){
            $('.left_menu').width(0); //设置宽度
            $(".list-group").css("display","none");
            /*$('.layui-nav-tree li').removeClass('layui-nav-itemed');*/
            //设置DIV_SVG宽度
            var right_svg_width = $(window).width() - $(".left_menu").width();
          /*  alert($(".left_menu").width());*/
            $(".right_svg").width(right_svg_width);
            //设置SVG宽度
            $("svg").width(right_svg_width);
            $(".top_right_div_img").rotate({
                bind:{
                    click:function () {
                        $(this).rotate({angle:90})
                    }
                }
            });
            //修改标志位
            isShow =false;

            if(vtype = $(".right_svg_prompt").html().indexOf("经由点流量") != -1)
            {
                var jl_width = parseInt( $(".flew_input_div").width());
                $(".right_svg_jl").css("margin-left", $(window).width() - jl_width);
            }else
            {
                var jl_width = parseInt( $(".right_svg_jl").width());
                $(".right_svg_jl").css("margin-left", $(window).width() - jl_width);
            }
        }
        else
        {
            if(vtype = $(".right_svg_prompt").html().indexOf("经由点流量") != -1)
            {
                var jl_width = parseInt( $(".flew_input_div").width());
                $(".right_svg_jl").css("margin-left", $(window).width() - 180 - jl_width);  //180是menu的值
            }else
            {
                var jl_width = parseInt( $(".right_svg_jl").width());
                $(".right_svg_jl").css("margin-left", $(window).width() - 180 - jl_width);
            }

            $('.left_menu').width(180);
            $(".list-group").css("display","block");
            //设置DIV_SVG宽度
            var right_svg_width = $(window).width() - $(".left_menu").width();
            $(".right_svg").width(right_svg_width);
            //设置SVG宽度
            $("svg").width(right_svg_width);
            $(".top_right_div_img").rotate({
                bind:{
                    click:function () {
                        $(this).rotate({angle:0})
                    }
                }
            });
            isShow =true;
        }
    }
    /*var toolbar_list = menu_list;
    var vstr = "";
    vstr +="<div class='btn-group' role='group' aria-label='First group'>";
    for(var i=0;i<toolbar_list.length;i++){
        if (j<toolbar_list[i].nodes.length >0) {
            for(var j=0;j<toolbar_list[i].nodes.length;j++){
                if(toolbar_list[i].nodes[j].icon == "111"){
                    vstr +="<span class='iconfont icon-fenxi1' style='cursor: pointer;font-size: 16px;padding-left: 5px'></span>";
                }

            }
        }
    }
    vstr +="</div>";
    alert(vstr);
    $("#leftoolbar").html(vstr);*/

}

/*function Toolbar()
{
    alert("dd");
    var toolbar_list = menu_list;
    var vstr = "";
    vstr +="<div class='btn-group' role='group' aria-label='First group'>";
    for(var i=0;i<toolbar_list.length;i++){
        if (j<toolbar_list[i].nodes.length >0) {
            for(var j=0;j<toolbar_list[i].nodes.length;j++){
                if(toolbar_list[i].nodes[j].icon == "111"){
                    vstr +="<span class='iconfont icon-fenxi1' style='cursor: pointer;font-size: 16px;padding-left: 5px'></span>";
                }

            }
        }
    }
    vstr +="</div>";
    $(".tool-bar").html(vstr);
}*/
