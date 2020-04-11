// ==UserScript==
// @namespace      jp.sceneq.rgtuwaaa
// @name           remove google tracking UWAA
// @description    remove google tracking
// @homepageURL    https://github.com/sceneq/RemoveGoogleTracking
// @version        0.20
// @include        https://www.google.*/*
// @grant          none
// @run-at         document-body
// @updateURL      https://raw.githubusercontent.com/sceneq/RemoveGoogleTracking/master/RemoveGoogleTracking.user.js
// @downloadURL    https://raw.githubusercontent.com/sceneq/RemoveGoogleTracking/master/RemoveGoogleTracking.user.js
// @author         sceneq
// @license        MIT
// ==/UserScript==

const yes = () => true;
const doNothing = () => {};
const $ = (s, n = document) => n.querySelector(s);
const $$ = (s, n = document) => [...n.querySelectorAll(s)];
const sleep = millis => new Promise(resolve => setTimeout(resolve, millis));
const zip = rows => rows[0].map((_, c) => rows.map(row => row[c]));

const rewriteProperties = props => {
	for (const p of props) {
		Object.defineProperty(p[0] || {}, p[1], {
			value: p[2],
			writable: false,
		});
	}
};

const waitUntilDeclare = ({ obj, property, interval }) => {
	console.debug('waitUntilDeclare', obj.toString(), property);
	return new Promise(async (resolve, reject) => {
		const propertyNames = property.split('.');
		let currObj = obj;
		for (const propertyName of propertyNames) {
			while (!(propertyName in currObj) || currObj[propertyName] === null) {
				await sleep(interval);
			}
			currObj = currObj[propertyName];
		}
		console.debug('waitUntilDeclare', obj.toString(), property, 'Done');
		resolve(currObj);
	});
};

const untrackBuilder = arg => {
	const r = arg.badParamsRegex;
	return a => {
		if (a.getAttribute('href')?.startsWith('/url?')) {
			a.href = new URLSearchParams(a.getAttribute('href').slice(5)).get('q');
		} else {
			a.removeAttribute('ping');
			a.href = a.href.replace(r, '');
		}
	};
};

const Types = {
	search: Symbol('search'),
	isch: Symbol('image'),
	shop: Symbol('shop'),
	nws: Symbol('news'),
	vid: Symbol('video'),
	bks: Symbol('book'),
	maps: Symbol('maps'),
	fin: Symbol('finance'),
	toppage: Symbol('toppage'),
	// flights: Symbol('flights'),
};

const tbmToType = tbm => {
	if (tbm === null) {
		return Types.search;
	}
	const t = {
		isch: Types.isch,
		shop: Types.shop,
		nws: Types.nws,
		vid: Types.vid,
		bks: Types.bks,
		fin: Types.fin,
	}[tbm];
	if (t === undefined) {
		return null;
	} else {
		return t;
	}
};

const BadParamsBase = [
	'biw', // offsetWidth
	'bih', // offsetHeight
	'ei',
	'sa',
	'ved',
	'source',
	'prds',
	'bvm',
	'bav',
	'psi',
	'stick',
	'dq',
	'ech',
	'gs_gbg',
	'gs_rn',
	'cp',
	'ictx',
	'cshid',
	'gs_lcp',
];

const BadParams = (() => {
	const o = {};
	o[Types.search] = [
		'pbx',
		'dpr',
		'pf',
		'gs_rn',
		'gs_mss',
		'pq',
		'cp',
		'oq',
		'sclient',
		'gs_l',
		'aqs',
	];
	o[Types.isch] = [
		'scroll',
		'vet',
		'yv',
		'iact',
		'forward',
		'ndsp',
		'csi',
		'tbnid',
		'sclient',
		'oq',
	];
	o[Types.shop] = ['oq'];
	o[Types.nws] = ['oq'];
	o[Types.vid] = ['oq'];
	o[Types.bks] = ['oq'];
	o[Types.fin] = ['oq'];
	o[Types.toppage] = ['oq', 'sclient', 'uact'];
	o[Types.maps] = ['psi'];
	return o;
})();

const searchFormUriuri = async arg => {
	let form = null;
	if (arg.pageType.mobileOld) {
		form = $('#sf');
	} else if (arg.pageType.ty === Types.isch) {
		form = await waitUntilDeclare({
			obj: window,
			property: 'sf',
			interval: 30,
		});
	} else {
		form = await waitUntilDeclare({
			obj: window,
			property: 'tsf',
			interval: 30,
		});
	}

	if (form === null) {
		console.warn('form === null');
		return;
	}

	for (const i of form) {
		if (i.tagName !== 'INPUT') continue;
		if (arg.badParams.includes(i.name)) {
			i.parentElement.removeChild(i);
		}
	}
	const orig = form.appendChild.bind(form);
	form.appendChild = e => {
		if (!arg.badParams.includes(e.name)) {
			orig(e);
		}
	};
};

const untrackAnchors = (untrack, arg) => {
	return waitUntilDeclare({
		obj: window,
		property: arg.pageType.mobile
			? 'topstuff'
			: arg.pageType.mobileOld
			? 'rmenu'
			: 'search',
		interval: 30,
	}).then(_ => {
		for (const a of $$('a')) {
			untrack(a);
		}
	});

};

const gcommon = async arg => {
	const untrack = untrackBuilder(arg);
	const p1 = waitUntilDeclare({
		obj: window,
		property: 'google',
		interval: 30,
	}).then(google => {
		rewriteProperties([
			[google, 'log', yes],
			[google, 'logUrl', doNothing],
			[google, 'getLEI', yes],
			[google, 'ctpacw', yes],
			[google, 'csiReport', yes],
			[google, 'report', yes],
			[google, 'aft', yes],
			//[google, 'kEI', '0'],
			//[google, 'getEI', yes], or ()=>"0"
		]);
	});
	rewriteProperties([
		[window, 'rwt', doNothing],
		[window.gbar_, 'Rm', doNothing],
	]);

	const p2 = untrackAnchors(untrack, arg);
	const p3 = searchFormUriuri(arg);
	await Promise.all([p1, p2, p3]);

	if (arg.pageType.mobile) {
		const sel =
			arg.pageType.ty === Types.search
				? '#bres + h1 + div > div + div'
				: '#bres + div > div + div';
		new MutationObserver(mutations => {
			const nodes = [];
			for (const m of mutations) {
				nodes.push(...m.addedNodes);
			}
			for (const n of nodes) {
				new MutationObserver((_, obs) => {
					console.debug('untrack', n);
					for (const a of $$('a', n)) {
						untrack(a);
					}
					obs.disconnect();
				}).observe(n, { childList: true });
			}
		}).observe($(sel), {
			childList: true,
		});
	}
};

const fun = {};

// TODO mobile, mobileOld
fun[Types.toppage] = searchFormUriuri;

fun[Types.search] = gcommon;
fun[Types.vid] = gcommon;
fun[Types.nws] = gcommon;
fun[Types.bks] = gcommon;
fun[Types.fin] = gcommon;

fun[Types.isch] = async arg => {
	// TODO desktop, mobile, mobileOld
	const untrack = untrackBuilder(arg);
	const p1 = waitUntilDeclare({
		obj: window,
		property: 'islmp',
		interval: 30,
	}).then(() => {
		for (const a of $$('a')) {
			untrack(a);
		}
	});
	const p2 = searchFormUriuri(arg);
	await Promise.all([p1, p2]);
};

fun[Types.shop] = async arg => {
	// TODO mobile, mobileOld
	const untrack = untrackBuilder(arg);
	const p1 = waitUntilDeclare({
		obj: window,
		property: 'google.pmc.spop.r',
		interval: 30,
	}).then(shopObj => {
		// Rewrite to original link
		const tmp = $$("div[class$='__content'] a[jsaction='spop.c']");
		const [anchors, thumbs] = [0, 1].map(m =>
			tmp.filter((_, i) => i % 2 === m)
		);
		const shops = Object.values(shopObj);
		const links = shops.map(a => a[34][6]);
		if (anchors.length === links.length) {
			for (const [anchor, link, thumb, shop] of zip([
				anchors,
				links,
				thumbs,
				shops,
			])) {
				anchors.href = thumb.href = link;
				shop[3][0][1] = link;
				shop[14][1] = link;
				shop[89][16] = link;
				shop[89][18][0] = link;
				shop[85][3] = link;
			}
		} else {
			console.warn('length does not match', anchors.length, links.length);
		}
	});

	const p2 = untrackAnchors(untrack, arg);
	const p3 = searchFormUriuri(arg);
	await Promise.all([p1, p2, p3]);
};
// TODO fun[Types.maps] = async arg => {}

(async () => {
	'use strict';
	console.debug('rgt: init');
	console.time('rgt');

	const ty = (() => {
		if (location.pathname.startsWith('/maps')) {
			return Types.maps;
		}
		if (location.pathname === '/' || location.pathname === '/webhp') {
			return Types.toppage;
		}
		const tbm = new URLSearchParams(location.search).get('tbm');
		if (location.pathname === '/search') {
			return tbmToType(tbm);
		}
		return null;
	})();

	if (ty === null) {
		console.debug('ty === null');
		return;
	}

	const badParams = (() => {
		return [...BadParamsBase, ...BadParams[ty]];
	})();
	const badParamsRegex = new RegExp(
		'&(?:' + badParams.join('|') + ')=.*?(?=(&|$))',
		'g'
	);

	const badImageSrcRegex = /\/(?:(?:gen(?:erate)?|client|fp)_|log)204|(?:metric|csi)\.gstatic\.|(?:adservice)\.(google)/;
	Object.defineProperty(window.Image.prototype, 'src', {
		set: function(url) {
			if (!badImageSrcRegex.test(url)) {
				this.setAttribute('src', url);
			}
		},
	});

	Object.defineProperty(window.HTMLScriptElement.prototype, 'src', {
		set: function(url) {
			this.setAttribute('src', url.replace(badParamsRegex, ''));
		},
	});

	const badPaths = [
		'imgevent',
		'shopping\\/product\\/.*?\\/popout',
		'async/ecr',
		'async/bgasy',
	];
	const regBadPaths = new RegExp('^/(?:' + badPaths.join('|') + ')');
	const origOpen = XMLHttpRequest.prototype.open;
	window.XMLHttpRequest.prototype.open = function(act, path) {
		if (path === undefined) return;
		if (path.startsWith('https://aa.google.com/')) return;
		if (path.startsWith('https://play.google.com/log')) return;
		if (path.startsWith('https://www.google.com/log')) return;
		if (regBadPaths.test(path)) return;
		origOpen.apply(this, [act, path.replace(badParamsRegex, '')]);
	};

	if ('navigator' in window) {
		const origSendBeacon = navigator.sendBeacon.bind(navigator);
		navigator.sendBeacon = (path, data) => {
			if (path.startsWith('https://play.google.com/log')) return;
			if (badImageSrcRegex.test(path)) return;
			origSendBeacon(path, data);
		};
	}

	if (ty in fun) {
		const mobileOld = $("html[itemtype]") === null; // &liteui=2
		const mobile = !mobileOld && $('meta[name=viewport]') !== null;
		const arg = {
			pageType: {
				ty,
				mobile,
				mobileOld,
			},
			badParams,
			badParamsRegex,
		};
		console.debug('arg', arg);
		await fun[ty](arg);
	} else {
		console.warn(`key not found in fun: ${ty.toString()}`);
	}
	console.timeEnd('rgt');
})();
