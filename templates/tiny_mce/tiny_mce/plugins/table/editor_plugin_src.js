(function(z){function K(q,o,H){function I(a,c){a=a.cloneNode(c);a.removeAttribute("id");return a}function G(){var a=0;m=[];r(["thead","tbody","tfoot"],function(c){var e=o.select("> "+c+" tr",q);r(e,function(h,f){f+=a;r(o.select("> td, > th",h),function(d,g){var l,A,E,J;if(m[f])for(;m[f][g];)g++;E=b(d,"rowspan");J=b(d,"colspan");for(A=f;A<f+E;A++){m[A]||(m[A]=[]);for(l=g;l<g+J;l++)m[A][l]={part:c,real:A==f&&l==g,elm:d,rowspan:E,colspan:J}}})});a+=e.length})}function F(a,c){var e;if(e=m[c])return e[a]}
function b(a,c){return parseInt(a.getAttribute(c)||1)}function k(a,c,e){if(a){e=parseInt(e);e===1?a.removeAttribute(c,1):a.setAttribute(c,e,1)}}function s(a){return o.hasClass(a.elm,"mceSelected")||a==B}function u(){var a=[];r(q.rows,function(c){r(c.cells,function(e){if(o.hasClass(e,"mceSelected")||e==B.elm){a.push(c);return false}})});return a}function t(a){var c;z.walk(a,function(e){var h;if(e.nodeType==3){r(o.getParents(e.parentNode,null,a).reverse(),function(f){f=I(f,false);if(c)h&&h.appendChild(f);
else c=h=f;h=f});if(h)h.innerHTML=z.isIE?"&nbsp;":'<br data-mce-bogus="1" />';return false}},"childNodes");a=I(a,false);k(a,"rowspan",1);k(a,"colspan",1);if(c)a.appendChild(c);else if(!z.isIE)a.innerHTML='<br data-mce-bogus="1" />';return a}function w(){var a=o.createRng();r(o.select("tr",q),function(c){c.cells.length==0&&o.remove(c)});if(o.select("tr",q).length==0){a.setStartAfter(q);a.setEndAfter(q);H.setRng(a);o.remove(q)}else{r(o.select("thead,tbody,tfoot",q),function(c){c.rows.length==0&&o.remove(c)});
G();if(row=m[Math.min(m.length-1,v.y)]){H.select(row[Math.min(row.length-1,v.x)].elm,true);H.collapse(true)}}}function p(a,c,e,h){var f,d,g,l,A;f=m[c][a].elm.parentNode;for(g=1;g<=e;g++)if(f=o.getNext(f,"tr")){for(d=a;d>=0;d--){A=m[c+g][d].elm;if(A.parentNode==f){for(l=1;l<=h;l++)o.insertAfter(t(A),A);break}}if(d==-1)for(l=1;l<=h;l++)f.insertBefore(t(f.cells[0]),f.cells[0])}}function n(){r(m,function(a,c){r(a,function(e,h){var f,d,g;if(s(e)){e=e.elm;f=b(e,"colspan");d=b(e,"rowspan");if(f>1||d>1){k(e,
"rowspan",1);k(e,"colspan",1);for(g=0;g<f-1;g++)o.insertAfter(t(e),e);p(h,c,d-1,f)}}})})}function j(a){var c;r(m,function(e,h){r(e,function(f,d){if(f.elm==a){c={x:d,y:h};return false}});return!c});return c}function C(){var a,c;a=c=0;r(m,function(e,h){r(e,function(f,d){var g,l;if(s(f)){f=m[h][d];if(d>a)a=d;if(h>c)c=h;if(f.real){g=f.colspan-1;l=f.rowspan-1;if(g)if(d+g>a)a=d+g;if(l)if(h+l>c)c=h+l}}})});return{x:a,y:c}}var m,v,D,B;G();if(B=o.getParent(H.getStart(),"th,td")){v=j(B);D=C();B=F(v.x,v.y)}z.extend(this,
{deleteTable:function(){var a=o.createRng();a.setStartAfter(q);a.setEndAfter(q);H.setRng(a);o.remove(q)},split:n,merge:function(a,c,e){var h,f,d,g,l,A;if(a){pos=j(a);h=pos.x;a=pos.y;c=h+(c-1);e=a+(e-1)}else{h=v.x;a=v.y;c=D.x;e=D.y}g=F(h,a);f=F(c,e);if(g&&f&&g.part==f.part){n();G();g=F(h,a).elm;k(g,"colspan",c-h+1);k(g,"rowspan",e-a+1);for(d=a;d<=e;d++)for(f=h;f<=c;f++){a=m[d][f].elm;if(a!=g){l=z.grep(a.childNodes);r(l,function(E){g.appendChild(E)});if(l.length){l=z.grep(g.childNodes);A=0;r(l,function(E){E.nodeName==
"BR"&&o.getAttrib(E,"data-mce-bogus")&&A++<l.length-1&&g.removeChild(E)})}o.remove(a)}}w()}},insertRow:function(a){var c,e,h,f,d,g,l;r(m,function(A,E){r(A,function(J){if(s(J)){J=J.elm;d=J.parentNode;g=I(d,false);c=E;if(a)return false}});if(a)return!c});for(f=0;f<m[0].length;f++){e=m[c][f].elm;if(e!=h){if(a){if(c>0&&m[c-1][f]){l=m[c-1][f].elm;rowSpan=b(l,"rowspan");if(rowSpan>1){k(l,"rowspan",rowSpan+1);continue}}}else{rowSpan=b(e,"rowspan");if(rowSpan>1){k(e,"rowspan",rowSpan+1);continue}}h=t(e);
k(h,"colspan",e.colSpan);g.appendChild(h);h=e}}if(g.hasChildNodes())a?d.parentNode.insertBefore(g,d):o.insertAfter(g,d)},insertCol:function(a){var c,e;r(m,function(h){r(h,function(f,d){if(s(f)){c=d;if(a)return false}});if(a)return!c});r(m,function(h,f){var d=h[c].elm,g,l;if(d!=e){l=b(d,"colspan");g=b(d,"rowspan");if(l==1){a?d.parentNode.insertBefore(t(d),d):o.insertAfter(t(d),d);p(c,f,g-1,l)}else k(d,"colspan",d.colSpan+1);e=d}})},deleteCols:function(){var a=[];r(m,function(c){r(c,function(e,h){if(s(e)&&
z.inArray(a,h)===-1){r(m,function(f){f=f[h].elm;var d;d=b(f,"colspan");d>1?k(f,"colspan",d-1):o.remove(f)});a.push(h)}})});w()},deleteRows:function(){function a(e){var h,f;o.getNext(e,"tr");r(e.cells,function(d){var g=b(d,"rowspan");if(g>1){k(d,"rowspan",g-1);h=j(d);p(h.x,h.y,1,1)}});h=j(e.cells[0]);r(m[h.y],function(d){var g;d=d.elm;if(d!=f){g=b(d,"rowspan");g<=1?o.remove(d):k(d,"rowspan",g-1);f=d}})}var c;c=u();r(c.reverse(),function(e){a(e)});w()},cutRows:function(){var a=u();o.remove(a);w();return a},
copyRows:function(){var a=u();r(a,function(c,e){a[e]=I(c,true)});return a},pasteRows:function(a,c){var e=u(),h=e[c?0:e.length-1],f=h.cells.length;r(m,function(d){var g;f=0;r(d,function(l){if(l.real)f+=l.colspan;if(l.elm.parentNode==h)g=1});if(g)return false});c||a.reverse();r(a,function(d){var g=d.cells.length,l;for(i=0;i<g;i++){l=d.cells[i];k(l,"colspan",1);k(l,"rowspan",1)}for(i=g;i<f;i++)d.appendChild(t(d.cells[g-1]));for(i=f;i<g;i++)o.remove(d.cells[i]);c?h.parentNode.insertBefore(d,h):o.insertAfter(d,
h)})},getPos:j,setStartCell:function(a){v=j(a)},setEndCell:function(a){var c,e,h,f,d,g,l;D=j(a);if(v&&D){c=Math.min(v.x,D.x);e=Math.min(v.y,D.y);h=Math.max(v.x,D.x);f=Math.max(v.y,D.y);d=h;g=f;for(y=e;y<=g;y++){a=m[y][c];if(!a.real)if(c-(a.colspan-1)<c)c-=a.colspan-1}for(x=c;x<=d;x++){a=m[e][x];if(!a.real)if(e-(a.rowspan-1)<e)e-=a.rowspan-1}for(y=e;y<=f;y++)for(x=c;x<=h;x++){a=m[y][x];if(a.real){l=a.colspan-1;a=a.rowspan-1;if(l)if(x+l>d)d=x+l;if(a)if(y+a>g)g=y+a}}o.removeClass(o.select("td.mceSelected,th.mceSelected"),
"mceSelected");for(y=e;y<=g;y++)for(x=c;x<=d;x++)o.addClass(m[y][x].elm,"mceSelected")}}})}var r=z.each;z.create("tinymce.plugins.TablePlugin",{init:function(q,o){function H(b){var k=q.selection;if(b=q.dom.getParent(b||k.getNode(),"table"))return new K(b,q.dom,k)}function I(){q.getBody().style.webkitUserSelect="";q.dom.removeClass(q.dom.select("td.mceSelected,th.mceSelected"),"mceSelected")}var G,F;r([["table","table.desc","mceInsertTable",true],["delete_table","table.del","mceTableDelete"],["delete_col",
"table.delete_col_desc","mceTableDeleteCol"],["delete_row","table.delete_row_desc","mceTableDeleteRow"],["col_after","table.col_after_desc","mceTableInsertColAfter"],["col_before","table.col_before_desc","mceTableInsertColBefore"],["row_after","table.row_after_desc","mceTableInsertRowAfter"],["row_before","table.row_before_desc","mceTableInsertRowBefore"],["row_props","table.row_desc","mceTableRowProps",true],["cell_props","table.cell_desc","mceTableCellProps",true],["split_cells","table.split_cells_desc",
"mceTableSplitCells",true],["merge_cells","table.merge_cells_desc","mceTableMergeCells",true]],function(b){q.addButton(b[0],{title:b[1],cmd:b[2],ui:b[3]})});z.isIE||q.onClick.add(function(b,k){k=k.target;k.nodeName==="TABLE"&&b.selection.select(k)});q.onPreProcess.add(function(b,k){var s,u,t,w=b.dom,p;s=w.select("table",k.node);for(u=s.length;u--;){t=s[u];w.setAttrib(t,"data-mce-style","");if(p=w.getAttrib(t,"width")){w.setStyle(t,"width",p);w.setAttrib(t,"width","")}if(p=w.getAttrib(t,"height")){w.setStyle(t,
"height",p);w.setAttrib(t,"height","")}}});q.onNodeChange.add(function(b,k,s){s=b.selection.getStart();b=b.dom.getParent(s,"td,th,caption");k.setActive("table",s.nodeName==="TABLE"||!!b);if(b&&b.nodeName==="CAPTION")b=0;k.setDisabled("delete_table",!b);k.setDisabled("delete_col",!b);k.setDisabled("delete_table",!b);k.setDisabled("delete_row",!b);k.setDisabled("col_after",!b);k.setDisabled("col_before",!b);k.setDisabled("row_after",!b);k.setDisabled("row_before",!b);k.setDisabled("row_props",!b);k.setDisabled("cell_props",
!b);k.setDisabled("split_cells",!b);k.setDisabled("merge_cells",!b)});q.onInit.add(function(b){var k,s,u=b.dom,t;G=b.windowManager;b.onMouseDown.add(function(p,n){if(n.button!=2){I();s=u.getParent(n.target,"td,th");k=u.getParent(s,"table")}});u.bind(b.getDoc(),"mouseover",function(p){var n,j=p.target;if(s&&(t||j!=s)&&(j.nodeName=="TD"||j.nodeName=="TH")){n=u.getParent(j,"table");if(n==k){if(!t){t=H(n);t.setStartCell(s);b.getBody().style.webkitUserSelect="none"}t.setEndCell(j)}n=b.selection.getSel();
n.removeAllRanges?n.removeAllRanges():n.empty();p.preventDefault()}});b.onMouseUp.add(function(p){var n,j=p.selection,C;j.getSel();var m,v;if(s){if(t)p.getBody().style.webkitUserSelect="";var D=function(B,a){var c=new z.dom.TreeWalker(B,B);do{if(B.nodeType==3&&z.trim(B.nodeValue).length!=0){a?n.setStart(B,0):n.setEnd(B,B.nodeValue.length);break}if(B.nodeName=="BR"){a?n.setStartBefore(B):n.setEndBefore(B);break}}while(B=a?c.next():c.prev())};C=u.select("td.mceSelected,th.mceSelected");if(C.length>
0){n=u.createRng();m=C[0];D(m,1);C=new z.dom.TreeWalker(m,u.getParent(C[0],"table"));do if(m.nodeName=="TD"||m.nodeName=="TH"){if(!u.hasClass(m,"mceSelected"))break;v=m}while(m=C.next());D(v);j.setRng(n)}p.nodeChanged();s=t=k=null}});b.onKeyUp.add(function(){I()});b&&b.plugins.contextmenu&&b.plugins.contextmenu.onContextMenu.add(function(p,n,j){p=b.selection.getNode()||b.getBody();if(b.dom.getParent(j,"td")||b.dom.getParent(j,"th")||b.dom.select("td.mceSelected,th.mceSelected").length){n.removeAll();
if(p.nodeName=="A"&&!b.dom.getAttrib(p,"name")){n.add({title:"advanced.link_desc",icon:"link",cmd:b.plugins.advlink?"mceAdvLink":"mceLink",ui:true});n.add({title:"advanced.unlink_desc",icon:"unlink",cmd:"UnLink"});n.addSeparator()}if(p.nodeName=="IMG"&&p.className.indexOf("mceItem")==-1){n.add({title:"advanced.image_desc",icon:"image",cmd:b.plugins.advimage?"mceAdvImage":"mceImage",ui:true});n.addSeparator()}n.add({title:"table.desc",icon:"table",cmd:"mceInsertTable",value:{action:"insert"}});n.add({title:"table.props_desc",
icon:"table_props",cmd:"mceInsertTable"});n.add({title:"table.del",icon:"delete_table",cmd:"mceTableDelete"});n.addSeparator();j=n.addMenu({title:"table.cell"});j.add({title:"table.cell_desc",icon:"cell_props",cmd:"mceTableCellProps"});j.add({title:"table.split_cells_desc",icon:"split_cells",cmd:"mceTableSplitCells"});j.add({title:"table.merge_cells_desc",icon:"merge_cells",cmd:"mceTableMergeCells"});j=n.addMenu({title:"table.row"});j.add({title:"table.row_desc",icon:"row_props",cmd:"mceTableRowProps"});
j.add({title:"table.row_before_desc",icon:"row_before",cmd:"mceTableInsertRowBefore"});j.add({title:"table.row_after_desc",icon:"row_after",cmd:"mceTableInsertRowAfter"});j.add({title:"table.delete_row_desc",icon:"delete_row",cmd:"mceTableDeleteRow"});j.addSeparator();j.add({title:"table.cut_row_desc",icon:"cut",cmd:"mceTableCutRow"});j.add({title:"table.copy_row_desc",icon:"copy",cmd:"mceTableCopyRow"});j.add({title:"table.paste_row_before_desc",icon:"paste",cmd:"mceTablePasteRowBefore"}).setDisabled(!F);
j.add({title:"table.paste_row_after_desc",icon:"paste",cmd:"mceTablePasteRowAfter"}).setDisabled(!F);j=n.addMenu({title:"table.col"});j.add({title:"table.col_before_desc",icon:"col_before",cmd:"mceTableInsertColBefore"});j.add({title:"table.col_after_desc",icon:"col_after",cmd:"mceTableInsertColAfter"});j.add({title:"table.delete_col_desc",icon:"delete_col",cmd:"mceTableDeleteCol"})}else n.add({title:"table.desc",icon:"table",cmd:"mceInsertTable"})});if(!z.isIE){var w=function(){var p;for(p=b.getBody().lastChild;p&&
p.nodeType==3&&!p.nodeValue.length;p=p.previousSibling);p&&p.nodeName=="TABLE"&&b.dom.add(b.getBody(),"p",null,'<br mce_bogus="1" />')};z.isGecko&&b.onKeyDown.add(function(p,n){var j,C,m=p.dom;if(n.keyCode==37||n.keyCode==38){j=p.selection.getRng();if((C=m.getParent(j.startContainer,"table"))&&p.getBody().firstChild==C){var v=j,D=C.ownerDocument;j=D.createRange();j.setStartBefore(C);j.setEnd(v.endContainer,v.endOffset);v=D.createElement("body");v.appendChild(j.cloneContents());if(v.innerHTML.replace(/<(br|img|object|embed|input|textarea)[^>]*>/gi,
"-").replace(/<[^>]+>/g,"").length==0){j=m.createRng();j.setStartBefore(C);j.setEndBefore(C);p.selection.setRng(j);n.preventDefault()}}}});b.onKeyUp.add(w);b.onSetContent.add(w);b.onVisualAid.add(w);b.onPreProcess.add(function(p,n){var j=n.node.lastChild;j&&j.childNodes.length==1&&j.firstChild.nodeName=="BR"&&p.dom.remove(j)});w()}});r({mceTableSplitCells:function(b){b.split()},mceTableMergeCells:function(b){var k,s,u;if(u=q.dom.getParent(q.selection.getNode(),"th,td")){k=u.rowSpan;s=u.colSpan}q.dom.select("td.mceSelected,th.mceSelected").length?
b.merge():G.open({url:o+"/merge_cells.htm",width:240+parseInt(q.getLang("table.merge_cells_delta_width",0)),height:110+parseInt(q.getLang("table.merge_cells_delta_height",0)),inline:1},{rows:k,cols:s,onaction:function(t){b.merge(u,t.cols,t.rows)},plugin_url:o})},mceTableInsertRowBefore:function(b){b.insertRow(true)},mceTableInsertRowAfter:function(b){b.insertRow()},mceTableInsertColBefore:function(b){b.insertCol(true)},mceTableInsertColAfter:function(b){b.insertCol()},mceTableDeleteCol:function(b){b.deleteCols()},
mceTableDeleteRow:function(b){b.deleteRows()},mceTableCutRow:function(b){F=b.cutRows()},mceTableCopyRow:function(b){F=b.copyRows()},mceTablePasteRowBefore:function(b){b.pasteRows(F,true)},mceTablePasteRowAfter:function(b){b.pasteRows(F)},mceTableDelete:function(b){b.deleteTable()}},function(b,k){q.addCommand(k,function(){var s=H();if(s){b(s);q.execCommand("mceRepaint");I()}})});r({mceInsertTable:function(b){G.open({url:o+"/table.htm",width:400+parseInt(q.getLang("table.table_delta_width",0)),height:320+
parseInt(q.getLang("table.table_delta_height",0)),inline:1},{plugin_url:o,action:b?b.action:0})},mceTableRowProps:function(){G.open({url:o+"/row.htm",width:400+parseInt(q.getLang("table.rowprops_delta_width",0)),height:295+parseInt(q.getLang("table.rowprops_delta_height",0)),inline:1},{plugin_url:o})},mceTableCellProps:function(){G.open({url:o+"/cell.htm",width:400+parseInt(q.getLang("table.cellprops_delta_width",0)),height:295+parseInt(q.getLang("table.cellprops_delta_height",0)),inline:1},{plugin_url:o})}},
function(b,k){q.addCommand(k,function(s,u){b(u)})})}});z.PluginManager.add("table",z.plugins.TablePlugin)})(tinymce);
