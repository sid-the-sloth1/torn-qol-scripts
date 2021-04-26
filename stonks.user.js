// ==UserScript==
// @name         Stonks
// @namespace    hardy.stonks.new3
// @version      0.1
// @description  Stonks Helper
// @author       Hardy [2131687]
// @match        https://www.torn.com/page.php?sid=stocks*
// @updateURL    https://raw.githubusercontent.com/sid-the-sloth1/torn-qol-scripts/main/stonks.user.js
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @run-at       document-start
// @connect      script.google.com
// ==/UserScript==
//For instructions: https://github.com/sid-the-sloth1/torn-qol-scripts/blob/main/Stonks.md
(function() {
    'use strict';
    var darkMode = false;
    var metadata = {};
    var portfolioData = {};
    var stockLossObj = {};
    var storageObj = {};
    var stonksTotalVal = 0;
    let acrArray = [];
    var localData = localStorage.getItem("hardy_stonks");
    let rev_met = {};
    var savedPrefs;
    //////////;
    let pageurl = window.location.href;
    const nativeWebSocket = unsafeWindow.WebSocket;
    unsafeWindow.WebSocket = function(...args){
        const socket = new nativeWebSocket(...args);
        if (socket.url === "wss://ws-centrifugo.torncity.com/connection/websocket") {
            socket.addEventListener("message", (t) => {
                let data = JSON.parse(t.data);
                if (data.result && data.result.channel && data.result.channel == "stockMarket") {
                    let msg = data.result.data.data.message;
                    if (msg.action == "refreshStocksPrice") {
                        let stocks = msg.data.stocks;
                        for (const stock of stocks) {
                            let id = stock.id;
                            metadata[id].price = stock.chartsData[0][1].value;
                        }
                        stockLossObj = {};
                        stonksTotalVal = 0;
                        for (const blocks in portfolioData) {
                            for (const block of portfolioData[blocks]) {
                                let id = block[0];
                                let amount = block[3];
                                let price = metadata[id].price;
                                block[6] = price;
                                let total = Math.ceil(amount* price);
                                block[7] = total;
                                block[8] = total -block[5];
                                if (stockLossObj[id]) {
                                    stockLossObj[id] += block[8];
                                } else {
                                    stockLossObj[id] = block[8];
                                }
                                stonksTotalVal += block[8];
                            }
                        }
                        if (pageurl.includes("link=hardy")) {
                            document.querySelector("#hardyPortfolioBox").innerHTML = returnHtml();
                        } else {
                            addProfitLossInfo();
                            document.querySelector(".hardy_stonks_text_info").innerHTML = `You have a total ${stonksTotalVal >= 0?'<span class="stonksUpli">profit</span>':'<span class ="stonksDownli">loss</span>'} of ${formatNumber(stonksTotalVal)}`;
                        }
                        //console.log(metadata);
                    }
                }
            });
        }
        return socket;
    };
    let original_fetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async (url, init) => {
        let response = await original_fetch(url, init)
        let respo = response.clone();
        if (url.includes("page.php?sid=StockMarket&step=getInitialData")) {
            respo.json().then((info) => {
                let stocks = info.stocks;
                for (const stock of stocks) {
                    let id = stock.id;
                    metadata[id] = {};
                    metadata[id].name = stock.profile.name;
                    metadata[id].acronym = stock.profile.acronym;
                    acrArray.push(stock.profile.acronym);
                    rev_met[stock.profile.acronym] = id;
                    metadata[id].req = stock.dividends.requirements.forOne;
                    let logos = stock.profile.bigLogo;
                    metadata[id].light = logos.light;
                    metadata[id].dark = logos.dark;
                    metadata[id].price = stock.sharesPrice.chartData[1].value;
                    metadata [id].type = stock.dividends.type;
                    metadata[id].days = stock.dividends.progress.total;
                    metadata[id].progress = stock.dividends.progress.current;
                    let userData = stock.userOwned;
                    let price = stock.sharesPrice.chartData[1].value;
                    if (userData.sharesAmount > 0) {
                        portfolioData[id] = [];
                        for (const transaction of userData.transactions) {
                            let totalBuy = Math.ceil(transaction.amount*transaction.boughtPrice);
                            let totalWorth = Math.floor(transaction.amount *price);
                            let diff = totalWorth - totalBuy;
                            portfolioData[id].push([id, transaction.date, metadata[id].acronym, transaction.amount, transaction.boughtPrice, totalBuy , price, totalWorth, diff ]);

                            if (stockLossObj[id]) {
                                stockLossObj[id] += diff;
                            } else {
                                stockLossObj[id] = diff;
                            }

                            stonksTotalVal += diff;
                        }
                    }
                }
                //console.log(metadata);
                waitForElement("ul[class^='stock_']", addIndex);
                if (pageurl.includes("&link=hardyportfolio")) {
                    waitForLoad("#stockmarketroot", createPortfolio);
                }

                //console.log(JSON.stringify(portfolioData));
            });
        } else if (url.includes("page.php?sid=StockMarket&step=buyShares")) {
            respo.json().then((info) => {
                if (info.success) {
                    let id = init.body.get("stockId");
                    let obj = {};
                    obj.key = "hardy";
                    obj.stock = metadata[id].acronym;
                    obj.stamp = Date.now();
                    obj.amount = parseInt(init.body.get("amount"));
                    obj.price = metadata[id].price;
                    obj.total = Math.ceil(obj.amount *obj.price);
                    obj.type = "buy";
                    sendData(obj);
                    if (!portfolioData[id]) {
                        portfolioData[id] = [];
                    }
                    portfolioData[id].push([id, obj.stamp/1000, obj.stock, obj.amount, obj.price, obj.total, obj.price, obj.total, 0]);
                }
            });
        } else if (url.includes("page.php?sid=StockMarket&step=sellShares")) {
            respo.json().then((info) => {
                if (info.success) {
                    let fee = 0.1;
                    let id = init.body.get("stockId");
                    let obj = {};
                    obj.amount = init.body.get("amount");
                    obj.stock = metadata[id].acronym;
                    obj.type = "sell";
                    obj.key = "hardy";
                    obj.stamp = Date.now();
                    obj.price = metadata[id].price;
                    obj.total = Math.ceil(obj.amount *obj.price);
                    obj.fee = Math.round(obj.total *0.001);
                    obj.netTotal = obj.total-obj.fee;
                    sendData(obj);
                    let transList = document.querySelectorAll("div[class^='transactionsList'] ul[class^='transaction_']");
                    if (transList.length > 0) {
                        portfolioData[id] = [];
                        for (const trans of transList) {
                            let amount = parseInt(trans.querySelector("li[class^='shares']").innerText.replace(/,/g, ""));
                            let buyP = parseFloat(trans.querySelector("li[class^='bought']").innerText.replace(/\$/, "").replace(/,/g, ""));
                            let buyTotal = Math.ceil(amount * buyP);
                            let price = metadata[id].price;
                            let total = Math.round(price*amount);
                            portfolioData[id].push([id, trans.querySelector("li[class^='date']").innerText, obj.stock, amount, buyP, buyTotal, price, total, total-buyTotal]);
                        }
                    } else {
                        delete portfolioData[id];
                    }
                }
            });
        } else if (url.includes("step=withdrawDividend")) {
            respo.json().then((info) => {
                if (info.success) {
                    let uid = init.body.get("stockId");
                    metadata[uid].progress = 0;
                    let array = [];
                    for (const id in metadata) {
                        if (metadata[id].days === metadata[id].progress && metadata[id].type === "active") {
                            array.push(metadata[id].acronym);
                        }
                    }
                    checkPayout(array);
                }
            });
        }
        return response;
    };
    function sendData(data) {
        let url = savedPrefs.link;
        if (url != "" && url !== null || typeof url != "undefined") {
            GM_xmlhttpRequest({
                method: "POST",
                url:url,
                data: JSON.stringify(data),
                onload: () => {
                    console.log("Data Sent");
                }
            });
        }
        //alert(JSON.stringify(data));
    }
    function createPortfolio(elem) {
        let node = elem;
        node.setAttribute("style", "display: none;");
        let box = document.createElement("div");
        box.id = "hardyPortfolioBox";
        //console.log(array);
        box.innerHTML = returnHtml();
        document.querySelector(".content-wrapper").appendChild(box);
    }
    function formatNumber(num) {
        if (num >= 0) {
            return "$"+num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        } else {
            let numb = -1*num;
            return "-$"+numb.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        }
    }
    function formatNum(num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    }
    function waitForLoad(element, callbackFunc) {
        storageObj[element] = setInterval(() => {
            let node = document.querySelector(element);
            if (node) {
                clearInterval(storageObj[element]);
                callbackFunc(node);
            }
        }, 200);
    }
    function waitForElement(element, callbackFunc) {
        storageObj[element] = setInterval(() => {
            let node = document.querySelector(element);
            if (node) {
                clearInterval(storageObj[element]);
                callbackFunc();
            }
        }, 400);
    }
    function addIndex() {
        let payoutArray = [];
        for (const id in metadata) {
            let node = document.querySelector(`li[aria-label*="${metadata[id].name}"]`).parentNode;
            node.setAttribute("info", `${metadata[id].acronym}_${id}`);
            if (metadata[id].days === metadata[id].progress && metadata[id].type === "active") {
                payoutArray.push(metadata[id].acronym);
            }
        }
        if (!pageurl.includes("link=hardy")) {
            let svg = '<span class="icon-wrap svg-icon-wrap"><span class="link-icon-svg portfolio"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1em" height="1em" style="-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 15 15"><path d="M11 4V2c0-1-1-1-1-1H5.05S3.946 1.002 4 2v2H2S1 4 1 5v7c0 1 1 1 1 1h11s1 0 1-1V5c0-1-1-1-1-1h-2zM5.5 2.5h4V4h-4V2.5z" fill="#626262"/></svg></span></span><span>Portfolio</span>';
            let icon = document.createElement("a");
            icon.setAttribute("role", "button");
            icon.setAttribute("aria-labelledby", "portfolio");
            icon.setAttribute("href", "https://www.torn.com/page.php?sid=stocks&link=hardyportfolio");
            icon.setAttribute("class", "t-clear h c-pointer  m-icon line-h24 right");
            icon.innerHTML = svg;
            let footer = document.querySelector(".links-footer")
            footer.parentNode.insertBefore(icon, footer);
            let div = document.createElement("div");
            div.className = "hardy_stonks_box"
            div.innerHTML = `<div class="stonksBulletin"><label style="margin: 4px 0; font-weight: bold; font-size: 17px; text-align: center; display: block;">Stonks</label><label class="hardy_stonks_text_info">You have a total ${stonksTotalVal >= 0?'<span class="stonksUpli">profit</span>':'<span class ="stonksDownli">loss</span>'} of ${formatNumber(stonksTotalVal)}</label><marquee behavior="scroll" direction="left" scrollamount="1"><label id="readyPayout" style="font-size: 16px;"></label></marquee><marquee behavior="scroll" direction="left" scrollamount="2"><label id="lowerBulletin" style="font-size:16px;"></label></marquee><marquee behavior="scroll" direction="left" scrollamount="2"><label id="higherBulletin" style="font-size: 16px;"></label></marquee></div><div class="hardy_stonks_options"><select id="stonks_select"><option value="def">Choose an option:</option><option value="ready">Ready for Payout</option><option value="owned">Owned Stocks</option><option value="unowned">Unowned Stocks</option><option value="green">In Profit</option><option value="red">In Loss</option><option value="payout">Payout Stocks</option><option value ="passive">Passive Stocks</options></select><select id="stonksAcrSelect"></select><button id="openprompt">Webapp</button><div id="selectInput"></div><div id="selectOutput"></div></div>`;
            let root = document.querySelector("#stockmarketroot");
            root.insertBefore(div, root.firstChild);
            acrArray.sort();
            let array = ['<option value="def">Choose a stock:</option>'];
            for (const acronym of acrArray) {
                array.push(`<option value="${acronym.toLowerCase()}">${acronym}</option>`);
            }
            document.querySelector("#stonksAcrSelect").innerHTML = array.join("");
            checkPayout(payoutArray);
            if (localData === null || typeof localData == "undefined") {
                let tempobj = {};
                tempobj.link = '';
                for (const id in metadata) {
                    tempobj[id] = {};
                    tempobj[id].lowerThan = 0;
                    tempobj[id].higherThan = 0;
                }
                localStorage.setItem("hardy_stonks", JSON.stringify(tempobj));
                savedPrefs = tempobj;
            } else {
                savedPrefs = JSON.parse(localData);
            }
            document.querySelector("#openprompt").addEventListener("click", (g) => {
                document.querySelector("#selectInput").innerHTML = `<label>Enter Webapp link: </label><input type="text" id="stonksLink" value="${savedPrefs.link}"><button id="saveLink">Save</button><button id="closeLink">Close</button>`;
                document.querySelector("#selectOutput").innerHTML = ``;
                console.log(portfolioData);
            });
            document.querySelector("#selectInput").addEventListener("click", (e) => {
                let target = e.target;
                if (target.id === "saveCondi") {
                    let lessNode = document.querySelector("#lower_than");
                    let id = lessNode.getAttribute("aria").split("_")[1];
                    let higherNode = document.querySelector("#higher_than");
                    savedPrefs[id].lowerThan = validNumber(lessNode.value);
                    savedPrefs[id].higherThan = validNumber(higherNode.value);
                    localStorage.setItem("hardy_stonks", JSON.stringify(savedPrefs));
                    document.querySelector("#selectOutput").innerHTML = `<label>Data saved successfully!</label>`;
                } else if (target.id == "saveLink") {
                    let link = document.querySelector("#stonksLink").value;
                    if (link == "" || link === null || typeof link == "undefined") {
                        document.querySelector("#selectOutput").innerHTML = `<label>Please enter a valid link!</label>`;
                    } else {
                        savedPrefs.link = link;
                        localStorage.setItem("hardy_stonks", JSON.stringify(savedPrefs));
                        document.querySelector("#selectOutput").innerHTML = `<label>Data saved successfully!!</label>`;
                    }
                } else if (target.id === "closeLink") {
                    document.querySelector("#selectInput").innerHTML = '';
                    document.querySelector("#selectOutput").innerHTML = '';
                }
            });
            document.querySelector(".hardy_stonks_box").addEventListener("input", (t) => {
                let target = t.target;
                //console.log(t);
                if (target.id === "stonks_select") {
                    document.querySelector("#selectInput").innerHTML = '';
                    document.querySelector("#selectOutput").innerHTML = '';
                    let val = target.value;
                    handleSelectInput(val);
                } else if (target.id === "stonksAcrSelect") {
                    let value = target.value;
                    document.querySelector("#stonks_select").value = "def";
                    if (value === "def") {
                        document.querySelector("#selectInput").innerHTML = '';
                        document.querySelector("#selectOutput").innerHTML = '';
                        let stockList = document.querySelectorAll("ul[class^='stock_']");
                        for (const stock of stockList) {
                            stock.setAttribute("isShow", "yes");
                        }
                    } else {
                        document.querySelector("#selectOutput").innerHTML = '';
                        let acronym = value.toUpperCase();
                        let id = rev_met[acronym];
                        document.querySelector("#selectInput").innerHTML = `<label style="font-weight: bold; text-align: center; display: block;">Highlight if:</label><br><label>Price Lower than: </label><input type="number" id="lower_than" aria="${acronym}_${id}" step="0.01" min="0" value="${savedPrefs[id].lowerThan}"><label>Price Higher than:</label><input type="number" id="higher_than" aria="${acronym}_${id}" step="0.01" min="0" value="${savedPrefs[id].higherThan}"><button id="saveCondi">Save</button>`;
                        let stockList = document.querySelectorAll("ul[class^='stock_']");
                        for (const stock of stockList) {
                            let uid = stock.getAttribute("info").split("_")[1];
                            stock.setAttribute("isShow", "no");
                            if (uid == id) {
                                stock.setAttribute("isShow", "yes");
                            }
                        }
                    }
                }
            });
            addProfitLossInfo()
        } else {
            let svg = '<span class="icon-wrap svg-icon-wrap"><span class="link-icon-svg stonks"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1.11em" height="1em" style="-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 717 648"><path d="M0 648h717v-56H56V46H0v602zm98-110h616V96L584 215l-121-44l-128 146l-131-47L98 380v158z" fill="#626262"/></svg></span></span><span>Stock Exchange</span>';
            let icon = document.createElement("a");
            icon.setAttribute("role", "button");
            icon.setAttribute("aria-labelledby", "stonks");
            icon.setAttribute("href", "https://www.torn.com/page.php?sid=stocks");
            icon.setAttribute("class", "t-clear h c-pointer  m-icon line-h24 right");
            icon.innerHTML = svg;
            let footer = document.querySelector(".links-footer")
            footer.parentNode.insertBefore(icon, footer);
        }
    }
    function returnHtml() {
        let html1 = '<table id="hardyPortfolioTable"><thead><tr><th></th><th>Name</th><th>Info</th></tr></thead>';
        let html2 = '</tbody></table>';
        let array = [];
        darkMode = document.body.classList.contains("dark-mode");
        for (let blocks in portfolioData) {
            for (const block of portfolioData[blocks]) {

                let id = block[0];
                let img = darkMode? metadata[id].dark: metadata[id].light;
                let change = block[8] < 0? "stonksDown": "stonksUp"
                array.push(`<tr><td class="stonkLogo"><img src="${img}"></td><td class="stonkAcr">${block[2]}</td><td class="stonkInfo"><table id="innerTable" style="border-style: hidden;"><tr><td style="border-style:hidden;"><ul class="hardyStonksList1"><li class="stonkAmount"><span class="bold">Shares: </span>${formatNum(block[3])}</li><li class="stonkzCurrentPerShare" stockId="a${block[0]}"><span class="bold">Current: </span>${formatNumber(block[6])}</li><li><span class="bold">Length: </span>${block[1]}</li></ul></td><td style="border-style:hidden;"><ul class="hardyStonksList2"><li class="stonkzWorth"><span class="bold">Worth: </span>${formatNumber(block[7])}</li><li><span class="bold">Bought: </span>${formatNumber(block[4])}</li><li class="${change}li"><span class="bold">Change: </span><span class="${change}"></span><span>${formatNumber(block[8])} (${+(((block[7]/block[5])*100)-100).toFixed(2)}%)</span></li></ul></td></tr></table></td></tr>`);
            }
        }
        return html1+array.join("")+html2;
    }
    function addProfitLossInfo() {
        let lowerArray = [];
        let higherArray = [];
        let nodeList = document.querySelectorAll("ul[class^='stock_']");
        for (const node of nodeList) {
            let id = node.getAttribute("info").split("_")[1];
            node.setAttribute("isGreen", "no");
            let price = metadata[id].price;
            if (savedPrefs[id].lowerThan > 0 && savedPrefs[id].lowerThan > price) {
                node.setAttribute("isGreen", "yes");
                lowerArray.push(metadata[id].acronym);
            }
            if (savedPrefs[id].higherThan > 0 && savedPrefs[id].higherThan < price ) {
                node.setAttribute("isGreen", "yes");
                higherArray.push(metadata[id].acronym)
            }
            let profit = stockLossObj[id] ? stockLossObj[id]: 0;
            //node.setAttribute("profit", 'h'+profit);
            let parent = node.querySelector("li[class^='stockOwned']");
            let p = document.createElement("p");
            let para = document.createElement("p");
            p.className = profit < 0? "stonksDownli": "stonksUpli";
            para.className = profit < 0? "stonksDownli": "stonksUpli";
            let currVal = parseInt(parent.querySelector("p[class^='value']").innerText.replace(/,/g, "").replace(/\$/, ""));
            let boughtVal = currVal - profit;
            let percent = +(((profit/boughtVal))*100).toFixed(2)
            p.innerText = `${formatNumber(profit)}`;
            para.innerText = `${isNaN(percent)? 0: percent} %`;
            p.setAttribute("change", "role");
            para.setAttribute("change", "role");
            let elements = parent.querySelectorAll("p[change='role']");
            if (elements.length > 0) {
                for (const element of elements) {
                    element.remove();
                }
            }
            parent.appendChild(p);
            parent.appendChild(para);
        }
        //console.log(higherArray);
        let length1 = lowerArray.length;
        if (length1 > 0) {
            if (length1 > 1) {
                if (length1 > 2) {
                    let lastElem = lowerArray[length1 -1];
                    lowerArray.length = length1 - 1;
                    document.querySelector("#lowerBulletin").innerText = `Stocks ${lowerArray.join(", ")} and ${lastElem} are at prices lower than your selected values.`;
                } else {
                    document.querySelector("#lowerBulletin").innerText = `Stocks ${lowerArray[0]} and ${lowerArray[1]} are at prices lower than your selected values.`;
                }
            } else {
                document.querySelector("#lowerBulletin").innerText = `Stock ${lowerArray[0]} is at a price lower than your selected value.`;
            }
        } else {
            document.querySelector("#lowerBulletin").innerText = '';
        }
        let length2 = higherArray.length;
        if (length2 > 0) {
            if (length2 > 1) {
                if (length2 > 2) {
                    let lastElem = higherArray[length2 -1];
                    higherArray.length = length2- 1;
                    document.querySelector("#higherBulletin").innerText = `Stocks ${higherArray.join(", ")} and ${lastElem} are at prices higher than your selected values.`;
                } else {
                    document.querySelector("#higherBulletin").innerText = `Stocks ${higherArray[0]} and ${higherArray[1]} are at prices higher than your selected values.`;
                }
            } else {
                document.querySelector("#higherBulletin").innerText = `Stock ${higherArray[0]} is at a price higher than your selected value.`;
            }
        } else {
            document.querySelector("#higherBulletin").innerText = '';
        }
        let val = document.querySelector("#stonks_select").value;
        if (val !== "def") {
            handleSelectInput(val);
        }
    }
    function validNumber(num) {
        if (num == "" || num === null || typeof num == "undefined" || isNaN(parseFloat(num))) {
            return 0;
        } else {
            return parseFloat(num);
        }
    }
    function checkPayout(array) {
        let length = array.length;
        if (length > 0) {
            if (length > 1) {
                if (length > 2) {
                    let lastElem = array[length -1];
                    array.length = length-1;
                    document.querySelector("#readyPayout").innerText = `Stocks ${array.join(", ")} and ${lastElem} are ready for payout.`;
                } else {
                    document.querySelector("#readyPayout").innerText = `Stocks ${array[0]} and ${array[1]} are ready for payout.`;
                }
            } else {
                document.querySelector("#readyPayout").innerText = `Stock ${array[0]} is ready for payout.`;
            }
        } else {
            document.querySelector("#readyPayout").innerText = '';
        }
    }
    function handleSelectInput(value) {
        document.querySelector("#stonksAcrSelect").value = "def";
        if (value === "owned") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (!portfolioData[id]) {
                    stock.setAttribute("isShow", "no");
                }
            }
        } else if (value === "def") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                stock.setAttribute("isShow", "yes");
            }
        } else if (value === "unowned") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (portfolioData[id]) {
                    stock.setAttribute("isShow", "no");
                }
            }
        } else if (value === "green") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (!stockLossObj[id]) {
                    stock.setAttribute("isShow", "no");
                } else {
                    let profit = stockLossObj[id];
                    if (profit < 0) {
                        stock.setAttribute("isShow", "no");
                    }
                }
            }
        } else if (value === "red") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (!stockLossObj[id]) {
                    stock.setAttribute("isShow", "no");
                } else {
                    let profit = stockLossObj[id];
                    if (profit > 0) {
                        stock.setAttribute("isShow", "no");
                    }
                }
            }
        } else if (value === "payout") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (metadata[id].type === "passive") {
                    stock.setAttribute("isShow", "no");
                }
            }
        } else if (value === "passive") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (metadata[id].type === "active") {
                    stock.setAttribute("isShow", "no");
                }
            }
        } else if (value === "ready") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (metadata[id].days !== metadata[id].progress || metadata[id].type === "passive") {
                    stock.setAttribute("isShow", "no");
                }
            }
        }
    }
    GM_addStyle(`
/*PC*/
td.stonkAcr { font-size: 20px!important; text-align: center; padding: 3px 18px!important; }
td.stonkInfo td { padding: 0 8px; }
td.stonkInfo tr { width: 100%; font-size: 16px; }
#hardyPortfolioBox img { height: 60px; width: 60px; padding: 5px 0 5px 15px; }
#innerTable td:first-child { padding-left: 18px; width: 50%; }
/* mobile*/
@media screen and (max-width: 600px) {
td.stonkAcr { font-size: 16px!important; text-align: center; padding: 3px 6px!important; }
td.stonkInfo td { padding: 0 8px; }
td.stonkInfo tr { width: 100%; font-size: 14px; }
#hardyPortfolioBox img { height: 40px; width: 40px; padding: 5px; }
#innerTable td:first-child { padding: 6px; width: auto; } }
/* Portfolio*/
body:not(.dark-mode) #hardyPortfolioBox tbody { background-color: #fff; padding: 8px; }
body.dark-mode #hardyPortfolioBox tbody { background-color: #333; padding: 8px; color: #ffffff; }
#hardyPortfolioBox thead { background-color: black; color: white; font-size: 20px; text-align: center; }
#hardyPortfolioBox li { list-style-type: none; }
body.dark-mode #hardyPortfolioTable td { vertical-align: middle; color: #ffffff; }
body:not(.dark-mode) #hardyPortfolioTable td { vertical-align: middle; }
#hardyPortfolioTable th, #hardyPortfolioTable td, #hardyPortfolio { border-collapse: collapse; border: 2px solid #ddd; }
#hardyPortfolioTable { -moz-border-radius: 10px; -webkit-border-radius: 10px; border-radius: 10px; }
#hardyPortfolioTable th { padding: 4px; }
.stonksDownli { color: #de5b30; }
.stonksUpli { color: #5c940d; }
/*Custom box*/
body:not(.dark-mode) .hardy_stonks_box { background-color: #f2f2f2; margin: 6px 0 6px 0; padding: 6px; border-radius: 5px; }
body.dark-mode .hardy_stonks_box { background-color: #333; margin: 6px 0 6px 0; padding: 6px; border-radius: 5px; }
.hardy_stonks_options { margin: 6px; display: block; position: relative; width: 100%; }
.hardy_stonks_text_info { margin: 16px; text-align: center; font-size: 18px; display: block; }
ul[isShow='no'] { display: none; }
div[class^='stockMarket'] ul[class^="stock_"] { height: 80px; }
.hardy_stonks_options select { padding: 9px 6px; font-size: 16px; border-radius: 4px; margin: 6px 0; }
#openprompt { border-style: solid; border-color: rgb(169, 169, 169); padding: 8px 8px; font-size: 16px; border-radius: 4px; margin: 6px 8px; color: black; }
body.dark-mode #openprompt { color: #ffffff; }
#stonksAcrSelect { margin-left: 10px; }
body.dark-mode .hardy_stonks_options select { background-color: #333; color: #ffffff; }
body:not(.dark-mode) .hardy_stonks_options select { background-color: #f2f2f2; }
#selectInput { font-size: 16px; margin: 8px 0; width: 100%; }
#selectInput input[type='number'] { margin: 0 6px; padding: 3px; border-radius: 2px; width: 80px; }
#selectInput input[type='text'] { margin: 0 6px; padding: 3px; border-radius: 2px; width: 50%; }
#saveCondi, #saveLink { padding: 6px 10px; border-radius: 4px; margin-left: 8px; background-color: #008000e8; color: white; }
#closeLink { padding: 6px 10px; border-radius: 4px; margin-left: 8px; background-color: #973335; color: white; }
#selectOutput { font-size: 15px; text-align: center; }
body:not(.dark-mode) ul[isGreen='yes'] { background-color: #ccfbcc; }
body.dark-mode ul[isGreen='yes'] { background-color: #036203; }
    `);
})();
