const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const assert = require('assert');
const http = require('http');
const url = require('url');
const fs=require('fs');

const express = require('express');
const app = express();

const formidable = require('express-formidable');
const session = require('cookie-session');
const bodyParser = require('body-parser');
 
const mongourl = 'mongodb+srv://martin:990918@cluster0.xcfdq.mongodb.net/project?retryWrites=true&w=majority';
const dbName = 'project';

const SECRETKEY = "COMPS381F"

const users = new Array(
	{name: 'demo'},
	{name: 'student'}
);

/*app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));*/

app.use(formidable());


app.use(session({
	  name: 'loginSession',
	  keys: [SECRETKEY]
}));

app.set("view engine","ejs");



// support parsing of application/json type post data

/*app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));*/

const findDocument = (db,criteria, callback) => {
    let cursor = db.collection('restaurant').find(criteria);
    cursor.toArray((err,docs) => {
        assert.equal(err,null);
        callback(docs);
    });
}

const handle_Find = (res,req, criteria) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("handle Find - Connected successfully to server");
        const db = client.db(dbName);
        findDocument(db,criteria, (docs) => {
            client.close();
            console.log("handle Find - Closed DB connection");
            res.status(200).render('find',{nRestaurant: docs.length, criteria: JSON.stringify(criteria) , restaurant: docs, user:req.session.username});
        });
	
    });
}


const handle_Edit = (res,req,criteria) => {
	const client = new MongoClient(mongourl);
	client.connect((err)=>{
		assert.equal(null,err);
		console.log("handle Edit - Successfully connected to server");
		const db = client.db(dbName);
		let DOCID = {};
		DOCID['_id'] = ObjectID(criteria._id);
		let cursor = db.collection('restaurant').find(DOCID);
		cursor.toArray((err,docs)=>{
			client.close()
			assert.equal(err,null);
			if(docs[0].owner == req.session.username){
				res.status(200).render('edit',{restaurant : docs[0]})
			}
			else{
				res.status(200).render('info',{message: `You can't edit it! The owner of the document is "${docs[0].owner}", you are  you are not the owner.`});
			}
		})
	})
}

const handle_Details = (res,req,criteria) => {
	const client = new MongoClient(mongourl);
	client.connect((err)=>{
		assert.equal(err,null);
		console.log("handle Details - Sucessfully connected to server ");
		const db = client.db(dbName);
		let DOCID = {};
		DOCID['_id'] = ObjectID(criteria._id)
		findDocument(db,DOCID,(docs)=>{
			client.close();
			res.status(200).render('details',{restaurant:docs[0],user:req.session.username})
		});
	})
}

const updateDocument = (criteria, updateDoc, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').updateOne(criteria,
            {
                $set : updateDoc
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const pushDocument = (criteria, element, callback) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
        assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);

         db.collection('restaurant').updateOne(criteria,
            {
                $push : {grades:element}
            },
            (err, results) => {
                client.close();
                assert.equal(err, null);
                callback(results);
            }
        );
    });
}

const handle_Update = (req,res,criteria) => {
	var DOCID = {};
	DOCID['_id'] = ObjectID(req.fields._id);
	var updateDoc = {};
	updateDoc[`address`] = {};
	updateDoc['name'] = req.fields.name;
	updateDoc['borough'] = req.fields.borough;
	updateDoc['cuisine'] = req.fields.cuisine;
	updateDoc['street'] = req.fields.street;
	updateDoc['mimetype'] = req.fields.mimetype;
	updateDoc[`address`][`street`] = req.fields.street;
	updateDoc[`address`][`building`] = req.fields.building;
	updateDoc[`address`][`zipcode`] = req.fields.zipcode;
	updateDoc[`address`][`coord`] = [req.fields.coordx,req.fields.coordy];
	 if (req.files.filetoupload.size > 0){
		fs.readFile(req.files.filetoupload.path, (err,data) =>{
			assert.equal(err,null);
			updateDoc['photo'] = new Buffer.from(data).toString('base64');
			updateDocument(DOCID,updateDoc, (results)=>{
				res.status(200).render('info', {message: `Upadted ${results.result.nModified} document(s)`})
			})
		})
	} else{
		updateDocument(DOCID,updateDoc, (results)=>{
			res.status(200).render('info', {message: `Upadted ${results.result.nModified} document(s)`});
		})

	}
}
const insertDocument = (db, doc,callback) => {
	 db.collection('restaurant').insertOne(doc, (err, results) => {
	 assert.equal(err,null);
	 console.log("inserted one document " + JSON.stringify(doc));
	 callback(doc);
	 });
}

const handle_Create = (req,res,criteria) => {
	const client = new MongoClient(mongourl);
	client.connect((err)=>{
		assert.equal(err,null);
		const db = client.db(dbName);
		var newDoc = {}
		newDoc[`address`] = {}
		newDoc[`grades`] = {}
		newDoc[`name`] = req.fields.name;
		newDoc[`borough`] = req.fields.borough;
		newDoc[`cuisine`] = req.fields.cuisine;
		newDoc[`mimetype`] = req.fields.mimetype;
		newDoc[`address`][`street`] = req.fields.street;
		newDoc[`address`][`building`] = req.fields.building;
		newDoc[`address`][`zipcode`] = req.fields.zipcode;
		newDoc[`address`][`coord`] = [req.fields.coordx,req.fields.coordy];
		newDoc[`grades`] = [{"users": req.session.username,"score": req.fields.score}];
		newDoc[`owner`] = req.session.username;
		if (req.files.filetoupload.size > 0){
			fs.readFile(req.files.filetoupload.path, (err,data)=>{
				assert.equal(err,null);
				newDoc['photo'] = new Buffer.from(data).toString('base64');
				insertDocument(db,newDoc,(result)=>{
				client.close();
				res.redirect('/find')
				//res.status(200).render('info',{message:`${JSON.stringify(result)}`})
				})
			})
		}
		else{
			insertDocument(db,newDoc,(result)=>{
			client.close();
			res.redirect('/find')
			//res.status(200).render('info',{message:`${JSON.stringify(result)}`})
			})
		}
		
	})
}

const handle_Search = (res,criteria) => {
	selected = criteria.selected
	search = criteria.search
	res.redirect(`/find?${selected}=${search}`)
}

const deleteDocument = (db, criteria, callback) => {
    db.collection('restaurant').deleteOne(criteria, (err,results) => {
        assert.equal(err,null);
        console.log('deleteOne was successful');
	callback(results);
    })

}

const handle_Delete = (res, criteria, owner) => {
    const client = new MongoClient(mongourl);
    client.connect((err) => {
	assert.equal(null, err);
        console.log("Connected successfully to server");
        const db = client.db(dbName);
	let DOCID = {};
	DOCID['_id'] = ObjectID(criteria._id)
    	findDocument(db,DOCID, (docs) => {     
            console.log("handle Find - Closed DB connection");
	    let documentName = docs[0].name;
            if(docs[0].owner == owner){
                deleteDocument(db,DOCID, (results)=> {
                    client.close();
		    res.status(200).render('info',{message:`You have deleted a document (Name: ${documentName})`});	
                })
            }
            else {
		res.status(200).render('info',{message:`You are not the owner! You can't delete it`});
            }
        }); 
    });
}

//peter work for q4
const handle_Rate = (res,req,criteria) => {
	const client = new MongoClient(mongourl);
	client.connect((err) => {
		assert.equal(null,err);
		console.log("Connected sunccessfully to server");
		const db = client.db(dbName);
		let duplicateFlag = false;
		var DOCID = {};
		DOCID['_id'] = ObjectID(criteria._id);
		findDocument(db,DOCID,(result)=>{
			//let originalGrades = result;
			for (let element of result[0].grades){
				console.log(element.users +";" +req.session.username);
				if(element.users == req.session.username){
					duplicateFlag = true;
					console.log("they are the same");
				}
			}
			//console.log("the final :"+duplicateFlag);
			if(duplicateFlag){
				res.status(200).render('info',{message:"You have rated before"});
			} else{
				res.status(200).render('rate',{_id:criteria._id});
			}
		})
		
	});
}

const handle_updateRate = (res,req,criteria) => {
	const client = new MongoClient(mongourl);
	var DOCID = {};
	DOCID['_id'] = ObjectID(criteria._id);
	client.connect((err) => {
		assert.equal(null,err);
		console.log("Connected sunccessfully to server");
		const db = client.db(dbName);
		let rate = req.query.rate;
		let name = req.session.username;
		let grade = {"users":name, "score":rate};
		let gradeStr = JSON.stringify(grade);
		console.log("The DOCID:"+JSON.stringify(DOCID));
		pushDocument(DOCID,grade,(results)=>{
				res.status(200).render('info', {message: `Pushed ${gradeStr} into grades of document. ${results.result.nModified}`})
		})

	});
}


app.get('/updateRate',function(req,res){
	handle_updateRate(res,req,req.query);
});

app.get('/find', function(req,res){
	handle_Find(res,req,req.query);	
});

app.get('/new', (req,res)=>{
	res.status(200).render('new',{user: req.session.username});
})

app.post('/create', (req,res)=>{
	handle_Create(req,res,req.query);
});

app.get('/details', (req,res) => {
   	handle_Details(res,req,req.query);
})

//peter work for q4

app.get('/rate', (req,res) => {
	handle_Rate(res,req,req.query);
})

app.get('/updateRate', (req,res)=>{
	handle_updateRate(res,req,req.query);
})

app.get('/edit', (req,res)=>{
	handle_Edit(res,req,req.query);
})

app.get('/delete', (req,res)=>{
	handle_Delete(res,req.query,req.session.username);
})

app.get("/map", (req,res) => {
	res.render("leaflet.ejs", {
		lat:req.query.coordx,
		lon:req.query.coordy,
		zoom:req.query.zoom ? req.query.zoom : 15
	});
	res.end();
});

app.get("/search", (req,res) => {
	console.log("Started to handle Search")
	handle_Search(res,req.query);
});

app.post('/update', (req,res)=>{
	handle_Update(req,res, req.query);
});

app.get('/api/restaurant/name/:name', (req,res)=>{
	DOC = {};
	DOC[`name`] = req.params.name
	console.log(JSON.stringify(DOC));
	const client = new MongoClient(mongourl);
	client.connect((err) =>{
		assert.equal(err,null);
		const db = client.db(dbName);
		findDocument(db, DOC, (docs) => {
		    client.close();
		    console.log("handle Find - Closed DB connection");
		    res.status(200).json(docs);
		});
	});
})
app.get('/api/restaurant/borough/:borough', (req,res)=>{
	DOC = {};
	DOC[`borough`] = req.params.borough
	const client = new MongoClient(mongourl);
	client.connect((err) =>{
		assert.equal(err,null);
		const db = client.db(dbName);
		findDocument(db, DOC, (docs) => {
		    client.close();
		    console.log("handle Find - Closed DB connection");
		    res.status(200).json(docs);
		});
	});
})
app.get('/api/restaurant/cuisine/:cuisine', (req,res)=>{
	DOC = {};
	DOC[`cuisine`] = req.params.cuisine
	const client = new MongoClient(mongourl);
	client.connect((err) =>{
		assert.equal(err,null);
		const db = client.db(dbName);
		findDocument(db, DOC, (docs) => {
		    client.close();
		    console.log("handle Find - Closed DB connection");
		    res.status(200).json(docs);
		});
	});
})

app.get('/login', (req,res) => {
	res.status(200).render('login',{});
});

app.post('/login', (req,res) => {
	users.forEach((user) => {
		if (user.name == req.fields.name) {
			// correct user name + password
			// store the following name/value pairs in cookie session	
			req.session.authenticated = true;        // 'authenticated': true
			req.session.username = req.fields.name;	 // 'username': req.body.name	
			
		}
	});
	res.redirect('/');
});

app.get('/logout', (req,res) => {
	req.session = null;   // clear cookie-session
	res.redirect('/');
});

app.get('/', (req,res) => {
	if (!req.session.authenticated) {    // user not logged in!
		res.redirect('/login');
	} 
	else {
		res.redirect('/find');
	}
});

app.get('/*', (req,res)=> {
	res.status(404).render('info', {message: `${req.path} - Unknown request`});
})

app.listen(process.env.PORT || 8099);
