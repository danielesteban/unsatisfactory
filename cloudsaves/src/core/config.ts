import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080').split(',');
export const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1/cloudsaves';
export const port = process.env.PORT || 8081;
export const production = process.env.NODE_ENV === 'production';
export const sessionSecret = process.env.SESSION_SECRET || 'superunsecuresecret';

if (
  production && sessionSecret === 'superunsecuresecret'
) {
  console.warn('\nSecurity warning:\nYou must provide a random SESSION_SECRET.\n');
}
