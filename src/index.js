import combiner from 'stream-combiner'

import through from 'through2'

import sax from 'sax'

export const LIBRARY = 'Library'
export const TRACKS = 'Tracks'
export const TRACK = 'Track'
export const PLAYLISTS = 'Playlists'
export const PLAYLIST = 'Playlist'
export const PLAYLIST_ITEMS = 'Playlist Items'
export const PLAYLIST_ITEM = 'Playlist Item'

const TRACKS_PARENT = 1
const PLAYLISTS_PARENT = 2

let LIBRARY_FIELD
let LIBRARY_VALUE

let TRACK_ID

let TRACK_FIELD
let TRACK_VALUE

let PLAYLIST_ITEM_FIELD
let PLAYLIST_ITEM_VALUE

let PARENT = 0

function transformToDataType (type, value) {
  switch (type) {
    case 'INTEGER':
      /**
       *  'INTEGER' is most common
       */
      return Number(value)
    case 'STRING':
      /**
       *  Then 'STRING'
       */
      return String(value)
    case 'DATE':
      /**
       *  Date instance
       */
      return new Date(value)
    case 'TRUE':
      /**
       *  Boolean literal
       */
      return true
    case 'FALSE':
      /**
       *  Boolean literal
       */
      return false
    case 'DATA':
      /**
       *  iTunes data
       */
      return String(value)
    default:
      /**
       *  If we're here then something is broken
       */
      return String(value)
  }
}

function onParseLibraryFieldText (field) {
  console.log('onParseLibraryFieldText', field)
  LIBRARY_FIELD = field
}

function onParseLibraryValueText (value) {
  console.log('onParseLibraryValueText', value)
  LIBRARY_VALUE = value
}

function onParseTrackIdText (id) {
  console.log('onParseTrackIdText', id)
  TRACK_ID = id
}

function onParseTrackFieldText (field) {
  console.log('onParseTrackFieldText', field)
  TRACK_FIELD = field
}

function onParseTrackValueText (value) {
  console.log('onParseTrackValueText', value)
  TRACK_VALUE = value
}

function onParsePlaylistItemFieldText (field) {
  console.log('onParsePlaylistItemFieldText', field)
  PLAYLIST_ITEM_FIELD = field
}

function onParsePlaylistItemValueText (value) {
  console.log('onParsePlaylistItemValueText', value)
  PLAYLIST_ITEM_VALUE = value
}

function createStream () {
  const xml = sax.createStream(false, {
    trim: false,
    normalize: false,
    lowercase: false,
    position: false,
    xmlns: true
  })

  const ignore = through({ objectMode: true }, (chunk, enc, next) => next())
  const output = through({ objectMode: true })

  let library
  let tracks
  let playlists

  let track
  let playlist

  let playlistItems
  let playlistItem

  let depth = 0

  /**
   *  d === 1 && name === 'DICT' (Tracks)
   *  d === 1 && name === 'ARRAY' (Playlists)
   */
  xml.on('opentag', ({ name }) => {
    const d = depth++

    if (d === 0) { // console.log('ot:ZERO', name) // PLIST
      /**
       *  Root `plist`
       */
      library = new Map()
      return
    }

    if (d === 1) { // console.log('ot:ONE', name) // DICT
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
    if (d === 2) { // console.log('ot:TWO', name) // DICT, ARRAY, KEY, INTEGER, TRUE, FALSE, DATE
      if (name === 'KEY') {
        /**
         *  Library field
         */
        xml.on('text', onParseLibraryFieldText)

        return
      }

      if (name === 'DICT') {
        /**
         *  Tracks
         */
        PARENT = TRACKS_PARENT

        tracks = new Map()
        return
      }

      if (name === 'ARRAY') {
        /**
         *  Playlists
         */
        PARENT = PLAYLISTS_PARENT

        playlists = new Set()
        return
      }

      PARENT = 0

      /**
       *  Library value
       */
      xml.on('text', onParseLibraryValueText)

      return
    }

    if (d === 3) { // console.log('ot:THREE')
      xml.off('text', onParseLibraryFieldText)
      xml.off('text', onParseLibraryValueText)

      if (name === 'KEY') {
        xml.on('text', onParseTrackIdText)

        return
      }

      if (name === 'DICT') {
        switch (PARENT) {
          case TRACKS_PARENT:
            track = new Map() // Entry
            return

          case PLAYLISTS_PARENT:
            playlist = new Map() // Entry
            return
        }

        return
      }
    }

    if (d === 4) { // console.log('ot:FOUR')
      if (name === 'KEY') {
        xml.on('text', onParseTrackFieldText)

        return
      }

      if (name === 'ARRAY') {
        playlistItems = new Set()

        return
      }

      xml.on('text', onParseTrackValueText)

      return
    }

    if (d === 5) { // console.log('ot:FIVE', name)
      playlistItem = new Map()

      return
    }

    if (d === 6) { // console.log('ot:SIX', name)
      if (name === 'KEY') {
        xml.on('text', onParsePlaylistItemFieldText)

        return
      }

      xml.on('text', onParsePlaylistItemValueText)
    }
  })

  xml.on('closetag', (name) => {
    const d = --depth

    if (d === 0) { // console.log('ct:ZERO', name) // PLIST
      /**
       *  Root `plist`
       */
      output.push({ [LIBRARY]: library })
      return
    }

    if (d === 1) { // console.log('ct:ONE', name) // DICT
      /**
       *  Outer `dict`
       */
      return
    }

    if (d === 2) { // console.log('ct:TWO', name)
      if (name === 'KEY') {
        xml.off('text', onParseLibraryFieldText)

        return
      }

      if (name === 'DICT') {
        library.set(TRACKS, tracks)

        output.push({ [TRACKS]: tracks })
        return
      }

      if (name === 'ARRAY') {
        library.set(PLAYLISTS, playlists)

        output.push({ [PLAYLISTS]: playlists })
        return
      }

      xml.off('text', onParseLibraryValueText)

      library.set(LIBRARY_FIELD, transformToDataType(name, LIBRARY_VALUE))
      return
    }

    if (d === 3) { // console.log('ct:THREE');
      if (name === 'KEY') {
        xml.off('text', onParseTrackIdText)

        return
      }

      if (name === 'DICT') {
        switch (PARENT) {
          case TRACKS_PARENT: // console.log('PUSH TRACK')
            tracks.set(Number(TRACK_ID), track)

            output.push({ [TRACK]: track })
            return

          case PLAYLISTS_PARENT: // console.log('PUSH PLAYLIST')
            playlists.add(playlist)

            output.push({ [PLAYLIST]: playlist })
            return
        }

        return
      }
    }

    if (d === 4) { // console.log('ct:FOUR');
      if (name === 'KEY') {
        xml.off('text', onParseTrackFieldText)

        return
      }

      if (name === 'ARRAY') {
        playlist.set(PLAYLIST_ITEMS, playlistItems)

        output.push({ [PLAYLIST_ITEMS]: playlistItems })
        return
      }

      xml.off('text', onParseTrackValueText)

      switch (PARENT) {
        case TRACKS_PARENT:
          track.set(TRACK_FIELD, transformToDataType(name, TRACK_VALUE))

          return

        case PLAYLISTS_PARENT:
          playlist.set(TRACK_FIELD, transformToDataType(name, TRACK_VALUE))

          return
      }

      return
    }

    if (d === 5) { // console.log('ct:FIVE', name);
      playlistItems.add(playlistItem)

      output.push({ [PLAYLIST_ITEM]: playlistItem })
      return
    }

    if (d === 6) { // console.log('ct:SIX', name);
      if (name === 'KEY') {
        xml.off('text', onParsePlaylistItemFieldText)

        return
      }

      xml.off('text', onParsePlaylistItemValueText)

      playlistItem.set(PLAYLIST_ITEM_FIELD, transformToDataType(name, PLAYLIST_ITEM_VALUE))
    }
  })

  return combiner(xml, ignore, output)
}

export default {
  createStream
}
