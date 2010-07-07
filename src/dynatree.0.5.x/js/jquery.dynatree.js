/*************************************************************************
	jquery.dynatree.js
	Dynamic tree view control, with support for lazy loading of branches.

	Copyright (c) 2008-2010,  Martin Wendt (http://wwWendt.de)
	Dual licensed under the MIT or GPL Version 2 licenses.
	http://code.google.com/p/dynatree/wiki/LicenseInfo
	
	A current version and some documentation is available at
		http://dynatree.googlecode.com/

	$Version:$
	$Revision:$

 	@depends: jquery-1.4.2.min.js
 	@depends: jquery.ui.core.js
    @depends: jquery.cookie.js
*************************************************************************/


/*************************************************************************
 *	Debug functions
 */

var _canLog = true;

function _log(mode, msg) {
	/**
	 * Usage: logMsg("%o was toggled", this);
	 */
	if( !_canLog ) 
		return;
	// Remove first argument
	var args = Array.prototype.slice.apply(arguments, [1]); 
	// Prepend timestamp
	var dt = new Date();
	var tag = dt.getHours()+":"+dt.getMinutes()+":"+dt.getSeconds()+"."+dt.getMilliseconds();
	args[0] = tag + " - " + args[0];

	try {
		switch( mode ) {
		case "info":
			window.console.info.apply(window.console, args);
			break;
		case "warn":
			window.console.warn.apply(window.console, args);
			break;
		default:
			window.console.log.apply(window.console, args);
		}
	} catch(e) {
		if( !window.console )
			_canLog = false; // Permanently disable, when logging is not supported by the browser 
	}
}

function logMsg(msg) {
	Array.prototype.unshift.apply(arguments, ["debug"]);
	_log.apply(this, arguments);
}


// Forward declaration
var getDynaTreePersistData = undefined;



/*************************************************************************
 *	Constants
 */
var DTNodeStatus_Error   = -1;
var DTNodeStatus_Loading = 1;
var DTNodeStatus_Ok      = 0;


// Start of local namespace
;(function($) {

/*************************************************************************
 *	Common tool functions.
 */

var Class = {
	create: function() {
		return function() {
			this.initialize.apply(this, arguments);
		}
	}
}

// Tool function to get dtnode from the event target:
function getDtNodeFromElement(el) {
	var iMax = 5;
	while( el && iMax-- ) {
		if( el.dtnode ) return el.dtnode;
		el = el.parentNode;
	};
	return null;
}


/*************************************************************************
 *	Class DynaTreeNode
 */
var DynaTreeNode = Class.create();

DynaTreeNode.prototype = {
	initialize: function(parent, tree, data) {
		/**
		 * @constructor 
		 */
		this.parent = parent; 
		this.tree = tree;
		if ( typeof data == "string" ) 
			data = { title: data };
		if( data.key == undefined )
			data.key = "_" + tree._nodeCount++;
		this.data = $.extend({}, $.ui.dynatree.nodedatadefaults, data);
//		this.div = null; // not yet created
		this.li = null; // not yet created
		this.span = null; // not yet created
		this.ul = null; // not yet created
		this.childList = null; // no subnodes yet
//		this.isRead = false; // Lazy content not yet read
		this.isLoading = false; // Lazy content is being loaded
		this.hasSubSel = false;
	},

	toString: function() {
		return "dtnode<" + this.data.key + ">: '" + this.data.title + "'";
	},

	toDict: function(recursive, callback) {
		var dict = $.extend({}, this.data);
		dict.activate = ( this.tree.activeNode === this );
		dict.focus = ( this.tree.focusNode === this );
		dict.expand = this.bExpanded;
		dict.select = this.bSelected;
		if( callback )
			callback(dict);
		if( recursive && this.childList ) {
			dict.children = [];
			for(var i=0; i<this.childList.length; i++ )
				dict.children.push(this.childList[i].toDict(true, callback));
		} else {
			delete dict.children;
		}
		return dict;
	},

	_getInnerHtml: function() {
		var opts = this.tree.options;
		var cache = this.tree.cache;
		// parent connectors
//		var rootParent = opts.rootVisible ? null : this.tree.tnRoot; 
//		var bHideFirstExpander = (opts.rootVisible && opts.minExpandLevel>0) || opts.minExpandLevel>1;
//		var bHideFirstConnector = opts.rootVisible || opts.minExpandLevel>0;
		var level = this.getLevel();
		var res = "";
/*		
		var p = this.parent;
		while( p ) {
			// Suppress first connector column, if visible top level is always expanded
			if ( bHideFirstConnector && p==rootParent  )
				break;
			res = ( p.isLastSibling() ? cache.tagEmpty : cache.tagVline) + res;
			p = p.parent;
		}
*/
		// connector (expanded, expandable or simple)
		
		if( level < opts.minExpandLevel ) { 
			// skip expander/connector
		} else if ( this.childList || this.data.isLazy ) {
   			res += cache.tagExpander;
		} else {
   			res += cache.tagConnector;
		}
		
		// Checkbox mode
		if( opts.checkbox && this.data.hideCheckbox!=true && !this.data.isStatusNode ) {
   			res += cache.tagCheckbox;
		}
		
		// folder or doctype icon
   		if ( this.data.icon ) {
    		res += "<img src='" + opts.imagePath + this.data.icon + "' alt='' />";
   		} else if ( this.data.icon == false ) {
        	// icon == false means 'no icon'
		} else {
        	// icon == null means 'default icon'
   			res += cache.tagNodeIcon;
		}

		// node name
		var tooltip = ( this.data && typeof this.data.tooltip == "string" ) ? " title='" + this.data.tooltip + "'" : "";
		res +=  "<a href='#' class='" + opts.classNames.title + "'" + tooltip + ">" + this.data.title + "</a>";
		return res;
	},


	_fixOrder: function() {
		/**
		 * Make sure, that <li> order matches childList order.
		 */
		var cl = this.childList; 
		if( !cl )
			return;
		var childLI = this.ul.firstChild;
		for(var i=0; i<cl.length-1; i++) {
			var childNode1 = cl[i]; 
			var childNode2 = childLI.dtnode;
			if( childNode1 !== childNode2 ) {
				this.tree.logDebug("_fixOrder: mismatch at index " + i + ": " + childNode1 + " != " + childNode2);
				this.ul.insertBefore(childNode1.li, childNode2.li);
			} else {
				childLI = childLI.nextSibling;
			}
		}
	},
	

	render: function(useEffects) {
		/**
		 * create <li><span>..</span> .. </li> tags for this node.
		 * 
		 * <li id='key'> // This div contains the node's span and list of child div's.
		 *   <span class='title'>S S S A</span> // Span contains graphic spans and title <a> tag 
		 *   <ul> // only present, when node has children
		 *   	<li>child1</li>
		 *   	<li>child2</li>
		 *   </ul>
		 * </li>
		 */
		this.tree.logDebug("%o.render(%s)", this, useEffects);
		// --- 
		var opts = this.tree.options;
		var cn = opts.classNames;
		var isLastSib = this.isLastSibling();

		if( !this.parent && !this.ul ) {
			// Root node has only a <ul>
			this.li = this.span = null;
			this.ul = document.createElement("ul");
			if( opts.minExpandLevel > 1 )
				this.ul.className = cn.container + " " + cn.noConnector;
			else
				this.ul.className = cn.container;

		} else if( this.parent ) {
			// Create <li><span /> </li>
			if( ! this.li ) {
				this.li = document.createElement("li");
				this.li.dtnode = this;
				if( this.data.key && opts.generateIds )
					this.li.id = opts.idPrefix + this.data.key;
	
				this.span = document.createElement("span");
				this.span.className = cn.title;
				this.li.appendChild(this.span);
				
				if( !this.parent.ul ) {
					// This is the parent's first child: create UL tag
					// (Hidden, because it will be 
					this.parent.ul = document.createElement("ul");
					this.parent.ul.style.display = "none";
					this.parent.li.appendChild(this.parent.ul);
				}
				this.parent.ul.appendChild(this.li); 
			}
			// set node connector images, links and text
			this.span.innerHTML = this._getInnerHtml();
	
			// Set classes for current status
			var cnList = [];
			cnList.push(cn.node);
			if( this.data.isFolder ) 
				cnList.push(cn.folder);
			if( this.bExpanded )
				cnList.push(cn.expanded);
			if( this.childList != null )
				cnList.push(cn.hasChildren);
//			if( this.data.isLazy && !this.isRead )
			if( this.data.isLazy && this.childList==null )
				cnList.push(cn.lazy);
			if( this.isLastSib )
				cnList.push(cn.lastsib);
			if( this.bSelected )
				cnList.push(cn.selected);
			if( this.hasSubSel )
				cnList.push(cn.partsel);
			if( this.tree.activeNode === this )
				cnList.push(cn.active);
			if( this.data.addClass )
				cnList.push(this.data.addClass);
			// IE6 doesn't correctly evaluate multiple class names,
			// so we create combined class names that can be used in the CSS
			cnList.push(cn.combinedExpanderPrefix
					+ (this.bExpanded ? "e" : "c")
					+ (this.data.isLazy && this.childList==null ? "d" : "")
					+ (isLastSib ? "l" : "")
					);
			cnList.push(cn.combinedIconPrefix
					+ (this.bExpanded ? "e" : "c")
					+ (this.data.isFolder ? "f" : "")
					);
			this.span.className = cnList.join(" ");

			if( isLastSib )
				this.li.className = "dynatree-lastsib";
			
			// Hide children, if node is collapsed
//			this.ul.style.display = ( this.bExpanded || !this.parent ) ? "" : "none";
		}

		if( this.bExpanded && this.childList ) {
			for(var i=0; i<this.childList.length; i++) {
				this.childList[i].render();
			}
			this._fixOrder();
		}
		// Hide children, if node is collapsed
		if( this.ul ) {
			var isHidden = (this.ul.style.display == "none");
//			logMsg("isHidden:%s", isHidden);
			if( useEffects && opts.fx && !!isHidden == !!this.bExpanded ) {
				var duration = opts.fx.duration || 200;
				$(this.ul).animate(opts.fx, duration);
			} else {
				this.ul.style.display = ( this.bExpanded || !this.parent ) ? "" : "none";
			}
		}
	},

	getParent: function() {
		return this.parent;
	},

	getChildren: function() {
		return this.childList;
	},

	hasChildren: function() {
		return this.childList != null;
	},

	isLastSibling: function() {
		var p = this.parent;
		if ( !p ) return true;
		return p.childList[p.childList.length-1] === this;
	},

	getPrevSibling: function() {
		if( !this.parent ) return null;
		var ac = this.parent.childList;
		for(var i=1; i<ac.length; i++) // start with 1, so prev(first) = null
			if( ac[i] === this )
				return ac[i-1];
		return null;
	},

	getNextSibling: function() {
		if( !this.parent ) return null;
		var ac = this.parent.childList;
		for(var i=0; i<ac.length-1; i++) // up to length-2, so next(last) = null
			if( ac[i] === this )
				return ac[i+1];
		return null;
	},

	_setStatusNode: function(data) {
		// Create, modify or remove the status child node (pass 'null', to remove it).
		var firstChild = ( this.childList ? this.childList[0] : null );
		if( !data ) {
			if ( firstChild ) {
//				this.div.removeChild(firstChild.div);
				this.ul.removeChild(firstChild.li);
				if( this.childList.length == 1 )
					this.childList = null;
				else
					this.childList.shift();
			}
		} else if ( firstChild ) {
			data.isStatusNode = true;
			firstChild.data = data;
			firstChild.render();
		} else {
			data.isStatusNode = true;
			firstChild = this.addChild(data);
		}
	},

	setLazyNodeStatus: function(lts, opts) {
		var tooltip = (opts && opts.tooltip) ? opts.tooltip : null;
		var info = (opts && opts.info) ? " (" + opts.info + ")" : "";
		switch( lts ) {
			case DTNodeStatus_Ok:
				this._setStatusNode(null);
//				this.isRead = true;
				this.isLoading = false;
				this.render();
				if( this.tree.options.autoFocus ) {
//					if( this === this.tree.tnRoot && !this.tree.options.rootVisible && this.childList ) {
					if( this === this.tree.tnRoot && this.childList ) {
						// special case: using ajaxInit
						this.childList[0].focus();
					} else {
						this.focus();
					}
				}
				break;
			case DTNodeStatus_Loading:
				this.isLoading = true;
				this._setStatusNode({
					title: this.tree.options.strings.loading + info,
					tooltip: tooltip,
					addClass: this.tree.options.classNames.nodeWait
				});
				break;
			case DTNodeStatus_Error:
				this.isLoading = false;
				this._setStatusNode({
					title: this.tree.options.strings.loadError + info,
					tooltip: tooltip,
					addClass: this.tree.options.classNames.nodeError
				});
				break;
			default:
				throw "Bad LazyNodeStatus: '" + lts + "'.";
		}
	},

	_parentList: function(includeRoot, includeSelf) {
		var l = [];
		var dtn = includeSelf ? this : this.parent;
		while( dtn ) {
			if( includeRoot || dtn.parent )
				l.unshift(dtn);
			dtn = dtn.parent;
		};
		return l;
	},

	getLevel: function() {
		/**
		 * Return node depth. 0: System root node, 1: visible top-level node.
		 */
		var level = 0;
		var dtn = this.parent;
		while( dtn ) {
			level++;
			dtn = dtn.parent;
		};
		return level;
	},

	_getTypeForOuterNodeEvent: function(event) {
		/** Return the inner node span (title, checkbox or expander) if 
		 *  event.target points to the outer span.
		 *  This function should fix issue #93: 
		 *  FF2 ignores empty spans, when generating events (returning the parent instead).
		 */ 
		var cns = this.tree.options.classNames;
	    var target = event.target;
	    // Only process clicks on an outer node span (probably due to a FF2 event handling bug)
	    if( target.className.indexOf(cns.node)<0 ) {
	        return null
	    }
	    // Event coordinates, relative to outer node span:
	    var eventX = event.pageX - target.offsetLeft;
	    var eventY = event.pageY - target.offsetTop;
	    
	    for(var i=0; i<target.childNodes.length; i++) {
	        var cn = target.childNodes[i];
	        var x = cn.offsetLeft - target.offsetLeft;
	        var y = cn.offsetTop - target.offsetTop;
	        var nx = cn.clientWidth, ny = cn.clientHeight;
//	        alert (cn.className + ": " + x + ", " + y + ", s:" + nx + ", " + ny);
	        if( eventX>=x && eventX<=(x+nx) && eventY>=y && eventY<=(y+ny) ) {
//	            alert("HIT "+ cn.className);
	            if( cn.className==cns.title ) 
	            	return "title";
	            else if( cn.className==cns.expander ) 
	            	return "expander";
	            else if( cn.className==cns.checkbox ) 
	            	return "checkbox";
	            else if( cn.className==cns.nodeIcon ) 
	            	return "icon";
	        }
	    }
	    return "prefix";
	},

	getEventTargetType: function(event) {
		// Return the part of a node, that a click event occured on.
		// Note: there is no check, if the event was fired on TIHS node. 
		var tcn = event && event.target ? event.target.className : "";
		var cns = this.tree.options.classNames;

		if( tcn == cns.title )
			return "title";
		else if( tcn==cns.expander )
			return "expander";
		else if( tcn==cns.checkbox )
			return "checkbox";
		else if( tcn==cns.nodeIcon )
			return "icon";
		else if( tcn==cns.empty || tcn==cns.vline || tcn==cns.connector )
			return "prefix";
		else if( tcn.indexOf(cns.node)>=0 )
			// FIX issue #93
			return this._getTypeForOuterNodeEvent(event);
		return null;
	},

	isVisible: function() {
		// Return true, if all parents are expanded.
		var parents = this._parentList(true, false);
		for(var i=0; i<parents.length; i++)
			if( ! parents[i].bExpanded ) return false;
		return true;
	},

	makeVisible: function() {
		// Make sure, all parents are expanded
		var parents = this._parentList(true, false);
		for(var i=0; i<parents.length; i++)
			parents[i]._expand(true);
	},

	focus: function() {
		// TODO: check, if we already have focus
//		this.tree.logDebug("dtnode.focus(): %o", this);
		this.makeVisible();
		try {
			$(this.span).find(">a").focus();
		} catch(e) { }
	},

	_activate: function(flag, fireEvents) {
		// (De)Activate - but not focus - this node.
		this.tree.logDebug("dtnode._activate(%o, fireEvents=%o) - %o", flag, fireEvents, this);
		var opts = this.tree.options;
		if( this.data.isStatusNode )
			return;
		if ( fireEvents && opts.onQueryActivate && opts.onQueryActivate.call(this.span, flag, this) == false )
			return; // Callback returned false
		
		if( flag ) {
			// Activate
			if( this.tree.activeNode ) {
				if( this.tree.activeNode === this )
					return;
				this.tree.activeNode.deactivate();
			}
			if( opts.activeVisible )
				this.makeVisible();
			this.tree.activeNode = this;
	        if( opts.persist )
				$.cookie(opts.cookieId+"-active", this.data.key, opts.cookie);
	        this.tree.persistence.activeKey = this.data.key;
			$(this.span).addClass(opts.classNames.active);
			if ( fireEvents && opts.onActivate ) // Pass element as 'this' (jQuery convention)
				opts.onActivate.call(this.span, this);
		} else {
			// Deactivate
			if( this.tree.activeNode === this ) {
				var opts = this.tree.options;
				if ( opts.onQueryActivate && opts.onQueryActivate.call(this.span, false, this) == false )
					return; // Callback returned false
				$(this.span).removeClass(opts.classNames.active);
		        if( opts.persist ) {
		        	// Note: we don't pass null, but ''. So the cookie is not deleted.
		        	// If we pass null, we also have to pass a COPY of opts, because $cookie will override opts.expires (issue 84)
					$.cookie(opts.cookieId+"-active", "", opts.cookie);
		        }
		        this.tree.persistence.activeKey = null;
				this.tree.activeNode = null;
				if ( fireEvents && opts.onDeactivate )
					opts.onDeactivate.call(this.span, this);
			}
		}
	},

	activate: function() {
		// Select - but not focus - this node.
//		this.tree.logDebug("dtnode.activate(): %o", this);
		this._activate(true, true);
	},

	deactivate: function() {
//		this.tree.logDebug("dtnode.deactivate(): %o", this);
		this._activate(false, true);
	},

	isActive: function() {
		return (this.tree.activeNode === this);
	},
	
	_userActivate: function() {
		// Handle user click / [space] / [enter], according to clickFolderMode.
		var activate = true;
		var expand = false;
		if ( this.data.isFolder ) {
			switch( this.tree.options.clickFolderMode ) {
			case 2:
				activate = false;
				expand = true;
				break;
			case 3:
				activate = expand = true;
				break;
			}
		}
//		if( this.parent == null && this.tree.options.minExpandLevel>0 ) {
		if( this.parent == null ) {
			expand = false;
		}
		if( expand ) {
			this.toggleExpand();
			this.focus();
		} 
		if( activate ) {
			this.activate();
		}
	},

	_setSubSel: function(hasSubSel) {
		if( hasSubSel ) {
			this.hasSubSel = true;
			$(this.span).addClass(this.tree.options.classNames.partsel);
		} else {
			this.hasSubSel = false;
			$(this.span).removeClass(this.tree.options.classNames.partsel);
		}
	},

	_fixSelectionState: function() {
		// fix selection status, for multi-hier mode 
//		this.tree.logDebug("_fixSelectionState(%o) - %o", this.bSelected, this);
		if( this.bSelected ) {
			// Select all children
			this.visit(function(dtnode){
				dtnode.parent._setSubSel(true);
				dtnode._select(true, false, false);
			});
			// Select parents, if all children are selected
			var p = this.parent;
			while( p ) {
				p._setSubSel(true);
				var allChildsSelected = true;
				for(var i=0; i<p.childList.length;  i++) {
					var n = p.childList[i]; 
					if( !n.bSelected && !n.data.isStatusNode ) {
						allChildsSelected = false;
						break;
					}
				}
				if( allChildsSelected )
					p._select(true, false, false);
				p = p.parent;
			}
		} else {
			// Deselect all children
			this._setSubSel(false);
			this.visit(function(dtnode){
				dtnode._setSubSel(false);
				dtnode._select(false, false, false);
			});
			// Deselect parents, and recalc hasSubSel
			var p = this.parent;
			while( p ) {
				p._select(false, false, false);
				var isPartSel = false;
				for(var i=0; i<p.childList.length;  i++) {
					if( p.childList[i].bSelected || p.childList[i].hasSubSel ) {
						isPartSel = true;
						break;
					}
				}
				p._setSubSel(isPartSel);
				p = p.parent;
			}
		}
	},
	
	_select: function(sel, fireEvents, deep) {
		// Select - but not focus - this node.
//		this.tree.logDebug("dtnode._select(%o) - %o", sel, this);
		var opts = this.tree.options;
		if( this.data.isStatusNode )
			return;
		// 
		if( this.bSelected == sel ) {
//			this.tree.logDebug("dtnode._select(%o) IGNORED - %o", sel, this);
			return;
		}
		// Allow event listener to abort selection
		if ( fireEvents && opts.onQuerySelect && opts.onQuerySelect.call(this.span, sel, this) == false )
			return; // Callback returned false
		
		// Force single-selection
		if( opts.selectMode==1 && sel ) { 
			this.tree.visit(function(dtnode){
				if( dtnode.bSelected ) {
					// Deselect; assuming that in selectMode:1 there's max. one other selected node
					dtnode._select(false, false, false);
					return false;
				}
			});
		}

		this.bSelected = sel;
//        this.tree._changeNodeList("select", this, sel);
  
		if( sel ) {
			if( opts.persist )
				this.tree.persistence.addSelect(this.data.key);

			$(this.span).addClass(opts.classNames.selected);

			if( deep && opts.selectMode==3 )
				this._fixSelectionState();

			if ( fireEvents && opts.onSelect )
				opts.onSelect.call(this.span, true, this);

		} else {
			if( opts.persist )
				this.tree.persistence.clearSelect(this.data.key);
			
			$(this.span).removeClass(opts.classNames.selected);

	    	if( deep && opts.selectMode==3 )
				this._fixSelectionState();

	    	if ( fireEvents && opts.onSelect )
				opts.onSelect.call(this.span, false, this);
		}
	},

	select: function(sel) {
		// Select - but not focus - this node.
//		this.tree.logDebug("dtnode.select(%o) - %o", sel, this);
		if( this.data.unselectable )
			return this.bSelected;
		return this._select(sel!=false, true, true);
	},

	toggleSelect: function() {
//		this.tree.logDebug("dtnode.toggleSelect() - %o", this);
		return this.select(!this.bSelected);
	},

	isSelected: function() {
		return this.bSelected;
	},
	
	_loadContent: function() {
		try {
			var opts = this.tree.options;
			this.tree.logDebug("_loadContent: start - %o", this);
			this.setLazyNodeStatus(DTNodeStatus_Loading);
			if( true == opts.onLazyRead.call(this.span, this) ) {
				// If function returns 'true', we assume that the loading is done:
				this.setLazyNodeStatus(DTNodeStatus_Ok);
				// Otherwise (i.e. if the loading was started as an asynchronous process)
				// the onLazyRead(dtnode) handler is expected to call dtnode.setLazyNodeStatus(DTNodeStatus_Ok/_Error) when done.
				this.tree.logDebug("_loadContent: succeeded - %o", this);
			}
		} catch(e) {
			this.tree.logWarning("_loadContent: failed - %o", e);
			this.setLazyNodeStatus(DTNodeStatus_Error, {tooltip: ""+e});
		}
	},
	
	_expand: function(bExpand) {
//		this.tree.logDebug("dtnode._expand(%o) - %o", bExpand, this);
		if( this.bExpanded == bExpand ) {
//			this.tree.logDebug("dtnode._expand(%o) IGNORED - %o", bExpand, this);
			return;
		}
		var opts = this.tree.options;
		if( !bExpand && this.getLevel() < opts.minExpandLevel ) {
			this.tree.logDebug("dtnode._expand(%o) prevented collapse - %o", bExpand, this);
			return;
		}
		if ( opts.onQueryExpand && opts.onQueryExpand.call(this.span, bExpand, this) == false )
			return; // Callback returned false
		this.bExpanded = bExpand;

		// Persist expand state
		if( opts.persist ) {
	        if( bExpand )
				this.tree.persistence.addExpand(this.data.key);
			else 
				this.tree.persistence.clearExpand(this.data.key);
		}
		// Do not apply animations in init phase, or before lazy-loading
		var allowEffects = !(this.data.isLazy && this.childList==null) && !this.isLoading;
		this.render(allowEffects);

        // Auto-collapse mode: collapse all siblings
		if( this.bExpanded && this.parent && opts.autoCollapse ) {
			var parents = this._parentList(false, true);
			for(var i=0; i<parents.length; i++)
				parents[i].collapseSiblings();
		}

		// If the currently active node is now hidden, deactivate it
		if( opts.activeVisible && this.tree.activeNode && ! this.tree.activeNode.isVisible() ) {
			this.tree.activeNode.deactivate();
		}
		// Expanding a lazy node: set 'loading...' and call callback
		if( bExpand && this.data.isLazy && this.childList==null && !this.isLoading ) {
			this._loadContent();
			return;
		}
//		this.tree.logDebug("_expand: start div toggle - %o", this);
/*
		if( opts.fx ) {
			this.render(true);
			var duration = opts.fx.duration || 200;
			$(this.ul).animate(opts.fx, duration);
		} else {
			this.render();
			logMsg("_expand: got div, start toggle - %o", this);
		}
*/
		
//		this.tree.logDebug("_expand: end div toggle - %o", this);

		if ( opts.onExpand )
			opts.onExpand.call(this.span, bExpand, this);
	},

	expand: function(flag) {
		if( !this.childList && !this.data.isLazy && flag )
			return; // Prevent expanding empty nodes
//		if( this.parent == null && this.tree.options.minExpandLevel>0 && !flag )
		if( this.parent == null && !flag )
			return; // Prevent collapsing the root
		this._expand(flag);
	},

	scheduleAction: function(mode, ms) {
		/** Schedule activity for delayed execution (cancel any pending request).
		 *  scheduleAction('cancel') will cancel the request.
		 */
		if( this.tree.timer ) {
			clearTimeout(this.tree.timer);
			logMsg("clearTimeout(%o)", this.tree.timer);
		}
		var self = this; // required for closures
		switch (mode) {
		case "cancel":
			// Simply made sure that timer was cleared
			break;
		case "expand":
			this.tree.timer = setTimeout(function(){
				logMsg("setTimeout: trigger");
				self.expand(true);
			}, ms);
			break;
		case "activate":
			this.tree.timer = setTimeout(function(){
				self.activate();
			}, ms);
			break;
		default:
			throw "Invalid mode " + mode;
		}
		logMsg("setTimeout(%s, %s): %s", mode, ms, this.tree.timer);
	},

	toggleExpand: function() {
		this.expand(!this.bExpanded);
	},

	collapseSiblings: function() {
		if( this.parent == null )
			return;
		var ac = this.parent.childList;
		for (var i=0; i<ac.length; i++) {
			if ( ac[i] !== this && ac[i].bExpanded )
				ac[i]._expand(false);
		}
	},

	onClick: function(event) {
//		this.tree.logDebug("dtnode.onClick(" + event.type + "): dtnode:" + this + ", button:" + event.button + ", which: " + event.which);
		var targetType = this.getEventTargetType(event);
		if( targetType == "expander" ) {
			// Clicking the expander icon always expands/collapses
			this.toggleExpand();
			this.focus(); // issue 95
		} else if( targetType == "checkbox" ) {
			// Clicking the checkbox always (de)selects
			this.toggleSelect();
			this.focus(); // issue 95
		} else {
			this._userActivate();
			// Chrome and Safari don't focus the a-tag on click
			this.span.getElementsByTagName("a")[0].focus();
		}
		// Make sure that clicks stop, otherwise <a href='#'> jumps to the top
		return false;
	},

	onDblClick: function(event) {
//		this.tree.logDebug("dtnode.onDblClick(" + event.type + "): dtnode:" + this + ", button:" + event.button + ", which: " + event.which);
	},

	onKeydown: function(event) {
//		this.tree.logDebug("dtnode.onKeydown(" + event.type + "): dtnode:" + this + ", charCode:" + event.charCode + ", keyCode: " + event.keyCode + ", which: " + event.which);
		var handled = true;
//		alert("keyDown" + event.which);

		switch( event.which ) {
			// charCodes:
//			case 43: // '+'
			case 107: // '+'
			case 187: // '+' @ Chrome, Safari
				if( !this.bExpanded ) this.toggleExpand();
				break;
//			case 45: // '-'
			case 109: // '-'
			case 189: // '+' @ Chrome, Safari
				if( this.bExpanded ) this.toggleExpand();
				break;
			//~ case 42: // '*'
				//~ break;
			//~ case 47: // '/'
				//~ break;
			// case 13: // <enter>
				// <enter> on a focused <a> tag seems to generate a click-event. 
				// this._userActivate();
				// break;
			case 32: // <space>
				this._userActivate();
				break;
			case 8: // <backspace>
				if( this.parent )
					this.parent.focus();
				break;
			case 37: // <left>
				if( this.bExpanded ) {
					this.toggleExpand();
					this.focus();
//				} else if( this.parent && (this.tree.options.rootVisible || this.parent.parent) ) {
				} else if( this.parent && this.parent.parent ) {
					this.parent.focus();
				}
				break;
			case 39: // <right>
				if( !this.bExpanded && (this.childList || this.data.isLazy) ) {
					this.toggleExpand();
					this.focus();
				} else if( this.childList ) {
					this.childList[0].focus();
				}
				break;
			case 38: // <up>
				var sib = this.getPrevSibling();
				while( sib && sib.bExpanded && sib.childList )
					sib = sib.childList[sib.childList.length-1];
//				if( !sib && this.parent && (this.tree.options.rootVisible || this.parent.parent) )
				if( !sib && this.parent && this.parent.parent )
					sib = this.parent;
				if( sib ) sib.focus();
				break;
			case 40: // <down>
				var sib;
				if( this.bExpanded && this.childList ) {
					sib = this.childList[0];
				} else {
					var parents = this._parentList(false, true);
					for(var i=parents.length-1; i>=0; i--) {
						sib = parents[i].getNextSibling();
						if( sib ) break;
					}
				}
				if( sib ) sib.focus();
				break;
			default:
				handled = false;
		}
		// Return false, if handled, to prevent default processing
		return !handled; 
	},

	onKeypress: function(event) {
		// onKeypress is only hooked to allow user callbacks.
		// We don't process it, because IE and Safari don't fire keypress for cursor keys.
//		this.tree.logDebug("dtnode.onKeypress(" + event.type + "): dtnode:" + this + ", charCode:" + event.charCode + ", keyCode: " + event.keyCode + ", which: " + event.which);
	},
	
	onFocus: function(event) {
		// Handles blur and focus events.
//		this.tree.logDebug("dtnode.onFocus(%o): %o", event, this);
		var opts = this.tree.options;
		if ( event.type=="blur" || event.type=="focusout" ) {
			if ( opts.onBlur ) // Pass element as 'this' (jQuery convention)
				opts.onBlur.call(this.span, this);
			if( this.tree.tnFocused )
				$(this.tree.tnFocused.span).removeClass(opts.classNames.focused);
			this.tree.tnFocused = null;
	        if( opts.persist ) 
				$.cookie(opts.cookieId+"-focus", "", opts.cookie);
		} else if ( event.type=="focus" || event.type=="focusin") {
			// Fix: sometimes the blur event is not generated
			if( this.tree.tnFocused && this.tree.tnFocused !== this ) {
				this.tree.logDebug("dtnode.onFocus: out of sync: curFocus: %o", this.tree.tnFocused);
				$(this.tree.tnFocused.span).removeClass(opts.classNames.focused);
			}
			this.tree.tnFocused = this;
			if ( opts.onFocus ) // Pass element as 'this' (jQuery convention)
				opts.onFocus.call(this.span, this);
			$(this.tree.tnFocused.span).addClass(opts.classNames.focused);
	        if( opts.persist )
				$.cookie(opts.cookieId+"-focus", this.data.key, opts.cookie);
		}
		// TODO: return anything?
//		return false;
	},

	visit: function(fn, data, includeSelf) {
		// Call fn(dtnode, data) for all child nodes. Stop iteration, if fn() returns false.
		var n = 0;
		if( includeSelf == true ) {
			if( fn(this, data) == false )
				return 1; 
			n++; 
		}
		if ( this.childList )
			for (var i=0; i<this.childList.length; i++)
				n += this.childList[i].visit(fn, data, true);
		return n;
	},

	remove: function() {
        // Remove this node
//		this.tree.logDebug ("%o.remove()", this);
        if ( this === this.tree.root )
            return false;
        return this.parent.removeChild(this);
	},

	removeChild: function(tn) {
		// Remove tn from list of direct children.
		var ac = this.childList;
		if( ac.length == 1 ) {
			if( tn !== ac[0] )
				throw "removeChild: invalid child";
			return this.removeChildren();
		}
        if( tn === this.tree.activeNode )
        	tn.deactivate();
        if( this.tree.options.persist ) {
	        if( tn.bSelected )
	            this.tree.persistence.clearSelect(tn.data.key);
	        if ( tn.bExpanded )
	            this.tree.persistence.clearExpand(tn.data.key);
        }
		tn.removeChildren(true);
//		this.div.removeChild(tn.div);
		this.ul.removeChild(tn.li);
		for(var i=0; i<ac.length; i++) {
			if( ac[i] === tn ) {
				this.childList.splice(i, 1);
				delete tn;
				break;
			}
		}
	},

	removeChildren: function(isRecursiveCall, retainPersistence) {
        // Remove all child nodes (more efficiently than recursive remove())
//		this.tree.logDebug ("%o.removeChildren(%o)", this, isRecursiveCall);
		var tree = this.tree;
        var ac = this.childList;
        if( ac ) {
        	for(var i=0; i<ac.length; i++) {
				var tn=ac[i];
//        		this.tree.logDebug ("del %o", tn);
                if ( tn === tree.activeNode && !retainPersistence )
                	tn.deactivate();
                if( this.tree.options.persist && !retainPersistence ) {
	                if( tn.bSelected )
	                    this.tree.persistence.clearSelect(tn.data.key);
	                if ( tn.bExpanded )
	                    this.tree.persistence.clearExpand(tn.data.key);
                }
                tn.removeChildren(true, retainPersistence);
//				this.div.removeChild(tn.div);
        		if( this.ul )
        			this.ul.removeChild(tn.li);
                delete tn;
        	}
        	this.childList = null;
        }
		if( ! isRecursiveCall ) {
//			this._expand(false);
//			this.isRead = false;
			this.isLoading = false;
			this.render();
		}
	},

	reload: function(force) {
		// Discard lazy content (and reload, if node was expanded). 
		if( this.parent == null )
			return this.tree.reload();
		
		if( ! this.data.isLazy )
			throw "node.reload() requires lazy nodes.";
		if( this.bExpanded ) {
			this.expand(false);
			this.removeChildren();
			this.expand(true);
		} else {
			this.removeChildren();
			if( force )
				this._loadContent();
		}
	},

	_addChildNode: function(dtnode, beforeNode) {
		/** 
		 * Internal function to add one single DynatreeNode as a child.
		 * 
		 */
		var tree = this.tree;
		var opts = tree.options;
		var pers = tree.persistence;
		
//		tree.logDebug("%o._addChildNode(%o)", this, dtnode);
		
		// --- Update and fix dtnode attributes if necessary 
		dtnode.parent = this;
//		if( beforeNode && (beforeNode.parent !== this || beforeNode === dtnode ) )
//			throw "<beforeNode> must be another child of <this>";

		// --- Add dtnode as a child
		if ( this.childList==null ) {
			this.childList = [];
		} else if( ! beforeNode ) {
			// Fix 'lastsib'
			$(this.childList[this.childList.length-1].span).removeClass(opts.classNames.lastsib);
		}
		if( beforeNode ) {
			var iBefore = $.inArray(beforeNode, this.childList);
			if( iBefore < 0 )
				throw "<beforeNode> must be a child of <this>";
			this.childList.splice(iBefore, 0, dtnode);
//			alert(this.childList);
		} else {
			// Append node
			this.childList.push(dtnode);
		}

		// --- Handle persistence 
		// Initial status is read from cookies, if persistence is active and 
		// cookies are already present.
		// Otherwise the status is read from the data attributes and then persisted.
		var isInitializing = tree.isInitializing();
		if( opts.persist && pers.cookiesFound && isInitializing ) {
			// Init status from cookies
//			tree.logDebug("init from cookie, pa=%o, dk=%o", pers.activeKey, dtnode.data.key);
			if( pers.activeKey == dtnode.data.key )
				tree.activeNode = dtnode;
			if( pers.focusedKey == dtnode.data.key )
				tree.focusNode = dtnode;
			dtnode.bExpanded = ($.inArray(dtnode.data.key, pers.expandedKeyList) >= 0);
			dtnode.bSelected = ($.inArray(dtnode.data.key, pers.selectedKeyList) >= 0);
//			tree.logDebug("    key=%o, bSelected=%o", dtnode.data.key, dtnode.bSelected);
		} else {
			// Init status from data (Note: we write the cookies after the init phase)
//			tree.logDebug("init from data");
			if( dtnode.data.activate ) {
				tree.activeNode = dtnode;
				if( opts.persist )
					pers.activeKey = dtnode.data.key;
			}
			if( dtnode.data.focus ) {
				tree.focusNode = dtnode;
				if( opts.persist )
					pers.focusedKey = dtnode.data.key;
			}
			dtnode.bExpanded = ( dtnode.data.expand == true ); // Collapsed by default
			if( dtnode.bExpanded && opts.persist )
				pers.addExpand(dtnode.data.key);
			dtnode.bSelected = ( dtnode.data.select == true ); // Deselected by default
/*			
			Doesn't work, cause pers.selectedKeyList may be null
			if( dtnode.bSelected && opts.selectMode==1 
				&& pers.selectedKeyList && pers.selectedKeyList.length>0 ) {
				tree.logWarning("Ignored multi-selection in single-mode for %o", dtnode);
				dtnode.bSelected = false; // Fixing bad input data (multi selection for mode:1)
			}
*/
			if( dtnode.bSelected && opts.persist )
				pers.addSelect(dtnode.data.key);
		}

		// Always expand, if it's below minExpandLevel
//		tree.logDebug ("%o._addChildNode(%o), l=%o", this, dtnode, dtnode.getLevel());
		if ( opts.minExpandLevel >= dtnode.getLevel() ) {
//			tree.logDebug ("Force expand for %o", dtnode);
			this.bExpanded = true;
		}

		// In multi-hier mode, update the parents selection state
		// issue #82: only if not initializing, because the children may not exist yet
//		if( !dtnode.data.isStatusNode && opts.selectMode==3 && !isInitializing )
//			dtnode._fixSelectionState();

		// In multi-hier mode, update the parents selection state
		if( dtnode.bSelected && opts.selectMode==3 ) {
			var p = this;
			while( p ) {
				if( !p.hasSubSel )
					p._setSubSel(true);
				p = p.parent;
			}
		}
		// render this node and the new child
		if ( tree.bEnableUpdate )
			this.render();

		return dtnode;
	},

	addChild: function(obj, beforeNode) {
		/**
		 * Add a node object as child.
		 * 
		 * This should be the only place, where a DynaTreeNode is constructed!
		 * (Except for the root node creation in the tree constructor)
		 * 
		 * @param obj A JS object (may be recursive) or an array of those.
		 * @param {DynaTreeNode} beforeNode (optional) sibling node.
		 *     
		 * Data format: array of node objects, with optional 'children' attributes.
		 * [
		 *	{ title: "t1", isFolder: true, ... }
		 *	{ title: "t2", isFolder: true, ...,
		 *		children: [
		 *			{title: "t2.1", ..},
		 *			{..}
		 *			]
		 *	}
		 * ]
		 * A simple object is also accepted instead of an array.
		 * 
		 */
//		this.tree.logDebug("%o.addChild(%o, %o)", this, obj, beforeNode);
		if( !obj || obj.length==0 ) // Passed null or undefined or empty array
			return;
		if( obj instanceof DynaTreeNode )
			return this._addChildNode(obj, beforeNode);
		if( !obj.length ) // Passed a single data object
			obj = [ obj ];

		var prevFlag = this.tree.enableUpdate(false);

		var tnFirst = null;
		for (var i=0; i<obj.length; i++) {
			var data = obj[i];
			var dtnode = this._addChildNode(new DynaTreeNode(this, this.tree, data), beforeNode);
			if( !tnFirst ) tnFirst = dtnode;
			// Add child nodes recursively
			if( data.children )
				dtnode.addChild(data.children, null);
		}
		this.tree.enableUpdate(prevFlag);
		return tnFirst;
	},

	append: function(obj) {
		this.tree.logWarning("node.append() is deprecated (use node.addChild() instead).");
		return this.addChild(obj, null);
	},

	appendAjax: function(ajaxOptions) {
		this.removeChildren(false, true);
		this.setLazyNodeStatus(DTNodeStatus_Loading);
		// Ajax option inheritance: $.ajaxSetup < $.ui.dynatree.prototype.options.ajaxDefaults < tree.options.ajaxDefaults < ajaxOptions
		var self = this;
		var orgSuccess = ajaxOptions.success;
		var orgError = ajaxOptions.error;
		var options = $.extend({}, this.tree.options.ajaxDefaults, ajaxOptions, {
/*
       		complete: function(req, textStatus){
	 		    alert("ajax complete");
   			},
   			timeout: 5000, // 5 sec
*/   			
       		success: function(data, textStatus){
     		    // <this> is the request options
//				self.tree.logDebug("appendAjax().success");
				var prevPhase = self.tree.phase;
				self.tree.phase = "init";
//				self.append(data);
				self.addChild(data, null);
				self.tree.phase = "postInit";
				self.setLazyNodeStatus(DTNodeStatus_Ok);
				if( orgSuccess )
					orgSuccess.call(options, self);
				self.tree.phase = prevPhase;
       			},
       		error: function(XMLHttpRequest, textStatus, errorThrown){
       		    // <this> is the request options  
   				self.tree.logWarning("appendAjax failed:", textStatus, ":\n", XMLHttpRequest, "\n", errorThrown);
				self.setLazyNodeStatus(DTNodeStatus_Error, {info: textStatus, tooltip: ""+errorThrown});
				if( orgError )
					orgError.call(options, self, XMLHttpRequest, textStatus, errorThrown);
       			}
		});
       	$.ajax(options);
	},
	// --- end of class
	lastentry: undefined
}

/*************************************************************************
 * class DynaTreeStatus
 */

var DynaTreeStatus = Class.create();


DynaTreeStatus._getTreePersistData = function(cookieId, cookieOpts) {
	// Static member: Return persistence information from cookies
	var ts = new DynaTreeStatus(cookieId, cookieOpts);
	ts.read();
	return ts.toDict();
}
// Make available in global scope
getDynaTreePersistData = DynaTreeStatus._getTreePersistData;


DynaTreeStatus.prototype = {
	// Constructor
	initialize: function(cookieId, cookieOpts) {
		this._log("DynaTreeStatus: initialize");
		if( cookieId === undefined )
			cookieId = $.ui.dynatree.prototype.options.cookieId;
		cookieOpts = $.extend({}, $.ui.dynatree.prototype.options.cookie, cookieOpts);
		
		this.cookieId = cookieId; 
		this.cookieOpts = cookieOpts;
		this.cookiesFound = undefined;
		this.activeKey = null;
		this.focusedKey = null;
		this.expandedKeyList = null;
		this.selectedKeyList = null;
	},
	// member functions
	_log: function(msg) {
		//	this.logDebug("_changeNodeList(%o): nodeList:%o, idx:%o", mode, nodeList, idx);
		Array.prototype.unshift.apply(arguments, ["debug"]);
		_log.apply(this, arguments);
	},
	read: function() {
		this._log("DynaTreeStatus: read");
		// Read or init cookies. 
		this.cookiesFound = false;
			
		var cookie = $.cookie(this.cookieId + "-active");
		this.activeKey = ( cookie == null ) ? "" : cookie;
		if( cookie != null ) this.cookiesFound = true;

		cookie = $.cookie(this.cookieId + "-focus");
		this.focusedKey = ( cookie == null ) ? "" : cookie;
		if( cookie != null ) this.cookiesFound = true;

		cookie = $.cookie(this.cookieId + "-expand");
		this.expandedKeyList = ( cookie == null ) ? [] : cookie.split(","); 
		if( cookie != null ) this.cookiesFound = true;

		cookie = $.cookie(this.cookieId + "-select");
		this.selectedKeyList = ( cookie == null ) ? [] : cookie.split(","); 
		if( cookie != null ) this.cookiesFound = true;
	},
	write: function() {
		this._log("DynaTreeStatus: write");
		$.cookie(this.cookieId + "-active", ( this.activeKey == null ) ? "" : this.activeKey, this.cookieOpts);
		$.cookie(this.cookieId + "-focus", ( this.focusedKey == null ) ? "" : this.focusedKey, this.cookieOpts);
		$.cookie(this.cookieId + "-expand", ( this.expandedKeyList == null ) ? "" : this.expandedKeyList.join(","), this.cookieOpts);
		$.cookie(this.cookieId + "-select", ( this.selectedKeyList == null ) ? "" : this.selectedKeyList.join(","), this.cookieOpts);
	},
	addExpand: function(key) {
		this._log("addExpand(%o)", key);
		if( $.inArray(key, this.expandedKeyList) < 0 ) {
			this.expandedKeyList.push(key);
			$.cookie(this.cookieId + "-expand", this.expandedKeyList.join(","), this.cookieOpts);
		}
	},
	clearExpand: function(key) {
		this._log("clearExpand(%o)", key);
		var idx = $.inArray(key, this.expandedKeyList); 
		if( idx >= 0 ) {
			this.expandedKeyList.splice(idx, 1);
			$.cookie(this.cookieId + "-expand", this.expandedKeyList.join(","), this.cookieOpts);
		}
	},
	addSelect: function(key) {
		this._log("addSelect(%o)", key);
		if( $.inArray(key, this.selectedKeyList) < 0 ) {
			this.selectedKeyList.push(key);
			$.cookie(this.cookieId + "-select", this.selectedKeyList.join(","), this.cookieOpts);
		}
	},
	clearSelect: function(key) {
		this._log("clearSelect(%o)", key);
		var idx = $.inArray(key, this.selectedKeyList); 
		if( idx >= 0 ) {
			this.selectedKeyList.splice(idx, 1);
			$.cookie(this.cookieId + "-select", this.selectedKeyList.join(","), this.cookieOpts);
		}
	},
	isReloading: function() {
		return this.cookiesFound == true;
	},
	toDict: function() {
		return {
			cookiesFound: this.cookiesFound,
			activeKey: this.activeKey,
			focusedKey: this.activeKey,
			expandedKeyList: this.expandedKeyList,
			selectedKeyList: this.selectedKeyList
		};
	},
	// --- end of class
	lastentry: undefined
};


/*************************************************************************
 * class DynaTree
 */

var DynaTree = Class.create();

// --- Static members ----------------------------------------------------------

DynaTree.version = "$Version:$"; 
/*
DynaTree._initTree = function() {
};

DynaTree._bind = function() {
};
*/
//--- Class members ------------------------------------------------------------

DynaTree.prototype = {
	// Constructor
//	initialize: function(divContainer, options) {
	initialize: function($widget) {
		// instance members
		this.phase = "init";
		this.$widget = $widget;
		this.options = $widget.options;
		this.$tree = $widget.element;
		this.timer = null;
		// find container element
		this.divTree = this.$tree.get(0);
		// 
		_initDragAndDrop(this);
	},

	// member functions

	_load: function() {
		var $widget = this.$widget;
		var opts = this.options;
		this.bEnableUpdate = true;
		this._nodeCount = 1;
		this.activeNode = null;
		this.focusNode = null;

		// Some deprecation warnings to help with migration
		if( opts.rootVisible !== undefined ) 
			_log("warn", "Option 'rootVisible' is no longer supported.");
		if( opts.title  !== undefined ) 
			_log("warn", "Option 'title' is no longer supported.");
		if( opts.minExpandLevel < 1 ) { 
			_log("warn", "Option 'minExpandLevel' must be >= 1.");
			opts.minExpandLevel = 1;
		}
		
		// If a 'options.classNames' dictionary was passed, still use defaults 
    	// for undefined classes:
    	if( opts.classNames !== $.ui.dynatree.prototype.options.classNames ) {
    		opts.classNames = $.extend({}, $.ui.dynatree.prototype.options.classNames, opts.classNames);
    	}
    	// Guess skin path, if not specified
    	if(!opts.imagePath) {
    		$("script").each( function () {
    			// Eclipse syntax parser breaks on this expression, so put it at the bottom:
    			if( this.src.search(_rexDtLibName) >= 0 ) {
                    if( this.src.indexOf("/")>=0 ) // issue #47
    				    opts.imagePath = this.src.slice(0, this.src.lastIndexOf("/")) + "/skin/";
                    else
    				    opts.imagePath = "skin/";
//    				logMsg("Guessing imagePath from '%s': '%s'", this.src, opts.imagePath);
    				return false; // first match
    			}
    		});
    	}
    	
		this.persistence = new DynaTreeStatus(opts.cookieId, opts.cookie);
		if( opts.persist ) {
			if( !$.cookie )
				_log("warn", "Please include jquery.cookie.js to use persistence.");
			this.persistence.read();
		}
		this.logDebug("DynaTree.persistence: %o", this.persistence.toDict());

		// Cached tag strings
		this.cache = {
			tagEmpty: "<span class='" + opts.classNames.empty + "'></span>",
			tagVline: "<span class='" + opts.classNames.vline + "'></span>",
			tagExpander: "<span class='" + opts.classNames.expander + "'></span>",
			tagConnector: "<span class='" + opts.classNames.connector + "'></span>",
			tagNodeIcon: "<span class='" + opts.classNames.nodeIcon + "'></span>",
			tagCheckbox: "<span class='" + opts.classNames.checkbox + "'></span>",
			lastentry: undefined
		};

    	// Clear container, in case it contained some 'waiting' or 'error' text 
    	// for clients that don't support JS.
		// We don't do this however, if we try to load from an embedded UL element.
    	if( opts.children || (opts.initAjax && opts.initAjax.url) || opts.initId )
    		$(this.divTree).empty();
    	else if( this.divRoot )
    		$(this.divRoot).remove();
/*
		// create the root element
		this.tnRoot = new DynaTreeNode(null, this, {title: opts.title, key: "root"});
		this.tnRoot.data.isFolder = true;
		this.tnRoot.render(false, false);
		this.divRoot = this.tnRoot.div;
		this.divRoot.className = opts.classNames.container;
		
		// add root to container
		// TODO: this should be delayed until all children have been created for performance reasons
		this.divTree.appendChild(this.divRoot);
*/
		// Create the root element
		this.tnRoot = new DynaTreeNode(null, this, {});
		this.tnRoot.render();
		this.divTree.appendChild(this.tnRoot.ul);

		var root = this.tnRoot;
    	var isReloading = ( opts.persist && this.persistence.isReloading() );
    	var isLazy = false;
    	var prevFlag = this.enableUpdate(false);  

    	this.logDebug("Dynatree._load(): read tree structure...");

    	// Init tree structure
    	if( opts.children ) {
    		// Read structure from node array
    		root.addChild(opts.children);

    	} else if( opts.initAjax && opts.initAjax.url ) {
    		// Init tree from AJAX request
    		isLazy = true;
    		root.data.isLazy = true;
    		this._reloadAjax();

    	} else if( opts.initId ) {
    		// Init tree from another UL element
    		this._createFromTag(root, $("#"+opts.initId));

    	} else {
    		// Init tree from the first UL element inside the container <div>
    		var $ul = this.$tree.find(">ul:first").hide();
    		this._createFromTag(root, $ul);
    		$ul.remove();
    	}
    	
    	this._checkConsistency();
    	// Render html markup
    	this.logDebug("Dynatree._load(): render nodes...");
    	this.enableUpdate(prevFlag);
    	
    	// bind event handlers
    	this.logDebug("Dynatree._load(): bind events...");
    	this.$widget.bind();

        // --- Post-load processing
    	this.logDebug("Dynatree._load(): postInit...");
    	this.phase = "postInit";
    	
    	// In persist mode, make sure that cookies are written, even if they are empty
        if( opts.persist ) { 
			this.persistence.write();
        }
        
    	// Set focus, if possible (this will also fire an event and write a cookie)
    	if( this.focusNode && this.focusNode.isVisible() ) {
    		this.logDebug("Focus on init: %o", this.focusNode);
    		this.focusNode.focus();
    	}

    	if( !isLazy && opts.onPostInit ) {
    		opts.onPostInit.call(this, isReloading, false);
    	}

    	this.phase = "idle";
	},
	
	_reloadAjax: function() {
		// Reload 
		var opts = this.options;
		if( ! opts.initAjax || ! opts.initAjax.url )
			throw "tree.reload() requires 'initAjax' mode.";
		var pers = this.persistence;
		var ajaxOpts = $.extend({}, opts.initAjax);
		// Append cookie info to the request
//		this.logDebug("reloadAjax: key=%o, an.key:%o", pers.activeKey, this.activeNode?this.activeNode.data.key:"?");
		if( ajaxOpts.addActiveKey )
			ajaxOpts.data.activeKey = pers.activeKey; 
		if( ajaxOpts.addFocusedKey )
			ajaxOpts.data.focusedKey = pers.focusedKey; 
		if( ajaxOpts.addExpandedKeyList )
			ajaxOpts.data.expandedKeyList = pers.expandedKeyList.join(","); 
		if( ajaxOpts.addSelectedKeyList )
			ajaxOpts.data.selectedKeyList = pers.selectedKeyList.join(","); 

		// Set up onPostInit callback to be called when Ajax returns
		if( opts.onPostInit ) {
			if( ajaxOpts.success )
				this.logWarning("initAjax: success callback is ignored when onPostInit was specified.");
			if( ajaxOpts.error )
				this.logWarning("initAjax: error callback is ignored when onPostInit was specified.");
			var isReloading = pers.isReloading();
			ajaxOpts["success"] = function(dtnode) { opts.onPostInit.call(dtnode.tree, isReloading, false); }; 
			ajaxOpts["error"] = function(dtnode) { opts.onPostInit.call(dtnode.tree, isReloading, true); }; 
		}
    	this.logDebug("Dynatree._init(): send Ajax request...");
    	this.tnRoot.appendAjax(ajaxOpts);
	},

	toString: function() {
//		return "DynaTree '" + this.options.title + "'";
		return "Dynatree '" + this.$tree.attr("id") + "'";
	},

	toDict: function() {
		return this.tnRoot.toDict(true);
	},
	
	getPersistData: function() {
		return this.persistence.toDict();
	},
	
	logDebug: function(msg) {
		if( this.options.debugLevel >= 2 ) {
			Array.prototype.unshift.apply(arguments, ["debug"]);
			_log.apply(this, arguments);
		}
	},

	logInfo: function(msg) {
		if( this.options.debugLevel >= 1 ) {
			Array.prototype.unshift.apply(arguments, ["info"]);
			_log.apply(this, arguments);
		}
	},

	logWarning: function(msg) {
		Array.prototype.unshift.apply(arguments, ["warn"]);
		_log.apply(this, arguments);
	},

	isInitializing: function() {
		return ( this.phase=="init" || this.phase=="postInit" );
	},
	isReloading: function() {
		return ( this.phase=="init" || this.phase=="postInit" ) && this.options.persist && this.persistence.cookiesFound;
	},
	isUserEvent: function() {
		return ( this.phase=="userEvent" );
	},

	redraw: function() {
		this.logDebug("dynatree.redraw()...");
		this.tnRoot.render();
		this.logDebug("dynatree.redraw() done.");
	},

	reloadAjax: function() {
		this.logWarning("tree.reloadAjax() is deprecated since v0.5.2 (use reload() instead).");
	},
	
	reload: function() {
		this._load();
	},
	
	getRoot: function() {
		return this.tnRoot;
	},

	getNodeByKey: function(key) {
		// $("#...") has problems, if the key contains '.', so we use getElementById()
//		return $("#" + this.options.idPrefix + key).attr("dtnode");
		var el = document.getElementById(this.options.idPrefix + key);
		return ( el && el.dtnode ) ? el.dtnode : null;
	},

	getActiveNode: function() {
		return this.activeNode;
	},
	
	reactivate: function(setFocus) {
		// Re-fire onQueryActivate and onActivate events.
		var node = this.activeNode;
//		this.logDebug("reactivate %o", node);
		if( node ) {
			this.activeNode = null; // Force re-activating
			node.activate();
			if( setFocus )
				node.focus();
		}
	},

	getSelectedNodes: function(stopOnParents) {
		var nodeList = [];
		this.tnRoot.visit(function(dtnode){
			if( dtnode.bSelected ) {
				nodeList.push(dtnode);
				if( stopOnParents == true )
					return false; // stop processing this branch
			}
		});
		return nodeList;
	},

	activateKey: function(key) {
		var dtnode = (key === null) ? null : this.getNodeByKey(key);
		if( !dtnode ) {
			if( this.activeNode )
				this.activeNode.deactivate();
			this.activeNode = null;
			return null;
		}
		dtnode.focus();
		dtnode.activate();
		return dtnode;
	},

	selectKey: function(key, select) {
		var dtnode = this.getNodeByKey(key);
		if( !dtnode )
			return null;
		dtnode.select(select);
		return dtnode;
	},

	enableUpdate: function(bEnable) {
		if ( this.bEnableUpdate==bEnable )
			return bEnable;
		this.bEnableUpdate = bEnable;
		if ( bEnable )
			this.redraw();
		return !bEnable; // return previous value
	},

	visit: function(fn, data, includeRoot) {
		return this.tnRoot.visit(fn, data, includeRoot);
	},

	_createFromTag: function(parentTreeNode, $ulParent) {
		// Convert a <UL>...</UL> list into children of the parent tree node.
		var self = this;
/*
TODO: better?
		this.$lis = $("li:has(a[href])", this.element);
		this.$tabs = this.$lis.map(function() { return $("a", this)[0]; });
 */
		$ulParent.find(">li").each(function() {
			var $li = $(this);
			var $liSpan = $li.find(">span:first");
			var title;
			if( $liSpan.length ) {
				// If a <li><span> tag is specified, use it literally.
				title = $liSpan.html();
			} else {
				// If only a <li> tag is specified, use the trimmed string up to the next child <ul> tag.
				title = $li.html();
				var iPos = title.search(/<ul/i);
				if( iPos>=0 )
					title = $.trim(title.substring(0, iPos));
				else
					title = $.trim(title);
//				self.logDebug("%o", title);
			}
			// Parse node options from ID, title and class attributes
			var data = {
				title: title,
				isFolder: $li.hasClass("folder"),
				isLazy: $li.hasClass("lazy"),
				expand: $li.hasClass("expanded"),
				select: $li.hasClass("selected"),
				activate: $li.hasClass("active"),
				focus: $li.hasClass("focused")
			};
			if( $li.attr("title") )
				data.tooltip = $li.attr("title");
			if( $li.attr("id") )
				data.key = $li.attr("id");
			// If a data attribute is present, evaluate as a JavaScript object
			if( $li.attr("data") ) {
				var dataAttr = $.trim($li.attr("data"));
				if( dataAttr ) {
					if( dataAttr.charAt(0) != "{" )
						dataAttr = "{" + dataAttr + "}"
					try {
						$.extend(data, eval("(" + dataAttr + ")"));
					} catch(e) {
						throw ("Error parsing node data: " + e + "\ndata:\n'" + dataAttr + "'");
					}
				}
			}
			var childNode = parentTreeNode.addChild(data);
			// Recursive reading of child nodes, if LI tag contains an UL tag
			var $ul = $li.find(">ul:first");
			if( $ul.length ) {
				self._createFromTag(childNode, $ul); // must use 'self', because 'this' is the each() context
			}
		});
	},

	_checkConsistency: function() {
//		this.logDebug("tree._checkConsistency() NOT IMPLEMENTED - %o", this);
	},

	_setDndStatus: function(sourceNode, targetNode, helper, hitMode, accept) {
		// hitMode: 'after', 'before', 'over', 'out', 'start', 'stop'
		var $source = sourceNode ? $(sourceNode.span) : null;
		var $target = $(targetNode.span);
		if( !this.$dndMarker ) {
			this.$dndMarker = $("<div id='dynatree_drop_marker'></div>")
				.hide()
				.prependTo("body");
			logMsg("Creating marker: %o", this.$dndMarker);
		}
		if(hitMode === "start"){
		}
		if(hitMode === "stop"){
//			sourceNode.removeClass("dynatree-drop-target");
		}
		if(hitMode === "after" || hitMode === "before" || hitMode === "over"){
//			$source && $source.addClass("dynatree-drag-source");
			$target.addClass("dynatree-drop-target");
			var pos = $target.position();
			this.$dndMarker.css({"left": (pos.left) + "px", "top": (pos.top) + "px" })
				.show();
//			helper.addClass("dynatree-drop-hover");
		} else {
//			$source && $source.removeClass("dynatree-drag-source");
			$target.removeClass("dynatree-drop-target");
			this.$dndMarker.hide();
//			helper.removeClass("dynatree-drop-hover");
		}
		if(hitMode === "after"){
			$target.addClass("dynatree-drop-after");
		} else {
			$target.removeClass("dynatree-drop-after");
		}
		if(hitMode === "before"){
			$target.addClass("dynatree-drop-before");
		} else {
			$target.removeClass("dynatree-drop-before");
		}
		if(accept === true){
			$source && $source.addClass("dynatree-drop-accept");
			$target.addClass("dynatree-drop-accept");
			helper.addClass("dynatree-drop-accept");
		}else{
			$source && $source.removeClass("dynatree-drop-accept");
			$target.removeClass("dynatree-drop-accept");
			helper.removeClass("dynatree-drop-accept");
		}
		if(accept === false){
			$source && $source.addClass("dynatree-drop-reject");
			$target.addClass("dynatree-drop-reject");
			helper.addClass("dynatree-drop-reject");
		}else{
			$source && $source.removeClass("dynatree-drop-reject");
			$target.removeClass("dynatree-drop-reject");
			helper.removeClass("dynatree-drop-reject");
		}
	},
	_onDragEvent: function(eventName, node, otherNode, event, ui, draggable) {
		/***
		 * Handles drag'n'drop functionality.
		 */
		if(eventName !== "over")
			this.logDebug("tree._onDragEvent(%s, %o, %o) - %o", eventName, node, otherNode, this);
		var opts = this.options;
		var dnd = this.options.dnd;
		var res = null;
		var nodeTag = $(node.span);
		switch (eventName) {
		case "helper":
			// Only event and node argument is available 
            var helper = $("<div class='dynatree-drag-helper'><span class='dynatree-drag-helper-img' /></div>")
            	.append($(event.target).closest('a').clone());  
            // Attach node reference to helper object  
            helper.data("dtSourceNode", node);
            logMsg("helper.sourceNode=%o", helper.data("dtSourceNode"));
            res = helper;
			break;
		case "start":
			if(dnd.onDragStart)
				res = dnd.onDragStart(node)
			if(res === false) {
				this.logDebug("tree.onDragStart() cancelled");
				draggable._clear();
			} else {
				nodeTag.addClass("dynatree-drag-source");
			}
			break;
		case "enter":
			res = dnd.onDragEnter ? dnd.onDragEnter(node, otherNode) : null;
//			logMsg("helper %o", ui.helper);
            ui.helper.data("enterResponse", res);
			this.logDebug("helper.enterResponse: %o", res);
			this._setDndStatus(otherNode, node, ui.helper, "over", res!==false);
			break;
		case "over":
			// Auto-expand node
			if(dnd.autoExpandMS && node.hasChildren() && !node.bExpanded) {
				node.scheduleAction("expand", dnd.autoExpandMS);
			}
            var enterResponse = ui.helper.data("enterResponse");
			var hitMode = null;
            if(enterResponse === false){
            	// Don't call onDragOver if onEnter returned false.
            	break;
            } else if(typeof enterResponse === "string") {
            	// Use hitMode from onEnter if provided.
    			hitMode = enterResponse;
            } else {
            	// Calculate hitMode from relative cursor position.
    			var nodeOfs = nodeTag.position();
    			var relPos = { x: event.clientX - nodeOfs.left, 
    						y: event.clientY - nodeOfs.top };
    			var relPos2 = { x: relPos.x / nodeTag.width(),
    						y: relPos.y / nodeTag.height() };
    			if( (relPos2.y > 0.25 && relPos2.y < 0.75) 
    					|| (relPos2.x > 0.8 ) ) {
    				hitMode = "over";
    			} else if(relPos2.y <= 0.25) {
    				hitMode = "before";
    			} else {
    				hitMode = "after";
    			}
//    			logMsg("    clientPos: %s/%s", event.clientX, event.clientY);
//    			logMsg("    nodeOfs: %s/%s", nodeOfs.left, nodeOfs.top);
//    			logMsg("    relPos: %s/%s", relPos.x, relPos.y);
//    			logMsg("    relPos2: %s/%s: %s", relPos2.x, relPos2.y, hitMode);
//    			logMsg("    e:%o", event);
            }
/*			var checkPos = function(node, pos) {
				var dyClick = this.offset.click.top, dxClick = this.offset.click.left;
				var helperTop = this.positionAbs.top, helperLeft = this.positionAbs.left;
				var itemHeight = o.height, itemWidth = o.width;
				var itemTop = o.top, itemLeft = o.left;

				return $.ui.isOver(helperTop + dyClick, helperLeft + dxClick, itemTop, itemLeft, itemHeight, itemWidth);
			};
			var relPos = event.()*/
			if(dnd.onDragOver)
				res = dnd.onDragOver(node, otherNode, hitMode)
			this._setDndStatus(otherNode, node, ui.helper, hitMode, res!==false)
			break;
		case "drop":
			if(dnd.onDrop)
				dnd.onDrop(node, otherNode)
			break;
		case "leave":
			// Cancel pending expand request
			node.scheduleAction("cancel");
            ui.helper.data("enterResponse", null);
//            nodeTag.removeClass("dynatree-drop-hover dynatree-drop-accept dynatree-drop-reject");
			this._setDndStatus(otherNode, node, ui.helper, "out", undefined)
			if(dnd.onDragLeave)
				dnd.onDragLeave(node, otherNode)
			break;
		case "stop":
			nodeTag.removeClass("dynatree-drag-source");
			if(dnd.onDragStop)
				dnd.onDragStop(node)
			break;
		default:
			throw "Unsupported drag event: " + eventName;
		}
		return res;
	},
	
	// --- end of class
	lastentry: undefined
};

/*************************************************************************
 * Widget $(..).dynatree
 */

$.widget("ui.dynatree", {
/*
	init: function() {
        // ui.core 1.6 renamed init() to _init(): this stub assures backward compatibility
        _log("warn", "ui.dynatree.init() was called; you should upgrade to jquery.ui.core.js v1.8 or higher.");
        return this._init();
    },
 */
	_init: function() {
		if( parseFloat($.ui.version) < 1.8 ) {
	        // jquery.ui.core 1.8 renamed _init() to _create(): this stub assures backward compatibility
	        _log("warn", "ui.dynatree._init() was called; you should upgrade to jquery.ui.core.js v1.8 or higher.");
			return this._create();
		}
		// jquery.ui.core 1.8 still uses _init() to perform "default functionality" 
    	_log("debug", "ui.dynatree._init() was called; no current default functionality.");
    },

    _create: function() {
    	logMsg("Dynatree._create(): version='%s', debugLevel=%o.", DynaTree.version, this.options.debugLevel);

    	var opts = this.options;
    	// The widget framework supplies this.element and this.options.
    	this.options.event += ".dynatree"; // namespace event

    	var divTree = this.element.get(0);
/*    	// Clear container, in case it contained some 'waiting' or 'error' text 
    	// for clients that don't support JS
    	if( opts.children || (opts.initAjax && opts.initAjax.url) || opts.initId )
    		$(divTree).empty();
*/
    	// Create the DynaTree object
    	this.tree = new DynaTree(this);
    	this.tree._load();
    	this.tree.logDebug("Dynatree._init(): done.");
	},

	bind: function() {
		var $this = this.element;
		var o = this.options;

		// Prevent duplicate binding
		this.unbind();
		
		var eventNames = "click.dynatree dblclick.dynatree";
		if( o.keyboard ) // Note: leading ' '!
			eventNames += " keypress.dynatree keydown.dynatree";
		$this.bind(eventNames, function(event){
			var dtnode = getDtNodeFromElement(event.target);
			if( !dtnode )
				return true;  // Allow bubbling of other events
			var prevPhase = dtnode.tree.phase;
			dtnode.tree.phase = "userEvent";
			try {
				dtnode.tree.logDebug("bind(%o): dtnode: %o", event, dtnode);

				switch(event.type) {
				case "click":
					return ( o.onClick && o.onClick(dtnode, event)===false ) ? false : dtnode.onClick(event);
				case "dblclick":
					return ( o.onDblClick && o.onDblClick(dtnode, event)===false ) ? false : dtnode.onDblClick(event);
				case "keydown":
					return ( o.onKeydown && o.onKeydown(dtnode, event)===false ) ? false : dtnode.onKeydown(event);
				case "keypress":
					return ( o.onKeypress && o.onKeypress(dtnode, event)===false ) ? false : dtnode.onKeypress(event);
				};
			} catch(e) {
				var _ = null; // issue 117
				dtnode.tree.logWarning("bind(%o): dtnode: %o, error: %o", event, dtnode, e);
			} finally {
				dtnode.tree.phase = prevPhase;
			}
		});
		
		// focus/blur don't bubble, i.e. are not delegated to parent <div> tags,
		// so we use the addEventListener capturing phase.
		// See http://www.howtocreate.co.uk/tutorials/javascript/domevents
		function __focusHandler(event) {
			// Handles blur and focus.
			// Fix event for IE:
			event = arguments[0] = $.event.fix( event || window.event );
			var dtnode = getDtNodeFromElement(event.target);
			return dtnode ? dtnode.onFocus(event) : false;
		}
		var div = this.tree.divTree;
		if( div.addEventListener ) {
			div.addEventListener("focus", __focusHandler, true);
			div.addEventListener("blur", __focusHandler, true);
		} else {
			div.onfocusin = div.onfocusout = __focusHandler;
		}
		// EVENTS
		// disable click if event is configured to something else
//		if (!(/^click/).test(o.event))
//			this.$tabs.bind("click.tabs", function() { return false; });
		
	},
	
	unbind: function() {
		this.element.unbind(".dynatree");
	},
	
/* TODO: we could handle option changes during runtime here (maybe to re-render, ...)
	setData: function(key, value) {
		this.tree.logDebug("dynatree.setData('" + key + "', '" + value + "')");
	},
*/	
	enable: function() {
		this.bind();
		// Call default disable(): remove -disabled from css: 
		$.Widget.prototype.enable.apply(this, arguments);
	},
	
	disable: function() {
		this.unbind();
		// Call default disable(): add -disabled to css: 
		$.Widget.prototype.disable.apply(this, arguments);
	},
	
	// --- getter methods (i.e. NOT returning a reference to $)
	getTree: function() {
		return this.tree;
	},

	getRoot: function() {
		return this.tree.getRoot();
	},

	getActiveNode: function() {
		return this.tree.getActiveNode();
	},

	getSelectedNodes: function() {
		return this.tree.getSelectedNodes();
	},

	// ------------------------------------------------------------------------
	lastentry: undefined
});


// The following methods return a value (thus breaking the jQuery call chain):

// @@ 1.8
//$.ui.dynatree.getter = "getTree getRoot getActiveNode getSelectedNodes";


/*******************************************************************************
 * Plugin default options:
 */
//$.ui.dynatree.defaults = {  @@ 1.8
$.ui.dynatree.prototype.options = {
	title: "Dynatree", // Tree's name (only used for debug outpu)
 	minExpandLevel: 1, // 1: root node is not collapsible
	imagePath: null, // Path to a folder containing icons. Defaults to 'skin/' subdirectory.
	children: null, // Init tree structure from this object array.
	initId: null, // Init tree structure from a <ul> element with this ID.
	initAjax: null, // Ajax options used to initialize the tree strucuture.
	autoFocus: true, // Set focus to first child, when expanding or lazy-loading.
	keyboard: true, // Support keyboard navigation.
    persist: false, // Persist expand-status to a cookie
	autoCollapse: false, // Automatically collapse all siblings, when a node is expanded.
	clickFolderMode: 3, // 1:activate, 2:expand, 3:activate and expand
	activeVisible: true, // Make sure, active nodes are visible (expanded).
	checkbox: false, // Show checkboxes.
	selectMode: 2, // 1:single, 2:multi, 3:multi-hier
	fx: null, // Animations, e.g. null or { height: "toggle", duration: 200 }
	enableDrag: false,
	enableDrop: false,
	// Low level event handlers: onEvent(dtnode, event): return false, to stop default processing
	onClick: null, // null: generate focus, expand, activate, select events.
	onDblClick: null, // (No default actions.)
	onKeydown: null, // null: generate keyboard navigation (focus, expand, activate).
	onKeypress: null, // (No default actions.)
	onFocus: null, // null: set focus to node.
	onBlur: null, // null: remove focus from node.

	// Pre-event handlers onQueryEvent(flag, dtnode): return false, to stop processing
	onQueryActivate: null, // Callback(flag, dtnode) before a node is (de)activated.
	onQuerySelect: null, // Callback(flag, dtnode) before a node is (de)selected.
	onQueryExpand: null, // Callback(flag, dtnode) before a node is expanded/collpsed.
	
	// High level event handlers
	onPostInit: null, // Callback(isReloading, isError) when tree was (re)loaded.
	onActivate: null, // Callback(dtnode) when a node is activated.
	onDeactivate: null, // Callback(dtnode) when a node is deactivated.
	onSelect: null, // Callback(flag, dtnode) when a node is (de)selected.
	onExpand: null, // Callback(dtnode) when a node is expanded/collapsed.
	onLazyRead: null, // Callback(dtnode) when a lazy node is expanded for the first time.
	
	// Drag'n'drop support
	dnd: {
		// Make tree nodes draggable:
		onDragStart: null, // Callback(sourceNode), return true, to enable dnd
		onDragStop: null, // Callback(sourceNode)
		helper: null,
		// Make tree nodes accept draggables
        autoExpandMS: 1000, // Expand nodes after n milliseconds of hovering.
		onDragEnter: null, // Callback(targetNode, sourceNode)
		onDragOver: null, // Callback(targetNode, sourceNode, hitMode)
		onDrop: null, // Callback(targetNode, sourceNode, hitMode)
		onDragLeave: null // Callback(targetNode, sourceNode)
	},
	ajaxDefaults: { // Used by initAjax option
		cache: false, // false: Append random '_' argument to the request url to prevent caching.
		dataType: "json" // Expect json format and pass json object to callbacks.
	},
	strings: {
		loading: "Loading&#8230;",
		loadError: "Load error!"
	},
	generateIds: false,
	idPrefix: "dynatree-id-", // Used to generate node id's like <span id="dynatree-id-<key>">.
//    cookieId: "dynatree-cookie", // Choose a more unique name, to allow multiple trees.
    cookieId: "dynatree", // Choose a more unique name, to allow multiple trees.
	cookie: {
		expires: null //7, // Days or Date; null: session cookie
//		path: "/", // Defaults to current page
//		domain: "jquery.com",
//		secure: true
	},
    // Class names used, when rendering the HTML markup.
	// Note: if only single entries are passed for options.classNames, all other 
	// values are still set to default. 
	classNames: {
		container: "dynatree-container",
		node: "dynatree-node",
		folder: "dynatree-folder",
//		document: "dynatree-document",
		
		empty: "dynatree-empty",
		vline: "dynatree-vline",
		expander: "dynatree-expander",
		connector: "dynatree-connector",
		checkbox: "dynatree-checkbox",
		nodeIcon: "dynatree-icon",
		title: "dynatree-title",
		noConnector: "dynatree-no-connector",
		
		nodeError: "dynatree-statusnode-error",
		nodeWait: "dynatree-statusnode-wait",
		hidden: "dynatree-hidden",
		combinedExpanderPrefix: "dynatree-exp-",
		combinedIconPrefix: "dynatree-ico-",
//		disabled: "dynatree-disabled",
		hasChildren: "dynatree-has-children",
		active: "dynatree-active",
		selected: "dynatree-selected",
		expanded: "dynatree-expanded",
		lazy: "dynatree-lazy",
		focused: "dynatree-focused",
		partsel: "dynatree-partsel",
		lastsib: "dynatree-lastsib"
	},
	debugLevel: 2, // 0:quiet, 1:normal, 2:debug $REPLACE:	debugLevel: 1,

	// ------------------------------------------------------------------------
	lastentry: undefined
};

/*******************************************************************************
 * Reserved data attributes for a tree node.
 */
$.ui.dynatree.nodedatadefaults = {
	title: null, // (required) Displayed name of the node (html is allowed here)
	key: null, // May be used with activate(), select(), find(), ...
	isFolder: false, // Use a folder icon. Also the node is expandable but not selectable.
	isLazy: false, // Call onLazyRead(), when the node is expanded for the first time to allow for delayed creation of children.
	tooltip: null, // Show this popup text.
	icon: null, // Use a custom image (filename relative to tree.options.imagePath). 'null' for default icon, 'false' for no icon.
	addClass: null, // Class name added to the node's span tag.  
	activate: false, // Initial active status.
	focus: false, // Initial focused status.
	expand: false, // Initial expanded status.
	select: false, // Initial selected status.
	hideCheckbox: false, // Suppress checkbox display for this node.
	unselectable: false, // Prevent selection.
//  disabled: false,	
	// The following attributes are only valid if passed to some functions:
	children: null, // Array of child nodes.
	// NOTE: we can also add custom attributes here.
	// This may then also be used in the onActivate(), onSelect() or onLazyTree() callbacks.
	// ------------------------------------------------------------------------
	lastentry: undefined
};

/*******************************************************************************
 * Drag and drop support
 */
function _initDragAndDrop(tree) {
	var dnd = tree.options.dnd || null;
	// Register 'connectToDynatree' option with ui.draggable
	if(dnd && (dnd.onDragStart || dnd.onDrop)) {
		_registerDnd();
	}
	// Attach ui.draggable to this Dynatree instance
	if(dnd && dnd.onDragStart ) {
	    tree.$tree.draggable({
            addClasses: false,
            appendTo: "body",
            containment: false,
            delay: 0,
            distance: 4,
            revert: false,
            // Delegate draggable.start, drag, and stop events to our handler
            connectToDynatree: true,
            // Let source tree create the helper element
		    helper: function(event) {
                var sourceNode = getDtNodeFromElement(event.target);
	            return sourceNode.tree._onDragEvent("helper", sourceNode, null, event, null, null);
		    },
            _last: null
        });
	}
	// Attach ui.droppable to this Dynatree instance
	if(dnd && dnd.onDrop) {
	    tree.$tree.droppable({
	        addClasses: false,
	        tolerance: "touch",    
	        greedy: false,
	        _last: null
	    });
	}
}

//--- Extend ui.draggable event handling --------------------------------------
var didRegisterDnd = false; 
var _registerDnd = function() {
	if(didRegisterDnd)
		return;
	$.ui.plugin.add("draggable", "connectToDynatree", {
	    start: function(event, ui) {
	        var draggable = $(this).data("draggable");
	        var sourceNode = ui.helper.data("dtSourceNode") || null;
	        logMsg("draggable-connectToDynatree.start, %o", sourceNode);
	        logMsg("    this: %o", this);
	        logMsg("    event: %o", event);
	        logMsg("    draggable: %o", draggable);
	        logMsg("    ui: %o", ui);
	        if(sourceNode) {
	            // Adjust helper offset for tree nodes
/*
	            var sourcePosition = $(sourceNode.span).position();
	            var cssPosition = $(ui.helper).position();
	            logMsg("    draggable.offset.click: %s/%s", draggable.offset.click.left, draggable.offset.click.top);
	            logMsg("    sourceNode.position: %s/%s", sourcePosition.left, sourcePosition.top);
	            logMsg("    helper.position: %s/%s", cssPosition.left, cssPosition.top);
	            logMsg("    event.target.offset: %s/%s,  %sx%s", event.target.offsetLeft, event.target.offsetTop, event.target.offsetWidth, event.target.offsetHeight);
	            logMsg("    draggable.positionAbs: %s/%s", draggable.positionAbs.left, draggable.positionAbs.top);
*/
	            // Adjust helper offset, so cursor is slightly outside top/left corner
//	        	draggable.offset.click.top -= event.target.offsetTop;
//	            draggable.offset.click.left -= event.target.offsetLeft;
	        	draggable.offset.click.top = -2; 
	            draggable.offset.click.left = + 16;
	            logMsg("    draggable.offset.click FIXED: %s/%s", draggable.offset.click.left, draggable.offset.click.top);
	            // Trigger onDragStart event
	            // TODO: when called as connectTo..., the return value is ignored(?)
	            return sourceNode.tree._onDragEvent("start", sourceNode, null, event, ui, draggable);
	        }
	    },
	    drag: function(event, ui) {
	        var draggable = $(this).data("draggable");
	        var sourceNode = ui.helper.data("dtSourceNode") || null;
			var prevTargetNode = ui.helper.data("dtTargetNode") || null;
	        var targetNode = getDtNodeFromElement(event.target);
	        ui.helper.data("dtTargetNode", targetNode);
	        // Leaving a tree node
	        if(prevTargetNode && prevTargetNode !== targetNode ) {
	            prevTargetNode.tree._onDragEvent("leave", prevTargetNode, sourceNode, event, ui, draggable);
	        }
	        if(targetNode){
	            if(!targetNode.tree.options.dnd.onDrop) {
	            	// not enabled as drop target
	            } else if(targetNode === prevTargetNode) {
	                // Moving over same node
	                targetNode.tree._onDragEvent("over", targetNode, sourceNode, event, ui, draggable);
	            }else{
	                // Entering this node first time
	                targetNode.tree._onDragEvent("enter", targetNode, sourceNode, event, ui, draggable);
	            }
	        }
	        // else go ahead with standard event handling
	    },
	    stop: function(event, ui) {
	        var draggable = $(this).data("draggable");
	        var sourceNode = ui.helper.data("dtSourceNode") || null;
	        var targetNode = getDtNodeFromElement(event.target);
	//        var targetTree = targetNode ? targetNode.tree : null;
	//        if(dtnode && dtnode.tree.
	        logMsg("draggable-connectToDynatree.stop, %o", sourceNode);
	        var mouseDownEvent = draggable._mouseDownEvent;
	        var eventType = event.type;
	        logMsg("    type: %o, downEvent: %o, upEvent: %o", eventType, mouseDownEvent, event);
	        var dropped = (eventType == "mouseup" && event.which == 1);
	        if(!dropped)
	            logMsg("Drag was cancelled");
	        if(targetNode) { 
	            if(dropped) 
	                targetNode.tree._onDragEvent("drop", targetNode, sourceNode, event, ui, draggable);
	            targetNode.tree._onDragEvent("leave", targetNode, sourceNode, event, ui, draggable);
	        }
	        if(sourceNode) 
	            sourceNode.tree._onDragEvent("stop", sourceNode, null, event, ui, draggable);
	    }
	});
	didRegisterDnd = true;
};


// ---------------------------------------------------------------------------
})(jQuery);

// Eclipse syntax parser breaks on this expression, so we put it at the bottom.
var _rexDtLibName = /.*dynatree[^/]*\.js$/i;