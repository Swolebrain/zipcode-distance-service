const csv = require('csv-parser')
const fs = require('fs')
const mongoose = require('mongoose')
const db = mongoose.createConnection('mongodb://localhost/zipcode-distances');
mongoose.Promise = global.Promise;

const ZipDistance = require('./ZipDistance')(db);

const zipCodeHash = {};
const zipsTable = [];

var stream =null;

stream = fs.createReadStream(__dirname+'/US.txt')
  .pipe(csv({
	separator: '\t', 
	headers:[
		'Country', 'Zipcode', 'City', 'Statename', 'State', 
		'County', 'wot1', 'wot2', 'wot3', 'Lat', 'Long', 'wot4',
  	]})
  )
  .on('data', function (data) {
    //console.log('Zip: %s Lat: %s Long: %s', data.Zipcode, data.Lat, data.Long);
    zipsTable.push(data);
  })
  // .on('end', function(){
  //   console.log("Hitting end processing...");
  //   stream = fs.createWriteStream('./zipz.json')
  //   let start = new Date().getTime();
  //   stream.once('open', function(fd){
  //     buildZipsFile();
  //     //stream.end();
  //     console.log("Total processing time:", (new Date().getTime() - start)/(1000*60)  );
  //   })
  // })
  .on('end', function(){
    console.log("Hitting end processing...");
    let start = new Date().getTime();
    loadZipDB(start);
    stream.end();
  })



function buildZipMatrix(){
  for (let i =0; i < zipsTable.length; i++){
    var tableRow = zipsTable[i];
    var outerZip = tableRow.Zipcode;
    var lat1 = tableRow.Lat;
    var lon1 = tableRow.Lon;
    if (typeof zipCodeHash[outerZip] == 'undefined') zipCodeHash[outerZip] = {};
    for (let j = 0; j < zipsTable.length; j++){
      var innerZip = zipsTable[j].Zipcode;
      if (innerZip === outerZip){
        zipCodeHash[outerZip][innerZip] = 0;
        continue;
      }
      var distance = getDistanceBetween(lat1, lon1, zipsTable[j].Lat, zipsTable[j].Lon);
      zipCodeHash[outerZip][innerZip] = distance;
    }
  }
}

async function buildZipsFile(){
  for (let i =0; i < zipsTable.length; i++){
    var tableRow = zipsTable[i];
    var outerZip = tableRow.Zipcode;
    console.log("Processing", outerZip);
    var lat1 = tableRow.Lat;
    var lon1 = tableRow.Lon;
    let collection = { zip: outerZip, distances: {}};
    for (let j = 0; j < zipsTable.length; j++){
      var innerZip = zipsTable[j].Zipcode;
      console.log("      Processing",outerZip,">",innerZip);
      if (innerZip === outerZip){
        collection.distances[innerZip] = 0;
        continue;
      }
      var distance = getDistanceBetween(lat1, lon1, zipsTable[j].Lat, zipsTable[j].Lon);
      collection.distances[innerZip] = distance;
      await stream.write(JSON.stringify(collection));
    }
  }
  stream.end();
}

async function loadZipDB(start){
  for (let i =0; i < zipsTable.length; i++){
    let tableRow = zipsTable[i];
    let outerZip = tableRow.Zipcode;
    let lat1 = tableRow.Lat;
    let lon1 = tableRow.Long;
    let collection = { zip: outerZip, distances: {}};

    for (let j = 0; j < zipsTable.length; j++){
      let innerZip = zipsTable[j].Zipcode;
      // console.log("           Processing "+innerZip+".");
      if (innerZip === outerZip){
        collection.distances[innerZip] = 0;
        continue;
      }
      var distance = getDistanceBetween(lat1, lon1, zipsTable[j].Lat, zipsTable[j].Long);
      //console.log(`           Distance between ${outerZip} and ${innerZip}: ${distance}`);
      collection.distances[innerZip] = distance;
      // console.log("           "+result._id);
    }
    if (i%200 == 0)
      console.log("Sending a model to db with zip", outerZip, "and",
        Object.keys(collection.distances).length, "distances");
    let model = new ZipDistance(collection);
    let result = await model.save();
  }
  console.log("Total processing time:", (new Date().getTime() - start)/(1000*60)  );
}

Number.prototype.toRadians = function() {
return this * Math.PI / 180;
}

function getDistanceBetween(lat1, lon1, lat2, lon2){
  lat1 = Number(lat1);
  lon1 = Number(lon1);
  lat2 = Number(lat2);
  lon2 = Number(lon2);
  var R = 3959; // miles
  var f1 = lat1.toRadians();
  var f2 = lat2.toRadians();
  var df = (lat2-lat1).toRadians();
  var dl = (lon2-lon1).toRadians();

  var a = Math.sin(df/2) * Math.sin(df/2) +
        Math.cos(f1) * Math.cos(f2) *
        Math.sin(dl/2) * Math.sin(dl/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  var d = R * c;
  return d;
}
