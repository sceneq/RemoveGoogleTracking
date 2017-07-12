// ==UserScript==
// @namespace      jp.sceneq.rgtuwaaa

// @name           remove google tracking UWAA

// @description    remove google tracking
// @description:ja Google追跡UWAAを取り除きなさい

// @homepageURL    https://github.com/sceneq/RemoveGoogleTracking

// @version        0.6
// @include        https://www.google.*/*
// @grant          none
// @run-at         document-start
// @updateURL      https://raw.githubusercontent.com/sceneq/RemoveGoogleTracking/master/RemoveGoogleTracking.user.js
// @downloadURL    https://raw.githubusercontent.com/sceneq/RemoveGoogleTracking/master/RemoveGoogleTracking.user.js

// @author         sceneq
// @license        MIT
// ==/UserScript==

'use strict';

// jump
if(location.pathname === '/' && location.search !== ''){
	// localStorage.clear();
	location.search = '';
}

const yesman = function(){return true};
const tired = function(){};

// matching tracking paramaters
const badParametersNames = [
	'biw'
	,'bih'
	,'ei'
	,'sa'
	,'ved'
	,'source'
	,'prmd'
	,'bvm'
	,'bav'
	,'psi'
	,'stick'
	,'dq'
	,'ech'

	// image search
	,'scroll'
	,'vet'
	,'yv'
	,'ijn'
	,'iact'
	,'forward'
	,'ndsp'
	,'csi'
	,'tbnid'
	,'docid'
	//,'imgdii'  // related images

	// search form
	,'pbx'
	,'dpr'
	,'pf'
	,'gs_rn'
	,'gs_mss'
	,'pq'
	,'cp'
	,'oq'
	,'sclient'
	,'gs_l'
	,'aqs'
	//,'gs_ri'   // suggestions
	//,'gs_id'   // suggestions
	//,'xhr'     // suggestions at image search
	//,'tch'     // js flag?

	// mobile
	,'gs_gbg'
	,'gs_rn'
	,'cp'
];
const badAttrNamesObj = {
	default: ['onmousedown', 'jsaction', 'ping', 'oncontextmenu'],
	search: ['onmousedown', 'jsaction', 'ping', 'oncontextmenu'],
	vid: ['onmousedown'],
	isch: [],
};

// From the nodes selected here, delete parameters specified by badParametersNames
const dirtyLinkSelectors = [
	// menu
	'a.q.qs',

	// doodle
	'a.doodle',
];

const badPaths = ["imgevent"];

/* Compile */
// The first paramater is probably 'q' so '?' does not consider
const regBadParameters = new RegExp(
	'&(?:' + badParametersNames.join('|') + ')=.*?(?=(&|$))'
	, 'g');
const regBadPaths = new RegExp(
	'^\/(?:' + badPaths.join('|') + ')'
);
const dirtyLinkSelector = dirtyLinkSelectors.map(s=>s+":not([href=''])").join(',');

/*
 * Functions
 */
/* Return parameter value */
function extractDirectLink(str, param){
	//(?<=q=)(.*)(?=&)/
	const res = new RegExp(`[?&]${param}(=([^&#]*))`).exec(str);
	if(!res || !res[2]) return '';
	return decodeURIComponent(res[2]);
}

/* Return the current Google search mode */
function getParam(parameter, name){
	var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(parameter);
	if (results === null){
		return null;
	}
	else{
		return results.pop() || 0;
	}
}

/* return search mode */
function getMode(){
	const parameter = location.search + location.hash;
	return getParam(parameter, 'tbm') || "search";
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/* Return Promise when declared the variable name specified by argument */
async function onDeclare(obj, propertyStr, interval=80) {
	return new Promise(async function(resolve, reject){
		const propertyNames = propertyStr.split(".");
		let currObj = obj;
		for(const propertyName of propertyNames){
			while(!(propertyName in currObj) || currObj[propertyName] === null){
				await sleep(interval);
			}
			currObj = currObj[propertyName];
		}
		resolve(currObj);
	});
}

function removeDOM(node){
	node.parentNode.removeChild(node);
}

function rewriteProperties(prop){
	prop.forEach((table) => {
		//const targetObject = typeof table[0] === 'function' ? table[0]() : table[0];
		Object.defineProperty(table[0] || {}, table[1], {
			value: table[2],
			writable: false,
		});
	});
}

function load(){
	console.time("LOAD");

	/* Overwrite disturbing  functions */
	rewriteProperties([
		[window, "rwt", yesman],
		[window.gbar_, 'Rm', yesman],
	]);

	// Do not send gen_204 flag
	for(const node of document.querySelectorAll(".csi")){
		node.parentNode.removeChild(node);
	}

	/*
	 * Variables
	 */
	// Whether to use AJAX
	const legacy = document.getElementById("cst") === null;

	/* Nodes */
	const nodeMain = window.main;
	const nodeCnt = window.cnt;
	const root = (()=>{
		if(legacy){
			return nodeCnt || nodeMain || window.document;
		} else {
			return nodeMain
		}
	})();

	// Flag indicating whether the hard tab is loaded on 'DOMContentLoaded'
	const lazy_hdtb = !legacy || root === nodeCnt;

	// Define selector function
	const $ = root.querySelector.bind(root);
	const $$ = (sel) => Array.prototype.slice.call(root.querySelectorAll.call(root, [sel]));

	// Selector pointing to anchors to purify
	const dirtySelector = (()=>{
		if(root === window.document){
			return "body a";
		} else if(legacy){
			return `#${root.id} a`;
		} else {
			return "#rcnt a";
		}
	})();

	/*
	 * Functions
	 */
	function removeTracking(){
		console.time("removeTracking");
		const mode = getMode();
		const badAttrNames = badAttrNamesObj[mode] ?
			badAttrNamesObj[mode] : badAttrNamesObj["default"];
		//const directLinkParamName = mode === 'isch' ? "url" : 'q';
		const directLinkParamName = 'q';

		// search result
		for(const searchResult of $$(dirtySelector)){
			// remove attributes
			badAttrNames.map((s)=>{ searchResult.removeAttribute(s); });

			// hide referrer
			searchResult.rel = 'noreferrer';

			// remove google redirect link(legacy)
			if (searchResult.hasAttribute('href') && searchResult.getAttribute('href').startsWith('/url?')){
				searchResult.href = extractDirectLink(searchResult.href, directLinkParamName);
			}
			searchResult.href = searchResult.href.replace(regBadParameters, '');
		}
		for(const dirtyLink of document.querySelectorAll(dirtyLinkSelector)){
			dirtyLink.href = dirtyLink.href.replace(regBadParameters, '');
		}

		switch(mode){
			case "shop":
				// Overwrite links(desktop version only)
				//Object.values(google.pmc.smpo.r).map(s=>{return {title:s[14][0],link:s[28][8]}})
				if(legacy) break;
				onDeclare(google, "pmc.spop.r").then((shopObj) => {
					const shopElements = $$(".pstl");
					const shopLinks = Object.values(shopObj).map(a=>a[34][6]);

					if(shopElements.length !== shopLinks.length) {
						console.warn("length does not match", shopElements.length, shopLinks.length);
						return;
					}

					const zip = rows=>rows[0].map((_,c)=>rows.map(row=>row[c]))
					for(const detail of zip([shopElements, shopLinks])){
						detail[0].href = detail[1];
					}
					console.log("Links Rewrited");
				});
				break;
			default:
				break;
		}
		console.timeEnd("removeTracking");
	}

	function startObserve(targetElement, op, func, conf={childList:true}){
		//console.log("Operation", op , "Register To", targetElement)
		new MutationObserver((mutations, observer) => {
			let nodes = Array.prototype.concat.apply([],
				mutations.map(s => Array.prototype.slice.call(s.addedNodes))
			).filter(n => n.nodeName !== '#comment');

			//console.log("Nodes Captured By", op, nodes);

			switch(op){
				case "FORMLOADED":
					nodes = nodes.filter(n => n.name === "gs_l");
					break;
				case "IMAGELOADED":
					nodes = nodes.filter(n => n.classList.contains("irc_bg"));
					break;
				case "HDTBLOADED":
					nodes = nodes.filter(n => n.className === "hdtb-mn-cont");
					break;
				case "HDTBUPDATE":
					nodes = nodes.filter(n => n.className === "hdtb-mn-cont");
					break;
				case "HDTBCHANGE":
					nodes = nodes.filter(n => n.id === "cnt");
					break;
				case "PAGECHANGE":
					nodes = nodes.filter(n => n.dataset && n.dataset.ved !== undefined);
					break;
				default:
					break;
			}

			if(nodes.length >= 1){
				//console.log("Operation", op , "Fired", nodes[0])
				func();
				if(["HDTBLOADED", "IMAGELOADED", "FORMLOADED"].includes(op)){
					observer.disconnect();
				}
			}
		}).observe(targetElement, conf);
	}

	function pageInit(){
		removeTracking();
		startObserve($("#search"), "PAGECHANGE", removeTracking);
	}

	const initMode = getMode();
	const confDeepObserve = {childList:true, subtree:true};

	// Wait for .hdtb-mn-cont appears in the first page access
	if(lazy_hdtb && !legacy){
		startObserve(root, "HDTBLOADED", ()=>{
			switch(initMode){
				case "isch": // Image Search
					removeTracking();
					startObserve($("#isr_mc"), "IMAGELOADED", ()=>{
						$$(".irc_tas, .irc_mil, irc_hol, .irc_but[jsaction*='mousedown']").forEach((e)=>{
							e.__jsaction = null;
							e.removeAttribute("jsaction");
						});
					});
					startObserve($("#top_nav"), "HDTBUPDATE", removeTracking, confDeepObserve);
					break;
				default:
					pageInit();
					// Wait for #cnt inserted. In HDTB switching, since .hdtb-mn-cont does not appear
					startObserve(root, "HDTBCHANGE", pageInit);
					break;
			}
		}, confDeepObserve);
	}

	if(legacy){
		removeTracking();

		startObserve(document.querySelector("form"), "FORMLOADED", ()=>{
			document.querySelectorAll("form input:not([name='q']):not([name='hl'])")
				.forEach(s=>removeDOM(s));
		});

		console.warn("legacy mode");
		console.timeEnd("LOAD");
		return;
	}

	console.timeEnd("LOAD");
}

(function init(){
	console.time("init");

	onDeclare(window, "google", 20).then(()=>{
		rewriteProperties([
			[google, 'log', yesman],
			[google, 'rll', yesman],
			[google, 'logUrl', tired],
			[google, 'getEI', yesman],
			[google, 'getLEI', yesman],
			[google, 'ctpacw', yesman],
			[google, 'csiReport', yesman],
			[google, 'report', yesman],
			[google, 'aft', yesman],
			[google, 'kEI', '0'],
		]);
	});

	// Reject Request by img tag
	const regBadImageSrc = /\/(?:gen(?:erate)?|client)_204/;
	Object.defineProperty(
		window.Image.prototype,
		"src",
		{
			set: function(url){
				if(!regBadImageSrc.test(url)){
					this.setAttribute("src", url);
				}
			},
		},
	);

	// Reject unknown parameters by script tag
	Object.defineProperty(
		window.HTMLScriptElement.prototype,
		"src",
		{
			set: function(url){
				this.setAttribute("src", url.replace(regBadParameters,''));
			},
		},
	);

	// hook XHR
	const origOpen = XMLHttpRequest.prototype.open;
	window.XMLHttpRequest.prototype.open = function(act, path) {
		if(regBadPaths.test(path)){
			return;
		}
		// take over the parameters ex:num=20
		// path += location.search.replace(/./, '');
		origOpen.apply(this, [act, path.replace(regBadParameters, '')]);
	};

	// do not send referrer
	const noreferrerMeta = document.createElement("meta");
	noreferrerMeta.setAttribute("name", "referrer");
	noreferrerMeta.setAttribute("content", "no-referrer");
	document.querySelector("head").appendChild(noreferrerMeta);

	console.timeEnd("init");
})();

window.addEventListener('DOMContentLoaded', load);

// for older browser
if(document.getElementById("universal") !== null){
	load();
}
