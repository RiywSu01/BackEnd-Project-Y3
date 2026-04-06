 -- to reset the connections
 FLUSH USER_RESOURCES;
  -- ============================

 
 -- ============================
 -- Create Database
 -- ============================
 DROP DATABASE IF EXISTS HotelBookingSystem_DB;
 CREATE DATABASE IF NOT EXISTS HotelBookingSystem_DB
   CHARACTER SET utf8mb4
   COLLATE utf8mb4_general_ci;
   
 -- ============================
 -- Use Database
 -- ============================
 USE HotelBookingSystem_DB;
 
 
 -- ============================
 -- Create users Table
 -- ============================
 CREATE TABLE users (
   id INT AUTO_INCREMENT PRIMARY KEY,       -- user ID
   username VARCHAR(30) UNIQUE NOT NULL,    -- user's username
   userPassword VARCHAR(60) NOT NULL,       -- Store user's hash password
   email VARCHAR(255) UNIQUE NOT NULL,       -- user Email
   -- user's password (VARCHAR(60) because bcypt is fixed the legnth at 60 characters.)
   roles ENUM('USER', 'ADMIN') DEFAULT 'USER' -- user roles
 );
 
  -- ============================
 -- Create rooms Table
 -- ============================
 CREATE TABLE rooms (
   id INT AUTO_INCREMENT PRIMARY KEY,       -- Room ID
   name VARCHAR(100) NOT NULL,               -- Room name or number
   description TEXT,                         -- Room description
   capacity INT NOT NULL,                    -- Maximum guests
   price_per_night DECIMAL(10,2) NOT NULL,   -- Price per night
   image_url VARCHAR(255) DEFAULT 'placeholder.png', -- Image URL or path
   is_active BOOLEAN DEFAULT TRUE,            -- Availability status
   start_date DATETIME NOT NULL,				-- Available date (start)
   end_date DATETIME NOT NULL,					-- Available date (end)
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- created date
   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- updated date
     ON UPDATE CURRENT_TIMESTAMP
 );
 
 
-- ============================
-- Create bookings Table
-- ============================
  CREATE TABLE bookings (
   Booking_ID INT AUTO_INCREMENT PRIMARY KEY,       	-- booking id
   Room_ID INT NOT NULL,						-- Room id that user select
   username VARCHAR(100) NOT NULL,              -- who booking (username)
   check_in DATETIME NOT NULL,                  -- check_in date/time
   check_out DATETIME NOT NULL,                 -- check_out date/time
   bookings_status ENUM('Pending', 'Approved', 'Cancelled', 'Paid') DEFAULT 'Pending' -- Bookings status
 );
 
 
 
 -- ============================
 -- Insert Sample user
 -- ============================
 INSERT INTO users (id, username, userPassword, email, roles) VALUES
 (1, 'ADMIN', '$2a$12$SLk/Wnc/JBRnvsiAT5vAl.r3Y/St1DvvGco3SXP.WtxDYb4vZtyFS', "AdminTom@gmail.com", 'ADMIN'), -- Admin Password: ADMIN_Pass123
 (2, 'Tester1', '$2a$12$7ywt.sJ6c9idMhLRSGogjuTLsZHL.L518c5WqInfMjQUmEc/2/TRS', "Tester1@gmail.com", 'USER'); -- Tester1 Password: Tester123456

 -- ============================
 -- Insert Sample rooms
 -- ============================
 INSERT INTO rooms (name, description, capacity, price_per_night, image_url, is_active, start_date, end_date) VALUES
 ('Standard Room 101', 'Standard room with garden view', 2, 1800.00, '/images/room101.jpg', TRUE, '2026-03-01 14:00:00', '2026-06-01 14:00:00');
 
 INSERT INTO rooms (name, description, capacity, price_per_night, image_url, is_active, start_date, end_date) VALUES
 ('Standard Room 102', 'Standard room with swimming pool', 2, 2400.00, '/images/room102.jpg', TRUE, '2026-01-01 13:00:00', '2026-04-01 15:00:00');
 
 
 -- ============================
 -- Insert Sample bookings
 -- ============================
 
INSERT INTO bookings (username, Room_ID, check_in, check_out, bookings_status) VALUES
('Tester1', 1, '2026-04-01 14:00:00', '2026-04-05 11:00:00', 'Paid');


 SELECT * FROM users;
 SELECT * FROM rooms;
 SELECT * FROM bookings;