var express = require('express');
var app = express();

app.use(express.static('src'));
app.use(express.static('../BettingLite-contract/build/contracts'));

app.get('/', function (req, res) {
  res.render('index.html');
});

app.listen(3000, function () {
  console.log('Betting App listening on port 3000!');
});