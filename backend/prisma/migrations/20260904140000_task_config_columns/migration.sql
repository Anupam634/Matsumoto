-- Admin-editable task extras were held in an in-process Map: lost on every
-- restart and invisible to a second instance. Move them onto the row.
ALTER TABLE "Task" ADD COLUMN "wheelSegments" JSONB;
ALTER TABLE "Task" ADD COLUMN "quizQuestions" JSONB;
ALTER TABLE "Task" ADD COLUMN "actionUrl" TEXT;
