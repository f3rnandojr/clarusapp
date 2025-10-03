import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const DB_NAME = 'cleanflow';

// @ts-ignore
let cachedClient: MongoClient = global.mongoClient;
// @ts-ignore
let cachedDb: Db = global.mongoDb;

async function seedDatabase(db: Db) {
    const usersCollection = db.collection('users');
    const adminUser = await usersCollection.findOne({ login: 'admin' });

    if (!adminUser) {
        console.log('Admin user not found, creating one...');
        await usersCollection.insertOne({
            name: "Administrador",
            login: "admin",
            password: "admin",
            active: true,
            createdAt: new Date(),
        });
        console.log('Admin user created successfully.');
    }
}

export async function dbConnect(): Promise<Db> {
  console.log('🔄 dbConnect() chamado - cachedDb existe?', !!cachedDb);
  
  if (cachedDb) {
    console.log('✅ Usando conexão cacheada');
    return cachedDb;
  }

  console.log('🔗 Criando nova conexão MongoDB...');

  if (!cachedClient) {
    cachedClient = await MongoClient.connect(MONGODB_URI!);
    // @ts-ignore
    global.mongoClient = cachedClient;
  }
  
  const db = cachedClient.db(DB_NAME);
  await seedDatabase(db);

  cachedDb = db;
  // @ts-ignore
  global.mongoDb = cachedDb;
  
  console.log('✅ Nova conexão MongoDB criada e cacheada');
  return db;
}
