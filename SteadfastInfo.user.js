// ==UserScript==
// @name         GYM Steadfast
// @namespace   hardy.gym.steadfast
// @version     1.2
// @description Shows Faction steadfast info on gym page
// @author       Hardy [2131687]
// @match        https://www.torn.com/index.php*
// @match        https://www.torn.com/gym.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      api.torn.com
// ==/UserScript==

(function() {
    'use strict';
    let apiKey = "xxx";

    function readPerks() {
        let obj = {};
        obj.steadfast = {};
        let perkList = document.querySelector("#personal-perks .list-cont").children;
        for (var p = 0; p < perkList.length; p++) {
            let perk = perkList[p].innerText;
            if (perk.startsWith("Faction") && perk.includes("gym")) {
                let string = perk.split("Increases ")[1].split(" ");
                let stat = string[0];
                let bonus = string[4];
                obj.steadfast[stat] = bonus;

            }
        }
        obj.time = Date.now()/1000;
        localStorage.setItem("gym_bonuses", JSON.stringify(obj));
        console.log(obj);
    }
    function getData() {
        GM_xmlhttpRequest({
            method: 'GET',
            timeout: 20000,
            url: 'https://api.torn.com/user/?selections=perks&key='+apiKey,
            responseType: 'json',
            onload: function(e) {
                try {
                    let apiData = JSON.parse(e.responseText);
                    if (apiData["error"]) {
                        document.querySelector(".hardy_gym_box").innerHTML = '<p class="hardy_gym_label">'+apiData["error"]["error"]+'</p>';
                    } else {
                        let perks = apiData["faction_perks"];
                        let obj = {};
                        obj.steadfast = {};
                        for (var k = 0; k < perks.length; k++) {
                            let string = perks[k];
                            if (string.includes("gym")) {
                                let text = string.split(" ");
                                let stat = text[2];
                                let bonus = text[6];
                                obj.steadfast[stat] = bonus;
                            }
                        }
                        obj.time = Date.now()/1000;
                        localStorage.setItem("gym_bonuses", JSON.stringify(obj));
                        setTimeout(showData, 2500);
                    }
                }
                catch (error) {
                    document.querySelector(".hardy_gym_box").innerHTML = `<p class="hardy_gym_label">${error.message}</p>`;
                }
            },
            onerror: (err) => {
                document.querySelector(".hardy_gym_box").innerHTML = `<p class="hardy_gym_label">${err}</p>`;
            },
            ontimeout: (g) => {
                document.querySelector(".hardy_gym_box").innerHTML = '<p class="hardy_gym_label">Request timed out.</p>';
            }
        });
    }

    function showData() {
        let html1 = '<br><br><div id="hardy_gymbox_header">Steadfast</div><div class="hardy_gym_box"><p class="hardy_gym_label">Loading data..</p></div><br><br>';
        if ($("#hardy_gymbox_header").length == 0) {
            $("#gymroot").append(html1);
        }

        let data = localStorage.getItem("gym_bonuses")
        if (typeof data == "undefined" || data === null) {
            getData();
        } else {
            let info = JSON.parse(data);

            if (Date.now()/1000 - info.time < 3600) {
                let steadfast = info.steadfast;
                let array = [];
                for (var h in steadfast) {
                    let capital = h.split("");
                    capital[0] = capital[0].toUpperCase();
                    array.push(`<p class="hardy_gym_label">${capital.join("")}: ${steadfast[h]}</p>`);
                }
                let text = array.join("\n");
                if (text == "") {
                    document.querySelector(".hardy_gym_box").innerHTML = "<p class=\"hardy_gym_label\">Your faction doesn't have any Steadfast bonus</p>";
                } else {
                    document.querySelector(".hardy_gym_box").innerHTML = text;

                }

            } else {
                getData();
            }
        }
    }

    if (window.location.href.includes("index.php")) {
        let perkBox = document.querySelectorAll("#personal-perks");
        if (perkBox.length >0) {
            readPerks();
        }
    } else if (window.location.href.includes("gym.php")) {
        if ($(".captcha").length == 0) {
            showData();
        }
    }

    GM_addStyle(`
     .hardy_gym_box {padding: 10px; border-radius: 8px; background-color: rgb(242, 242, 242); box-shadow: 0px 4px 9px 3px rgba(119, 119, 119, 0.64); -moz-box-shadow: 0px 4px 9px 3px rgba(119, 119, 119, 0.64);}
#hardy_gymbox_header { background-color: #0d0d0d; border: 2px solid #000; border-radius: 0.5em 0.5em 0 0; text-indent: 0.5em; font-size: 18px; color: #ffff}
.hardy_gym_label {font-family: Helvetica; font-size: 1rem; margin-bottom: 5px;}
`);

})();
