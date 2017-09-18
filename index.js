const express = require('express');
const app = express();
const bp = require('body-parser');

const mongoose = require('mongoose')
const db = mongoose.createConnection('mongodb://localhost/zipcode-distances');
const ZipDistance = require('./ZipDistance')(db);
mongoose.Promise = global.Promise;

app.use(bp.json());

app.get('/', (req,res)=>{
  res.end(`You need to POST to /zipdistances/one-to-many with the following body:<br><br>
      source (string): the one zip code you want to measure distances to
      destinations ([String] ): the list of zip code strings that you want distances to
    `);
});

app.post('/ziplookupbyradius', (req,res)=>{
  console.log('POST /ziplookupbyradius:', req.body);
  let {zip, miles} = req.body;
  if (!zip || !miles || Number(zip) == NaN || Number(miles) == NaN){
    console.log('Received illegal request:', zip, ',',  miles);
    res.status(400).json({error: 'Malformed Request'});
    console.log("Looking up", query);
  }
  
  let query = {zip};
  ZipDistance.find(query)
	.then(dbres=>{
	  console.log('Db responded');
	  //let finalResult = 
	  for (let key in dbres[0]) console.log(key);
	  for (let zip in dbres[0].distances){
	    if(dbres[0].distances[zip] > Number(miles)) delete dbres[0].distances[zip];
	    //else console.log('keeping zip...', zip);
	  }
	  console.log(`Sending back ${Object.keys(dbres[0].distances).length} distances`);
	  res.json(dbres[0].distances);
	})
	.catch(err=>{
	  console.log('Error in DB read:', err);
	  res.status(500).json({err})
	});
});


app.post('/zipdistances/one-to-many', (req,res)=>{
  console.log('POST /zipdistances/one-to-many:', req.body);
  let {source, destinations} = req.body;
  if (!source || !destinations || !destinations.length || destinations.length === 0) {
    console.log(source, destinations);
    return res.status(400).json({error: "Malformed Request"});
  }
  let query = {zip: source};
  let projection = destinations.reduce((acc,zip)=>{
    //acc["distances."+zip]=1;
    return [...acc, "distances."+zip];
  },[]).join(" ");
  console.log(projection);
  ZipDistance.find(query, projection)
  .then(dbres=>{
     console.log(dbres);
     return res.json(dbres)}
   )
  .catch(err=>{
     console.log('Error in db read', err);
     res.status(500).json({err})
  });
});

app.listen(9000, ()=>console.log("Server listening...."));
