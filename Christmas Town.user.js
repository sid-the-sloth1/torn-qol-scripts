// ==UserScript==
// @name         Christmas Town Helper
// @namespace    hardy.ct.helper
// @version      1.0
// @description  Christmas Town Helper. Highlights Items, Chests, NPCs. And Games Cheat
// @author       Hardy [2131687]
// @match        https://www.torn.com/christmas_town.php*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @updateURL    https://raw.githubusercontent.com/sid-the-sloth1/torn-qol-scripts/main/Christmas%20Town.user.js
// ==/UserScript==
 
 
(function() {
    'use strict';
 
    let settings = {"count": 0};
    firstRun();
    addBox();
    ctGamesHelper();
    getPrices()
    deleteOldData();
 
    var wordFixerStart = false;
    window.addEventListener("hashchange", addBox);
    let original_fetch = unsafeWindow.fetch;
    unsafeWindow.fetch = async (url, init) => {
        let response = await original_fetch(url, init)
        let respo = response.clone();
        respo.json().then((data) => {
            if (url.includes("christmas_town.php")) {
                if (url.includes("q=move")|| url.includes("q=initMap")) {
                    if (wordFixerStart && url.includes("q=move")) {
                        wordFixerStart = false;
                        stopWordFixer();
                    }
                    if (data.mapData) {
                        if (data.mapData.items) {
                            let items = data.mapData.items;
                            if (items.length > 0) {
                                settings.count = 1;
                                let itemArray = [];
                                let chestArray = [];
                                for (const item of items) {
                                    let image = item.image.url;
                                    let position = item.position;
                                    let info = ctHelperGetInfo(image);
                                    if (info.type == "chests"||info.type == "combinationChest") {
                                        chestArray.push([info.name, position.x, position.y]);
                                    } else {
                                        itemArray.push([info.name, position.x, position.y]);
                                    }
                                }
                                ctHelperChangeHTML(itemArray, "hardyNearbyItems");
                                ctHelperChangeHTML(chestArray, "hardyNearbyChests");
                            } else {
                                if (settings.count == 1) {
                                    document.querySelector(".hardyNearbyChests").innerHTML = '<label>Nearby Chests(0)</label>';
                                    document.querySelector(".hardyNearbyItems").innerHTML = '<label>Nearby Items(0)</label>';
                                    settings.count = 0;
                                }
                            }
                        }
                        if (data.mapData.users) {
                            let users = data.mapData.users;
                            if (users.length > 0) {
                                checkForNPC();
                            }
                        }
                        if (data.mapData && data.mapData.trigger && data.mapData.trigger.item) {
                            let trigger = data.mapData.trigger;
                            if (trigger.message.includes("You find")) {
                                let itemUrl = trigger.item.image.url;
                                let reg = /\/images\/items\/([0-9]+)\/large\.png/g;
                                if (reg.test(itemUrl)) {
                                    let itemId = itemUrl.split("/")[3];
                                    let savedData = getSaveData();
                                    if (savedData.items[itemId]) {
                                        savedData.items[itemId] += 1;
                                    } else {
                                        savedData.items[itemId] = 1;
                                    }
                                    localStorage.setItem("ctHelperFound", JSON.stringify(savedData));
                                }
                            }
                        }
                    }
                } else if (url.includes("q=miniGameAction")) {
                    if (wordFixerStart) {
                        if (data.finished) {
                            stopWordFixer();
                            wordFixerStart = false;
                        } else {
                            if (data.progress && data.progress.word) {
                                wordSolver(data.progress.word);
                            }
                        }
                    }
                    if (data.miniGameType && data.miniGameType == "WordFixer" && isChecked('word_fixer_helper', 2)) {
                        if (wordFixerStart) {
                            console.log("Word Fixer already started");
                        } else {
                            wordFixerStart = true;
                            startWordFixer();
                            wordSolver(data.progress.word);
                        }
                    }
                }
                if (data.prizes) {
                    if (data.prizes.length > 0) {
                        let savedData = getSaveData();
                        for (const prize of data.prizes) {
                            if (prize.category === "tornItems") {
                                let itemId = prize.type;
                                if (savedData.items[itemId]) {
                                    savedData.items[itemId] += 1;
                                } else {
                                    savedData.items[itemId] = 1;
                                }
                            }
                        }
                        localStorage.setItem("ctHelperFound", JSON.stringify(savedData));
                    }
                }
                if (data.mapData && data.mapData.trigger && data.mapData.trigger.prizes) {
                    let prizes = data.mapData.trigger.prizes;
                    if (prizes.length > 0) {
                        let savedData = getSaveData();
                        for (const prize of prizes) {
                            if (prize.category === "tornItems") {
                                let itemId = prize.type;
                                if (savedData.items[itemId]) {
                                    savedData.items[itemId] += 1;
                                } else {
                                    savedData.items[itemId] = 1;
                                }
                            }
                        }
                        localStorage.setItem("ctHelperFound", JSON.stringify(savedData));
                    }
                }
 
            }
        });
        return response;
    };
    function addBox() {
        if (!document.querySelector(".hardyCTBox")) {
            if (document.querySelector("#christmastownroot div[class^='appCTContainer']")) {
                let newBox = document.createElement("div");
                newBox.innerHTML = '<div class="hardyCTHeader">Christmas Town Helper</div><div class="hardyCTContent"><br><a href="#/cthelper" class="ctRecordLink">Rewards Log</a><br><br><div class="hardyNearbyItems" style="float: left;"><label>Nearby Items(0)</label><div class="content"></div></div><div class="hardyNearbyChests" style="float:right;"><label>Nearby Chests(0)</label><div class="content"></div></div></div>';
                newBox.className = 'hardyCTBox';
                let doc = document.querySelector("#christmastownroot div[class^='appCTContainer']");
                doc.insertBefore(newBox, doc.firstChild.nextSibling);
                if (timedFunction) {
                    clearInterval(timedFunction);
                }
            } else {
                var timedFunction = setInterval(addBox, 1000);
            }
        }
        let pageUrl = window.location.href;
        if (pageUrl.includes("mapeditor") || pageUrl.includes("parametereditor") || pageUrl.includes("mymaps")) {
            document.querySelector(".hardyCTBox").style.display = "none";
            let node = document.querySelector(".hardyCTBox2");
            if (node) {
                node.style.display = "none";
            }
        } else if (pageUrl.includes("cthelper")) {
            document.querySelector(".hardyCTBox").style.display = "none";
            createTable();
            let node = document.querySelector(".hardyCTBox2");
            if (node) {
                node.style.display = "block";
            }
        } else {
            let box = document.querySelector(".hardyCTBox")
            if (box) {
                box.style.display = "block";
            }
            let node = document.querySelector(".hardyCTBox2");
            if (node) {
                node.style.display = "none";
            }
        }
    }
    function checkForNPC() {
        let npcList = document.querySelectorAll(".ct-user.npc");
        if (npcList.length > 0) {
            for (const npc of npcList) {
                if (npc.innerHTML.includes("santa")) {
                    npc.setAttribute("npcType", "santa");
                } else {
                    npc.setAttribute("npcType", "other");
                }
            }
        }
    }
    function ctHelperGetInfo(link) {
        let obj = {};
        obj.type = "item";
        let array = ["/keys/", "/chests/", "/combinationChest/"];
        for (const category of array) {
            if (link.indexOf(category) !== -1) {
                obj.type = category.replace(/\//g, "");
            }
        }
        if (obj.type === "keys") {
            if (link.includes("bronze")) {
                obj.name = "Bronze Key";
            } else if (link.includes("gold")) {
                obj.name = "Golden Key";
            } else if (link.includes("silver")) {
                obj.name = "Silver Key";
            }
        } else if (obj.type == "chests") {
            if (link.includes("1.gif")) {
                obj.name = "Gold Chest";
            } else if (link.includes("2.gif")) {
                obj.name = "Silver Chest";
            } else if (link.includes("3.gif")) {
                obj.name = "Bronze Chest";
            }
        } else if (obj.type == "combinationChest") {
            obj.name = "Combination Chest";
        } else if (obj.type == "item") {
            obj.name = "Mystery Gift";
        }
        return obj;
    }
    function ctHelperChangeHTML(array, selector) {
        let length = array.length;
        if (length > 0) {
            let newArray = [];
            for (const element of array) {
                newArray.push(`<p>${element[0]} at ${element[1]}, ${element[2]}<p>`);
            }
            if (selector == "hardyNearbyItems") {
                document.querySelector("."+selector).innerHTML = `<label>Nearby Items(${length})</label>${newArray.join("")}`;
            } else {
                document.querySelector("."+selector).innerHTML = `<label>Nearby Chests(${length})</label>${newArray.join("")}`;
            }
        } else {
            if (selector == "hardyNearbyItems") {
                document.querySelector("."+selector).innerHTML = `<label>Nearby Items(0)</label>`;
            } else {
                document.querySelector("."+selector).innerHTML = `<label>Nearby Chests(0)</label>`;
            }
        }
    }
    function ctGamesHelper() {
        if (isChecked('santa_clawz_helper', 2)) {
            GM_addStyle(`[class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADuy'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADu4'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADms'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADjr'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADj4'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADSx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADPy'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADOx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADLx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADKq'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAADCS'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAAD03'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAACun'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAACnk'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAACmg'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAACSe'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAACGL'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAAC1U'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAAC0w'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAAByX'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAABsX'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAADAFBMVEUAAAB7g'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAACzVBMVEUAAACTM'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC9FBMVEUAAADlw'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC9FBMVEUAAAD67'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC9FBMVEUAAACnR'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADy2'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADrw'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADlt'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADl5'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADgp'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADgo'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADak'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADKx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAADJn'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAAD9+'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAAD57'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAAD16'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAAClR'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAACdN'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAAC0R'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC91BMVEUAAABxW'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC8VBMVEUAAADKe'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC8VBMVEUAAADKc'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC7lBMVEUAAACXN'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADy1'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADw7'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADvz'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADu6'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADsx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADrx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADr1'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADpv'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADnt'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADe6'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADc2'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADVg'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADOv'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADLh'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADFV'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAADEx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAAD68'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAAD28'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAACup'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAACQN'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAAC0p'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAAC0l'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAABsX'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAABpe'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAAB2V'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC/VBMVEUAAAB/e'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADy1'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADt5'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADj4'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADf0'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADcr'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADal'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADLv'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAADJx'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAAD9+'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAACnl'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAACWM'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAACMh'], [class^='cell'] img[src^='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAMAAABHPGVmAAAC+lBMVEUAAAC+Y'] {opacity: .2;}`);
        }
        if (isChecked('snowball_shooter_helper', 2)) {
            GM_addStyle(`[class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABHwAAAB5'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABGAAAABu'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABG4AAABm'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABFIAAAB5'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAwIAAAB6'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA9QAAABu'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA44AAAB4'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA0gAAABm'], [class^='moving-block'] [style*='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA+IAAABm'] {opacity: .2;}`);
        }
        if (isChecked('christmas_wreath_helper', 2)) {
            GM_addStyle(`img[alt='christmas wreath'] {display: none;}`);
        }
    }
    //nsole.log(wordSolver("rFI"));
    function sortWord(word) {
        let array = word.toUpperCase().split("");
        array.sort();
        return array.join("");
    }
    function wordSolver(jumbled) {
        //Thanks to Helcostr for the list of words
        let listofWords = ["elf","eve","fir","ham","icy","ivy","joy","pie","toy","gift","gold","list","love","nice","sled","star","wish","wrap","xmas","yule","angel","bells","cider","elves","goose","holly","jesus","merry","myrrh","party","skate","visit","candle","creche","cookie","eggnog","family","frosty","icicle","joyful","manger","season","spirit","tinsel","turkey","unwrap","wonder","winter","wreath","charity","chimney","festive","holiday","krampus","mittens","naughty","package","pageant","rejoice","rudolph","scrooge","snowman","sweater","tidings","firewood","nativity","reindeer","shopping","snowball","stocking","toboggan","trimming","vacation","wise men","workshop","yuletide","chestnuts","christmas","fruitcake","greetings","mince pie","mistletoe","ornaments","snowflake","tradition","candy cane","decoration","ice skates","jack frost","north pole","nutcracker","saint nick","yule log","card","jolly","hope","scarf","candy","sleigh","parade","snowy","wassail","blizzard","noel","partridge","give","carols","tree","fireplace","socks","lights","kings","goodwill","sugarplum","bonus","coal","snow","happy","presents","pinecone"];
        var wordSolution = 'whereiscrimes2.0';
        for (const word of listofWords) {
            if (sortWord(word) === sortWord(jumbled)) {
                wordSolution = word.toUpperCase();
            }
        }
        if (wordSolution === 'whereiscrimes2.0') {
            document.querySelector(".hardyWordFixerContent").innerHTML = '<label class="ctHelperError">Sorry! couldn\'t find the solution. ):</label>';
        } else {
            document.querySelector(".hardyWordFixerContent").innerHTML = `<label class="ctHelperSuccess">${wordSolution}</label>`;
        }
    }
    function getPrices() {
        var last_update = GM_getValue('last');
        if (last_update === null || typeof last_update == "undefined") {
            last_update = 0;
        }
        if (Date.now()/1000 - last_update > 14400) {
            GM_xmlhttpRequest({
                method: 'GET',
                timeout: 20000,
                url: 'https://script.google.com/macros/s/AKfycbyRfg1Cx2Jm3IuCWASUu8czKeP3wm5jKsie4T4bxwZHzXTmPbaw4ybPRA/exec?key=getItems',
                onload: function(e) {
                    try {
                        let data = JSON.parse(e.responseText);
                        if (data.items) {
                            let items = data.items;
                            let obj = {};
                            obj.items = {};
                            for (var pp = 0; pp < items.length; pp++) {
                                let id = items[pp][0];
                                obj.items[id] = {};
                                obj.items[id].name = items[pp][1];
                                obj.items[id].value = items[pp][2];
                            }
                            localStorage.setItem('ctHelperItemInfo', JSON.stringify(obj));
                            GM_setValue('last', Date.now()/1000);
                            console.log("Price data received");
                        }
                    } catch (error) {
                        console.log("Error updating prices: "+error.message);
                    }
                }
            });
        }
    }
    function getSaveData() {
        let savedFinds = localStorage.getItem("ctHelperFound");
        var saved;
        if (typeof savedFinds == "undefined" || savedFinds === null) {
            saved = {};
            saved.items = {};
        } else {
            saved = JSON.parse(savedFinds);
        }
        return saved;
    }
    function createTable() {
        if (!document.querySelector(".hardyCTBox2")) {
            let node = document.createElement("div");
            node.className = "hardyCTBox2";
            document.querySelector(".content-wrapper").appendChild(node);
            document.querySelector(".hardyCTBox2").addEventListener("click", (e) => {
                if (e.target.id === "hardyctHelperSave") {
                    let checkboxes = document.querySelectorAll(".hardyCTHelperCheckbox");
                    for (const checkbox of checkboxes) {
                        if (checkbox.checked) {
                            GM_setValue(checkbox.id, "yes");
                        } else {
                            GM_setValue(checkbox.id, "no");
                        }
                    }
                    location.reload();
                } else if (e.target.id == "hardyctHelperdelete") {
                    document.querySelector(".hardyCTtextBox").innerHTML = '<p>Are you sure you want to delete the finds data?</p><button id="hardyCTConfirmDelete">Yes</button><button id="hardyCTNoDelete">No</button>';
                } else if (e.target.id == "hardyCTConfirmDelete") {
                    let obj = {"items": {}};
                    localStorage.setItem("ctHelperFound", JSON.stringify(obj));
                    document.querySelector(".hardyCTtextBox").innerHTML = '<label class="ctHelperSuccess"Data deleted!</label>';
                    document.querySelector(".hardyCTTable").innerHTML = '';
                } else if (e.target.id == "hardyCTNoDelete") {
                    document.querySelector(".hardyCTtextBox").innerHTML = '';
                }
            });
        }
        document.querySelector(".hardyCTBox2").innerHTML = '<div class="hardyCTHeader">Christmas Town Helper</div><div class="hardyCTTableBox"><div class="hardyCTbuttonBox" style="margin-top: 8px;"><input type="checkbox" class="hardyCTHelperCheckbox" id="christmas_wreath_helper"  value="yes"'+isChecked('christmas_wreath_helper', 1)+'><label for="christmas_wreath_helper">Christmas Wreath Helper</label><br><input type="checkbox" class="hardyCTHelperCheckbox" id="snowball_shooter_helper"  value="yes"'+isChecked('snowball_shooter_helper', 1)+'><label for="snowball_shooter_helper">Snowball Shooter Helper</label><br><input type="checkbox" class="hardyCTHelperCheckbox" id="santa_clawz_helper" value="yes"'+isChecked('santa_clawz_helper', 1)+'><label for="santa_clawz_helper">Santa Clawz Helper</label><br><input type="checkbox" class="hardyCTHelperCheckbox" id="word_fixer_helper" value="yes"'+isChecked('word_fixer_helper', 1)+'><label for="word_fixer_helper">Word Fixer Helper</label><br><a href="#/" class="ctRecordLink" style="display:inline;">Go back</a><button id="hardyctHelperSave" style="background-color:#17841b;">Save</button><button id="hardyctHelperdelete" style="background-color:#f03b10;">Delete Finds</button></div><div class="hardyCTtextBox"></div><div class="hardyCTTable" style="overflow-x:auto;"></div></div>';
        let itemData = localStorage.getItem("ctHelperItemInfo");
        var marketValueData;
        if (typeof itemData == "undefined" || itemData === null) {
            marketValueData = "ched";
        } else {
            marketValueData = JSON.parse(itemData);
        }
        if (marketValueData == "ched") {
            document.querySelector(".hardyCTTableBox").innerHTML = '<label class="ctHelperError">Unable to get data from the spreadsheet. Kindly refresh the page. Contact Father [2131687] if the problem persists</label>';
        } else {
            let savedData = getSaveData();
            let obj = {"items": {}};
 
            if (savedData == obj) {
                document.querySelector(".hardyCTTableBox").innerHTML = '<label class="ctHelperError">You haven\'t found any items yet. Try again later!</label>';
            } else {
                var totalValue = 0;
                let tableArray = [];
                for (var mp in savedData.items) {
                    let count = savedData.items[mp];
                    let item = marketValueData.items[mp];
                    let name = item.name;
                    let value = item.value;
                    let price = count * value
                    totalValue += parseInt(price);
                    tableArray.push(`<tr><td><img src="/images/items/${mp}/medium.png", alt = "${name}"></td><td>${name}</td><td>${count}</td><td>$${formatNumber(value)}</td><td>$${formatNumber(price)}</td></tr>`);
                }
                document.querySelector(".hardyCTTable").innerHTML = '<table><tr><th>Image</th><th>Item Name</th><th>Amount</th><th>Price</th><th>Total</th></tr>'+tableArray.join("")+'</table><p>Total value: $'+formatNumber(totalValue)+'</p>';
 
            }
        }
 
    }
    function formatNumber(num) {
        return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
    }
    function isChecked(element, returnType) {
        let value = GM_getValue(element);
        if (typeof value == "undefined" || value === null || value === "no") {
            if (returnType == 1) {
                return "";
            } else {
                return false;
            }
        } else {
            if (returnType == 1) {
                return " checked";
            } else {
                return true;
            }
        }
    }
    function firstRun () {
        if (!isChecked("firstRun", 2)) {
            GM_setValue("christmas_wreath_helper", "yes");
            GM_setValue("snowball_shooter_helper", "yes");
            GM_setValue("santa_clawz_helper", "yes");
            GM_setValue("word_fixer_helper", "yes");
            GM_setValue("firstRun", "blah");
            GM_setValue("month", Date.now());
        }
    }
    function deleteOldData() {
        let now = new Date(Date.now());
        if (now.getMonth == 11) {
            if (new Date(GM_getValue("month")).getFullYear() != now.getFullYear()) {
                let obj = {"items": {}};
                localStorage.setItem("ctHelperFound", JSON.stringify(obj));
            }
        }
    }
    function stopWordFixer() {
        let node = document.querySelector(".ctHelperWordFixerBox");
        if (node) {
            node.remove();
        }
    }
    function startWordFixer() {
        let node = document.createElement("div");
        node.className = "ctHelperWordFixerBox";
        node.innerHTML = '<div class="hardyCTHeader">Word Fixer Cheat</div><div class="hardyWordFixerContent"></div>';
        let reference = document.querySelector(".ct-wrap");
        reference.parentNode.insertBefore(node, reference);
    }
    GM_addStyle(`
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 101, 74, .53), 0 0 0 0 rgba(255, 109, 74, .47); }
 40% { box-shadow: 0 0 0 50px rgba(255, 109, 74, .76), 0 0 0 0 rgba(238, 83, 46, .45); }
 80% { box-shadow: 0 0 0 50px rgba(242, 68, 27, .41), 0 0 0 0 rgba(255, 109, 74, .76); }
 100% { box-shadow: 0 0 0 0 rgba(255, 109, 74, .41), 0 0 0 0 rgba(255, 109, 74, .76); } }
.ctRecordLink { margin: 18px; padding: 5px; background-color: #4294f2; border-radius: 4px; color: #fdfcfc; text-decoration: none; }
@keyframes otherstuff { 0% { box-shadow: 0 0 0 0 rgba(244, 226, 130, .66), 0 0 0 0 rgba(240, 229, 92, .69); height: 500%; width: 500%; }
 40% { box-shadow: 0 0 0 50px rgba(240, 229, 92, .69), 0 0 0 0 rgba(238, 220, 99, .82); height: 500%; width: 500%; }
 80% { box-shadow: 0 0 0 50px rgba(240, 229, 92, .69), 0 0 0 0 rgba(240, 229, 92, .69); height: 500%; width: 500px; }
 100% { box-shadow: 0 0 0 0 rgba(238, 220, 99, .82), 0 0 0 0 rgba(244, 226, 130, .66); height: 600%; width: 600%; } }
@keyframes othernpc { 0% { box-shadow: 0 0 0 0 rgba(130, 216, 244, .52), 0 0 0 0 rgba(92, 191, 240, .54); }
 40% { box-shadow: 0 0 0 50px rgba(69, 174, 232, .39), 0 0 0 0 rgba(69, 174, 232, .45); }
 80% { box-shadow: 0 0 0 50px rgba(92, 191, 240, .51), 0 0 0 0 rgba(130, 216, 244, .58); }
 100% { box-shadow: 0 0 0 0 rgba(92, 191, 240, .4), 0 0 0 0 rgba(92, 191, 240, .37); } }
.items-layer .ct-item img { border-radius: 50%; animation: otherstuff 2s ease-out infinite; }
.ct-user-wrap .user-map:before {display:none;}
.hardyCTHeader { background-color: #0d0d0d; border: 2px solid #000; border-radius: 0.5em 0.5em 0 0; text-indent: 0.5em; font-size: 18px; color: #ffff; }
.hardyCTContent, .hardyCTTableBox, .hardyWordFixerContent { border-radius: 8px; background-color: rgb(242, 242, 242); box-shadow: 0px 4px 9px 3px rgba(119, 119, 119, 0.64); -moz-box-shadow: 0px 4px 9px 3px rgba(119, 119, 119, 0.64); -webkit-box-shadow: 0px 4px 9px 3px rgba(119, 119, 119, 0.64); padding: 5px; overflow: auto; }
.hardyCTBox, .hardyCTBox2, .ctHelperWordFixerBox { margin: 9px; margin-bottom: 18px;}
.hardyCTBox2 table { color: #333; font-family: Helvetica, Arial, sans-serif; width: 640px; border: 2px #808080 solid; margin: 20px; }
.hardyCTBox2 td, th { border: 1px solid rgba(0, 0, 0, .55); height: 30px; transition: all 0.3s; }
.hardyCTBox2 th { background: #868282; font-weight: bold; text-align: center; }
.hardyCTBox2 td { background: #c6c4c4; text-align: center; }
.hardyCTBox2 tr:nth-child(even) td { background: #F1F1F1; }
.hardyCTBox2 tr:nth-child(odd) td { background: #c6c4c4; }
.hardyCTBox2 tr td:hover { background: #666; color: #FFF; }
.hardyCTTable { padding: 5px; }
.hardyCTHelperCheckbox { margin: 8px; margin-left: 18px; }
.hardyCTtextBox { text-align: center; }
.hardyCTtextBox button { background-color: rgba(240, 60, 17, .91); }
.hardyCTBox2 button { padding: 4px; border-radius: 4px; color: white; margin: 9px; }
.ctHelperError { color: #ff000091; margin: 5px; }
.ctHelperSuccess { color: #00802fcc; margin: 5px; font-weight: bold; font-size: 16px; }
.hardyCTBox2 p { margin: 15px; font-weight: bold; font-family: Helvetica; }
.hardyNearbyItems, .hardyNearbyChests { padding: 4px; display: inline; }
.hardyNearbyItems label, .hardyNearbyChests label { font-weight: bold; }
.hardyCTBox p { margin-top: 9px; font-family: Helvetica; }
div[npcType="santa"] { border-radius: 50%; animation: pulse 2s ease-out infinite; }
div[npcType="other"] { border-radius: 50%; animation: othernpc 2s ease-out infinite; }
`);
})();
