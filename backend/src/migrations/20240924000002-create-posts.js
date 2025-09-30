'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('posts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Unique identifier for the post'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the user who created the post'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Main text content of the post'
      },
      privacy_level: {
        type: Sequelize.ENUM('public', 'friends', 'private'),
        defaultValue: 'public',
        allowNull: false,
        comment: 'Who can see this post'
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the post is published and visible'
      },
      views_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Number of times this post has been viewed'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the post was created'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the post was last updated'
      }
    });

    // Add indexes
    await queryInterface.addIndex('posts', ['user_id']);
    await queryInterface.addIndex('posts', ['privacy_level']);
    await queryInterface.addIndex('posts', ['is_published']);
    await queryInterface.addIndex('posts', ['created_at']);
    await queryInterface.addIndex('posts', ['user_id', 'privacy_level', 'is_published']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('posts');
  }
};