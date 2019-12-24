const NodeHelper = require('node_helper');
const {Sonos, AsyncDeviceDiscovery} = require('sonos');

module.exports = NodeHelper.create({

    discovery: null,
    groups: [],

    init: function() {
        this.discovery = new AsyncDeviceDiscovery();
    },

    start: function () {
        setInterval(() => this.findGroups(), 5000);
    },

    socketNotificationReceived: function (id, payload) {
        switch (id) {
            case 'SONOS_START':
                this.findGroups(true);
                break;
            default:
                Log.info(`Notification with ID "${id}" unsupported. Ignoring...`);
                break;
        }
    },

    findGroups: function (init = false) {
        this.discovery.discover().then(device => {
            return device.getAllGroups();
        }).then(groups => {
            const currentGroupIds = this.groups.map(group => group.ID);

            // For the first run, always set the groups (send the "SET_SONOS_GROUP" event
            if (init) {
                this.setGroups(groups);
            }

            // Determine if groups have changed
            const updatedGroups = groups.filter(group => {
                if (!currentGroupIds.includes(group.ID)) {
                    return true;
                }
                const currentGroup = this.groups.find(currentGroup => currentGroup.ID = group.ID);
                return currentGroup.ZoneGroupMember.length !== group.ZoneGroupMember.length;
            });

            if (updatedGroups.length > 0) {
                // Register new or updated groups
                updatedGroups.forEach(updatedGroup => {
                    console.log(`Found new (or updated) group "${updatedGroup.Name}" on host "${updatedGroup.host}"`);
                    this.setListeners(updatedGroup);
                });
                // Set groups again to reflect changes on the UI
                this.setGroups(groups);
            }

            this.groups = groups;
        }).catch(error => {
            console.error(`Failed to retrieve Sonos groups: ${error.message}`);
        });
    },

    setListeners: function (group) {
        console.log(`Registering listeners on group "${group.Name}" (host "${group.host}")`);
        const helper = this;
        const sonos = new Sonos(group.host);

        sonos.on('Mute', isMuted => {
            console.log('This speaker is %s.', isMuted ? 'muted' : 'unmuted')
        });

        sonos.on('CurrentTrack', track => {
            console.log(`[Group ${group.Name} - ${group.host}] Track changed to "${track.title}" by "${track.artist}"`);
            helper.sendSocketNotification('SET_SONOS_CURRENT_TRACK', {
                group,
                track
            });
        });

        sonos.on('Volume', volume => {
            console.log(`[Group ${group.Name} - ${group.host}] Volume changed to "${volume}"`);
            helper.sendSocketNotification('SET_SONOS_VOLUME', {
                group,
                volume
            });
        });

        sonos.on('Muted', isMuted => {
            console.log(`[Group ${group.Name} - ${group.host}] Group is ${isMuted ? 'muted' : 'unmuted'}`);
            helper.sendSocketNotification('SET_SONOS_MUTE', {
                group,
                isMuted
            });
        });

        sonos.on('PlayState', state => {
            console.log(`[Group ${group.Name} - ${group.host}] Play state change to "${state}"`);
            helper.sendSocketNotification('SET_SONOS_PLAY_STATE', {
                group,
                state
            });
        });
    },

    setGroups(groups) {
        Promise.all(groups.map(group => {
            const sonos = new Sonos(group.host);
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
        });
    }
});