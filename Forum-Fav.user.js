// ==UserScript==
// @name         Forum Favourite
// @namespace    hardy.forum.fav
// @version      0.1
// @description  Lets you put your favourite sub-forums on top.
// @author       Father [2131687]
// @match        https://www.torn.com/forums.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    let saved = JSON.parse(GM_getValue("saved") || `{"0": [], "1": [], "2": [], "3": []}`);
    let filledStar =`<svg style="color: #f3da35" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M7.22303 0.665992C7.32551 0.419604 7.67454 0.419604 7.77702 0.665992L9.41343 4.60039C9.45663 4.70426 9.55432 4.77523 9.66645 4.78422L13.914 5.12475C14.18 5.14607 14.2878 5.47802 14.0852 5.65162L10.849 8.42374C10.7636 8.49692 10.7263 8.61176 10.7524 8.72118L11.7411 12.866C11.803 13.1256 11.5206 13.3308 11.2929 13.1917L7.6564 10.9705C7.5604 10.9119 7.43965 10.9119 7.34365 10.9705L3.70718 13.1917C3.47945 13.3308 3.19708 13.1256 3.25899 12.866L4.24769 8.72118C4.2738 8.61176 4.23648 8.49692 4.15105 8.42374L0.914889 5.65162C0.712228 5.47802 0.820086 5.14607 1.08608 5.12475L5.3336 4.78422C5.44573 4.77523 5.54342 4.70426 5.58662 4.60039L7.22303 0.665992Z" fill="#f3da35"></path> </svg>`;
    let emptyStar = `<svg style="color: #f3da35" xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16"> <path d="M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.461 0z" fill="#f3da35"></path> </svg>`;
    let cd;
    window.addEventListener("hashchange", ()=> {
        checkHash();
    });
    checkHash();
    function checkHash() {
        let hash = window.location.hash;
        if (hash === null|| typeof hash == "undefined" || hash.includes("/p=main") || hash === "" || !hash.startsWith("#/p=")) {
            cd = setInterval(function() {
                let forumLists = document.querySelectorAll(".forum-list");
                if (forumLists.length > 0) {
                    clearInterval(cd);
                    let index = 0;
                    for (const forumList of forumLists) {
                        if (index > 0) {
                            let liList = forumList.querySelectorAll('li[data-href^="forums.php?p=forums"]');
                            for (const li of liList) {
                                let dataUrl = li.getAttribute("data-href");
                                let span = document.createElement("span");
                                span.className = "hardyForumFav";
                                let isFav = saved[index.toString()].indexOf(dataUrl) === -1?"no":"yes";
                                let html = isFav ==="no"? emptyStar: filledStar;
                                span.setAttribute("isFav", isFav);
                                li.setAttribute("isFav", isFav);
                                span.setAttribute("index", `${index}`);
                                span.setAttribute("data-href", dataUrl);
                                span.innerHTML = html;
                                span.addEventListener("click", (e)=> {
                                    e.preventDefault();
                                    let isSelected = span.getAttribute("isFav") === "yes"?true: false;
                                    if (isSelected) {
                                        span.innerHTML = emptyStar;
                                        span.setAttribute("isFav", "no");
                                        saved[span.getAttribute("index")] = remove(saved[span.getAttribute("index")], span.getAttribute("data-href"))
                                        save();
                                    } else {
                                        span.innerHTML = filledStar;
                                        span.setAttribute("isFav", "yes");
                                        saved[span.getAttribute("index")].push(span.getAttribute("data-href"));
                                        save();
                                    }
                                })
                                li.querySelector(".name a .desc").appendChild(span);
                            }

                        }
                        index += 1;
                    }
                }
            }, 200);
        }
    }
    function save() {
        let saveData = saved;
        let stringed = JSON.stringify(saveData);
        console.log(stringed);
        GM_setValue("saved", stringed);
    }
    function remove(inputArray, inputString) {
        let array = [];
        for (const elem of inputArray) {
            if (elem !== inputString){
                array.push(elem);
            }
        }
        return array;
    }
    GM_addStyle(`.hardyForumFav { padding: 6px;}.forum-list {display: flex!important; flex-direction: column;} li[isFav="yes"] {order: -1;}`);
})();
