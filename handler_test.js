const assert = require('assert')
const sinon = require('sinon')
const handler = require('./handler')

describe('Event handler', () => {

  let sandbox = null

  beforeEach(() => {
    sandbox = sinon.sandbox.create()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('main', () => {
    it('should call `handleVerification` when event type is `url_verification`', (done) => {
      const stub = sandbox.stub(handler, '_handleVerification')
      stub.callsArg(1) // call callback function from stub

      handler.main({type: 'url_verification'}, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], {type: 'url_verification'})
        done()
      })
    })

    it('should call `_handleSlackEvents` when event type is `event_callback`', (done) => {
      const stub = sandbox.stub(handler, '_handleSlackEvents')
      stub.callsArg(1) // call callback function from stub

      handler.main({type: 'event_callback'}, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], {type: 'event_callback'})
        done()
      })
    })

    it('should return error callback for any other event type', (done) => {
      handler.main({type: 'test'}, (err) => {
        assert.deepEqual(err, new Error(`Unsupported event type 'test'`))
        done()
      })
    })
  })

  describe('_handleVerification', () => {
    it('responses on challenge when token is valid', (done) => {
      process.env.VERIFICATION_TOKEN = 'Jhj5dZrVaK7ZwHHjRyZWjbDl'
      const data = {
        'token': 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
        'challenge': '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        'type': 'url_verification'
      }
      handler._handleVerification(data, (err, res) => {
        assert.ifError(err)
        assert.deepEqual(res, {'challenge': '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P'})
        done()
      })
    })

    it('should return error callback when token is invalid', (done) => {
      process.env.VERIFICATION_TOKEN = ''
      const data = {
        'token': 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
        'challenge': '3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P',
        'type': 'url_verification'
      }
      handler._handleVerification(data, (err, res) => {
        assert.deepEqual(err, new Error('Verification failure'))
        done()
      })
    })
  })

  describe('_handleSlackEvents', () => {
    it('should call `_fetchFile` when event subtype is `file_share`', (done) => {
      const stub = sandbox.stub(handler, '_fetchFile')
      stub.callsArg(1) // call callback function from stub
      const file = {
        timestamp: Date.now(),
        filetype: 'jpg',
        url_private: 'http://example.com'
      }

      const data = { subtype: 'file_share', file }

      handler._handleSlackEvents(data, (err) => {
        assert.ifError(err)
        assert(stub.calledOnce)
        assert.deepEqual(stub.args[0][0], file)
        done()
      })
    })

    it('should call empty callback for any other event subtype', (done) => {
      const stub = sandbox.stub(handler, '_fetchFile')
      stub.callsArg(1) // call callback function from stub

      handler._handleSlackEvents({subtype: 'test'}, (err) => {
        assert.ifError(err)
        assert(stub.notCalled)
        done(err)
      })
    })
  })

  describe('_fetchFile', () => {
    it('should call `file_fetcher` via step function')
  })

})
