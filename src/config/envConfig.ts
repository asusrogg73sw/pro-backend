import dotenv from 'dotenv';
dotenv.config();

const requiredEnvs = ['MONGO_URI', 'JWT_SECRET', 'STRIPE_SECRET_KEY'];

requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`Missing Environment Variable: ${env}`);
  }
});