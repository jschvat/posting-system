/**
 * Sequelize CLI configuration file
 * Used by sequelize-cli for migrations and seeders
 */

const { config } = require('../../../config/app.config');

module.exports = {
  development: {
    host: config.database.postgres.host,
    port: config.database.postgres.port,
    database: config.database.postgres.database,
    username: config.database.postgres.username,
    password: config.database.postgres.password,
    dialect: 'postgres',
    logging: config.isDevelopment ? console.log : false,
    pool: config.database.postgres.pool,
    dialectOptions: {
      ssl: config.database.postgres.ssl ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    define: {
      underscored: true,
      timestamps: true,
      freezeTableName: true,
      paranoid: false,
    }
  },

  test: {
    host: config.database.postgres.host,
    port: config.database.postgres.port,
    database: 'posting_system_test',
    username: config.database.postgres.username,
    password: config.database.postgres.password,
    dialect: 'postgres',
    logging: false,
    pool: config.database.postgres.pool,
    dialectOptions: {
      ssl: config.database.postgres.ssl ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    define: {
      underscored: true,
      timestamps: true,
      freezeTableName: true,
      paranoid: false,
    }
  },

  production: {
    host: config.database.postgres.host,
    port: config.database.postgres.port,
    database: config.database.postgres.database,
    username: config.database.postgres.username,
    password: config.database.postgres.password,
    dialect: 'postgres',
    logging: false,
    pool: config.database.postgres.pool,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    define: {
      underscored: true,
      timestamps: true,
      freezeTableName: true,
      paranoid: false,
    }
  }
};