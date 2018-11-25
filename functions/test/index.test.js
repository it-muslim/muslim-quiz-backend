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
const serviceAccountKeyPath = '/Users/aminbenarieb/Repo/muslim-quiz-backend/functions/test/muslim-quiz-dev-56eb0ebec919.json';
const test = require('firebase-functions-test')(config, serviceAccountKeyPath);
test.mockConfig({ stripe: { key: '23wr42ewr34' }}); // Mock functions config values


describe('Cloud Functions', () => {
    let myFunctions;

    before(() => {
        // Require index.js and save the exports inside a namespace called myFunctions.
        // This includes our cloud functions, which can now be accessed at myFunctions.makeUppercase
        // and myFunctions.addMessage
        myFunctions = require('../src/index.ts');
    });

    after(() => {
        // Do cleanup tasks.
        test.cleanup();
        // Reset the database.
        admin.database().ref('users').remove();
    });

    describe('auth', () => {
        it('should return a 303 redirect', (done) => {
            // A fake request object, with req.query.text set to 'input'
            const req = { query: {email: 'foo@foo.foo', password: 'foo'} };
            // A fake response object, with a stubbed redirect function which does some assertions
            const res = {
                redirect: (code, url) => {
                    // Assert code is 303
                    assert.equal(code, 303);
                    // If the database push is successful, then the URL sent back will have the following format:
                    const expectedRef = new RegExp(config.databaseURL + '/users/');
                    assert.isTrue(expectedRef.test(url));
                    done();
                }
            };

            // Invoke addMessage with our fake request and response objects. This will cause the
            // assertions in the response object to be evaluated.
            myFunctions.auth(req, res);
        });
    });

});