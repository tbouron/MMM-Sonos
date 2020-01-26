const NodeHelper = require('node_helper');
const {AsyncDeviceDiscovery, Listener: listener} = require('sonos');

module.exports = NodeHelper.create({

    discovery: null,
    asyncDevice: null,

    init: function() {
        this.discovery = new AsyncDeviceDiscovery();
    },

    stop: function() {
        if (listener.isListening()) {
            listener.stopListener().then(() => {
                console.debug('Stopped all listeners to Sonos devices');
            }).catch(error => {
                console.error(`Failed to stop listeners to Sonos devices, connections might be dangling: ${error.message}`);
            });
        }
    },

    socketNotificationReceived: function (id, payload) {
        switch (id) {
            case 'SONOS_START':
                this.discoverGroups();
                break;
            default:
                Log.info(`Notification with ID "${id}" unsupported. Ignoring...`);
                break;
        }
    },

    discoverGroups: function(attempts = 0) {
        if (!this.asyncDevice) {
            this.asyncDevice = this.discovery.discover().then(device => {
                listener.on('ZonesChanged', () => {
                    console.log(`Zones have changed. Rediscovering all groups ...`);
                    this.discoverGroups();
                });
                return listener.subscribeTo(device).then(() => {
                    return device;
                })
            })
        }

        this.asyncDevice.then(device => {
            return device.getAllGroups();
        }).then(groups => {
            this.setGroups(groups);
        }).catch(error => {
            attempts++;
            const timeout = Math.min(Math.pow(attempts, 2), 30);
            console.error(`Failed to get groups: ${error.message}. Retrying in ${timeout} seconds ...`);
            if (listener.isListening()) {
                listener.stopListener().then(() => {
                    console.debug('Stopped all listeners to Sonos devices');
                }).catch(error => {
                    console.error(`Failed to stop listeners to Sonos devices, connections might be dangling: ${error.message}`);
                });
            }
            this.asyncDevice = null;
            setTimeout(() => {
                this.discoverGroups(attempts);
            }, timeout * 1000);
        });
    },

    setGroups(groups) {
        Promise.all(groups.map(group => {
            const sonos = group.CoordinatorDevice();
            return Promise.all([
                sonos.currentTrack(),
                sonos.getCurrentState(),
                sonos.getVolume(),
                sonos.getMuted()
            ]).then(data => {
                return {
                    group,
                    track: data[0],
                    state: data[1],
                    volume: data[2],
                    isMuted: data[3],
                };
            });
        })).then(items => {
            this.sendSocketNotification('SET_SONOS_GROUPS', items.reduce((map, item) => {
                map[item.group.ID] = item;
                return map;
            }, {}));
            return items;
        }).then(groups => {
            this.setListeners(groups.map(item => item.group));
        });
    },

    setListeners: function(groups) {
        groups.forEach(group => {
            console.log(`Registering listeners for group "${group.Name}" (host "${group.host}")`);

            const sonos = group.CoordinatorDevice();

            sonos.on('Mute', isMuted => {
                console.log('This speaker is %s.', isMuted ? 'muted' : 'unmuted')
            });

            sonos.on('CurrentTrack', track => {
                console.log(`[Group ${group.Name} - ${group.host}] Track changed to "${track.title}" by "${track.artist}"`);
                this.sendSocketNotification('SET_SONOS_CURRENT_TRACK', {
                    group,
                    track
                });
            });

            sonos.on('Volume', volume => {
                console.log(`[Group ${group.Name} - ${group.host}] Volume changed to "${volume}"`);
                this.sendSocketNotification('SET_SONOS_VOLUME', {
                    group,
                    volume
                });
            });

            sonos.on('Muted', isMuted => {
                console.log(`[Group ${group.Name} - ${group.host}] Group is ${isMuted ? 'muted' : 'unmuted'}`);
                this.sendSocketNotification('SET_SONOS_MUTE', {
                    group,
                    isMuted
                });
            });

            sonos.on('PlayState', state => {
                console.log(`[Group ${group.Name} - ${group.host}] Play state change to "${state}"`);
                this.sendSocketNotification('SET_SONOS_PLAY_STATE', {
                    group,
                    state
                });
            });
        });
    }
});