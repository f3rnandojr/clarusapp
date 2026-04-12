import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkLocations() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('clarusdb');
    const locations = await db.collection('locations').find({}).limit(10).toArray();
    console.log('Locations in MongoDB:');
    locations.forEach(loc => {
      console.log(`ID: ${loc._id}, Name: ${loc.name}, Number: ${loc.number}, ExternalCode: ${loc.externalCode}, Status: ${loc.status}`);
    });
  } finally {
    await client.close();
  }
}

checkLocations().catch(console.error);