/**
 * Models index file - exports all database models
 * Centralizes model imports and provides easy access to all models
 */

const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const Media = require('./Media');
const Reaction = require('./Reaction');

module.exports = {
  User,
  Post,
  Comment,
  Media,
  Reaction
};