// ==UserScript==
// @name         Gimme Smokes
// @namespace    hardy.gimme.smokes
// @version      0.1
// @description  Helps to buy smoke grenades
// @author       Father [2131687]
// @match        https://www.torn.com/index.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    //Special thanks to Lugburz for his scripts that served as inspiration for this one.
    let price = 20000;
    if (document.body.getAttribute("data-abroad") && !window.location.href.includes("page=people")) {
        let data = getInfo();
        let input = document.querySelector("input#item-226");
        if (data.country === "South Africa" && input) {
            let msg = document.querySelector("#mainContainer > div.content-wrapper > div.info-msg-cont");
            let button = document.createElement("button");
            button.innerText = "Gimme Smokes";
            button.id = "hardy_gimme_smokes";
            msg.querySelector(".msg").appendChild(button);
            button.addEventListener("click", ()=> {
                let stock = parseInt(input.getAttribute("data-amount").replace(/[$,]/g, ""));
                data = getInfo();
                if (data.rem > stock) {
                    data.rem = stock;
                }
                getAction({
                    type: 'post',
                    action: `shops.php`,
                    data: {
                        step: 'buyShopItem',
                        ID: 42,
                        amount: data.rem,
                        travelShop: 1
                    },
                    success: (str) => {
                        try {
                            const msg = JSON.parse(str);
                            $('H4').html(msg.text).css('color', msg.success ? 'green' : 'red');
                        } catch (e) {
                            console.log(e);
                        }
                    }
                });
            });
        }
    }
    function getInfo() {
        let obj = {"country": "N/A", "money": 0, "capacity": 0, "bought": 0, "rem": 0};
        let country_array = ["Mexico", "Switzerland","UAE", "Cayman Islands", "Canada", "Hawaii", "United Kingdom", "Argentina", "Japan", "China", "South Africa"];
        let msg = document.querySelector("#mainContainer > div.content-wrapper > div.info-msg-cont");
        let bolds = msg.querySelectorAll(".bold");
        let country = bolds[0].innerText;
        if (country_array.indexOf(country) !== -1 && bolds.length === 4) {
            obj.country = country;
            obj.money = parseInt(bolds[1].innerText.replace(/[$,]/g, ""));
            obj.bought = parseInt(bolds[2].innerText);
            obj.capacity = parseInt(bolds[3].innerText);
            let rem = obj.capacity - obj.bought;
            if (rem > 0) {
                let quotient = Math.floor(obj.money/price);
                if (quotient < rem) {
                    rem = quotient;
                }
                obj.rem = rem;
            }
        }
        return obj;
    }
    GM_addStyle('#hardy_gimme_smokes {display: inline; padding: 6px; border: 1px solid; border-radius: 5px; background-color: white;}');
})();
