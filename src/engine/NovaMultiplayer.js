/**
 * NovaStar Multiplayer System v0.4
 * WebSocket-based multiplayer with rooms, state sync, and RPC
 *
 * Usage:
 *   const mp = new NovaMultiplayer(engine);
 *   await mp.connect('wss://your-server.com');
 *   mp.createRoom('my-room', { maxPlayers: 4 });
 *   mp.onPlayerJoin(player => { ... });
 *   mp.sync('position', player.position);
 */

export class NovaMultiplayer {
  constructor(engine) {
    this.engine = engine;
    this.ws = null;
    this.connected = false;
    this.room = null;
    this.playerId = null;
    this.players = new Map();
    this._handlers = new Map();
    this._syncState = {};
    this._syncInterval = null;
    this._rpcHandlers = new Map();
    this._pingInterval = null;
    this.latency = 0;
  }

  // -- Connection --

  async connect(serverUrl) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);
        this.ws.onopen = () => {
          this.connected = true;
          this.playerId = this._generateId();
          this._startPing();
          this._emit('connected', { playerId: this.playerId });
          console.log('[NovaMP] Connected as', this.playerId);
          resolve(this.playerId);
        };
        this.ws.onmessage = (e) => this._handleMessage(JSON.parse(e.data));
        this.ws.onclose = () => {
          this.connected = false;
          this._stopPing();
          this._emit('disconnected');
          console.log('[NovaMP] Disconnected');
        };
        this.ws.onerror = (err) => {
          console.error('[NovaMP] Connection error:', err);
          reject(err);
        };
      } catch (err) { reject(err); }
    });
  }

  disconnect() {
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.connected = false;
    this.room = null;
    this.players.clear();
    this._stopSync();
    this._stopPing();
  }

  // -- Rooms --

  createRoom(roomId, options = {}) {
    this._send({ type: 'room:create', roomId, options: { maxPlayers: options.maxPlayers || 8, isPublic: options.isPublic !== false, ...options } });
    this.room = roomId;
  }

  joinRoom(roomId) {
    this._send({ type: 'room:join', roomId });
    this.room = roomId;
  }

  leaveRoom() {
    this._send({ type: 'room:leave', roomId: this.room });
    this.room = null;
    this.players.clear();
  }

  listRooms() {
    this._send({ type: 'room:list' });
  }

  // -- State Sync --

  sync(key, value) {
    this._syncState[key] = value;
  }

  startSync(intervalMs = 50) {
    this._stopSync();
    this._syncInterval = setInterval(() => {
      if (!this.connected || !this.room) return;
      const state = {};
      for (const [k, v] of Object.entries(this._syncState)) {
        state[k] = typeof v === 'object' && v.toArray ? { x: v.x, y: v.y, z: v.z } : v;
      }
      this._send({ type: 'state:update', playerId: this.playerId, state });
    }, intervalMs);
  }

  _stopSync() {
    if (this._syncInterval) { clearInterval(this._syncInterval); this._syncInterval = null; }
  }

  getPlayerState(playerId) {
    return this.players.get(playerId);
  }

  getAllPlayers() {
    return [...this.players.entries()].map(([id, state]) => ({ id, ...state }));
  }

  // -- RPC (Remote Procedure Calls) --

  registerRPC(name, handler) {
    this._rpcHandlers.set(name, handler);
  }

  callRPC(name, args = {}, targetPlayer = null) {
    this._send({ type: 'rpc:call', name, args, from: this.playerId, target: targetPlayer });
  }

  broadcast(eventName, data = {}) {
    this._send({ type: 'broadcast', event: eventName, data, from: this.playerId });
  }

  // -- Events --

  onPlayerJoin(fn) { this._on('playerJoin', fn); }
  onPlayerLeave(fn) { this._on('playerLeave', fn); }
  onStateUpdate(fn) { this._on('stateUpdate', fn); }
  onRoomList(fn) { this._on('roomList', fn); }
  onBroadcast(fn) { this._on('broadcast', fn); }
  onConnected(fn) { this._on('connected', fn); }
  onDisconnected(fn) { this._on('disconnected', fn); }

  // -- Chat --

  sendChat(message) {
    this._send({ type: 'chat', from: this.playerId, message, room: this.room });
  }

  onChat(fn) { this._on('chat', fn); }

  // -- Internal --

  _send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case 'room:playerJoin':
        this.players.set(msg.playerId, msg.state || {});
        this._emit('playerJoin', { playerId: msg.playerId });
        break;
      case 'room:playerLeave':
        this.players.delete(msg.playerId);
        this._emit('playerLeave', { playerId: msg.playerId });
        break;
      case 'state:update':
        if (msg.playerId !== this.playerId) {
          this.players.set(msg.playerId, msg.state);
          this._emit('stateUpdate', { playerId: msg.playerId, state: msg.state });
        }
        break;
      case 'room:list':
        this._emit('roomList', msg.rooms);
        break;
      case 'rpc:call':
        const handler = this._rpcHandlers.get(msg.name);
        if (handler) handler(msg.args, msg.from);
        break;
      case 'broadcast':
        this._emit('broadcast', { event: msg.event, data: msg.data, from: msg.from });
        break;
      case 'chat':
        this._emit('chat', { from: msg.from, message: msg.message });
        break;
      case 'pong':
        this.latency = Date.now() - msg.timestamp;
        break;
    }
  }

  _on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(fn);
  }

  _emit(event, data) {
    const handlers = this._handlers.get(event);
    if (handlers) handlers.forEach(fn => fn(data));
  }

  _startPing() {
    this._pingInterval = setInterval(() => {
      this._send({ type: 'ping', timestamp: Date.now() });
    }, 5000);
  }

  _stopPing() {
    if (this._pingInterval) { clearInterval(this._pingInterval); this._pingInterval = null; }
  }

  _generateId() {
    return 'p_' + Math.random().toString(36).substr(2, 8);
  }
}
