// ==UserScript==
// @name         Colorblind Helper
// @namespace    hardy.colorblind.helper
// @version      0.1
// @description  Changes color of Online and Idle icons
// @author       Father [2131687]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    const online_color = "rgb(128, 149, 255)";
    const idle_color = "rgb(255, 153, 102)";
    GM_addStyle(`
div#chatRoot div[class *= "_online_"][class *= "_minimized_"] div[class ^= "_chat-box-title_"], div#chatRoot div[class *= "_away_"][class *= "_minimized_"] div[class ^= "_chat-box-title_"] { text-align: center; padding: 10px 0; }
div#chatRoot div[class *= "_online_"] i[class ^= "_icon_1p"], div#chatRoot div[class *= "_away_"] i[class ^= "_icon_1p"] { background-image: none!important; border-radius: 50%; height: 8px; width: 8px; }
div#chatRoot div[class *= "_online_"] i[class ^= "_icon_1p"], #icon1, li[id ^= "icon1-"], li[id ^= "icon1_"] { background-color: ${online_color}!important; }
div#chatRoot div[class *= "_away_"] i[class ^= "_icon_1p"], #icon62, li[id ^= "icon62-"], li[id ^= "icon62_"] { background-color: ${idle_color}!important; }
#icon1, li[id ^= "icon1-"], li[id ^= "icon1_"], #icon62, li[id ^= "icon62-"], li[id ^= "icon62_"] { background-image: none!important; border-radius: 50%; height: 13px!important; width: 13px!important; }
div#chatRoot div[class *= "_chat-active_"][class *= "_online_"] i[class ^= "_icon_1p"], div#chatRoot div[class *= "_chat-active_"][class *= "_online_"] span, div#chatRoot div[class *= "_chat-active_"][class *= "_away_"] i[class ^= "_icon_1p"], div#chatRoot div[class *= "_chat-active_"][class *= "_away_"] span { margin: 8px; }
    `);
})();
