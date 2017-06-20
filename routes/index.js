var express = require('express');
var router = express.Router();
let Promise = require('bluebird');
let app,
	viewsDb,
	snapshotDb,
	viewsDbInsertSync,
	viewsDbCountSync;

/* GET home page. */
router.get('/', async (req, res, next)=> {
	try {
		await viewsDbInsertSync({
			page: 'index.jade',
			route: '/',
			ip: req.connection.remoteAddress
		});
		let viewCount = await viewsDbCountSync({route: '/'});
		snapshotDb.find(
			{   $not: {m1: null},
				createdAt: {$lt: new Date('04/18/2017')}}, // Last time of change in stats
			{
				_id:         0,
				_updated_at: 0,
				arr:         0,
				raw:         0,
			}
		).sort({createdAt: 1}).exec((err, snapshots)=> {
			if (err) next(err);
			res.render('index', {
				title:     'Express',
				snapshots,
				viewCount
			});
		});
	}
	catch(err) {
		console.error('err:', err);
	}
});

module.exports = a => {
	app = a;
	snapshotDb = app.get('snapshotDb');
	viewsDb = app.get('viewsDb');
	viewsDbInsertSync = Promise.promisify(viewsDb.insert.bind(viewsDb));
	viewsDbCountSync = Promise.promisify(viewsDb.count.bind(viewsDb));
	return router;
};
