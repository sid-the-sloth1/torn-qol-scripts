// ==UserScript==
// @name         Faction Revive Filter
// @namespace    hardy.facFilter
// @version      0.1
// @description  Helps Filtering Faction Members
// @author       You
// @match        https://www.torn.com/factions.php?step=profile&*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    let hideDes = true;
    let hospFilter = true;
    let okayFilter = false;
    let travelFilter = false;
    let jailFilter = false;
    let hospMin = 50;
    if (hideDes) {
        GM_addStyle('.faction-description {display: none;}');
    }
    let nodeList = document.querySelectorAll("li.table-row");
    for (const node of nodeList) {
        node.style.display = "none";
        if (hospFilter) {
            let hospIcon = node.querySelector("li[id^='icon15']");
            if (hospIcon) {
                let hospRemTime = parseInt(hospIcon.getAttribute("title").split("data-time='")[1].split("'")[0]);
                if (hospRemTime > (hospMin*60)) {
                    node.style.display = "flex";
                }
            }
        }
        let statusText = node.querySelector(".table-cell.status").innerText;
        if (statusText.includes("Okay") && okayFilter) {
          node.style.display = 'flex';
        }
        if (statusText.includes("Traveling") && travelFilter) {
          node.style.display = 'flex';
        }
        if (statusText.includes("Jail") && travelFilter) {
          node.style.display = 'flex';
        }
        let activityIconNode = node.querySelector(".big.svg.singleicon");
        if (activityIconNode.querySelector("li[id^='icon62']")) {
            node.setAttribute("activity", "idle");
        } else if (activityIconNode.querySelector("li[id^='icon1']")) {
            node.setAttribute("activity", "online");
        } else if (activityIconNode.querySelector("li[id^='icon2']")) {
            node.setAttribute("activity", "offline");
        }
    }
    GM_addStyle(`
li[activity='online'] {-webkit-order: 1; order: 1;}
li[activity='offline'] {-webkit-order: 3; order: 3;}
li[activity='idle'] {-webkit-order: 2; order: 2;}
`);
})();
