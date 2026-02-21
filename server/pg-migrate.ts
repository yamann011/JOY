import { pool } from "./db";

export async function runMigrations() {
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        avatar TEXT,
        level INTEGER NOT NULL DEFAULT 1,
        is_online BOOLEAN NOT NULL DEFAULT false,
        is_banned BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        title TEXT NOT NULL,
        description TEXT,
        agency_name TEXT NOT NULL,
        agency_logo TEXT,
        cover_image TEXT,
        participant1_name TEXT,
        participant1_avatar TEXT,
        participant2_name TEXT,
        participant2_avatar TEXT,
        participants_data TEXT,
        participant_count INTEGER NOT NULL DEFAULT 0,
        participants TEXT[],
        scheduled_at TIMESTAMP NOT NULL,
        is_live BOOLEAN NOT NULL DEFAULT false,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_image TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS participants_data TEXT;

      CREATE TABLE IF NOT EXISTS chat_groups (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        name TEXT NOT NULL,
        description TEXT,
        required_role TEXT NOT NULL DEFAULT 'USER',
        is_private BOOLEAN NOT NULL DEFAULT false,
        participants TEXT[],
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        group_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL,
        category TEXT NOT NULL DEFAULT 'OTHER',
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        attachments TEXT[],
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        ticket_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        message TEXT NOT NULL,
        attachments TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        content TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vip_apps (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        download_url TEXT NOT NULL,
        version TEXT NOT NULL,
        size TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS banners (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        title TEXT,
        description TEXT,
        image_url TEXT,
        cta_label TEXT,
        cta_url TEXT,
        animation_type TEXT NOT NULL DEFAULT 'fade',
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS embedded_sites (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        url TEXT NOT NULL,
        image_url TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS news (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        image_url TEXT,
        video_url TEXT,
        external_link TEXT,
        category TEXT NOT NULL DEFAULT 'Genel',
        is_published BOOLEAN NOT NULL DEFAULT true,
        view_count INTEGER NOT NULL DEFAULT 0,
        like_count INTEGER NOT NULL DEFAULT 0,
        created_by VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS news_comments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        news_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS news_likes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        news_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(news_id, user_id)
      );
    `);

    console.log("[db] PostgreSQL tabloları hazır");
  } catch (err) {
    console.error("[db] Migration hatası:", err);
    throw err;
  } finally {
    client.release();
  }
}
