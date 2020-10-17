// ==UserScript==
// @name         Termed War (Work in  Progress)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://www.torn.com/loader.php?sid=attack*
// ==/UserScript==

(function() {
  'use strict';

  let mug = false;
  let hosp = false;
  let leave = true;

  let storage = {};

  const config = {attributes: true, childList: true, subtree: true };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (document.querySelectorAll('div[class^="dialogButtons"]').length > 0) {
        changeCSS();
      }
    }
  })
  var cd = setInterval(checkForElement,
    1000);
  function checkForElement() {
    if (document.querySelectorAll('div[class^="playerArea"]').length > 0) {
      clearInterval(cd);
      const wrapper = document.querySelector('div[class^="playerArea"]');
      observer.observe(wrapper, config);
    }
  }

  function disconnect() {
    if (!storage.index) {
      observer.disconnect();
      storage.index = 69;
    }
  }
  //const wrapper = document.querySelector('div[class^="playerArea"]');
  //const wrapper = document.body;
  function changeCSS() {
    let optionsDialogBox = document.querySelector('div[class^="dialogButtons"]');
    let optionsBox = optionsDialogBox.children;
    for (const option of optionsBox) {
      let text = option.innerText.toLowerCase();
      if (!mug && text === "mug") {
        option.style.display = "none"
        disconnect();
      } else if (!hosp && text === "hosp") {
        option.style.display = "none";
        disconnect();
      } else if (!leave && text === "leave") {
        option.style.display = "none";
        disconnect();
      }

      if (!mug || !hosp || !leave) {
        if (text == "leave") {
          let showOptionsButton = document.createElement("button");
          showOptionsButton.className = option.className;
          showOptionsButton.innerText = "Show All Options";
          optionsDialogBox.appendChild(showOptionsButton);
        }
      }
    }
  }

})();