-- PostgreSQL schema for ParkPal
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  role VARCHAR(20)
);

CREATE TABLE slots (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  status VARCHAR(20),
  owner_id INTEGER REFERENCES users(id)
);

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER REFERENCES slots(id),
  user_id INTEGER REFERENCES users(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  price NUMERIC(10,2)
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  booking_id INTEGER REFERENCES bookings(id),
  method VARCHAR(20),
  amount NUMERIC(10,2),
  status VARCHAR(20)
);
