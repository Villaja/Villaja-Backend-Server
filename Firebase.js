const { getDatabase, ref, set, get, child } = require('firebase/database');
const { initializeApp } = require('firebase/app');

const firebaseConfig = {
    apiKey: "AIzaSyDUYJQLyFl8nNXV4iHOgWwm-BRhiRTcASs",
    authDomain: "villaja-mobile-app-f64c8.firebaseapp.com",
    databaseURL: "https://villaja-mobile-app-f64c8-default-rtdb.firebaseio.com",
    projectId: "villaja-mobile-app-f64c8",
    storageBucket: "villaja-mobile-app-f64c8.firebasestorage.app",
    messagingSenderId: "1004254016559",
    appId: "1:1004254016559:web:7bac778c745373491382da",
    measurementId: "G-L6BBT81702"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase();
const dbRef = ref(db);

const saveToken = async (userId, token) => {
    const values = (await get(child(dbRef, `userTokens/${userId}/`))).val() ?? {};
    const payload = {...values, token};
    await set(ref(db, `userTokens/${userId}/`), payload);
};

const getToken = async (userId) => {
    const values = (await get(child(dbRef, `userTokens/${userId}`))).val();
    return values ?? {};
};

module.exports = { app, saveToken, getToken };
