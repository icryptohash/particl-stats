let debug = require('debug')('particlstats:scraper:' + module.filename),
    error = require('debug')(`particlstats:scraper:err(${module.filename})`),
    _ = require('lodash'),
    scraperJs = require('scraperjs'),
	snapshotDb,
    scrapeInterval;

async function scraper($) {
	let result = {},
		sectionNum = 1;
	try {
		// _.merge(result, await getSection($, 'SDC_converted', sectionNum++));
		// sectionNum++;
		// _.merge(result, await getSection($, 'SDC_converted', sectionNum++));
		_.merge(result, await getSection($, 'raiseSection', sectionNum++));
		_.merge(result, await getSection($, 'people_stats', sectionNum));
		result.m1 = {
			funded: getFloat(result.arr.raiseSection[3]),
			total:  getFloat(result.arr.raiseSection[5]),
			goal:   getFloat(result.arr.raiseSection[7])
		};
		result.m2 = {
			total:  getFloat(result.arr.raiseSection[10]),
			funded: getFloat(result.arr.raiseSection[12]),
			goal:   getFloat(result.arr.raiseSection[14])
		};
		result.m3 = {
			total:  getFloat(result.arr.raiseSection[17]),
			funded: getFloat(result.arr.raiseSection[19]),
			goal:   getFloat(result.arr.raiseSection[21])
		};
		result.sdcConverted = {
			funded: getFloat(result.arr.raiseSection[25]),
			raised: getFloat(result.arr.raiseSection[27]),
			goal:   getFloat(result.arr.raiseSection[29])
		};
		result.stats = {
			participants: getFloat(result.arr.people_stats[3]),
			bonus:        getFloat(result.arr.people_stats[7]),
			swapped:      getFloat(result.arr.people_stats[10])
		};
	}
	catch(err) {
		console.error(err);
	}

	return result;
}

function getFloat(string) {
	let int;
	try {
		int = parseFloat(string.match(/[0-9,.]+/)[0].replace(/,/g, ''));
	}
	catch(err) {
		error('cannot parse to int:', string);
	}

	return int || null;
}

async function getSection($, name, sectionNum) {
	let ret = {/*raw: {},*/ arr: {}},
		raiseSection = await $(`#stats > .container > .row:nth-child(${sectionNum}), b small`);
	for (let i = 0; i < raiseSection.length; i++) {
		let raw = /*ret.raw[`${name}`] =*/ await $(raiseSection[0]).text();
		ret.arr[name] = getSectionText(raw);
	}
	return ret;
}

function getSectionText(str) {
	return str.replace(/[\n|\t]+/g, '`|`').split('`|`').slice(1,-1).map(s=> (s[0] === '$' ? s.substr(1) : s).trim().replace(',', ''));
}

async function scrapeParticl() {
	try {
		debug('query webpage');
		let scrapedResults = await scraperJs.StaticScraper.create('http://particl.io').scrape(scraper);
		snapshotDb.findOne({}, {arr: 1, created_at: 1}).sort({created_at: -1}).exec((err, lastSnapshot)=> {
			if (err) throw err;

			if (_.isEqual(scrapedResults.arr.raiseSection.sort(), lastSnapshot.arr.raiseSection.sort()) &&
				(!lastSnapshot.arr.SDC_converted || _.isEqual(scrapedResults.arr.SDC_converted.sort(), lastSnapshot.arr.SDC_converted.sort())) &&
				(!lastSnapshot.arr.people_stats || _.isEqual(scrapedResults.arr.people_stats.sort(), lastSnapshot.arr.people_stats.sort()))) {
				return debug('No new data');
			}
			snapshotDb.insert(scrapedResults, (err, newDoc)=> {
				if (err) error('DB insert error:', err);
				else debug('snapshot saved!');
			});
		});
	}
	catch(err) {
		console.error('scrape error:', err);
	}
}

function startScraping() {
	debug('scraping started');
	scrapeParticl();
	let scrapeIntervalMs = 180000;
	scrapeInterval = setInterval(scrapeParticl, scrapeIntervalMs);
	debug('Scraping every', scrapeIntervalMs/1000 + 's');
}

module.exports = app=> {
	snapshotDb = app.get('snapshotDb');
	snapshotDb.loadDatabase(err=> {
		if (err) error('Error loading datastore:', err);
		else {
			debug('database loaded');
			// startScraping();

			// When website layout changed
			/*snapshotDb.remove({
				createdAt: {
					$gt: new Date(1490085959000), // '03/21/2017 04:45:59'
					$lt: new Date(1490100779000) // '03/21/2017 08:52:59'
				}
			}, {multi: true}, (err, docs)=> {
				console.log(docs);
			});*/
			/*snapshotDb.remove({
				$or: [
					{'m1.funded': null},
					{'m2.funded': null}
				]
			}, {multi: true}, (err, docs)=> {
				console.log(docs);
			});*/
		}
	});
};
