(function() {
    tinymce.create("tinymce.plugins.FullPagePlugin", {init:function(a, b) {
        var c = this;
        c.editor = a;
        a.addCommand("mceFullPageProperties", function() {
            a.windowManager.open({file:b + "/fullpage.htm",width:430 + parseInt(a.getLang("fullpage.delta_width", 0)),height:495 + parseInt(a.getLang("fullpage.delta_height", 0)),inline:1}, {plugin_url:b,head_html:c.head})
        });
        a.addButton("fullpage", {title:"fullpage.desc",cmd:"mceFullPageProperties"});
        a.onBeforeSetContent.add(c._setContent, c);
        a.onSetContent.add(c._setBodyAttribs, c);
        a.onGetContent.add(c._getContent, c)
    },getInfo:function() {
        return{longname:"Fullpage",author:"Moxiecode Systems AB",authorurl:"http://tinymce.moxiecode.com",infourl:"http://wiki.moxiecode.com/index.php/TinyMCE:Plugins/fullpage",version:tinymce.majorVersion + "." + tinymce.minorVersion}
    },_setBodyAttribs:function(e, a) {
        var p,d,g,l,b,m,n,h = this.head.match(/body(.*?)>/i),j = "",c,f = this.head.match(/<html([^>]*?)>/i);
        if (h && h[1]) {
            p = h[1].match(/\s*(\w+\s*=\s*".*?"|\w+\s*=\s*'.*?'|\w+\s*=\s*\w+|\w+)\s*/g);
            if (p) {
                for (d = 0,g = p.length; d < g; d++) {
                    l = p[d].split("=");
                    b = l[0].replace(/\s/, "");
                    m = l[1];
                    if (m) {
                        m = m.replace(/^\s+/, "").replace(/\s+$/, "");
                        n = m.match(/^["'](.*)["']$/);
                        if (n) {
                            m = n[1]
                        }
                        if (b == "dir") {
                            j = m
                        }
                    } else {
                        m = b
                    }
                    e.dom.setAttrib(e.getBody(), "style", m)
                }
            }
        }
        if (j == "" && f && f[1]) {
            c = f[1].match(/dir\s*=\s*["']([^"']*)["']/i);
            if (c && c[1]) {
                j = c[1]
            }
        }
        bd = e.getBody();
        bd.setAttribute("dir", j)
    },_createSerializer:function() {
        return new tinymce.dom.Serializer({dom:this.editor.dom,indent:true,apply_source_formatting:true,indent_before:"p,h1,h2,h3,h4,h5,h6,blockquote,div,title,style,pre,script,td,ul,li,area,title,meta,head",indent_after:"p,h1,h2,h3,h4,h5,h6,blockquote,div,title,style,pre,script,td,ul,li,area,title,meta,head"})
    },_setContent:function(d, b) {
        var h = this,a,j,f = b.content,g,i = "";
        if (b.format == "raw" && h.head) {
            return
        }
        if (b.source_view && d.getParam("fullpage_hide_in_source_view")) {
            return
        }
        f = f.replace(/<(\/?)BODY/gi, "<$1body");
        a = f.indexOf("<body");
        if (a != -1) {
            a = f.indexOf(">", a);
            h.head = f.substring(0, a + 1);
            j = f.indexOf("</body", a);
            if (j == -1) {
                j = f.length
            }
            b.content = f.substring(a + 1, j);
            h.foot = f.substring(j);
            function e(c) {
                return c.replace(/<\/?[A-Z]+/g, function(k) {
                    return k.toLowerCase()
                })
            }

            h.head = e(h.head);
            h.foot = e(h.foot)
        } else {
            h.head = "";
            if (d.getParam("fullpage_default_xml_pi")) {
                h.head += '<?xml version="1.0" encoding="' + d.getParam("fullpage_default_encoding", "ISO-8859-1") + '" ?>\n'
            }
            h.head += d.getParam("fullpage_default_doctype", '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">');
            h.head += "\n<html>\n<head>\n<title>" + d.getParam("fullpage_default_title", "Untitled document") + "</title>\n";
            if (g = d.getParam("fullpage_default_encoding")) {
                h.head += '<meta http-equiv="Content-Type" content="' + g + '" />\n'
            }
            if (g = d.getParam("fullpage_default_font_family")) {
                i += "font-family: " + g + ";"
            }
            if (g = d.getParam("fullpage_default_font_size")) {
                i += "font-size: " + g + ";"
            }
            if (g = d.getParam("fullpage_default_text_color")) {
                i += "color: " + g + ";"
            }
            h.head += "</head>\n<body" + (i ? ' style="' + i + '"' : "") + ">\n";
            h.foot = "\n</body>\n</html>"
        }
    },_getContent:function(a, c) {
        var b = this;
        if (!c.source_view || !a.getParam("fullpage_hide_in_source_view")) {
            c.content = tinymce.trim(b.head) + "\n" + tinymce.trim(c.content) + "\n" + tinymce.trim(b.foot)
        }
    }});
    tinymce.PluginManager.add("fullpage", tinymce.plugins.FullPagePlugin)
})();