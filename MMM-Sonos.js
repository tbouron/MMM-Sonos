Module.register('MMM-Sonos', {
    defaults: {
        animationSpeed: 1000,
        showAlbum: true,
        showMetadata: true
    },

    items: {},

    start: function() {
        Log.log('Sonos frontend started');
        this.sendSocketNotification('SONOS_START');
    },

    getStyles: function () {
        return ['MMM-Sonos.css'];
    },

    getScripts: function() {
        return [this.file('node_modules/feather-icons/dist/feather.min.js')];
    },

    socketNotificationReceived: function (id, payload) {
        Log.log(`Notification received: ${id}`, payload);
        let currentItem;

        switch (id) {
            case 'SET_SONOS_GROUPS':
                this.items = payload;
                this.updateDom(this.config.animationSpeed);
                break;
            case 'SET_SONOS_CURRENT_TRACK':
                currentItem = this.items.hasOwnProperty(payload.group.ID) ? this.items[payload.group.ID] : {};
                this.items[payload.group.ID] = {
                    ...currentItem,
                    group: payload.group,
                    track: payload.track,
                };
                this.updateDom(this.config.animationSpeed);
                break;
            case 'SET_SONOS_VOLUME':
                currentItem = this.items.hasOwnProperty(payload.group.ID) ? this.items[payload.group.ID] : {};
                this.items[payload.group.ID] = {
                    ...currentItem,
                    group: payload.group,
                    volume: payload.volume
                };
                this.updateDom();
                break;
            case 'SET_SONOS_MUTE':
                currentItem = this.items.hasOwnProperty(payload.group.ID) ? this.items[payload.group.ID] : {};
                this.items[payload.group.ID] = {
                    ...currentItem,
                    group: payload.group,
                    isMuted: payload.isMuted
                };
                this.updateDom();
                break;
            case 'SET_SONOS_PLAY_STATE':
                currentItem = this.items.hasOwnProperty(payload.group.ID) ? this.items[payload.group.ID] : {};
                this.items[payload.group.ID] = {
                    ...currentItem,
                    group: payload.group,
                    state: payload.state
                };
                this.updateDom(this.config.animationSpeed);
                break;
            default:
                Log.info(`Notification with ID "${id}" unsupported. Ignoring...`);
                break;
        }
    },

    getHeader: function() {
        if (this.data.header && Object.values(this.items).some(item => item.state === 'playing' && item.track)) {
            return this.data.header;
        }
    },

    getDom: function () {
        if (Object.values(this.items).length === 0) {
            return document.createElement('div');
        }

        const container = document.createElement('div');
        container.className = 'sonos light';
        container.append(...Object.values(this.items)
            .filter(item => item.state === 'playing' && item.track)
            .map(item => {
                const container = document.createElement('div');

                const track = document.createElement('div');
                track.className = 'track';
                track.innerHTML  = `<strong class="bright ticker">${item.track.title}</strong>`;
                container.append(track);

                const artist = document.createElement('div');
                artist.className = 'artist small';
                let artistHtml = `<span class="bright">${item.track.artist}</span>`;
                if (this.config.showAlbum && item.track.album) {
                    artistHtml += `&nbsp;○&nbsp;${item.track.album}`;
                }
                artist.innerHTML += `<span class="ticker">${artistHtml}</span>`;
                container.append(artist);

                if (this.config.showMetadata) {
                    let volume;
                    if (item.isMuted === true) {
                        volume = `${this.getIcon('volume-x', 'dimmed')}`;
                    } else {
                        volume = `${this.getIcon(item.volume < 50 ? 'volume-1' : 'volume-2', 'dimmed')}&nbsp;<span>${item.volume}</span>`;
                    }

                    const metadata = document.createElement('div');
                    metadata.className = 'metadata small normal';
                    metadata.innerHTML =
                        `<span>${this.getIcon('speaker', 'dimmed')}&nbsp;<span>${item.group.Name}</span></span>` +
                        '&nbsp;' +
                        `<span>${volume}</span>` +
                        '&nbsp;' +
                        `<span>${this.getIcon('activity', 'dimmed')}&nbsp;<span>${Math.floor(item.track.duration / 60)}:${Math.ceil(item.track.duration % 60).toString().padStart(2, '0')}</span></span>`;
                    container.append(metadata);
                }

                return container;
            }));

        return container;
    },

    getIcon: function(iconId, classes) {
        return `<svg class="feather ${classes}"><use xlink:href="${this.file('node_modules/feather-icons/dist/feather-sprite.svg')}#${iconId}"/></svg>`;
    }
});