import { db } from '../config/database';
import type { IDatabase } from 'pg-promise';

export interface User {
  id: number;
  plex_user_id: number;
  username: string;
  email: string | null;
  friendly_name: string | null;
  thumb: string | null;
  is_admin: boolean;
  is_home_user: boolean;
  is_allow_sync: boolean;
  is_restricted: boolean;
  preferred_language: string;
  created_at: Date;
  updated_at: Date;
  last_seen: Date | null;
}

export interface UserCreate {
  plex_user_id: number;
  username: string;
  email?: string | null;
  friendly_name?: string | null;
  thumb?: string | null;
  is_admin?: boolean;
  is_home_user?: boolean;
  is_allow_sync?: boolean;
  is_restricted?: boolean;
  preferred_language?: string;
}

export interface UserUpdate {
  username?: string;
  email?: string | null;
  friendly_name?: string | null;
  thumb?: string | null;
  is_admin?: boolean;
  is_home_user?: boolean;
  is_allow_sync?: boolean;
  is_restricted?: boolean;
  preferred_language?: string;
  last_seen?: Date;
}

export class UserModel {
  /**
   * Create a new user
   */
  static async create(data: UserCreate): Promise<User> {
    return db.one<User>(
      `INSERT INTO users (
        plex_user_id, username, email, friendly_name, thumb,
        is_admin, is_home_user, is_allow_sync, is_restricted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        data.plex_user_id,
        data.username,
        data.email || null,
        data.friendly_name || null,
        data.thumb || null,
        data.is_admin || false,
        data.is_home_user || true,
        data.is_allow_sync || false,
        data.is_restricted || false,
      ]
    );
  }

  /**
   * Find user by ID
   */
  static async findById(id: number): Promise<User | null> {
    return db.oneOrNone<User>('SELECT * FROM users WHERE id = $1', [id]);
  }

  /**
   * Find user by Plex user ID
   */
  static async findByPlexUserId(plexUserId: number): Promise<User | null> {
    return db.oneOrNone<User>('SELECT * FROM users WHERE plex_user_id = $1', [plexUserId]);
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return db.oneOrNone<User>('SELECT * FROM users WHERE email = $1', [email]);
  }

  /**
   * Find all users
   */
  static async findAll(): Promise<User[]> {
    return db.manyOrNone<User>('SELECT * FROM users ORDER BY username ASC');
  }

  /**
   * Find users with email
   */
  static async findUsersWithEmail(): Promise<User[]> {
    return db.manyOrNone<User>(
      'SELECT * FROM users WHERE email IS NOT NULL AND email != \'\' ORDER BY username ASC'
    );
  }

  /**
   * Update user
   */
  static async update(id: number, data: UserUpdate): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    return db.oneOrNone<User>(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
  }

  /**
   * Delete user
   */
  static async delete(id: number): Promise<boolean> {
    const result = await db.result('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  /**
   * Upsert user (insert or update)
   */
  static async upsert(data: UserCreate): Promise<User> {
    return db.one<User>(
      `INSERT INTO users (
        plex_user_id, username, email, friendly_name, thumb,
        is_admin, is_home_user, is_allow_sync, is_restricted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (plex_user_id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        friendly_name = EXCLUDED.friendly_name,
        thumb = EXCLUDED.thumb,
        is_admin = EXCLUDED.is_admin,
        is_home_user = EXCLUDED.is_home_user,
        is_allow_sync = EXCLUDED.is_allow_sync,
        is_restricted = EXCLUDED.is_restricted,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        data.plex_user_id,
        data.username,
        data.email || null,
        data.friendly_name || null,
        data.thumb || null,
        data.is_admin || false,
        data.is_home_user || true,
        data.is_allow_sync || false,
        data.is_restricted || false,
      ]
    );
  }

  /**
   * Count total users
   */
  static async count(): Promise<number> {
    const result = await db.one<{ count: string }>('SELECT COUNT(*) FROM users');
    return parseInt(result.count, 10);
  }

  /**
   * Update last seen
   */
  static async updateLastSeen(id: number): Promise<void> {
    await db.none('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  }
}

export default UserModel;
