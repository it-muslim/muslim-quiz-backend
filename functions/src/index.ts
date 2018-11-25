const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

exports.auth = functions.https.onRequest((req, res) => {
        const email = req.query.email;
        const password = req.query.password;
        console.log('Logging in via email', email)
        return admin.database().ref('/users').push({email: email, password: password}).then((snapshot) => {
            // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
            console.log('Redirecting with status 303 to', snapshot.ref.toString())
            return res.redirect(303, snapshot.ref.toString());
        });
    })

