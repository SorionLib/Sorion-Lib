/**
 * Universal Database Manager for Sorion-Lib
 * Supports SQLite, MongoDB, PostgreSQL, and JSON
 */

const logger = require('./logger');
const fs = require('fs').promises;
const path = require('path');

class DatabaseManager {
  constructor(type = 'sqlite', options = {}) {
    this.type = type.toLowerCase();
    this.options = options;
    this.db = null;
    this.connected = false;
  }

  /**
   * Connect to the database
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      switch (this.type) {
        case 'sqlite':
          await this.connectSQLite();
          break;
        case 'mongodb':
          await this.connectMongoDB();
          break;
        case 'postgresql':
        case 'postgres':
          await this.connectPostgreSQL();
          break;
        case 'json':
          await this.connectJSON();
          break;
        default:
          throw new Error(`Unsupported database type: ${this.type}`);
      }
      this.connected = true;
      logger.success(`Connected to ${this.type} database`);
    } catch (error) {
      logger.error(`Failed to connect to ${this.type} database`, error);
      throw error;
    }
  }

  /**
   * Connect to SQLite
   */
  async connectSQLite() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = this.options.path || './data/database.sqlite';
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Connect to MongoDB
   */
  async connectMongoDB() {
    const { MongoClient } = require('mongodb');
    const uri = this.options.uri || 'mongodb://localhost:27017';
    const dbName = this.options.database || 'sorionlib';
    
    this.client = new MongoClient(uri);
    await this.client.connect();
    this.db = this.client.db(dbName);
  }

  /**
   * Connect to PostgreSQL
   */
  async connectPostgreSQL() {
    const { Pool } = require('pg');
    
    this.db = new Pool({
      host: this.options.host || 'localhost',
      port: this.options.port || 5432,
      database: this.options.database || 'sorionlib',
      user: this.options.user || 'postgres',
      password: this.options.password || ''
    });
    
    // Test connection
    await this.db.query('SELECT NOW()');
  }

  /**
   * Connect to JSON (file-based)
   */
  async connectJSON() {
    const dbPath = this.options.path || './data/database.json';
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    
    // Load or create JSON file
    try {
      const data = await fs.readFile(dbPath, 'utf8');
      this.db = JSON.parse(data);
    } catch (error) {
      this.db = {};
      await this.saveJSON();
    }
    
    this.dbPath = dbPath;
  }

  /**
   * Save JSON database to file
   */
  async saveJSON() {
    if (this.type === 'json') {
      await fs.writeFile(this.dbPath, JSON.stringify(this.db, null, 2));
    }
  }

  /**
   * Get data from database
   * @param {string} table - Table/Collection name
   * @param {Object} query - Query conditions
   * @returns {Promise<Array|Object>}
   */
  async get(table, query = {}) {
    if (!this.connected) throw new Error('Database not connected');

    try {
      switch (this.type) {
        case 'sqlite':
          return await this.getSQLite(table, query);
        case 'mongodb':
          return await this.getMongoDB(table, query);
        case 'postgresql':
        case 'postgres':
          return await this.getPostgreSQL(table, query);
        case 'json':
          return this.getJSON(table, query);
        default:
          throw new Error(`Unsupported database type: ${this.type}`);
      }
    } catch (error) {
      logger.error(`Failed to get data from ${table}`, error);
      throw error;
    }
  }

  async getSQLite(table, query) {
    const { where, values } = this.buildSQLiteWhere(query);
    const sql = `SELECT * FROM ${table}${where}`;
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, values, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getMongoDB(table, query) {
    return await this.db.collection(table).find(query).toArray();
  }

  async getPostgreSQL(table, query) {
    const { where, values } = this.buildPostgreSQLWhere(query);
    const sql = `SELECT * FROM ${table}${where}`;
    const result = await this.db.query(sql, values);
    return result.rows;
  }

  getJSON(table, query) {
    if (!this.db[table]) return [];
    
    const data = this.db[table];
    if (Object.keys(query).length === 0) return data;
    
    return data.filter(item => {
      return Object.keys(query).every(key => item[key] === query[key]);
    });
  }

  /**
   * Insert data into database
   * @param {string} table - Table/Collection name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>}
   */
  async insert(table, data) {
    if (!this.connected) throw new Error('Database not connected');

    try {
      switch (this.type) {
        case 'sqlite':
          return await this.insertSQLite(table, data);
        case 'mongodb':
          return await this.insertMongoDB(table, data);
        case 'postgresql':
        case 'postgres':
          return await this.insertPostgreSQL(table, data);
        case 'json':
          return await this.insertJSON(table, data);
        default:
          throw new Error(`Unsupported database type: ${this.type}`);
      }
    } catch (error) {
      logger.error(`Failed to insert data into ${table}`, error);
      throw error;
    }
  }

  async insertSQLite(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, ...data });
      });
    });
  }

  async insertMongoDB(table, data) {
    const result = await this.db.collection(table).insertOne(data);
    return { id: result.insertedId, ...data };
  }

  async insertPostgreSQL(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    
    const result = await this.db.query(sql, values);
    return result.rows[0];
  }

  async insertJSON(table, data) {
    if (!this.db[table]) this.db[table] = [];
    
    const id = this.db[table].length > 0 
      ? Math.max(...this.db[table].map(item => item.id || 0)) + 1 
      : 1;
    
    const newData = { id, ...data };
    this.db[table].push(newData);
    await this.saveJSON();
    
    return newData;
  }

  /**
   * Update data in database
   * @param {string} table - Table/Collection name
   * @param {Object} query - Query conditions
   * @param {Object} data - Data to update
   * @returns {Promise<Object>}
   */
  async update(table, query, data) {
    if (!this.connected) throw new Error('Database not connected');

    try {
      switch (this.type) {
        case 'sqlite':
          return await this.updateSQLite(table, query, data);
        case 'mongodb':
          return await this.updateMongoDB(table, query, data);
        case 'postgresql':
        case 'postgres':
          return await this.updatePostgreSQL(table, query, data);
        case 'json':
          return await this.updateJSON(table, query, data);
        default:
          throw new Error(`Unsupported database type: ${this.type}`);
      }
    } catch (error) {
      logger.error(`Failed to update data in ${table}`, error);
      throw error;
    }
  }

  async updateSQLite(table, query, data) {
    const { where, values: whereValues } = this.buildSQLiteWhere(query);
    const sets = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${sets}${where}`;
    const values = [...Object.values(data), ...whereValues];
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }

  async updateMongoDB(table, query, data) {
    const result = await this.db.collection(table).updateMany(query, { $set: data });
    return { modified: result.modifiedCount };
  }

  async updatePostgreSQL(table, query, data) {
    const { where, values: whereValues } = this.buildPostgreSQLWhere(query);
    const sets = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
    const sql = `UPDATE ${table} SET ${sets}${where}`;
    const values = [...Object.values(data), ...whereValues];
    
    const result = await this.db.query(sql, values);
    return { modified: result.rowCount };
  }

  async updateJSON(table, query, data) {
    if (!this.db[table]) return { modified: 0 };
    
    let modified = 0;
    this.db[table] = this.db[table].map(item => {
      const matches = Object.keys(query).every(key => item[key] === query[key]);
      if (matches) {
        modified++;
        return { ...item, ...data };
      }
      return item;
    });
    
    await this.saveJSON();
    return { modified };
  }

  /**
   * Delete data from database
   * @param {string} table - Table/Collection name
   * @param {Object} query - Query conditions
   * @returns {Promise<Object>}
   */
  async delete(table, query) {
    if (!this.connected) throw new Error('Database not connected');

    try {
      switch (this.type) {
        case 'sqlite':
          return await this.deleteSQLite(table, query);
        case 'mongodb':
          return await this.deleteMongoDB(table, query);
        case 'postgresql':
        case 'postgres':
          return await this.deletePostgreSQL(table, query);
        case 'json':
          return await this.deleteJSON(table, query);
        default:
          throw new Error(`Unsupported database type: ${this.type}`);
      }
    } catch (error) {
      logger.error(`Failed to delete data from ${table}`, error);
      throw error;
    }
  }

  async deleteSQLite(table, query) {
    const { where, values } = this.buildSQLiteWhere(query);
    const sql = `DELETE FROM ${table}${where}`;
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, values, function(err) {
        if (err) reject(err);
        else resolve({ deleted: this.changes });
      });
    });
  }

  async deleteMongoDB(table, query) {
    const result = await this.db.collection(table).deleteMany(query);
    return { deleted: result.deletedCount };
  }

  async deletePostgreSQL(table, query) {
    const { where, values } = this.buildPostgreSQLWhere(query);
    const sql = `DELETE FROM ${table}${where}`;
    
    const result = await this.db.query(sql, values);
    return { deleted: result.rowCount };
  }

  async deleteJSON(table, query) {
    if (!this.db[table]) return { deleted: 0 };
    
    const before = this.db[table].length;
    this.db[table] = this.db[table].filter(item => {
      return !Object.keys(query).every(key => item[key] === query[key]);
    });
    
    const deleted = before - this.db[table].length;
    await this.saveJSON();
    
    return { deleted };
  }

  /**
   * Build WHERE clause for SQLite
   */
  buildSQLiteWhere(query) {
    if (Object.keys(query).length === 0) {
      return { where: '', values: [] };
    }
    
    const conditions = Object.keys(query).map(key => `${key} = ?`);
    const where = ' WHERE ' + conditions.join(' AND ');
    const values = Object.values(query);
    
    return { where, values };
  }

  /**
   * Build WHERE clause for PostgreSQL
   */
  buildPostgreSQLWhere(query) {
    if (Object.keys(query).length === 0) {
      return { where: '', values: [] };
    }
    
    const conditions = Object.keys(query).map((key, i) => `${key} = $${i + 1}`);
    const where = ' WHERE ' + conditions.join(' AND ');
    const values = Object.values(query);
    
    return { where, values };
  }

  /**
   * Execute raw SQL query (SQLite & PostgreSQL only)
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    if (!this.connected) throw new Error('Database not connected');

    try {
      switch (this.type) {
        case 'sqlite':
          return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          });
        case 'postgresql':
        case 'postgres':
          const result = await this.db.query(sql, params);
          return result.rows;
        default:
          throw new Error(`Raw queries not supported for ${this.type}`);
      }
    } catch (error) {
      logger.error('Failed to execute query', error);
      throw error;
    }
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.connected) return;

    try {
      switch (this.type) {
        case 'sqlite':
          return new Promise((resolve, reject) => {
            this.db.close((err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        case 'mongodb':
          await this.client.close();
          break;
        case 'postgresql':
        case 'postgres':
          await this.db.end();
          break;
        case 'json':
          await this.saveJSON();
          break;
      }
      
      this.connected = false;
      logger.info(`Disconnected from ${this.type} database`);
    } catch (error) {
      logger.error(`Failed to close ${this.type} database`, error);
      throw error;
    }
  }
}

module.exports = DatabaseManager;