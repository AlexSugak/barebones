export const dbSchema = `
CREATE TABLE IF NOT EXISTS users (
  name varchar(250) NOT NULL,
  password varchar(250) NOT NULL,
  PRIMARY KEY (name)
);

INSERT INTO users (name, password) VALUES ('admin', 'd5bd4af1085f4eedf7f28ff2f964c600a1aec625413b41d7728d5d374086eaf92337602e47aab1a8fba5d5827f3c388434d44423893e322675e44e6ea6848d78.c427baec0270f2d819b1c647d4bb8355')
ON CONFLICT (name) DO NOTHING;

-- prevent 'does not exists' notice in output 
SET client_min_messages TO WARNING;
DROP TABLE IF EXISTS sessions;

CREATE TABLE IF NOT EXISTS sessions (
  id serial PRIMARY KEY,
  changes jsonb
);
`
