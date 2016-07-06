var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var sessions = require('client-sessions');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(sessions({
  cookieName: 'mySession',
  secret: 'booooooostrap',
  duration: 24 * 60 * 60 * 1000,
  activeDuration: 1000 * 60 * 5
}));


app.get('/', function(req, res) {
  res.render('index');
});

app.get('/create', function(req, res) {
  if (req.mySession.username === undefined) {
    res.redirect('/login');
  } else {
    res.render('index');  
  }
});

app.get('/links', function(req, res) {
  var username = req.mySession.username;
  Links.reset().query(function(qb) {
    qb.innerJoin('users', 'urls.userId', 'users.Id')
  .where('users.username', '=', username);
  }).fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.get('/login', function(req, res) {
  res.render('index');
});

app.get('/logout', function(req, res) {
  req.mySession.reset();
  res.redirect('/login');
});

app.get('/signup', function(req, res) {
  res.render('index');
});

app.post('/links', function(req, res) {
  var uri = req.body.url;
  var username = req.mySession.username;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }
        db.knex('users')
        .where('username', '=', req.mySession.username)
        .then(function(dbArray) {
          var userId = dbArray[0].id;
          Links.create({
            url: uri,
            title: title,
            baseUrl: req.headers.origin,
            userId: userId
          })
          .then(function(newLink) {
            res.status(200).send(newLink);
          });
        });

      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/signup', function(req, res) {
  console.log(req.body);

  new User({username: req.body.username}).fetch()
  .then(function(found) {
    if (found) {
      res.setHeader('Content-Type', 'text/html');
      res.status(401).send('<img src="https://s-media-cache-ak0.pinimg.com/564x/20/c9/58/20c95896b7650d44ad5bbfbe5d54d60d.jpg"></img>');
    } else {
      Users.create({username: req.body.username, password: req.body.password}).then(function() {
        res.redirect('/login');
      });
    }
  });
});

app.post('/login', function(req, res) {
  var userData = {
    username: req.body.username,
    password: req.body.password
  };


  db.knex('users')
    .where('username', '=', userData.username)
    .then(function(dbArray) {
      if (dbArray.length === 0) {
        res.redirect('/login');
      } else {
        util.comparePassword(userData.password, dbArray[0].password, function(success) {
          if (success) {
            req.mySession.username = userData.username;
            res.redirect('/');
          } else {
            res.redirect('/login');
          }
        });
        
      }

    });


  // new User(userData).fetch()
  // .then(function(found) {
  //   if (!found) {
  //     console.log(this.get('password'));
  //     res.sendStatus(401);
  //   } else {
  //     console.log('login authorized, sending headers');
  //     res.setHeader('Location', '/');
  //     res.sendStatus(201);
  //   }
  // });

});


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
