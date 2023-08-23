// ==UserScript==
// @name         Compact Chat Icons
// @namespace    hardy.chat.icons.compact
// @version      0.1
// @description  Makes Icons of Global, Faction, Company and Trade chat to be compact
// @author       Father [2131687]
// @match        https://www.torn.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    GM_addStyle(`#chatRoot div:not([class*="chat-active"])[class*="_company_"] div[class^="_chat-box-head_"], #chatRoot div:not([class*="chat-active"])[class*="_global_"] div[class^="_chat-box-head_"], #chatRoot div:not([class*="chat-active"])[class*="_faction_"] div[class^="_chat-box-head_"], #chatRoot div:not([class*="chat-active"])[class*="_trade_"] div[class^="_chat-box-head_"] {width: 34px!important;}`);
})();
