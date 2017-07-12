// This should be set before `handler` require to set proper token for handler
process.env.VERIFICATION_TOKEN = 'Jhj5dZrVaK7ZwHHjRyZWjbDl'
process.env.SLACK_INTEGRATOR_SNS = 'testSNSTopic'
process.env.SLACK_INTEGRATOR_SF = 'testStepFunction'

const assert = require('assert')
const AWS = require('aws-sdk')
const cloneDeep = require('clone-deep')
const sinon = require('sinon')

const handler = require('./handler')
const slackEventPayload = require('./slack-event-example')

describe('Event handler', () => {

  const token = 'Jhj5dZrVaK7ZwHHjRyZWjbDl'
  const sns = new AWS.SNS()
  const stepfunctions = new AWS.StepFunctions()
  const aws = {sns, stepfunctions}

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
      stub.yields()

      handler.main({token, type: 'url_verification'}, aws, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], {token, type: 'url_verification'})
        done()
      })
    })

    it('should call `_handleSlackEvents` when event type is `event_callback`', (done) => {
      const stub = sandbox.stub(handler, '_handleSlackEvents')
      stub.yields()

      handler.main(slackEventPayload, aws, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], slackEventPayload)
        done()
      })
    })

    it('should return empty callback for any other event types', (done) => {
      handler.main({token, type: 'test'}, aws, done)
    })

    it('should return error callback when token is invalid', (done) => {
      handler.main({token: '123'}, aws, (err, res) => {
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
      handler._handleVerification(data, aws, (err, res) => {
        assert.ifError(err)
        assert.deepEqual(res, {'challenge': '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P'})
        done()
      })
    })
  })

  describe('_handleSlackEvents', () => {
    it('should call `_handleFileShare` when event subtype is `file_share`', (done) => {
      const stub = sandbox.stub(handler, '_handleFileShare')
      stub.yields()

      handler._handleSlackEvents(slackEventPayload, aws, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], slackEventPayload)
        done()
      })
    })

    it('should call empty callback for any other event subtype', (done) => {
      const stub = sandbox.stub(handler, '_handleFileShare')
      stub.yields()

      const payload = cloneDeep(slackEventPayload)
      payload.event.subtype = 'test'

      handler._handleSlackEvents(payload, aws, (err) => {
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

      stubSns.yields()

      const payload = cloneDeep(slackEventPayload)
      payload.event.file.mimetype = 'image/gif'

      handler._handleFileShare(payload, aws, (err) => {
        assert.ifError(err)
        assert(stubSns.calledOnce)
        assert.equal(stubSns.args[0][1], 'testSNSTopic')
        assert.deepEqual(stubSns.args[0][2], {eventId: 'EVENTID123', channel: 'XYZ123ABC', err: `Unsupported mimetype: image/gif`})
        assert(stubSFn.notCalled)
        done(err)
      })
    })

    it('should call step function with file url, message and event id', (done) => {
      const stubSns = sandbox.stub(handler, '_callSns')
      const stubSFn = sandbox.stub(handler, '_callStepFunction')

      stubSFn.yields()

      handler._handleFileShare(slackEventPayload, aws, (err) => {
        assert.ifError(err)
        assert(stubSns.notCalled)
        assert(stubSFn.calledOnce)
        assert.equal(stubSFn.args[0][1], 'testStepFunction')
        assert.deepEqual(stubSFn.args[0][2], {eventId: 'EVENTID123', channel: 'XYZ123ABC', url: 'https://files.slack.com/test.jpeg', msg: 'test photo event'})
        done(err)
      })
    })
  })

  describe('_callSns', () => {
    it('should send notification to SNS', (done) => {
      const publish = sandbox.stub()
      publish.yields()
      const sns = {publish}

      handler._callSns(sns, 'testSNSTopic', {hello: 'test'}, (err) => {
        assert(publish.calledOnce)

        const expectedParams = {
          Message: JSON.stringify({hello: 'test'}),
          TopicArn: 'testSNSTopic'
        }
        assert.deepEqual(publish.args[0][0], expectedParams)
        done()
      })
    })
  })

  describe('_callStepFunction', () => {
    it('should call step function', (done) => {
      const startExecution = sandbox.stub()
      startExecution.yields()
      const stepfunctions = {startExecution}

      handler._callStepFunction(stepfunctions, 'testStepFunction', {hello: 'test'}, (err) => {
        assert(startExecution.calledOnce)

        const expectedParams = {
          stateMachineArn: 'testStepFunction',
          input: JSON.stringify({hello: 'test'})
        }
        assert.deepEqual(startExecution.args[0][0], expectedParams)
        done()
      })
    })
  })
})
