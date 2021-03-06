import Utils from './utils';
import sinon from 'sinon';
import { urls, apiKey,
    testMPID,
    MPConfig } from './config';

var getEvent = Utils.getEvent,
    getLocalStorage = Utils.getLocalStorage, 
    MockForwarder = Utils.MockForwarder,
    mockServer;

describe('identities and attributes', function() {
    beforeEach(function() {
        mockServer = sinon.createFakeServer();
        mockServer.respondImmediately = true;

        mockServer.respondWith(urls.eventsV2, [
            200,
            {},
            JSON.stringify({ mpid: testMPID, Store: {}})
        ])
        mockServer.respondWith(urls.identify, [
            200,
            {},
            JSON.stringify({ mpid: testMPID, is_logged_in: false }),
        ]);
        mParticle.init(apiKey, window.mParticle.config);
    });

    afterEach(function() {
        mockServer.restore();
    });

    it('should set user attribute', function(done) {
        mParticle._resetForTests(MPConfig);
        var mockForwarder = new MockForwarder();

        mockForwarder.register(window.mParticle.config);
        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttribute('gender', 'male');

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');

        event.should.have.property('ua');
        event.ua.should.have.property('gender', 'male');

        var cookies = getLocalStorage();
        cookies[testMPID].ua.should.have.property('gender', 'male');

        done();
    });

    it('should set user attribute be case insensitive', function(done) {
        mParticle._resetForTests(MPConfig);
        var mockForwarder = new MockForwarder();

        mockForwarder.register(window.mParticle.config);
        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttribute('Gender', 'male');
        mParticle.Identity.getCurrentUser().setUserAttribute(
            'gender',
            'female'
        );

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');

        var cookies = getLocalStorage();
        cookies[testMPID].ua.should.have.property('gender', 'female');

        event.should.have.property('ua');
        event.ua.should.have.property('gender', 'female');
        event.ua.should.not.have.property('Gender');

        mParticle.Identity.getCurrentUser().setUserAttribute('Gender', 'male');

        mParticle.logEvent('test user attributes2');
        var event2 = getEvent(mockServer.requests, 'test user attributes2');
        event2.ua.should.have.property('Gender', 'male');
        event2.ua.should.not.have.property('gender');

        cookies = getLocalStorage();
        cookies[testMPID].ua.should.have.property('Gender', 'male');

        done();
    });

    it('should set multiple user attributes with setUserAttributes', function(done) {
        mParticle._resetForTests(MPConfig);
        var mockForwarder = new MockForwarder();

        mockForwarder.register(window.mParticle.config);
        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttributes({
            gender: 'male',
            age: 21,
        });

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');

        var cookies = getLocalStorage();
        cookies[testMPID].ua.should.have.property('gender', 'male');
        cookies[testMPID].ua.should.have.property('age', 21);

        event.should.have.property('ua');
        event.ua.should.have.property('gender', 'male');
        event.ua.should.have.property('age', 21);

        done();
    });

    it('should remove user attribute', function(done) {
        mParticle._resetForTests(MPConfig);
        var mockForwarder = new MockForwarder();

        mockForwarder.register(window.mParticle.config);
        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttribute('gender', 'male');
        mParticle.Identity.getCurrentUser().removeUserAttribute('gender');

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');
        event.should.not.have.property('gender');

        var cookies = getLocalStorage();
        Should(cookies[testMPID].ua).not.be.ok();

        done();
    });

    it('should remove user attribute case insensitive', function(done) {
        mParticle._resetForTests(MPConfig);
        var mockForwarder = new MockForwarder();

        mockForwarder.register(window.mParticle.config);
        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttribute('Gender', 'male');
        mParticle.Identity.getCurrentUser().removeUserAttribute('gender');

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');
        event.should.not.have.property('Gender');

        var cookies = getLocalStorage();
        Should(cookies[testMPID].ua).not.be.ok();

        done();
    });

    it('should set session attribute', function(done) {
        mParticle.setSessionAttribute('name', 'test');

        mParticle.logEvent('test event');

        var event = getEvent(mockServer.requests, 'test event');

        event.should.not.have.property('sa');

        mParticle.endSession();
        var sessionEndEvent = getEvent(mockServer.requests, 2);

        sessionEndEvent.attrs.should.have.property('name', 'test');

        done();
    });

    it('should set session attribute case insensitive', function(done) {
        mParticle.setSessionAttribute('name', 'test');
        mParticle.setSessionAttribute('Name', 'test1');

        mParticle.endSession();

        var sessionEndEvent = getEvent(mockServer.requests, 2);

        sessionEndEvent.attrs.should.have.property('name', 'test1');
        sessionEndEvent.attrs.should.not.have.property('Name');

        done();
    });

    it("should not set a session attribute's key as an object or array)", function(done) {
        mParticle.setSessionAttribute({ key: 'value' }, 'test');
        mParticle.endSession();
        var sessionEndEvent1 = getEvent(mockServer.requests, 2);

        mParticle.startNewSession();
        mockServer.requests = [];
        mParticle.setSessionAttribute(['test'], 'test');
        mParticle.endSession();
        var sessionEndEvent2 = getEvent(mockServer.requests, 2);

        Object.keys(sessionEndEvent1.attrs).length.should.equal(0);
        Object.keys(sessionEndEvent2.attrs).length.should.equal(0);

        done();
    });

    it('should remove session attributes when session ends', function(done) {
        mParticle.startNewSession();
        mParticle.setSessionAttribute('name', 'test');
        mParticle.endSession();

        mockServer.requests = [];
        mParticle.startNewSession();
        mParticle.endSession();

        var sessionEndEvent = getEvent(mockServer.requests, 2);

        sessionEndEvent.attrs.should.not.have.property('name');

        done();
    });

    it('should set and log position', function(done) {
        mParticle.setPosition(34.134103, -118.321694);
        mParticle.logEvent('test event');

        var event = getEvent(mockServer.requests, 'test event');

        event.should.have.property('lc');
        event.lc.should.have.property('lat', 34.134103);
        event.lc.should.have.property('lng', -118.321694);

        done();
    });

    it('should set user tag', function(done) {
        mParticle.Identity.getCurrentUser().setUserTag('test');

        mParticle.logEvent('test event');

        var event = getEvent(mockServer.requests, 'test event');

        event.should.have.property('ua');
        event.ua.should.have.property('test', null);

        var cookies = getLocalStorage();
        cookies[testMPID].ua.should.have.property('test');

        done();
    });

    it('should set user tag case insensitive', function(done) {
        mParticle.Identity.getCurrentUser().setUserTag('Test');
        mParticle.Identity.getCurrentUser().setUserTag('test');

        mParticle.logEvent('test event');

        var event = getEvent(mockServer.requests, 'test event');

        event.should.have.property('ua');
        event.ua.should.not.have.property('Test');
        event.ua.should.have.property('test');

        var cookies = getLocalStorage();
        cookies[testMPID].ua.should.have.property('test');

        done();
    });

    it('should remove user tag', function(done) {
        mParticle.Identity.getCurrentUser().setUserTag('test');
        mParticle.Identity.getCurrentUser().removeUserTag('test');

        mParticle.logEvent('test event');

        var event = getEvent(mockServer.requests, 'test event');

        event.should.have.property('ua');
        event.ua.should.not.have.property('test');

        var cookies = getLocalStorage();
        Should(cookies[testMPID].ua).not.be.ok();

        done();
    });

    it('should remove user tag case insensitive', function(done) {
        mParticle.Identity.getCurrentUser().setUserTag('Test');
        mParticle.Identity.getCurrentUser().removeUserTag('test');

        mParticle.logEvent('test event');

        var event = getEvent(mockServer.requests, 'test event');

        event.should.have.property('ua');
        event.ua.should.not.have.property('Test');

        var cookies = getLocalStorage();
        Should(cookies[testMPID].ua).not.be.ok();

        done();
    });

    it('should set user attribute list', function(done) {
        mParticle._resetForTests(MPConfig);

        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');

        event.should.have.property('ua');
        event.ua.should.have.property('numbers', [1, 2, 3, 4, 5]);

        var cookies = getLocalStorage();
        cookies[testMPID].ua.numbers.length.should.equal(5);

        done();
    });

    it('should set user attribute list case insensitive', function(done) {
        mParticle._resetForTests(MPConfig);

        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);
        mParticle.Identity.getCurrentUser().setUserAttributeList('Numbers', [
            1,
            2,
            3,
            4,
            5,
            6,
        ]);

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');
        var cookies = getLocalStorage();

        event.should.have.property('ua');
        event.ua.should.have.property('Numbers', [1, 2, 3, 4, 5, 6]);
        event.ua.should.not.have.property('numbers');
        cookies[testMPID].ua.Numbers.length.should.equal(6);

        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);

        mParticle.logEvent('test user attributes2');
        var event2 = getEvent(mockServer.requests, 'test user attributes2');
        var cookies3 = getLocalStorage();

        event2.ua.should.have.property('numbers', [1, 2, 3, 4, 5]);
        event2.ua.should.not.have.property('Numbers');
        cookies3[testMPID].ua.numbers.length.should.equal(5);

        done();
    });

    it('should make a copy of user attribute list', function(done) {
        var list = [1, 2, 3, 4, 5];

        mParticle._resetForTests(MPConfig);

        mParticle.init(apiKey, window.mParticle.config);

        mParticle.Identity.getCurrentUser().setUserAttributeList(
            'numbers',
            list
        );

        list.push(6);

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');

        var cookies = getLocalStorage();

        cookies[testMPID].ua.numbers.length.should.equal(5);

        event.should.have.property('ua');
        event.ua.should.have.property('numbers').with.lengthOf(5);

        done();
    });

    it('should remove all user attributes', function(done) {
        mParticle._resetForTests(MPConfig);

        mParticle.init(apiKey, window.mParticle.config);
        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);
        mParticle.Identity.getCurrentUser().removeAllUserAttributes();

        mParticle.logEvent('test user attributes');

        var event = getEvent(mockServer.requests, 'test user attributes');
        var cookies = getLocalStorage();

        event.should.have.property('ua', {});
        Should(cookies[testMPID].ua).not.be.ok();

        done();
    });

    it('should get user attribute lists', function(done) {
        mParticle._resetForTests(MPConfig);

        mParticle.init(apiKey, window.mParticle.config);

        mParticle.Identity.getCurrentUser().setUserAttribute('gender', 'male');
        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);

        var userAttributes = mParticle.Identity.getCurrentUser().getUserAttributesLists();

        userAttributes.should.have.property('numbers');
        userAttributes.should.not.have.property('gender');

        done();
    });

    it('should copy when calling get user attribute lists', function(done) {
        mParticle._resetForTests(MPConfig);
        mParticle.init(apiKey, window.mParticle.config);

        mParticle.Identity.getCurrentUser().setUserAttribute('gender', 'male');
        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);

        var userAttributes = mParticle.Identity.getCurrentUser().getUserAttributesLists();

        userAttributes['numbers'].push(6);

        var userAttributes1 = mParticle.Identity.getCurrentUser().getUserAttributesLists();
        userAttributes1['numbers'].should.have.lengthOf(5);

        done();
    });

    it('should copy when calling get user attributes', function(done) {
        mParticle._resetForTests(MPConfig);
        mParticle.init(apiKey, window.mParticle.config);

        mParticle.Identity.getCurrentUser().setUserAttribute('gender', 'male');
        mParticle.Identity.getCurrentUser().setUserAttributeList('numbers', [
            1,
            2,
            3,
            4,
            5,
        ]);

        var userAttributes = mParticle.Identity.getCurrentUser().getAllUserAttributes();

        userAttributes.blah = 'test';
        userAttributes['numbers'].push(6);

        var userAttributes1 = mParticle.Identity.getCurrentUser().getAllUserAttributes();

        userAttributes1['numbers'].should.have.lengthOf(5);
        userAttributes1.should.not.have.property('blah');

        done();
    });

    it('should get all user attributes', function(done) {
        mParticle._resetForTests(MPConfig);

        mParticle.init(apiKey, window.mParticle.config);

        mParticle.Identity.getCurrentUser().setUserAttribute('test', '123');
        mParticle.Identity.getCurrentUser().setUserAttribute(
            'another test',
            'blah'
        );

        var attrs = mParticle.Identity.getCurrentUser().getAllUserAttributes();

        attrs.should.have.property('test', '123');
        attrs.should.have.property('another test', 'blah');

        done();
    });

    it('should not set user attribute list if value is not array', function(done) {
        mParticle._resetForTests(MPConfig);
        mParticle.init(apiKey, window.mParticle.config);

        mParticle.Identity.getCurrentUser().setUserAttributeList('mykey', 1234);

        var attrs = mParticle.Identity.getCurrentUser().getAllUserAttributes();

        attrs.should.not.have.property('mykey');

        done();
    });

    it('should not set bad session attribute value', function(done) {
        mParticle.setSessionAttribute('name', { bad: 'bad' });

        mParticle.endSession();

        var sessionEndEvent = getEvent(mockServer.requests, 2);

        sessionEndEvent.attrs.should.not.have.property('name');

        done();
    });

    it('should not set a bad user attribute key or value', function(done) {
        mParticle.Identity.getCurrentUser().setUserAttribute('gender', {
            bad: 'bad',
        });
        mParticle.logEvent('test bad user attributes1');
        var event1 = getEvent(mockServer.requests, 'test bad user attributes1');

        mParticle.Identity.getCurrentUser().setUserAttribute('gender', [
            'bad',
            'bad',
            'bad',
        ]);
        mParticle.logEvent('test bad user attributes2');
        var event2 = getEvent(mockServer.requests, 'test bad user attributes2');

        mParticle.Identity.getCurrentUser().setUserAttribute(
            { bad: 'bad' },
            'male'
        );
        mParticle.logEvent('test bad user attributes3');
        var event3 = getEvent(mockServer.requests, 'test bad user attributes3');

        mParticle.Identity.getCurrentUser().setUserAttribute(
            ['bad', 'bad', 'bad'],
            'female'
        );
        mParticle.logEvent('test bad user attributes4');
        var event4 = getEvent(mockServer.requests, 'test bad user attributes4');

        mParticle.Identity.getCurrentUser().setUserAttribute(null, 'female');
        mParticle.logEvent('test bad user attributes5');
        var event5 = getEvent(mockServer.requests, 'test bad user attributes5');

        mParticle.Identity.getCurrentUser().setUserAttribute(
            undefined,
            'female'
        );
        mParticle.logEvent('test bad user attributes6');
        var event6 = getEvent(mockServer.requests, 'test bad user attributes6');

        event1.should.have.property('ua');
        event1.ua.should.not.have.property('gender');

        event2.should.have.property('ua');
        event2.ua.should.not.have.property('gender');

        event3.should.have.property('ua');
        event3.ua.should.not.have.property('gender');

        event4.should.have.property('ua');
        event4.ua.should.not.have.property('gender');

        event5.should.have.property('ua');
        event5.ua.should.not.have.property('gender');

        event6.should.have.property('ua');
        event6.ua.should.not.have.property('gender');

        done();
    });

    it('should get cart products', function(done) {
        var product1 = mParticle.eCommerce.createProduct('iPhone', 'SKU1', 1),
            product2 = mParticle.eCommerce.createProduct('Android', 'SKU2', 1);

        mParticle.eCommerce.Cart.add([product1, product2]);

        var cartProducts = mParticle.Identity.getCurrentUser()
            .getCart()
            .getCartProducts();

        cartProducts.length.should.equal(2);
        JSON.stringify(cartProducts[0]).should.equal(JSON.stringify(product1));
        JSON.stringify(cartProducts[1]).should.equal(JSON.stringify(product2));

        done();
    });

    it('should send user attribute change requests when setting new attributes', function(done) {
        mParticle._resetForTests(MPConfig);
        window.fetchMock.post(
            'https://jssdks.mparticle.com/v3/JS/test_key/events',
            200
        );

        window.mParticle.config.flags = {
            eventsV3: 100,
            EventBatchingIntervalMillis: 0,
        };

        mParticle.init(apiKey, window.mParticle.config);

        // set a new attribute, age
        window.fetchMock._calls = [];
        mParticle.Identity.getCurrentUser().setUserAttribute('age', '25');

        var event = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event.should.be.ok();
        event.event_type.should.equal('user_attribute_change');
        event.data.new.should.equal('25');
        (event.data.old === null).should.equal(true);
        event.data.user_attribute_name.should.equal('age');
        event.data.deleted.should.equal(false);
        event.data.is_new_attribute.should.equal(true);

        // change age attribute
        window.fetchMock._calls = [];
        mParticle.Identity.getCurrentUser().setUserAttribute('age', '30');
        event = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event.event_type.should.equal('user_attribute_change');
        event.data.new.should.equal('30');
        event.data.old.should.equal('25');
        event.data.user_attribute_name.should.equal('age');
        event.data.deleted.should.equal(false);
        event.data.is_new_attribute.should.equal(false);

        // removes age attribute
        window.fetchMock._calls = [];
        mParticle.Identity.getCurrentUser().removeUserAttribute('age');
        event = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event.event_type.should.equal('user_attribute_change');
        (event.data.new === null).should.equal(true);
        event.data.old.should.equal('30');
        event.data.user_attribute_name.should.equal('age');
        event.data.deleted.should.equal(true);
        event.data.is_new_attribute.should.equal(false);

        // set a user attribute list
        window.fetchMock._calls = [];

        mParticle.Identity.getCurrentUser().setUserAttributeList('age', [
            'test1',
            'test2',
        ]);
        event = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event.event_type.should.equal('user_attribute_change');
        var obj = {
            test1: true,
            test2: true,
        };
        event.data.new.forEach(function(userAttr) {
            obj[userAttr].should.equal(true);
        });
        (event.data.old === null).should.equal(true);
        event.data.user_attribute_name.should.equal('age');
        event.data.deleted.should.equal(false);
        event.data.is_new_attribute.should.equal(true);

        // changes ordering of above attribute list
        window.fetchMock._calls = [];

        mParticle.Identity.getCurrentUser().setUserAttributeList('age', [
            'test2',
            'test1',
        ]);
        event = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event.event_type.should.equal('user_attribute_change');
        obj = {
            test1: true,
            test2: true,
        };
        event.data.new.forEach(function(userAttr) {
            obj[userAttr].should.equal(true);
        });

        (event.data.old[0] === 'test1').should.equal(true);
        (event.data.old[1] === 'test2').should.equal(true);
        event.data.user_attribute_name.should.equal('age');
        event.data.deleted.should.equal(false);
        event.data.is_new_attribute.should.equal(false);

        delete window.mParticle.config.flags
        done();
    });

    it('should send user identity change requests when setting new identities on new users', function(done) {
        mParticle._resetForTests(MPConfig);

        window.fetchMock.post(
            'https://jssdks.mparticle.com/v3/JS/test_key/events',
            200
        );

        window.mParticle.config.flags = {
            eventsV3: 100,
            EventBatchingIntervalMillis: 0,
        };
        mParticle.init(apiKey, window.mParticle.config);

        // anonymous user is in storage, new user logs in
        var loginUser = {
            userIdentities: {
                customerid: 'customerid1',
            },
        };

        mockServer.respondWith(urls.login, [
            200,
            {},
            JSON.stringify({ mpid: 'testMPID', is_logged_in: false }),
        ]);

        mParticle.Identity.login(loginUser);
        var event = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event.should.be.ok();
        event.event_type.should.equal('user_identity_change');
        event.data.new.identity_type.should.equal('customerid');
        event.data.new.identity.should.equal('customerid1');
        (typeof event.data.new.timestamp_unixtime_ms).should.equal('number');
        event.data.new.created_this_batch.should.equal(true);
        event.data.old.identity_type.should.equal('customerid');
        (event.data.old.identity === null).should.equal(true);
        (typeof event.data.old.timestamp_unixtime_ms).should.equal('number');
        event.data.old.created_this_batch.should.equal(false);

        // change customerid creates an identity change event
        var modifyUser = {
            userIdentities: {
                customerid: 'customerid2',
            },
        };

        mockServer.respondWith(urls.modify, [
            200,
            {},
            JSON.stringify({ mpid: testMPID, is_logged_in: false }),
        ]);

        mParticle.Identity.modify(modifyUser);

        var event2 = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event2.should.be.ok();
        event2.event_type.should.equal('user_identity_change');
        event2.data.new.identity_type.should.equal('customerid');
        event2.data.new.identity.should.equal('customerid2');
        (typeof event2.data.new.timestamp_unixtime_ms).should.equal('number');
        event2.data.new.created_this_batch.should.equal(false);
        event2.data.old.identity_type.should.equal('customerid');
        event2.data.old.identity.should.equal('customerid1');
        (typeof event2.data.old.timestamp_unixtime_ms).should.equal('number');
        event2.data.old.created_this_batch.should.equal(false);

        // Adding a new identity to the current user will create an identity change event
        var modifyUser2 = {
            userIdentities: {
                customerid: 'customerid2',
                email: 'test@test.com',
            },
        };

        window.fetchMock._calls = [];

        mParticle.Identity.modify(modifyUser2);

        var event3 = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event3.should.be.ok();
        event3.event_type.should.equal('user_identity_change');
        event3.data.new.identity_type.should.equal('email');
        event3.data.new.identity.should.equal('test@test.com');
        (typeof event3.data.new.timestamp_unixtime_ms).should.equal('number');
        event3.data.new.created_this_batch.should.equal(true);

        event3.data.old.identity_type.should.equal('email');
        (event3.data.old.identity === null).should.equal(true);
        (typeof event3.data.old.timestamp_unixtime_ms).should.equal('number');
        event3.data.old.created_this_batch.should.equal(false);

        // logout with an other will create only a change event for the other
        var logoutUser = {
            userIdentities: {
                other: 'other1',
            },
        };
        window.fetchMock._calls = [];

        mockServer.respondWith(urls.logout, [
            200,
            {},
            JSON.stringify({ mpid: 'mpid2', is_logged_in: false }),
        ]);

        mParticle.Identity.logout(logoutUser);
        var event4 = JSON.parse(window.fetchMock.lastOptions().body).events[0];
        event4.should.be.ok();
        event4.event_type.should.equal('user_identity_change');
        event4.data.new.identity_type.should.equal('other');
        event4.data.new.identity.should.equal('other1');
        (typeof event4.data.new.timestamp_unixtime_ms).should.equal('number');
        event4.data.new.created_this_batch.should.equal(true);

        event4.data.old.identity_type.should.equal('other');
        (event4.data.old.identity === null).should.equal(true);
        (typeof event4.data.old.timestamp_unixtime_ms).should.equal('number');
        event4.data.old.created_this_batch.should.equal(false);

        done();
    });

    it('should not send user identity change requests when not batching', function(done) {
        // mock v3 events endpoint
        window.fetchMock.post(
            'https://jssdks.mparticle.com/v3/JS/test_key/events',
            200
        );

        // set eventsv3 endpoint to 0 to disable batching and send all events to v2 endpoint
        window.mParticle.config.flags = {
            eventsV3: 0,
        };
        mParticle.init(apiKey, window.mParticle.config);

        // anonymous user is in storage, new user logs in
        var loginUser = {
            userIdentities: {
                customerid: 'customerid1',
            },
        };

        mockServer.respondWith(urls.identify, [
            200,
            {},
            JSON.stringify({ mpid: 'mpid1', is_logged_in: false }),
        ]);

        window.fetchMock._calls = [];
        mockServer.requests = [];
        mParticle.Identity.login(loginUser);
        // when a login request is performed and batching is enabled, it sends 2 requests, 1 to /login and 1 to /events
        // when batching is not enabled, it only sends 1 request (to /login)
        (mockServer.requests.length === 1).should.equal(true);
        (window.fetchMock.lastOptions() === undefined).should.equal(true);
        done();
    });

    it('should not send user attribute change requests when not batching', function(done) {
        // v3 events endpoint
        window.fetchMock.post(
            'https://jssdks.mparticle.com/v3/JS/test_key/events',
            200
        );

        // set eventsv3 endpoint to 0 to disable batching and send all events to v2 endpoint
        window.mParticle.config.flags = {
            eventsV3: 0,
        };
        mParticle.init(apiKey, window.mParticle.config);

        // clear out fetchMock for v3 endpoint calls
        window.fetchMock._calls = [];
        // clear out mockServer.requests for v2 endpoint calls (xhr requests)
        mockServer.requests = [];

        mParticle.Identity.getCurrentUser().setUserAttribute('age', '25');
        (window.fetchMock.lastOptions() === undefined).should.equal(true);

        mParticle.Identity.getCurrentUser().setUserAttribute('age', '30');
        (window.fetchMock.lastOptions() === undefined).should.equal(true);

        mParticle.Identity.getCurrentUser().removeUserAttribute('age');
        (window.fetchMock.lastOptions() === undefined).should.equal(true);

        mParticle.Identity.getCurrentUser().setUserAttributeList('age', [
            'test1',
            'test2',
        ]);

        (window.fetchMock.lastOptions() === undefined).should.equal(true);
        (mockServer.requests.length === 0).should.equal(true);

        done();
    });
});
