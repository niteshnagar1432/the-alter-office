// import { createClient } from 'redis';
const { createClient } = require('redis');

const client = createClient({
  username: 'default', // Replace 'default' with your Redis username if different
  password: 'B1sJfHHuiN3mTYEkOpsKrtWIBQzX8PjJ', // Replace '*******' with your Redis password
  socket: {
    host: 'redis-16956.c52.us-east-1-4.ec2.redns.redis-cloud.com', // Redis host
    port: 16956, // Redis port
  },
});

// Handle connection errors
client.on('error', (err) => console.log('Redis Client Error:', err));

// Connect to Redis
const connectRedis = async () => {
  try {
    await client.connect();
    console.log('Connected to Redis');
  } catch (err) {
    console.error('Error connecting to Redis:', err);
  }
};

connectRedis();

module.exports = client;
