var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  links: function() {
    return this.hasMany(Link);
  },
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      bcrypt.hash(model.get('password'), null, null, function(err, hash) {
        if (err) {
          console.log(err);
        } else {
          model.set('password', hash);
        }
      });
    });
  }
});

module.exports = User;