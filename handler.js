'use strict'

const log = (...args) => (process.env.DEBUG) ? console.log.apply(null, args) : null

exports.main = (data, cb) => {
  log(`Event type: ${data.type}`)
  log(`Event data:\n${JSON.stringify(data, null, 2)}`)

  switch (data.type) {
    case 'url_verification':
      exports._handleChallenge(data, cb)
      break
    case 'event_callback':
      exports._handleSlackEvents(data, cb)
      break
    default:
      cb(new Error(`Unsupported event type '${data.type}'`))
      break
  }
}

exports._handleChallenge = (data, cb) => {
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
