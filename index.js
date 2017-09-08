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

app.post('/zipdistances/one-to-many', (req,res)=>{
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
  .then(dbres=>res.json(dbres))
  .catch(err=>res.status(500).json({err}));
});

app.listen(9000, ()=>console.log("Server listening...."));
