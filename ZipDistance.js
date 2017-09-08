const mongoose = require('mongoose');

const ZipDistanceSchema = {
  zip: String,
  distances: mongoose.Schema.Types.Mixed
  }

module.exports = function(db){
  return db.model('ZipDistance', ZipDistanceSchema);
}
