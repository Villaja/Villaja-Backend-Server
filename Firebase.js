const { getDatabase, ref, set, get, child } = require('firebase/database');
const { initializeApp } = require('firebase/app');

const firebaseConfig = {
    apiKey: "AIzaSyBhTBYrSWCKg4w5aUQ2pNM8WjKkkZ3lT6w",
    authDomain: "villaja-mobile-app-server.firebaseapp.com",
    projectId: "villaja-mobile-app-server",
    storageBucket: "villaja-mobile-app-server.firebasestorage.app",
    messagingSenderId: "876380138619",
    appId: "1:876380138619:web:8fb619c99be0c2422ec6de",
    measurementId: "G-YW6ZMKMD42",
    databaseURL: "https://villaja-mobile-app-server-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db);

const saveToken = async (userId, token) => {
    try {
        const values = (await get(child(dbRef, `userTokens/${userId}/`))).val() ?? {};
        const payload = { ...values, token };
        await set(ref(db, `userTokens/${userId}/`), payload);
        return true;
    } catch (error) {
        console.error('Firebase saveToken error:', error);
        throw error;
    }
};

const getToken = async (userId) => {
    try {
        const values = (await get(child(dbRef, `userTokens/${userId}`))).val();
        return values ?? {};
    } catch (error) {
        console.error('Firebase getToken error:', error);
        throw error;
    }
};

module.exports = { app, saveToken, getToken };
