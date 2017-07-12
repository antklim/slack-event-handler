'use strict'

const aws = require('aws-sdk')
const handler = require('./handler')

const sns = new aws.SNS()
const stepfunctions = new aws.StepFunctions()

exports.handler = (event, context, cb) => {

  handler.main(event, {sns, stepfunctions}, cb)
  return

}
