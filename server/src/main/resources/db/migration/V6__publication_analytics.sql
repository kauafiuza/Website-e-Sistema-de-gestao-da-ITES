ALTER TABLE publication_events ADD COLUMN page_path varchar(300);
ALTER TABLE publication_events ADD COLUMN target varchar(160);
ALTER TABLE publication_events DROP CONSTRAINT publication_events_event_type_check;
ALTER TABLE publication_events ADD CONSTRAINT publication_events_event_type_check
    CHECK (event_type IN ('view', 'click', 'interaction'));
UPDATE publication_events SET event_type = 'click' WHERE event_type = 'interaction';
