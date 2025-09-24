/**
 * User model for the social media platform
 * Handles user profiles, authentication data, and basic information
 */

const { DataTypes, Model } = require('sequelize');

class User extends Model {
  /**
   * Initialize the User model with sequelize instance
   * @param {Sequelize} sequelize - Sequelize instance
   */
  static initModel(sequelize) {
    User.init({
      // Primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the user'
      },

      // User authentication fields
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: {
          name: 'unique_username',
          msg: 'Username already exists'
        },
        validate: {
          len: {
            args: [3, 50],
            msg: 'Username must be between 3 and 50 characters'
          },
          isAlphanumeric: {
            msg: 'Username can only contain letters and numbers'
          },
          notEmpty: {
            msg: 'Username cannot be empty'
          }
        },
        comment: 'Unique username for the user'
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          name: 'unique_email',
          msg: 'Email already exists'
        },
        validate: {
          isEmail: {
            msg: 'Must be a valid email address'
          },
          notEmpty: {
            msg: 'Email cannot be empty'
          }
        },
        comment: 'User email address'
      },

      // User profile information
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: {
            args: [1, 100],
            msg: 'First name must be between 1 and 100 characters'
          },
          notEmpty: {
            msg: 'First name cannot be empty'
          }
        },
        comment: 'User first name'
      },

      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: {
            args: [1, 100],
            msg: 'Last name must be between 1 and 100 characters'
          },
          notEmpty: {
            msg: 'Last name cannot be empty'
          }
        },
        comment: 'User last name'
      },

      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: {
            args: [0, 500],
            msg: 'Bio cannot exceed 500 characters'
          }
        },
        comment: 'User biography/description'
      },

      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: {
            msg: 'Avatar URL must be a valid URL'
          }
        },
        comment: 'URL to user avatar image'
      },

      // Account status
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the user account is active'
      },

      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the user account was created'
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the user account was last updated'
      }
    }, {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      underscored: true,

      // Model indexes for performance
      indexes: [
        {
          unique: true,
          fields: ['username']
        },
        {
          unique: true,
          fields: ['email']
        },
        {
          fields: ['is_active']
        },
        {
          fields: ['created_at']
        }
      ],

      // Model hooks
      hooks: {
        beforeValidate: (user) => {
          // Convert email to lowercase
          if (user.email) {
            user.email = user.email.toLowerCase().trim();
          }

          // Trim whitespace from string fields
          if (user.username) {
            user.username = user.username.trim();
          }
          if (user.first_name) {
            user.first_name = user.first_name.trim();
          }
          if (user.last_name) {
            user.last_name = user.last_name.trim();
          }
        }
      }
    });

    return User;
  }

  /**
   * Get user's full name
   * @returns {string} Full name
   */
  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  /**
   * Get user's display name (full name or username if no name)
   * @returns {string} Display name
   */
  get displayName() {
    if (this.first_name && this.last_name) {
      return this.fullName;
    }
    return this.username;
  }

  /**
   * Get public user data (excluding sensitive information)
   * @returns {Object} Public user data
   */
  getPublicData() {
    return {
      id: this.id,
      username: this.username,
      first_name: this.first_name,
      last_name: this.last_name,
      full_name: this.fullName,
      display_name: this.displayName,
      bio: this.bio,
      avatar_url: this.avatar_url,
      is_active: this.is_active,
      created_at: this.created_at
    };
  }

  /**
   * Convert to JSON (automatically called by JSON.stringify)
   * Excludes sensitive data by default
   * @returns {Object} JSON representation
   */
  toJSON() {
    return this.getPublicData();
  }
}

module.exports = User;