function jlPrintAndExport()
{
    this.jlPrint = jlPrint;
    this.jlExport = jlExport;
    function jlPrint()
    {
        styleRender();
        $("svg").print({
            iframe: null,
            deferred: $.Deferred().done(mCallback),
            title:$(".right_svg_prompt").text()
        });
    }
    function jlExport()
    {
        $(".map_text").css("fill","#E6E6E6");
        var vtype = $(".right_svg_prompt").html();
        if (vtype.indexOf("点点径路") != -1)
        {
            $(".map_path").css("stroke","yellow");
            $(".map_path").css("fill","none");
            $(".map_path").css("pointer-events","stroke");

        }else if (vtype.indexOf("环状径路") != -1)
        {
            $(".map_ring_path1").css("fill","none");
            $(".map_ring_path1").css("stroke","yellow");
            $(".map_ring_path1").css("stroke-linecap","round");
            $(".map_ring_path1").css("stroke-linejoin","round");

            $(".map_ring_path2").css("fill","none");
            $(".map_ring_path2").css("stroke","#22CE65");
            $(".map_ring_path2").css("stroke-linecap","round");
            $(".map_ring_path2").css("stroke-linejoin","round");
        }
        else if(vtype.indexOf("经由点流量") != -1 )
        {
            $(".flew1_circle").css("fill","#FE4B4B");
            $(".flew2_circle").css("fill","#0080FF");
            $(".flew3_circle").css("fill","#00FF00");

            $(".flew1_line").css("stroke","#FE4B4B");
            $(".flew1_line").css(" stroke-linecap","round");

            $(".flew2_line").css("stroke","#0080FF");
            $(".flew2_line").css(" stroke-linecap","round");

            $(".flew3_line").css("stroke","#00FF00");
            $(".flew3_line").css(" stroke-linecap","round");

        }
        var  serializer = new  XMLSerializer();
        var  source = '<?xml version="1.0" standalone ="no"?>\r\n' + serializer.serializeToString(d3.select("svg").node());
        var  image = new Image();
        image.src = "data:image/svg+xml;charset=utf-8,"+ encodeURIComponent(source);

        var canvas = document.createElement("canvas");
        canvas.width = d3.select('svg').attr("width");
        canvas.height = d3.select('svg').attr("height");
        var context = canvas.getContext("2d");
        /*context.fillStyle = "#fff";*/
        context.fillRect(0,0,d3.select('svg').attr("width"),d3.select('svg').attr("height")); //绘制矩形
        image.onload = function (){

            context.drawImage(image,0,0);
            var a = document.createElement('a');
            a.href = canvas.toDataURL("image/png");                                           //将画布内的信息导出为png图片数据
            a.download = new Date().valueOf() +".jpg";                                              //设定下载名称

            a.click(); //点击触发下载
        }

    }

}
var mCallback = function (){

    $("svg").removeClass("svg_jlprint");
    $("#clmap_title").css("color","white");
    $("#clversion").css("color","white");
    $(".map_text").css("fill","#E6E6E6");

    if ($(".map_line").css("stroke") == "rgb(105, 105, 105)"){
        $(".map_line").css("stroke","rgb(255, 255, 255)");
    }
    if ($(".map_circle").css("fill") == "rgb(105, 105, 105)"){
        $(".map_circle").css("fill","rgb(255, 255, 255)");
    }
};
function styleRender() {

    $("svg").addClass("svg_jlprint");
    $("#clmap_title").css("color","black");
    $("#clversion").css("color","black");
    $(".map_text").css("fill","dimgray");
   if ($(".map_line").css("stroke") == "rgb(255, 255, 255)"){
        $(".map_line").css("stroke","rgb(105, 105, 105)");
    }
   if ($(".map_circle").css("fill") == "rgb(255, 255, 255)"){
        $(".map_circle").css("fill","rgb(105, 105, 105)");
    }
}

function Callback()
{
    $("svg").removeClass("svg_jlprint");
    $("#clmap_title").css("color","white");
    $("#clversion").css("color","white");
    $(".map_text").css("fill","#E6E6E6");

    if ($(".map_line").css("stroke") == "rgb(105, 105, 105)"){
        $(".map_line").css("stroke","rgb(255, 255, 255)");
    }
    if ($(".map_circle").css("fill") == "rgb(105, 105, 105)"){
        $(".map_circle").css("fill","rgb(255, 255, 255)");
    }
}



