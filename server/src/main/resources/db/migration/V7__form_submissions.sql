CREATE TABLE form_submissions (
    id uuid PRIMARY KEY,
    publication_id uuid NOT NULL REFERENCES publications(id) ON DELETE CASCADE,
    version_number integer NOT NULL,
    page_id varchar(100) NOT NULL,
    block_id varchar(100) NOT NULL,
    form_name varchar(200) NOT NULL,
    fields jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_inbox ON form_submissions(publication_id, occurred_at DESC);
