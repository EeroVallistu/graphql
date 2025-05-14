const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

// Migration to add userId column to events table
db.serialize(() => {
  console.log('Starting migration: adding userId to events table...');

  // Step 1: Check if userId column already exists
  db.get("PRAGMA table_info(events)", (err, row) => {
    if (err) {
      console.error('Error checking table schema:', err);
      process.exit(1);
    }

    // Continue with migration
    migrateEvents();
  });

  function migrateEvents() {
    // Step 2: Create a backup of the events table
    db.run('CREATE TABLE IF NOT EXISTS events_backup AS SELECT * FROM events', (err) => {
      if (err) {
        console.error('Error creating backup table:', err);
        process.exit(1);
      }
      console.log('Created backup of events table');

      // Step 3: Create a new events table with the userId column
      db.run(`CREATE TABLE IF NOT EXISTS events_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        duration INTEGER NOT NULL,
        description TEXT,
        color TEXT,
        userId TEXT NOT NULL DEFAULT '1',
        FOREIGN KEY (userId) REFERENCES users(id)
      )`, (err) => {
        if (err) {
          console.error('Error creating new events table:', err);
          process.exit(1);
        }
        console.log('Created new events table with userId column');

        // Step 4: Transfer data from old table to new table
        db.run(`INSERT INTO events_new (id, name, duration, description, color, userId)
                SELECT id, name, duration, description, color, '1'
                FROM events`, (err) => {
          if (err) {
            console.error('Error copying data to new table:', err);
            process.exit(1);
          }
          console.log('Copied data to new events table');

          // Step 5: Drop the old table
          db.run('DROP TABLE events', (err) => {
            if (err) {
              console.error('Error dropping old table:', err);
              process.exit(1);
            }
            console.log('Dropped old events table');

            // Step 6: Rename the new table to events
            db.run('ALTER TABLE events_new RENAME TO events', (err) => {
              if (err) {
                console.error('Error renaming new table:', err);
                process.exit(1);
              }
              console.log('Renamed new table to events');
              console.log('Migration completed successfully!');
              
              // Close the database connection
              db.close();
            });
          });
        });
      });
    });
  }
}); 