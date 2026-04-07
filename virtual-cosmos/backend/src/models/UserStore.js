/**
 * In-memory store for all connected users.
 * Tracks position, name, and socket metadata for each user.
 */

const users = new Map()

const UserStore = {
  /**
   * Add or update a user entry.
   * @param {string} socketId
   * @param {{ name: string, x: number, y: number }} data
   */
  addUser(socketId, data) {
    users.set(socketId, {
      id: socketId,
      name: data.name || 'Anonymous',
      x: data.x ?? 400,
      y: data.y ?? 300,
      joinedAt: Date.now(),
    })
  },

  /**
   * Update position for a user.
   * @param {string} socketId
   * @param {{ x: number, y: number }} position
   */
  updatePosition(socketId, { x, y }) {
    const user = users.get(socketId)
    if (!user) return
    user.x = x
    user.y = y
  },

  /**
   * Remove a user from the store.
   * @param {string} socketId
   */
  removeUser(socketId) {
    users.delete(socketId)
  },

  /**
   * Get a single user by socketId.
   * @param {string} socketId
   * @returns {object|undefined}
   */
  getUser(socketId) {
    return users.get(socketId)
  },

  /**
   * Get all users as a plain object (serializable for socket emit).
   * @returns {Record<string, object>}
   */
  getAllUsers() {
    const result = {}
    for (const [id, user] of users) {
      result[id] = user
    }
    return result
  },

  /**
   * Return total count of connected users.
   */
  count() {
    return users.size
  },
}

export default UserStore
