// ==UserScript==
// @name         Supply Pack Animation Remover
// @namespace    hardy.supplyPack.animation.remove
// @version      0.1
// @description  Removes animation when you use a supply pack
// @author       Father [2131687]
// @match        https://www.torn.com/item.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';
    GM_addStyle(`
    .d .pack-open-result .cache-item:nth-child(2), .d .money-gain, .d .pack-open-msg  {
    animation-delay: 0s!important;
}
.d .animated, .d .pack-open-msg  {
    animation-duration: 0s!important;
}
.d .pack-open-content.disabled-link .pack-open-msg a.open-another-cache {
    color: #069!important;
    pointer-events: auto!important;
    cursor: pointer!important;
    text-decoration-color: rgb(0, 102, 153)!important;
}
`);
})();
