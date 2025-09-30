'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Unique identifier for the reaction'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the user who created the reaction'
      },
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the post this reaction belongs to (if any)'
      },
      comment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the comment this reaction belongs to (if any)'
      },
      emoji_name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Name of the emoji (e.g., "thumbs_up", "heart")'
      },
      emoji_unicode: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Unicode representation of the emoji'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the reaction was created'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the reaction was last updated'
      }
    });

    // Add indexes
    await queryInterface.addIndex('reactions', ['user_id']);
    await queryInterface.addIndex('reactions', ['post_id']);
    await queryInterface.addIndex('reactions', ['comment_id']);
    await queryInterface.addIndex('reactions', ['emoji_name']);
    await queryInterface.addIndex('reactions', ['created_at']);

    // Add unique constraints to prevent duplicate reactions
    await queryInterface.addConstraint('reactions', {
      fields: ['user_id', 'post_id', 'emoji_name'],
      type: 'unique',
      name: 'unique_user_post_emoji'
    });

    await queryInterface.addConstraint('reactions', {
      fields: ['user_id', 'comment_id', 'emoji_name'],
      type: 'unique',
      name: 'unique_user_comment_emoji'
    });

    // Add check constraint to ensure reaction is either on post or comment, not both
    await queryInterface.addConstraint('reactions', {
      fields: ['post_id', 'comment_id'],
      type: 'check',
      name: 'check_reaction_target',
      where: {
        [Sequelize.Op.or]: [
          {
            post_id: {
              [Sequelize.Op.not]: null
            },
            comment_id: null
          },
          {
            post_id: null,
            comment_id: {
              [Sequelize.Op.not]: null
            }
          }
        ]
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('reactions');
  }
};