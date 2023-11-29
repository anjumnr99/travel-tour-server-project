


const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());
// app.use(cookieParser());
// app.use(cors({
//   origin: ['http://localhost:5173','https://travel-tour-auth.web.app'],
//   credentials: true,

// }));







const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7nwjyzo.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const packageCollection = client.db("travelTourDB").collection("packages");
    const guideCollection = client.db("travelTourDB").collection("guides");
    const bookingCollection = client.db("travelTourDB").collection("bookings");
    const reviewCollection = client.db("travelTourDB").collection("reviews");
    const storyCollection = client.db("travelTourDB").collection("stories");
    const wishListCollection = client.db("travelTourDB").collection("wishLists");
    const userCollection = client.db("travelTourDB").collection("users");

    //jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log('jwt', token);
      res.send({ token });
    });

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Forbidden Access' })
      }

      const token = req.headers.authorization.split(' ')[1];
      console.log('Token:', req.headers.authorization);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden Access" })
        }
        req.decoded = decoded;
        next();
      })

    };
    //Use Verify Admin after verify token
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      next();
    }


    // const verifyToken = async (req, res, next) => {
    //   const token = req.cookies?.token;
    //   console.log('Value of token in the middleware', token);
    //   if (!token) {
    //     return res.status(401).send({ message: "Unauthorized" })
    //   }

    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    //     if (err) {
    //       return res.status(403).send({ message: "Forbidden Access" })
    //     }
    //     // if token is valid it would be in the decode
    //     console.log('Value in the token is : ', decode);
    //     req.userInfo = decode;

    //     next();
    //   })
    // }

    //Use Verify Admin after verify token
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded?.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isAdmin = user?.role === 'admin';
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: 'Forbidden access' })
    //   }
    //   next();
    // }


    // auth related API

    // app.post('/jwt', async (req, res) => {
    //   const user = req.body;
    //   console.log(user);
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
    //   res       // setting the token in cookie
    //     .cookie('token', token, {
    //       httpOnly: true,
    //       secure: true,
    //       sameSite: 'none'
    //     })
    //     .send({ success: true })
    // });



    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: 'Unauthorized Access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';

      }
      console.log('isAdmin', admin);
      res.send({ admin })
    });

    app.get('/users/guide/:email', verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: 'Unauthorized Access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let tourGuide = false;
      if (user) {
        tourGuide = user?.role === 'guide';
      }
      console.log('isGuide', tourGuide);
      res.send({ tourGuide })
    })




    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body;
      // insert email if user doesn't exist
      const query = { email: user?.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);

      res.send(result);
    })
    app.patch('/users/guide/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'guide'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);

      res.send(result);
    })




    app.get('/packages', async (req, res) => {
      const result = await packageCollection.find().toArray();
      res.send(result);
    });

    app.get('/allUsers', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post('/packages', async (req, res) => {
      const newPackage = req.body;
      const result = await packageCollection.insertOne(newPackage);
      res.send(result);
    });

    app.get('/packages/:id', async (req, res) => {
      const ids = req.params.id;
      const query = { _id: new ObjectId(ids) }
      const result = await packageCollection.findOne(query)
      res.send(result)
    });

    app.get('/guides', async (req, res) => {
      const result = await guideCollection.find().toArray();
      res.send(result);
    });
    app.get('/stories', async (req, res) => {
      const result = await storyCollection.find().toArray();
      res.send(result);
    });
    app.get('/stories/:id', async (req, res) => {
      const ids = req.params.id;
      const query = { _id: new ObjectId(ids) }
      const result = await storyCollection.findOne(query);
      res.send(result);
    });

    app.get('/guides/:id', async (req, res) => {
      const ids = req.params.id;
      const query = { _id: new ObjectId(ids) }
      const result = await guideCollection.findOne(query)
      res.send(result)
    });
    app.post('/guides', verifyToken,verifyAdmin, async (req, res) => {
      const newGuides = req.body;
      const result = await guideCollection.insertOne(newGuides);
      res.send(result);
    });

    app.post('/bookings', verifyToken, async (req, res) => {
      const booked = req.body;
      const result = await bookingCollection.insertOne(booked);
      res.send(result);
    });
    app.get('/bookings', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    app.post('/stories', async (req, res) => {
      const story = req.body;
      const result = await storyCollection.insertOne(story);
      res.send(result);
    });

    app.post('/reviews', async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.post('/wishLists', async (req, res) => {
      const wishList = req.body;
      const result = await wishListCollection.insertOne(wishList);
      res.send(result);
    });

    app.get('/bookings/users', async (req, res) => {
      console.log(req.query?.email);
      const query ={email: req.query.email}
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/wishLists', async (req, res) => {
      console.log(req.query.email);
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    });

    app.delete('/wishLists/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await wishListCollection.deleteOne(query);
      res.send(result);
    });
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.patch('/bookings/guide/reject/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Rejected'
        }
      }
      const result = await bookingCollection.updateOne(filter, updatedDoc);

      res.send(result);
    });

    app.patch('/bookings/guide/accept/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'Accepted'
        }
      }
      const result = await bookingCollection.updateOne(filter, updatedDoc);

      res.send(result);
    });




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Travel Tour is running!')
})

app.listen(port, () => {
  console.log(`Travel Tour is running on port ${port}`)
})