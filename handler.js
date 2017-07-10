'use strict'

const aws = require('aws-sdk')

/**
 * DEBUG (optional)     - allows debug information logging
 * ERROR (optional)     - allows error information logging
 * VERIFICATION_TOKEN   - Slack team token, used in app registration in Slack
 * SLACK_INTEGRATOR_SNS - AWS SNS topic name to send Slack message processing information
 * SLACK_INTEGRATOR_SF  - AWS Step Function ARN to initiate Slack message processing
 */
const {DEBUG, ERROR, VERIFICATION_TOKEN,
  SLACK_INTEGRATOR_SNS, SLACK_INTEGRATOR_SF} = process.env
const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/bmp']

const sns = new aws.SNS()
const stepfunctions = new aws.StepFunctions()

const debug = (...args) => (DEBUG) ? console.log.apply(null, args) : null
const error = (...args) => (ERROR) ? console.error.apply(null, args) : null

exports.main = (data, cb) => {
  debug(`Event type: ${data.type}`)
  debug(`Event data:\n${JSON.stringify(data, null, 2)}`)

  if (data.token !== VERIFICATION_TOKEN) {
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
      cb()
      break
  }
}

exports._handleVerification = (data, cb) => {
  cb(null, {challenge: data.challenge})
  return
}

exports._handleSlackEvents = (data, cb) => {
  switch (data.event.subtype) {
    case 'file_share':
      exports._handleFileShare(data, cb)
      break
    default:
      cb()
      break
  }
}

exports._handleFileShare = (data, cb) => {
  const eventId = data.event_id
  const channel = data.event.channel
  const mimetype = data.event.file.mimetype.toLowerCase()

  if (!SUPPORTED_MIME_TYPES.includes(mimetype)) {
    const err = `Unsupported mimetype: ${mimetype}`
    error(err)
    exports._callSns({eventId, channel, err})
    // Always send positive callback to Slack
    cb()
    return
  }

  const url = data.event.file.url_private
  const msg = data.event.file.initial_comment.comment

  exports._callStepFunction({eventId, channel, url, msg})
  cb()
  return
}

exports._callSns = (notification) => {
  debug(`Sending ${JSON.stringify(notification, null, 2)} to topic: ${SLACK_INTEGRATOR_SNS}`)

  const params = {
    Message: JSON.stringify(notification),
    TopicArn: SLACK_INTEGRATOR_SNS
  }

  sns.publish(params, (err) => {
    if (err) {
      error(`Notification publish to ${SLACK_INTEGRATOR_SNS} failed`)
      error(err)
      return
    }

    debug(`Notification successfully published to ${SLACK_INTEGRATOR_SNS}`)
  })
}

exports._callStepFunction = (data) => {
  debug(`Calling ${SLACK_INTEGRATOR_SF} with input: ${JSON.stringify(data, null, 2)}`)

  const params = {
    stateMachineArn: SLACK_INTEGRATOR_SF,
    input: JSON.stringify(data)
  }

  stepfunctions.startExecution(params, (err) => {
    if (err) {
      error(`${SLACK_INTEGRATOR_SF} execution failed`)
      error(err)
      return
    }

    debug(`Started ${SLACK_INTEGRATOR_SF} execution`)
  });
}
