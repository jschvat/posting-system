'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
        comment: 'Unique identifier for the user'
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique username for the user'
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'User email address'
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Hashed user password'
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'User first name'
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'User last name'
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User biography/description'
      },
      avatar_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to user avatar image'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the user account is active'
      },
      email_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether the user email has been verified'
      },
      email_verification_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Token for email verification'
      },
      password_reset_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Token for password reset'
      },
      password_reset_expires: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the password reset token expires'
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the user last logged in'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the user account was created'
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When the user account was last updated'
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['is_active']);
    await queryInterface.addIndex('users', ['created_at']);
    await queryInterface.addIndex('users', ['email_verification_token']);
    await queryInterface.addIndex('users', ['password_reset_token']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};