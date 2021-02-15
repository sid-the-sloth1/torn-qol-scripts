// ==UserScript==
// @name         Company Stock Order
// @namespace    hardy.company.stock
// @version      1.0
// @description  Auto-fills Company Stock
// @author       Hardy [2131687]
// @match        https://www.torn.com/companies.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var cooldown = setInterval(fillStock, 1500);
    function fillStock() {
        let form = document.querySelector("form[action^='companies.php?step=stock1']");
        if (form) {
            clearInterval(cooldown);
            let nodeList = document.querySelector(".stock-list-wrap .stock-list").children;
            for (const node of nodeList) {
                if (!node.className) {
                    let amount = node.querySelector(".info-wrap .sold-daily").innerText;
                    console.log(amount);
                    node.querySelector(".quantity input").value = amount;
                }
            }
        }
    }
})();
