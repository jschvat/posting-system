/**
 * Models index file - exports all database models
 * Centralizes model imports and provides easy access to all models
 */

const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Media = require('./Media');
const Reaction = require('./Reaction');
const Follow = require('./Follow');
const Share = require('./Share');
const UserStats = require('./UserStats');
const TimelineCache = require('./TimelineCache');

module.exports = {
  User,
  Post,
  Comment,
  Media,
  Reaction,
  Follow,
  Share,
  UserStats,
  TimelineCache
};