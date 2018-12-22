const chai = require('chai');
const assert = chai.assert;
const admin = require('firebase-admin');
let config = {
    apiKey: "AIzaSyCku7TiMsm_1lBce5U0_VOjOGIYQ3bU4nY",
    authDomain: "muslim-quiz-dev.firebaseapp.com",
    databaseURL: "https://muslim-quiz-dev.firebaseio.com",
    projectId: "muslim-quiz-dev",
    storageBucket: "muslim-quiz-dev.appspot.com",
    messagingSenderId: "7170887849"
};
const serviceAccountKeyPath = `${__dirname}/muslim-quiz-dev-56eb0ebec919.json`;
const test = require('firebase-functions-test')(config, serviceAccountKeyPath);

describe('Cloud Functions', () => {
    let myFunctions;
    let userId, partnerId;
    let gameId;
    let roundId;

    before(() => {
        myFunctions = require('../src/index.ts');

        const db = admin.database();
        db.ref('games').remove();
        db.ref('rounds').remove();
        db.ref('topics').remove();
        db.ref('questions').remove();
        db.ref('users').remove();
        db.ref('round_statuses').remove();
        db.ref('game_statuses').remove();

        let testJSON = require(`${__dirname}/test-database.json`);
        db.ref('/').set(testJSON);
        const usersRef = db.ref('/users');
        userId = usersRef.push({email: 'foo@foo.foo', password: 'foo'}).key;
        partnerId = usersRef.push({email: 'bar@bar.bar', password: 'bar'}).key;
        console.log(`Created user ${userId} and partner ${partnerId}`);
    });
    after(() => {
        test.cleanup();
    });

    describe('auth', () => {
        it('Testing auth', (done) => {
            const req = { query: {email: 'foo@foo.foo', password: 'foo'} };
            const res = {
                redirect: (code, url) => {
                    assert.equal(code, 303);
                    const expectedRef = new RegExp(config.databaseURL + '/users/');
                    assert.isTrue(expectedRef.test(url));
                    done();
                }
            };

            myFunctions.auth(req, res);
        });
    });
    describe('invite_users_to_game', () => {
        it('Testing invitation to game', (done) => {
            const req = { query: {initiator: userId, users: [partnerId]} };
            const res = {
                status: (code) => {
                    assert.equal(code, 200);
                    return res
                },
                json: (body) => {
                    gameId = body.key;
                    status = body.game.status;
                    assert.isDefined(gameId, "gameId is not defined!");
                    assert.equal(status, "waiting", "wrong game status");
                    done();
                }
            };

            myFunctions.invite_users_to_game(req, res);
        });
    });
    describe('accept_invitation_to_game', () => {
        it('Testing accepting invitation to game', (done) => {
            const req = {query: {game_id: gameId}};
            const res = {
                status: (code) => {
                    assert.equal(code, 200);
                    return res
                },
                json: (body) => {
                    roundId = body.game.rounds[0];
                    assert.isDefined(body.game.startDate, "game startDate is not defined!");
                    assert.isDefined(roundId, "game first roundId is not defined!");
                    done();
                }
            };

            myFunctions.accept_invitation_to_game(req, res);
        });
    });
    describe('start_dame', () => {
        it('Testing starting a game', (done) => {
            const req = {query: {user_id: userId, round_id: roundId}};
            const res = {
                status: (code) => {
                    assert.equal(code, 200);
                    return res
                },
                json: (body) => {
                    assert.isDefined(body.startDate, "round startDate is not defined!");
                    done();
                }
            };

            myFunctions.start_dame(req, res);
        });
    });
    describe('answer_quiz', () => {
        it('Testing correct answer', (done) => {
            const req = {query:
                    {
                        user_id: userId,
                        round_id: roundId,
                        question_id: 'test_question1',
                        answer_id: 'test_answer1'
                    }
            };
            const res = {
                status: (code) => {
                    assert.equal(code, 200);
                    return res
                },
                json: (body) => {
                    assert.isTrue(body.correct);
                    assert.equal(body.score, 10);
                    done();
                }
            };

            myFunctions.answer_quiz(req, res);
        });
    });
    describe('answer_quiz', () => {
        it('Testing incorrect answer', (done) => {
            const req = {query:
                    {
                        user_id: userId,
                        round_id: roundId,
                        question_id: 'test_question1',
                        answer_id: 'test_answer2'
                    }
            };
            const res = {
                status: (code) => {
                    assert.equal(code, 200);
                    return res
                },
                json: (body) => {
                    assert.isFalse(body.correct);
                    assert.equal(body.score, 0);
                    done();
                }
            };

            myFunctions.answer_quiz(req, res);
        });
    });

});