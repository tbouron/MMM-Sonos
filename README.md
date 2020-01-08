# MagicMirror Module: Sonos

`MMM-Sonos` is a module for [MagicMirror](https://github.com/MichMich/MagicMirror) that allows you to display playing tracks on your Sonos network.
It support the display of different rooms and track information.

![Screenshot of the Sonos module](./screenshot.png)

## Usage

### Setup

Clone this module into your MagicMirror's `modules` directory and install dependencies:

```sh
cd modules
git clone https://github.com/tbouron/MMM-Sonos
npm i
```

then add the module to your MagicMirror's configuration. Here is an example:

```javascript
/* MagicMirror/config/config.js */
{
    /* ...your other config here */

    modules: [

        /* ...your other modules here */

        {
            module: 'MMM-Sonos',
            header: 'Now playing',
            position: 'top_left',
            config: {
                animationSpeed: Number,
                showArtist: Boolean,
                showAlbum: Boolean,
                showMetadata: Boolean
            }
        }
    ]
}
```

### Configuration options

| Configuration key | Description | Default | Required |
| --- | --- | --- | --- |
| animationSpeed | Animation speed to display/hide the module when tracks change. This value is in _milliseconds_ | 1000 | No |
| showArtist | Whether or not display the artist name | `true` | No |
| showAlbum | Whether or not display the album name | `true` | No |
| showMetadata | Whether or not display the track metadata, i.e. room where it's played, length, volume | `true` | No |
