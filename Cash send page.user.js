// ==UserScript==
// @name         Money Send
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.torn.com/sendcash.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var cd = setInterval (a, 1000);
    function a() {
        if (document.querySelectorAll('.amount.input-money').length > 0) {
            clearInterval(cd);
            let node = document.querySelectorAll(".amount.input-money")
            for (const b of node) {
                b.value = 1000000;
            }
            document.querySelector(".message-wrap .input-wrap .message").value = "Thanks (:";
            document.querySelector("#anonymous").checked = true;
        }
    }
})();
