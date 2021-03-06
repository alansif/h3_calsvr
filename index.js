console.oldlog = console.log;
console.olderror = console.error;
console.oldtrace = console.trace;

console.log = function() {
    process.stdout.write((new Date()).toLocaleString() + ' - ');
    console.oldlog.apply(console, arguments);
}

console.error = function() {
    process.stderr.write((new Date()).toLocaleString() + ' - ');
    console.olderror.apply(console, arguments);
}

console.trace = function() {
    process.stderr.write((new Date()).toLocaleString() + ' - ');
    console.oldtrace.apply(console, arguments);
}

const util = require("util");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 8195;

const config = require('./config');
app.use(express.static(path.resolve(config.clipath)));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "*");
//    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

const mysql = require('mysql');

const conn = mysql.createPool({
    host:       '192.168.160.201',
    user:       'root',
    password:   '1234',
    database:   'calendar',
    dateStrings: true,
    supportBigNumbers: true
});

const query = util.promisify(conn.query).bind(conn);

app.get('/api/data', function(req, res){
	const d = req.query['date'];
	const s1 = "select * from cal";
	const s2 = d ? " where date between date_add(?, interval -1 month) and date_add(?, interval 2 month)" : "";
	const s3 = " order by date"
	let f = async() => {
		try {
			let rows = await query(s1+s2+s3, [d,d]);
			res.status(200).json(rows);
		} catch(error) {
            console.error(error);
            res.status(500).end();
        }
	};
	f();
});

app.post('/api/data', function(req, res){
	const d = req.body['date'];
	const t0 = req.body['t0'] || 0;
	const t1 = req.body['t1'] || 0;
	const p0 = req.body['p0'] || 0;
	const p1 = req.body['p1'] || 0;
	const z0 = req.body['z0'] || 0;
	const z1 = req.body['z1'] || 0;
	const h0 = req.body['h0'] || 0;
	const h1 = req.body['h1'] || 0;
	const a0 = req.body['a0'] || 0;
	const a1 = req.body['a1'] || 0;
	const sqlstr = "insert into cal(date,t_used,t_avl,p_used,p_avl,z_used,z_avl,h_used,h_avl,a_used,a_avl) values(?,?,?,?,?,?,?,?,?,?,?)"
		+ " ON DUPLICATE KEY UPDATE t_used=?,t_avl=?,p_used=?,p_avl=?,z_used=?,z_avl=?,h_used=?,h_avl=?,a_used=?,a_avl=?";
	const desc = `${d}数据更新为t_used=${t0},t_avl=${t1},p_used=${p0},p_avl=${p1},z_used=${z0},z_avl=${z1},h_used=${h0},h_avl=${h1},a_used=${a0},a_avl=${a1}`;
	let f = async() => {
		try {
			let rows = await query(sqlstr,[d,t0,t1,p0,p1,z0,z1,h0,h1,a0,a1,t0,t1,p0,p1,z0,z1,h0,h1,a0,a1]);
			await query("insert into logs(description) values(?)",[desc]);
			res.status(200).json(rows);
		} catch(error) {
            console.error(error);
            res.status(500).end();
        }
	};
	f();
});

app.post('/api/events', function(req, res){
	const d = req.body['date'];
	const es = req.body['events'];
	const eslog = es.map(x => {let y = Object.assign({},x); delete y.color; return y;});
	const logstr = JSON.stringify(eslog);
	const desc = `${d}日程更新为${logstr}`;
	let f = async() => {
		try {
			let rows = await query("update cal set events = ? where date = ?", [JSON.stringify(es), d]);
			await query("insert into logs(description) values(?)",[desc]);
			res.status(200).json(rows);
		} catch(error) {
            console.error(error);
            res.status(500).end();
        }
	};
	f();
});

app.get('/api/logs', function(req, res){
	const s1 = "select optime,description from logs order by optime desc";
	let f = async() => {
		try {
			let rows = await query(s1);
			res.status(200).json(rows);
		} catch(error) {
            console.error(error);
            res.status(500).end();
        }
	};
	f();
});

app.listen(port, () => {
    console.log("Server is running on port " + port + "...");
});