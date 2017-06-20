data = _.filter(data, 'm1'); // get rid of non-data
data = _.map(data, d=> {
	d.createdAt = new Date(d.createdAt);
	return d;
});
data = _.sortBy(data, 'createdAt');

var numberFormat = d3.format(','),
	dateFormat = d3.timeFormat('%m/%d %I:%M %p');

function getValue(parent, label, currentValue) {
	return (((parent === 'm1' && label === 'funded') || (['m2', 'm3'].includes(parent) && label === 'total')) && currentValue > 100) ? 100 : currentValue;
}

function getData(snapshot, parent, label) {
	if (!parent || !label) return {date: snapshot.createdAt};
	var data ={date: snapshot.createdAt, value: getValue(parent, label, snapshot[parent][label])};
	if (parent === sdcConverted && label === 'funded') {
		data.label = label;
	}
	return data;
}

function makeChart(parent, label, yLabel) {
	var thisData = _.map(data, snapshot=> {
		return getData(snapshot, parent, label);
	});

	var svg = d3.select("svg#" + parent + "_" + label),
	    margin = {top: 20, right: 20, bottom: 30, left: 250},
	    width = +svg.attr("width") - margin.left - margin.right,
	    height = +svg.attr("height") - margin.top - margin.bottom,
	    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var x = d3.scaleTime()
		.rangeRound([0, width]); // _.minBy(m1Funded, 'value')

	var y = d3.scaleLinear()
		.rangeRound([height, 0]);

	var line = d3.line()
		.x(function(d) { return x(d.date); })
		.y(function(d) { return y(d.value); });

	x.domain(d3.extent(thisData, function(d) { return d.date; }));
	y.domain(d3.extent(thisData, function(d) { return d.value; }));

	g.append("g")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x))
		.select(".domain")
		.remove();

	g.append("g")
		.call(d3.axisLeft(y))
		.append("text")
		.attr("fill", "#000")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", "0.71em")
		.attr("text-anchor", "end")
		.text(yLabel);

	g.append("path")
		.datum(thisData)
		.attr("fill", "none")
		.attr("stroke", "steelblue")
		.attr("stroke-linejoin", "round")
		.attr("stroke-linecap", "round")
		.attr("stroke-width", 1.5)
		.attr("d", line);
}

/*makeChart('m1', 'funded', 'Milestone 1 %');
makeChart('m2', 'total', 'Milestone 2 %');
makeChart('m3', 'total', 'Milestone 3 %');*/

multiChart(
	'svg#mmixed',
	'Percentage %',
	{id: 'Milestone1', parent: 'm1', label: 'funded', valSuffix: '%'},
	{id: 'Milestone2', parent: 'm2', label: 'total', valSuffix: '%'},
	{id: 'Milestone3', parent: 'm3', label: 'total', valSuffix: '%'}
);

//makeChart('sdcConverted', 'funded', 'SDC Funded %');
//makeChart('sdcConverted', 'raised', 'SDC Raised');
var sdcFunding = 'SDC Funding',
	sdcConverted = 'sdcConverted';
multiChart(
	'svg#sdcfunding',
	sdcFunding,
	{id: 'SDC Raised', parent: sdcConverted, label: 'raised', valSuffix: ''},
	{id: /*'SDC %'*/' ', parent: sdcConverted, label: 'funded', valSuffix: '%'},
	{id: '', parent: '', label: '', valSuffix: ''}
);

multiChart(
	'svg#staking',
	'Overview',
	{id: 'Participants', parent: 'stats', label: 'participants', valSuffix: ''},
	{id: 'Bonus', parent: 'stats', label: 'bonus', valSuffix: ''},
	{id: 'Swapped', parent: 'stats', label: 'swapped', valSuffix: ''}
);

//makeChart('stats', 'participants', 'Participant Total');
//makeChart('stats', 'bonus', 'Bonus Total');
//makeChart('stats', 'swapped', 'Swapped Total');

function multiChart(svgId, yAxisLabel, one, two, three) {
	two = two || {};
	three = three || {};
	var isSdcFunded = yAxisLabel === sdcFunding;
	var milestonesData = [];
	for (var obj of [one, two, three]) {
		if (obj && obj.id) {
			milestonesData.push({
				id: obj.id,
				values: _.map(data, snapshot=> {
					return getData(snapshot, obj.parent, obj.label);
				})
			})
		}
	};

	var svg = d3.select(svgId),
	    margin = {top: 20, right: 80, bottom: 30, left: 50},
	    width = svg.attr("width") - margin.left - margin.right,
	    height = svg.attr("height") - margin.top - margin.bottom,
	    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
	    bisectDate = d3.bisector(function(d) { return d.date; }).left;

	var x = d3.scaleTime().range([0, width]),
	    y = d3.scaleLinear().range([height, 0]),
	    w = d3.scaleLinear().range([height, 0]),
	    z = d3.scaleOrdinal(d3.schemeCategory10);

	var line = d3.line()
		.curve(d3.curveBasis)
		.x(function(d) { return x(d.date); })
		.y(function(d) {
			return /*(!isSdcFunded || (isSdcFunded && d.label !== 'funded') ? y : w)*/y(d.value);
		});

	x.domain(d3.extent(data, function(d) { return d.createdAt; }));

	y.domain([
		d3.min(milestonesData, function(c) { return d3.min(c.values, function(d) { return d.value; }); }),
		d3.max(milestonesData, function(c) { return !isSdcFunded ? d3.max(c.values, function(d) { return d.value; }) : 6642140})
	]);

	z.domain(milestonesData.map(function(c) { return c.id; }));
	w.domain([0, 100]);

	g.append("g")
		.attr("class", "axis axis--x")
		.attr("transform", "translate(0," + height + ")")
		.call(d3.axisBottom(x));

	let leftAxis = !isSdcFunded ? d3.axisLeft(y) : d3.axisLeft(y).tickFormat(d3.format('.2s'));

	g.append("g")
		.attr("class", "axis axis--y")
		.call(leftAxis)
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", "0.71em")
		.attr("fill", "#000")
		.text(yAxisLabel);

	if (yAxisLabel === sdcFunding) {
		g.append("g")
			.attr("class", "axis axis--y")
			.attr("transform", "translate(" + (width) + ", 0)")
			.call(d3.axisRight(w))
			.append("text")
			.attr("y", -12)
			.attr("dy", "0.71em")
			.attr("fill", "#000")
			.text('SDC %');
	}

	var milestones = g.selectAll(".milestone")
		.data(milestonesData)
		.enter().append("g")
		.attr("class", "milestone");

	milestones.append("path")
		.attr("class", "line")
		.attr("d", function(d) { return line(d.values); })
		.style("stroke", function(d) { return z(d.id); });

	milestones.append("text")
		.datum(function(d) { return {id: d.id, value: d.values[d.values.length - 1]}; })
		.attr("transform", function(d) { return "translate(" + x(d.value.date) + "," + y(d.value.value) + ")"; })
		.attr("x", 20)
		.attr("dy", "0.35em")
		.style("font", "10px sans-serif")
		.text(function(d) { return d.id; });

	milestones.append("rect")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.attr("class", "overlay")
		.attr("width", width)
		.attr("height", height)
		.on("mouseover", function() { focus.style("display", null); })
		.on("mouseout", function() { focus.style("display", "none"); })
		.on("mousemove", mousemove);

	var focus = g.select('.milestone').append("g")
		.attr("class", "focus")
		.style("display", "none");

	focus.append("line")
		.attr("class", "x-hover-line hover-line")
		.attr("y1", 0)
		.attr("y2", height);

	/*focus.append("line")
	 .attr("class", "y-hover-line hover-line")
	 .attr("x1", width)
	 .attr("x2", width);*/

	focus.append("circle")
		.attr("r", 7.5);

	var dateId = 'h' + getRand();
	one.hovId = 'h' + getRand();
	two.hovId = 'h' + getRand();
	three.hovId = 'h' + getRand();
	focus.append("text")
		.attr("x", 15)
		.attr("dy", ".31em")
		.attr('id', dateId);
	focus.append("text")
		.attr("x", 15)
		.attr("dy", "1.62em")
		.attr('id', one.hovId);
	focus.append("text")
		.attr("x", 15)
		.attr("dy", "2.93em")
		.attr('id', two.hovId);
	focus.append("text")
		.attr("x", 15)
		.attr("dy", "4.24em")
		.attr('id', three.hovId);

	svg.append("rect")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
		.attr("class", "overlay")
		.attr("width", width)
		.attr("height", height)
		.on("mouseover", function() { focus.style("display", null); })
		.on("mouseout", function() { focus.style("display", "none"); })
		.on("mousemove", mousemove);

	var renameParents = ['m1', 'm2', 'm3'];
	function mousemove() {
		var x0 = x.invert(d3.mouse(this)[0]),
		    i = bisectDate(milestonesData[0].values, x0, 1),
		    m1Data = getMouseOverData(x0, i, 0),
		    m2Data = two.id && getMouseOverData(x0, i, 1),
		    m3Data = three.id && getMouseOverData(x0, i, 2);

		focus.attr("transform", "translate(" + x(m1Data.date) + "," + y(m1Data.value) + ")");

		focus.select('#' + dateId).attr('transform', 'rotate(15)').text(function() {
			return dateFormat(m2Data.date);
		});
		focus.select('#' + one.hovId).attr('transform', 'rotate(15)').text(function() {
			return (renameParents.includes(one.parent) ? 'm1' : one.id) + ': ' +
				numberFormat(getValue(one.parent, one.label, m1Data.value)) + one.valSuffix;
		});
		focus.select('#' + two.hovId).attr('transform', 'rotate(15)').text(function() {
			return (renameParents.includes(two.parent) ? 'm2' : two.id) + ':' +
				numberFormat(getValue(two.parent, two.label, m2Data.value)) + two.valSuffix;
		});
		focus.select('#' + three.hovId).attr('transform', 'rotate(15)').text(function() {
			return !three.id ? '' : ((renameParents.includes(three.parent) ? 'm3' : three.id) + ':' +
				numberFormat(getValue(three.parent, three.label, m3Data.value)) + three.valSuffix);
		});
		focus.select(".x-hover-line").attr("y2", height - y(m1Data.value));
		// focus.select(".y-hover-line").attr("x2", width + width);
	}

	function getMouseOverData(x0, i, setIdx) {
		let d0 = milestonesData[setIdx].values[i - 1],
		    d1 = milestonesData[setIdx].values[i];
		return x0 - d0.date > d1.date - x0 ? d1 : d0
	}
}

function getRand() {
	return (Math.random() + '').substring(2);
}
window.onload = function() {
	document.getElementById('updated').innerText = moment(data[data.length-1].createdAt).format('LLL');
};
