'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('comments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Unique identifier for the comment'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the user who created the comment'
      },
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the post this comment belongs to'
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of parent comment for nested comments'
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Text content of the comment'
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the comment is published and visible'
      },
      depth: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Nesting depth of the comment (0 = top level)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the comment was created'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the comment was last updated'
      }
    });

    // Add indexes
    await queryInterface.addIndex('comments', ['user_id']);
    await queryInterface.addIndex('comments', ['post_id']);
    await queryInterface.addIndex('comments', ['parent_id']);
    await queryInterface.addIndex('comments', ['is_published']);
    await queryInterface.addIndex('comments', ['created_at']);
    await queryInterface.addIndex('comments', ['post_id', 'is_published', 'created_at']);
    await queryInterface.addIndex('comments', ['parent_id', 'is_published']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('comments');
  }
};