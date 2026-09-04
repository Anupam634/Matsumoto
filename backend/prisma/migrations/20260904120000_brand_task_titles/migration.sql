-- The tweet bounty was seeded under the project's old working name.
UPDATE "Task" SET "title" = REPLACE("title", 'Matsumoto', 'BONDKOIN') WHERE "title" LIKE '%Matsumoto%';
