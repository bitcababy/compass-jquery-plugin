var ImageDialog={preInit:function(){var b;tinyMCEPopup.requireLangPack();if(b=tinyMCEPopup.getParam("external_image_list_url"))document.write('<script language="javascript" type="text/javascript" src="'+tinyMCEPopup.editor.documentBaseURI.toAbsolute(b)+'"><\/script>')},init:function(b){var d=document.forms[0],a=d.elements;b=tinyMCEPopup.editor;var e=b.dom,c=b.selection.getNode();tinyMCEPopup.resizeToInnerSize();this.fillClassList("class_list");this.fillFileList("src_list","tinyMCEImageList");this.fillFileList("over_list",
"tinyMCEImageList");this.fillFileList("out_list","tinyMCEImageList");TinyMCE_EditableSelects.init();if(c.nodeName=="IMG"){a.src.value=e.getAttrib(c,"src");a.width.value=e.getAttrib(c,"width");a.height.value=e.getAttrib(c,"height");a.alt.value=e.getAttrib(c,"alt");a.title.value=e.getAttrib(c,"title");a.vspace.value=this.getAttrib(c,"vspace");a.hspace.value=this.getAttrib(c,"hspace");a.border.value=this.getAttrib(c,"border");selectByValue(d,"align",this.getAttrib(c,"align"));selectByValue(d,"class_list",
e.getAttrib(c,"class"),true,true);a.style.value=e.getAttrib(c,"style");a.id.value=e.getAttrib(c,"id");a.dir.value=e.getAttrib(c,"dir");a.lang.value=e.getAttrib(c,"lang");a.usemap.value=e.getAttrib(c,"usemap");a.longdesc.value=e.getAttrib(c,"longdesc");a.insert.value=b.getLang("update");if(/^\s*this.src\s*=\s*\'([^\']+)\';?\s*$/.test(e.getAttrib(c,"onmouseover")))a.onmouseoversrc.value=e.getAttrib(c,"onmouseover").replace(/^\s*this.src\s*=\s*\'([^\']+)\';?\s*$/,"$1");if(/^\s*this.src\s*=\s*\'([^\']+)\';?\s*$/.test(e.getAttrib(c,
"onmouseout")))a.onmouseoutsrc.value=e.getAttrib(c,"onmouseout").replace(/^\s*this.src\s*=\s*\'([^\']+)\';?\s*$/,"$1");if(b.settings.inline_styles){e.getAttrib(c,"align")&&this.updateStyle("align");e.getAttrib(c,"hspace")&&this.updateStyle("hspace");e.getAttrib(c,"border")&&this.updateStyle("border");e.getAttrib(c,"vspace")&&this.updateStyle("vspace")}}document.getElementById("srcbrowsercontainer").innerHTML=getBrowserHTML("srcbrowser","src","image","theme_advanced_image");if(isVisible("srcbrowser"))document.getElementById("src").style.width=
"260px";document.getElementById("onmouseoversrccontainer").innerHTML=getBrowserHTML("overbrowser","onmouseoversrc","image","theme_advanced_image");if(isVisible("overbrowser"))document.getElementById("onmouseoversrc").style.width="260px";document.getElementById("onmouseoutsrccontainer").innerHTML=getBrowserHTML("outbrowser","onmouseoutsrc","image","theme_advanced_image");if(isVisible("outbrowser"))document.getElementById("onmouseoutsrc").style.width="260px";if(b.getParam("advimage_constrain_proportions",
true))d.constrain.checked=true;a.onmouseoversrc.value||a.onmouseoutsrc.value?this.setSwapImage(true):this.setSwapImage(false);this.changeAppearance();this.showPreviewImage(a.src.value,1)},insert:function(){var b=tinyMCEPopup.editor,d=this,a=document.forms[0];if(a.src.value===""){if(b.selection.getNode().nodeName=="IMG"){b.dom.remove(b.selection.getNode());b.execCommand("mceRepaint")}tinyMCEPopup.close()}else{if(tinyMCEPopup.getParam("accessibility_warnings",1))if(!a.alt.value){tinyMCEPopup.confirm(tinyMCEPopup.getLang("advimage_dlg.missing_alt"),
function(e){e&&d.insertAndClose()});return}d.insertAndClose()}},insertAndClose:function(){var b=tinyMCEPopup.editor,d=document.forms[0],a=d.elements,e={};tinyMCEPopup.restoreSelection();tinymce.isWebKit&&b.getWin().focus();e=b.settings.inline_styles?{vspace:"",hspace:"",border:"",align:""}:{vspace:a.vspace.value,hspace:a.hspace.value,border:a.border.value,align:getSelectValue(d,"align")};tinymce.extend(e,{src:a.src.value.replace(/ /g,"%20"),width:a.width.value,height:a.height.value,alt:a.alt.value,
title:a.title.value,"class":getSelectValue(d,"class_list"),style:a.style.value,id:a.id.value,dir:a.dir.value,lang:a.lang.value,usemap:a.usemap.value,longdesc:a.longdesc.value});e.onmouseover=e.onmouseout="";if(d.onmousemovecheck.checked){if(a.onmouseoversrc.value)e.onmouseover="this.src='"+a.onmouseoversrc.value+"';";if(a.onmouseoutsrc.value)e.onmouseout="this.src='"+a.onmouseoutsrc.value+"';"}if((d=b.selection.getNode())&&d.nodeName=="IMG")b.dom.setAttribs(d,e);else{b.execCommand("mceInsertContent",
false,'<img id="__mce_tmp" />',{skip_undo:1});b.dom.setAttribs("__mce_tmp",e);b.dom.setAttrib("__mce_tmp","id","");b.undoManager.add()}tinyMCEPopup.editor.execCommand("mceRepaint");tinyMCEPopup.editor.focus();tinyMCEPopup.close()},getAttrib:function(b,d){var a=tinyMCEPopup.editor,e=a.dom,c;if(a.settings.inline_styles)switch(d){case "align":if(c=e.getStyle(b,"float"))return c;if(c=e.getStyle(b,"vertical-align"))return c;break;case "hspace":c=e.getStyle(b,"margin-left");a=e.getStyle(b,"margin-right");
if(c&&c==a)return parseInt(c.replace(/[^0-9]/g,""));break;case "vspace":c=e.getStyle(b,"margin-top");a=e.getStyle(b,"margin-bottom");if(c&&c==a)return parseInt(c.replace(/[^0-9]/g,""));break;case "border":c=0;tinymce.each(["top","right","bottom","left"],function(f){f=e.getStyle(b,"border-"+f+"-width");if(!f||f!=c&&c!==0){c=0;return false}if(f)c=f});if(c)return parseInt(c.replace(/[^0-9]/g,""))}if(c=e.getAttrib(b,d))return c;return""},setSwapImage:function(b){var d=document.forms[0];d.onmousemovecheck.checked=
b;setBrowserDisabled("overbrowser",!b);setBrowserDisabled("outbrowser",!b);if(d.over_list)d.over_list.disabled=!b;if(d.out_list)d.out_list.disabled=!b;d.onmouseoversrc.disabled=!b;d.onmouseoutsrc.disabled=!b},fillClassList:function(b){var d=tinyMCEPopup.dom,a=d.get(b),e,c;if(e=tinyMCEPopup.getParam("theme_advanced_styles")){c=[];tinymce.each(e.split(";"),function(f){f=f.split("=");c.push({title:f[0],"class":f[1]})})}else c=tinyMCEPopup.editor.dom.getClasses();if(c.length>0){a.options.length=0;a.options[a.options.length]=
new Option(tinyMCEPopup.getLang("not_set"),"");tinymce.each(c,function(f){a.options[a.options.length]=new Option(f.title||f["class"],f["class"])})}else d.remove(d.getParent(b,"tr"))},fillFileList:function(b,d){var a=tinyMCEPopup.dom,e=a.get(b);d=window[d];e.options.length=0;if(d&&d.length>0){e.options[e.options.length]=new Option("","");tinymce.each(d,function(c){e.options[e.options.length]=new Option(c[0],c[1])})}else a.remove(a.getParent(b,"tr"))},resetImageData:function(){var b=document.forms[0];
b.elements.width.value=b.elements.height.value=""},updateImageData:function(b,d){var a=document.forms[0];if(!d){a.elements.width.value=b.width;a.elements.height.value=b.height}this.preloadImg=b},changeAppearance:function(){var b=tinyMCEPopup.editor,d=document.forms[0],a=document.getElementById("alignSampleImg");if(a)if(b.getParam("inline_styles"))b.dom.setAttrib(a,"style",d.style.value);else{a.align=d.align.value;a.border=d.border.value;a.hspace=d.hspace.value;a.vspace=d.vspace.value}},changeHeight:function(){var b=
document.forms[0],d;if(b.constrain.checked&&this.preloadImg)if(!(b.width.value==""||b.height.value=="")){d=parseInt(b.width.value)/parseInt(this.preloadImg.width)*this.preloadImg.height;b.height.value=d.toFixed(0)}},changeWidth:function(){var b=document.forms[0],d;if(b.constrain.checked&&this.preloadImg)if(!(b.width.value==""||b.height.value=="")){d=parseInt(b.height.value)/parseInt(this.preloadImg.height)*this.preloadImg.width;b.width.value=d.toFixed(0)}},updateStyle:function(b){var d=tinyMCEPopup.dom,
a,e=document.forms[0],c=d.create("img",{style:d.get("style").value});if(tinyMCEPopup.editor.settings.inline_styles){if(b=="align"){d.setStyle(c,"float","");d.setStyle(c,"vertical-align","");if(a=getSelectValue(e,"align"))if(a=="left"||a=="right")d.setStyle(c,"float",a);else c.style.verticalAlign=a}if(b=="border"){d.setStyle(c,"border","");if((a=e.border.value)||a=="0")c.style.border=a=="0"?"0":a+"px solid black"}if(b=="hspace"){d.setStyle(c,"marginLeft","");d.setStyle(c,"marginRight","");if(a=e.hspace.value){c.style.marginLeft=
a+"px";c.style.marginRight=a+"px"}}if(b=="vspace"){d.setStyle(c,"marginTop","");d.setStyle(c,"marginBottom","");if(a=e.vspace.value){c.style.marginTop=a+"px";c.style.marginBottom=a+"px"}}d.get("style").value=d.serializeStyle(d.parseStyle(c.style.cssText),"img")}},changeMouseMove:function(){},showPreviewImage:function(b,d){if(b){!d&&tinyMCEPopup.getParam("advimage_update_dimensions_onchange",true)&&this.resetImageData();b=tinyMCEPopup.editor.documentBaseURI.toAbsolute(b);d?tinyMCEPopup.dom.setHTML("prev",
'<img id="previewImg" src="'+b+'" border="0" onload="ImageDialog.updateImageData(this, 1);" />'):tinyMCEPopup.dom.setHTML("prev",'<img id="previewImg" src="'+b+'" border="0" onload="ImageDialog.updateImageData(this);" onerror="ImageDialog.resetImageData();" />')}else tinyMCEPopup.dom.setHTML("prev","")}};ImageDialog.preInit();tinyMCEPopup.onInit.add(ImageDialog.init,ImageDialog);
