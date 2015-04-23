var req = require('request');
var schedule = require('node-schedule');
var Twit = require('twit');

var T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var access_token = process.env.XMLSTATS_ACCESS_TOKEN;

var not_happening = [
  'completed',
  'postponed',
  'suspended',
  'cancelled'
];

// adapted from http://stackoverflow.com/a/4898840/300278
function formatTime(d) {
  var hh = d.getHours();
  var m = d.getMinutes();
  var dd = 'AM';
  var h = hh;
  if (h >= 12) {
      h = hh-12;
      dd = 'PM';
  }
  if (h === 0) {
      h = 12;
  }
  m = m<10
    ?'0' + m
    : m;

  return h.toString() + ':' + m.toString() + ' ' + dd;
}

// Get a random integer between min and max http://stackoverflow.com/a/12885196/300278
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

var headers = {
  'Authorization': 'Bearer ' + access_token,
  'User-Agent': 'MLB Game of the Day bot/0.1 (richard@justagwailo.com)',
};

function filterMorning(event) {
  var start_time = new Date(event.start_date_time);
  return (start_time.getHours() < 12);
}
function filterAfternoon(event) {
  var start_time = new Date(event.start_date_time);
  return (start_time.getHours() > 12 && start_time.getHours() < 16);
}
function filterEvening(event) {
  var start_time = new Date(event.start_date_time);
  return (start_time.getHours() > 16);
}

function tweetGame(timeOfDay) {
  var today = new Date();
  var year = today.getFullYear();
  var month = today.getMonth() + 1;
  month = month + 1 < 10
    ? '0' + month
    : month;

  var day = today.getDate();
  day = day < 10 ? '0' + day: day;

  var date = year.toString() + month.toString() + day.toString();

  var url = 'https://erikberg.com/events.json?date=' + date + '&sport=mlb';

  var random_game_id;
  req.get({ url: url, headers: headers}, function(req, res) {
    var games = [];
    var text = '';
    var events_response = JSON.parse(res.body);
    var all_events = events_response.event;
    switch(timeOfDay) {
      case 'morning':
        games = all_events.filter(filterMorning);      
        break;
      case 'afternoon':
        games = all_events.filter(filterAfternoon);
        break;
      case 'evening':
        games = all_events.filter(filterEvening);      
        break;
    }
    if (all_events.length === 0) {
      text = 'There are no games today.';
    }
    else {
      if (games.length === 0) {
        text = 'There are no ' + timeOfDay + ' games today.';
      }
      else { // there are games scheduled for this time period
        var flip_result = Math.floor(Math.random() * (100 - 1)) + 1;
        if (flip_result <= 80) { // 80% chance of choosing a game to watch
          random_game_id = getRandomInt(0, games.length - 1);
          var random_game = games[random_game_id];
          var start_time_obj = new Date(random_game.start_date_time);
          var start_time = formatTime(start_time_obj);
          // The following upper-casing of the first character is adapted from http://stackoverflow.com/a/1026087/300278
          text = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1) + ' game to watch: ';
          text += "The " + random_game.away_team.full_name + ' take on the ' + random_game.home_team.full_name;
          text += ' at ' + random_game.home_team.site_name;
          text += '. The game starts at ' + start_time + '.';
        } // end 80% chance
        else { // 20% chance of having the time period off from watching a game
          text = 'You have the ' + timeOfDay + ' off from watching ballgames.';
        }
      }
    } // there are games to watch
    console.log(text);
    T.post('statuses/update', { status: text }, function(err, reply) {
      console.log('error: ' + err);
      console.log('reply: ' + reply);
    });
  });
}

schedule.scheduleJob({hour: 9, minute: 30}, function() {
  setTimeout(function() {
    tweetGame('morning');
  }, Math.floor(Math.random() * 360000));
});

schedule.scheduleJob({hour: 12, minute: 20}, function() {
  setTimeout(function() {
    tweetGame('afternoon');
  }, Math.floor(Math.random() * 360000));
});

schedule.scheduleJob({hour: 15, minute: 10}, function() {
  setTimeout(function() {
    tweetGame('evening');
  }, Math.floor(Math.random() * 360000));
});

