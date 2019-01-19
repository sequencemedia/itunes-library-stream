import combiner from 'stream-combiner'

import through from 'through2'

import sax from 'sax'

function transformToDataType (type, value) {
  switch (type) {
    /**
       *  'STRING' is most common
       */
    case 'STRING':
      return String(value)
      /**
       *  Then 'INTEGER'
       */
    case 'INTEGER':
      return Number(value)
      /**
       *  Boolean literal
       */
    case 'TRUE':
      return true
      /**
       *  Boolean literal
       */
    case 'FALSE':
      return false
      /**
       *  Date instance
       */
    case 'DATE':
      return new Date(value)
      /**
       *  If we're here then something is broken
       */
    default:
      return String(value)
  }
}

function factory () { // keyname, Entry) {
  let LIBRARY_FIELD
  let LIBRARY_VALUE

  let TRACK_ID

  let TRACK_FIELD
  let TRACK_VALUE

  function onParseLibraryFieldText (field) { // console.log('onParseLibraryFieldText', field)
    LIBRARY_FIELD = field
  }

  function onParseLibraryValueText (value) { // console.log('onParseLibraryValueText', value)
    LIBRARY_VALUE = value
  }

  function onParseTrackIdText (id) { // console.log('onParseTrackIdText', id)
    TRACK_ID = id
  }

  function onParseTrackFieldText (field) { // console.log('onParseTrackFieldText', field)
    TRACK_FIELD = field
  }

  function onParseTrackValueText (value) { // console.log('onParseTrackValueText', value)
    TRACK_VALUE = value
  }

  return function createStream () {
    const xml = sax.createStream(false, {
      trim: false,
      normalize: false,
      lowercase: false,
      position: false,
      xmlns: true
    })

    const ignore = through({ objectMode: true }, (chunk, enc, next) => next())
    const output = through({ objectMode: true })

    const library = new Map()
    const tracks = new Map()
    const playlists = new Set()

    let track // = new Map()
    // let playlist // = new Map()

    let depth = 0

    /**
     *  d === 1 && name === 'DICT' (Tracks)
     *  d === 1 && name === 'ARRAY' (Playlists)
     */
    xml.on('opentag', ({ name, ...rest }) => {
      const d = depth++

      if (d === 0) {
        console.log('ot:ZERO', name) // PLIST
        /**
         *  Root `plist`
         */
        return
      }

      if (d === 1) {
        console.log('ot:ONE', name) // DICT
        /**
         *  Outer:
         *    `dict`
         */
        return
      }

      /**
       *  Inner:
       *    `dict`
       *    `array`
       *    `key`
       *    `string`
       *    `integer`
       *    `true`
       *    `false`
       *    `date`
       */
      if (d === 2) {
        console.log('ot:TWO', name) // DICT, ARRAY, KEY, INTEGER, TRUE, FALSE, DATE

        if (name === 'KEY') {
          /**
           *  Library fields
           */
          xml.on('text', onParseLibraryFieldText)

          return
        }

        if (name === 'DICT') {
          /**
           *  Tracks container
           */
          console.log('ot:DICT')

          return
        }

        if (name === 'ARRAY') {
          /**
           *  Playlists container
           */
          console.log('ot:ARRAY')

          return
        }

        /**
         *  Library values
         */
        xml.on('text', onParseLibraryValueText)

        return
      }

      if (d === 3) {
        // console.log('ot:THREE')

        /**
         *  Depth indicates that we can remove this
         */
        xml.off('text', onParseLibraryFieldText)
        xml.off('text', onParseLibraryValueText)

        if (name === 'KEY') {
          xml.on('text', onParseTrackIdText)

          return
        }

        if (name === 'DICT') {
          // console.log('OPEN TRACK')

          track = new Map()// Entry
          return
        }
      }

      if (d === 4) {
        // console.log('ot:FOUR')

        if (name === 'KEY') {
          /**
           *  Depth indicates that we can append this
           */
          xml.on('text', onParseTrackFieldText)
        } else {
          /**
           *  Depth indicates that we can append this
           */
          xml.on('text', onParseTrackValueText)
        }

        return
      }

      if (d === 5 || d === 6) {
        // console.log('ot:5/6', d, name)

        /**
         *  These should already be off
         */
        xml.off('text', onParseTrackFieldText)
        xml.off('text', onParseTrackValueText)
      }
    })

    xml.on('closetag', (name) => {
      const d = --depth

      if (d === 0) {
        console.log('ct:ZERO', name) // PLIST

        /**
         *  Ignore `plist` for now
         */
        output.push(library)
        return
      }

      if (d === 1) {
        console.log('ct:ONE', name) // DICT

        /**
         *  Outer `dict`
         */
        output.push(tracks)
        output.push(playlists)
        return
      }

      if (d === 2) {
        console.log('ct:TWO', name)

        if (name === 'KEY') {
          xml.off('text', onParseLibraryFieldText)

          return
        }

        if (name === 'DICT') {
          console.log('ct:DICT')

          return
        }

        if (name === 'ARRAY') {
          console.log('ct:ARRAY')

          return
        }

        xml.off('text', onParseLibraryValueText)

        library.set(LIBRARY_FIELD, transformToDataType(name, LIBRARY_VALUE))

        console.log('field', LIBRARY_FIELD)
        console.log('value', transformToDataType(name, LIBRARY_VALUE))
        return
      }

      if (d === 3) {
        // console.log('ct:THREE');

        if (name === 'KEY') {
          xml.off('text', onParseTrackIdText)

          return
        }

        if (name === 'DICT') {
          tracks.set(Number(TRACK_ID), track)

          // console.log('PUSH TRACK')

          output.push(track)
          return
        }
      }

      if (d === 4) {
        // console.log('ct:FOUR');

        if (name === 'KEY') {
          xml.off('text', onParseTrackFieldText)

          return
        } else {
          xml.off('text', onParseTrackValueText)

          track.set(TRACK_FIELD, transformToDataType(name, TRACK_VALUE))
          return
        }
      }

      if (d === 5 || d === 6) {
        // console.log('ct:5/6', d, name)
      }
    })

    return combiner(xml, ignore, output)
  }
}

const createStream = factory()

module.exports = {
  createStream
}
