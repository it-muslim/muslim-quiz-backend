const kRoundCount = 3;
const functions = require('firebase-functions');
const admin = require('firebase-admin'); admin.initializeApp();
const db = admin.database();

function isAnswerCorrect(answerId, questionId, topic) {
    const question = topic.questions[questionId];
    const answers = Object.keys(question.answers);
    const rightAnswerId = answers[0];
    return rightAnswerId === answerId;
}

function calculateScore(user, score, answerWasCorrect) {
    return score + (10 * (answerWasCorrect ? 1 : -1))
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
        partner_id: partnerId
    }).then((gameReference) => {
        const topicsRef = db.ref('/topics');
        return topicsRef.once('value').then( (topicsSnapshot) => {
            const topics = topicsSnapshot.val();
            const keys = Object.keys(topics);
            return keys
                .sort( function() { return 0.5 - Math.random() } )
                .slice(0, kRoundCount);
            //TODO: exclude already passed quizzes
        }).then( (topicKeys) => {
            const usersDict = [userId, partnerId].reduce((result, id) => {
                result[id] = {score: 0};
                return result;
            }, {});
            return topicKeys.map(function(topicKey) {
                return db.ref('/rounds').push({
                    users: usersDict,
                    quiz: topicKey
                }).key;
            })
        }).then((roundRefs) => {
            return gameReference.child('rounds').set(roundRefs).then((roundReference) => {
                return gameReference.once("value").then(function(gameSnapshot) {
                    const key = gameSnapshot.key;
                    const gameJSON = gameSnapshot.toJSON();
                    return res.status(200).json({
                        key: key,
                        game: gameJSON});
                });
            })
        });
    });
});

exports.accept_invitation_to_game = functions.https.onRequest((req, res) => {
    const gameId = req.query.game_id;
    const gameRef = db.ref(`games/${ gameId }`);
    return gameRef.child('startDate').set(admin.database.ServerValue.TIMESTAMP).then( () => {
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
    const roundId = req.query.round_id;
    const answerId = req.query.answer_id;
    const questionId = req.query.question_id;

    const userRef = db.ref(`rounds/${roundId}/users/${userId}`);
    const roundRef = db.ref(`rounds/${ roundId }`);
    const scoreRef = roundRef.child(`users/${userId}/score`);

    let score = undefined;
    let answerWasCorrect = undefined;

    // 1. saving user answer for round
    roundRef.child(`users/${userId}/answer`).set(answerId)
        .then(() => {
            // 2. Checking answer
            return roundRef.child('quiz').once('value')
        })
        .then((quizIdSnapshot) => {
            const topicId = quizIdSnapshot.val();
            return db.ref(`topics/${ topicId }`).once('value')
        })
        .then((topicSnapshot) => {
            const topic = topicSnapshot.toJSON();
            answerWasCorrect = isAnswerCorrect(answerId, questionId, topic);

            // 3. Calculating score
            return scoreRef.once('value')
        })
        .then((scoreSnapshot) => {
            score = scoreSnapshot.val();
            return userRef.once('value')
        })
        .then((userSnapshot) => {
            const user = userSnapshot.toJSON();
            const newScore = calculateScore(user, score, answerWasCorrect);
            return scoreRef.set(newScore);
        })
        .then(() => {
            res.status(200).json({ correct: true });
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send(error);
        });
});