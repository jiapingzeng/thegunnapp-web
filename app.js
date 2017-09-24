var express = require('express')
var config = require('config')
var request = require('request')
var moment = require('moment')
var bodyParser = require('body-parser')

var app = express()
var port = process.env.PORT || 3000
app.listen(port)
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

var calendarUrl = process.env.GOOGLE_CALENDAR_API_URL ? process.env.GOOGLE_CALENDAR_API_URL : config.get('calendarUrl')
var calendarId = process.env.GOOGLE_CALENDAR_ID ? process.env.GOOGLE_CALENDAR_ID : config.get('calendarId')
var apiKey = process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY : config.get('apiKey')

console.log('server started')

app.get('/', (req, res, next) => {
    res.redirect('today')
})

app.get('/', (req, res, next) => {
    res.redirect('/')
})

app.get('/today', (req, res, next) => {
    getToday(function (today) {
        res.render('index', { title: 'TheGunnApp', data: today, moment: moment, format: formatSchedule })
    }, function () {
        console.log('oi not like dis')
        res.sendStatus(500)
    })
})

app.get('/list', (req, res, next) => {
    getSchedule(function (calendar) {
        res.render('index', { title: 'TheGunnApp', data: calendar, moment: moment, format: formatSchedule })
    }, function () {
        console.log('crap something happened')
        res.sendStatus(500)
    })
})

app.post('/list', (req, res, next) => {
    getSchedule(function (calendar) {
        res.send(calendar)
    }, function () {
        console.log('done with yo shit')
        res.sendStatus(500)
    })
})


function copy(o) {
    var output, v, key;
    output = Array.isArray(o) ? [] : {};
    for (key in o) {
        v = o[key];
        output[key] = (typeof v === "object") ? copy(v) : v;
    }
    return output;
}

function getCalendar(cb, err) {
    request({
        uri: calendarUrl.replace('calendarId', calendarId),
        qs: {
            key: apiKey,
            singleEvents: true,
            orderBy: "startTime",
            timeMin: moment().format()
        },
        method: 'GET'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('successfully retrived calendar')
            cb(body)
        } else {
            console.log('retriving calendar failed')
            err()
        }
    })
}

function getSchedule(cb, err) {
    getCalendar(function (body) {
        var data = JSON.parse(body.trim())
        var calendar = copy(data)
        calendar.items = []
        for (var i = 0; i < data.items.length; i++) {
            var event = data.items[i]
            if (event.summary && event.summary.toLowerCase().includes('schedule') && event.description) {
                calendar.items.push(event)
            }
        }
        cb(calendar)
    }, err)
}

function getToday(cb, err) {
    getSchedule(function (schedule) {
        var today = copy(schedule)
        today.items = []
        var date = moment().format('YYYY-MM-DD')
        for (var i = 0; i < schedule.items.length; i++) {
            var event = schedule.items[i]
            if (event.start.date == date) {
                today.items.push(event)
            }
        }
        cb(today)
    }, err)
}

function formatSchedule(s) {
    if (s) {
        var a = []
        var l = 0
        for (var i = 0; i < s.length; i++) {
            if (s[i] == ')') {
                a.push(s.substring(l, i + 1))
                l = i + 1
            }
        }
        for (var i = 0; i < a.length; i++) {
            var b = a[i]
            var time = b.substring(b.indexOf('(') + 1, b.length - 1)
            var name = i == 0 ? b.substring(0, b.indexOf('(') - 1) : b.substring(1, b.indexOf('(') - 1)
            a[i] = time + '|' + name
        }
        return a
    }
}