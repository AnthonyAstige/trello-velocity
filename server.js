// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var rp = require('request-promise');

// Setup file globals for easy access
const {API_KEY, API_TOKEN, TRELLO_USERNAME,IGNORE_IDLISTS} = process.env;
const API_PREFIX="https://api.trello.com/1";
const IGNORE_IDLISTS_ARR=IGNORE_IDLISTS.split(',');
console.log(IGNORE_IDLISTS_ARR);

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

const getCardCount = ({ofBoard}) =>
  rp(`${API_PREFIX}/boards/${ofBoard}/cards/?fields=idList&key=${API_KEY}&token=${API_TOKEN}`)
    .then(result => JSON.parse(result).filter(c => !IGNORE_IDLISTS_ARR.includes(c.idList)).length)
const getOpenBoards = ({user}) =>
  rp(`${API_PREFIX}/members/${user}/boards?filter=open&fields=id,name&key=${API_KEY}&token=${API_TOKEN}`)
    .then(result => JSON.parse(result))

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/dreams", function (request, response) {
  getOpenBoards({user: TRELLO_USERNAME})
    .then(boards => 
      boards.map(board => getCardCount({ ofBoard: board.id }).then(count => ({name: board.name, count: count})))
    )
    .then(countRequests =>
      Promise
        .all(countRequests)
        .then((boardsWithCounts) => {
          response.send([
            ...boardsWithCounts.map(b => `${b.name} : ${b.count}`),
           `Total: ${boardsWithCounts.reduce((acc, curr) => acc + curr.count, 0)}`
          ]);
        })
    )
});

// could also use the POST body instead of query string: http://expressjs.com/en/api.html#req.body
app.post("/dreams", function (request, response) {
  dreams.push(request.query.dream);
  response.sendStatus(200);
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
