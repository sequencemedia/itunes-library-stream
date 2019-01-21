# @sequencemedia/itunes-library-stream

Streaming parser for the contents of iTunes Library XML files. Retrieves all library tracks and playlists.

Should be useful for either ditching iTunes programatically or at least mucking
around with its data.

## Usage

### `itunes.createStream()`

Creates a stream to parse the `iTunes Music Library.xml` file and generate:

* Each track
* A collection of all tracks
* Each playlist
* A collection of all playlists
* Each playlist item
* Each collection of playlist items
* The complete library

Every object is defined either as a `Map` or a `Set` (depending on whichever more closely resembles the XML).

### Example ES

```
import { createReadStream } from 'fs'
import { resolve } from 'path'
import userhome from 'userhome'
import itunes from '@sequencmedia/itunes-library-stream'

import itunes, {
  LIBRARY,
  TRACKS,
  TRACK,
  PLAYLISTS,
  PLAYLIST,
  PLAYLIST_ITEMS,
  PLAYLIST_ITEM
} from '@sequencemedia/itunes-library-stream'

const filePath = resolve(userhome(), 'Music/iTunes/iTunes Music Library.xml')

createReadStream(filePath)
  .pipe(itunes.createStream())
  .on('data', ({
  	[LIBRARY]: library,
  	[TRACKS]: tracks,
  	[TRACK]: track,
  	[PLAYLISTS]: playlists,
  	[PLAYLIST]: playlist,
  	[PLAYLIST_ITEMS]: playlistItems,
  	[PLAYLIST_ITEM]: playlistItem
  }) => {
  	if (library) { /* A `Map` instance, contains _all_ tracks and playlists */ }
  	if (tracks) { /* A `Map` instance, contains _all_ tracks  */ }
  	if (track) { /* A `Map` instance. A track  */ }
  	if (playlists) { /* A `Set` instance, contains _all_ playlists */ }
  	if (playlist) { /* A `Map` instance. A playlist  */ }
  	if (playlistItems) { /* A `Set` instance, contains _all_ playlist items (belonging to a playlist) */ }
  	if (playlistItem) { /* A `Map` instance. A playlist item (belonging to a playlist) */ }
  })
  .on('end', () => {
  	console.log('Processing is complete!')
  })
```

## License ##

MIT. See [LICENSE.md](http://github.com/hughsk/itunes-library-stream/blob/master/LICENSE.md) for details.
