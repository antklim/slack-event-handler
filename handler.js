'use strict'

const debug = (...args) => (process.env.DEBUG) ? console.log.apply(null, args) : null
const error = (...args) => (process.env.ERROR) ? console.error.apply(null, args) : null

exports.main = (data, cb) => {
  debug(`Event type: ${data.type}`)
  debug(`Event data:\n${JSON.stringify(data, null, 2)}`)

  if (data.token !== process.env.VERIFICATION_TOKEN) {
    const err = new Error('Verification failure')
    error(err)
    cb(err.message)
    return
  }

  switch (data.type) {
    case 'url_verification':
      exports._handleVerification(data, cb)
      break
    case 'event_callback':
      exports._handleSlackEvents(data, cb)
      break
    default:
      const err = new Error(`Unsupported event type '${data.type}'`)
      error(err)
      cb(err.message)
      break
  }
}

exports._handleVerification = (data, cb) => {
  cb(null, {challenge: data.challenge})
  return
}

exports._handleSlackEvents = (data, cb) => {
  switch (data.subtype) {
    case 'file_share':
      exports._fetchFile(data.file, cb)
      break
    default:
      cb()
      break
  }
}

exports._fetchFile = (data, cb) => {
  cb()
  return
}
