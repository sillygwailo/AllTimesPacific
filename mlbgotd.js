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

var not_happening =
 [
   'completed',
   'postponed',
   'suspended',
   'cancelled'
 ]

// adapted from http://stackoverflow.com/a/4898840/300278
function formatTime(d) {
  var hh = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
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

var today = new Date();
var year = today.getFullYear();
var month = today.getMonth() + 1;
month = month + 1 < 10
  ? '0' + month
  : month;

var day = today.getDate();
day = day < 10 ? '0' + day: day;

var date = year.toString() + month.toString() + day.toString();
// var date = '20140522'; // a date for testing

console.log(date);

var url = 'https://erikberg.com/events.json?date=' + date + '&sport=mlb';
var headers = {
  'Authorization': 'Bearer ' + access_token,
  'User-Agent': 'MLB Game of the Day bot/0.1 (richard@justagwailo.com)',
};

function tweetGame() {
  var random_afternoon_game_id, random_evening_game_id;
  req.get({ url: url, headers: headers}, function(req, res) {
    events_response = JSON.parse(res.body);
    all_events = events_response.event;
    var scheduled_events = [];
    var afternoon_games = [];
    var evening_games = [];
    console.log(all_events);
    all_events.forEach(function(event) {
      if (event.event_status == 'scheduled') { // change to 'scheduled'
        start_time = new Date(event.start_date_time);
        if (start_time.getHours() < 16) {
          afternoon_games.push(event);
        }
        else {
          evening_games.push(event);
        }
        scheduled_events.push(event);
      }
    });
    if (scheduled_events.length === 0) {
      text = 'There are no games today.';
    }
    else {
      if (afternoon_games.length === 0) {
        afternoon_text = "There are no afternoon games today.";
      }
      else { // there are afternoon games today
        random_afternoon_game_id = getRandomInt(-1, afternoon_games.length - 1);        
        if (random_afternoon_game_id !== -1) {
          random_afternoon_game = afternoon_games[random_afternoon_game_id];
          afternoon_start_time_obj = new Date(random_afternoon_game.start_date_time);
          afternoon_start_time = formatTime(afternoon_start_time_obj);
          afternoon_text = "Afternoon: " + random_afternoon_game.away_team.full_name + ' at ' + random_afternoon_game.home_team.full_name; // + ' at ' + random_afternoon_game.home_team.site_name
          afternoon_text += ', ' + afternoon_start_time + ' start.';
        }
        else {
          afternoon_text = 'You have the afternoon off from watching ballgames.'
        }
      }
      if (evening_games.length === 0) {
        evening_text = "There are no evening games today.";
      }
      else { // there are evening games today
        random_evening_game_id = getRandomInt(-1, evening_games.length - 1);
        if (random_evening_game_id !== -1) {
          random_evening_game = evening_games[random_evening_game_id];
          evening_start_time_obj = new Date(random_evening_game.start_date_time);
          evening_start_time = formatTime(evening_start_time_obj);
          evening_text = "Evening: " + random_evening_game.away_team.full_name + ' at ' + random_evening_game.home_team.full_name; //+ ' at ' + random_evening_game.home_team.site_name
          evening_text += ', ' + evening_start_time + ' start.';
        }
        else {
          evening_text = 'Take the evening off from baseball.'
        }
      }
      if (random_afternoon_game_id === -1 && random_evening_game_id === -1) {
        text = 'The bot has decided that today is your off day.';
      }
      else if (scheduled_events.length > 0) {
        games = [];
        games.push(afternoon_text);
        if (random_evening_game_id !== -1) {
          games.push(evening_text);
          text = games.join("\n");
        }
      }
    }
    console.log(text);
    T.post('statuses/update', { status: text }, function(err, reply) {
      console.log('error: ' + err);
      console.log('reply: ' + reply);
    });
  });
}

schedule.scheduleJob({hour: 11, minute: 15}, function() {
  setTimeout(function() {
    tweetGame();
  }, Math.floor(Math.random() * 360000));
});

schedule.scheduleJob({hour: 15, minute: 45}, function() {
  setTimeout(function() {
    tweetGame();
  }, Math.floor(Math.random() * 360000));
});
