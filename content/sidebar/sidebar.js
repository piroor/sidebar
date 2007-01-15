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

var gPanelBox;
var gPanelBoxHeight = 0;

// Sidebarをたたむ/元に戻す
function toggleSidebarWindowCollapsed(aNotToSave)
{
	if (gPanelBox.boxObject.height)
		gPanelBoxHeight = gPanelBox.boxObject.height; // 常に、開いた状態の高さを保持しておく

	if (!aNotToSave) {
		nsPreferences.setBoolPref('sidebar.collapsed', !gPanelBox.collapsed);
		nsPreferences.setIntPref('sidebar.panelBoxHeight', gPanelBoxHeight);
		nsPreferences.setIntPref('sidebar.width', window.outerWidth);
		nsPreferences.setIntPref('sidebar.height', window.outerHeight);
	}

	window.resizeBy(
		0,
		(gPanelBox.collapsed ? gPanelBoxHeight : -gPanelBoxHeight )
	);
	gPanelBox.collapsed = !gPanelBox.collapsed;
}

// 自動で隠す/再表示
function toggleSidebarWindowCollapsedAutomatically(aEvent)
{
	if (!gSidebarAutoCollapse) return;

	var x = aEvent.screenX;
	var y = aEvent.screenY;
	if (gPanelBox.collapsed) {
		if (x >= window.screenX &&
			x <= window.screenX + window.outerWidth &&
			y >= window.screenY &&
			y <= window.screenY + window.outerHeight) {
			// 最初に開く時は、初期化する必要がある
			if (!sidebarObj.panels) sidebar_overlay_init();
			toggleSidebarWindowCollapsed();
		}
	}
	else {
		if (x < window.screenX ||
			x > window.screenX + window.outerWidth ||
			y < window.screenY ||
			y > window.screenY + window.outerHeight)
			toggleSidebarWindowCollapsed();
	}
}

// サイドバーを自動で隠すチェックを切り替える
function toggleSidebarWindowAutoCollapse()
{
	try {
		gSidebarAutoCollapse = !nsPreferences.getBoolPref('sidebar.autocollapse', false);
		nsPreferences.setBoolPref('sidebar.autocollapse', gSidebarAutoCollapse);
	}
	catch(e) {
	}

	if (!gSidebarAutoCollapse && gPanelBox.collapsed)
		toggleSidebarWindowCollapsed();
}

// サイドバーの最全面表示のチェックを切り替える
function toggleSidebarAlwaysRaised()
{
	if (navigator.platform.match(/mac/i)) {
		nsPreferences.setBoolPref('sidebar.alwaysRaised', false);
		return;
	}

	try {
		nsPreferences.setBoolPref('sidebar.alwaysRaised', !nsPreferences.getBoolPref('sidebar.alwaysRaised', true));

		var nav = getSidebarHostWindow();
		if (getSidebarWindow() && nav)
			nav.setTimeout('hideSidebarWindow(); showSidebarWindow();', 10);
	}
	catch(e) {
	}
}


function updateSidebarWindowTitlebar()
{
	var panel = sidebarObj.panels.get_panel_from_id(SidebarGetLastSelectedPanel());
	if (!panel) {
		sidebarObj.panels.select_default_panel();
		panel = sidebarObj.panels.get_panel_from_id(SidebarGetLastSelectedPanel());
	}
	if (!panel) return;

	var newTitle = '';
	var docTitle = panel.header.getAttribute('label') || '' ;
	var modifier = document.documentElement.getAttribute('titlemodifier');
	if (docTitle) {
		newTitle += docTitle;
		var sep = document.documentElement.getAttribute('titlemenuseparator');
		if (modifier) newTitle += sep;
	}
	newTitle += modifier;
	window.title = newTitle;
}


function onLoad()
{
	// NS6ではcontentAreaClick.js内でnsIPrefServiceとして宣言されている。Moz1.0以降では未定義状態なので、このままだと中ボタンクリックなどの場合に設定が読み込めない。
	if (!window.pref)
		window.pref = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);

	toggleSidebarWindowCheck(true);

	// パネル内からwindow._contentなどを参照している場合への対処
	OverrideFunctions();
	document.getElementById('sidebar-panels').addEventListener('load', SidebarWindowOverrideContentWindowPointerEventListener, true);


	window.__sidebar__contentAreaClick = window.contentAreaClick;
	window.contentAreaClick = SidebarWindowContentAreaClick;


	nsPreferences.setBoolPref('sidebar.show', true);

	gPanelBox = document.getElementById('sidebar-panels');

	try {
		if (nsPreferences.getBoolPref('sidebar.collapsed', false)) {
			gPanelBoxHeight = nsPreferences.getIntPref('sidebar.panelBoxHeight', gPanelBoxHeight);
			window.resizeTo(
				nsPreferences.getIntPref('sidebar.width'),
				nsPreferences.getIntPref('sidebar.height')
			);
			toggleSidebarWindowCollapsed();
		}
	}
	catch(e) {
	}

	window.addEventListener('mouseover', toggleSidebarWindowCollapsedAutomatically, true);
	window.addEventListener('mouseout', toggleSidebarWindowCollapsedAutomatically, true);

	document.getElementById('sidebar-box').addEventListener('load', updateSidebarWindowTitlebar, true);


	if ('sidebarWindowStartupOverlayForUndocked' in window)
		sidebarWindowStartupOverlayForUndocked();

	var host = getSidebarHostWindow();
	if (host)
		host.SidebarWindowStateWatcher.start();
}

function onUnload()
{
	toggleSidebarWindowCheck(false);
	if (document.getElementById('sidebar-panels').collapsed)
		toggleSidebarWindowCollapsed(true);

	document.getElementById('sidebar-panels').removeEventListener('load', SidebarWindowOverrideContentWindowPointerEventListener, true);

	if (getSidebarHostWindow() &&
		isSidebarUndocked()) {
		nsPreferences.setBoolPref('sidebar.show', false);

		if (nsPreferences.getBoolPref('sidebar.autoClose') &&
			!nsPreferences.getBoolPref('sidebar.hideOnStartup'))
			nsPreferences.setBoolPref('sidebar.shouldShow', true);
	}

}
