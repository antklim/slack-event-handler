// This should be set before `handler` require to set proper token for handler
process.env.VERIFICATION_TOKEN = 'Jhj5dZrVaK7ZwHHjRyZWjbDl'

const assert = require('assert')
const cloneDeep = require('clone-deep')
const sinon = require('sinon')

const handler = require('./handler')
const slackEventPayload = require('./slack-event-example')

describe('Event handler', () => {

  const token = 'Jhj5dZrVaK7ZwHHjRyZWjbDl'
  let sandbox = null

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('main', () => {
    it('should call `_handleVerification` when event type is `url_verification`', (done) => {
      const stub = sandbox.stub(handler, '_handleVerification')
      stub.callsArg(1) // call callback function from stub

      handler.main({token, type: 'url_verification'}, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], {token, type: 'url_verification'})
        done()
      })
    })

    it('should call `_handleSlackEvents` when event type is `event_callback`', (done) => {
      const stub = sandbox.stub(handler, '_handleSlackEvents')
      stub.callsArg(1) // call callback function from stub

      handler.main(slackEventPayload, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], slackEventPayload)
        done()
      })
    })

    it('should return empty callback for any other event types', (done) => {
      handler.main({token, type: 'test'}, done)
    })

    it('should return error callback when token is invalid', (done) => {
      handler.main({token: '123'}, (err, res) => {
        assert.deepEqual(err, 'Verification failure')
        done()
      })
    })
  })

  describe('_handleVerification', () => {
    it('responses on challenge', (done) => {
      const data = {
        token: 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
        challenge: '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        type: 'url_verification'
      }
      handler._handleVerification(data, (err, res) => {
        assert.ifError(err)
        assert.deepEqual(res, {'challenge': '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P'})
        done()
      })
    })
  })

  describe('_handleSlackEvents', () => {
    it('should call `_handleFileShare` when event subtype is `file_share`', (done) => {
      const stub = sandbox.stub(handler, '_handleFileShare')
      stub.callsArg(1) // call callback function from stub

      handler._handleSlackEvents(slackEventPayload, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], slackEventPayload)
        done()
      })
    })

    it('should call empty callback for any other event subtype', (done) => {
      const stub = sandbox.stub(handler, '_handleFileShare')
      stub.callsArg(1) // call callback function from stub

      const payload = cloneDeep(slackEventPayload)
      payload.event.subtype = 'test'

      handler._handleSlackEvents(payload, (err) => {
        assert.ifError(err)
        assert(stub.notCalled)
        done(err)
      })
    })
  })

  describe('_handleFileShare', () => {
    it('should send notification to SNS when file type is not supported', (done) => {
      const stubSns = sandbox.stub(handler, '_callSns')
      const stubSFn = sandbox.stub(handler, '_callStepFunction')

      const payload = cloneDeep(slackEventPayload)
      payload.event.file.mimetype = 'image/gif'

      handler._handleFileShare(payload, (err) => {
        assert.ifError(err)
        assert(stubSns.calledOnce)
        assert.deepEqual(stubSns.args[0][0], {eventId: 'EVENTID123', channel: 'XYZ123ABC', err: `Unsupported mimetype: image/gif`})
        assert(stubSFn.notCalled)
        done(err)
      })
    })

    it('should call step function with file url, message and event id', (done) => {
      const stubSns = sandbox.stub(handler, '_callSns')
      const stubSFn = sandbox.stub(handler, '_callStepFunction')

      handler._handleFileShare(slackEventPayload, (err) => {
        assert.ifError(err)
        assert(stubSns.notCalled)
        assert(stubSFn.calledOnce)
        assert.deepEqual(stubSFn.args[0][0], {eventId: 'EVENTID123', channel: 'XYZ123ABC', url: 'https://files.slack.com/test.jpeg', msg: 'test photo event'})
        done(err)
      })
    })
  })

})
