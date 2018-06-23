// server.js - where your node app starts

// init project
var express = require('express');
var app = express();
var rp = require('request-promise');

// Setup file globals for easy access
const {API_KEY, API_TOKEN, TRELLO_USERNAME,IGNORE_IDLISTS,IGNORE_NAMEDLISTS,KEEP_IDMEMBERS} = process.env;
const API_PREFIX="https://api.trello.com/1";
const IGNORE_IDLISTS_ARR=IGNORE_IDLISTS.split(',');
const IGNORE_NAMEDLISTS_ARR=IGNORE_NAMEDLISTS.split(',');
const KEEP_IDMEMBERS_ARR=KEEP_IDMEMBERS.split(',');
console.warn(KEEP_IDMEMBERS);

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

const hasAKeptOrNoMembers = card =>
  (card.idMembers.length === 0) || (card.idMembers.filter(idMember => KEEP_IDMEMBERS_ARR.includes(idMember)).length > 0)

const getCardCountsByLabel = ({ofBoard}) =>
  rp(`${API_PREFIX}/boards/${ofBoard}/cards/?fields=idList,labels,idMembers&key=${API_KEY}&token=${API_TOKEN}`)
    .then(result => JSON
      .parse(result)
      .filter(c => !IGNORE_IDLISTS_ARR.includes(c.idList))
      .filter(hasAKeptOrNoMembers)
      .reduce(
        (totals, card) => {
          const newTotals = JSON.parse(JSON.stringify(totals));
          card.labels.forEach(label => {
            newTotals[label.name] = totals[label.name] ? totals[label.name] + 1 : 1;
          })
          newTotals.__TOTAL__ += 1;
          return newTotals;
        },
        { __TOTAL__: 0 }
      )
    );
const getCardCount = ({ofBoard}) =>
  rp(`${API_PREFIX}/boards/${ofBoard}/cards/?fields=idList&key=${API_KEY}&token=${API_TOKEN}`)
    .then(result => {
      return JSON.parse(result).filter(c => !IGNORE_IDLISTS_ARR.includes(c.idList)).length
    })
const getOpenBoards = ({user}) =>
  rp(`${API_PREFIX}/members/${user}/boards?filter=open&fields=id,name&key=${API_KEY}&token=${API_TOKEN}`)
    .then(result => JSON.parse(result))

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

const GLOBAL_SIDE_EFFECT_addIgnoreListIdsByName = (boardId) => 
  rp(`${API_PREFIX}/boards/${boardId}/lists/?fields=name&key=${API_KEY}&token=${API_TOKEN}`)
    .then(result => {
      const res = JSON.parse(result);
      res.filter(c => IGNORE_NAMEDLISTS_ARR.includes(c.name)).forEach(list=>IGNORE_IDLISTS_ARR.push(list.id));
      console.warn(res.length)
    });

app.get("/dreams", function (request, response) {
  getOpenBoards({user: TRELLO_USERNAME})
    .then(boards =>
      boards.map(board => {
        GLOBAL_SIDE_EFFECT_addIgnoreListIdsByName(board.id);
        return board;
      })
    )
    .then(boards =>
       boards.map(board => getCardCountsByLabel({ ofBoard: board.id }).then(counts => ({name: board.name, counts})))
    )
    .then(countRequests =>
      Promise
        .all(countRequests)
        .then((boardsWithCounts) => response.send([
          ...boardsWithCounts.map(b => `${b.name} : ${b.counts.__TOTAL__} (${
            Object.keys(b.counts)
              .filter(l => '__TOTAL__' !== l)
              .sort((l1, l2) => b.counts[l2] - b.counts[l1])
              .map(label => `${label}:${b.counts[label]}`)
            })`),
         `Total : ${boardsWithCounts.reduce((acc, curr) => acc + curr.counts.__TOTAL__, 0)}`
        ]))
    )
  // Much simple & beautiful here, but not as useful
  /*
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
  */
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
