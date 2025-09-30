'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('media', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Unique identifier for the media file'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the user who uploaded the media'
      },
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the post this media belongs to (if any)'
      },
      comment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the comment this media belongs to (if any)'
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename of the uploaded file'
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'Path to the stored file on disk'
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'URL to access the file'
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'MIME type of the file (e.g., image/jpeg)'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Size of the file in bytes'
      },
      media_type: {
        type: Sequelize.ENUM('image', 'video', 'audio', 'document'),
        allowNull: false,
        comment: 'Type of media file'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata (dimensions, duration, etc.)'
      },
      alt_text: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Alternative text for accessibility'
      },
      is_processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether the media has been processed (thumbnails, etc.)'
      },
      thumbnail_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Path to thumbnail file (if generated)'
      },
      thumbnail_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to thumbnail file (if generated)'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the media was uploaded'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the media was last updated'
      }
    });

    // Add indexes
    await queryInterface.addIndex('media', ['user_id']);
    await queryInterface.addIndex('media', ['post_id']);
    await queryInterface.addIndex('media', ['comment_id']);
    await queryInterface.addIndex('media', ['media_type']);
    await queryInterface.addIndex('media', ['mime_type']);
    await queryInterface.addIndex('media', ['is_processed']);
    await queryInterface.addIndex('media', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('media');
  }
};