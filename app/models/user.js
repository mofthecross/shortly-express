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
      return new Promise(function(resolve, reject) {
        bcrypt.hash(model.get('password'), null, null, function(err, hash) {
          if (err) {
            reject(err);
          }
          model.set('password', hash);
          // console.log('saving hash to database ', model.get('username'), hash);
          resolve(hash);
        });
      });
    });
  }
});

module.exports = User;