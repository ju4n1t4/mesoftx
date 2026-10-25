\connect users_db
BEGIN;
ALTER TABLE periods ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE periods SET active = FALSE WHERE active IS NULL;
UPDATE periods SET active = TRUE WHERE id = (SELECT id FROM periods ORDER BY code DESC, id DESC LIMIT 1) AND NOT EXISTS (SELECT 1 FROM periods WHERE active);
UPDATE periods SET active = FALSE WHERE active AND id <> (SELECT id FROM periods WHERE active ORDER BY code DESC, id DESC LIMIT 1);
COMMIT;
\connect assesment_mesoftx_db
BEGIN;

            DO $$
            BEGIN
                IF to_regclass('public.performance') IS NOT NULL THEN
                    ALTER TABLE performance ALTER COLUMN id TYPE VARCHAR(20);
                    ALTER TABLE performance ADD COLUMN IF NOT EXISTS code VARCHAR(20);
                    UPDATE performance SET code = id WHERE code IS NULL OR code = '';
                    ALTER TABLE performance ALTER COLUMN code SET NOT NULL;
                    CREATE SEQUENCE IF NOT EXISTS performance_internal_id_seq;
                    IF (SELECT COUNT(*) FROM performance) > 0 THEN
                        PERFORM setval(
                            'performance_internal_id_seq',
                            GREATEST(
                                COALESCE((SELECT MAX(id::integer) FROM performance WHERE id ~ '^[0-9]+$'), 0),
                                (SELECT COUNT(*) FROM performance)
                            ),
                            true
                        );
                    ELSE
                        PERFORM setval('performance_internal_id_seq', 1, false);
                    END IF;
                    ALTER TABLE performance ALTER COLUMN id SET DEFAULT nextval('performance_internal_id_seq')::text;
                END IF;
                IF to_regclass('public.level') IS NOT NULL THEN
                    ALTER TABLE level ALTER COLUMN performance_id TYPE VARCHAR(20);
                END IF;
                IF to_regclass('public.rubric') IS NOT NULL THEN
                    ALTER TABLE rubric ALTER COLUMN performance_id TYPE VARCHAR(20);
                END IF;
            END $$;
        
COMMIT;
