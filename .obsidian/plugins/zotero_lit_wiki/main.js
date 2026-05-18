const {
  Plugin,
  Notice,
  Modal,
  Setting,
  FuzzySuggestModal,
  PluginSettingTab,
} = require("obsidian");

const http = require("http");
const https = require("https");
const fs = require("fs/promises");
const { fileURLToPath } = require("url");

// Inlined Fuse.js v7.2.0 basic build (~15KB)
const Fuse = (function () {
  const module = { exports: {} };
  const exports = module.exports;
  // ===== BEGIN inlined fuse.basic.min.js =====
  var e,t;e=this,t=function(){"use strict";function e(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function t(t){for(var r=1;r<arguments.length;r++){var n=null!=arguments[r]?arguments[r]:{};r%2?e(Object(n),!0).forEach((function(e){o(t,e,n[e])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(n)):e(Object(n)).forEach((function(e){Object.defineProperty(t,e,Object.getOwnPropertyDescriptor(n,e))}))}return t}function r(e){return r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},r(e)}function n(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,c(n.key),n)}}function u(e,t,r){return t&&i(e.prototype,t),r&&i(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e}function o(e,t,r){return(t=c(t))in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function s(e){return function(e){if(Array.isArray(e))return a(e)}(e)||function(e){if("undefined"!=typeof Symbol&&null!=e[Symbol.iterator]||null!=e["@@iterator"])return Array.from(e)}(e)||function(e,t){if(e){if("string"==typeof e)return a(e,t);var r=Object.prototype.toString.call(e).slice(8,-1);return"Object"===r&&e.constructor&&(r=e.constructor.name),"Map"===r||"Set"===r?Array.from(e):"Arguments"===r||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?a(e,t):void 0}}(e)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function a(e,t){(null==t||t>e.length)&&(t=e.length);for(var r=0,n=new Array(t);r<t;r++)n[r]=e[r];return n}function c(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var r=e[Symbol.toPrimitive];if(void 0!==r){var n=r.call(e,t||"default");if("object"!=typeof n)return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return("string"===t?String:Number)(e)}(e,"string");return"symbol"==typeof t?t:String(t)}function h(e){return Array.isArray?Array.isArray(e):"[object Array]"===A(e)}var l=1/0;function f(e){return null==e?"":function(e){if("string"==typeof e)return e;var t=e+"";return"0"==t&&1/e==-l?"-0":t}(e)}function d(e){return"string"==typeof e}function v(e){return"number"==typeof e}function g(e){return!0===e||!1===e||function(e){return function(e){return"object"===r(e)}(e)&&null!==e}(e)&&"[object Boolean]"==A(e)}function p(e){return null!=e}function y(e){return!e.trim().length}function A(e){return null==e?void 0===e?"[object Undefined]":"[object Null]":Object.prototype.toString.call(e)}var m=function(e){return"Missing ".concat(e," property in key")},C=function(e){return"Property 'weight' in key '".concat(e,"' must be a positive integer")},F=Object.prototype.hasOwnProperty,E=function(){function e(t){var r=this;n(this,e),this._keys=[],this._keyMap={};var i=0;t.forEach((function(e){var t=B(e);r._keys.push(t),r._keyMap[t.id]=t,i+=t.weight})),this._keys.forEach((function(e){e.weight/=i}))}return u(e,[{key:"get",value:function(e){return this._keyMap[e]}},{key:"keys",value:function(){return this._keys}},{key:"toJSON",value:function(){return JSON.stringify(this._keys)}}]),e}();function B(e){var t=null,r=null,n=null,i=1,u=null;if(d(e)||h(e))n=e,t=D(e),r=b(e);else{if(!F.call(e,"name"))throw new Error(m("name"));var o=e.name;if(n=o,F.call(e,"weight")&&(i=e.weight)<=0)throw new Error(C(o));t=D(o),r=b(o),u=e.getFn}return{path:t,id:r,weight:i,src:n,getFn:u}}function D(e){return h(e)?e:e.split(".")}function b(e){return h(e)?e.join("."):e}var k={useExtendedSearch:!1,getFn:function(e,t){var r=[],n=!1;return function e(t,i,u,o){if(p(t))if(i[u]){var s=t[i[u]];if(!p(s))return;if(u===i.length-1&&(d(s)||v(s)||g(s)))r.push(void 0!==o?{v:f(s),i:o}:f(s));else if(h(s)){n=!0;for(var a=0,c=s.length;a<c;a+=1)e(s[a],i,u+1,a)}else i.length&&e(s,i,u+1,o)}else r.push(void 0!==o?{v:t,i:o}:t)}(e,d(t)?t.split("."):t,0),n?r:r[0]},ignoreLocation:!1,ignoreFieldNorm:!1,fieldNormWeight:1},M=t(t(t(t({},{isCaseSensitive:!1,ignoreDiacritics:!1,includeScore:!1,keys:[],shouldSort:!0,sortFn:function(e,t){return e.score===t.score?e.idx<t.idx?-1:1:e.score<t.score?-1:1}}),{includeMatches:!1,findAllMatches:!1,minMatchCharLength:1}),{location:0,threshold:.6,distance:100}),k),_=/[^ ]+/g,w=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r=t.getFn,i=void 0===r?M.getFn:r,u=t.fieldNormWeight,o=void 0===u?M.fieldNormWeight:u;n(this,e),this.norm=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:1,t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:3,r=new Map,n=Math.pow(10,t);return{get:function(t){var i=t.match(_).length;if(r.has(i))return r.get(i);var u=1/Math.pow(i,.5*e),o=parseFloat(Math.round(u*n)/n);return r.set(i,o),o},clear:function(){r.clear()}}}(o,3),this.getFn=i,this.isCreated=!1,this.setIndexRecords()}return u(e,[{key:"setSources",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[];this.docs=e}},{key:"setIndexRecords",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[];this.records=e}},{key:"setKeys",value:function(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[];this.keys=t,this._keysMap={},t.forEach((function(t,r){e._keysMap[t.id]=r}))}},{key:"create",value:function(){var e=this;!this.isCreated&&this.docs.length&&(this.isCreated=!0,d(this.docs[0])?this.docs.forEach((function(t,r){e._addString(t,r)})):this.docs.forEach((function(t,r){e._addObject(t,r)})),this.norm.clear())}},{key:"add",value:function(e){var t=this.size();d(e)?this._addString(e,t):this._addObject(e,t)}},{key:"removeAt",value:function(e){this.records.splice(e,1);for(var t=e,r=this.size();t<r;t+=1)this.records[t].i-=1}},{key:"removeAll",value:function(e){for(var t=e.length-1;t>=0;t-=1)this.records.splice(e[t],1);for(var r=0,n=this.records.length;r<n;r+=1)this.records[r].i=r}},{key:"getValueForItemAtKeyId",value:function(e,t){return e[this._keysMap[t]]}},{key:"size",value:function(){return this.records.length}},{key:"_addString",value:function(e,t){if(p(e)&&!y(e)){var r={v:e,i:t,n:this.norm.get(e)};this.records.push(r)}}},{key:"_addObject",value:function(e,t){var r=this,n={i:t,$:{}};this.keys.forEach((function(t,i){var u=t.getFn?t.getFn(e):r.getFn(e,t.path);if(p(u))if(h(u)){for(var o=[],s=0,a=u.length;s<a;s+=1){var c=u[s];if(p(c))if(d(c)){if(!y(c)){var l={v:c,i:s,n:r.norm.get(c)};o.push(l)}}else if(d(c.v)&&!y(c.v)){var f={v:c.v,i:c.i,n:r.norm.get(c.v)};o.push(f)}}n.$[i]=o}else if(d(u)&&!y(u)){var v={v:u,n:r.norm.get(u)};n.$[i]=v}})),this.records.push(n)}},{key:"toJSON",value:function(){return{keys:this.keys,records:this.records}}}]),e}();function S(e,t){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},n=r.getFn,i=void 0===n?M.getFn:n,u=r.fieldNormWeight,o=void 0===u?M.fieldNormWeight:u,s=new w({getFn:i,fieldNormWeight:o});return s.setKeys(e.map(B)),s.setSources(t),s.create(),s}var x=32;function O(e,t,r){var n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},i=n.location,u=void 0===i?M.location:i,o=n.distance,s=void 0===o?M.distance:o,a=n.threshold,c=void 0===a?M.threshold:a,h=n.findAllMatches,l=void 0===h?M.findAllMatches:h,f=n.minMatchCharLength,d=void 0===f?M.minMatchCharLength:f,v=n.includeMatches,g=void 0===v?M.includeMatches:v,p=n.ignoreLocation,y=void 0===p?M.ignoreLocation:p;if(t.length>x)throw new Error("Pattern length exceeds max of ".concat(x,"."));for(var A,m=t.length,C=e.length,F=Math.max(0,Math.min(u,C)),E=c,B=F,D=function(e,t){var r=e/m;if(y)return r;var n=Math.abs(F-t);return s?r+n/s:n?1:r},b=d>1||g,k=b?Array(C):[];(A=e.indexOf(t,B))>-1;){var _=D(0,A);if(E=Math.min(_,E),B=A+m,b)for(var w=0;w<m;)k[A+w]=1,w+=1}B=-1;for(var S=[],O=1,j=m+C,N=1<<m-1,I=0;I<m;I+=1){for(var L=0,P=j;L<P;)D(I,F+P)<=E?L=P:j=P,P=Math.floor((j-L)/2+L);j=P;var W=Math.max(1,F-P+1),z=l?C:Math.min(F+P,C)+m,T=Array(z+2);T[z+1]=(1<<I)-1;for(var $=z;$>=W;$-=1){var K=$-1,U=r[e[K]];if(b&&(k[K]=+!!U),T[$]=(T[$+1]<<1|1)&U,I&&(T[$]|=(S[$+1]|S[$])<<1|1|S[$+1]),T[$]&N&&(O=D(I,K))<=E){if(E=O,(B=K)<=F)break;W=Math.max(1,2*F-B)}}if(D(I+1,F)>E)break;S=T}var J={isMatch:B>=0,score:Math.max(.001,O)};if(b){var Q=function(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:[],t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:M.minMatchCharLength,r=[],n=-1,i=-1,u=0,o=e.length;u<o;u+=1){var s=e[u];s&&-1===n?n=u:s||-1===n||((i=u-1)-n+1>=t&&r.push([n,i]),n=-1)}return e[u-1]&&u-n>=t&&r.push([n,u-1]),r}(k,d);Q.length?g&&(J.indices=Q):J.isMatch=!1}return J}function j(e){for(var t={},r=0,n=e.length;r<n;r+=1){var i=e.charAt(r);t[i]=(t[i]||0)|1<<n-r-1}return t}var N=String.prototype.normalize?function(e){return e.normalize("NFD").replace(/[̀-ͯ҃-҉֑-ׇֽֿׁׂׅׄؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۤۧۨ-ܑۭܰ-݊ަ-ް߫-߽߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛࣓-ࣣ࣡-ःऺ-़ा-ॏ॑-ॗॢॣঁ-ঃ়া-ৄেৈো-্ৗৢৣ৾ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑੰੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣૺ-૿ଁ-ଃ଼ା-ୄେୈୋ-୍ୖୗୢୣஂா-ூெ-ைொ-்ௗఀ-ఄా-ౄె-ైొ-్ౕౖౢౣಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣഀ-ഃ഻഼ാ-ൄെ-ൈൊ-്ൗൢൣංඃ්ා-ුූෘ-ෟෲෳัิ-ฺ็-๎ັິ-ູົຼ່-ໍ༹༘༙༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏႚ-ႝ፝-፟ᜒ-᜔ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝᠋-᠍ᢅᢆᢩᤠ-ᤫᤰ-᤻ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼᪰-᪾ᬀ-ᬄ᬴-᭄᭫-᭳ᮀ-ᮂᮡ-ᮭ᯦-᯳ᰤ-᰷᳐-᳔᳒-᳨᳭ᳲ-᳴᳷-᳹᷀-᷹᷻-᷿⃐-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯꙯-꙲ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧꢀꢁꢴ-ꣅ꣠-꣱ꣿꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀ꧥꨩ-ꨶꩃꩌꩍꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭ﬞ︀-️︠-︯]/g,"")}:function(e){return e},I=function(){function e(t){var r=this,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},u=i.location,o=void 0===u?M.location:u,s=i.threshold,a=void 0===s?M.threshold:s,c=i.distance,h=void 0===c?M.distance:c,l=i.includeMatches,f=void 0===l?M.includeMatches:l,d=i.findAllMatches,v=void 0===d?M.findAllMatches:d,g=i.minMatchCharLength,p=void 0===g?M.minMatchCharLength:g,y=i.isCaseSensitive,A=void 0===y?M.isCaseSensitive:y,m=i.ignoreDiacritics,C=void 0===m?M.ignoreDiacritics:m,F=i.ignoreLocation,E=void 0===F?M.ignoreLocation:E;if(n(this,e),this.options={location:o,threshold:a,distance:h,includeMatches:f,findAllMatches:v,minMatchCharLength:p,isCaseSensitive:A,ignoreDiacritics:C,ignoreLocation:E},t=A?t:t.toLowerCase(),t=C?N(t):t,this.pattern=t,this.chunks=[],this.pattern.length){var B=function(e,t){r.chunks.push({pattern:e,alphabet:j(e),startIndex:t})},D=this.pattern.length;if(D>x){for(var b=0,k=D%x,_=D-k;b<_;)B(this.pattern.substr(b,x),b),b+=x;if(k){var w=D-x;B(this.pattern.substr(w),w)}}else B(this.pattern,0)}}return u(e,[{key:"searchIn",value:function(e){var t=this.options,r=t.isCaseSensitive,n=t.ignoreDiacritics,i=t.includeMatches;if(e=r?e:e.toLowerCase(),e=n?N(e):e,this.pattern===e){var u={isMatch:!0,score:0};return i&&(u.indices=[[0,e.length-1]]),u}var o=this.options,a=o.location,c=o.distance,h=o.threshold,l=o.findAllMatches,f=o.minMatchCharLength,d=o.ignoreLocation,v=[],g=0,p=!1;this.chunks.forEach((function(t){var r=t.pattern,n=t.alphabet,u=t.startIndex,o=O(e,r,n,{location:a+u,distance:c,threshold:h,findAllMatches:l,minMatchCharLength:f,includeMatches:i,ignoreLocation:d}),y=o.isMatch,A=o.score,m=o.indices;y&&(p=!0),g+=A,y&&m&&v.push.apply(v,s(m))}));var y={isMatch:p,score:p?g/this.chunks.length:1};return p&&i&&(y.indices=function(e){if(e.length<=1)return e;e.sort((function(e,t){return e[0]-t[0]||e[1]-t[1]}));for(var t=[e[0]],r=1,n=e.length;r<n;r+=1){var i=t[t.length-1],u=e[r];u[0]<=i[1]+1?i[1]=Math.max(i[1],u[1]):t.push(u)}return t}(v)),y}}]),e}(),L=[];function P(e,t){var r=t.ignoreFieldNorm,n=void 0===r?M.ignoreFieldNorm:r,i=1;e.matches.forEach((function(e){var t=e.key,r=e.norm,u=e.score,o=t?t.weight:null;i*=Math.pow(0===u&&o?Number.EPSILON:u,(o||1)*(n?1:r))})),e.score=i}var W=function(){function e(t){n(this,e),this.limit=t,this.heap=[]}return u(e,[{key:"size",get:function(){return this.heap.length}},{key:"shouldInsert",value:function(e){return this.size<this.limit||e<this.heap[0].score}},{key:"insert",value:function(e){this.size<this.limit?(this.heap.push(e),this._bubbleUp(this.size-1)):e.score<this.heap[0].score&&(this.heap[0]=e,this._sinkDown(0))}},{key:"extractSorted",value:function(e){return this.heap.sort(e)}},{key:"_bubbleUp",value:function(e){for(var t=this.heap;e>0;){var r=e-1>>1;if(t[e].score<=t[r].score)break;var n=t[e];t[e]=t[r],t[r]=n,e=r}}},{key:"_sinkDown",value:function(e){var t=this.heap,r=t.length,n=e;do{var i=2*(e=n)+1,u=2*e+2;if(i<r&&t[i].score>t[n].score&&(n=i),u<r&&t[u].score>t[n].score&&(n=u),n!==e){var o=t[e];t[e]=t[n],t[n]=o}}while(n!==e)}}]),e}();function z(e,t){var r=e.matches;t.matches=[],p(r)&&r.forEach((function(e){if(p(e.indices)&&e.indices.length){var r={indices:e.indices,value:e.value};e.key&&(r.key=e.key.src),e.idx>-1&&(r.refIndex=e.idx),t.matches.push(r)}}))}function T(e,t){t.score=e.score}var $=function(){function e(r){var i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},u=arguments.length>2?arguments[2]:void 0;if(n(this,e),this.options=t(t({},M),i),this.options.useExtendedSearch)throw new Error("Extended search is not available");this._keyStore=new E(this.options.keys),this.setCollection(r,u),this._lastQuery=null,this._lastSearcher=null}return u(e,[{key:"_getSearcher",value:function(e){if(this._lastQuery===e)return this._lastSearcher;var t=function(e,t){for(var r=0,n=L.length;r<n;r+=1){var i=L[r];if(i.condition(e,t))return new i(e,t)}return new I(e,t)}(e,this.options);return this._lastQuery=e,this._lastSearcher=t,t}},{key:"setCollection",value:function(e,t){if(this._docs=e,t&&!(t instanceof w))throw new Error("Incorrect 'index' type");this._myIndex=t||S(this.options.keys,this._docs,{getFn:this.options.getFn,fieldNormWeight:this.options.fieldNormWeight})}},{key:"add",value:function(e){p(e)&&(this._docs.push(e),this._myIndex.add(e))}},{key:"remove",value:function(){for(var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:function(){return!1},t=[],r=[],n=0,i=this._docs.length;n<i;n+=1)e(this._docs[n],n)&&(t.push(this._docs[n]),r.push(n));if(r.length){for(var u=r.length-1;u>=0;u-=1)this._docs.splice(r[u],1);this._myIndex.removeAll(r)}return t}},{key:"removeAt",value:function(e){this._docs.splice(e,1),this._myIndex.removeAt(e)}},{key:"getIndex",value:function(){return this._myIndex}},{key:"search",value:function(e){var t,r=(arguments.length>1&&void 0!==arguments[1]?arguments[1]:{}).limit,n=void 0===r?-1:r,i=this.options,u=i.includeMatches,o=i.includeScore,s=i.shouldSort,a=i.sortFn,c=i.ignoreFieldNorm;if(v(n)&&n>0&&d(e)){var h=new W(n);d(this._docs[0])?this._searchStringList(e,{heap:h,ignoreFieldNorm:c}):this._searchObjectList(e,{heap:h,ignoreFieldNorm:c}),t=h.extractSorted(a)}else(function(e,t){var r=t.ignoreFieldNorm,n=void 0===r?M.ignoreFieldNorm:r;e.forEach((function(e){P(e,{ignoreFieldNorm:n})}))})(t=d(e)?d(this._docs[0])?this._searchStringList(e):this._searchObjectList(e):this._searchLogical(e),{ignoreFieldNorm:c}),s&&t.sort(a),v(n)&&n>-1&&(t=t.slice(0,n));return function(e,t){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},n=r.includeMatches,i=void 0===n?M.includeMatches:n,u=r.includeScore,o=void 0===u?M.includeScore:u,s=[];return i&&s.push(z),o&&s.push(T),e.map((function(e){var r=e.idx,n={item:t[r],refIndex:r};return s.length&&s.forEach((function(t){t(e,n)})),n}))}(t,this._docs,{includeMatches:u,includeScore:o})}},{key:"_searchStringList",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=t.heap,n=t.ignoreFieldNorm,i=this._getSearcher(e),u=this._myIndex.records,o=r?null:[];return u.forEach((function(e){var t=e.v,u=e.i,s=e.n;if(p(t)){var a=i.searchIn(t),c=a.isMatch,h=a.score,l=a.indices;if(c){var f={item:t,idx:u,matches:[{score:h,value:t,norm:s,indices:l}]};r?(P(f,{ignoreFieldNorm:n}),r.shouldInsert(f.score)&&r.insert(f)):o.push(f)}}})),o}},{key:"_searchLogical",value:function(e){throw new Error("Logical search is not available")}},{key:"_searchObjectList",value:function(e){var t=this,r=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},n=r.heap,i=r.ignoreFieldNorm,u=this._getSearcher(e),o=this._myIndex,a=o.keys,c=o.records,h=n?null:[];return c.forEach((function(e){var r=e.$,o=e.i;if(p(r)){var c=[];if(a.forEach((function(e,n){c.push.apply(c,s(t._findMatches({key:e,value:r[n],searcher:u})))})),c.length){var l={idx:o,item:r,matches:c};n?(P(l,{ignoreFieldNorm:i}),n.shouldInsert(l.score)&&n.insert(l)):h.push(l)}}})),h}},{key:"_findMatches",value:function(e){var t=e.key,r=e.value,n=e.searcher;if(!p(r))return[];var i=[];if(h(r))r.forEach((function(e){var r=e.v,u=e.i,o=e.n;if(p(r)){var s=n.searchIn(r),a=s.isMatch,c=s.score,h=s.indices;a&&i.push({score:c,key:t,value:r,idx:u,norm:o,indices:h})}}));else{var u=r.v,o=r.n,s=n.searchIn(u),a=s.isMatch,c=s.score,l=s.indices;a&&i.push({score:c,key:t,value:u,norm:o,indices:l})}return i}}]),e}();return $.version="7.2.0",$.createIndex=S,$.parseIndex=function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=t.getFn,n=void 0===r?M.getFn:r,i=t.fieldNormWeight,u=void 0===i?M.fieldNormWeight:i,o=e.keys,s=e.records,a=new w({getFn:n,fieldNormWeight:u});return a.setKeys(o),a.setIndexRecords(s),a},$.config=M,$.use=function(){for(var e=arguments.length,t=new Array(e),r=0;r<e;r++)t[r]=arguments[r];t.forEach((function(e){return function(){L.push.apply(L,arguments)}(e)}))},$},"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):(e="undefined"!=typeof globalThis?globalThis:e||self).Fuse=t();
  // ===== END inlined fuse.basic.min.js =====
  return module.exports;
})();

const DEFAULT_TEMPLATE = `---
title: {{yaml_title}}
citekey: {{yaml_citekey}}
zotero_item_key: {{yaml_zotero_item_key}}
zotero_attachment_key: {{yaml_zotero_attachment_key}}
authors: {{yaml_authors}}
year: {{yaml_year}}
date: {{yaml_date}}
publication: {{yaml_publication}}
doi: {{yaml_doi}}
url: {{yaml_url}}
pdf: "[[{{pdf_path}}]]"
status: queued 
tags:
  - paper
---

# {{title}}

## Abstract

{{abstract}}

## My summary


## Key claims


## Methods / technical details


## Results


## Caveats / limitations


## Connections to my work


## PDF++ highlights and notes

`;

const DEFAULT_REFERENCE_TEMPLATE = `---
title: {{yaml_title}}
citekey: {{yaml_citekey}}
zotero_item_key: {{yaml_zotero_item_key}}
zotero_attachment_key: {{yaml_zotero_attachment_key}}
authors: {{yaml_authors}}
year: {{yaml_year}}
doi: {{yaml_doi}}
arxiv_id: {{yaml_arxiv_id}}
url: {{yaml_url}}
venue: {{yaml_venue}}
pdf: "[[{{pdf_path}}]]"
topics: []
source_type: reference
status: queued
---

# {{title}}

## Abstract

{{abstract}}

## Datasets / simulations

*To be populated by ingest.*

## Methods or techniques introduced

*To be populated by ingest.*

## Cited by my work

*(none yet)*

## PDF++ highlights and notes

*(user-only section)*
`;

const DEFAULT_SETTINGS = {
  zoteroApiUrl: "http://127.0.0.1:23119/api/users/0",
  literatureNotesFolder: "Literature Notes",
  referenceNotesFolder: "ReferenceNotes",
  assetsFolder: "Assets",
  openSideBySide: true,
  resultLimit: 50,
  searchPoolSize: 300,
  noteTemplate: DEFAULT_TEMPLATE,
  referenceNoteTemplate: DEFAULT_REFERENCE_TEMPLATE,
};

function normalizeFolderPath(path) {
  return String(path || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function joinVaultPath(...parts) {
  return parts
    .map((p) => String(p || "").replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function safeFilename(s) {
  return String(s || "untitled")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\/\\:*?"<>|#^\[\]]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function yamlString(s) {
  return JSON.stringify(String(s || ""));
}

function yearFromDate(date) {
  const match = String(date || "").match(/\d{4}/);
  return match ? match[0] : "";
}

function creatorsToString(creators) {
  if (!Array.isArray(creators)) return "";

  return creators
    .map((creator) => {
      if (creator.name) return creator.name;
      return [creator.firstName, creator.lastName].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(", ");
}

function firstAuthorLastName(creators) {
  if (!Array.isArray(creators) || creators.length === 0) return "unknown";

  const first = creators[0];
  if (first.lastName) return first.lastName;
  if (first.name) return first.name.split(/\s+/).slice(-1)[0];

  return "unknown";
}

function shortTitle(title) {
  return String(title || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 3)
    .join("");
}

function generatedCitekey(data) {
  const author = safeFilename(firstAuthorLastName(data.creators)).toLowerCase();
  const year = yearFromDate(data.date) || "nd";
  const stitle = shortTitle(data.title);
  return safeFilename(`${author}${year}${stitle}`);
}

function requestBuffer(url, options = {}, redirectsLeft = 5) {
  return new Promise(async (resolve, reject) => {
    try {
      if (url.startsWith("file:")) {
        const filePath = fileURLToPath(url);
        const buffer = await fs.readFile(filePath);
        resolve(buffer);
        return;
      }

      if (!url.startsWith("http:") && !url.startsWith("https:")) {
        reject(new Error(`Unsupported URL protocol: ${url}`));
        return;
      }

      const lib = url.startsWith("https:") ? https : http;

      const req = lib.request(
        url,
        {
          method: "GET",
          headers: {
            "Zotero-API-Version": "3",
            Accept: options.accept || "*/*",
          },
        },
        (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirectsLeft > 0
          ) {
            res.resume();
            const redirectedUrl = new URL(res.headers.location, url).toString();
            resolve(requestBuffer(redirectedUrl, options, redirectsLeft - 1));
            return;
          }

          const chunks = [];

          res.on("data", (chunk) => chunks.push(chunk));

          res.on("end", () => {
            const buffer = Buffer.concat(chunks);

            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(
                new Error(
                  `HTTP ${res.statusCode} from Zotero: ${buffer.toString("utf8")}`
                )
              );
              return;
            }

            resolve(buffer);
          });
        }
      );

      req.on("error", reject);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

async function getJson(url) {
  console.log("Zotero JSON request:", url);
  const buffer = await requestBuffer(url, { accept: "application/json" });
  return JSON.parse(buffer.toString("utf8"));
}

async function getBinary(url) {
  console.log("Zotero PDF request:", url);
  return await requestBuffer(url, { accept: "application/pdf" });
}

async function ensureFolderRecursive(app, folderPath) {
  const normalized = normalizeFolderPath(folderPath);
  if (!normalized) return;

  const parts = normalized.split("/").filter(Boolean);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!app.vault.getAbstractFileByPath(current)) {
      await app.vault.createFolder(current);
    }
  }
}

function renderTemplate(template, vars) {
  return String(template || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : "";
  });
}

class TextPromptModal extends Modal {
  constructor(app, title, placeholder, initialValue) {
    super(app);
    this.title = title;
    this.placeholder = placeholder;
    this.initialValue = initialValue || "";
    this.result = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.title });

    const input = contentEl.createEl("input", {
      type: "text",
      placeholder: this.placeholder,
      value: this.initialValue,
    });

    input.style.width = "100%";
    input.style.marginBottom = "1rem";

    const buttonRow = contentEl.createDiv();
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5rem";
    buttonRow.style.justifyContent = "flex-end";

    const cancelButton = buttonRow.createEl("button", { text: "Cancel" });
    const submitButton = buttonRow.createEl("button", { text: "Search" });
    submitButton.addClass("mod-cta");

    const submit = () => {
      this.result = input.value.trim();
      this.close();
    };

    submitButton.addEventListener("click", submit);
    cancelButton.addEventListener("click", () => {
      this.result = null;
      this.close();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submit();
      if (event.key === "Escape") {
        this.result = null;
        this.close();
      }
    });

    window.setTimeout(() => input.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class GenericSuggestModal extends FuzzySuggestModal {
  constructor(app, items, getText, placeholder) {
    super(app);
    this.items = items;
    this.getText = getText;
    this.result = null;
    this.resolved = false;
    this.setPlaceholder(placeholder || "Choose an item");
  }

  getItems() {
    return this.items;
  }

  getItemText(item) {
    return this.getText(item);
  }

  resolveOnce(value) {
    if (this.resolved) return;
    this.resolved = true;
    this.result = value;
    if (this.resolve) this.resolve(value);
  }

  onChooseItem(item) {
    this.resolveOnce(item);
  }

  onClose() {
    super.onClose();

    // In some Obsidian/Electron builds, FuzzySuggestModal can fire onClose
    // before onChooseItem. Defer cancellation by one tick so a real selection
    // has a chance to resolve first.
    window.setTimeout(() => {
      if (!this.resolved) this.resolveOnce(null);
    }, 0);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class MultiSelectModal extends Modal {
  constructor(app, items, getText, placeholder) {
    super(app);
    this.items = items;
    this.getText = getText;
    this.placeholder = placeholder || "Choose items";
    this.selected = new Set();
    this.result = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.placeholder });

    const searchInput = contentEl.createEl("input", {
      type: "text",
      placeholder: "Filter items...",
    });
    searchInput.style.width = "100%";
    searchInput.style.marginBottom = "0.75rem";

    const listContainer = contentEl.createDiv();
    listContainer.style.maxHeight = "400px";
    listContainer.style.overflowY = "auto";
    listContainer.style.border = "1px solid var(--background-modifier-border)";
    listContainer.style.borderRadius = "4px";
    listContainer.style.padding = "0.5rem";
    listContainer.style.marginBottom = "0.75rem";

    const buttonRow = contentEl.createDiv();
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5rem";
    buttonRow.style.justifyContent = "space-between";
    buttonRow.style.alignItems = "center";

    const selectionInfo = buttonRow.createEl("span");
    selectionInfo.style.color = "var(--text-muted)";
    selectionInfo.style.fontSize = "0.85em";

    const buttonGroup = buttonRow.createDiv();
    buttonGroup.style.display = "flex";
    buttonGroup.style.gap = "0.5rem";

    const cancelButton = buttonGroup.createEl("button", { text: "Cancel" });
    const importButton = buttonGroup.createEl("button", { text: "Import" });
    importButton.addClass("mod-cta");

    const updateButtonLabel = () => {
      const n = this.selected.size;
      importButton.textContent = `Import ${n} selected`;
      importButton.disabled = n === 0;
      selectionInfo.textContent = `${n} of ${this.items.length} selected`;
    };

    const renderList = (filter) => {
      listContainer.empty();
      const lowerFilter = String(filter || "").toLowerCase();
      const matchingItems = this.items.filter((item) => {
        if (!lowerFilter) return true;
        return this.getText(item).toLowerCase().includes(lowerFilter);
      });

      if (!matchingItems.length) {
        const empty = listContainer.createEl("div", {
          text: "No items match the filter.",
        });
        empty.style.color = "var(--text-muted)";
        empty.style.padding = "0.5rem";
        return;
      }

      matchingItems.forEach((item) => {
        const row = listContainer.createDiv();
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "0.5rem";
        row.style.padding = "0.25rem";
        row.style.cursor = "pointer";
        row.style.borderRadius = "3px";

        const checkbox = row.createEl("input", { type: "checkbox" });
        checkbox.checked = this.selected.has(item);

        const label = row.createEl("span", { text: this.getText(item) });
        label.style.flex = "1";

        const toggle = () => {
          if (this.selected.has(item)) {
            this.selected.delete(item);
            checkbox.checked = false;
          } else {
            this.selected.add(item);
            checkbox.checked = true;
          }
          updateButtonLabel();
        };

        checkbox.addEventListener("click", (event) => {
          event.stopPropagation();
          toggle();
        });
        row.addEventListener("click", toggle);

        row.addEventListener("mouseenter", () => {
          row.style.backgroundColor = "var(--background-modifier-hover)";
        });
        row.addEventListener("mouseleave", () => {
          row.style.backgroundColor = "";
        });
      });
    };

    updateButtonLabel();

    cancelButton.addEventListener("click", () => {
      this.result = null;
      this.close();
    });

    importButton.addEventListener("click", () => {
      if (this.selected.size === 0) return;
      this.result = Array.from(this.selected);
      this.close();
    });

    searchInput.addEventListener("input", () => {
      renderList(searchInput.value);
    });
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.result = null;
        this.close();
      }
    });

    renderList("");
    window.setTimeout(() => searchInput.focus(), 50);
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class BatchStagingModal extends Modal {
  constructor(app, staged, getText) {
    super(app);
    this.staged = staged;
    this.getText = getText;
    this.result = null;
    this.mode = "literature";
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Batch import staging" });

    // Mode toggle: Literature | Reference
    const modeRow = contentEl.createDiv();
    modeRow.style.display = "flex";
    modeRow.style.gap = "0.5rem";
    modeRow.style.alignItems = "center";
    modeRow.style.marginBottom = "0.75rem";
    modeRow.createEl("span", { text: "Default for new additions:" }).style.color = "var(--text-muted)";

    const litBtn = modeRow.createEl("button", { text: "Literature note" });
    const refBtn = modeRow.createEl("button", { text: "Reference note" });

    const updateModeButtons = () => {
      if (this.mode === "literature") {
        litBtn.addClass("mod-cta");
        refBtn.removeClass("mod-cta");
      } else {
        refBtn.addClass("mod-cta");
        litBtn.removeClass("mod-cta");
      }
    };

    litBtn.addEventListener("click", () => { this.mode = "literature"; updateModeButtons(); });
    refBtn.addEventListener("click", () => { this.mode = "reference"; updateModeButtons(); });
    updateModeButtons();

    const counterEl = contentEl.createEl("p");
    counterEl.style.color = "var(--text-muted)";
    counterEl.style.marginTop = "0";

    const listContainer = contentEl.createDiv();
    listContainer.style.maxHeight = "400px";
    listContainer.style.overflowY = "auto";
    listContainer.style.border = "1px solid var(--background-modifier-border)";
    listContainer.style.borderRadius = "4px";
    listContainer.style.padding = "0.5rem";
    listContainer.style.marginBottom = "0.75rem";
    listContainer.style.minHeight = "100px";

    const buttonRow = contentEl.createDiv();
    buttonRow.style.display = "flex";
    buttonRow.style.gap = "0.5rem";
    buttonRow.style.justifyContent = "flex-end";
    buttonRow.style.flexWrap = "wrap";

    const cancelButton = buttonRow.createEl("button", { text: "Cancel" });
    const addButton = buttonRow.createEl("button", { text: "Add from Zotero search…" });
    const importButton = buttonRow.createEl("button", { text: "Import" });
    importButton.addClass("mod-cta");

    const updateCounter = () => {
      const n = this.staged.length;
      if (n === 0) {
        counterEl.textContent = "No papers staged yet. Click \"Add from Zotero search…\" to begin.";
        return;
      }
      const litCount = this.staged.filter((i) => (i._importMode || "literature") === "literature").length;
      const refCount = n - litCount;
      let modeDesc;
      if (refCount === 0) modeDesc = "all literature";
      else if (litCount === 0) modeDesc = "all reference";
      else modeDesc = `${litCount} literature, ${refCount} reference`;
      counterEl.textContent = `${n} paper${n === 1 ? "" : "s"} staged (${modeDesc}).`;
    };

    const refresh = () => {
      const n = this.staged.length;
      updateCounter();
      importButton.textContent = `Import ${n}`;
      importButton.disabled = n === 0;

      listContainer.empty();
      if (!n) {
        const empty = listContainer.createEl("div", { text: "Empty." });
        empty.style.color = "var(--text-muted)";
        empty.style.padding = "0.5rem";
        return;
      }

      this.staged.forEach((item, index) => {
        const row = listContainer.createDiv();
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "0.5rem";
        row.style.padding = "0.25rem";
        row.style.borderRadius = "3px";

        const label = row.createEl("span", { text: this.getText(item) });
        label.style.flex = "1";

        const modeSelect = row.createEl("select");
        modeSelect.style.width = "9rem";
        modeSelect.createEl("option", { text: "Literature", value: "literature" });
        modeSelect.createEl("option", { text: "Reference", value: "reference" });
        modeSelect.value = item._importMode || "literature";
        modeSelect.addEventListener("change", () => {
          item._importMode = modeSelect.value;
          updateCounter();
        });

        const removeButton = row.createEl("button", { text: "Remove" });
        removeButton.addEventListener("click", () => {
          this.staged.splice(index, 1);
          refresh();
        });

        row.addEventListener("mouseenter", () => {
          row.style.backgroundColor = "var(--background-modifier-hover)";
        });
        row.addEventListener("mouseleave", () => {
          row.style.backgroundColor = "";
        });
      });
    };

    refresh();

    cancelButton.addEventListener("click", () => {
      this.result = { kind: "cancel" };
      this.close();
    });
    addButton.addEventListener("click", () => {
      this.result = { kind: "addMore", mode: this.mode };
      this.close();
    });
    importButton.addEventListener("click", () => {
      if (this.staged.length === 0) return;
      this.result = { kind: "import" };
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }

  openAndGetValue() {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }
}

class ZoteroLiteratureImporterPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: "import-zotero-paper",
      name: "Import Zotero paper into current vault",
      callback: async () => this.importZoteroPaper(),
    });

    this.addCommand({
      id: "batch-import-zotero-papers",
      name: "Batch import Zotero papers into current vault",
      callback: async () => this.batchImportZoteroPapers(),
    });

    this.addCommand({
      id: "import-zotero-reference",
      name: "Import Zotero paper as reference",
      callback: async () => this.importZoteroPaperAsReference(),
    });

    this.addRibbonIcon("book-open", "Import Zotero paper", async () => {
      await this.importZoteroPaper();
    });

    this.addRibbonIcon("database", "Import Zotero paper as reference", async () => {
      await this.importZoteroPaperAsReference();
    });

    this.addSettingTab(new ZoteroLiteratureImporterSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async importZoteroPaper() {
    try {
      const query = await new TextPromptModal(
        this.app,
        "Search Zotero",
        "Title, author, year, DOI, or keyword"
      ).openAndGetValue();

      if (!query) {
        new Notice("No Zotero query entered.");
        return;
      }

      new Notice(`Searching Zotero for: ${query}`);

      const item = await this.chooseZoteroItem(query);
      if (!item) {
        new Notice("Import cancelled.");
        return;
      }

      await this.importChosenItem(item);
    } catch (err) {
      console.error("Zotero Literature Importer error:", err);
      new Notice(`Zotero import failed: ${err.message || err}`);
    }
  }

  async batchImportZoteroPapers() {
    try {
      const staged = [];

      while (true) {
        const action = await new BatchStagingModal(
          this.app,
          staged,
          (item) => this.itemDisplayText(item)
        ).openAndGetValue();

        if (!action || action.kind === "cancel") {
          new Notice("Batch import cancelled.");
          return;
        }

        if (action.kind === "addMore") {
          const query = await new TextPromptModal(
            this.app,
            "Search Zotero",
            "Title, author, year, DOI, or keyword"
          ).openAndGetValue();

          if (!query) continue;

          new Notice(`Searching Zotero for: ${query}`);

          let selected;
          try {
            selected = await this.chooseMultipleZoteroItems(query);
          } catch (err) {
            console.error("Zotero search failed:", err);
            new Notice(`Search failed: ${err.message || err}`);
            continue;
          }

          if (selected && selected.length) {
            let added = 0;
            let duplicates = 0;
            const defaultMode = action.mode || "literature";
            for (const item of selected) {
              if (staged.find((s) => s.key === item.key)) {
                duplicates++;
              } else {
                item._importMode = defaultMode;
                staged.push(item);
                added++;
              }
            }
            if (duplicates > 0) {
              new Notice(`Added ${added}, skipped ${duplicates} already staged.`);
            }
          }
          continue;
        }

        if (action.kind === "import") {
          break;
        }
      }

      if (!staged.length) {
        new Notice("Nothing to import.");
        return;
      }

      const litCount = staged.filter((i) => (i._importMode || "literature") === "literature").length;
      const refCount = staged.length - litCount;
      const modeDesc = refCount === 0 ? "literature" : litCount === 0 ? "reference" : "mixed modes";
      new Notice(`Starting batch import of ${staged.length} paper${staged.length === 1 ? "" : "s"} (${modeDesc})...`);

      let succeeded = 0;
      const failed = [];

      for (let i = 0; i < staged.length; i++) {
        const item = staged[i];
        const data = item.data || {};
        const citekey = data.citationKey || generatedCitekey(data);
        const itemMode = item._importMode || "literature";
        new Notice(`Importing ${i + 1}/${staged.length}: ${citekey}`);

        try {
          if (itemMode === "reference") {
            await this.importChosenItemAsReference(item, { quiet: true });
          } else {
            await this.importChosenItem(item, { openAfterImport: false, quiet: true });
          }
          succeeded++;
        } catch (err) {
          console.error(`Batch import failed for ${citekey}:`, err);
          failed.push({ citekey, error: err.message || String(err) });
        }
      }

      if (failed.length === 0) {
        new Notice(`Batch import complete: ${succeeded} imported.`, 8000);
      } else {
        new Notice(
          `Batch import finished: ${succeeded} imported, ${failed.length} failed. See console for details.`,
          10000
        );
        console.error("Batch import failures:", failed);
      }
    } catch (err) {
      console.error("Zotero Literature Importer batch error:", err);
      new Notice(`Batch import failed: ${err.message || err}`);
    }
  }

  _filterZoteroItems(items) {
    const NON_PAPER_TYPES = new Set(["attachment", "note", "annotation"]);
    return (items || []).filter((item) => {
      const data = item.data || {};
      if (NON_PAPER_TYPES.has(data.itemType)) return false;
      if (!data.title || !String(data.title).trim()) return false;
      return true;
    });
  }

  async fetchZoteroItems(query) {
    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const limit = Number(this.settings.resultLimit) || 50;
    const poolSize = Number(this.settings.searchPoolSize) || 300;

    console.log("[ZoteroImporter] query:", query);

    // Primary fetch with user query
    const searchUrl =
      `${api}/items?format=json` +
      `&include=data` +
      `&q=${encodeURIComponent(query)}` +
      `&qmode=everything` +
      `&sort=dateModified` +
      `&direction=desc` +
      `&limit=${encodeURIComponent(limit)}`;

    const primaryItems = this._filterZoteroItems(await getJson(searchUrl));
    console.log("[ZoteroImporter] primary results:", primaryItems.length);

    // Broad fetch: recent items with no query filter, with pagination
    const broadAll = [];
    const pageSize = 100;
    let start = 0;
    let pagesFetched = 0;
    const maxPages = 20;

    while (broadAll.length < poolSize && pagesFetched < maxPages) {
      const pageUrl =
        `${api}/items?format=json` +
        `&include=data` +
        `&sort=dateModified` +
        `&direction=desc` +
        `&limit=${pageSize}` +
        `&start=${start}`;
      const pageRaw = await getJson(pageUrl);
      pagesFetched++;
      if (!Array.isArray(pageRaw) || pageRaw.length === 0) break;
      broadAll.push(...pageRaw);
      if (pageRaw.length < pageSize) break;
      start += pageSize;
    }

    if (pagesFetched >= maxPages) {
      console.warn("[ZoteroImporter] Broad fetch hit max pages limit (20). Zotero API may be misconfigured.");
    }

    const broadItems = this._filterZoteroItems(broadAll).slice(0, poolSize);

    // Union with dedup by Zotero item key
    const seenKeys = new Set(primaryItems.map((i) => i.key));
    const candidates = [...primaryItems];
    for (const item of broadItems) {
      if (!seenKeys.has(item.key)) {
        seenKeys.add(item.key);
        candidates.push(item);
      }
    }

    console.log("[ZoteroImporter] broad pool:", broadItems.length, "candidates after union:", candidates.length, "pages fetched:", pagesFetched);

    if (!candidates.length) throw new Error("No Zotero items found.");

    // Client-side fuzzy ranking via Fuse.js
    const fuseItems = candidates.map((item) => ({
      _item: item,
      title: item.data?.title || "",
      creators: creatorsToString(item.data?.creators || []),
      date: item.data?.date || "",
    }));

    const fuse = new Fuse(fuseItems, {
      keys: [
        { name: "title", weight: 1.0 },
        { name: "creators", weight: 0.4 },
        { name: "date", weight: 0.1 },
      ],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true,
    });

    const results = fuse.search(query);
    console.log("[ZoteroImporter] Fuse returned:", results.length, "top score:", results[0]?.score);
    const topN = Math.max(limit, 20);

    if (!results.length) throw new Error("No Zotero items found.");

    return results.slice(0, topN).map((r) => r.item._item);
  }

  itemDisplayText(item) {
    const data = item.data || {};
    const title = data.title && String(data.title).trim();
    if (!title) return "[no title — item cannot be imported]";
    const year = yearFromDate(data.date);
    const authors = creatorsToString(data.creators);
    return `${title}${year ? ` (${year})` : ""}${authors ? ` — ${authors}` : ""}`;
  }

  async chooseZoteroItem(query) {
    const items = await this.fetchZoteroItems(query);

    return await new GenericSuggestModal(
      this.app,
      items,
      (item) => this.itemDisplayText(item),
      "Choose Zotero item"
    ).openAndGetValue();
  }

  async chooseMultipleZoteroItems(query) {
    const items = await this.fetchZoteroItems(query);

    return await new MultiSelectModal(
      this.app,
      items,
      (item) => this.itemDisplayText(item),
      "Choose Zotero items to import"
    ).openAndGetValue();
  }

  async importChosenItem(item, options = {}) {
    const { openAfterImport = true, quiet = false } = options;

    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const data = item.data || {};
    const citekey = data.citationKey || generatedCitekey(data);

    const assetsFolder = normalizeFolderPath(this.settings.assetsFolder);
    const literatureNotesFolder = normalizeFolderPath(this.settings.literatureNotesFolder);

    const pdfPath = joinVaultPath(assetsFolder, `${citekey}.pdf`);
    const notePath = joinVaultPath(literatureNotesFolder, `${citekey}.md`);

    await ensureFolderRecursive(this.app, assetsFolder);
    await ensureFolderRecursive(this.app, literatureNotesFolder);

    const attachment = await this.choosePdfAttachment(item);
    if (!attachment) return;

    const pdfFileExists = Boolean(this.app.vault.getAbstractFileByPath(pdfPath));
    if (!pdfFileExists) {
      if (!quiet) new Notice("Copying PDF into vault assets folder...");
      const binary = await getBinary(`${api}/items/${attachment.key}/file`);
      await this.app.vault.adapter.writeBinary(pdfPath, binary);
    }

    let noteFile = this.app.vault.getAbstractFileByPath(notePath);
    if (!noteFile) {
      const note = this.createLiteratureNote(item, attachment, citekey, pdfPath);
      noteFile = await this.app.vault.create(notePath, note);
    } else if (!quiet) {
      new Notice(`Literature note already exists: ${notePath}`);
    }

    if (openAfterImport) {
      if (this.settings.openSideBySide) {
        await this.openNoteAndPdf(noteFile, pdfPath);
      } else {
        await this.app.workspace.getLeaf(false).openFile(noteFile);
      }
    }

    if (!quiet) new Notice(`Imported ${citekey}`);
  }

  async importZoteroPaperAsReference() {
    try {
      const query = await new TextPromptModal(
        this.app,
        "Search Zotero (import as reference)",
        "Title, author, year, DOI, or keyword"
      ).openAndGetValue();

      if (!query) {
        new Notice("No Zotero query entered.");
        return;
      }

      new Notice(`Searching Zotero for: ${query}`);

      const item = await this.chooseZoteroItem(query);
      if (!item) {
        new Notice("Import cancelled.");
        return;
      }

      await this.importChosenItemAsReference(item);
    } catch (err) {
      console.error("Zotero Literature Importer error:", err);
      new Notice(`Zotero reference import failed: ${err.message || err}`);
    }
  }

  async importChosenItemAsReference(item, options = {}) {
    const { quiet = false } = options;

    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const data = item.data || {};
    const citekey = data.citationKey || generatedCitekey(data);

    const assetsFolder = normalizeFolderPath(this.settings.assetsFolder);
    const referenceNotesFolder = normalizeFolderPath(this.settings.referenceNotesFolder);

    const pdfPath = joinVaultPath(assetsFolder, `${citekey}.pdf`);
    const notePath = joinVaultPath(referenceNotesFolder, `${citekey}.md`);

    await ensureFolderRecursive(this.app, assetsFolder);
    await ensureFolderRecursive(this.app, referenceNotesFolder);

    const attachment = await this.choosePdfAttachment(item);
    if (!attachment) return;

    const pdfFileExists = Boolean(this.app.vault.getAbstractFileByPath(pdfPath));
    if (!pdfFileExists) {
      if (!quiet) new Notice("Copying PDF into vault assets folder...");
      const binary = await getBinary(`${api}/items/${attachment.key}/file`);
      await this.app.vault.adapter.writeBinary(pdfPath, binary);
    }

    let noteFile = this.app.vault.getAbstractFileByPath(notePath);
    if (!noteFile) {
      const note = this.createReferenceNote(item, attachment, citekey, pdfPath);
      noteFile = await this.app.vault.create(notePath, note);
    } else if (!quiet) {
      new Notice(`Reference note already exists: ${notePath}`);
    }

    // Do NOT auto-open reference notes — they are not meant to be read
    if (!quiet) new Notice(`Imported ${citekey} as reference`);
  }

  createReferenceNote(item, attachment, citekey, pdfPath) {
    const data = item.data || {};
    const authors = creatorsToString(data.creators);
    const year = yearFromDate(data.date);
    const venue = data.publicationTitle || data.proceedingsTitle || data.bookTitle || "";

    // arXiv ID: may be stored in archiveID as "arXiv:2301.xxxxx"
    let arxivId = "";
    if (data.archiveID) {
      arxivId = String(data.archiveID).replace(/^arXiv:\s*/i, "").trim();
    }

    const vars = {
      title: data.title || citekey,
      citekey,
      zotero_item_key: item.key,
      zotero_attachment_key: attachment.key,
      authors,
      year,
      doi: data.DOI || "",
      arxiv_id: arxivId,
      url: data.url || "",
      venue,
      pdf_path: pdfPath,
      abstract: data.abstractNote || "*To be extracted by ingest.*",

      yaml_title: yamlString(data.title || citekey),
      yaml_citekey: yamlString(citekey),
      yaml_zotero_item_key: yamlString(item.key),
      yaml_zotero_attachment_key: yamlString(attachment.key),
      yaml_authors: yamlString(authors),
      yaml_year: yamlString(year),
      yaml_doi: yamlString(data.DOI || ""),
      yaml_arxiv_id: yamlString(arxivId),
      yaml_url: yamlString(data.url || ""),
      yaml_venue: yamlString(venue),
    };

    return renderTemplate(this.settings.referenceNoteTemplate, vars);
  }

  async choosePdfAttachment(item) {
    const api = this.settings.zoteroApiUrl.replace(/\/+$/g, "");
    const childrenUrl = `${api}/items/${item.key}/children?format=json&include=data&limit=100`;
    const children = await getJson(childrenUrl);

    const pdfAttachments = (children || []).filter((child) => {
      const data = child.data || {};
      return (
        data.itemType === "attachment" &&
        (
          data.contentType === "application/pdf" ||
          String(data.filename || "").toLowerCase().endsWith(".pdf") ||
          String(data.title || "").toLowerCase().endsWith(".pdf")
        )
      );
    });

    if (!pdfAttachments.length) {
      throw new Error(`No PDF attachment found for Zotero item: ${item.data?.title || item.key}`);
    }

    if (pdfAttachments.length === 1) return pdfAttachments[0];

    return await new GenericSuggestModal(
      this.app,
      pdfAttachments,
      (attachment) => {
        const data = attachment.data || {};
        return data.filename || data.title || attachment.key;
      },
      "Choose PDF attachment"
    ).openAndGetValue();
  }

  createLiteratureNote(item, attachment, citekey, pdfPath) {
    const data = item.data || {};
    const authors = creatorsToString(data.creators);
    const year = yearFromDate(data.date);
    const publication = data.publicationTitle || data.proceedingsTitle || data.bookTitle || "";

    const vars = {
      title: data.title || citekey,
      citekey,
      zotero_item_key: item.key,
      zotero_attachment_key: attachment.key,
      authors,
      year,
      date: data.date || "",
      publication,
      doi: data.DOI || "",
      url: data.url || "",
      pdf_path: pdfPath,
      abstract: data.abstractNote || "",

      yaml_title: yamlString(data.title || citekey),
      yaml_citekey: yamlString(citekey),
      yaml_zotero_item_key: yamlString(item.key),
      yaml_zotero_attachment_key: yamlString(attachment.key),
      yaml_authors: yamlString(authors),
      yaml_year: yamlString(year),
      yaml_date: yamlString(data.date || ""),
      yaml_publication: yamlString(publication),
      yaml_doi: yamlString(data.DOI || ""),
      yaml_url: yamlString(data.url || ""),
    };

    return renderTemplate(this.settings.noteTemplate, vars);
  }

  async openNoteAndPdf(noteFile, pdfPath) {
    const pdfFile = this.app.vault.getAbstractFileByPath(pdfPath);

    await this.app.workspace.getLeaf(false).openFile(noteFile);

    if (pdfFile) {
      await this.app.workspace.getLeaf("split", "vertical").openFile(pdfFile);
    }
  }
}

class ZoteroLiteratureImporterSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Zotero Literature Importer" });

    new Setting(containerEl)
      .setName("Zotero local API URL")
      .setDesc("Default: http://127.0.0.1:23119/api/users/0. Zotero must be open and local API access must be enabled.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.zoteroApiUrl)
          .setValue(this.plugin.settings.zoteroApiUrl)
          .onChange(async (value) => {
            this.plugin.settings.zoteroApiUrl = value.trim() || DEFAULT_SETTINGS.zoteroApiUrl;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Literature notes folder")
      .setDesc("Folder where generated literature notes are created.")
      .addText((text) =>
        text
          .setPlaceholder("Literature Notes")
          .setValue(this.plugin.settings.literatureNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.literatureNotesFolder = value.trim() || DEFAULT_SETTINGS.literatureNotesFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Reference notes folder")
      .setDesc("Folder where generated reference notes are created (papers cited for datasets or infrastructure only).")
      .addText((text) =>
        text
          .setPlaceholder("ReferenceNotes")
          .setValue(this.plugin.settings.referenceNotesFolder)
          .onChange(async (value) => {
            this.plugin.settings.referenceNotesFolder = value.trim() || DEFAULT_SETTINGS.referenceNotesFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Assets folder")
      .setDesc("Folder where copied PDFs are saved.")
      .addText((text) =>
        text
          .setPlaceholder("Assets")
          .setValue(this.plugin.settings.assetsFolder)
          .onChange(async (value) => {
            this.plugin.settings.assetsFolder = value.trim() || DEFAULT_SETTINGS.assetsFolder;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Search result limit")
      .setDesc("Maximum number of Zotero items returned in the picker.")
      .addText((text) =>
        text
          .setPlaceholder("50")
          .setValue(String(this.plugin.settings.resultLimit))
          .onChange(async (value) => {
            const parsed = Number(value);
            this.plugin.settings.resultLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Fuzzy search pool size")
      .setDesc("How many recent Zotero items to consider when fuzzy-matching. Increase if typo-tolerant search misses older items; decrease if search feels slow.")
      .addText((text) =>
        text
          .setPlaceholder("300")
          .setValue(String(this.plugin.settings.searchPoolSize))
          .onChange(async (value) => {
            const parsed = Number(value);
            this.plugin.settings.searchPoolSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Open note and PDF side by side")
      .setDesc("After import, open the literature note and copied PDF in a vertical split.")
      .addToggle((toggle) =>
        toggle
          .setValue(Boolean(this.plugin.settings.openSideBySide))
          .onChange(async (value) => {
            this.plugin.settings.openSideBySide = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Literature note template" });
    containerEl.createEl("p", {
      text: "Available placeholders: {{title}}, {{citekey}}, {{authors}}, {{year}}, {{date}}, {{publication}}, {{doi}}, {{url}}, {{pdf_path}}, {{abstract}}, {{zotero_item_key}}, {{zotero_attachment_key}}, and YAML-safe versions prefixed with yaml_.",
    });

    const textArea = containerEl.createEl("textarea");
    textArea.value = this.plugin.settings.noteTemplate || DEFAULT_TEMPLATE;
    textArea.style.width = "100%";
    textArea.style.minHeight = "420px";
    textArea.style.fontFamily = "var(--font-monospace)";

    textArea.addEventListener("change", async () => {
      this.plugin.settings.noteTemplate = textArea.value;
      await this.plugin.saveSettings();
      new Notice("Zotero importer template saved.");
    });

    new Setting(containerEl)
      .setName("Reset template")
      .setDesc("Restore the built-in default literature-note template.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.noteTemplate = DEFAULT_TEMPLATE;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Template reset.");
        })
      );

    containerEl.createEl("h3", { text: "Reference note template" });
    containerEl.createEl("p", {
      text: "Available placeholders: {{title}}, {{citekey}}, {{authors}}, {{year}}, {{doi}}, {{arxiv_id}}, {{url}}, {{venue}}, {{pdf_path}}, {{abstract}}, {{zotero_item_key}}, {{zotero_attachment_key}}, and YAML-safe versions prefixed with yaml_ (yaml_title, yaml_citekey, yaml_authors, yaml_year, yaml_doi, yaml_arxiv_id, yaml_url, yaml_venue, yaml_zotero_item_key, yaml_zotero_attachment_key).",
    });

    const refTextArea = containerEl.createEl("textarea");
    refTextArea.value = this.plugin.settings.referenceNoteTemplate || DEFAULT_REFERENCE_TEMPLATE;
    refTextArea.style.width = "100%";
    refTextArea.style.minHeight = "420px";
    refTextArea.style.fontFamily = "var(--font-monospace)";

    refTextArea.addEventListener("change", async () => {
      this.plugin.settings.referenceNoteTemplate = refTextArea.value;
      await this.plugin.saveSettings();
      new Notice("Zotero importer reference template saved.");
    });

    new Setting(containerEl)
      .setName("Reset reference template")
      .setDesc("Restore the built-in default reference-note template.")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings.referenceNoteTemplate = DEFAULT_REFERENCE_TEMPLATE;
          await this.plugin.saveSettings();
          this.display();
          new Notice("Reference template reset.");
        })
      );
  }
}

module.exports = ZoteroLiteratureImporterPlugin;
module.exports.default = ZoteroLiteratureImporterPlugin;
