var util   = require('util');
var events = require('events');

var Player = function(name, chipsTotal, socket) {
    events.EventEmitter.call(this);
    this.name = name;
    this.socket = socket;
    this.chipsTotal = chipsTotal;
    this.chipsInUse = 0;
    this.tables = {};

    if (this.socket) {
        this.bindSocketListeners();
    }
};
util.inherits(Player, events.EventEmitter);

Player.prototype.bindSocketListeners = function() {
    this.socket.on('raise', this.raise);
    this.socket.on('fold', this.fold);
    this.socket.on('check', this.check);
    this.socket.on('call', this.call);
};

Player.prototype.getTable = function(tableName) {
    return this.tables[tableName].table;
};

Player.prototype.getSeatNumber = function(tableName) {
    return this.tables[tableName].seatNumber;
};

Player.prototype.joinTable = function(table) {
    this.tables[table.name] = {
        table: table,
        seatNumber: null
    }
    table.emit('join', this);
    if (this.socket) {
        this.socket.join(table.name);
    }
};

Player.prototype.leaveTable = function(tableName) {
    this.tables[tableName].table.emit('leave', this);
    delete this.tables[tableName];
    if (this.socket) {
        this.socket.leave(tableName);
    }
};

Player.prototype.sit = function(tableName, seatNumber, buyIn) {
    this.tables[tableName].seatNumber = seatNumber;
    this.getTable(tableName).emit('sit', this, seatNumber, buyIn);
};

Player.prototype.stand = function(tableName) {
    this.getTable(tableName).emit('stand', this, this.getSeatNumber(tableName));
    this.tables[tableName].seatNumber = null;
};

Player.prototype.sitIn = function(tableName) {
    this.getTable(tableName).emit('sitIn', this, this.getSeatNumber(tableName));
};

Player.prototype.sitOut = function(tableName) {
    this.getTable(tableName).emit('sitOut', this, this.getSeatNumber(tableName));
};

Player.prototype.receiveCards = function(tableName, cards) {
    this.tables[tableName].cards = cards;
    if (this.socket) {
        this.socket.emit('getHoleCards', cards.print());
    } else {
        console.log('%s\'s cards: ', this.name, cards.print());
    }
};

Player.prototype.payBlind = function(amount) {
    console.log('%s has paid %s in blinds', this.name, amount);
};

Player.prototype.wonHand = function(amount) {
    this.chipsTotal += amount;
    this.chipsInUse += amount;
};

Player.prototype.lostHand = function(amount) {
    this.chipsTotal -= amount;
    this.chipsInUse -= amount;
};

Player.prototype.releaseChips = function(amount) {
    this.chipsInUse -= amount;
};

Player.prototype.getAction = function(actions) {
    if (this.socket) {
        this.socket.emit('getAction', actions);
    } else {
        actions = actions
                    .map(function(action) { 
                        return action.replace(/(\w)(\w+)/, '[$1]$2')
                    })
                    .join(', ');
        promptMsg = this.name + ', select an action (' + actions + '):'
        console.log(promptMsg.prompt);
        process.stdin.resume();
    }
};

Player.prototype.doAction = function(tableName, type) {
    this.getTable(tableName).emit('action', type, this);
};

Player.prototype.raise = function(tableName) {
    this.doAction(tableName, 'raise');
};

Player.prototype.call = function(tableName) {
    this.doAction(tableName, 'call');
};

Player.prototype.fold = function(tableName) {
    this.doAction(tableName, 'fold');
};

Player.prototype.check = function(tableName) {
    this.doAction(tableName, 'check');
};

Player.prototype.transport = function() {
    process.stdin.resume();

};

module.exports = Player;

