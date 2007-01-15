/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the Sidebar Window.
 *
 * The Initial Developer of the Original Code is SHIMODA Hiroshi.
 * Portions created by the Initial Developer are Copyright (C) 2002-2005
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): SHIMODA Hiroshi <piro@p.club.ne.jp>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// Sidebarウィンドウ 
var gSidebarAutoCollapse        = false;
var gSidebarHostWindowLastState = window.windowState;
	
// 関数 
	
// サイドバーを分離 
function undockSidebar()
{
	if (isSidebarUndocked()) return;

	try {
		if (!nsPreferences.getBoolPref('sidebar.enabled'))
			nsPreferences.setBoolPref('sidebar.enabled', true);
	}
	catch(e) {
	}
	showSidebarWindow();
	hideAllSidebars();
}
 
// サイドバーを結合 
function dockSidebar()
{
	if (!isSidebarUndocked()) return;

	try {
		if (nsPreferences.getBoolPref('sidebar.enabled'))
			nsPreferences.setBoolPref('sidebar.enabled', false);
	}
	catch(e) {
	}
	var nav = getSidebarHostWindow();
	if (nav) nav.setTimeout('hideSidebarWindow(); showSidebar();', 10);
}
 
// サイドバーの表示・非表示を切り替える 
function SidebarWindowShowHide()
{
	try {
		if (nsPreferences.getBoolPref('sidebar.enabled')) {
			if (getSidebarWindow())
				hideSidebarWindow();
			else
				showSidebarWindow();

			return;
		}
	}
	catch(e) {
	}

	window.__sidebar__SidebarShowHide();
}
	
// Sidebarウィンドウを表示 
function showSidebarWindow(aX, aY)
{
	var sidebar = getSidebarWindow();
	if (sidebar) {
		if (aX !== void(0) || aY !== void(0))
			sidebar.moveTo(
				(aX === void(0) ? target.screenX : aX ),
				(aY === void(0) ? target.screenY : aY )
			);
		sidebar.focus();
		return sidebar;
	} else {
		// initialize important objects before the window is opened.
		if (window.sidebarObj && !sidebarObj.master_datasources) {
			if (!sidebarObj.panels)
				sidebarObj.panels = new sbPanelList('sidebar-panels');
			if (!sidebarObj.datasource_uri)
				sidebarObj.datasource_uri = get_sidebar_datasource_uri();
			if (!sidebarObj.resource)
				sidebarObj.resource = 'urn:sidebar:current-panel-list';

			if (!sidebarObj.master_datasources)
				sidebarObj.master_datasources = get_remote_datasource_url() + ' chrome://browser/content/sidebar/local-panels.rdf';
			if (!sidebarObj.master_resource)
				sidebarObj.master_resource = 'urn:sidebar:master-panel-list';
			if (!sidebarObj.component)
				sidebarObj.component = document.firstChild.getAttribute('windowtype');
		}
		return window.openDialog(
				'chrome://sidebar/content/',
				'_blank',
				'chrome,all,dialog=no'+
				(nsPreferences.getBoolPref('sidebar.alwaysRaised') ? ',alwaysRaised' : '' )+
				(aX !== void(0) ? ',screenX='+aX : '' )+
				(aY !== void(0) ? ',screenY='+aY : '' )
			);
	}
}
 
// Sidebarウィンドウを閉じる 
function hideSidebarWindow()
{
	var sidebar = getSidebarWindow();
	if (sidebar) sidebar.close();
}
 
// このウィンドウのサイドバーを表示する 
function showSidebar()
{
	if (sidebar_is_hidden())
		window.__sidebar__SidebarShowHide();
}
 
// 全てのウィンドウのサイドバーを隠す 
function hideAllSidebars()
{
	var targets,
		target,
		menuitem;

	var WINMAN;
	if ('@mozilla.org/appshell/window-mediator;1' in Components.classes)
		WINMAN = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	else
		WINMAN = Components.classes['@mozilla.org/rdf/datasource;1?name=window-mediator'].getService(Components.interfaces.nsIWindowMediator);
	targets = WINMAN.getEnumerator(null);
	while (targets.hasMoreElements())
	{
		target = targets.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);

		if (target.sidebar_is_hidden && !target.sidebar_is_hidden())
			target.__sidebar__SidebarShowHide();
	}
}
  
// 自動でたたむ 
function toggleSidebarCollapsedAutomatically(aEvent)
{
	if (!nsPreferences.getBoolPref('sidebar.autocollapse')) return;

	var sidebarBox      = document.getElementById('sidebar-panels-splitter-box');
	var sidebarSplitter = document.getElementById('sidebar-panels-splitter');
	if (document.getElementById('sidebar-box').firstChild == sidebarSplitter)
		sidebarSplitter = document.getElementById('sidebar-splitter');

	// Sidebarの上で起こったイベントかどうかを調べる
	var onSidebar = false;
	var node      = aEvent.originalTarget;
	var nodeWrapper = new XPCNativeWrapper(node, 'nodeType', 'parentNode');
	if (Components.lookupMethod(node, 'nodeType').call(node) != Node.ELEMENT_NODE)
		node = Components.lookupMethod(node, 'parentNode').call(node);
	if (!node) return;

	while (
		node &&
		Components.lookupMethod(node, 'parentNode').call(node)
	)
	{
		if (node == sidebarBox || node == sidebarSplitter) onSidebar = true;
		node = Components.lookupMethod(node, 'parentNode').call(node);
	}

	var opened = (sidebarSplitter.getAttribute('state') != 'collapsed');

	var eventDocument = Components.lookupMethod(aEvent.target, 'ownerDocument').call(aEvent.target)

	if (
		(onSidebar && opened) ||
		(!onSidebar && !opened) ||
		(eventDocument != document && eventDocument == gBrowser.contentDocument && !opened) ||
		(eventDocument != document && eventDocument != gBrowser.contentDocument)
		) return;

	sidebarSplitter.setAttribute('state', (opened ? 'collapsed' : 'open'));

	// 最初に開く時は、初期化する必要がある
	if (!opened && !sidebarObj.panels) sidebar_overlay_init();

	aEvent.preventBubble();
}
	
// サイドバーを自動でたたむチェックを切り替える 
function toggleSidebarAutoCollapse()
{
	try {
		gSidebarAutoCollapse = !nsPreferences.getBoolPref('sidebar.autocollapse');
		nsPreferences.setBoolPref('sidebar.autocollapse', gSidebarAutoCollapse);
	}
	catch(e) {
	}

	if (!gSidebarAutoCollapse)
		document.getElementById('sidebar-splitter').setAttribute('state', 'open');
}
 
function toggleSidebarWindowAutoClose() 
{
	nsPreferences.setBoolPref('sidebar.autoClose', !nsPreferences.getBoolPref('sidebar.autoClose'));
}
 
function toggleSidebarWindowAutoMinimize() 
{
	nsPreferences.setBoolPref('sidebar.autoMinimize', !nsPreferences.getBoolPref('sidebar.autoMinimize'));
}
 
function toggleSidebarWindowHideOnStartup() 
{
	nsPreferences.setBoolPref('sidebar.hideOnStartup', !nsPreferences.getBoolPref('sidebar.hideOnStartup'));
}
  
function toggleSidebarButtonsShowHide() 
{
	nsPreferences.setBoolPref('sidebar.splitter.hideButtons', !nsPreferences.getBoolPref('sidebar.splitter.hideButtons'));

	document.getElementById('sidebar-splitter').setAttribute('sidebarWindowHideButtons', nsPreferences.getBoolPref('sidebar.splitter.hideButtons'));
}
 
// コンテキストメニューの更新 
function SidebarWindowInitContextMenu(aMenu, aPopupNode)
{
	var panel = sidebarObj.panels.get_panel_from_header_node(aPopupNode);

	var switchItem = document.getElementById('switch-ctx-item');
	var reloadItem = document.getElementById('reload-ctx-item');
	var stopItem = document.getElementById('stop-ctx-item');
	var hideItem = document.getElementById('hide-ctx-item');
	var removeItem = document.getElementById('remove-ctx-item');
	var renameItem = document.getElementById('rename-ctx-item');
	var loadInBrowserItem = document.getElementById('sidebarLoadInBrowser-ctx-item');
	var autoCollapseItem = document.getElementById('autocollapse-ctx-item');
	var hideOnStartupItem = document.getElementById('hideonstartup-ctx-item');
	var showHideButtonsItem = document.getElementById('showHideButtons-ctx-item');

	var operateSep = stopItem.nextSibling;
//	var operateSep = document.getElementById('operate-ctx-sep');
	var renameSep = renameItem.nextSibling;
	var hideSep = removeItem.nextSibling;
//	var hideSep = document.getElementById('hide-ctx-sep');

	var windowtype = document.documentElement.getAttribute('windowtype');

	if (gSidebarLoadInBrowser)
		loadInBrowserItem.setAttribute('checked', true);
	else
		loadInBrowserItem.removeAttribute('checked');

	if (gSidebarAutoCollapse)
		autoCollapseItem.setAttribute('checked', true);
	else
		autoCollapseItem.removeAttribute('checked');

	if (!nsPreferences.getBoolPref('sidebar.splitter.hideButtons'))
		showHideButtonsItem.setAttribute('checked', true);
	else
		showHideButtonsItem.removeAttribute('checked');

	if (nsPreferences.getBoolPref('sidebar.hideOnStartup'))
		hideOnStartupItem.setAttribute('checked', 'true');
	else
		hideOnStartupItem.removeAttribute('checked');

	if (windowtype != 'navigator:browser')
		showHideButtonsItem.setAttribute('hidden', true);
	else
		showHideButtonsItem.removeAttribute('hidden');

	if (!panel)
	{
		switchItem.setAttribute('hidden', 'true');
		reloadItem.setAttribute('hidden', 'true');
		stopItem.setAttribute('hidden', 'true');
		hideItem.setAttribute('hidden', 'true');
		removeItem.setAttribute('hidden', 'true');
		renameItem.setAttribute('hidden', 'true');

		operateSep.setAttribute('hidden', 'true');
		hideSep.setAttribute('hidden', 'true');
		renameSep.setAttribute('hidden', 'true');
	} else
	{
		reloadItem.removeAttribute('hidden');
		stopItem.removeAttribute('hidden');
		hideItem.removeAttribute('hidden');
		removeItem.removeAttribute('hidden');
		renameItem.removeAttribute('hidden');
		renameSep.removeAttribute('hidden');

		operateSep.removeAttribute('hidden');
		hideSep.removeAttribute('hidden');

		// the current panel can be reloaded, but other panels are not showing
		// any content, so we only allow you to switch to other panels
		if (panel.is_selected())
		{
			switchItem.setAttribute('hidden', 'true');
			reloadItem.removeAttribute('disabled');
		}
		else
		{
			switchItem.removeAttribute('hidden');
			reloadItem.setAttribute('disabled', 'true');
		}

		// only if a panel is currently loading enable the ``Stop'' item
		if (panel.get_iframe().getAttribute('loadstate') == 'loading')
			stopItem.removeAttribute('disabled');
		else
			stopItem.setAttribute('disabled', 'true');

		if (panel)
			hideItem.removeAttribute('disabled');
		else
			hideItem.setAttribute('disabled', 'true');

		if (panel.id.match(/^urn:sidebar:panel:/)) {
			renameItem.setAttribute('disabled', 'true');
		}
		else {
			renameItem.removeAttribute('disabled');
		}
	}

}
 
// メニューのチェックを切り替える 
function toggleSidebarWindowCheck(aToCheck)
{
	var targets,
		target,
		menuitem;

	var WINMAN;
	if ('@mozilla.org/appshell/window-mediator;1' in Components.classes)
		WINMAN = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	else
		WINMAN = Components.classes['@mozilla.org/rdf/datasource;1?name=window-mediator'].getService(Components.interfaces.nsIWindowMediator);
	targets = WINMAN.getEnumerator(null);
	while (targets.hasMoreElements())
	{
		target = targets.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);
		menuitem = target.document.getElementById('sidebar-menu');
		if (menuitem) {
			if (aToCheck)
				menuitem.setAttribute('checked', true);
			else
				menuitem.removeAttribute('checked');
		}
	}
}
  
// マネージャ 
var SidebarWindowManager =
{
	RDF       : Components.classes['@mozilla.org/rdf/rdf-service;1'].getService(Components.interfaces.nsIRDFService),
	RDFCUtils : Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils),
	IOService : Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService),

	get msg()
	{
		if (!this._msg) {
			var STRBUNDLE = Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService);
			this._msg = STRBUNDLE.createBundle('chrome://sidebar/locale/sidebar.properties');
		}
		return this._msg;
	},
	_msg : null,

	get datasource()
	{
		if (!this._datasource) {
			const DIR = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties);
			var dir = DIR.get('UPnls', Components.interfaces.nsILocalFile);
			this._datasource = this.RDF.GetDataSource(this.getURLSpecFromFile(dir)).QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
		}
		return this._datasource;
	},
	_datasource : null,

	get RDFC()
	{
		if (!this._RDFC) {
			this._RDFC = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);

			var seqTarget = this.datasource.GetTarget(
					this.listRes,
					this.RDF.GetResource('http://home.netscape.com/NC-rdf#panel-list'),
					true
				);

			this._RDFC.Init(this.datasource, seqTarget);
		}
		return this._RDFC;
	},
	_RDFC : null,

	get listRes()
	{
		if (!this._listRes) {
			this._listRes = this.RDF.GetResource('urn:sidebar:current-panel-list');
		}
		return this._listRes;
	},
	_listRes : null,

	get PromptService()
	{
		if (!this.mPromptService)
			this.mPromptService = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].getService(Components.interfaces.nsIPromptService);
		return this.mPromptService;
	},
	mPromptService : null,
	
// Common Functions 
	
	getURLSpecFromFile : function(aFile) 
	{
		var uri;
		try {
			var fileHandler = this.IOService.getProtocolHandler('file').QueryInterface(Components.interfaces.nsIFileProtocolHandler);
			uri = fileHandler.getURLSpecFromFile(aFile);
		}
		catch(e) { // for old versions
			try {
				uri = this.IOService.newFileURI(aFile).spec;
			}
			catch(e) { // for Mozilla 1.1
				uri = this.IOService.getURLSpecFromFile(aFile);
			}
		}
		return uri;
	},
  
	addPanel : function(aURI, aTitle, aNoConfirm) 
	{
		if (!aURI ||
			!aURI.match(/^(https?|ftp|file|chrome|resource):\/\//)) return;

		var check = { value : null };
		var retVal;

		check.value = aNoConfirm || nsPreferences.getBoolPref('sidebar.noconfirm.add');
		if (!check.value) {
			retVal = this.PromptService.confirmCheck(
				window,
				this.msg.GetStringFromName('messages_title'),
				this.msg.GetStringFromName('add_panel_confirm').replace(/%s/gi, aTitle || '').replace(/%uri/gi, aURI),
				this.msg.GetStringFromName('add_panel_never_show_dialog'),
				check
			);
			if (retVal && check.value)
				nsPreferences.setBoolPref('sidebar.noconfirm.add', true);
			if (!retVal)
				return;
		}


		if (!aTitle) {
			var titleObj = { value : null };
			this.PromptService.prompt(
				window,
				this.msg.GetStringFromName('messages_title'),
				this.msg.GetStringFromName('add_panel_title'),
				titleObj,
				null,
				null
			);
			aTitle = titleObj.value;
			if (!aTitle) return;
		}

		var res = this.RDF.GetResource('urn:sidebar:3rdparty-panel:'+aURI);
		this.datasource.Assert(
			res,
			this.RDF.GetResource('http://home.netscape.com/NC-rdf#title'),
			this.RDF.GetLiteral(aTitle),
			true
		);
		this.datasource.Assert(
			res,
			this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
			this.RDF.GetLiteral(aURI),
			true
		);

		this.RDFC.AppendElement(res);

		this.refresh();

		window.setTimeout(
			function()
			{
				var nodes = document.getElementById('sidebar-panels').getElementsByAttribute('content', aURI);
				if (nodes.length)
					SidebarSelectPanel(nodes[0].parentNode.previousSibling, false, false);
			},
			0
		);
	},

	
	addNewPanel : function() 
	{
		var doc = gBrowser.contentDocument;
		var uri = Components.lookupMethod(doc, 'URL').call(doc);
		if (uri == 'about:blank') return;

		if (sidebar_is_hidden()) SidebarShowHide();
		if (sidebar_is_collapsed()) SidebarExpandCollapse();

		this.addPanel(uri, Components.lookupMethod(doc, 'title').call(doc));
	},
  
	loadPanel : function() 
	{
		var panel = sidebarObj.panels.get_panel_from_id(SidebarGetLastSelectedPanel());
		if (!panel) return;

		var uri = panel.header.nextSibling.lastChild.getAttribute('content');

		if (gBrowser.currentURI.spec == 'about:blank')
			gBrowser.loadURI(uri);
		else
			gBrowser.selectedTab = gBrowser.addTab(uri);

		if (!sidebar_is_collapsed()) SidebarExpandCollapse();
	},
 
	renamePanel : function(aURI, aTitle) 
	{
		var res = this.RDF.GetResource('urn:sidebar:3rdparty-panel:'+aURI);
		var resURI;
		try {
			resURI = this.datasource.GetTarget(
				res,
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
				true
			).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		}
		catch(e) {
		}

		if (resURI) {
			var newTitle = prompt(this.msg.GetStringFromName('change_panel_title').replace(/%s/gi, aTitle), aTitle);
			if (!newTitle) return;

			this.datasource.Change(
				res,
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#title'),
				this.RDF.GetLiteral(aTitle),
				this.RDF.GetLiteral(newTitle)
			);
		}
		else {
			return;
		}

		this.refresh();
	},
	
	renameContextPanel : function() 
	{
		var panel = sidebarObj.panels.get_panel_from_header_node(document.popupNode);
		if (!panel) return;

		this.renamePanel(
			panel.header.nextSibling.lastChild.getAttribute('content'),
			panel.header.getAttribute('label')
		);
	},
  
	removePanel : function(aURI, aTitle) 
	{
		var check = { value : nsPreferences.getBoolPref('sidebar.noconfirm.remove') };
		if (!check.value) {
			var retVal = this.PromptService.confirmCheck(
				window,
				this.msg.GetStringFromName('messages_title'),
				this.msg.GetStringFromName('remove_panel_confirm').replace(/%s/gi, aTitle || ''),
				this.msg.GetStringFromName('remove_panel_never_show_dialog'),
				check
			);
			if (retVal && check.value)
				nsPreferences.setBoolPref('sidebar.noconfirm.remove', true);
			if (!retVal)
				return;
		}

		var res = this.RDF.GetResource('urn:sidebar:3rdparty-panel:'+aURI);

		var resURI;
		try {
			resURI = this.datasource.GetTarget(
				res,
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
				true
			).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
		}
		catch(e) {
		}

		if (resURI) {
			this.datasource.Unassert(
				res,
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#title'),
				this.RDF.GetLiteral(aTitle)
			);
			this.datasource.Unassert(
				res,
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
				this.RDF.GetLiteral(aURI)
			);
		}
		else {
			res = this.datasource.GetSource(
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
				this.RDF.GetLiteral(aURI),
				true
			).QueryInterface(Components.interfaces.nsIRDFResource);
		}

		this.RDFC.RemoveElement(res, true);

		this.refresh();
	},
	
	removeContextPanel : function() 
	{
		var panel = sidebarObj.panels.get_panel_from_header_node(document.popupNode);
		if (!panel) return;

		this.removePanel(
			panel.header.nextSibling.lastChild.getAttribute('content'),
			panel.header.getAttribute('label')
		);
	},
  
	movePanel : function(aEvent, aTransferData, aSession) 
	{
		var node = aEvent.target;
		var targetClass = node.getAttribute('class');
		while (!targetClass && node.parentNode)
		{
			node = node.parentNode;
			targetClass = node.getAttribute('class');
		}

		if (targetClass != 'box-texttab texttab-sidebar' &&
			targetClass != 'sidebarheader-main')
			return;

		var uri   = aTransferData.data.split('\n')[0];
		var title = aTransferData.data.split('\n')[1];
		var res   = this.RDF.GetResource('urn:sidebar:3rdparty-panel:'+uri);
		try {
			var resId = this.datasource.GetTarget(
					res,
					this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
					true
				).QueryInterface(Components.interfaces.nsIRDFResource);
		}
		catch(e) {
			res = this.datasource.GetSource(
				this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
				this.RDF.GetLiteral(uri),
				true
			).QueryInterface(Components.interfaces.nsIRDFResource);
		}

		var index = (targetClass == 'sidebarheader-main') ? 1 : 0 ;
		if (!index) {
			var targetURI = node.nextSibling.lastChild.getAttribute('content');
			var targetRes = this.RDF.GetResource('urn:sidebar:3rdparty-panel:'+targetURI);

			try {
				var targetId = this.datasource.GetTarget(
						targetRes,
						this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
						true
					).QueryInterface(Components.interfaces.nsIRDFResource);
			}
			catch(e) {
				targetRes = this.datasource.GetSource(
					this.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
					this.RDF.GetLiteral(targetURI),
					true
				).QueryInterface(Components.interfaces.nsIRDFResource);
			}

			index = this.RDFC.IndexOf(targetRes);

			if (!index) index = 1;
			if (index > this.RDFC.GetCount()) index = this.RDFC.GetCount();
		}

		this.RDFC.RemoveElement(res, true);
		this.RDFC.InsertElementAt(res, index, true);

		this.refresh();

		SidebarRebuild();
	},
 
	refresh : function() 
	{
		var refreshRes = this.RDF.GetResource('http://home.netscape.com/NC-rdf#refresh');
		var trueRes = this.RDF.GetLiteral('true');
		this.datasource.Assert(this.listRes, refreshRes, trueRes, true);
		this.datasource.Unassert(this.listRes, refreshRes, trueRes);

		this.datasource.Flush();
	},
 
//　パネルのD&D 
	canHandleMultipleItems : false,
	currentDragPanelId     : null,
	
	onDragStart : function(aEvent, aTransferData, aDragAction) 
	{
		if (aEvent.target.getAttribute('class') != 'box-texttab texttab-sidebar')
			return;

		var uri = aEvent.target.nextSibling.lastChild.getAttribute('content');
		var title = aEvent.target.getAttribute('label');

		if (aEvent.ctrlKey || aEvent.metaKey) {
			window.setTimeout(function(aURI, aTitle, aManager) { aManager.removePanel(aURI, aTitle); }, 0, uri, title, this);
			return;
		}

		this.currentDragPanelId = aEvent.target.id;

		aTransferData.data = new TransferData();
		aTransferData.data.addDataForFlavour('xul/sidebarpanel', uri+'\n'+title);

		aTransferData.data.addDataForFlavour('text/x-moz-url', uri+'\n'+title);
		aTransferData.data.addDataForFlavour('text/html', '<a href="'+uri+'">'+title+'</a>');
		aTransferData.data.addDataForFlavour('text/unicode', uri);
	},
 
	onDrop : function(aEvent, aTransferData, aSession) 
	{
		var uri   = null,
			title = null;
		switch(aTransferData.flavour.contentType)
		{
			case 'xul/sidebarpanel':
				this.movePanel(aEvent, aTransferData, aSession);
				return;
				break;

			case 'text/x-moz-url':
				uri   = aTransferData.data.split('\n')[0];
				title = aTransferData.data.split('\n')[1];
				break;

			case 'text/unicode':
				if (aTransferData.data.match(/^\w+:\/\//)) return;
				uri = aTransferData.data;
				break;

			case 'application/x-moz-file':
				uri = this.getURLSpecFromFile(aTransferData.data);
				break;

			default:
				break;
		}

		var sourceDoc = aSession.sourceDocument;
		if (sourceDoc) {
			var sourceURI = sourceDoc.documentURI;

			const nsIScriptSecurityManager = Components.interfaces.nsIScriptSecurityManager;
			var secMan = Components.classes['@mozilla.org/scriptsecuritymanager;1'].getService(nsIScriptSecurityManager);
			try {
				secMan.checkLoadURIStr(sourceURI, uri, nsIScriptSecurityManager.STANDARD);
			}
			catch(e) {
				aEvent.stopPropagation();
				throw 'Drop of ' + uri + ' denied.';
			}
		}

		this.addPanel(uri, title);
	},
 
	onDragExit : function(aEvent, aSession) 
	{
		if (aEvent.target.getAttribute('class') != 'box-texttab texttab-sidebar')
			return;

		aEvent.target.removeAttribute('dragging-over');
	},
 
	onDragOver : function(aEvent, aFlavour, aSession) 
	{
		if (aEvent.target.getAttribute('class') != 'box-texttab texttab-sidebar')
			return;

		var XferDataSet = nsTransferable.get(
				this.getSupportedFlavours(),
				nsDragAndDrop.getDragData,
				true
			);
		var XferData = XferDataSet.first.first;
		if (XferData.flavour.contentType != 'xul/sidebarpanel') return;

		aEvent.target.setAttribute('dragging-over', true);
	},
 
	getSupportedFlavours : function () 
	{
		var flavours = new FlavourSet();
		flavours.appendFlavour('xul/sidebarpanel');
		flavours.appendFlavour('text/x-moz-url');
		flavours.appendFlavour('text/unicode');
		flavours.appendFlavour('application/x-moz-file', 'nsIFile');
		return flavours;
	}
  
}; 
  
// Sidebar 自体のD&D 
var SidebarWindowDNDObserver =
{
	canHandleMultipleItems : false,

	onDragStart : function(aEvent, aTransferData, aDragAction)
	{
		if (aEvent.target != document.getElementById('sidebar-title-box')) return false;

		aTransferData.data = new TransferData();
		aTransferData.data.addDataForFlavour(
			'xul/sidebar',
			'sidebar\n'+
			'hostwindow='+document.documentElement.getAttribute('windowtype')
		);
		return true;
	},

	// ウィンドウ内にドロップしたら、Sidebarに切り替える
	onDrop : function(aEvent, aTransferData, aSession)
	{
		// フロート表示から戻す時以外は何もしない
		if (aTransferData.flavour.contentType == 'xul/sidebar' && // xul/sidebar 以外のデータの場合は何もしない
			document.documentElement.getAttribute('windowtype') != 'communicator:sidebar' &&
			aTransferData.data.split('\n')[1] == 'hostwindow=communicator:sidebar')
			dockSidebar();
	},

	// ウィンドウ外にドラッグしたら、Sidebar Windowに切り替える
	onDragExit : function(aEvent, aSession)
	{
		// xul/sidebar 以外のデータの場合は何もしない
		var data = nsTransferable.get(
				this.getSupportedFlavours(),
				nsDragAndDrop.getDragData,
				true
			);
		if (!data.first ||
			!data.first.first ||
			data.first.first.flavour.contentType != 'xul/sidebar') return;

		if (document.documentElement.getAttribute('windowtype') != 'communicator:sidebar' &&
			!getSidebarWindow())
			undockSidebar(aEvent.screenX, aEvent.screenY);
	},

	onDragOver : function(aEvent, aFlavour, aSession)
	{
	},

	getSupportedFlavours : function ()
	{
		var flavours = new FlavourSet();
		flavours.appendFlavour('xul/sidebar');
		return flavours;
	}
};
 
// fix for bug2703(jp) 
// http://bugzilla.mozilla.gr.jp/show_bug.cgi?id=2703
function SidebarWindowSelectPanel(aHeader, aShouldPopopen, aShouldUnhide)
{
	if (aShouldUnhide && getSidebarWindow())
		aShouldUnhide = false;

	return __sidebar__SidebarSelectPanel(aHeader, aShouldPopopen, aShouldUnhide);
}
 
// fix for bug2703(jp) 
// http://bugzilla.mozilla.gr.jp/show_bug.cgi?id=2703
/*
function SidebarWindowRevealSearchPanel()
{
	var searchPanel = document.getElementById('urn:sidebar:panel:search');
	if (searchPanel)
		SidebarSelectPanel(searchPanel, true, nsPreferences.getBoolPref('browser.search.opensidebarsearchpanel_force', true));
}
*/
 
function SidebarWindowContentAreaClick(aEvent, aFieldNormalClick) 
{
	var w = sidebarWindowGetWindowFromDocument(aEvent.originalTarget.ownerDocument);
		w = Components.lookupMethod(w, 'top').call(w);
	var panel = sidebarObj.panels.get_panel_from_id(SidebarGetLastSelectedPanel());
	if (!panel || !gSidebarLoadInBrowser)
		return __sidebar__contentAreaClick(aEvent, aFieldNormalClick);

	var b = panel.header.nextSibling.lastChild;
	if (w != b.contentWindow)
		return __sidebar__contentAreaClick(aEvent, aFieldNormalClick);

	// if the panel is not a third party's, do nothing.
	var resURI;
	try {
		resURI = SidebarWindowManager.datasource.GetTarget(
			SidebarWindowManager.RDF.GetResource('urn:sidebar:3rdparty-panel:'+b.getAttribute('content')),
			SidebarWindowManager.RDF.GetResource('http://home.netscape.com/NC-rdf#content'),
			true
		).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
	}
	catch(e) {
	}
	if (!resURI)
		return __sidebar__contentAreaClick(aEvent, aFieldNormalClick);


	var linkNode;
	switch ((Components.lookupMethod(aEvent.target, 'localName').call(aEvent.target) || '').toLowerCase())
	{
		case 'a':
		case 'area':
		case 'link':
			if (Components.lookupMethod(aEvent.target, 'hasAttribute').call(aEvent.target, 'href'))
				linkNode = aEvent.target;
			break;
		default:
			linkNode = findParentNode(aEvent.originalTarget, 'a');
			if (linkNode &&
				!Components.lookupMethod(linkNode, 'hasAttribute').call(linkNode, 'href'))
				linkNode = null;
			break;
	}

	if (!linkNode ||
		aEvent.button != 0 ||
		aEvent.ctrlKey ||
		aEvent.shiftKey ||
		aEvent.altKey ||
		aEvent.metaKey)
		return __sidebar__contentAreaClick(aEvent, aFieldNormalClick);

	var linkWrapper = new XPCNativeWrapper(linkNode,
			'ownerDocument',
			'getAttribute()'
		);

	var target;
	var base = Components.lookupMethod(linkWrapper.ownerDocument, 'getElementsByTagName').call(linkWrapper.ownerDocument, 'base');
	if (base && base.length)
		for (var i = base.length-1; i > -1 ; i--)
			if (base[i].target)
				target = base[i].target;

	if (linkWrapper.getAttribute('target'))
		target = linkWrapper.getAttribute('target');

	if (
		!target || target == '_content' || target  == '_main'
		) {
		if (!linkWrapper.getAttribute('href') || linkWrapper.getAttribute('onclick'))
			return true;
		var url = getShortcutOrURI(linkWrapper.getAttribute('href'));
		if (!url) return true;
		aEvent.preventDefault();
		loadURI(url);
		return false;
	}
	else if (linkWrapper.getAttribute('rel') == 'sidebar') {
		aEvent.preventDefault();
		SidebarWindowManager.addPanel(
			url,
			linkNode.getAttribute('title') || ''
		);
		return false;
	}
	return __sidebar__contentAreaClick(aEvent, aFieldNormalClick);
}
 
function toggleSidebarLoadInBrowser() 
{
	gSidebarLoadInBrowser = !gSidebarLoadInBrowser;
	nsPreferences.setBoolPref('sidebar.loadInBrowserPane', gSidebarLoadInBrowser);
}
 
//=================================================
// 汎用の関数 
	
// ウィンドウを取得 
function getTopWinOf(aWindowType)
{
	var WINMAN;
	if ('@mozilla.org/appshell/window-mediator;1' in Components.classes)
		WINMAN = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	else
		WINMAN = Components.classes['@mozilla.org/rdf/datasource;1?name=window-mediator'].getService(Components.interfaces.nsIWindowMediator);
	var topWindowOfType = WINMAN.getMostRecentWindow(aWindowType);

	return topWindowOfType || null ;
}

function getWindowsOf(aWindowType)
{
	var WINMAN;
	if ('@mozilla.org/appshell/window-mediator;1' in Components.classes)
		WINMAN = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	else
		WINMAN = Components.classes['@mozilla.org/rdf/datasource;1?name=window-mediator'].getService(Components.interfaces.nsIWindowMediator);
	var targetWindows = [];
	var targets = WINMAN.getEnumerator(aWindowType, true),
		target;
	while (targets.hasMoreElements())
	{
		target = targets.getNext().QueryInterface(Components.interfaces.nsIDOMWindowInternal);
		targetWindows.push(target);
	}

	return targetWindows;
}
 
// ナビゲータを取得 
function getSidebarHostWindow()
{
	return getTopWinOf('navigator:browser') || getTopWinOf('composer:html') || getTopWinOf('mail:3pane');
}
function getSidebarHostWindows()
{
	return [].concat(getWindowsOf('navigator:browser'), getWindowsOf('composer:html'), getWindowsOf('mail:3pane'));
}
 
function getSidebarWindow() 
{
	return getTopWinOf('communicator:sidebar');
}
 
// フローティングの有効無効を調べる 
function isSidebarUndocked()
{
	try {
		return nsPreferences.getBoolPref('sidebar.enabled');
	}
	catch(e) {
	}
	return false;
}
 
function sidebarWindowGetWindowFromDocument(aDocument) 
{
	rootDocShell = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
					.getInterface(Components.interfaces.nsIWebNavigation)
					.QueryInterface(Components.interfaces.nsIDocShell);

	const kDSTreeNode = Components.interfaces.nsIDocShellTreeNode;
	const kDSTreeItem = Components.interfaces.nsIDocShellTreeItem;
	const kWebNav     = Components.interfaces.nsIWebNavigation;

	var rootDocShell = rootDocShell
			.QueryInterface(kDSTreeNode)
			.QueryInterface(kDSTreeItem)
			.QueryInterface(kWebNav);
	var docShell = rootDocShell;
	traceDocShellTree:
	do {
		if (docShell.document == aDocument)
			return docShell
					.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
					.getInterface(Components.interfaces.nsIDOMWindow);

		if (docShell.childCount) {
			docShell = docShell.getChildAt(0);
			docShell = docShell
				.QueryInterface(kDSTreeNode)
				.QueryInterface(kWebNav);
		}
		else {
			parentDocShell = docShell.parent.QueryInterface(kDSTreeNode);
			while (docShell.childOffset == parentDocShell.childCount-1)
			{
				docShell = parentDocShell;
				if (docShell == rootDocShell || !docShell.parent)
					break traceDocShellTree;
				parentDocShell = docShell.parent.QueryInterface(kDSTreeNode);
			}
			docShell = parentDocShell.getChildAt(docShell.childOffset+1)
				.QueryInterface(kDSTreeNode)
				.QueryInterface(kWebNav);
		}
	} while (docShell != rootDocShell);

	return null;
};
  
var SidebarWindowStateWatcher = 
{
	domain  : 'sidebar.autoMinimize',
	timer   : null,

	defaultInterval : 200,

	get enabled()
	{
		return nsPreferences.getBoolPref(this.domain);
	},

	observe : function(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;

		var sidebar = this.service.sidebarWindow;
		var active  = this.enabled;
		if (!active || !sidebar) {
			this.stop();
		}
		else if (active && sidebar) {
			this.start();
		}
	},

	checkWindowState : function()
	{
		var sidebar = getSidebarWindow();
		var host    = getSidebarHostWindow();

		if (host && !sidebar) host.SidebarWindowStateWatcher.stop();
		if (!host || !sidebar) return;

		if (host.windowState == host.STATE_MINIMIZED) {
			if (host.gSidebarHostWindowLastState == host.STATE_NORMAL) {
				host.gSidebarHostWindowLastState = host.STATE_MINIMIZED;
				sidebar.hostState = host.STATE_MINIMIZED;
				if (sidebar.windowState != sidebar.STATE_MINIMIZED)
					sidebar.minimize();
			}
		}
		else {
			if (host.gSidebarHostWindowLastState == host.STATE_MINIMIZED) {
				host.gSidebarHostWindowLastState = host.STATE_NORMAL;
				if (sidebar.windowState == sidebar.STATE_MINIMIZED)
					sidebar.restore();
			}
		}
	},

	start : function()
	{
		if (!this.timer)
			this.timer = window.setInterval(
				this.checkWindowState,
				Math.max(nsPreferences.getIntPref('sidebar.autoMinimizeInterval'), 0) || this.defaultInterval
			);
	},

	stop : function()
	{
		if (this.timer) {
			window.clearInterval(this.timer);
			this.timer = null;
		}
	},

	init : function()
	{
		try {
			var pbi = this.service.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			pbi.addObserver(this.domain, this, false);

			this.observe(null, 'nsPref:changed', null);
		}
		catch(e) {
		}
	},

	destroy : function()
	{
		this.stop();
		try {
			var pbi = this.service.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			pbi.removeObserver(this.domain, this, false);
		}
		catch(e) {
		}
	},

};
 
function SidebrWindowLoadDefaultPrefs() 
{
	const ioService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);
	const uri = ioService.newURI('chrome://sidebar/content/default.js', null, null);
	var content;
	try {
		var channel = ioService.newChannelFromURI(uri);
		var stream  = channel.open();

		var scriptableStream = Components.classes['@mozilla.org/scriptableinputstream;1'].createInstance(Components.interfaces.nsIScriptableInputStream);
		scriptableStream.init(stream);

		content = scriptableStream.read(scriptableStream.available());

		scriptableStream.close();
		stream.close();
	}
	catch(e) {
	}

	if (!content) return;


	var DEFPrefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getDefaultBranch(null);
	function pref(aPrefstring, aValue)
	{
		var type;
		try {
			type = typeof aValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				var string = ('@mozilla.org/supports-wstring;1' in Components.classes) ?
						Components.classes['@mozilla.org/supports-wstring;1'].createInstance(this.knsISupportsString) :
						Components.classes['@mozilla.org/supports-string;1'].createInstance(this.knsISupportsString) ;
				string.data = aValue;
				DEFPrefs.setComplexValue(aPrefstring, this.knsISupportsString, string);
				break;
			case 'number':
				DEFPrefs.setIntPref(aPrefstring, parseInt(aValue));
				break;
			default:
				DEFPrefs.setBoolPref(aPrefstring, aValue);
				break;
		}
		return true;
	}
	var user_pref = pref; // alias

	eval(content);
}
 
//=================================================
// 初期化 

function SidebarWindowStartup()
{
	if ('sidebarWindowStartupOverlayForDocked' in window)
		sidebarWindowStartupOverlayForDocked();


	window.__sidebar__SidebarShowHide = window.SidebarShowHide;
	window.SidebarShowHide = window.SidebarWindowShowHide;

	window.__sidebar__SidebarSelectPanel = window.SidebarSelectPanel;
	window.SidebarSelectPanel = window.SidebarWindowSelectPanel;

	window.__sidebar__contentAreaClick = window.contentAreaClick;
	window.contentAreaClick = SidebarWindowContentAreaClick;

/*
	// fix for bug2703(jp) http://bugzilla.mozilla.gr.jp/show_bug.cgi?id=2703
	if (window.RevealSearchPanel)
		window.RevealSearchPanel = window.SidebarWindowRevealSearchPanel;
	if (nsPreferences.getBoolPref('browser.search.opensidebarsearchpanel_force') === null)
		nsPreferences.setBoolPref('browser.search.opensidebarsearchpanel_force', true);
*/

	document.getElementById('content').addEventListener('mouseover', toggleSidebarCollapsedAutomatically, true);
	window.addEventListener('mouseover', toggleSidebarCollapsedAutomatically, true);

	// when only this window is the first browser
	if (nsPreferences.getBoolPref('sidebar.shouldShow') &&
		getSidebarHostWindows().length == 1) {
		nsPreferences.setBoolPref('sidebar.shouldShow', false);
		nsPreferences.setBoolPref('sidebar.show', true);
	}

	if (nsPreferences.getBoolPref('sidebar.hideOnStartup'))
		nsPreferences.setBoolPref('sidebar.show', false);

	try {
		if (nsPreferences.getBoolPref('sidebar.enabled')) {
			if (!sidebar_is_hidden())
				window.__sidebar__SidebarShowHide();
			if (nsPreferences.getBoolPref('sidebar.show'))
				showSidebarWindow();
		}
		else if (nsPreferences.getBoolPref('sidebar.hideOnStartup') &&
			!sidebar_is_hidden())
			window.__sidebar__SidebarShowHide();
	}
	catch(e) {
	}

	var hideButtons = document.documentElement.getAttribute('windowtype') != 'navigator:browser' || nsPreferences.getBoolPref('sidebar.splitter.hideButtons');
	document.getElementById('sidebar-splitter').setAttribute('sidebarWindowHideButtons', hideButtons);

	SidebarWindowStateWatcher.init();
}

function SidebarWindowShutdown()
{
	document.getElementById('content').addEventListener('mouseover', toggleSidebarCollapsedAutomatically, true);
	window.removeEventListener('mouseover', toggleSidebarCollapsedAutomatically, true);

	var sidebar = getSidebarWindow();
	var hosts   = getSidebarHostWindows();
	if (
		sidebar &&
		nsPreferences.getBoolPref('sidebar.autoClose') &&
		(
			!hosts.length ||
			(hosts.length == 1 && hosts[0] == window)
		)
		)
		sidebar.close();

	SidebarWindowStateWatcher.destroy();
}


gSidebarAutoCollapse = nsPreferences.getBoolPref('sidebar.autocollapse');
gSidebarLoadInBrowser = nsPreferences.getBoolPref('sidebar.loadInBrowserPane');

SidebrWindowLoadDefaultPrefs();

if (document.documentElement.getAttribute('windowtype') != 'communicator:sidebar' &&
	window == Components.lookupMethod(window, 'top').call(window)) {
	window.addEventListener('load', SidebarWindowStartup, false);
	window.addEventListener('unload', SidebarWindowShutdown, false);

	window.addEventListener(
		'dragdrop',
		function(aEvent)
		{
			if (sidebarWindowGetWindowFromDocument(aEvent.originalTarget.ownerDocument) != Components.lookupMethod(window, 'top').call(window))
				return;
			nsDragAndDrop.drop(aEvent, SidebarWindowDNDObserver);
		},
		true
	);
	window.addEventListener(
		'dragexit',
		function(aEvent)
		{
			nsDragAndDrop.dragExit(aEvent, SidebarWindowDNDObserver);
		},
		true
	);
	window.addEventListener(
		'dragover',
		function(aEvent)
		{
			// browser crashes if the event is dispatched from sidebar panels and so on.
			if (
				sidebarWindowGetWindowFromDocument(
					Components.lookupMethod(aEvent.originalTarget, 'ownerDocument').call(aEvent.originalTarget)
				) != Components.lookupMethod(window, 'top').call(window)
				)
				return;
			nsDragAndDrop.dragOver(aEvent, SidebarWindowDNDObserver);
		},
		true
	);
}
  
