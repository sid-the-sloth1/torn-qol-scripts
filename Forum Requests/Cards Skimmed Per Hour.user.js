// ==UserScript==
// @name         Card Skimming Rate
// @namespace    hardy.card.skim.rate
// @version      0.5
// @description  Shows the rate of card skimming on Card Skimming Page
// @author       Father [2131687]
// @match        https://www.torn.com/loader.php?sid=crimes*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    let waitObj = {};
    window.onhashchange = initiate;
    initiate();
    function initiate() {
        const page = window.location.href;
        if (page.includes("/cardskimming")) {
            waitForElement(`div[class^="crimeOptionGroup"]`, 700, 999, "djhadgj").then((element) => {
                const nodeParent = document.querySelectorAll('div[class^="crimeOptionGroup"]')[1];
                const installParent = document.querySelectorAll('div[class^="crimeOptionGroup"]')[0];
                if (installParent) {
                    const installList = installParent.querySelectorAll('div[class^="crimeOption_"]');
                    for (const node of installList) {
                        var installNode = node;
                        break;
                    }
                }
                if (nodeParent) {
                    const nodeList = nodeParent.querySelectorAll('div[class^="crimeOption_"]');
                    const nodeArray = [];
                    const skimsPerHour = [];
                    const rankings = [];
                    let totalSkims = 0;
                    let totalHours = 0;

                    for (const node of nodeList) {
                        const timeNode = node.querySelector('div[class*="timeSection_"]');
                        const str = timeNode.innerText.trim();
                        const hr = convertTimeToHours(str);
                        const countNode = node.querySelector('span[class*="statusCards_"]');
                        const count = countNode? parseInt(countNode.innerText.trim()) : 0;
                        totalSkims += +count;
                        totalHours += +hr;
                        nodeArray.push(node)
                        skimsPerHour.push(calculateRate(hr,count))
                    }
                    const nodesAndSkims = []

                    for (let j = 0; j < skimsPerHour.length; j++) {
                        let topDog = 0;
                        let record = -1;
                        for (let i = 0; i < skimsPerHour.length; i++) {
                            if (skimsPerHour[i] > record) {
                                topDog = i;
                                record = skimsPerHour[i];
                            }
                        }
                        nodesAndSkims.push([nodeArray[topDog],record])
                        skimsPerHour[topDog] = -1;
                    }
                    const totalAverage = totalSkims / totalHours;
                    for (let k = 1; k <= nodesAndSkims.length; k++) {
                        nodesAndSkims[k-1][0].querySelector('div[class*="crimeOptionSection_"]').innerText += " - " + nodesAndSkims[k-1][1] + "/hr, #" + k;
                    }
                    const span = document.createElement("span");
                    span.id = "hardySkimTot";
                    span.textContent = totalAverage.toFixed(2) * skimsPerHour.length + " details being collected per hour across " + skimsPerHour.length + " skimmers";
                  document.querySelector('div[class*="firstGroup_"]').appendChild(span);
                }
            }).catch(error => {
                console.log(error);
            });
        } else {
            waitObj.djhadgj = 0;
        }
    }
    function waitForElement(selector, duration, maxTries, identifier) {
        return new Promise(function(resolve, reject) {
            const value = Math.floor(Math.random() * 1000000000);
            waitObj[identifier] = value;
            let attempts = 0;
            const intervalId = setInterval(() => {
                if (attempts > maxTries){
                    clearInterval(intervalId);
                    reject(`Element Listener Expired: ${selector}, Reason: Dead coz u didnt come on time!!!!`);
                } else if (waitObj[identifier] !== value) {
                    clearInterval(intervalId);
                    reject(`Element Listener Expired: ${selector}, Reason: Dead coz u didnt luv me enough and got another LiStEnEr!!!!`);
                }
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(intervalId);
                    resolve(element);
                }
                attempts += 1;
            }, duration);
        });
    }
    function convertTimeToHours(time) {
        const timeParts = time.split(', ');
        let totalHours = 0;
        for (const part of timeParts) {
            const unitAndValue = part.split(' ');
            let value = parseInt(unitAndValue[0]);
            const unit = unitAndValue[1];
            if (unit === 'day' || unit === 'days') {
                totalHours += value * 24;
            } else if (unit === 'hour' || unit === 'hours') {
                totalHours += value;
            } else if (unit === 'minute' || unit === 'minutes') {
                totalHours += value / 60;
            } else if (unit === 'second' || unit === 'seconds') {
                totalHours += value / 3600;
            }
        }
        return totalHours > 1? totalHours.toFixed(2): 0;
    }
    function calculateRate(hr, count) {
        if (hr == 0 || count == 0) {
            return 0;
        }
        return (count/hr).toFixed(2);
    }
    GM_addStyle(`body:not(.dark-mode) #hardySkimTot {display: block; margin: 5px 0; background-color: rgb(242, 242, 242); padding: 6px; text-align: center;}
body.dark-mode #hardySkimTot {display: block; margin: 5px 0; background-color:rgb(42, 42, 42); padding: 6px; text-align: center;}`);
})();
