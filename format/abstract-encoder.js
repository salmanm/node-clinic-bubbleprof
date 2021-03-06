'use strict'

const stream = require('stream')

const FRAME_PREFIX_SIZE = 4 // uint32 is 4 bytes

class AbstractEncoder extends stream.Transform {
  constructor (messageType, options) {
    super(Object.assign({
      readableObjectMode: false,
      writableObjectMode: true
    }, options))

    this._messageType = messageType
  }

  _transform (message, encoding, callback) {
    const messageLength = this._messageType.encodingLength(message)

    const framedMessage = Buffer.alloc(messageLength + FRAME_PREFIX_SIZE)
    framedMessage.writeUInt32BE(messageLength, 0)
    this._messageType.encode(message, framedMessage, FRAME_PREFIX_SIZE)

    callback(null, framedMessage)
  }
}

module.exports = AbstractEncoder
