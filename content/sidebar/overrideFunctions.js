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
 * Portions created by the Initial Developer are Copyright (C) 2002-2004
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


function OverrideFunctions()
{
	SidebarWindowOverrideContentWindowPointer(window);

	window.getBrowser = function()
	{
		return getSidebarHostWindow() ? getSidebarHostWindow().getBrowser() :
			!sidebarWindowIsClosing ? window.openDialog(getBrowserURL(), '_blank', 'chrome,all,dialog=no') :
			null ;
	};

	window.loadURI = function(aURI, aReferrer, aCharset)
	{
		if (getSidebarHostWindow())
			getSidebarHostWindow().loadURI(aURI, aReferrer, aCharset);
		else if (!sidebarWindowIsClosing)
			window.openDialog(getBrowserURL(), '_blank', 'chrome,all,dialog=no', aURI, aCharset, aReferrer);
	};

	window.__sidebar__getReferrer = window.getReferrer;
	window.getReferrer = function(aDocument)
	{
		if (aDocument == window.document) {

			var panel = sidebarObj.panels.get_panel_from_id(SidebarGetLastSelectedPanel());

			var uri = Components.classes['@mozilla.org/network/io-service;1']
				                .getService(Components.interfaces.nsIIOService)
				                .newURI(panel.get_iframe().contentWindow.location.href, null, null);

			if (uri.scheme.match(/^(chrome|resource|file)/))
				return null;
			else
				return uri;
		}
		return window.__sidebar__getReferrer(aDocument);
	};


	window.SidebarShowHide = window.close;


	if (window.openNewTabWith.toString().match(/navigator:browser/))
		window.openNewTabWith = function(aURI)
		{
			if (sidebarWindowIsClosing) return;

			urlSecurityCheck(aURI, document);

			var browser = getSidebarHostWindow();
			if (!browser) {
				window.openDialog(getBrowserURL(), '_blank', 'chrome,all,dialog=no', aURI, '', null);
				return;
			}

			var tab = browser.getBrowser().addTab(url, getReferrer(document));
			if (!nsPreferences.getBoolPref('browser.tabs.loadInBackground'))
				browser.getBrowser().selectedTab = tab;
		};

}

function SidebarWindowOverrideContentWindowPointer(aWindow)
{
	aWindow.__proto__.__defineGetter__('_content', SidebarWindowContentGetter);
	aWindow.__proto__.__defineGetter__('content', SidebarWindowContentGetter);
	aWindow.__proto__.__defineGetter__('_content.frames', SidebarWindowFramesGetter);
	aWindow.__defineGetter__('_content', SidebarWindowContentGetter);
	aWindow.__defineGetter__('content', SidebarWindowContentGetter);
	aWindow.__defineGetter__('_content.frames', SidebarWindowFramesGetter);
}
function SidebarWindowOverrideContentWindowPointerEventListener(aEvent)
{
	var w;
	try {
		w = aEvent.originalTarget;
	}
	catch(e) {
	}
	if (!w) w = aEvent.target;


	if (!('document' in w))
		w = sidebarWindowGetWindowFromDocument(w.ownerDocument ? w.ownerDocument : w);

	SidebarWindowOverrideContentWindowPointer(w);
}

function SidebarWindowContentGetter()
{
	var contentWindow = getSidebarHostWindow();
	if (contentWindow) {
		contentWindow = contentWindow.gBrowser.contentWindow;
	}
	else {
		const XULNS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

		var b = sidebarObj.panels.get_panel_from_id(SidebarGetLastSelectedPanel()).get_content().getElementsByAttribute('type', 'content')[0];
		if (b)
			return b.contentWindow;
		else
			return window;
	}

	if (contentWindow) {
		contentWindow.framesSelf = contentWindow.frames;

		contentWindow.framesSum = [];
		var i;
		for (i = 0; i < contentWindow.framesSelf.length; i++)
			contentWindow.framesSum.push(contentWindow.framesSelf[i]);
		for (i = 0; i < window.frames.length; i++)
			contentWindow.framesSum.push(window.frames[i]);

		contentWindow.__defineGetter__('frames', function() { return this.framesSum; });
	}
	return contentWindow || window ;
}

// _content.frames の isDocumentFrame(frame) は _content.frames の中に与えられたframeが含まれているかどうかを調べるが、Sidebar Windowでは当然エラーになる。その暫定的な対処。
function SidebarWindowFramesGetter()
{
	var contentWindow = SidebarWindowContentGetter();
	if (contentWindow) {
		var ret = [],
			i;
		for (i = 0; i < contentWindow.frames.length; i++)
			ret.push(contentWindow.frames[i]);
		for (i = 0; i < window.frames.length; i++)
			ret.push(window.frames[i]);

		return ret;
	}
	else
		return window.frames;
}




var sidebarWindowIsClosing = false;
window.addEventListener(
	'close',
	function()
	{
		sidebarWindowIsClosing = true;
	},
	false
);
