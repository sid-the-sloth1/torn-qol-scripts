// ==UserScript==
// @name         Stonks
// @namespace    hardy.stonks.new3
// @version      0.5.5
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
    let state = {};
    var metadata = {};
    var portfolioData = {};
    var stockLossObj = {};
    var storageObj = {};
    var stonksTotalVal = 0;
    var moneyOnHand = "hardy";
    let acrArray = [];
    var localData = localStorage.getItem("hardy_stonks");
    let rev_met = {};
    var savedPrefs;
    var recentlyBought = {};
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
                                let fee = Math.round((0.1/100)*total);
                                block[8] = total -block[5]-fee;
                                if (stockLossObj[id]) {
                                    stockLossObj[id] += block[8];
                                } else {
                                    stockLossObj[id] = block[8];
                                }
                                stonksTotalVal += block[8];
                            }
                        }
                        makeRecentList();
                        if (pageurl.includes("link=hardy")) {
                            document.querySelector("#hardyPortfolioBox").innerHTML = returnHtml();
                        } else {
                            addProfitLossInfo();
                            changeTitle();
                            document.querySelector(".hardy_stonks_text_info").innerHTML = `You have a total ${stonksTotalVal >= 0?'<span class="stonksUpli">profit</span>':'<span class ="stonksDownli">loss</span>'} of ${formatNumber(stonksTotalVal)}`;
                        }

                        //console.log(metadata);
                    }
                } else if (data.result && data.result.data && data.result.data.data && data.result.data.data.message) {
                    let msg = data.result.data.data.message;
                    if (msg.namespaces && msg.namespaces.sidebar && msg.namespaces.sidebar.actions && msg.namespaces.sidebar.actions.updateMoney) {
                        moneyOnHand = msg.namespaces.sidebar.actions.updateMoney.money;
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
                            let fee = Math.round((0.1/100)*totalWorth);
                            let diff = totalWorth - totalBuy - fee;
                            portfolioData[id].push([id, transaction.timestamp, metadata[id].acronym, transaction.amount, transaction.boughtPrice, totalBuy , price, totalWorth, diff ]);

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
                            portfolioData[id].push([id, dateToStamp(trans.querySelector("li[class^='date']").innerText), obj.stock, amount, buyP, buyTotal, price, total, total-buyTotal]);
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
        } else if (url.includes("sid=StockMarket&step=getTransactions")) {
            respo.json().then((info) => {
                if (info.success) {
                    setTimeout( ()=> {
                        let uid = init.body.get("stockId");
                        let transList = document.querySelectorAll("div[class^='transactionsList'] ul[class^='transaction_']");
                        if (transList.length > 0) {
                            portfolioData[uid] = [];
                            for (const trans of transList) {
                                let amount = parseInt(trans.querySelector("li[class^='shares']").innerText.replace(/,/g, ""));
                                let buyP = parseFloat(trans.querySelector("li[class^='bought']").innerText.replace(/\$/, "").replace(/,/g, ""));
                                let buyTotal = Math.ceil(amount * buyP);
                                let price = metadata[uid].price;
                                let total = Math.round(price*amount);
                                portfolioData[uid].push([uid, dateToStamp(trans.querySelector("li[class^='date']").innerText), metadata[uid].acronym, amount, buyP, buyTotal, price, total, total-buyTotal]);
                            }
                        }
                    }, 700);
                }
            });
        }
        return response;
    };
    function sendData(data) {
        // console.log(data);
        let url = savedPrefs.link;
        if (url != "" && url !== null && typeof url != "undefined") {
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
        let node = elem.children;
        node[1].setAttribute("style", "display: none;");
        node[2].setAttribute("style", "display: none;");
        let box = document.createElement("div");
        box.id = "hardyPortfolioBox";
        //console.log(array);
        box.innerHTML = returnHtml();
        document.querySelector("#stockmarketroot").appendChild(box);
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
        let moneyNode = document.querySelector("span[id='user-money']");
        if (moneyNode) {
            moneyOnHand = moneyNode.getAttribute("data-money");
        }
        for (const id in metadata) {
            let node = document.querySelector(`li[aria-label*="${metadata[id].name}"]`).parentNode;
            node.setAttribute("info", `${metadata[id].acronym}_${id}`);
            if (metadata[id].days === metadata[id].progress && metadata[id].type === "active") {
                payoutArray.push(metadata[id].acronym);
            }
            let logoDiv = node.querySelector("div[class^='logoContainer_']");
            let inner = logoDiv.innerHTML;
            logoDiv.innerHTML = `<figure>${inner}<figcaption class="hardy_acr">${metadata[id].acronym}</figcaption></figure>`;
        }
        if (!pageurl.includes("link=hardy")) {
            let icon = document.createElement("a");
            icon.setAttribute("role", "button");
            icon.setAttribute("aria-labelledby", "portfolio");
            icon.setAttribute("href", "https://www.torn.com/page.php?sid=stocks&link=hardyportfolio")
            let footer = document.querySelector("a[class^='linkContainer_']")
            icon.className = footer.className;
            icon.classList.remove("link-container-City");
            let spanSvg = footer.children;
            let svg = `<span class="${spanSvg[0].className}"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1em" height="1em" style="-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 15 15"><path d="M11 4V2c0-1-1-1-1-1H5.05S3.946 1.002 4 2v2H2S1 4 1 5v7c0 1 1 1 1 1h11s1 0 1-1V5c0-1-1-1-1-1h-2zM5.5 2.5h4V4h-4V2.5z" fill="#626262"/></svg></span><span class="${spanSvg[1].className}">Portfolio</span>`;
            icon.innerHTML = svg;
            footer.parentNode.insertBefore(icon, footer);
            let div = document.createElement("div");
            div.className = "hardy_stonks_boxdef"
            div.innerHTML = `<div class="hardy_stonks_box_header">Stonks</div><div class="hardy_stonks_box"><div class="stonksBulletin"><label class="hardy_stonks_text_info">You have a total ${stonksTotalVal >= 0?'<span class="stonksUpli">profit</span>':'<span class ="stonksDownli">loss</span>'} of ${formatNumber(stonksTotalVal)}</label><marquee behavior="scroll" direction="left" scrollamount="1"><label id="readyPayout" style="font-size: 16px;"></label></marquee><marquee behavior="scroll" direction="left" scrollamount="2"><label id="lowerBulletin" style="font-size:16px;"></label></marquee><marquee behavior="scroll" direction="left" scrollamount="2"><label id="higherBulletin" style="font-size: 16px;"></label></marquee></div><div class="hardy_stonks_options"><select id="stonks_select"><option value="def">Choose an option:</option><option value="relevant">Hide Irrelevant Stocks</option><option value="recent"> Recently Bought</option><option value="ready">Ready for Payout</option><option value="owned">Owned Stocks</option><option value="unowned">Unowned Stocks</option><option value="green">In Profit</option><option value="red">In Loss</option><option value="payout">Payout Stocks</option><option value ="passive">Passive Stocks</options></select><select id="stonksAcrSelect"></select><button id="manualEntry">Manual Logging</button><button class="hardy_icon"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="40px" height="40px"  preserveAspectRatio="xMidYMid meet" viewBox="0 0 1024 1024"><path  d="M512.5 390.6c-29.9 0-57.9 11.6-79.1 32.8c-21.1 21.2-32.8 49.2-32.8 79.1c0 29.9 11.7 57.9 32.8 79.1c21.2 21.1 49.2 32.8 79.1 32.8c29.9 0 57.9-11.7 79.1-32.8c21.1-21.2 32.8-49.2 32.8-79.1c0-29.9-11.7-57.9-32.8-79.1a110.96 110.96 0 0 0-79.1-32.8zm412.3 235.5l-65.4-55.9c3.1-19 4.7-38.4 4.7-57.7s-1.6-38.8-4.7-57.7l65.4-55.9a32.03 32.03 0 0 0 9.3-35.2l-.9-2.6a442.5 442.5 0 0 0-79.6-137.7l-1.8-2.1a32.12 32.12 0 0 0-35.1-9.5l-81.2 28.9c-30-24.6-63.4-44-99.6-57.5l-15.7-84.9a32.05 32.05 0 0 0-25.8-25.7l-2.7-.5c-52-9.4-106.8-9.4-158.8 0l-2.7.5a32.05 32.05 0 0 0-25.8 25.7l-15.8 85.3a353.44 353.44 0 0 0-98.9 57.3l-81.8-29.1a32 32 0 0 0-35.1 9.5l-1.8 2.1a445.93 445.93 0 0 0-79.6 137.7l-.9 2.6c-4.5 12.5-.8 26.5 9.3 35.2l66.2 56.5c-3.1 18.8-4.6 38-4.6 57c0 19.2 1.5 38.4 4.6 57l-66 56.5a32.03 32.03 0 0 0-9.3 35.2l.9 2.6c18.1 50.3 44.8 96.8 79.6 137.7l1.8 2.1a32.12 32.12 0 0 0 35.1 9.5l81.8-29.1c29.8 24.5 63 43.9 98.9 57.3l15.8 85.3a32.05 32.05 0 0 0 25.8 25.7l2.7.5a448.27 448.27 0 0 0 158.8 0l2.7-.5a32.05 32.05 0 0 0 25.8-25.7l15.7-84.9c36.2-13.6 69.6-32.9 99.6-57.5l81.2 28.9a32 32 0 0 0 35.1-9.5l1.8-2.1c34.8-41.1 61.5-87.4 79.6-137.7l.9-2.6c4.3-12.4.6-26.3-9.5-35zm-412.3 52.2c-97.1 0-175.8-78.7-175.8-175.8s78.7-175.8 175.8-175.8s175.8 78.7 175.8 175.8s-78.7 175.8-175.8 175.8z" fill="#626262"></path></svg></button><div id="prefBox_stonks"></div><div id="selectInput"></div><div id="selectOutput"></div></div></div>`;
            let root = document.querySelector("#stockmarketroot ul[class*='titles_']");
            root.parentNode.insertBefore(div, root);
            acrArray.sort();
            let array = ['<option value="def">Choose a stock:</option>'];
            for (const acronym of acrArray) {
                array.push(`<option value="${acronym.toLowerCase()}">${acronym}</option>`);
            }
            document.querySelector("#stonksAcrSelect").innerHTML = array.join("");
            checkPayout(payoutArray);
            addListeners();
            makeRecentList();
            if (localData === null || typeof localData == "undefined") {
                let tempobj = {};
                tempobj.link = '';
                for (const id in metadata) {
                    tempobj[id] = {};
                    tempobj[id].lowerThan = 0;
                    tempobj[id].higherThan = 0;
                }
                tempobj.prefs = {};
                tempobj.prefs.select1 = "def";
                tempobj.prefs.select2 = "def";
                tempobj.prefs.irr_list = [];
                localStorage.setItem("hardy_stonks", JSON.stringify(tempobj));
                savedPrefs = tempobj;
            } else {
                savedPrefs = JSON.parse(localData);
            }
            if (savedPrefs.prefs) {
                let val1 = savedPrefs.prefs.select1;
                let val2 = savedPrefs.prefs.select2;
                if (val1 !== "def") {
                    handleSelectInput(val1);
                    document.querySelector("#stonks_select").value = val1;
                } else {
                    if (val2 !== "def") {
                        applyAcrFilter(val2);
                        document.querySelector("#stonksAcrSelect").value = val2;
                    }
                }
            }
            addProfitLossInfo();
            if (moneyOnHand !== "hardy") {
                modifyStockDiv();
            }
            state.title = "original";
            changeTitle();
        } else {
            let icon = document.createElement("a");
            icon.setAttribute("role", "button");
            icon.setAttribute("aria-labelledby", "stonks");
            icon.setAttribute("href", "https://www.torn.com/page.php?sid=stocks");
            let footer = document.querySelector("a[class^='linkContainer_']")
            icon.className = footer.className;
            icon.classList.remove("link-container-City");
            let spanSvg = footer.children;
            let svg = `<span class="${spanSvg[0].className}"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1.11em" height="1em" style="-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 717 648"><path d="M0 648h717v-56H56V46H0v602zm98-110h616V96L584 215l-121-44l-128 146l-131-47L98 380v158z" fill="#626262"/></svg></span><span class="${spanSvg[1].className}">Stock Exchange</span>`;
            icon.innerHTML = svg;
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
            if (savedPrefs[id]) {
                if (savedPrefs[id].lowerThan > 0 && savedPrefs[id].lowerThan > price) {
                    node.setAttribute("isGreen", "yes");
                    lowerArray.push(metadata[id].acronym);
                }
                if (savedPrefs[id].higherThan > 0 && savedPrefs[id].higherThan < price ) {
                    node.setAttribute("isGreen", "yes");
                    higherArray.push(metadata[id].acronym)
                }
            } else {
                savedPrefs[id] = {};
                savedPrefs[id].higherThan = 0;
                savedPrefs[id].lowerThan = 0;
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
        } else if (value === "recent") {
            let stockList = document.querySelectorAll("ul[class^='stock_']");
            for (const stock of stockList) {
                let id = stock.getAttribute("info").split("_")[1];
                stock.setAttribute("isShow", "yes");
                if (!recentlyBought[id]) {
                    stock.setAttribute("isShow", "no");
                }
            }
        } else if (value === "relevant") {
            if (savedPrefs.prefs.irr_list) {
                let stockList = document.querySelectorAll("ul[class^='stock_']");
                for (const stock of stockList) {
                    let acr = stock.getAttribute("info").split("_")[0];
                    stock.setAttribute("isShow", "yes");
                    if (savedPrefs.prefs.irr_list.indexOf(acr) !== -1) {
                        stock.setAttribute("isShow", "no");
                    }
                }
            } else {
                document.querySelector("#selectOutput").innerHTML = `<label class="stonksDownli">Please create a list of irrelevant stocks first by clicking on Settings icon.</label>`;
            }
        }
    }
    function applyAcrFilter(value) {
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
    function makeRecentList() {
        recentlyBought = {};
        let now = Math.round(Date.now()/1000);
        for (const id in portfolioData) {
            let transactions = portfolioData[id];
            for (const transaction of transactions) {
                if (now-transaction[1] <= 86400*7) {
                    recentlyBought[id] = "hardy";
                }
            }

        }
    }
    function dateToStamp(entry) {
        let args = entry.split("/");
        let monthArray = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let month = monthArray[parseInt(args[1])-1];
        let stamp = new Date(`${args[0]} ${month} 20${args[2]}`).getTime();
        return Math.round(stamp/1000);
    }
    function modifyStockDiv() {
        setInterval(function() {
            if (window.location.href.includes("tab=owned")) {
                createAmountInput();
            }
        }, 300);

    }
    function createAmountInput() {
        let mainDiv = document.querySelector("div[class^='stockDropdown']");
        if (mainDiv) {
            let id = window.location.href.split("stockID=")[1].split("&")[0];
            let manageBlock = mainDiv.querySelector("div[class^='manageTab_'] div[class^='manageContainer']");
            if (manageBlock && !manageBlock.querySelector(".buyHint")) {
                let buyDiv = manageBlock.querySelector("div[class^='buyBlock'] div[class^='manageBlock']");
                if (buyDiv.querySelector(".input-money-group")) {
                    let height = parseInt(manageBlock.style.height.split("px")[0]);
                    if (height < 140) {
                        manageBlock.style.height = "140px";
                    }
                    let div = document.createElement("div");
                    div.innerHTML = `<p class="buyHint">Enter amount of money you want to spend:</p><div style="display:inline;"><label class="hardy_amount_max">$</label><input type="text" class="hardy_stonk_buy_input" info="${id}" value="${formatNum(moneyOnHand)}"><label class="money_to_quant">FILL</label></div>`;
                    div.style.margin = "4px 0";
                    div.style.textAlign = "center";
                    buyDiv.appendChild(div);
                }
            }
        }
    }
    function sendManual(str) {
        let timePortion = str.split(" You")[0].split(" - ");
        let dayStamp = dateToStamp(timePortion[1]);
        let timeHMS = timePortion[0].split(":");
        let stamp = dayStamp + parseInt(timeHMS[2]) + (parseInt(timeHMS[1])*60) + (parseInt(timeHMS[0])*3600);
        let obj = {};
        obj.key = "hardy";
        let text = str.substring(20).split(" ");
        obj.amount = parseInt(text[2].replace(/,/g, "").replace(/x/, ""));
        let type = text[1];
        text.splice(0, 3);
        let afterParse = text.join(" ").split(" shares at $");
        let stockName = afterParse[0].trim();
        console.log(stockName);
        obj.stock = nameToAcr(stockName);
        obj.stamp = stamp*1000;
        let split = afterParse[1].split(" ");
        obj.price = split[0].replace(/,/g, "");
        obj.total = parseInt(split[6].replace(/,/g, "").replace(/\$/, ""));
        if (type === "sold") {
            obj.type = "sell";
            obj.fee = parseInt(split[8].replace(/,/g, "").replace(/\$/, ""));
            obj.netTotal = obj.total;
            obj.total = obj.netTotal + obj.fee;
        } else {
            obj.type = "buy";
        }
        sendData(obj);
        document.querySelector("#selectOutput").innerHTML = `<label class="stonksUpli">Data sent to your webapp.</label>`;
    }
    function nameToAcr(name) {
        for (const id in metadata) {
            if (metadata[id].name === name) {
                return metadata[id].acronym;
            }
        }
    }
    function changeTitle() {
        let url = window.location.href;
        if (url.includes("stockID")) {
            let id = url.split("stockID=")[1].split("&")[0];
            document.title = `${metadata[id].acronym}: ${metadata[id].price} | TORN`;
            state.title = "custom";
        } else {
            if (state.title === "custom") {
                document.title = `Stock Market | TORN`;
                state.title = "original";
            }
        }
    }
    function addListeners() {
        //Select Drop-down Stock Acronyms
        document.querySelector(".hardy_stonks_box").addEventListener("input", (t) => {
            let target = t.target;
            //console.log(t);
            if (target.id === "stonks_select") {
                document.querySelector("#selectInput").innerHTML = '';
                document.querySelector("#selectOutput").innerHTML = '';
                document.querySelector("#prefBox_stonks").innerHTML = '';
                let val = target.value;
                if (!savedPrefs.prefs) {
                    savedPrefs.prefs = {};
                }
                savedPrefs.prefs.select1 = val;
                savedPrefs.prefs.select2 = "def";
                localStorage.setItem("hardy_stonks", JSON.stringify(savedPrefs));
                handleSelectInput(val);
            } else if (target.id === "stonksAcrSelect") {
                let value = target.value;
                if (!savedPrefs.prefs) {
                    savedPrefs.prefs = {};
                }
                savedPrefs.prefs.select1 = "def";
                savedPrefs.prefs.select2 = value;
                localStorage.setItem("hardy_stonks", JSON.stringify(savedPrefs));
                document.querySelector("#stonks_select").value = "def";
                document.querySelector("#prefBox_stonks").innerHTML = '';
                applyAcrFilter(value);
            }
        });
        //Select Output Div
        document.querySelector("#selectOutput").addEventListener("click", (g) => {
            let target = g.target;
            if (target.id === "sendManual2") {
                let val = document.querySelector("#stonks_manual_input").value;
                let str = val.trim();
                let buyRegex = /[0-9]{2}:[0-9]{2}:[0-9]{2} - [0-9]{2}\/[0-9]{2}\/[0-9]{2} You bought ([\d,]+)x (.+) (?:shares|share) at \$([\d,.]+) each for a total of \$([\d,]+)/gm;
                let sellRegex = /[0-9]{2}:[0-9]{2}:[0-9]{2} - [0-9]{2}\/[0-9]{2}\/[0-9]{2} You sold ([\d,]+)x (.+) (?:shares|share) at \$([\d,.]+) each for a total of \$([\d,]+) after \$([\d,]+) in fees/gm;
                if (buyRegex.test(str) || sellRegex.test(str)) {
                    sendManual(str);
                } else {
                    document.querySelector("#selectOutput").innerHTML = `<label class="stonksDownli">Please copy the transaction log properly from activity log and make sure time is also included.</label>`;
                }
            } else if (target.id === "cancelManualSend") {
                document.querySelector("#selectOutput").innerHTML = '';
            }
        });
        document.querySelector("div[class^='stockMarket_']").addEventListener("input", function(g) {
            if (g.target.className == "hardy_stonk_buy_input") {
                let inpu = g.target.value;
                if (inpu == "" || inpu.startsWith("N") || inpu == "$") {
                    return;
                } else {
                    let inp = inpu.replace(/,/g, "").replace(/\$/g, "").replace(/\s/g, "");
                    let val = inp.split("");
                    let lastLetter = val[val.length -1];
                    //console.log(lastLetter);
                    var digits;
                    if (lastLetter == "b" || lastLetter == "B") {
                        val.splice(val.length-1, 1);
                        digits = parseFloat(val.join(""))*1000000000.0
                    } else if (lastLetter == "k" || lastLetter == "K") {
                        val.splice(val.length-1, 1);
                        digits = parseFloat(val.join(""))*1000.0;
                    } else if (lastLetter == "m" || lastLetter == "M") {
                        val.splice(val.length-1, 1);
                        digits = parseFloat(val.join(""))*1000000.0
                    } else {
                        let joined = val.join("");
                        if (joined.includes(".")) {
                            digits = joined.replace(/./g, "h")
                        } else {
                            digits = joined;
                        }
                    }
                    if (isNaN(parseInt(digits))) {
                        g.target.setAttribute("isError", "yes");
                        g.target.value = val.join("");
                        //console.log(val);
                    } else if (digits === "") {
                        g.target.setAttribute("isError", "yes");
                    } else {
                        g.target.value = formatNum(digits);
                        g.target.setAttribute("isError", "no");
                    }
                }
            }
        });
        document.querySelector("div[class^='stockMarket_']").addEventListener("click", (t) => {
            let target = t.target;
            if (target.className === "hardy_amount_max") {
                document.querySelector(".hardy_stonk_buy_input").value = formatNum(moneyOnHand);
            } else if (target.className === "money_to_quant") {
                let inputBox = document.querySelector(".hardy_stonk_buy_input");
                if (inputBox.getAttribute("isError") !== "yes") {
                    let money = parseInt(inputBox.value.replace(/,/g, ""));
                    let id = inputBox.getAttribute("info");
                    let outputBox = document.querySelector("div[class^='buyBlock'] .input-money");
                    let lastVal = outputBox.value;
                    let placeHolderVal;
                    if (money <= moneyOnHand) {
                        let amount = Math.floor(money/metadata[id].price);
                        outputBox.value = formatNum(amount);
                        placeHolderVal = formatNum(amount);
                    } else {
                        let amount = Math.floor(moneyOnHand/metadata[id].price);
                        outputBox.value = formatNum(amount);
                        placeHolderVal = formatNum(amount);
                    }
                    let event = new Event('input', { bubbles: true });

                    let tracker = outputBox._valueTracker;
                    if (tracker) {
                        tracker.setValue(lastVal);
                    }
                    outputBox.dispatchEvent(event);
                }
            }
        });
        document.querySelector("#selectInput").addEventListener("click", (e) => {
            let target = e.target;
            if (!target.id) {
                if (target.className.includes("hardy_stonks_hideList")) {
                    if (target.classList.contains("hardyStonkHidden")) {
                        target.classList.remove("hardyStonkHidden");
                    } else {
                        target.classList.add("hardyStonkHidden");
                    }
                }
            } else {
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
                    document.querySelector("#prefBox_stonks").innerHTML = '';
                } else if (target.id === "sendManual1") {
                    let val = document.querySelector("#stonks_manual_input").value;
                    let str = val.trim();
                    let buyRegex = /[0-9]{2}:[0-9]{2}:[0-9]{2} - [0-9]{2}\/[0-9]{2}\/[0-9]{2} You bought ([\d,]+)x (.+) (?:shares|share) at \$([\d,.]+) each for a total of \$([\d,]+)/gm;
                    let sellRegex = /[0-9]{2}:[0-9]{2}:[0-9]{2} - [0-9]{2}\/[0-9]{2}\/[0-9]{2} You sold ([\d,]+)x (.+) (?:shares|share) at \$([\d,.]+) each for a total of \$([\d,]+) after \$([\d,]+) in fees/gm;
                    if (buyRegex.test(str) || sellRegex.test(str)) {
                        document.querySelector("#selectOutput").innerHTML = `<label>Are you sure you want to log that transaction into the spreadsheet?</label><br><br><button id="sendManual2">Yes</button><button id="cancelManualSend">No</button>`;
                    } else {
                        document.querySelector("#selectOutput").innerHTML = `<label class="stonksDownli">Please copy the transaction log properly from activity log and make sure time is also included.</label>`;
                    }
                } else if (target.id === "selectAllStonks") {
                    let nodeList = document.querySelectorAll(".hardy_stonks_hideList:not(.hardyStonkHidden)");
                    for (const node of nodeList) {
                        node.classList.add("hardyStonkHidden");
                    }
                } else if (target.id === "unselectAllStonks") {
                    let nodeList = document.querySelectorAll(".hardy_stonks_hideList.hardyStonkHidden");
                    for (const node of nodeList) {
                        node.classList.remove("hardyStonkHidden");
                    }
                } else if (target.id === "saveHiddenStonks") {
                    let array = [];
                    let nodeList = document.querySelectorAll(".hardy_stonks_hideList.hardyStonkHidden");
                    for (const node of nodeList) {
                        array.push(node.innerText);
                    }
                    savedPrefs.prefs.irr_list = array;
                    localStorage.setItem("hardy_stonks", JSON.stringify(savedPrefs));
                    document.querySelector("#selectOutput").innerHTML = `<label class="stonksUpli">Data saved!!</label>`;
                }
            }
        });
        document.querySelector("#prefBox_stonks").addEventListener("click", (g) => {
            let target = g.target;
            if (target.id === "openprompt") {
                document.querySelector("#selectInput").innerHTML = `<label>Enter Webapp link: </label><input type="text" id="stonksLink" value="${savedPrefs.link}"><button id="saveLink">Save</button><button id="closeLink">Close</button>`;
                document.querySelector("#selectOutput").innerHTML = ``;
            } else if (target.id === "stonkPrefClose") {
                document.querySelector("#prefBox_stonks").innerHTML = '';
                document.querySelector("#selectOutput").innerHTML = ``;
                document.querySelector("#selectInput").innerHTML = ``;
            } else if (target.id === "stonks_hide_list") {
                if (savedPrefs.prefs) {
                    if (!savedPrefs.prefs.irr_list) {
                        savedPrefs.prefs.irr_list = [];
                    }
                } else {
                    savedPrefs.prefs = {};
                    savedPrefs.prefs.irr_list = [];
                    savedPrefs.prefs.select1 = "def";
                    savedPrefs.prefs.select2 = "def";
                }
                let array = [];
                for (const acr of acrArray) {
                    if (savedPrefs.prefs.irr_list.indexOf(acr) !== -1) {
                        array.push(`<span class="hardy_stonks_hideList hardyStonkHidden">${acr}</span>`);
                    } else {
                        array.push(`<span class="hardy_stonks_hideList">${acr}</span>`);
                    }
                }
                document.querySelector("#selectInput").innerHTML = `<label style="font-size: 15px; font-weight:bold; display: block;">Click on the Stocks you want to hide from list:</label>${array.join("")}<br><br><button id="selectAllStonks">Select All</button><button id="unselectAllStonks">Unselect All</button><button id="saveHiddenStonks">Save</button><button id="closeLink">Close</button>`;
                document.querySelector("#selectOutput").innerHTML = ``;
            }
        });
        document.querySelector(".hardy_icon").addEventListener("click", () => {
            document.querySelector("#selectInput").innerHTML = '';
            document.querySelector("#selectOutput").innerHTML = '';
            document.querySelector("#prefBox_stonks").innerHTML = `<button id="openprompt">Webapp</button><button id="stonks_hide_list">Irrelevant List</button><button id="stonkPrefClose"> Close</button>`;
        });

        document.querySelector("#manualEntry").addEventListener("click", () => {
            document.querySelector("#prefBox_stonks").innerHTML = '';
            document.querySelector("#selectInput").innerHTML = `<input id="stonks_manual_input" type="text"><button id="sendManual1">Send</button><button id="closeLink">Close</button>`;
        });
        document.querySelector(".hardy_stonks_box_header").addEventListener("click", ()=> {
            let node = document.querySelector(".hardy_stonks_box");
            if (node.getAttribute("style")) {
                node.removeAttribute("style");
            } else {
                node.setAttribute("style", "display: none;");
            }
        });
    }
    GM_addStyle(`
   /*PC*/
td.stonkAcr { font-size: 20px!important; text-align: center; padding: 3px 18px!important; }
td.stonkInfo td { padding: 0 8px; }
td.stonkInfo tr { width: 100%; font-size: 16px; }
#hardyPortfolioBox img { height: 60px; width: 60px; padding: 5px 0 5px 15px; }
#innerTable td:first-child { padding-left: 18px; width: 50%; }
/*.hardy_acr { display: none; }*/
div[class^='manageContainer_'] { padding: 6px 0; min-height: 150px!important;}
/* mobile*/
@media screen and (max-width: 600px) {
.hardy_acr { display: block; font-size: 14px;}
td.stonkAcr { font-size: 16px!important; text-align: center; padding: 3px 6px!important; }
td.stonkInfo td { padding: 0 8px; }
td.stonkInfo tr { width: 100%; font-size: 14px; }
#hardyPortfolioBox img { height: 40px; width: 40px; padding: 5px; }
#innerTable td:first-child { padding: 6px; width: auto; }
div[class^='manageContainer_'] { padding: 6px 0; min-height: 250px!important;}
div[class^='buyBlock_'] {min-height: 150px!important;}
}
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
body:not(.dark-mode) .hardy_stonks_box { background-color: #f2f2f2; margin: 0 0 6px 0; padding: 6px 6px 6px 6px; border-radius: 0 5px 5px 5px; }
body.dark-mode .hardy_stonks_box { background-color: #333; margin: 0 0 6px 0; padding: 6px 6px 6px 6px; border-radius: 0 5px 5px 5px; }
.hardy_stonks_options { margin: 6px; display: block; position: relative; width: 100%; }
.hardy_stonks_text_info { margin: 16px; text-align: center; font-size: 18px; display: block; }
ul[isShow='no'] { display: none; }
div[class^='stockMarket'] ul[class^="stock_"] { height: 80px; }
.hardy_stonks_options select { padding: 9px 6px; font-size: 16px; border-radius: 4px; margin: 6px 0; }
#openprompt, #manualEntry, #stonks_hide_list, #selectAllStonks, #unselectAllStonks { border-style: solid; border-color: rgb(169, 169, 169); padding: 8px 8px; font-size: 16px; border-radius: 4px; margin: 6px 8px; color: black; }
body.dark-mode #openprompt, body.dark-mode #manualEntry, body.dark-mode #stonks_hide_list,body.dark-mode #selectAllStonks, body.dark-mode #unselectAllStonks { color: #ffffff; }
#stonksAcrSelect { margin-left: 10px; }
body.dark-mode .hardy_stonks_options select { background-color: #333; color: #ffffff;}
body:not(.dark-mode) .hardy_stonks_options select { background-color: #f2f2f2; }
#selectInput { font-size: 16px; margin: 8px 0; width: 100%; }
#selectInput input[type='number'] { margin: 0 6px; padding: 3px; border-radius: 2px; width: 80px; }
#selectInput input[type='text'] { margin: 0 6px; padding: 3px; border-radius: 2px; width: 50%; }
#saveCondi, #saveLink, #sendManual1, #sendManual2, #saveHiddenStonks {font-size: 16px; padding: 8px 10px; border-radius: 4px; margin-left: 8px; background-color: #008000e8; color: white; }
#closeLink, #cancelManualSend, #stonkPrefClose { font-size: 16px; padding: 8px 10px; border-radius: 4px; margin-left: 8px; background-color: #973335; color: white; }
#selectOutput { font-size: 15px; text-align: center; }
body:not(.dark-mode) ul[isGreen='yes'] { background-color: #ccfbcc; }
body.dark-mode ul[isGreen='yes'] { background-color: #036203; }
.hardy_stonks_box_header {background-color: black; color: white; padding: 5px 0; border-radius: 5px 5px 0 0; font-weight: bold; font-size: 17px; text-align: center; display: block;}
.hardy_stonks_boxdef {margin: 0 0 5px 0}
.hardy_icon  {vertical-align: middle;}
.hardy_stonks_hideList {display: inline-block; padding: 4px 6px; margin: 4px; border: 1px solid #939292; border-radius: 5px;}
.hardyStonkHidden {background-color: #aa6f6f; color:white;}
/*Test*/
.buyHint { margin: 4px; white-space: normal; font-weight: bold; display: block; text-align: center; }
.hardy_stonk_buy_input { padding: 2px; border: 1px solid #b0aaaa; border-radius: 0 4px 4px 0; display: inline; }
body.dark-mode .hardy_stonk_buy_input {background-color: #000000; color: rgb(255, 255, 255);}
body:not(.dark-mode) .hardy_amount_max { display: inline; padding: 4px 9px; color: #757373; background: linear-gradient(to bottom, #ffffff 0%, #dddddd 100%); border-bottom-left-radius: 5px; border-top-left-radius: 5px; border: 1px solid #ccc; }
body.dark-mode .hardy_amount_max {background-color: #5b5a5a; display: inline; padding: 4px 9px; color: #c1bfbf; border-bottom-left-radius: 5px; border-top-left-radius: 5px; border: 1px solid #7d7b7b;}
.money_to_quant {margin-left: 3px; padding: 4px 8px; border-radius: 5px; background: transparent linear-gradient(180deg, #E5E5E5 0%, #BBBBBB 60%, #999999 100%) 0 0 no-repeat; color: #333; font-size: 14px; font-weight: 700; width: 20px;}
input[isError='yes'] {background-color: #ecc8c8;}
body.dark-mode input[isError='yes'] {background-color: #ecc8c8; color: black;}
input[isError='no'] {background-color: #caeeca;}
body.dark-mode input[isError='no'] {background-color: #caeeca; color: black;}
div[class^='manageBlock_'] { padding: 6px 0!important;}
    `);
})();
