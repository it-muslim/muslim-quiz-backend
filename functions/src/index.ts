const kRoundCount = 3;
const functions = require('firebase-functions');
const admin = require('firebase-admin'); admin.initializeApp();
const db = admin.database();

function generateQuiz() {
    const topicsRef = db.ref('/topics');
    return topicsRef.once('value').then( (snapshot) => {
        const topics = snapshot.val();
        const keys = Object.keys(topics);
        const randomKey = keys[keys.length * Math.random() << 0];
        return topicsRef.key;
    })
}
function generateRounds(users) {
    const roundRefs = [];
    for (let i = 0; i < kRoundCount; i++) {
        const quiz = generateQuiz(); //TODO: exclude already passed quizzes
        const roundRef = db.ref('/rounds').push({
            users: users.reduce((result, userId) => {
                result[userId] = {score: 0};
                return result;
            }, {}),
            quiz: quiz
        });
        roundRefs.push(roundRef.key)
    }
    return roundRefs;
}

exports.auth = functions.https.onRequest((req, res) => {
        const email = req.query.email;
        const password = req.query.password;
        return db.ref('/users').push({email: email, password: password}).then((snapshot) => {
            return res.redirect(303, snapshot.ref.toString());
        });
    });

exports.invite_user_to_game = functions.https.onRequest((req, res) => {
    const userId = req.query.user_id; //TODO: Get current user
    const partnerId = req.query.partner_id;

    return db.ref('games').push({
        user_id: userId,
        partner_id: partnerId,
        rounds: generateRounds([userId, partnerId])
    }).then((snapshot) => {

        // random selection n topics from /topics
        // then mapping each topic into round with setter in quiz
        // then set rounds to a game

        return snapshot.ref.once("value").then(function(gameSnapshot) {
            const key = gameSnapshot.key;
            const gameJSON = gameSnapshot.toJSON();
            return res.status(200).json({
                key: key,
                game: gameJSON });
        });
    });
});

exports.accept_invitation_to_game = functions.https.onRequest((req, res) => {
    const gameId = req.query.game_id;
    const gameRef = db.ref(`games/${ gameId }`);
    return gameRef.set({'startDate' : admin.database.ServerValue.TIMESTAMP}).then( () => {
        return gameRef.once('value');
    }).then((snapshot) => {
             const gameJSON = snapshot.toJSON();
             return res.status(200).json({ key: snapshot.key, game: gameJSON });
        })
});

exports.start_dame = functions.https.onRequest((req, res) => {
    const userId = req.query.user_id;
    const roundId = req.query.round_id;
    const startDateRef = db.ref(`rounds/${ roundId }/users/${userId}/startDate`);
    return startDateRef.set(admin.database.ServerValue.TIMESTAMP).then( () => {
        //TODO: schedule a callback on round time expiration
        return startDateRef.once('value');
    }).then((snapshot) => {
        const startDate = snapshot.val();
        return res.status(200).json({ startDate: startDate });
    })
});

exports.answer_quiz = functions.https.onRequest((req, res) => {
    const userId = req.query.user_id;
    const gameId = req.query.game_id;
    const roundId = req.query.round_id;
    const answerId = req.query.answer_id;

    const userRef = db.ref(`rounds/${roundId}/users/${userId}`);
    const gameRef = db.ref(`games/${ gameId }`);
    const roundRef = db.ref(`rounds/${ roundId }`);
    const topicRef = db.ref(`topics/${ roundId }`);

    // answer_id is correct?
    //

    return res.status(200).json({ correct: true });
});