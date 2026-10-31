import { db } from './db.js';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS events (
      id text PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL,
      category text NOT NULL DEFAULT 'General',
      date text NOT NULL,
      time text NOT NULL DEFAULT '',
      venue text NOT NULL DEFAULT '',
      organizer text NOT NULL DEFAULT '',
      organizer_id text NOT NULL,
      college text NOT NULL DEFAULT '',
      registered_ids jsonb NOT NULL DEFAULT '[]',
      max_seats integer,
      is_online boolean NOT NULL DEFAULT false,
      link text NOT NULL DEFAULT '',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log('events table ready');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
