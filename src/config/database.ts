import mongoose from 'mongoose';

const APP_ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const MONGODB_URI =
  APP_ENV === 'production'
    ? process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI
    : process.env.MONGODB_URI_DEVELOPMENT || process.env.MONGODB_URI;
const MONGODB_DB_NAME =
  APP_ENV === 'production'
    ? process.env.MONGODB_DB_NAME_PRODUCTION || process.env.MONGODB_DB_NAME || 'mr-trading'
    : process.env.MONGODB_DB_NAME_DEVELOPMENT || process.env.MONGODB_DB_NAME || 'mr-trading';

if (!MONGODB_URI) {
  throw new Error(
    `Please define the ${
      APP_ENV === 'production' ? 'MONGODB_URI_PRODUCTION' : 'MONGODB_URI_DEVELOPMENT'
    } environment variable`
  );
}

const encodeCredentialPart = (value: string): string => {
  let encoded = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const maybeEncoded = value.slice(index, index + 3);

    if (/^%[0-9a-fA-F]{2}$/.test(maybeEncoded)) {
      encoded += maybeEncoded;
      index += 2;
    } else {
      encoded += encodeURIComponent(char);
    }
  }

  return encoded;
};

const normalizeMongoUri = (uri: string): string => {
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  const schemeEnd = uri.indexOf('://') + 3;
  const authEnd = uri.lastIndexOf('@');

  if (authEnd <= schemeEnd) {
    return uri;
  }

  const auth = uri.slice(schemeEnd, authEnd);
  const passwordStart = auth.indexOf(':');

  if (passwordStart === -1) {
    return uri;
  }

  const username = auth.slice(0, passwordStart);
  const password = auth.slice(passwordStart + 1);
  const normalizedAuth = `${encodeCredentialPart(username)}:${encodeCredentialPart(password)}`;

  return `${uri.slice(0, schemeEnd)}${normalizedAuth}${uri.slice(authEnd)}`;
};

const NORMALIZED_MONGODB_URI = normalizeMongoUri(MONGODB_URI);

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB_NAME,
    };

    cached.promise = mongoose
      .connect(NORMALIZED_MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('✓ Database connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('✗ Database connection failed:', error);
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
