import pkg from "firebase-admin";

const formattedPrivateKey = process.env.FIREBASE_CONFIG_PRIVATE_KEY;
const serviceAccountRaw = {
  type: process.env.FIREBASE_CONFIG_TYPE,
  project_id: process.env.FIREBASE_CONFIG_PROJECT_ID,
  private_key_id: process.env.FIREBASE_CONFIG_PRIVATE_KEY_ID,
  private_key: formattedPrivateKey, // Replace escaped newline characters
  client_email: process.env.FIREBASE_CONFIG_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CONFIG_CLIENT_ID,
  auth_uri: process.env.FIREBASE_CONFIG_AUTH_URI,
  token_uri: process.env.FIREBASE_CONFIG_TOKEN_URI,
  auth_provider_x509_cert_url:
    process.env.FIREBASE_CONFIG_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CONFIG_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_CONFIG_UNIVERSE_DOMAIN,
};

pkg.initializeApp({
  credential: pkg.credential.cert(serviceAccountRaw),
  storageBucket: "ac-service-34683.appspot.com",
  databaseURL: "https://ac-service-34683-default-rtdb.firebaseio.com/",
});

const database = pkg.database();

const bucket = pkg.storage().bucket();


export { pkg as firebase, bucket , database };